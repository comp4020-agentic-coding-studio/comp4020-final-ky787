import type { ControllerFrame, ControllerInputs } from '../slice/controller.ts';
import type { PuzzleWorld, WorldAuthority } from '../slice/world.ts';
import type { Plate, SharedRoom, Slot } from './protocol.ts';
import { boxesOverlap, type Vec2 } from '../engine/geometry.ts';
import { playerBox } from '../engine/physics.ts';
import { PLAYER } from '../engine/constants.ts';
import type { SharedCubeAuthority } from './cube.ts';
import type { LocalPrediction } from './prediction.ts';

/** Maps accepted machinery, with only a temporary local Switch B overlay. */
export class PairingAuthority implements WorldAuthority {
    constructor(public room: SharedRoom, readonly slot: Slot, private occupy: (plate: Plate) => void, private switchB: () => boolean | void,
        private reachExit: () => void, public cube?: SharedCubeAuthority, private prediction?: LocalPrediction) {}
    get frame(): ControllerFrame {
        const o = this.room.outputs;
        return { source: 'mock-multiplayer', outputs: { grappleAnchor: o.grappleAnchor, bridge: o.returnBridge || !!this.prediction?.switch, exitDoor: o.exitDoor,
            codePlatformA: o.finalAccess, codePlatformB: false, relayGates: false, liftField: false } };
    }
    get inputs(): ControllerInputs {
        const i = this.room.inputs;
        return { plateA: i.plateAOccupied, plateB: i.finalPlateLeftOccupied, plateC: i.finalPlateRightOccupied,
            cubeOnPlate: i.cubeOnCargoPlate, cubeOnPlateB: false, cubeOnPlateC: false, switchB: i.switchB || !!this.prediction?.switch, switchC: false };
    }
    get checkpoint() { return this.room.checkpoint === 'reunion' ? 'relay' as const : 'entry' as const; }
    sample(w: PuzzleWorld): void {
        this.cube?.sample(w);
        const p = w.player;
        const on = (at?: Vec2) => !!at && p.grounded && Math.abs(p.x - at.x) < 45 + PLAYER.width / 2 - 8 && Math.abs(p.y + PLAYER.height / 2 - at.y) < 5;
        const plate: Plate = on(w.room.plate) ? 'plateA'
            : this.room.inputs.switchB && on(w.room.plateB) ? 'finalLeft'
            : this.room.inputs.switchB && on(w.room.plateC) ? 'finalRight' : null;
        this.occupy(plate);
        if (this.room.exitUnlocked && !this.room.reachedExit[this.slot - 1] && boxesOverlap(playerBox(p), w.room.exit)) this.reachExit();
    }
    private nearSwitch(w: PuzzleWorld) { return Math.hypot(w.player.x - w.room.lever!.x, w.player.y - (w.room.lever!.y - 25)) < 72; }
    interact(w: PuzzleWorld): void {
        if (this.cube?.interact(w)) return;
        if (!this.room.inputs.switchB && this.nearSwitch(w) && this.switchB()) w.events.push({ kind: 'switch', at: w.room.lever! });
    }
    hint(w: PuzzleWorld): string {
        const cubeHint = this.cube?.hint(w);
        if (cubeHint) return cubeHint;
        if (!this.nearSwitch(w)) return '';
        return this.inputs.switchB ? 'RETURN BRIDGE LATCHED' : 'E · LATCH RETURN BRIDGE';
    }
}
