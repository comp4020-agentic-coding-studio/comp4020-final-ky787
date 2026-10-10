import { CARRY, PLAYER } from '../engine/constants.ts';
import { CUBE_SIZE } from '../slice/tuning.ts';
import type { CubeAuthority, PuzzleWorld } from '../slice/world.ts';
import type { CoopClient } from './client.ts';
import type { ActionResult } from './prediction.ts';
import { cubeAvailable, type CubeTransform } from './protocol.ts';

type CubeTransport = Pick<CoopClient, 'room' | 'slot' | 'ownsCube' | 'connected' | 'prediction' | 'remote' | 'remoteCube' | 'cubeAction' | 'cubeOccupancy'>;
/** Five nominal stream intervals; stop supporting on stalled/suspended streams. */
export const PARTNER_SUPPORT_MAX_AGE_MS = 250;

/** Temporary local feedback overlays the replica; only confirmed authority publishes. */
export class SharedCubeAuthority implements CubeAuthority {
    private epoch = -1;
    private wantsPull = false;
    private result: ActionResult | null = null;
    private correction = false;
    private releaseAt: CubeTransform | null = null;
    private firewallContact = false;
    private resetSeen: number;
    private resetEffectEpoch = -1;
    cargoVisual: boolean | undefined;
    partnerSupport: CubeAuthority['partnerSupport'] = null;
    constructor(private client: CubeTransport) {
        this.result = client.prediction.cubeResult;
        this.resetSeen = client.room?.cube?.lastReset?.epoch ?? -1;
    }
    get resetting() { return this.client.connected && (this.firewallContact || this.client.prediction.cube?.kind === 'cube-reset'); }
    get simulates() { return this.client.connected && !this.resetting && (this.client.ownsCube || !!this.client.prediction.cube); }
    get heldLocally() {
        const pending = this.client.prediction.cube;
        return this.client.connected && !this.resetting && !this.releaseAt && (pending ? pending.kind === 'cube-pickup' : this.client.room?.cube?.holder === this.client.slot);
    }
    consumeCorrection(): boolean { const value = this.correction; this.correction = false; return value; }
    sync(w: PuzzleWorld): void {
        this.partnerSupport = null;
        const c = w.cube, room = this.client.room;
        if (!c || !room?.cube) return;
        const state = room.cube, result = this.client.prediction.cubeResult;
        const resolved = result !== this.result;
        this.result = result;
        const resetChanged = !!state.lastReset && state.lastReset.epoch !== this.resetSeen;
        if (resetChanged) {
            this.resetSeen = state.lastReset!.epoch;
            if (this.resetEffectEpoch !== this.resetSeen) w.events.push({ kind: 'cube-firewall', at: { x: c.x, y: c.y } });
            this.firewallContact = false; this.wantsPull = false; this.releaseAt = null;
            w.pullingCube = false; this.correction = true;
        }
        if (!this.client.connected || !this.client.ownsCube) this.firewallContact = false;
        // Contact can happen during a predicted drop/pull/pickup. Wait for that
        // result, then use the accepted epoch. A reset/death race can retry with
        // the new epoch; loss of authority abandons the report and follows truth.
        if (this.firewallContact && !this.client.prediction.cube && this.client.cubeAction('cube-reset'))
            this.resetEffectEpoch = state.epoch + 1;
        const pending = this.client.prediction.cube;
        if (this.resetting) {
            c.carried = false; c.grounded = false; w.pullingCube = false;
            return; // Dissolve locally; no physics/publication or invented spawn.
        }
        const rollback = resolved && !result?.accepted;
        const keep = !resetChanged && (pending || resolved && result?.accepted && result.kind !== 'cube-reset' && this.client.ownsCube);
        const at = room.cubePlacement === 'cargoPlate' ? { x: w.room.cargoPlate!.x, y: w.room.cargoPlate!.y - CUBE_SIZE / 2 } : w.room.cube!;
        if (rollback) {
            this.wantsPull = false; this.releaseAt = null; this.correction = true;
            w.pullingCube = false;
        }
        if (rollback || this.epoch !== state.epoch && !keep) {
            Object.assign(c, this.client.remoteCube.latest() ?? state.transform ?? { ...at, vx: 0, vy: 0, grounded: true }, { groundId: null });
            w.pullingCube = false;
        }
        if (!pending) this.epoch = state.epoch;
        if (!this.simulates) {
            Object.assign(c, (rollback ? this.client.remoteCube.latest() : this.client.remoteCube.sample(performance.now()))
                ?? state.transform ?? { ...at, vx: 0, vy: 0, grounded: true });
            w.pullingCube = false;
        }
        c.carried = this.client.connected && (pending ? pending.kind === 'cube-pickup' && !this.releaseAt : state.holder !== null);
        if (c.carried) {
            const now = performance.now();
            const body = this.heldLocally ? w.player : this.client.remote.sample(now);
            if (body) Object.assign(c, { x: body.x, y: body.y - PLAYER.height / 2 - CARRY.holdGap - CUBE_SIZE / 2, vx: 0, vy: 0 });
            c.grounded = false;
            const remote = this.client.remote, holder = state.holder;
            // Accepted holder only, including during prediction reconciliation.
            // Latest grounding revokes immediately, ahead of the display buffer.
            // Use the same interpolated position as the visible cube, with no
            // rider displacement/velocity transfer (including relay/respawn snaps).
            if (!pending && holder && holder !== this.client.slot && room.connected[holder - 1]
                && body?.grounded && remote.latest()?.grounded
                && now - remote.lastAt <= PARTNER_SUPPORT_MAX_AGE_MS
                && this.client.remoteCube.latest() && now - this.client.remoteCube.lastAt <= PARTNER_SUPPORT_MAX_AGE_MS
                && (!remote.lastDiscontinuity || now - remote.lastDiscontinuity.at >= 100)) {
                this.partnerSupport = { carrier: holder, surface: {
                    id: 'partner-cube-support', x: c.x - CUBE_SIZE / 2, y: c.y - CUBE_SIZE / 2,
                    w: CUBE_SIZE, h: 1, enabled: true, oneWay: true, grappleable: false,
                } };
            }
        }
        if (!pending && this.releaseAt) {
            const drop = this.releaseAt; this.releaseAt = null;
            if (state.holder === this.client.slot && this.client.cubeAction('cube-drop', drop)) Object.assign(c, drop, { carried: false });
        }
        if (state.pulling && this.client.ownsCube && !this.wantsPull) this.stop();
        if (!this.client.ownsCube || pending && pending.kind !== 'cube-drop') this.cargoVisual = undefined;
    }
    private near(w: PuzzleWorld) { return !!w.cube && Math.hypot(w.player.x - w.cube.x, w.player.y - w.cube.y) < CARRY.reach; }
    firewall(w: PuzzleWorld): boolean {
        if (!this.client.ownsCube || this.resetting) return false;
        this.firewallContact = true; this.correction = true;
        this.wantsPull = false; this.releaseAt = null;
        w.pullingCube = false; this.partnerSupport = null;
        this.sync(w);
        return true;
    }
    hint(w: PuzzleWorld): string {
        if (this.resetting) return '';
        if (this.heldLocally) return 'E · put down cube';
        if (!cubeAvailable(this.client.room) || !this.near(w)) return '';
        return this.client.room?.cube?.holder ? 'PARTNER CARRYING' : 'E · carry cube';
    }
    interact(w: PuzzleWorld): boolean {
        if (this.resetting) return true;
        if (this.client.prediction.cube) return this.heldLocally || this.near(w);
        if (this.heldLocally) {
            const transform = w.cubeDropTransform();
            if (this.client.cubeAction('cube-drop', transform)) {
                this.wantsPull = false; w.pullingCube = false;
                Object.assign(w.cube!, transform, { carried: false, groundId: null });
            }
            return true;
        }
        if (cubeAvailable(this.client.room) && this.near(w)) {
            if (!this.client.room?.cube?.holder && this.client.cubeAction('cube-pickup')) { this.wantsPull = false; this.sync(w); }
            return true;
        }
        return false;
    }
    pull(start: boolean, held: boolean): boolean {
        if (this.resetting) return false;
        const state = this.client.room?.cube;
        if (start && held && cubeAvailable(this.client.room) && !state?.holder && !this.client.prediction.cube)
            this.wantsPull = this.client.cubeAction('cube-pull-start');
        if (!held) this.cancelPull();
        return this.wantsPull && this.simulates && !state?.holder
            && (this.client.prediction.cube?.kind === 'cube-pull-start' || !!state?.pulling);
    }
    private stop(): void {
        if (this.client.room?.cube?.pulling && this.client.ownsCube && !this.client.prediction.cube) this.client.cubeAction('cube-pull-stop');
    }
    cancelPull(): void { this.wantsPull = false; this.stop(); }
    release(w: PuzzleWorld): void {
        this.cancelPull();
        if (!this.heldLocally) return;
        const drop = w.cubeDropTransform();
        if (this.client.prediction.cube) this.releaseAt = drop;
        else if (this.client.cubeAction('cube-drop', drop)) Object.assign(w.cube!, drop, { carried: false, groundId: null });
    }
    sample(w: PuzzleWorld): void {
        if (this.resetting) { this.cargoVisual = undefined; return; }
        if (!w.room.cargoPlate) return;
        if (!this.client.ownsCube || this.client.prediction.cube && this.client.prediction.cube.kind !== 'cube-drop') { this.cargoVisual = undefined; return; }
        const c = w.cube, at = w.room.cargoPlate;
        this.cargoVisual = !!c && !!at && !c.carried && !this.client.room?.cube?.pulling && c.grounded
            && Math.abs(c.x - at.x) < 45 + CUBE_SIZE / 2 - 8 && Math.abs(c.y + CUBE_SIZE / 2 - at.y) < 5;
        this.client.cubeOccupancy(this.cargoVisual);
    }
}
