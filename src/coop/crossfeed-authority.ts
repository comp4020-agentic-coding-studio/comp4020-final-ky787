import type { ControllerFrame, ControllerInputs } from '../slice/controller.ts';
import type { PuzzleWorld, WorldAuthority } from '../slice/world.ts';
import type { CoopClient } from './client.ts';
import { SharedCubeAuthority } from './cube.ts';
import { bodyOnPlate, sampleExit } from './authority.ts';
import type { SharedRoom } from './protocol.ts';

export class CrossfeedAuthority implements WorldAuthority {
    cubes: { cubeA: SharedCubeAuthority; cubeB: SharedCubeAuthority };
    constructor(public room: SharedRoom<'crossfeed-vault'>, private client: CoopClient) {
        this.cubes = { cubeA: new SharedCubeAuthority(client, 'cubeA'), cubeB: new SharedCubeAuthority(client, 'cubeB') };
    }
    get frame(): ControllerFrame { return { source: 'mock-multiplayer', outputs: this.room.levelState.outputs }; }
    get inputs(): ControllerInputs {
        const i = this.room.levelState.inputs;
        return { plateA: i.plateAOccupied, plateB: i.finalPlateLeftOccupied, plateC: i.finalPlateRightOccupied,
            cubeOnPlate: i.cubeOnLiftCargo, cubeOnPlateB: i.cubeOnFinalLeft, cubeOnPlateC: i.cubeOnFinalRight, switchB: i.switchB, switchC: i.switchC };
    }
    get checkpoint() { return this.room.checkpoint === 'upper' ? 'upper' as const : 'entry' as const; }
    sample(w: PuzzleWorld) {
        for (const cube of Object.values(this.cubes)) cube.sample(w);
        this.client.occupy(bodyOnPlate(w, w.room.plate) ? 'plateA' : bodyOnPlate(w, w.room.plateB) ? 'finalLeft' : bodyOnPlate(w, w.room.plateC) ? 'finalRight' : null);
        sampleExit(w, this.room, this.client.slot!, () => this.client.reachExit());
    }
    private ordered(w: PuzzleWorld) {
        return Object.values(this.cubes).sort((a, b) => Number(b.heldLocally) - Number(a.heldLocally)
            || Math.hypot(w.player.x - w.cubes[a.id]!.x, w.player.y - w.cubes[a.id]!.y) - Math.hypot(w.player.x - w.cubes[b.id]!.x, w.player.y - w.cubes[b.id]!.y));
    }
    private control(w: PuzzleWorld) { return w.room.controls?.find(c => Math.hypot(w.player.x - c.at.x, w.player.y - (c.at.y - 25)) < 72); }
    interact(w: PuzzleWorld) {
        for (const cube of this.ordered(w)) if (cube.interact(w)) return;
        const control = this.control(w);
        if (control && !this.room.levelState.inputs[control.id as 'switchB' | 'switchC' | 'switchD'] && this.client.control(control.id)) return control.id;
    }
    hint(w: PuzzleWorld) {
        for (const cube of this.ordered(w)) { const hint = cube.hint(w); if (hint) return hint; }
        const control = this.control(w);
        return control ? this.room.levelState.inputs[control.id as 'switchB' | 'switchC' | 'switchD'] ? `${control.label} · LATCHED` : `E · ${control.label}` : '';
    }
}
