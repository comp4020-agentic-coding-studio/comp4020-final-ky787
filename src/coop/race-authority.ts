import { PLAYER } from '../engine/constants.ts';
import type { ControllerFrame, ControllerInputs, MachineSignal } from '../slice/controller.ts';
import type { PuzzleWorld, WorldAuthority } from '../slice/world.ts';
import type { CoopClient } from './client.ts';
import { SharedCubeAuthority } from './cube.ts';
import { SharedCrumbleAuthority } from './crumble.ts';
import { bodyOnPlate, sampleExit } from './authority.ts';
import type { SharedRoom } from './protocol.ts';

/** Local physical sensors feed a coordinate-free, replaceable mock controller. */
export class RaceAuthority implements WorldAuthority {
    cubes: { cubeA: SharedCubeAuthority; cubeB: SharedCubeAuthority };
    crumble: SharedCrumbleAuthority;
    private previousPhase?: boolean;
    private previousCommit?: boolean;
    constructor(public room: SharedRoom<'race-condition'>, private client: CoopClient) {
        this.cubes = { cubeA: new SharedCubeAuthority(client, 'cubeA'), cubeB: new SharedCubeAuthority(client, 'cubeB') };
        this.crumble = new SharedCrumbleAuthority(client);
    }
    get bufferDisplay() { const b = this.room.levelState.buffer; const seconds = Math.max(0, b.remainingMs - (performance.now() - this.client.roomReceivedAt)) / 1000; return { phase: b.phase, seconds, fraction: b.phase === 'idle' ? 1 : seconds * 1000 / b.durationMs }; }
    get phase() { return this.client.pendingPhase?.value ?? this.room.levelState.inputs.phase; }
    get frame(): ControllerFrame {
        const o = this.room.levelState.outputs;
        return { source: 'mock-multiplayer', timer: this.bufferDisplay, outputs: { exitDoor: this.room.exitUnlocked, grappleAnchor: false,
            bridge: o.returnBridge, codePlatformA: false, codePlatformB: false, relayGates: false, liftField: false },
            signals: { ...o, phaseA: o.spanMaster && !this.phase, phaseB: o.spanMaster && this.phase } };
    }
    physicalPower(signal: MachineSignal): boolean {
        const s = this.room.levelState;
        if (signal === 'phaseA' || signal === 'phaseB' || signal === 'returnBridge') return s.physical[signal];
        return !!this.frame.signals?.[signal];
    }
    get inputs(): ControllerInputs {
        const i = this.room.levelState.inputs;
        return { plateA: i.dropA, plateB: i.dropB, plateC: i.traceOccupied, cubeOnPlate: i.payloadDelivered,
            cubeOnPlateB: i.returnOccupied, cubeOnPlateC: false, switchB: this.phase, switchC: i.finalControl };
    }
    get checkpoint() { return this.room.checkpoint === 'reunion' ? 'relay' as const : 'entry' as const; }
    sample(w: PuzzleWorld) {
        for (const cube of Object.values(this.cubes)) cube.sample(w);
        this.client.occupy(w.room.plates?.find(p => bodyOnPlate(w, p.at))?.id ?? null);
        const c = w.cubes.cubeA;
        if (c?.grounded && c.groundId === 'cargo-buffer' && !c.carried) this.client.bufferContact();
        // Predicted and confirmed identical phase changes produce only one cue.
        if (this.previousPhase !== undefined && this.previousPhase !== this.phase) w.events.push({ kind: 'switch', at: w.room.controls![0].at });
        this.previousPhase = this.phase;
        const committed = this.room.levelState.inputs.finalControl;
        if (committed && this.previousCommit === false) w.events.push({ kind: 'terminal', at: w.room.controls![1].at });
        this.previousCommit = committed;
        sampleExit(w, this.room, this.client.slot!, () => this.client.reachExit());
    }
    private ordered(w: PuzzleWorld) {
        return Object.values(this.cubes).sort((a, b) => Number(b.heldLocally) - Number(a.heldLocally)
            || Math.hypot(w.player.x - w.cubes[a.id]!.x, w.player.y - w.cubes[a.id]!.y) - Math.hypot(w.player.x - w.cubes[b.id]!.x, w.player.y - w.cubes[b.id]!.y));
    }
    private control(w: PuzzleWorld) { return w.room.controls?.find(c => (c.kind !== 'terminal' || w.player.grounded && w.player.y + PLAYER.height / 2 <= c.at.y + 5) && Math.hypot(w.player.x - c.at.x, w.player.y - (c.at.y - 25)) < 72); }
    interact(w: PuzzleWorld) {
        for (const c of this.ordered(w)) if (c.interact(w)) return;
        const c = this.control(w);
        if (c && (c.id === 'phase' || !this.room.levelState.inputs.finalControl) && this.client.control(c.id)) return c.id;
    }
    hint(w: PuzzleWorld) {
        for (const c of this.ordered(w)) { const hint = c.hint(w); if (hint) return hint; }
        const c = this.control(w);
        return c ? c.id === 'phase' ? `E · PHASE ${this.phase ? 'B → A' : 'A → B'}` : this.room.levelState.inputs.finalControl ? 'COMMITTED' : 'E · COMMIT' : '';
    }
}
