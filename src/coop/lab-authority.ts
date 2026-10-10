import type { ControllerFrame, ControllerInputs } from '../slice/controller.ts';
import type { PuzzleWorld, WorldAuthority, CrumbleAuthority } from '../slice/world.ts';
import type { CoopClient } from './client.ts';
import { SharedCubeAuthority } from './cube.ts';
import { PairingAuthority, sampleExit, bodyOnPlate } from './authority.ts';
import type { CoopLevelId, CrumbleId, SharedRoom } from './protocol.ts';

export interface CoopAuthority extends WorldAuthority { room: SharedRoom }
const inputs = (): ControllerInputs => ({ plateA: false, plateB: false, plateC: false, cubeOnPlate: false, cubeOnPlateB: false, cubeOnPlateC: false, switchB: false, switchC: false });
const frame = (exitDoor: boolean, signals: Partial<ControllerFrame['outputs']> = {}): ControllerFrame => ({ source: 'mock-multiplayer',
    outputs: { exitDoor, grappleAnchor: false, bridge: false, codePlatformA: false, codePlatformB: false, relayGates: false, liftField: false, ...signals } });
const near = (w: PuzzleWorld, at = w.room.lever ?? w.room.upperLever) => !!at && Math.hypot(w.player.x - at.x, w.player.y - (at.y - 25)) < 72;

abstract class LabAuthority<L extends CoopLevelId> implements WorldAuthority {
    cube?: SharedCubeAuthority;
    constructor(public room: SharedRoom<L>, protected client: CoopClient) { if (room.cube) this.cube = new SharedCubeAuthority(client); }
    abstract get frame(): ControllerFrame;
    get inputs() { return inputs(); }
    get checkpoint() { return this.room.checkpoint === 'reunion' ? 'relay' as const : this.room.checkpoint; }
    sample(w: PuzzleWorld) { this.cube?.sample(w); sampleExit(w, this.room, this.client.slot!, () => this.client.reachExit()); }
    interact(w: PuzzleWorld) { this.cube?.interact(w); }
    hint(w: PuzzleWorld) { return this.cube?.hint(w) ?? ''; }
}
class RelayAuthority extends LabAuthority<'relay-lab'> {
    get frame() { return frame(this.room.exitUnlocked, { relayGates: this.room.levelState.relayEnabled }); }
    override get inputs() { return { ...inputs(), switchB: this.room.levelState.relayEnabled }; }
    override interact(w: PuzzleWorld) {
        if (this.cube?.interact(w)) return;
        if (near(w) && !this.room.levelState.relayEnabled) this.client.control('relayPower');
    }
    override hint(w: PuzzleWorld) { return super.hint(w) || (near(w) ? this.room.levelState.relayEnabled ? 'RELAY POWER LATCHED' : 'E · POWER RELAY' : ''); }
}
class BoostAuthority extends LabAuthority<'boost-lab'> {
    get frame() { return frame(this.room.exitUnlocked, { bridge: this.room.levelState.routeLatched }); }
    override get inputs() { return { ...inputs(), switchB: this.room.levelState.routeLatched }; }
    override interact(w: PuzzleWorld) {
        if (this.cube?.interact(w)) return;
        if (near(w) && !this.room.levelState.routeLatched) this.client.control('boostRoute');
    }
    override hint(w: PuzzleWorld) { return super.hint(w) || (near(w) ? this.room.levelState.routeLatched ? 'UPPER ROUTE OPEN' : 'E · OPEN RETURN ROUTE' : ''); }
}
class LiftAuthority extends LabAuthority<'lift-lab'> {
    get frame() { return frame(this.room.exitUnlocked, { liftField: this.room.levelState.liftEnabled }); }
    override get inputs() { return { ...inputs(), plateA: this.room.levelState.lowerHeld, switchC: this.room.levelState.liftLatched }; }
    override sample(w: PuzzleWorld) { super.sample(w); this.client.occupy(bodyOnPlate(w, w.room.plate) ? 'liftControl' : null); }
    override interact(w: PuzzleWorld) {
        if (this.cube?.interact(w)) return;
        if (near(w) && !this.room.levelState.liftLatched) this.client.control('liftLatch');
    }
    override hint(w: PuzzleWorld) { return super.hint(w) || (near(w) ? this.room.levelState.liftLatched ? 'LIFT LATCHED · CHECKPOINT SAVED' : 'E · LATCH LIFT + CHECKPOINT' : ''); }
}
class CrumbleLabAuthority extends LabAuthority<'crumble-lab'> {
    crumble: CrumbleAuthority;
    constructor(room: SharedRoom<'crumble-lab'>, client: CoopClient) { super(room, client); this.crumble = new SharedCrumbleAuthority(client); }
    get frame() { return frame(this.room.exitUnlocked); }
}

