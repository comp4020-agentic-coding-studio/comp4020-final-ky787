import type { ControllerFrame, ControllerInputs } from '../slice/controller.ts';
import type { PuzzleWorld, WorldAuthority } from '../slice/world.ts';
import type { Plate, SharedRoom, Slot } from './protocol.ts';
import { boxesOverlap, type Vec2 } from '../engine/geometry.ts';
import { playerBox } from '../engine/physics.ts';
import { PLAYER } from '../engine/constants.ts';

/** Never evaluates puzzle equations; maps the server's accepted outputs to machinery. */
export class PairingAuthority implements WorldAuthority {
    constructor(public room: SharedRoom, readonly slot: Slot, private occupy: (plate: Plate) => void, private switchB: () => void,
        private reachExit: () => void) {}
    get frame(): ControllerFrame {
        const o = this.room.outputs;
        return { source: 'mock-multiplayer', outputs: { grappleAnchor: o.grappleAnchor, bridge: o.returnBridge, exitDoor: o.exitDoor,
            codePlatformA: false, codePlatformB: false, relayGates: false, liftField: false } };
    }
    get inputs(): ControllerInputs {
        const i = this.room.inputs;
        return { plateA: i.plateAOccupied, plateB: i.finalPlateLeftOccupied, plateC: i.finalPlateRightOccupied,
            cubeOnPlate: false, cubeOnPlateB: false, cubeOnPlateC: false, switchB: i.switchB, switchC: false };
    }
    get checkpoint() { return this.room.checkpoint === 'reunion' ? 'relay' as const : 'entry' as const; }
    sample(w: PuzzleWorld): void {
        const p = w.player;
        const on = (at?: Vec2) => !!at && p.grounded && Math.abs(p.x - at.x) < 45 + PLAYER.width / 2 - 8 && Math.abs(p.y + PLAYER.height / 2 - at.y) < 5;
        const plate: Plate = on(w.room.plate) ? 'plateA'
            : this.room.inputs.switchB && on(w.room.plateB) ? 'finalLeft'
            : this.room.inputs.switchB && on(w.room.plateC) ? 'finalRight' : null;
        this.occupy(plate);
        if (this.room.exitUnlocked && !this.room.reachedExit[this.slot - 1] && boxesOverlap(playerBox(p), w.room.exit)) this.reachExit();
    }
    private nearSwitch(w: PuzzleWorld) { return Math.hypot(w.player.x - w.room.lever!.x, w.player.y - (w.room.lever!.y - 25)) < 72; }
    interact(w: PuzzleWorld): void { if (!this.room.inputs.switchB && this.nearSwitch(w)) this.switchB(); }
    hint(w: PuzzleWorld): string {
        if (!this.nearSwitch(w)) return '';
        return this.room.inputs.switchB ? 'RETURN BRIDGE LATCHED' : 'E · LATCH RETURN BRIDGE';
    }
}
