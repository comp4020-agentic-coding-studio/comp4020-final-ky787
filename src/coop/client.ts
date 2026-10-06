import type { PlayerState } from '../engine/physics.ts';
import { newerRoom, normalizeCode, websocketUrl, type Avatar, type ClientMessage, type Plate, type ServerMessage, type SharedRoom, type Slot } from './protocol.ts';
import { RemoteAvatar } from './remote.ts';
export class CoopClient {
    room: SharedRoom | null = null;
    slot: Slot | null = null;
    visitor = '';
    status = 'OFFLINE';
    active = false;
    sent = 0; received = 0; reconnectAttempts = 0; lastMessageAt = 0;
    remote = new RemoteAvatar();
    private socket: WebSocket | null = null;
    private intent: Extract<ClientMessage, { type: 'create' | 'join' }> = { type: 'create' };
    private retry?: ReturnType<typeof setTimeout>;
    private heartbeat?: ReturnType<typeof setInterval>;
    private deadline?: ReturnType<typeof setTimeout>;
    private generation = 0;
    private actionSeq = 0;
    private moveSeq = 0;
    private lastSentAt = 0;
    private plate: Plate = null;
    private exitSent = false;
    constructor(private onRoom: (room: SharedRoom, initial: boolean) => void, private onStatus: () => void) {}
    get connected(): boolean { return this.status === 'CONNECTED' && !!this.room; }
    remembered(): string | null { try { return normalizeCode(sessionStorage.getItem('bn_coop_room') ?? ''); } catch { return null; } }
    private remember(code: string | null): void {
        try { if (code) sessionStorage.setItem('bn_coop_room', code); else sessionStorage.removeItem('bn_coop_room'); } catch { /* Manual room codes still work. */ }
    }
    start(code?: string): void {
        this.leave(false);
        if (code !== undefined && !normalizeCode(code)) { this.status = 'ENTER A FOUR-CHARACTER ROOM CODE'; this.onStatus(); return; }
        this.active = true; this.reconnectAttempts = 0; this.room = null; this.slot = null;
        this.intent = code ? { type: 'join', code: normalizeCode(code)! } : { type: 'create' };
        void this.connect();
    }
    private async connect(): Promise<void> {
        const generation = ++this.generation;
        this.status = this.reconnectAttempts ? 'RECONNECTING' : 'CONNECTING'; this.onStatus();
        try {
            // Same HttpOnly cookie as C8, even when campaign loading failed/never ran.
            const response = await fetch('/api/identity', { signal: AbortSignal.timeout(5000) });
            if (!response.ok) throw new Error('Identity unavailable');
            const identity = await response.json();
            if (!this.active || generation !== this.generation) return;
            this.visitor = identity.id;
            const ws = new WebSocket(websocketUrl(location.href)); this.socket = ws;
            this.deadline = setTimeout(() => ws.close(), 8000);
            ws.onopen = () => {
                if (generation !== this.generation) { ws.close(); return; }
                this.lastMessageAt = performance.now(); this.actionSeq = 0; this.moveSeq = 0; this.plate = null; this.exitSent = false;
                this.send(this.intent);
                this.heartbeat = setInterval(() => {
                    if (performance.now() - this.lastMessageAt > 10000) ws.close();
                    else this.send({ type: 'ping' });
                }, 3000);
            };
            ws.onmessage = event => {
                if (generation !== this.generation) return;
                const message = JSON.parse(String(event.data)) as ServerMessage;
                this.received++; this.lastMessageAt = performance.now();
                if (message.type === 'snapshot') {
                    clearTimeout(this.deadline);
                    this.room = message.room; this.slot = message.slot; this.remote.clear();
                    this.intent = { type: 'join', code: this.room.code }; this.remember(this.room.code);
                    this.status = 'CONNECTED'; this.reconnectAttempts = 0;
                    this.onRoom(this.room, true); this.onStatus();
                } else if (message.type === 'room' && newerRoom(this.room, message.room)) {
                    this.room = message.room;
                    if (this.slot && !this.room.connected[this.slot === 1 ? 1 : 0]) this.remote.clear();
                    this.onRoom(this.room, false); this.onStatus();
                } else if (message.type === 'avatar' && message.slot !== this.slot && this.connected && this.room?.connected[message.slot - 1]) {
                    this.remote.push(message.avatar, message.stream, message.seq, performance.now());
                } else if (message.type === 'error') {
                    if (message.code === 'STALE_ACTION') return;
                    const messageText = message.message;
                    this.leave(false); this.status = messageText; this.onStatus();
                }
            };
            ws.onclose = () => {
                if (generation !== this.generation) return;
                clearInterval(this.heartbeat); clearTimeout(this.deadline);
                this.remote.clear(); this.reconnect();
            };
            ws.onerror = () => {}; // close supplies the retry; no duplicate timers.
        } catch { if (this.active && generation === this.generation) this.reconnect(); }
    }
    private reconnect(): void {
        if (!this.active) return;
        this.status = 'RECONNECTING'; this.reconnectAttempts++; this.onStatus();
        clearTimeout(this.retry);
        this.retry = setTimeout(() => void this.connect(), Math.min(5000, 300 * 2 ** Math.min(5, this.reconnectAttempts - 1)) + Math.random() * 150);
    }
    private send(message: ClientMessage): boolean {
        if (this.socket?.readyState !== WebSocket.OPEN || this.socket.bufferedAmount > 8192) return false;
        this.socket.send(JSON.stringify(message)); this.sent++;
        return true;
    }
    occupy(plate: Plate): void {
        if (!this.connected || this.plate === plate) return;
        if (this.send({ type: 'occupancy', seq: ++this.actionSeq, plate })) this.plate = plate;
    }
    switchB(): void { if (this.connected) this.send({ type: 'switch', seq: ++this.actionSeq }); }
    reachExit(): void {
        if (this.connected && this.slot && this.room?.exitUnlocked && !this.room.reachedExit[this.slot - 1] && !this.exitSent)
            this.exitSent = this.send({ type: 'exit', seq: ++this.actionSeq });
    }
    publish(p: PlayerState, now: number): void {
        if (!this.connected || now - this.lastSentAt < 50) return;
        this.lastSentAt = now;
        const avatar: Avatar = { x: p.x, y: p.y, vx: p.vx, vy: p.vy, facing: p.facing, grounded: p.grounded,
            rope: p.rope.phase === 'idle' ? null : { ...p.rope.tip } };
        this.send({ type: 'avatar', seq: ++this.moveSeq, avatar });
    }
    leave(forget = true): void {
        this.active = false; this.generation++;
        clearTimeout(this.retry); clearInterval(this.heartbeat); clearTimeout(this.deadline);
        this.send({ type: 'leave' }); this.socket?.close(1000); this.socket = null;
        this.remote.clear(); this.status = 'OFFLINE';
        if (forget) this.remember(null);
    }
    diagnostics() {
        const now = performance.now();
        return { websocket: this.status, transport: this.socket ? ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][this.socket.readyState] : 'CLOSED',
            url: websocketUrl(location.href), code: this.room?.code, visitor: this.visitor, slot: this.slot,
            connected: this.room?.connected, revision: this.room?.revision, inputs: this.room?.inputs, outputs: this.room?.outputs,
            exitUnlocked: this.room?.exitUnlocked, reachedExit: this.room?.reachedExit, completed: this.room?.completed,
            lastServerMessageAgeMs: this.lastMessageAt ? Math.round(now - this.lastMessageAt) : null,
            sent: this.sent, received: this.received, reconnectAttempts: this.reconnectAttempts,
            remoteSnapshotAgeMs: this.remote.lastAt ? Math.round(now - this.remote.lastAt) : null };
    }
}
