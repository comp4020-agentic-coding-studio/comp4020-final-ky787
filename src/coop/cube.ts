import { CARRY, PLAYER } from '../engine/constants.ts';
import { CUBE_SIZE } from '../slice/tuning.ts';
import type { CubeAuthority, PuzzleWorld } from '../slice/world.ts';
import type { CoopClient } from './client.ts';

type CubeTransport = Pick<CoopClient, 'room' | 'slot' | 'ownsCube' | 'remote' | 'remoteCube' | 'cubeAction' | 'cubeOccupancy'>;

/** Requests and replica presentation only. Forces/collision remain in PuzzleWorld. */
export class SharedCubeAuthority implements CubeAuthority {
    private epoch = -1;
    private wantsPull = false;
    private stoppedEpoch = -1;
    constructor(private client: CubeTransport) {}
    get simulates() { return this.client.ownsCube; }
    get heldLocally() { return this.simulates && this.client.room?.cube.holder === this.client.slot; }
    sync(w: PuzzleWorld): void {
        const c = w.cube, room = this.client.room;
        if (!c || !room) return;
        const state = room.cube;
        const at = room.cubePlacement === 'cargoPlate' ? { x: w.room.cargoPlate!.x, y: w.room.cargoPlate!.y - CUBE_SIZE / 2 } : w.room.cube!;
        if (this.epoch !== state.epoch) {
            this.epoch = state.epoch;
            Object.assign(c, state.transform ?? { ...at, vx: 0, vy: 0, grounded: true }, { groundId: null });
            w.pullingCube = false;
        }
        if (!this.simulates) {
            Object.assign(c, this.client.remoteCube.sample(performance.now()) ?? state.transform ?? { ...at, vx: 0, vy: 0, grounded: true });
            w.pullingCube = false;
        }
        c.carried = state.holder !== null;
        if (c.carried) {
            const body = this.heldLocally ? w.player : this.client.remote.sample(performance.now());
            if (body) Object.assign(c, { x: body.x, y: body.y - PLAYER.height / 2 - CARRY.holdGap - CUBE_SIZE / 2, vx: 0, vy: 0 });
            c.grounded = false;
        }
        if (state.pulling && this.simulates && !this.wantsPull) this.stop();
    }
    private near(w: PuzzleWorld) { return !!w.cube && Math.hypot(w.player.x - w.cube.x, w.player.y - w.cube.y) < CARRY.reach; }
    hint(w: PuzzleWorld): string {
        if (this.heldLocally) return 'E · put down cube';
        if (!this.client.room?.inputs.switchB || !this.near(w)) return '';
        return this.client.room.cube.holder ? 'PARTNER CARRYING' : 'E · carry cube';
    }
    interact(w: PuzzleWorld): boolean {
        if (this.heldLocally) { this.client.cubeAction('cube-drop', w.cubeDropTransform()); return true; }
        if (this.client.room?.inputs.switchB && this.near(w)) {
            if (!this.client.room.cube.holder) this.client.cubeAction('cube-pickup');
            return true;
        }
        return false;
    }
    pull(start: boolean, held: boolean): boolean {
        if (start && held && this.client.room?.inputs.switchB) {
            this.wantsPull = true;
            this.client.cubeAction('cube-pull-start');
        }
        if (!held) this.cancelPull();
        return this.wantsPull && this.simulates && !!this.client.room?.cube.pulling && !this.client.room.cube.holder;
    }
    private stop(): void {
        const c = this.client.room?.cube;
        if (c?.pulling && this.simulates && this.stoppedEpoch !== c.epoch) {
            this.stoppedEpoch = c.epoch;
            this.client.cubeAction('cube-pull-stop');
        }
    }
    cancelPull(): void { this.wantsPull = false; this.stop(); }
    release(w: PuzzleWorld): void {
        this.cancelPull();
        if (this.heldLocally) this.client.cubeAction('cube-drop', w.cubeDropTransform());
    }
    sample(w: PuzzleWorld): void {
        if (!this.simulates) return;
        const c = w.cube, at = w.room.cargoPlate;
        this.client.cubeOccupancy(!!c && !!at && !c.carried && !this.client.room?.cube.pulling && c.grounded
            && Math.abs(c.x - at.x) < 45 + CUBE_SIZE / 2 - 8 && Math.abs(c.y + CUBE_SIZE / 2 - at.y) < 5);
    }
}
