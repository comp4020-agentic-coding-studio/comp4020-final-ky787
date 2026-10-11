import { roomController } from './validated-controller.ts';
import { CUBE_SIZE, CODE_SLAB_HEIGHT } from './tuning.ts';
import { CARRY, GRAPPLE, PLAYER } from '../engine/constants.ts';
import { boxesOverlap, clamp, type Vec2 } from '../engine/geometry.ts';
import { createPlayer, playerBox, releaseRope, stepBody, stepPlayer, findGrappleTarget, type InputState, type LooseBody, type Solid } from '../engine/physics.ts';
import { type ControllerInputs, type ControllerFrame, type RoomController } from './controller.ts';
import type { RoomMemory } from './progress.ts';
import type { Platform, RoomDef } from './rooms.ts';
import { LiftField, RelayGatePair } from './machinery.ts';
import { cubeEntries, type CubeId, type CubeMap, type CubePlacement, type CubeResetCause, type Discontinuity, type Slot } from '../coop/protocol.ts';
import { firewallBox, touchingFirewall, type Firewall } from './firewall.ts';
export type DeathCause = 'reset' | 'hazard' | 'fall' | 'firewall';
export interface Cube extends LooseBody {
    carried: boolean;
}
export interface PlatformState {
    def: Platform;
    solid: Solid;
    pulse: number;
    fuse: number;
    fuseDuration: number;
    respawn: number;
}
export interface MachineEvent {
    kind: string;
    at: Vec2;
    cause?: DeathCause;
    firewallId?: string;
}
/** Optional shared-body boundary; the existing physics stays in this world. */
export interface CubeAuthority {
    readonly simulates: boolean;
    readonly heldLocally: boolean;
    readonly cargoVisual?: boolean;
    readonly resetting?: boolean;
    firewall?(world: PuzzleWorld, cause?: CubeResetCause): boolean;
    /** Local avatar movement only: never architecture, a cube body, sensor or anchor. */
    readonly partnerSupport?: { cubeId?: CubeId; carrier: Slot; surface: Solid } | null;
    consumeCorrection?(): boolean;
    sync(world: PuzzleWorld): void;
    pull(start: boolean, held: boolean): boolean;
    cancelPull(): void;
    release(world: PuzzleWorld): void;
}
/** Optional external authority supplies accepted state; sensors only report intent. */
export interface CrumbleAuthority { sync(world: PuzzleWorld): void; sample(world: PuzzleWorld): void }
export interface WorldAuthority {
    cube?: CubeAuthority;
    cubes?: CubeMap<CubeAuthority>;
    crumble?: CrumbleAuthority;
    reset?(): void;
    discontinuity?(entity: 'player' | 'cube', reason: Discontinuity, cubeId?: CubeId): void;
    frame: ControllerFrame;
    inputs: ControllerInputs;
    checkpoint: RoomMemory['checkpoint'];
    sample(world: PuzzleWorld): void;
    interact(world: PuzzleWorld): void;
    hint(world: PuzzleWorld): string;
}
/** Physical simulation only. Controller adapter has no access to coordinates or bodies. */
export class PuzzleWorld {
    player = createPlayer(0, 0);
    cubes: CubeMap<Cube> = {};
    /** Legacy single-cube view; C8 and accepted one-cube labs retain their API. */
    get cube(): Cube | null { return this.cubes.cube ?? null; }
    cubeAuthority(id: CubeId = 'cube') { return this.authority?.cubes?.[id] ?? (id === 'cube' ? this.authority?.cube : undefined); }
    private syncCubes() { for (const [id] of cubeEntries(this.cubes)) this.cubeAuthority(id)?.sync(this); }
    cubeIsResetting(id: CubeId) { return this.cubeAuthority(id)?.resetting ?? false; }
    cubeSpawn(id: CubeId = 'cube'): Vec2 | undefined { return id === 'cube' ? this.room.cube : this.room.cubes?.find(c => c.id === id)?.spawn; }
    cubePlacementPosition(id: CubeId, placement: CubePlacement = 'spawn'): Vec2 {
        const at = placement === 'cargoPlate' ? this.room.cargoPlate : this.room.cubePads?.find(p => p.id === placement)?.at;
        return at ? { x: at.x, y: at.y - CUBE_SIZE / 2 } : this.cubeSpawn(id)!;
    }
    setCubePulling(id: CubeId, on: boolean) { if (on) this.pullingCubeId = id; else if (this.pullingCubeId === id) this.pullingCubeId = null; }
    pullingCubeId: CubeId | null = null;
    get pullingCube() { return this.pullingCubeId !== null; }
    set pullingCube(on: boolean) { this.pullingCubeId = on ? this.pullingCubeId ?? 'cube' : null; }
    platforms: PlatformState[];
    solids: Solid[];
    door: Solid;
    inputs: ControllerInputs = { plateA: false, plateB: false, plateC: false, cubeOnPlate: false, cubeOnPlateB: false, cubeOnPlateC: false, switchB: false, switchC: false };
    lifts: LiftField[];
    gates: RelayGatePair[];
    firewalls: Firewall[];
    cubeTransferred = false;
    frame: ControllerFrame;
    checkpoint: RoomMemory['checkpoint'] = 'entry';
    plateDepth = 0;
    plateDepthB = 0;
    plateDepthC = 0;
    cargoPlateDepth = 0;
    consumeCubeCorrection() { return cubeEntries(this.cubes).map(([id]) => this.cubeAuthority(id)?.consumeCorrection?.() ?? false).some(Boolean); }
    get cargoPlateActive() { return this.authority?.cube?.cargoVisual ?? this.inputs.cubeOnPlate; }
    get partnerCubeSupport() { return cubeEntries(this.cubes).map(([id]) => this.cubeAuthority(id)?.partnerSupport).find(Boolean) ?? null; }
    get groundedOnPartnerCube() { return this.player.grounded && !!this.player.groundId?.startsWith('partner-cube-support'); }
    get cubeResetting() { return this.authority?.cube?.resetting ?? false; }
    keyboardGrapple = false;
    private cubeSolids: CubeMap<Solid> = {};
    doorOpen = 0;
    displayPulse = 0;
    elapsed = 0;
    deaths = 0;
    lastDeath: { cause: DeathCause; at: Vec2; firewallId?: string } | null = null;
    deathFlash = 0;
    exited = false;
    events: MachineEvent[] = [];
    constructor(readonly room: RoomDef, memory: RoomMemory, private controller: RoomController = roomController, private authority?: WorldAuthority) {
        this.inputs.switchB = memory.switchB;
        this.inputs.switchC = memory.switchC ?? false;
        this.cubeTransferred = memory.cubeTransferred ?? false;
        this.lifts = (room.lifts ?? []).map(def => new LiftField(def));
        this.gates = (room.gates ?? []).map(def => new RelayGatePair(def));
        this.firewalls = (room.firewalls ?? []).map(def => ({ def, box: firewallBox(def) }));
        this.checkpoint = memory.checkpoint;
        this.player = createPlayer(...this.spawnPoint());
        if (room.cube) {
            const plate = memory.cubeOnPlateC ? room.plateC : memory.cubeOnPlateB ? room.plateB : memory.cubeOnPlate ? room.plate : undefined;
            const at = plate ? { x: plate.x, y: plate.y - CUBE_SIZE / 2 } : this.cubeHome()!;
            this.cubes.cube = { ...at, vx: 0, vy: 0, carried: false, grounded: true, groundId: 'near' };
        }
        for (const def of room.cubes ?? []) this.cubes[def.id] = { ...def.spawn, vx: 0, vy: 0, carried: false, grounded: true, groundId: null };
        for (const [id] of cubeEntries(this.cubes)) this.cubeSolids[id] = { id: id === 'cube' ? 'cube-body' : `cube-body:${id}`,
            x: 0, y: 0, w: CUBE_SIZE, h: CUBE_SIZE, enabled: false, oneWay: false, grappleable: false };
        this.platforms = room.platforms.map(def => ({ def, pulse: 0, fuse: -1, fuseDuration: .6, respawn: 0,
            solid: { ...def, oneWay: def.kind !== 'static', enabled: def.kind !== 'code', grappleable: def.kind !== 'static' && def.kind !== 'code', grappleHeight: Math.min(CODE_SLAB_HEIGHT, def.h), grapplePoint: def.anchor ? { x: def.x + def.w / 2, y: def.y + 6 } : undefined } }));
        this.door = { ...room.exit, id: 'exit-door', oneWay: false, enabled: true, grappleable: false };
        this.solids = [...this.platforms.map(p => p.solid), this.door,
            { id: 'left-wall', x: -40, y: -800, w: 40, h: room.height + 840, enabled: true, oneWay: false, grappleable: false },
            { id: 'right-wall', x: room.width, y: -800, w: 40, h: room.height + 840, enabled: true, oneWay: false, grappleable: false }];
        this.frame = this.authority?.frame ?? this.controller.evaluate(room.id, this.inputs);
        this.syncCubes();
        this.samplePlate();
        this.evaluate();
        this.authority?.crumble?.sync(this);
        this.events = [];
    }
    private spawnPoint(): [
        number,
        number
    ] {
        const p = this.checkpointPosition();
        return [p.x, p.y];
    }
    checkpointPosition(): Vec2 {
        return this.checkpoint === 'upper' ? this.room.upperCheckpoint! : this.checkpoint === 'relay' ? this.room.checkpoint : this.room.spawn;
    }
    private cubeHome(): Vec2 | undefined { return this.cubeTransferred && this.room.cargoRecovery ? this.room.cargoRecovery : this.room.cube; }
    private emit(kind: string, at: Vec2 = this.player): void { this.events.push({ kind, at: { x: at.x, y: at.y } }); }
    memory(): RoomMemory { return { switchB: this.inputs.switchB, cubeOnPlate: this.inputs.cubeOnPlate, cubeOnPlateB: this.inputs.cubeOnPlateB, checkpoint: this.checkpoint,
        ...(this.room.id === 'uplink' ? { switchC: this.inputs.switchC, cubeOnPlateC: this.inputs.cubeOnPlateC, cubeTransferred: this.cubeTransferred } : {}) }; }
    private onPlate(body: Vec2, width: number, height: number, plate: Vec2 | undefined): boolean {
        return !!plate && Math.abs(body.x - plate.x) < 45 + width / 2 - 8 && Math.abs(body.y + height / 2 - plate.y) < 5;
    }
    private samplePlate(): void {
        if (this.authority) { this.authority.sample(this); return; }
        const c = this.cube, p = this.player;
        const occupied = (plate: Vec2 | undefined) => ({
            cube: !!c && !c.carried && c.grounded && this.onPlate(c, CUBE_SIZE, CUBE_SIZE, plate),
            player: p.grounded && this.onPlate(p, PLAYER.width, PLAYER.height, plate),
        });
        const a = occupied(this.room.plate), b = occupied(this.room.plateB), node = occupied(this.room.plateC);
        const wasA = this.inputs.plateA, wasB = this.inputs.plateB;
        const wasPayload = this.inputs.cubeOnPlateC;
        this.inputs.cubeOnPlate = a.cube;
        this.inputs.cubeOnPlateB = b.cube;
        this.inputs.plateA = a.cube || a.player;
        this.inputs.plateB = b.cube || b.player;
        this.inputs.plateC = node.cube || node.player;
        this.inputs.cubeOnPlateC = node.cube;
        if (this.room.cargoRecovery && (b.cube || node.cube)) this.cubeTransferred = true;
        if (!wasA && this.inputs.plateA) this.emit('plate', this.room.plate);
        if (!wasB && this.inputs.plateB) this.emit('plate', this.room.plateB);
        if (!wasPayload && node.cube) this.emit('payload', this.room.plateC);
    }
    private nearLever() {
        const controls = [
            { at: this.room.lever, input: 'switchB' as const, latch: this.room.id === 'relay', name: this.room.id === 'uplink' ? 'relay power' : 'switch' },
            { at: this.room.upperLever, input: 'switchC' as const, latch: true, name: 'lift latch' },
        ];
        return controls.find(s => s.at && Math.hypot(this.player.x - s.at.x, this.player.y - (s.at.y - 25)) < 72);
    }
    private updateCubeSolid(): void {
        for (const [id, c] of cubeEntries(this.cubes)) {
            const solid = this.cubeSolids[id]!;
            // Resting only; each payload independently supports the avatar.
            solid.enabled = !this.cubeIsResetting(id) && !c.carried && c.grounded;
            solid.x = c.x - CUBE_SIZE / 2; solid.y = c.y - CUBE_SIZE / 2;
        }
    }
    private evaluate(): void {
        const old = this.frame.outputs;
        if (this.authority) {
            this.inputs = { ...this.authority.inputs };
            this.checkpoint = this.authority.checkpoint;
        }
        this.frame = this.authority?.frame ?? this.controller.evaluate(this.room.id, { ...this.inputs });
        for (const p of this.platforms) if (p.def.openWhen) p.solid.enabled = !this.frame.outputs[p.def.openWhen];
        for (const p of this.platforms) {
            if (p.def.kind !== 'code')
                continue;
            const active = !!p.def.signal && this.frame.outputs[p.def.signal];
            if (active !== p.solid.enabled) {
                p.pulse = 1;
                this.displayPulse = 1;
            }
            p.solid.enabled = active;
            p.solid.grappleable = active;
        }
        if (Object.keys(old).some(k => old[k as keyof typeof old] !== this.frame.outputs[k as keyof typeof old]))
            this.displayPulse = 1;
        if (!old.bridge && this.frame.outputs.bridge)
            this.emit('bridge');
        for (const field of this.lifts) field.power(this.frame.outputs[field.def.signal]);
        for (const pair of this.gates) pair.power(this.frame.outputs[pair.def.signal]);
        if (!old.relayGates && this.frame.outputs.relayGates) this.emit('relay-power');
        if (!old.liftField && this.frame.outputs.liftField) this.emit('lift');
        this.door.enabled = !this.frame.outputs.exitDoor;
    }
    interactionHint(): string {
        if (this.authority) return this.authority.hint(this);
        if (this.cube?.carried)
            return 'E · put down cube';
        const lever = this.nearLever();
        if (lever && !(lever.latch && this.inputs[lever.input]))
            return `E · ${lever.name} ${this.inputs[lever.input] ? 'OFF' : 'ON'}`;
        if (this.cube && Math.hypot(this.player.x - this.cube.x, this.player.y - this.cube.y) < CARRY.reach)
            return 'E · carry cube';
        if (lever?.latch && this.inputs[lever.input]) return lever.input === 'switchC' ? 'Lift latched · power held' : 'Bridge locked · move the cube to B';
        return '';
    }
    interact(): void {
        if (this.authority) { this.authority.interact(this); return; }
        const p = this.player, c = this.cube, lever = this.nearLever();
        if (c?.carried) {
            Object.assign(c, this.cubeDropTransform(), { carried: false });
        }
        else if (lever && !(lever.latch && this.inputs[lever.input])) {
            this.inputs[lever.input] = !this.inputs[lever.input];
            this.emit('switch', lever.at);
            if (lever.input === 'switchC') {
                this.checkpoint = 'upper';
                this.emit('lift-latch', lever.at);
                this.emit('checkpoint');
            } else if ((this.room.id === 'relay' || this.room.id === 'uplink') && this.inputs.switchB && this.checkpoint === 'entry') {
                this.checkpoint = 'relay';
                this.emit('checkpoint');
            }
            this.evaluate();
        }
        else if (c && Math.hypot(p.x - c.x, p.y - c.y) < CARRY.reach) {
            c.carried = true;
            c.grounded = false;
            this.pullingCube = false;
            this.emit('carry');
        }
    }
    /** Compute a proposed drop without changing the cube before server acceptance. */
    cubeDropTransform() {
        const p = this.player;
        const ahead = p.x + p.facing * (PLAYER.width / 2 + CUBE_SIZE / 2 + 10);
        const y = p.y + PLAYER.height / 2 - CUBE_SIZE / 2 - 0.5;
        const box = { x: ahead - CUBE_SIZE / 2, y: y - CUBE_SIZE / 2, w: CUBE_SIZE, h: CUBE_SIZE };
        return { x: this.solids.some(s => s.enabled && !s.oneWay && boxesOverlap(box, s)) ? p.x : ahead,
            y, vx: 0, vy: 0, grounded: false };
    }
    respawn(cause: DeathCause = 'reset', firewallId?: string): void {
        const at = { x: this.player.x, y: this.player.y };
        this.lastDeath = { cause, at, ...(firewallId ? { firewallId } : {}) };
        for (const [id] of cubeEntries(this.cubes)) this.cubeAuthority(id)?.release(this);
        this.authority?.reset?.();
        this.player = createPlayer(...this.spawnPoint());
        this.authority?.discontinuity?.('player', 'respawn');
        if (!this.authority?.cube && this.cube?.carried)
            this.returnCube();
        this.cancelGrapple();
        this.deaths++;
        this.deathFlash = 0.35;
        this.events.push({ kind: 'death', at: cause === 'firewall' ? at : { x: this.player.x, y: this.player.y }, cause, firewallId });
    }
    private carriedPose(): void {
        for (const [id, c] of cubeEntries(this.cubes)) if (c.carried && (!this.cubeAuthority(id) || this.cubeAuthority(id)!.heldLocally)) Object.assign(c, {
            x: this.player.x, y: this.player.y - PLAYER.height / 2 - CARRY.holdGap - CUBE_SIZE / 2, vx: 0, vy: 0, grounded: false,
        });
    }
    private cubeFirewall(id: CubeId = 'cube'): boolean {
        const c = this.cubes[id], authority = this.cubeAuthority(id);
        if (!c || !this.firewalls.length || this.cubeIsResetting(id)) return this.cubeIsResetting(id);
        const hit = touchingFirewall(this.firewalls, { x: c.x - CUBE_SIZE / 2, y: c.y - CUBE_SIZE / 2, w: CUBE_SIZE, h: CUBE_SIZE });
        if (!hit) return false;
        const at = { x: c.x, y: c.y };
        if (authority) {
            if (!authority.firewall?.(this)) return false;
        } else {
            Object.assign(c, this.cubeSpawn(id), { vx: 0, vy: 0, carried: false, grounded: false, groundId: null });
            this.setCubePulling(id, false);
        }
        this.events.push({ kind: 'cube-firewall', at, cause: 'firewall', firewallId: hit.def.id });
        return true;
    }
    private playerFirewall(): boolean {
        if (!this.firewalls.length) return false;
        this.carriedPose();
        for (const [id] of cubeEntries(this.cubes)) this.cubeFirewall(id); // Payload contact must be reported before death releases it.
        const hit = touchingFirewall(this.firewalls, playerBox(this.player));
        if (!hit) return false;
        this.respawn('firewall', hit.def.id);
        return true;
    }
    returnCube(id: CubeId = 'cube'): void {
        const c = this.cubes[id], authority = this.cubeAuthority(id);
        if (!c || authority && !authority.simulates) return;
        if (authority) { authority.firewall?.(this, 'recovery'); return; }
        Object.assign(c, id === 'cube' ? this.cubeHome() : this.cubeSpawn(id), { vx: 0, vy: 0, carried: false, grounded: false });
        this.authority?.discontinuity?.('cube', 'recovery', id);
        this.setCubePulling(id, false);
        this.emit('cube-return');
    }
    cancelGrapple(): void {
        for (const [id] of cubeEntries(this.cubes)) this.cubeAuthority(id)?.cancelPull();
        this.keyboardGrapple = false;
        this.pullingCube = false;
        releaseRope(this.player, false);
    }
    private keyboardHook(input: InputState): void {
        if (input.grapplePressed) this.keyboardGrapple = false; // Mouse takes ownership.
        if (input.airGrapplePressed) {
            const p = this.player;
            if (p.rope.phase === 'attached') {
                // Route keyboard and mouse-held ropes through the same jump physics.
                this.keyboardGrapple = false;
                input.jumpPressed = true;
                input.grappleHeld = true;
                return;
            }
            if (p.rope.phase === 'firing') {
                this.keyboardGrapple = false;
                releaseRope(p);
                input.jumpPressed = false;
                input.grappleHeld = false;
                p.jumpBuffer = 0;
                return;
            }
            const target = !p.grounded ? this.target(input.aim) : null;
            if (target) {
                // Exactly the same probe as the pre-click hint, never an arbitrary surface.
                this.keyboardGrapple = true;
                input.aim = target.point;
                input.grapplePressed = true;
                input.jumpPressed = false;
                p.jumpBuffer = 0;
            }
        }
        if (this.keyboardGrapple) input.grappleHeld = true;
    }
    private hookCube(input: InputState): void {
        const p = this.player;
        const candidate = input.grapplePressed ? cubeEntries(this.cubes).filter(([id, c]) => !c.carried && !this.cubeIsResetting(id)
            && p.groundId !== this.cubeSolids[id]!.id && Math.hypot(input.aim.x - c.x, input.aim.y - c.y) < 55
            && Math.hypot(c.x - p.x, c.y - p.y) < GRAPPLE.maxRange)
            .sort((a, b) => Math.hypot(input.aim.x - a[1].x, input.aim.y - a[1].y) - Math.hypot(input.aim.x - b[1].x, input.aim.y - b[1].y))[0]?.[0] : undefined;
        for (const [id, c] of cubeEntries(this.cubes)) {
            const authority = this.cubeAuthority(id);
            if (c.carried || this.room.id === 'pressure' || p.groundId === this.cubeSolids[id]!.id) {
                authority?.cancelPull(); this.setCubePulling(id, false); continue;
            }
            const start = candidate === id;
            const held = input.grappleHeld && Math.hypot(c.x - p.x, c.y - p.y) <= GRAPPLE.maxRange + 30;
            const pulling = authority ? authority.pull(start, held) : held && (start || this.pullingCubeId === id);
            if (start) { input.grapplePressed = false; releaseRope(p, false); }
            if (pulling && this.pullingCubeId !== id) this.emit('cube-pull');
            this.setCubePulling(id, pulling);
            if (!pulling) continue;
            const dx = p.x - c.x, dy = p.y - CUBE_SIZE / 2 - c.y, d = Math.hypot(dx, dy);
            if (d > CUBE_SIZE) { c.grounded = false; c.vx = dx / d * Math.min(330, d * 5); c.vy = dy / d * Math.min(330, d * 5) - 55; }
            else { c.vx = 0; c.vy = 0; }
        }
    }
    step(dt: number, rawInput: InputState, interact = false): void {
        if (this.exited)
            return;
        this.elapsed += dt;
        this.deathFlash = Math.max(0, this.deathFlash - dt);
        this.syncCubes();
        this.authority?.crumble?.sync(this);
        if (interact)
            this.interact();
        const input = { ...rawInput };
        if (this.room.id === 'pressure') {
            input.grappleHeld = false;
            input.grapplePressed = false;
        }
        this.samplePlate();
        this.evaluate();
        for (const machine of [...this.lifts, ...this.gates]) machine.step(dt);
        this.keyboardHook(input);
        if (this.keyboardGrapple) { for (const [id] of cubeEntries(this.cubes)) this.cubeAuthority(id)?.cancelPull(); this.pullingCube = false; }
        else this.hookCube(input);
        if (this.pullingCube) {
            input.grappleHeld = false;
            input.grapplePressed = false;
        }
        for (const [id, c] of cubeEntries(this.cubes)) if (!c.carried && (!this.cubeAuthority(id) || this.cubeAuthority(id)!.simulates)) {
            const authority = this.cubeAuthority(id);
            const field = this.lifts.map(l => l.influence(c, CUBE_SIZE, CUBE_SIZE)).find(Boolean);
            stepBody(c, CUBE_SIZE, this.solids, this.pullingCubeId === id ? 300 : CARRY.cubeGravity, CARRY.cubeMaxFall, dt, field);
            if (!this.cubeFirewall(id)) for (const pair of this.gates) if (pair.teleport(id, c, CUBE_SIZE, CUBE_SIZE, this.solids, this.room)) {
                this.cubeTransferred = true;
                this.setCubePulling(id, false); authority?.cancelPull();
                this.authority?.discontinuity?.('cube', 'relay', id);
                this.emit('relay-cargo', c); break;
            }
            if (!this.cubeFirewall(id) && (c.y > this.room.height || this.room.hazards.some(h => boxesOverlap(h, {
                x: c.x - CUBE_SIZE / 2, y: c.y - CUBE_SIZE / 2, w: CUBE_SIZE, h: CUBE_SIZE,
            })))) this.returnCube(id);
        }
        this.updateCubeSolid();
        const field = this.lifts.map(l => l.influence(this.player, PLAYER.width, PLAYER.height)).find(Boolean);
        if (field) {
            this.keyboardGrapple = false;
            releaseRope(this.player, false);
            input.grapplePressed = false;
            input.grappleHeld = false;
        }
        const wasAttached = this.player.rope.phase === 'attached';
        const support = this.partnerCubeSupport?.surface;
        if (this.player.groundId?.startsWith('partner-cube-support') && (!support
            || this.player.x + PLAYER.width / 2 <= support.x || this.player.x - PLAYER.width / 2 >= support.x + support.w
            || Math.abs(this.player.y + PLAYER.height / 2 - support.y) > 1.5)) {
            this.player.grounded = false;
            this.player.groundId = null;
        }
        const movementSolids = [...this.solids, ...Object.values(this.cubeSolids).filter(s => s.enabled), ...(support ? [support] : [])];
        stepPlayer(this.player, input, movementSolids, dt, field);
        if (!wasAttached && this.player.rope.phase === 'attached') this.emit('grapple');
        if (this.keyboardGrapple && (this.player.grounded || ['idle', 'retracting'].includes(this.player.rope.phase))) {
            this.keyboardGrapple = false;
            releaseRope(this.player, false);
        }
        if (this.playerFirewall()) return;
        const carrying = cubeEntries(this.cubes).find(([id, c]) => c.carried && (!this.cubeAuthority(id) || this.cubeAuthority(id)!.heldLocally))?.[0];
        // A shared loose cube selects a bounded outward egress lane. Keep all room
        // geometry and full carried-payload/bounds checks; preserve C8 clearance.
        // Partner support is movement-only and never participates in clearance.
        const restingCubes = Object.values(this.cubeSolids).filter(s => s.enabled);
        const egressSolids = !this.authority ? [...this.solids, ...restingCubes] : this.solids;
        for (const pair of this.gates) if (pair.teleport('player', this.player, carrying ? CUBE_SIZE : PLAYER.width, PLAYER.height,
            egressSolids, this.room, carrying ? CARRY.holdGap + CUBE_SIZE : 0, this.authority ? restingCubes : undefined)) {
            this.cancelGrapple();
            this.player.coyote = 0;
            this.player.jumpBuffer = 0;
            this.emit('teleport');
            this.authority?.discontinuity?.('player', 'relay');
            if (carrying) { this.cubeTransferred = true; this.emit('relay-cargo'); this.authority?.discontinuity?.('cube', 'relay', carrying); }
            break;
        }
        this.carriedPose();
        if (this.playerFirewall()) return;
        this.samplePlate();
        this.evaluate();
        this.authority?.crumble?.sample(this);
        for (const platform of this.platforms) {
            platform.pulse = Math.max(0, platform.pulse - dt * 1.8);
            if (platform.def.kind !== 'crumble-prototype' && platform.def.kind !== 'crumble-proven')
                continue;
            if (this.authority?.crumble) continue;
            if (platform.fuse < 0 && platform.respawn === 0) {
                const hooked = this.player.rope.phase === 'attached' && this.player.rope.anchorId === platform.def.id;
                const hookDelay = hooked ? platform.def.hookCrumbleDelay : undefined;
                if (this.player.groundId === platform.def.id || hookDelay !== undefined) {
                    platform.fuseDuration = hookDelay ?? .6;
                    platform.fuse = platform.fuseDuration;
                }
            }
            if (platform.fuse >= 0) {
                platform.fuse -= dt;
                if (platform.fuse <= 0) {
                    platform.fuse = -1;
                    platform.respawn = 2.4;
                    platform.solid.enabled = false;
                    if (this.player.rope.anchorId === platform.def.id) this.cancelGrapple();
                    this.emit('crumble', { x: platform.def.x, y: platform.def.y });
                }
            }
            else if (platform.respawn > 0) {
                platform.respawn = Math.max(0, platform.respawn - dt);
                if (platform.respawn === 0)
                    platform.solid.enabled = true;
            }
            platform.solid.grappleable = platform.solid.enabled;
        }
        this.plateDepth += ((this.inputs.plateA ? 1 : 0) - this.plateDepth) * Math.min(1, dt * 16);
        this.plateDepthB += ((this.inputs.plateB ? 1 : 0) - this.plateDepthB) * Math.min(1, dt * 16);
        this.plateDepthC += ((this.inputs.plateC ? 1 : 0) - this.plateDepthC) * Math.min(1, dt * 16);
        this.cargoPlateDepth += ((this.cargoPlateActive ? 1 : 0) - this.cargoPlateDepth) * Math.min(1, dt * 16);
        this.doorOpen = clamp(this.doorOpen + (this.frame.outputs.exitDoor ? dt * 3 : -dt * 3), 0, 1);
        this.displayPulse = Math.max(0, this.displayPulse - dt * 0.9);
        if (this.room.hazards.some(h => boxesOverlap(playerBox(this.player), h))) this.respawn('hazard');
        else if (this.player.y > this.room.height + 50) this.respawn('fall');
        if (!this.authority && this.frame.outputs.exitDoor && boxesOverlap(playerBox(this.player), this.room.exit)) {
            this.exited = true;
            this.emit('complete');
        }
    }
    target(aim: Vec2) { return this.room.id === 'pressure' ? null : findGrappleTarget(this.player, aim, this.solids, this.player.groundId); }
    /** Apply accepted state even while menus or a reconnect pause local simulation. */
    syncAuthority(): void { if (this.authority) { this.syncCubes(); this.authority.crumble?.sync(this); this.evaluate(); } }
}
