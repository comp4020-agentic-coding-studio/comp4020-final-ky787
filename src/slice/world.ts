import { CARRY, GRAPPLE, PLAYER } from '../engine/constants.ts';
import { boxesOverlap, clamp, type Vec2 } from '../engine/geometry.ts';
import { createPlayer, playerBox, releaseRope, stepBody, stepPlayer, findGrappleTarget, type InputState, type LooseBody, type Solid } from '../engine/physics.ts';
import { mockController, type ControllerInputs, type ControllerFrame, type RoomController } from './controller.ts';
import type { RoomMemory } from './progress.ts';
import type { Platform, RoomDef } from './rooms.ts';
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
    inputs: ControllerInputs = { plateA: false, cubeOnPlate: false, switchB: false };
    frame: ControllerFrame;
    checkpoint: RoomMemory['checkpoint'] = 'entry';
    plateDepth = 0;
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
        this.checkpoint = memory.checkpoint;
        this.player = createPlayer(...this.spawnPoint());
        if (room.cube) {
            const at = memory.cubeOnPlate && room.plate ? { x: room.plate.x, y: room.plate.y - CARRY.cubeSize / 2 } : room.cube;
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
        const p = this.checkpoint === 'relay' ? this.room.checkpoint : this.room.spawn;
        return [p.x, p.y];
    }
    private emit(kind: string, at: Vec2 = this.player): void { this.events.push({ kind, at: { x: at.x, y: at.y } }); }
    memory(): RoomMemory { return { switchB: this.inputs.switchB, cubeOnPlate: this.inputs.cubeOnPlate, checkpoint: this.checkpoint }; }
    private onPlate(body: Vec2, width: number, height: number): boolean {
        const plate = this.room.plate;
        return !!plate && Math.abs(body.x - plate.x) < 45 + width / 2 - 8 && Math.abs(body.y + height / 2 - plate.y) < 5;
    }
    private samplePlate(): void {
        const previous = this.inputs.plateA;
        this.inputs.cubeOnPlate = !!this.cube && !this.cube.carried && this.cube.grounded && this.onPlate(this.cube, CARRY.cubeSize, CARRY.cubeSize);
        this.inputs.plateA = this.inputs.cubeOnPlate || (this.player.grounded && this.onPlate(this.player, PLAYER.width, PLAYER.height));
        if (!previous && this.inputs.plateA)
            this.emit('plate', this.room.plate);
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
        this.door.enabled = !this.frame.outputs.exitDoor;
    }
    interactionHint(): string {
        if (this.cube?.carried)
            return 'E · put down cube';
        if (this.room.lever && Math.hypot(this.player.x - this.room.lever.x, this.player.y - (this.room.lever.y - 25)) < 72)
            return `E · switch ${this.inputs.switchB ? 'OFF' : 'ON'}`;
        if (this.cube && Math.hypot(this.player.x - this.cube.x, this.player.y - this.cube.y) < CARRY.reach)
            return 'E · carry cube';
        return '';
    }
    interact(): void {
        const p = this.player, c = this.cube;
        if (c?.carried) {
            const ahead = p.x + p.facing * 39;
            const y = p.y + PLAYER.height / 2 - CARRY.cubeSize / 2 - 0.5;
            const box = { x: ahead - 18, y: y - 18, w: 36, h: 36 };
            c.x = this.solids.some(s => s.enabled && !s.oneWay && boxesOverlap(box, s)) ? p.x : ahead;
            c.y = y;
            c.carried = false;
            c.vx = 0;
            c.vy = 0;
            c.grounded = false;
        }
        else if (this.room.lever && Math.hypot(p.x - this.room.lever.x, p.y - (this.room.lever.y - 25)) < 72) {
            this.inputs.switchB = !this.inputs.switchB;
            this.emit('switch', this.room.lever);
            if (this.room.id === 'relay') {
                this.checkpoint = this.inputs.switchB ? 'relay' : 'entry';
                if (this.inputs.switchB)
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
        this.pullingCube = false;
        this.deaths++;
        this.deathFlash = 0.35;
        this.emit('death');
    }
    returnCube(): void {
        if (!this.cube || !this.room.cube)
            return;
        Object.assign(this.cube, this.room.cube, { vx: 0, vy: 0, carried: false, grounded: false });
        this.pullingCube = false;
        this.emit('cube-return');
    }
    private hookCube(input: InputState): void {
        const c = this.cube, p = this.player;
        if (!c || c.carried || this.room.id === 'pressure') {
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
        const dx = p.x - c.x, dy = p.y - 18 - c.y, d = Math.hypot(dx, dy);
        if (d > 38) {
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
        this.hookCube(input);
        if (this.pullingCube) {
            input.grappleHeld = false;
            input.grapplePressed = false;
        }
        this.samplePlate();
        this.evaluate();
        const wasAttached = this.player.rope.phase === 'attached';
        stepPlayer(this.player, input, this.solids, dt);
        if (!wasAttached && this.player.rope.phase === 'attached')
            this.emit('grapple');
        if (this.cube) {
            const c = this.cube;
            if (c.carried)
                Object.assign(c, { x: this.player.x, y: this.player.y - PLAYER.height / 2 - CARRY.holdGap - 18, vx: 0, vy: 0, grounded: false });
            else
                stepBody(c, CARRY.cubeSize, this.solids, this.pullingCube ? 300 : CARRY.cubeGravity, CARRY.cubeMaxFall, dt);
            if (c.y > this.room.height || this.room.hazards.some(h => boxesOverlap(h, { x: c.x - 18, y: c.y - 18, w: 36, h: 36 })))
                this.returnCube();
        }
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
        this.doorOpen = clamp(this.doorOpen + (this.frame.outputs.exitDoor ? dt * 3 : -dt * 3), 0, 1);
        this.displayPulse = Math.max(0, this.displayPulse - dt * 0.9);
        if (this.room.hazards.some(h => boxesOverlap(playerBox(this.player), h)) || this.player.y > this.room.height + 50)
            this.respawn();
        if (this.frame.outputs.exitDoor && this.player.x > this.room.exit.x + 20 && this.player.y + 17 <= this.room.exit.y + this.room.exit.h + 5) {
            this.exited = true;
            this.emit('complete');
        }
    }
    target(aim: Vec2) { return this.room.id === 'pressure' ? null : findGrappleTarget(this.player, aim, this.solids, this.player.groundId); }
}
