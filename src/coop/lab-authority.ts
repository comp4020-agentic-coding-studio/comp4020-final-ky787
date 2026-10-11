import type { ControllerFrame, ControllerInputs } from '../slice/controller.ts';
import type { PuzzleWorld, WorldAuthority, CrumbleAuthority } from '../slice/world.ts';
import type { CoopClient } from './client.ts';
import { SharedCubeAuthority } from './cube.ts';
import { PairingAuthority, sampleExit, bodyOnPlate } from './authority.ts';
import type { CoopLevelId, SharedRoom } from './protocol.ts';
import { SharedCrumbleAuthority } from './crumble.ts';
import { RaceAuthority } from './race-authority.ts';
import { CrossfeedAuthority } from './crossfeed-authority.ts';

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
class FirewallAuthority extends LabAuthority<'firewall-lab'> {
    get frame() { return frame(this.room.exitUnlocked); }
    override get inputs() { return { ...inputs(), switchB: this.room.levelState.checkpointSet }; }
    override interact(w: PuzzleWorld) {
        if (this.cube?.interact(w)) return;
        if (near(w) && !this.room.levelState.checkpointSet) this.client.control('firewallCheckpoint');
    }
    override hint(w: PuzzleWorld) { return super.hint(w) || (near(w) ? this.room.levelState.checkpointSet ? 'CHECKPOINT SAVED · EXIT OPEN' : 'E · SAVE CHECKPOINT + OPEN EXIT' : ''); }
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

const factories = {
    'race-condition': (r: SharedRoom<'race-condition'>, c: CoopClient) => new RaceAuthority(r, c),
    'crossfeed-vault': (r: SharedRoom<'crossfeed-vault'>, c: CoopClient) => new CrossfeedAuthority(r, c),
    'pairing-bay': (r: SharedRoom<'pairing-bay'>, c: CoopClient) => new PairingAuthority(r, c.slot!, p => c.occupy(p), () => c.switchB(), () => c.reachExit(), new SharedCubeAuthority(c), c.prediction),
    'relay-lab': (r: SharedRoom<'relay-lab'>, c: CoopClient) => new RelayAuthority(r, c),
    'boost-lab': (r: SharedRoom<'boost-lab'>, c: CoopClient) => new BoostAuthority(r, c),
    'firewall-lab': (r: SharedRoom<'firewall-lab'>, c: CoopClient) => new FirewallAuthority(r, c),
    'lift-lab': (r: SharedRoom<'lift-lab'>, c: CoopClient) => new LiftAuthority(r, c),
    'crumble-lab': (r: SharedRoom<'crumble-lab'>, c: CoopClient) => new CrumbleLabAuthority(r, c),
};
export function createCoopAuthority(room: SharedRoom, client: CoopClient): CoopAuthority {
    const factory = factories[room.level] as (room: SharedRoom, client: CoopClient) => CoopAuthority;
    const authority = factory(room, client);
    authority.reset = () => client.localReset();
    authority.discontinuity = (entity, reason, cubeId) => client.markDiscontinuity(entity, reason, cubeId);
    return authority;
}
