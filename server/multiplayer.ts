import type { Server } from 'node:http';
import { randomInt } from 'node:crypto';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { CODE_ALPHABET, normalizeCode, parseClientMessage, type ClientMessage, type Plate, type ServerMessage, type SharedCube, type Slot } from '../src/coop/protocol.ts';
import { acceptCubeSnapshot, assignCube, freshCube, interactCube } from './cube-state.ts';
import { atomicJson } from './atomic-json.ts';
import { sameOrigin, visitorCookie } from './identity.ts';
import { definition, newRecord, sharedRoom, readRoomRecord, type RoomRecord } from './coop-state.ts';
import { advanceCrumble, crumbleDue, freshCrumble, type CrumbleRuntime } from './crumble-state.ts';

interface Peer {
    ws: WebSocket; visitor: string; room?: Room; slot?: Slot;
    actionSeq: number; avatarSeq: number; stream: number; alive: boolean; joinedAt: number;
    tokens: number; refilled: number; pending: number;
}
interface Room {
    record: RoomRecord; peers: [Peer | null, Peer | null]; plates: [Plate, Plate];
    cube: SharedCube | null; crumble: CrumbleRuntime; revision: number; needsPersist: boolean;
    idleSince: number; failed: boolean;
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
    const view = (room: Room) => ({ ...sharedRoom(room.record, room.peers.map(Boolean) as [boolean, boolean], room.plates, room.cube, room.crumble), revision: room.revision });
    // Explicit durable projection. Live occupancy, owners, streams and transforms are absent.
    const durable = (room: Room) => JSON.stringify([room.record.levelState, room.record.checkpoint, room.record.cubePlacement,
        room.record.exitUnlocked, room.record.reachedExit, room.record.completed]);
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
        const room: Room = { record, revision: record.revision, needsPersist: (value as { version?: number }).version !== 4, cube: definition(record.level).cube ? freshCube() : null, crumble: freshCrumble(), peers: [null, null], plates: [null, null], idleSince: Date.now(), failed: false };
        rooms.set(code, room);
        return room;
    }
    async function disconnect(peer: Peer) {
        if (!ownsSlot(peer)) return;
        const room = peer.room, index = peer.slot - 1;
        room.peers[index] = null; room.plates[index] = null; room.idleSince = Date.now();
        if (room.cube?.physicsAuthority === peer.slot) {
            const remaining = room.peers.findIndex(Boolean);
            assignCube(room.cube, remaining < 0 ? null : (remaining + 1) as Slot);
        }
        room.revision++;
        broadcast(room);
        Object.assign(peer, { room: undefined, slot: undefined });
    }
    async function enter(peer: Peer, message: Extract<ClientMessage, { type: 'create' | 'join' }>) {
        if (peer.room) { error(peer, 'ALREADY_JOINED'); return; }
        let room: Room | null = null;
        if (message.type === 'create') {
            if (rooms.size >= 64) { error(peer, 'SERVER_BUSY'); return; }
            let code = '';
            for (let i = 0; i < 100; i++) {
                const candidate = (options.generateCode ?? generateCode)();
                if (!normalizeCode(candidate) || rooms.has(candidate)) continue;
                try { await stat(join(directory, `${candidate}.json`)); }
                catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; code = candidate; break; }
            }
            if (!code) { error(peer, 'SERVER_BUSY'); return; }
            const level = message.level ?? 'pairing-bay';
            room = { record: newRecord(code, peer.visitor, level), revision: 0, needsPersist: true,
                cube: definition(level).cube ? freshCube() : null, crumble: freshCrumble(),
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
        if (previous && room.cube?.physicsAuthority === peer.slot) {
            const partner = room.peers[1 - index];
            assignCube(room.cube, partner?.slot ?? peer.slot);
        } else if (room.cube?.physicsAuthority === null) {
            assignCube(room.cube, room.peers[0] ? 1 : 2);
        }
        if (room.needsPersist) {
            room.record.revision = room.revision;
            await persist(room); room.needsPersist = false;
        }
        send(peer, { type: 'snapshot', slot: peer.slot, room: view(room) });
        broadcast(room);
    }
    async function action(peer: Peer, message: ClientMessage, timing: ActionTiming) {
        if (peer.ws.readyState !== WebSocket.OPEN) return;
        if (message.type === 'create' || message.type === 'join') { await enter(peer, message); return; }
        if (message.type === 'leave') { await disconnect(peer); peer.ws.close(1000, 'Left room'); return; }
        if (!ownsSlot(peer)) { error(peer, 'NOT_JOINED'); return; }
        if (!('seq' in message) || message.type === 'avatar' || message.type === 'cube') return;
        const result = (accepted: boolean) => send(peer, { type: 'action-result', seq: message.seq, accepted, room: view(peer.room) });
        if (message.seq <= peer.actionSeq) { result(false); error(peer, 'STALE_ACTION'); return; }
        peer.actionSeq = message.seq;
        const room = peer.room, index = peer.slot - 1, before = durable(room);
        if ('epoch' in message) {
            const denied = () => { result(false); send(peer, { type: 'cube-denied', seq: message.seq }); };
            if (!room.cube) { denied(); return; }
            if (message.type === 'cube-occupancy') {
                if (room.record.level !== 'pairing-bay' || message.epoch !== room.cube.epoch || room.cube.physicsAuthority !== peer.slot
                    || message.cargo && (!definition(room.record.level).cubeEnabled(room.record) || room.cube.holder !== null || room.cube.pulling)) { denied(); return; }
                const placement = message.cargo ? 'cargoPlate' : 'spawn';
                if (room.record.cubePlacement === placement) { result(true); return; }
                room.record.cubePlacement = placement;
            } else {
                if ((message.type !== 'cube-reset' && !definition(room.record.level).cubeEnabled(room.record))
                    || !interactCube(room.cube, peer.slot, message)) { denied(); return; }
                if (message.type !== 'cube-pull-stop') room.record.cubePlacement = 'spawn';
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
            if (room.cube?.physicsAuthority === peer.slot && (room.cube.holder || room.cube.pulling)) assignCube(room.cube, peer.slot);
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
        return { record: room.record, held: room.plates.map((p, i) => room.peers[i] ? p : null) as [Plate, Plate], crumble: room.crumble, now: Date.now() };
    }
    async function commitAction(room: Room, before: string, timing: ActionTiming) {
        if (definition(room.record.level).unlock(context(room))) room.record.exitUnlocked = true;
        room.record.completed = room.record.reachedExit.every(Boolean);
        room.revision++;
        if (durable(room) !== before) {
            timing.durable = true;
            room.record.revision = room.revision;
            const start = performance.now();
            await persist(room);
            timing.persistMs = performance.now() - start;
        }
    }
    server.on('upgrade', (req, socket, head) => {
        const visitor = visitorCookie(req);
        const reject = (status: number) => { socket.end(`HTTP/1.1 ${status} Rejected\r\nConnection: close\r\n\r\n`); };
        if (req.url !== '/ws') { reject(404); return; }
        if (!sameOrigin(req)) { reject(403); return; }
        if (!visitor) { reject(401); return; }
        if (peers.size >= 128) { reject(503); return; }
        wss.handleUpgrade(req, socket, head, ws => {
            const peer: Peer = { ws, visitor, actionSeq: -1, avatarSeq: -1, stream: ++stream, alive: true, joinedAt: Date.now(), tokens: 80, refilled: Date.now(), pending: 0 };
            peers.add(peer);
            ws.on('error', () => {}); // Protocol violations close this socket, never the process.
            ws.on('pong', () => { peer.alive = true; });
            ws.on('close', () => { peers.delete(peer); serial(() => disconnect(peer)); });
            ws.on('message', (bytes, binary) => {
                const now = Date.now();
                peer.tokens = Math.min(80, peer.tokens + (now - peer.refilled) * .06); peer.refilled = now;
                if (--peer.tokens < 0 || peer.pending >= 8 || queued >= 256) { error(peer, 'RATE_LIMITED'); ws.close(1008, 'Too many messages'); return; }
                const message = binary ? null : parseClientMessage(bytes.toString());
                if (!message) { error(peer, 'INVALID_MESSAGE'); ws.close(1008, 'Invalid message'); return; }
                if (message.type === 'ping') { send(peer, { type: 'pong' }); return; }
                if (message.type === 'cube') {
                    if (!ownsSlot(peer) || !peer.room.cube || !acceptCubeSnapshot(peer.room.cube, peer.slot, message)) return;
                    for (const other of peer.room.peers) if (other && other !== peer)
                        send(other, { ...message, transform: peer.room.cube.transform! });
                    return;
                }
                if (message.type === 'avatar') {
                    if (!ownsSlot(peer) || message.seq <= peer.avatarSeq) return;
                    peer.avatarSeq = message.seq;
                    for (const other of peer.room.peers) if (other && other !== peer)
                        send(other, { type: 'avatar', slot: peer.slot, stream: peer.stream, seq: message.seq, avatar: message.avatar, ...(message.discontinuity ? { discontinuity: message.discontinuity } : {}) });
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
        if (timerQueued || ![...rooms.values()].some(r => r.record.level === 'crumble-lab' && crumbleDue(r.crumble, Date.now()))) return;
        timerQueued = true;
        serial(async () => {
            try {
                for (const room of rooms.values()) if (!room.failed && room.record.level === 'crumble-lab' && advanceCrumble(room.crumble, Date.now())) {
                    room.revision++; broadcast(room);
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