/** Countdown is presentation only. Only a BROKEN snapshot can remove collision. */
export class SharedCrumbleAuthority implements CrumbleAuthority {
    private phases = new Map<string, string>();
    constructor(private client: CoopClient) {}
    sync(w: PuzzleWorld): void {
        const room = this.client.room;
        if (room?.level !== 'crumble-lab') return;
        const now = performance.now(), age = Math.max(0, now - this.client.roomReceivedAt);
        for (const p of w.platforms) {
            if (p.def.id !== 'crumbleA' && p.def.id !== 'crumbleB') continue;
            const id = p.def.id, state = room.levelState.platforms[id], pending = this.client.pendingCrumble.get(id);
            const phase = state.phase, previous = this.phases.get(id);
            const remaining = Math.max(0, state.remainingMs - age) / 1000;
            p.fuseDuration = (state.durationMs || (pending?.trigger === 'hook' ? 1650 : 600)) / 1000;
            p.fuse = phase === 'warning' ? remaining : phase === 'stable' && pending ? Math.max(0, p.fuseDuration - (now - pending.at) / 1000) : -1;
            p.respawn = phase === 'broken' ? Math.max(.001, remaining) : 0;
            p.solid.enabled = phase !== 'broken'; p.solid.grappleable = p.solid.enabled;
            if (phase === 'broken') {
                if (w.player.rope.anchorId === id) w.cancelGrapple();
                if (previous !== undefined && previous !== 'broken') w.events.push({ kind: 'crumble', at: { x: p.def.x, y: p.def.y } });
            } else if (previous === 'broken' && phase === 'stable') {
                p.pulse = 1; w.events.push({ kind: 'crumble-respawn', at: { x: p.def.x, y: p.def.y } });
            }
            this.phases.set(id, phase);
        }
    }
    sample(w: PuzzleWorld): void {
        const room = this.client.room;
        if (room?.level !== 'crumble-lab') return;
        for (const id of ['crumbleA', 'crumbleB'] as CrumbleId[]) {
            if (room.levelState.platforms[id].phase !== 'stable') continue;
            if (w.player.grounded && w.player.groundId === id) this.client.triggerCrumble(id, 'foot');
            else if (w.player.rope.phase === 'attached' && w.player.rope.anchorId === id) this.client.triggerCrumble(id, 'hook');
        }
        this.sync(w);
    }
}
const factories = {
    'pairing-bay': (r: SharedRoom<'pairing-bay'>, c: CoopClient) => new PairingAuthority(r, c.slot!, p => c.occupy(p), () => c.switchB(), () => c.reachExit(), new SharedCubeAuthority(c), c.prediction),
    'relay-lab': (r: SharedRoom<'relay-lab'>, c: CoopClient) => new RelayAuthority(r, c),
    'boost-lab': (r: SharedRoom<'boost-lab'>, c: CoopClient) => new BoostAuthority(r, c),
    'lift-lab': (r: SharedRoom<'lift-lab'>, c: CoopClient) => new LiftAuthority(r, c),
    'crumble-lab': (r: SharedRoom<'crumble-lab'>, c: CoopClient) => new CrumbleLabAuthority(r, c),
};
export function createCoopAuthority(room: SharedRoom, client: CoopClient): CoopAuthority {
    const factory = factories[room.level] as (room: SharedRoom, client: CoopClient) => CoopAuthority;
    const authority = factory(room, client);
    authority.reset = () => client.localReset();
    authority.discontinuity = (entity, reason) => client.markDiscontinuity(entity, reason);
    return authority;
}
