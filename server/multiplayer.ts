import { newParty, selectChamber, completeParty } from './party-state.ts';
import type { Server } from 'node:http';
import { randomInt } from 'node:crypto';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { CODE_ALPHABET, normalizeCode, parseClientMessage, type ClientMessage, type Plate, type ServerMessage, type SharedCube, type CubeMap, type Slot } from '../src/coop/protocol.ts';
import { acceptCubeSnapshot, assignCube, interactCube } from './cube-state.ts';
import { atomicJson } from './atomic-json.ts';
import { sameOrigin, visitorCookie } from './identity.ts';
import { definition, newRecord, sharedRoom, freshCubes, readRoomRecord, type RoomRecord } from './coop-state.ts';
import { advanceCrumble, crumbleDue, freshCrumble, type CrumbleRuntime } from './crumble-state.ts';

import { advanceRace, freshRace, raceDue, syncRace, RACE_TIMING, type RaceRuntime } from './race-state.ts';

interface Peer {
    ws: WebSocket; visitor: string; room?: Room; slot?: Slot;
    actionSeq: number; avatarSeq: number; stream: number; alive: boolean; joinedAt: number;
    tokens: number; refilled: number; pending: number;
}
interface Room {
    record: RoomRecord; peers: [Peer | null, Peer | null]; plates: [Plate, Plate];
    cubes: CubeMap<SharedCube>; crumble: CrumbleRuntime; race: RaceRuntime; revision: number; needsPersist: boolean;
    idleSince: number; failed: boolean; transitioning?: boolean;
}
export interface ActionTiming { action: string; queueMs: number; persistMs: number; totalMs: number; durable: boolean }
export interface MultiplayerOptions {
    idleMs?: number; sweepMs?: number; generateCode?: () => string;
    /** Test harness only; never delays transform traffic. */
    semanticDelayMs?: number;
    onActionTiming?: (timing: ActionTiming) => void;
}
export function generateCode(): string {
    return Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
}
/** One process, one volume, bounded memory. No world geometry or physics imports. */
export async function attachMultiplayer(server: Server, dataDir: string, options: MultiplayerOptions = {}) {
    const directory = join(dataDir, 'rooms');
    await mkdir(directory, { recursive: true });
    const rooms = new Map<string, Room>();
    const peers = new Set<Peer>();
    const wss = new WebSocketServer({ noServer: true, maxPayload: 2048, perMessageDeflate: false });
    let queue = Promise.resolve();
    let queued = 0;
    let stream = 0;
    // Only semantic events enter this queue. Avatar/cube traffic never waits for disk.
    function serial(work: () => Promise<void>) {
        queued++;
        queue = queue.then(work).catch(() => { console.error('Multiplayer operation failed'); }).finally(() => { queued--; });
    }
    function send(peer: Peer, message: ServerMessage) {
        if (peer.ws.readyState !== WebSocket.OPEN) return;
        if (peer.ws.bufferedAmount > 65536) { peer.ws.terminate(); return; }
        peer.ws.send(JSON.stringify(message));
    }
    const error = (peer: Peer, code: string, message = code.replaceAll('_', ' ')) => send(peer, { type: 'error', code, message });
    const view = (room: Room) => ({ ...sharedRoom(room.record, room.peers.map(Boolean) as [boolean, boolean], room.plates, room.cubes, room.crumble, Date.now(), room.race), revision: room.revision });
    // Explicit durable projection. Live occupancy, owners, streams and transforms are absent.
    const durable = (room: Room) => JSON.stringify([room.record.levelState, room.record.checkpoint, room.record.cubePlacements,
        room.record.exitUnlocked, room.record.reachedExit, room.record.completed, room.record.party, room.record.level, room.record.levelInstance]);
    const broadcast = (room: Room) => { for (const p of room.peers) if (p) send(p, { type: 'room', room: view(room) }); };
    const ownsSlot = (p: Peer): p is Peer & { room: Room; slot: Slot } => !!p.room && !!p.slot && p.room.peers[p.slot - 1] === p && !p.room.failed;
    async function persist(room: Room) {
        room.record.updatedAt = new Date().toISOString();
        try { await atomicJson(join(directory, `${room.record.code}.json`), room.record); }
        catch {
            // Fail closed. Never keep accepting changes that cannot be acknowledged durably.
            room.failed = true;
            for (const p of room.peers) if (p) { error(p, 'ROOM_UNAVAILABLE'); p.ws.close(1011, 'Room storage unavailable'); }
            room.peers = [null, null]; room.plates = [null, null];
            rooms.delete(room.record.code);
            throw new Error('Room storage unavailable');
        }
    }
    async function load(code: string): Promise<Room | null> {
        if (rooms.has(code)) return rooms.get(code)!;
        let value: unknown;
        try { value = JSON.parse(await readFile(join(directory, `${code}.json`), 'utf8')); }
        catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e; }
        const record = readRoomRecord(value, code);
        if (!record) throw new Error('Invalid room record');
        if (rooms.size >= 64) throw new Error('Room capacity');
        const room: Room = { record, revision: record.revision, needsPersist: (value as { version?: number }).version !== 6, cubes: freshCubes(record.level), crumble: freshCrumble(), race: freshRace(), peers: [null, null], plates: [null, null], idleSince: Date.now(), failed: false };
        rooms.set(code, room);
        return room;
    }
    async function disconnect(peer: Peer) {
        if (!ownsSlot(peer)) return;
        const room = peer.room, index = peer.slot - 1;
        room.peers[index] = null; room.plates[index] = null; room.idleSince = Date.now();
        for (const cube of Object.values(room.cubes)) if (cube.physicsAuthority === peer.slot) {
            const remaining = room.peers.findIndex(Boolean);
            assignCube(cube, remaining < 0 ? null : (remaining + 1) as Slot);
        }
        if (room.record.level === 'race-condition') syncRace(context(room));
        room.revision++;
        broadcast(room);
        Object.assign(peer, { room: undefined, slot: undefined });
    }
    async function enter(peer: Peer, message: Extract<ClientMessage, { type: 'create' | 'create-party' | 'join' }>) {
        if (peer.room) { error(peer, 'ALREADY_JOINED'); return; }
        let room: Room | null = null;
        if (message.type === 'create' || message.type === 'create-party') {
            if (rooms.size >= 64) { error(peer, 'SERVER_BUSY'); return; }
            let code = '';
            for (let i = 0; i < 100; i++) {
                const candidate = (options.generateCode ?? generateCode)();
                if (!normalizeCode(candidate) || rooms.has(candidate)) continue;
                try { await stat(join(directory, `${candidate}.json`)); }
                catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; code = candidate; break; }
            }
            if (!code) { error(peer, 'SERVER_BUSY'); return; }
            const record = message.type === 'create-party' ? newParty(code, peer.visitor) : newRecord(code, peer.visitor, message.level ?? 'pairing-bay');
            const level = record.level;
            room = { record, revision: 0, needsPersist: true,
                cubes: freshCubes(level), crumble: freshCrumble(), race: freshRace(),
                peers: [null, null], plates: [null, null], idleSince: Date.now(), failed: false };
            rooms.set(code, room);
        } else {
            const code = normalizeCode(message.code);
            if (!code) { error(peer, 'INVALID_CODE', 'ENTER A FOUR-CHARACTER ROOM CODE'); return; }
            room = await load(code);
            if (!room) { error(peer, 'ROOM_NOT_FOUND'); return; }
        }
        if (peer.ws.readyState !== WebSocket.OPEN) return;
        let index = room.record.visitors.indexOf(peer.visitor);
        if (index < 0) {
            if (room.record.visitors[1]) { error(peer, 'ROOM_FULL'); return; }
            index = 1;
            room.record.visitors[1] = peer.visitor; room.needsPersist = true;
        }
        const previous = room.peers[index];
        if (previous) {
            // Retire first: queued old-socket actions/close cannot affect the replacement.
            previous.room = undefined; previous.slot = undefined;
            error(previous, 'SESSION_REPLACED', 'THIS PLAYER OPENED IN ANOTHER TAB');
            previous.ws.close(4001, 'Player reconnected elsewhere');
        }
        peer.room = room; peer.slot = (index + 1) as Slot;
        room.peers[index] = peer; room.plates[index] = null; room.revision++;
        // A replacement is a release too: a refreshed browser is never a ghost holder.
        for (const cube of Object.values(room.cubes)) if (previous && cube.physicsAuthority === peer.slot) {
            const partner = room.peers[1 - index];
            assignCube(cube, partner?.slot ?? peer.slot);
        } else if (cube.physicsAuthority === null) {
            assignCube(cube, room.peers[0] ? 1 : 2);
        }
        if (room.record.level === 'race-condition') syncRace(context(room));
        if (room.needsPersist) {
            room.record.revision = room.revision;
            await persist(room); room.needsPersist = false;
        }
        send(peer, { type: 'snapshot', slot: peer.slot, room: view(room) });
        broadcast(room);
    }
    async function action(peer: Peer, message: ClientMessage, timing: ActionTiming) {
        if (peer.ws.readyState !== WebSocket.OPEN) return;
        if (message.type === 'create' || message.type === 'create-party' || message.type === 'join') { await enter(peer, message); return; }
        if (message.type === 'leave') { await disconnect(peer); peer.ws.close(1000, 'Left room'); return; }
        if (!ownsSlot(peer)) { error(peer, 'NOT_JOINED'); return; }
        if (!('seq' in message) || message.type === 'avatar' || message.type === 'cube') return;
        const result = (accepted: boolean) => send(peer, { type: 'action-result', seq: message.seq, accepted, room: view(peer.room) });
        if (message.seq <= peer.actionSeq) { result(false); error(peer, 'STALE_ACTION'); return; }
        peer.actionSeq = message.seq;
        const room = peer.room, index = peer.slot - 1, before = durable(room);
        if (!currentInstance(room, message)) { result(false); return; }
        if (message.type === 'select-level') {
            const selected = selectChamber(room.record, peer.visitor, message.level);
            if (!selected) { result(false); return; }
            room.transitioning = true;
            room.record = selected; room.plates = [null, null];
            room.cubes = freshCubes(selected.level); room.crumble = freshCrumble(); room.race = freshRace();
            const simulator = room.peers[0] ? 1 : 2;
            for (const cube of Object.values(room.cubes)) assignCube(cube, simulator);
            for (const member of room.peers) if (member) member.stream = ++stream;
            room.record.revision = ++room.revision;
            timing.durable = true;
            const start = performance.now();
            await persist(room); timing.persistMs = performance.now() - start;
            room.transitioning = false;
            result(true); broadcast(room); return;
        }
        if (room.record.party && room.record.party.phase !== 'playing') { result(false); return; }
        if (room.record.level === 'race-condition' && advanceRace(room.race, Date.now())) { room.revision++; broadcast(room); }
        if ('epoch' in message) {
            const denied = () => { result(false); send(peer, { type: 'cube-denied', levelInstance: room.record.levelInstance, cubeId: message.cubeId, seq: message.seq }); };
            const cube = room.cubes[message.cubeId], def = definition(room.record.level);
            if (!cube || !def.cubeIds.includes(message.cubeId)) { denied(); return; }
            if (message.type === 'cube-contact') {
                if (room.record.level !== 'race-condition' || message.cubeId !== 'cubeA'
                    || message.epoch !== cube.epoch || cube.physicsAuthority !== peer.slot || cube.holder || cube.pulling
                    || room.race.buffer !== 'idle' || room.race.contactEpoch === cube.epoch || room.record.cubePlacements.cubeA !== 'spawn') { denied(); return; }
                room.race.contactEpoch = cube.epoch; room.race.buffer = 'window'; room.race.deadline = Date.now() + RACE_TIMING.buffer;
            } else if (message.type === 'cube-occupancy') {
                const placement = message.placement;
                if (message.epoch !== cube.epoch || cube.physicsAuthority !== peer.slot
                    || placement !== 'spawn' && (!def.cubeEnabled(room.record, message.cubeId) || cube.holder !== null || cube.pulling
                        || !def.acceptsPlacement?.(room.record, placement)
                        || room.record.level !== 'race-condition' && Object.entries(room.record.cubePlacements).some(([id, p]) => id !== message.cubeId && p === placement))) { denied(); return; }
                if (room.record.cubePlacements[message.cubeId] === placement) { result(true); return; }
                room.record.cubePlacements[message.cubeId] = placement;
            } else {
                const anotherControlled = Object.entries(room.cubes).some(([id, c]) => id !== message.cubeId
                    && (c.holder === peer.slot || c.pulling && c.physicsAuthority === peer.slot));
                if ((message.type === 'cube-pickup' || message.type === 'cube-pull-start') && anotherControlled
                    || message.type !== 'cube-reset' && !def.cubeEnabled(room.record, message.cubeId)
                    || !interactCube(cube, peer.slot, message)) { denied(); return; }
                if (message.type !== 'cube-pull-stop') room.record.cubePlacements[message.cubeId] = 'spawn';
                if (message.type === 'cube-reset' && message.cubeId === 'cubeA' && room.record.level === 'race-condition') {
                    room.race.buffer = 'idle'; room.race.deadline = 0;
                }
            }
            await commitAction(room, before, timing);
            result(true); broadcast(room);
            return;
        }
        const def = definition(room.record.level);
        if (message.type === 'occupancy') {
            if (!def.acceptsPlate(message.plate, room.record)) { result(false); error(peer, 'INVALID_ACTION'); return; }
            if (room.plates[index] === message.plate) { result(true); return; }
            room.plates[index] = message.plate;
        } else if (message.type === 'local-reset') {
            // Death/reset affects this body only. A pending pickup is serialized before this release.
            room.plates[index] = null;
            for (const cube of Object.values(room.cubes)) if (cube.physicsAuthority === peer.slot && (cube.holder || cube.pulling)) assignCube(cube, peer.slot);
        } else if (message.type === 'exit') {
            if (!room.record.exitUnlocked) { result(false); error(peer, 'INVALID_ACTION'); return; }
            if (room.record.reachedExit[index]) { result(true); return; }
            room.record.reachedExit[index] = true;
        } else if (message.type === 'switch' || message.type === 'control' || message.type === 'crumble-trigger') {
            if (!def.action(context(room), message)) { result(false); return; }
            if (message.type !== 'crumble-trigger' && durable(room) === before) { result(true); return; }
        } else return;
        await commitAction(room, before, timing);
        result(true); broadcast(room);
    }
    function context(room: Room) {
        return { record: room.record, held: room.plates.map((p, i) => room.peers[i] ? p : null) as [Plate, Plate], crumble: room.crumble, race: room.race, now: Date.now() };
    }
    async function commitAction(room: Room, before: string, timing: ActionTiming) {
        if (room.record.level === 'race-condition') syncRace(context(room));
        if (definition(room.record.level).unlock(context(room))) room.record.exitUnlocked = true;
        room.record.completed = room.record.reachedExit.every(Boolean);
        completeParty(room.record);
        room.revision++;
        if (durable(room) !== before) {
            timing.durable = true;
            room.record.revision = room.revision;
            const start = performance.now();
            await persist(room);
            timing.persistMs = performance.now() - start;
        }
    }
    function currentInstance(room: Room, message: ClientMessage): boolean {
        return !room.transitioning && (message.levelInstance === room.record.levelInstance
            || !room.record.party && message.levelInstance === undefined);
    }
    function acceptsStream(peer: Peer, message: ClientMessage): peer is Peer & { room: Room; slot: Slot } {
        return ownsSlot(peer) && currentInstance(peer.room, message)
            && (!peer.room.record.party || peer.room.record.party.phase === 'playing');
    }
    server.on('upgrade', (req, socket, head) => {
        const visitor = visitorCookie(req);
        const reject = (status: number) => { socket.end(`HTTP/1.1 ${status} Rejected\r\nConnection: close\r\n\r\n`); };
        if (req.url !== '/ws') { reject(404); return; }
        if (!sameOrigin(req)) { reject(403); return; }
        if (!visitor) { reject(401); return; }
        if (peers.size >= 128) { reject(503); return; }
        wss.handleUpgrade(req, socket, head, ws => {
            const peer: Peer = { ws, visitor, actionSeq: -1, avatarSeq: -1, stream: ++stream, alive: true, joinedAt: Date.now(), tokens: 120, refilled: Date.now(), pending: 0 };
            peers.add(peer);
            ws.on('error', () => {}); // Protocol violations close this socket, never the process.
            ws.on('pong', () => { peer.alive = true; });
            ws.on('close', () => { peers.delete(peer); serial(() => disconnect(peer)); });
            ws.on('message', (bytes, binary) => {
                const now = Date.now();
                // Avatar + two independent cube streams = 60 Hz; retain bounded input headroom.
                peer.tokens = Math.min(120, peer.tokens + (now - peer.refilled) * .09); peer.refilled = now;
                if (--peer.tokens < 0 || peer.pending >= 8 || queued >= 256) { error(peer, 'RATE_LIMITED'); ws.close(1008, 'Too many messages'); return; }
                const message = binary ? null : parseClientMessage(bytes.toString());
                if (!message) { error(peer, 'INVALID_MESSAGE'); ws.close(1008, 'Invalid message'); return; }
                if (message.type === 'ping') { send(peer, { type: 'pong' }); return; }
                if (message.type === 'cube') {
                    if (!acceptsStream(peer, message)) return;
                    const cube = peer.room.cubes[message.cubeId];
                    if (!cube || !acceptCubeSnapshot(cube, peer.slot, message)) return;
                    for (const other of peer.room.peers) if (other && other !== peer)
                        send(other, { ...message, levelInstance: peer.room.record.levelInstance, transform: cube.transform! });
                    return;
                }
                if (message.type === 'avatar') {
                    if (!acceptsStream(peer, message) || message.seq <= peer.avatarSeq) return;
                    peer.avatarSeq = message.seq;
                    for (const other of peer.room.peers) if (other && other !== peer)
                        send(other, { type: 'avatar', levelInstance: peer.room.record.levelInstance, slot: peer.slot, stream: peer.stream, seq: message.seq, avatar: message.avatar, ...(message.discontinuity ? { discontinuity: message.discontinuity } : {}) });
                    return;
                }
                peer.pending++;
                const receivedAt = performance.now();
                const readyAt = receivedAt + ('seq' in message ? Math.max(0, Math.min(1000, options.semanticDelayMs ?? 0)) : 0);
                serial(async () => {
                    const wait = readyAt - performance.now();
                    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
                    const timing: ActionTiming = { action: message.type, queueMs: performance.now() - receivedAt, persistMs: 0, totalMs: 0, durable: false };
                    try { await action(peer, message, timing); }
                    catch { error(peer, 'ROOM_UNAVAILABLE', 'ROOM UNAVAILABLE — PLEASE RETRY'); }
                    finally {
                        peer.pending--; timing.totalMs = performance.now() - receivedAt;
                        options.onActionTiming?.(timing);
                    }
                });
            });
        });
    });
    const heartbeat = setInterval(() => {
        for (const p of peers) {
            if (!p.alive || !p.room && Date.now() - p.joinedAt > 15000) { p.ws.terminate(); continue; }
            p.alive = false; p.ws.ping();
        }
    }, 5000);
    const sweep = setInterval(() => {
        for (const [code, room] of rooms) if (room.peers.every(p => !p) && Date.now() - room.idleSince > (options.idleMs ?? 300000)) rooms.delete(code);
    }, options.sweepMs ?? 30000);
    // A single bounded clock wakes only due rooms; phase changes share the semantic queue.
    let timerQueued = false;
    const machineryClock = setInterval(() => {
        if (timerQueued || ![...rooms.values()].some(r => crumbleDue(r.crumble, Date.now()) || r.record.level === 'race-condition' && raceDue(r.race, Date.now()))) return;
        timerQueued = true;
        serial(async () => {
            try {
                for (const room of rooms.values()) if (!room.failed) {
                    const crumbleChanged = advanceCrumble(room.crumble, Date.now());
                    const raceChanged = room.record.level === 'race-condition' && advanceRace(room.race, Date.now());
                    if (crumbleChanged || raceChanged) { room.revision++; broadcast(room); }
                }
            } finally { timerQueued = false; }
        });
    }, 20);
    heartbeat.unref(); sweep.unref(); machineryClock.unref();
    const shutdown = () => { clearInterval(heartbeat); clearInterval(sweep); clearInterval(machineryClock); for (const p of peers) p.ws.terminate(); wss.close(); };
    server.on('close', shutdown);
    server.on('shutdown', shutdown);
    return { rooms, shutdown, drained: () => queue };
}
