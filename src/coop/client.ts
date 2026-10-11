import type { PlayerState } from '../engine/physics.ts';
import { cubeEntries, newerRoom, normalizeCode, websocketUrl, type CubeId, type CubeMap, type CubePlacement, type CubeResetCause, type CoopLevelId, type CrumbleId, type CrumbleTrigger, type Discontinuity, type Avatar, type ClientMessage, type CubeAction, type CubeTransform, type Plate, type ServerMessage, type SharedRoom, type Slot } from './protocol.ts';
import { RemoteAvatar, RemoteCube } from './remote.ts';
import { LocalPrediction, type PredictedAction } from './prediction.ts';
export class CoopClient {
    room: SharedRoom | null = null;
    roomReceivedAt = 0;
    private playerDiscontinuity?: Discontinuity;
    private cubeDiscontinuities: CubeMap<Discontinuity> = {};
    lastLocalDiscontinuity: { entity: string; kind: Discontinuity; at: number } | null = null;
    private machineryEvents: { kind: string; at: { x: number; y: number } }[] = [];
    private pendingControls = new Map<number, string>();
    pendingCrumble = new Map<CrumbleId, { seq: number; trigger: CrumbleTrigger; at: number }>();
    prediction = new LocalPrediction();
    slot: Slot | null = null;
    visitor = '';
    status = 'OFFLINE';
    active = false;
    sent = 0; received = 0; reconnectAttempts = 0; lastMessageAt = 0;
    remote = new RemoteAvatar();
    private replicas: CubeMap<RemoteCube> = {};
    cubeReplica(id: CubeId = 'cube'): RemoteCube { return this.replicas[id] ??= new RemoteCube(); }
    get remoteCube() { return this.cubeReplica(); }
    cubeSent = 0; cubeReceived = 0; cubeLastAt = 0;
    private cubeSeq: CubeMap<number> = {};
    private cubeSentAt: CubeMap<number> = {};
    private placements: CubeMap<CubePlacement> = {};
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
    get ownsCube(): boolean { return this.ownsCubeFor('cube'); }
    ownsCubeFor(id: CubeId): boolean { return this.connected && this.room!.cubes[id]?.physicsAuthority === this.slot; }
    private acceptCubeRoom(room: SharedRoom, initial = false): void {
        if (initial) { this.replicas = {}; this.cubeSeq = {}; this.cubeSentAt = {}; this.placements = {}; }
        for (const [id, cube] of cubeEntries(room.cubes)) {
            const old = this.room?.cubes[id], replica = this.cubeReplica(id);
            if (cube.lastReset && cube.lastReset.epoch !== old?.lastReset?.epoch) {
                if (this.prediction.cube?.cubeId === id && this.prediction.cube.kind !== 'cube-reset')
                    this.prediction.cancelCube(performance.now());
                delete this.cubeDiscontinuities[id];
            }
            if (initial || cube.epoch !== old?.epoch) {
                replica.reset(cube, performance.now());
                this.cubeSeq[id] = 0; this.cubeSentAt[id] = 0; delete this.placements[id];
                this.cubeLastAt = cube.transform ? performance.now() : 0;
            } else if (cube.transform) replica.push(cube.transform, cube.epoch, cube.seq, performance.now());
        }
    }
    remembered(): string | null { try { return normalizeCode(sessionStorage.getItem('bn_coop_room') ?? ''); } catch { return null; } }
    private remember(code: string | null): void {
        try { if (code) sessionStorage.setItem('bn_coop_room', code); else sessionStorage.removeItem('bn_coop_room'); } catch { /* Manual room codes still work. */ }
    }
    start(code?: string, level: CoopLevelId = 'pairing-bay'): void {
        this.leave(false);
        if (code !== undefined && !normalizeCode(code)) { this.status = 'ENTER A FOUR-CHARACTER ROOM CODE'; this.onStatus(); return; }
        this.active = true; this.reconnectAttempts = 0; this.room = null; this.slot = null;
        this.intent = code ? { type: 'join', code: normalizeCode(code)! } : { type: 'create', level };
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
                this.lastMessageAt = performance.now(); this.actionSeq = 0; this.moveSeq = 0; this.plate = null; this.exitSent = false; this.lastSentAt = 0; this.playerDiscontinuity = undefined; this.cubeDiscontinuities = {};
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
                    this.prediction.clear(performance.now()); this.pendingControls.clear(); this.pendingCrumble.clear();
                    this.acceptCubeRoom(message.room, true);
                    this.room = message.room; this.roomReceivedAt = performance.now(); this.slot = message.slot; this.remote.clear();
                    this.intent = { type: 'join', code: this.room.code }; this.remember(this.room.code);
                    this.status = 'CONNECTED'; this.reconnectAttempts = 0;
                    this.onRoom(this.room, true); this.onStatus();
                } else if (message.type === 'room' && newerRoom(this.room, message.room)) {
                    this.acceptCubeRoom(message.room);
                    this.room = message.room; this.roomReceivedAt = performance.now();
                    if (this.slot && !this.room.connected[this.slot === 1 ? 1 : 0]) this.remote.clear();
                    this.onRoom(this.room, false); this.onStatus();
                } else if (message.type === 'action-result' && this.connected && this.slot) {
                    if (newerRoom(this.room, message.room)) {
                        this.acceptCubeRoom(message.room); this.room = message.room; this.roomReceivedAt = performance.now();
                    } else if (message.room.revision === this.room!.revision) {
                        // A denial can carry a fresher transform without a semantic revision.
                        this.acceptCubeRoom(message.room); this.room = message.room; this.roomReceivedAt = performance.now();
                    }
                    this.pendingControls.delete(message.seq);
                    for (const [id, pending] of this.pendingCrumble) if (pending.seq === message.seq) this.pendingCrumble.delete(id);
                    const resolved = this.prediction.resolve(message.seq, generation, message.accepted, this.room!, this.slot, performance.now());
                    if (!message.accepted) this.placements = {};
                    // Reconciliation also runs for a denial with an unchanged room revision.
                    if (resolved || message.room.revision === this.room!.revision) this.onRoom(this.room!, false);
                    this.onStatus();
                } else if (message.type === 'avatar' && message.slot !== this.slot && this.connected && this.room?.connected[message.slot - 1]) {
                    if (this.remote.push(message.avatar, message.stream, message.seq, performance.now(), message.discontinuity) && message.discontinuity === 'relay')
                        this.machineryEvents.push({ kind: 'teleport', at: message.avatar });
                } else if (message.type === 'cube' && this.connected && !!this.room?.cubes[message.cubeId] && !this.ownsCubeFor(message.cubeId)) {
                    if (this.cubeReplica(message.cubeId).push(message.transform, message.epoch, message.seq, performance.now(), message.discontinuity)) {
                        this.cubeReceived++; this.cubeLastAt = performance.now();
                        if (message.discontinuity === 'relay' && !this.room?.cubes[message.cubeId]?.holder) this.machineryEvents.push({ kind: 'relay-cargo', at: message.transform });
                    }
                } else if (message.type === 'cube-denied') {
                    // Contested/stale interactions are routine, not a room disconnection.
                    this.placements = {};
                } else if (message.type === 'error') {
                    if (message.code === 'STALE_ACTION') return;
                    const messageText = message.message;
                    this.leave(false); this.status = messageText; this.onStatus();
                }
            };
            ws.onclose = () => {
                if (generation !== this.generation) return;
                clearInterval(this.heartbeat); clearTimeout(this.deadline);
                this.prediction.clear(performance.now()); this.pendingControls.clear(); this.pendingCrumble.clear();
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
    private predict(kind: PredictedAction, transform?: CubeTransform, cubeId: CubeId = 'cube', cause: CubeResetCause = 'firewall'): boolean {
        if (!this.connected || (kind === 'switch' ? this.prediction.switch : this.prediction.cube)) return false;
        const seq = ++this.actionSeq, epoch = this.room!.cubes[cubeId]?.epoch ?? 0, now = performance.now();
        const message: ClientMessage = kind === 'switch' ? { type: kind, seq }
            : kind === 'cube-reset' ? { type: kind, cubeId, seq, epoch, cause }
            : kind === 'cube-drop' ? { type: kind, cubeId, seq, epoch, transform: transform! } : { type: kind, cubeId, seq, epoch };
        if (!this.send(message)) return false;
        return this.prediction.begin(kind, seq, epoch, this.generation, now, cubeId);
    }
    switchB(): boolean { return this.room?.level === 'pairing-bay' && !this.room.levelState.inputs.switchB && this.predict('switch'); }
    control(control: Extract<ClientMessage, { type: 'control' }>['control']): void {
        if (!this.connected || [...this.pendingControls.values()].includes(control)) return;
        const seq = ++this.actionSeq;
        if (this.send({ type: 'control', seq, control })) this.pendingControls.set(seq, control);
    }
    triggerCrumble(platform: CrumbleId, trigger: CrumbleTrigger): void {
        if (!this.connected || this.pendingCrumble.has(platform)) return;
        const seq = ++this.actionSeq;
        if (this.send({ type: 'crumble-trigger', seq, platform, trigger })) this.pendingCrumble.set(platform, { seq, trigger, at: performance.now() });
    }
    localReset(): void {
        if (this.connected && this.send({ type: 'local-reset', seq: ++this.actionSeq })) this.plate = null;
    }
    markDiscontinuity(entity: 'player' | 'cube', kind: Discontinuity, cubeId: CubeId = 'cube'): void {
        if (entity === 'player') this.playerDiscontinuity = kind; else this.cubeDiscontinuities[cubeId] = kind;
        this.lastLocalDiscontinuity = { entity: entity === 'cube' ? cubeId : entity, kind, at: performance.now() };
    }
    takeMachineryEvents() { return this.machineryEvents.splice(0); }
    reachExit(): void {
        if (this.connected && this.slot && this.room?.exitUnlocked && !this.room.reachedExit[this.slot - 1] && !this.exitSent)
            this.exitSent = this.send({ type: 'exit', seq: ++this.actionSeq });
    }
    cubeAction(type: CubeAction | 'cube-drop', transform?: CubeTransform, id: CubeId = 'cube', cause: CubeResetCause = 'firewall'): boolean {
        if (!this.room?.cubes[id] || type === 'cube-drop' && !transform) return false;
        if ((type === 'cube-pickup' || type === 'cube-pull-start') && cubeEntries(this.room.cubes).some(([other, c]) => other !== id
            && (c.holder === this.slot || c.pulling && c.physicsAuthority === this.slot))) return false;
        return this.predict(type, transform, id, cause);
    }
    cubeOccupancy(value: CubePlacement | boolean, id: CubeId = 'cube'): void {
        const placement = typeof value === 'boolean' ? value ? 'cargoPlate' : 'spawn' : value;
        if (!this.ownsCubeFor(id) || this.prediction.cube?.cubeId === id || this.placements[id] === placement) return;
        if (this.send({ type: 'cube-occupancy', cubeId: id, seq: ++this.actionSeq, epoch: this.room!.cubes[id]!.epoch, placement })) this.placements[id] = placement;
    }
    publishCube(cube: CubeTransform, now: number, id: CubeId = 'cube'): void {
        const discontinuity = this.cubeDiscontinuities[id];
        if (!this.ownsCubeFor(id) || this.prediction.cube?.cubeId === id || !discontinuity && now - (this.cubeSentAt[id] ?? 0) < 50) return;
        this.cubeSentAt[id] = now;
        const { x, y, vx, vy, grounded } = cube;
        if (this.send({ type: 'cube', cubeId: id, epoch: this.room!.cubes[id]!.epoch, seq: this.cubeSeq[id] = (this.cubeSeq[id] ?? 0) + 1,
            transform: { x, y, vx, vy, grounded }, ...(discontinuity ? { discontinuity } : {}) })) {
            delete this.cubeDiscontinuities[id]; this.cubeSent++; this.cubeLastAt = now;
        }
    }
    publish(p: PlayerState, now: number): void {
        if (!this.connected || !this.playerDiscontinuity && now - this.lastSentAt < 50) return;
        this.lastSentAt = now;
        const avatar: Avatar = { x: p.x, y: p.y, vx: p.vx, vy: p.vy, facing: p.facing, grounded: p.grounded,
            rope: p.rope.phase === 'idle' ? null : { ...p.rope.tip } };
        if (this.send({ type: 'avatar', seq: ++this.moveSeq, avatar, ...(this.playerDiscontinuity ? { discontinuity: this.playerDiscontinuity } : {}) })) this.playerDiscontinuity = undefined;
    }
    leave(forget = true): void {
        this.prediction.clear(performance.now()); this.pendingControls.clear(); this.pendingCrumble.clear();
        this.machineryEvents = [];
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
            connected: this.room?.connected, revision: this.room?.revision, level: this.room?.level, checkpoint: this.room?.checkpoint, levelState: this.room?.levelState,
            lastLocalDiscontinuity: this.lastLocalDiscontinuity, lastRemoteDiscontinuity: this.remote.lastDiscontinuity, lastCubeDiscontinuity: this.remoteCube.lastDiscontinuity,
            pendingControls: [...this.pendingControls.values()], pendingCrumble: [...this.pendingCrumble.keys()],
            crumblePhases: this.room?.level === 'crumble-lab' ? Object.fromEntries(Object.entries(this.room.levelState.platforms)
                .map(([id, p]) => [id, { ...p, remainingMs: Math.round(Math.max(0, p.remainingMs - (now - this.roomReceivedAt))) }])) : undefined,
            exitUnlocked: this.room?.exitUnlocked, reachedExit: this.room?.reachedExit, completed: this.room?.completed,
            cubes: this.room?.cubes, cubePlacements: this.room?.cubePlacements,
            cubeHolder: this.room?.cube?.holder, cubePhysicsAuthority: this.room?.cube?.physicsAuthority,
            cubeEpoch: this.room?.cube?.epoch, cubePlacement: this.room?.cubePlacement, cubeOnCargoPlate: this.room?.level === 'pairing-bay' && this.room.levelState.inputs.cubeOnCargoPlate,
            lastCubeReset: this.room?.cube?.lastReset ?? null,
            pendingCubeAction: this.prediction.cube, predictedHolder: this.prediction.cube?.kind === 'cube-pickup' ? this.slot : null,
            pendingSwitch: this.prediction.switch, interactionTimings: this.prediction.last,
            ownsCubePhysics: this.ownsCube, cubeSnapshotsSent: this.cubeSent, cubeSnapshotsReceived: this.cubeReceived,
            cubeSnapshotAgeMs: this.cubeLastAt ? Math.round(now - this.cubeLastAt) : null,
            lastServerMessageAgeMs: this.lastMessageAt ? Math.round(now - this.lastMessageAt) : null,
            sent: this.sent, received: this.received, reconnectAttempts: this.reconnectAttempts,
            remoteSnapshotAgeMs: this.remote.lastAt ? Math.round(now - this.remote.lastAt) : null };
    }
}
