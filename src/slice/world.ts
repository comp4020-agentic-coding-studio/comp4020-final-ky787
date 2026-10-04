import { CUBE_SIZE } from './tuning.ts';
import { CARRY, GRAPPLE, PLAYER } from '../engine/constants.ts';
import { boxesOverlap, clamp, type Vec2 } from '../engine/geometry.ts';
import { createPlayer, playerBox, releaseRope, stepBody, stepPlayer, findGrappleTarget, type InputState, type LooseBody, type Solid } from '../engine/physics.ts';
import { mockController, type ControllerInputs, type ControllerFrame, type RoomController } from './controller.ts';
import type { RoomMemory } from './progress.ts';
import type { Platform, RoomDef } from './rooms.ts';
import { LiftField, RelayGatePair } from './machinery.ts';
export interface Cube extends LooseBody {
    carried: boolean;
}
export interface PlatformState {
    def: Platform;
    solid: Solid;
    pulse: number;
    fuse: number;
    respawn: number;
}
export interface MachineEvent {
    kind: string;
    at: Vec2;
}
/** Physical simulation only. Controller adapter has no access to coordinates or bodies. */
export class PuzzleWorld {
    player = createPlayer(0, 0);
    cube: Cube | null = null;
    platforms: PlatformState[];
    solids: Solid[];
    door: Solid;
    inputs: ControllerInputs = { plateA: false, plateB: false, plateC: false, cubeOnPlate: false, cubeOnPlateB: false, cubeOnPlateC: false, switchB: false, switchC: false };
    lifts: LiftField[];
    gates: RelayGatePair[];
    cubeTransferred = false;
    frame: ControllerFrame;
    checkpoint: RoomMemory['checkpoint'] = 'entry';
    plateDepth = 0;
    plateDepthB = 0;
    plateDepthC = 0;
    keyboardGrapple = false;
    private cubeSolid: Solid = { id: 'cube-body', x: 0, y: 0, w: CUBE_SIZE, h: CUBE_SIZE, enabled: false, oneWay: false, grappleable: false };
    doorOpen = 0;
    displayPulse = 0;
    elapsed = 0;
    deaths = 0;
    deathFlash = 0;
    exited = false;
    pullingCube = false;
    events: MachineEvent[] = [];
    constructor(readonly room: RoomDef, memory: RoomMemory, private controller: RoomController = mockController) {
        this.inputs.switchB = memory.switchB;
        this.inputs.switchC = memory.switchC ?? false;
        this.cubeTransferred = memory.cubeTransferred ?? false;
        this.lifts = (room.lifts ?? []).map(def => new LiftField(def));
        this.gates = (room.gates ?? []).map(def => new RelayGatePair(def));
        this.checkpoint = memory.checkpoint;
        this.player = createPlayer(...this.spawnPoint());
        if (room.cube) {
            const plate = memory.cubeOnPlateC ? room.plateC : memory.cubeOnPlateB ? room.plateB : memory.cubeOnPlate ? room.plate : undefined;
            const at = plate ? { x: plate.x, y: plate.y - CUBE_SIZE / 2 } : this.cubeHome()!;
            this.cube = { ...at, vx: 0, vy: 0, carried: false, grounded: true, groundId: 'near' };
        }
        this.platforms = room.platforms.map(def => ({ def, pulse: 0, fuse: -1, respawn: 0,
            solid: { ...def, oneWay: def.kind !== 'static', enabled: def.kind !== 'code', grappleable: false, grappleWidth: 26, grapplePoint: def.anchor ? { x: def.x + def.w / 2, y: def.y + 6 } : undefined } }));
        this.door = { ...room.exit, id: 'exit-door', oneWay: false, enabled: true, grappleable: false };
        this.solids = [...this.platforms.map(p => p.solid), this.door,
            { id: 'left-wall', x: -40, y: -800, w: 40, h: 2000, enabled: true, oneWay: false, grappleable: false },
            { id: 'right-wall', x: room.width, y: -800, w: 40, h: 2000, enabled: true, oneWay: false, grappleable: false }];
        this.frame = this.controller.evaluate(room.id, this.inputs);
        this.samplePlate();
        this.evaluate();
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
        const c = this.cube;
        // Only a resting cube supports the player: no midair drop/jump ladder exploit.
        this.cubeSolid.enabled = !!c && !c.carried && c.grounded;
        if (c) { this.cubeSolid.x = c.x - CUBE_SIZE / 2; this.cubeSolid.y = c.y - CUBE_SIZE / 2; }
    }
    private evaluate(): void {
        const old = this.frame.outputs;
        this.frame = this.controller.evaluate(this.room.id, { ...this.inputs });
        for (const p of this.platforms) {
            if (p.def.kind !== 'code')
                continue;
            const active = !!p.def.signal && this.frame.outputs[p.def.signal];
            if (active !== p.solid.enabled) {
                p.pulse = 1;
                this.displayPulse = 1;
            }
            p.solid.enabled = active;
            p.solid.grappleable = active && !!p.def.anchor;
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
        const p = this.player, c = this.cube, lever = this.nearLever();
        if (c?.carried) {
            const ahead = p.x + p.facing * (PLAYER.width / 2 + CUBE_SIZE / 2 + 10);
            const y = p.y + PLAYER.height / 2 - CUBE_SIZE / 2 - 0.5;
            const box = { x: ahead - CUBE_SIZE / 2, y: y - CUBE_SIZE / 2, w: CUBE_SIZE, h: CUBE_SIZE };
            c.x = this.solids.some(s => s.enabled && !s.oneWay && boxesOverlap(box, s)) ? p.x : ahead;
            c.y = y;
            c.carried = false;
            c.vx = 0;
            c.vy = 0;
            c.grounded = false;
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
    respawn(): void {
        this.player = createPlayer(...this.spawnPoint());
        if (this.cube?.carried)
            this.returnCube();
        this.cancelGrapple();
        this.deaths++;
        this.deathFlash = 0.35;
        this.emit('death');
    }
    returnCube(): void {
        if (!this.cube || !this.room.cube)
            return;
        Object.assign(this.cube, this.cubeHome(), { vx: 0, vy: 0, carried: false, grounded: false });
        this.pullingCube = false;
        this.emit('cube-return');
    }
    cancelGrapple(): void {
        this.keyboardGrapple = false;
        this.pullingCube = false;
        releaseRope(this.player, false);
    }
    private keyboardHook(input: InputState): void {
        if (input.grapplePressed) this.keyboardGrapple = false; // Mouse takes ownership.
        if (input.airGrapplePressed) {
            const p = this.player;
            if (p.rope.phase === 'attached' || p.rope.phase === 'firing') {
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
        const c = this.cube, p = this.player;
        if (!c || c.carried || this.room.id === 'pressure' || p.groundId === this.cubeSolid.id) {
            this.pullingCube = false;
            return;
        }
        if (input.grapplePressed && Math.hypot(input.aim.x - c.x, input.aim.y - c.y) < 55 && Math.hypot(c.x - p.x, c.y - p.y) < GRAPPLE.maxRange) {
            // Cube is a pullable body, never inserted into the anchor/solid list.
            this.pullingCube = true;
            releaseRope(p, false);
            this.emit('cube-pull');
        }
        if (!input.grappleHeld || Math.hypot(c.x - p.x, c.y - p.y) > GRAPPLE.maxRange + 30)
            this.pullingCube = false;
        if (!this.pullingCube)
            return;
        const dx = p.x - c.x, dy = p.y - CUBE_SIZE / 2 - c.y, d = Math.hypot(dx, dy);
        if (d > CUBE_SIZE) {
            c.grounded = false;
            c.vx = dx / d * Math.min(330, d * 5);
            c.vy = dy / d * Math.min(330, d * 5) - 55;
        }
        else {
            c.vx = 0;
            c.vy = 0;
        }
    }
    step(dt: number, rawInput: InputState, interact = false): void {
        if (this.exited)
            return;
        this.elapsed += dt;
        this.deathFlash = Math.max(0, this.deathFlash - dt);
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
        if (this.keyboardGrapple) this.pullingCube = false;
        else this.hookCube(input);
        if (this.pullingCube) {
            input.grappleHeld = false;
            input.grapplePressed = false;
        }
        if (this.cube && !this.cube.carried) {
            const c = this.cube;
            const field = this.lifts.map(l => l.influence(c, CUBE_SIZE, CUBE_SIZE)).find(Boolean);
            stepBody(c, CUBE_SIZE, this.solids, this.pullingCube ? 300 : CARRY.cubeGravity, CARRY.cubeMaxFall, dt, field);
            for (const pair of this.gates) if (pair.teleport('cube', c, CUBE_SIZE, CUBE_SIZE, this.solids, this.room)) {
                this.cubeTransferred = true;
                this.pullingCube = false;
                this.emit('relay-cargo', c);
                break;
            }
            if (c.y > this.room.height || this.room.hazards.some(h => boxesOverlap(h, {
                x: c.x - CUBE_SIZE / 2, y: c.y - CUBE_SIZE / 2, w: CUBE_SIZE, h: CUBE_SIZE,
            }))) this.returnCube();
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
        stepPlayer(this.player, input, this.cubeSolid.enabled ? [...this.solids, this.cubeSolid] : this.solids, dt, field);
        if (!wasAttached && this.player.rope.phase === 'attached') this.emit('grapple');
        if (this.keyboardGrapple && (this.player.grounded || ['idle', 'retracting'].includes(this.player.rope.phase))) {
            this.keyboardGrapple = false;
            releaseRope(this.player, false);
        }
        for (const pair of this.gates) if (pair.teleport('player', this.player, this.cube?.carried ? CUBE_SIZE : PLAYER.width, PLAYER.height,
            this.cubeSolid.enabled ? [...this.solids, this.cubeSolid] : this.solids, this.room, this.cube?.carried ? CARRY.holdGap + CUBE_SIZE : 0)) {
            this.cancelGrapple();
            this.player.coyote = 0;
            this.player.jumpBuffer = 0;
            this.emit('teleport');
            if (this.cube?.carried) { this.cubeTransferred = true; this.emit('relay-cargo'); }
            break;
        }
        if (this.cube?.carried) Object.assign(this.cube, {
            x: this.player.x, y: this.player.y - PLAYER.height / 2 - CARRY.holdGap - CUBE_SIZE / 2,
            vx: 0, vy: 0, grounded: false,
        });
        this.samplePlate();
        this.evaluate();
        for (const platform of this.platforms) {
            platform.pulse = Math.max(0, platform.pulse - dt * 1.8);
            if (platform.def.kind !== 'crumble-prototype')
                continue;
            if (platform.fuse < 0 && platform.respawn === 0 && this.player.groundId === platform.def.id)
                platform.fuse = 0.6;
            if (platform.fuse >= 0) {
                platform.fuse -= dt;
                if (platform.fuse <= 0) {
                    platform.fuse = -1;
                    platform.respawn = 2.4;
                    platform.solid.enabled = false;
                    this.emit('crumble', { x: platform.def.x, y: platform.def.y });
                }
            }
            else if (platform.respawn > 0) {
                platform.respawn = Math.max(0, platform.respawn - dt);
                if (platform.respawn === 0)
                    platform.solid.enabled = true;
            }
        }
        this.plateDepth += ((this.inputs.plateA ? 1 : 0) - this.plateDepth) * Math.min(1, dt * 16);
        this.plateDepthB += ((this.inputs.plateB ? 1 : 0) - this.plateDepthB) * Math.min(1, dt * 16);
        this.plateDepthC += ((this.inputs.plateC ? 1 : 0) - this.plateDepthC) * Math.min(1, dt * 16);
        this.doorOpen = clamp(this.doorOpen + (this.frame.outputs.exitDoor ? dt * 3 : -dt * 3), 0, 1);
        this.displayPulse = Math.max(0, this.displayPulse - dt * 0.9);
        if (this.room.hazards.some(h => boxesOverlap(playerBox(this.player), h)) || this.player.y > this.room.height + 50)
            this.respawn();
        if (this.frame.outputs.exitDoor && boxesOverlap(playerBox(this.player), this.room.exit)) {
            this.exited = true;
            this.emit('complete');
        }
    }
    target(aim: Vec2) { return this.room.id === 'pressure' ? null : findGrappleTarget(this.player, aim, this.solids, this.player.groundId); }
}
