import type { Server } from 'node:http';
import { randomInt } from 'node:crypto';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { CODE_ALPHABET, normalizeCode, parseClientMessage, type ClientMessage, type Plate, type ServerMessage, type Slot } from '../src/coop/protocol.ts';
import { atomicJson } from './atomic-json.ts';
import { sameOrigin, visitorCookie } from './identity.ts';
import { acceptsPlate, sharedRoom, readRoomRecord, type RoomRecord } from './pairing-state.ts';

interface Peer {
    ws: WebSocket; visitor: string; room?: Room; slot?: Slot;
    actionSeq: number; avatarSeq: number; stream: number; alive: boolean; joinedAt: number;
    tokens: number; refilled: number; pending: number;
}
interface Room {
    record: RoomRecord; peers: [Peer | null, Peer | null]; plates: [Plate, Plate];
    idleSince: number; failed: boolean;
}
export interface MultiplayerOptions { idleMs?: number; sweepMs?: number; generateCode?: () => string }
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
    // Only semantic events enter this queue. Avatar traffic never waits for disk.
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
    const view = (room: Room) => sharedRoom(room.record, room.peers.map(Boolean) as [boolean, boolean], room.plates);
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
        const room: Room = { record, peers: [null, null], plates: [null, null], idleSince: Date.now(), failed: false };
        rooms.set(code, room);
        return room;
    }
    async function disconnect(peer: Peer) {
        if (!ownsSlot(peer)) return;
        const room = peer.room, index = peer.slot - 1;
        room.peers[index] = null; room.plates[index] = null; room.idleSince = Date.now();
        room.record.revision++;
        // Clear immediately in memory; acknowledge the revision only after durable write.
        // Storage failure closes the other socket too, so a ghost cannot keep playing.
        await persist(room);
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
            const now = new Date().toISOString();
            room = { record: { version: 2, code, level: 'pairing-bay', revision: 0, visitors: [peer.visitor, null],
                switchB: false, checkpoint: 'entry', exitUnlocked: false, reachedExit: [false, false], completed: false, createdAt: now, updatedAt: now },
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
            room.record.visitors[1] = peer.visitor;
        }
        const previous = room.peers[index];
        if (previous) {
            // Retire first: queued old-socket actions/close cannot affect the replacement.
            previous.room = undefined; previous.slot = undefined;
            error(previous, 'SESSION_REPLACED', 'THIS PLAYER OPENED IN ANOTHER TAB');
            previous.ws.close(4001, 'Player reconnected elsewhere');
        }
        peer.room = room; peer.slot = (index + 1) as Slot;
        room.peers[index] = peer; room.plates[index] = null; room.record.revision++;
        await persist(room);
        send(peer, { type: 'snapshot', slot: peer.slot, room: view(room) });
        broadcast(room);
    }
    async function action(peer: Peer, message: ClientMessage) {
        if (peer.ws.readyState !== WebSocket.OPEN) return;
        if (message.type === 'create' || message.type === 'join') { await enter(peer, message); return; }
        if (message.type === 'leave') { await disconnect(peer); peer.ws.close(1000, 'Left room'); return; }
        if (!ownsSlot(peer)) { error(peer, 'NOT_JOINED'); return; }
        if (message.type !== 'occupancy' && message.type !== 'switch' && message.type !== 'exit') return;
        if (message.seq <= peer.actionSeq) { error(peer, 'STALE_ACTION'); return; }
        peer.actionSeq = message.seq;
        const room = peer.room, index = peer.slot - 1;
        if (message.type === 'occupancy') {
            if (!acceptsPlate(message.plate, room.record)) { error(peer, 'INVALID_ACTION'); return; }
            if (room.plates[index] === message.plate) return;
            room.plates[index] = message.plate;
        } else if (message.type === 'switch') {
            if (room.record.switchB) return;
            room.record.switchB = true; room.record.checkpoint = 'reunion';
        } else {
            if (!room.record.exitUnlocked) { error(peer, 'INVALID_ACTION'); return; }
            if (room.record.reachedExit[index]) return;
            room.record.reachedExit[index] = true;
        }
        const state = view(room);
        if (room.record.switchB && state.connected.every(Boolean) && state.inputs.finalPlateLeftOccupied && state.inputs.finalPlateRightOccupied)
            room.record.exitUnlocked = true;
        room.record.completed = room.record.reachedExit.every(Boolean);
        room.record.revision++;
        await persist(room);
        broadcast(room);
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
                peer.tokens = Math.min(80, peer.tokens + (now - peer.refilled) * .04); peer.refilled = now;
                if (--peer.tokens < 0 || peer.pending >= 8 || queued >= 256) { error(peer, 'RATE_LIMITED'); ws.close(1008, 'Too many messages'); return; }
                const message = binary ? null : parseClientMessage(bytes.toString());
                if (!message) { error(peer, 'INVALID_MESSAGE'); ws.close(1008, 'Invalid message'); return; }
                if (message.type === 'ping') { send(peer, { type: 'pong' }); return; }
                if (message.type === 'avatar') {
                    if (!ownsSlot(peer) || message.seq <= peer.avatarSeq) return;
                    peer.avatarSeq = message.seq;
                    for (const other of peer.room.peers) if (other && other !== peer)
                        send(other, { type: 'avatar', slot: peer.slot, stream: peer.stream, seq: message.seq, avatar: message.avatar });
                    return;
                }
                peer.pending++;
                serial(async () => {
                    try { await action(peer, message); }
                    catch { error(peer, 'ROOM_UNAVAILABLE', 'ROOM UNAVAILABLE — PLEASE RETRY'); }
                    finally { peer.pending--; }
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
    heartbeat.unref(); sweep.unref();
    const shutdown = () => { clearInterval(heartbeat); clearInterval(sweep); for (const p of peers) p.ws.terminate(); wss.close(); };
    server.on('close', shutdown);
    server.on('shutdown', shutdown);
    return { rooms, shutdown, drained: () => queue };
}
