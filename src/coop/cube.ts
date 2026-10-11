import { CARRY, PLAYER } from '../engine/constants.ts';
import { CUBE_SIZE } from '../slice/tuning.ts';
import type { CubeAuthority, PuzzleWorld } from '../slice/world.ts';
import type { CoopClient } from './client.ts';
import type { ActionResult } from './prediction.ts';
import { cubeAvailable, type CubeId, type CubeResetCause, type CubeTransform } from './protocol.ts';

type CubeTransport = Pick<CoopClient, 'room' | 'slot' | 'ownsCube' | 'connected' | 'prediction' | 'remote' | 'remoteCube' | 'cubeReplica' | 'cubeAction' | 'cubeOccupancy'>;
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
    private resetCause: CubeResetCause = 'firewall';
    private resetSeen: number;
    private resetEffectEpoch = -1;
    cargoVisual: boolean | undefined;
    partnerSupport: CubeAuthority['partnerSupport'] = null;
    constructor(private client: CubeTransport, readonly id: CubeId = 'cube') {
        this.result = client.prediction.cubeResult;
        this.resetSeen = client.room?.cubes[this.id]?.lastReset?.epoch ?? -1;
    }
    private get pending() { const p = this.client.prediction.cube; return p?.cubeId === this.id ? p : null; }
    private get owns() { return this.client.connected && this.client.room?.cubes[this.id]?.physicsAuthority === this.client.slot; }
    private get replica() { return this.id === 'cube' ? this.client.remoteCube : this.client.cubeReplica(this.id); }
    private action(type: Parameters<CubeTransport['cubeAction']>[0], transform?: CubeTransform) { return this.client.cubeAction(type, transform, this.id, this.resetCause); }
    get resetting() { return this.client.connected && (this.firewallContact || this.pending?.kind === 'cube-reset'); }
    get simulates() { return this.client.connected && !this.resetting && (this.owns || !!this.pending); }
    get heldLocally() {
        const pending = this.pending;
        return this.client.connected && !this.resetting && !this.releaseAt && (pending ? pending.kind === 'cube-pickup' : this.client.room?.cubes[this.id]?.holder === this.client.slot);
    }
    consumeCorrection(): boolean { const value = this.correction; this.correction = false; return value; }
    sync(w: PuzzleWorld): void {
        this.partnerSupport = null;
        const c = w.cubes[this.id], room = this.client.room;
        if (!c || !room?.cubes[this.id]) return;
        const state = room.cubes[this.id]!, latestResult = this.client.prediction.cubeResult;
        const result = latestResult?.cubeId === this.id ? latestResult : this.result;
        const resolved = result !== this.result;
        this.result = result;
        const resetChanged = !!state.lastReset && state.lastReset.epoch !== this.resetSeen;
        if (resetChanged) {
            this.resetSeen = state.lastReset!.epoch;
            if (this.resetEffectEpoch !== this.resetSeen) w.events.push({ kind: state.lastReset!.cause === 'firewall' ? 'cube-firewall' : 'cube-return', at: { x: c.x, y: c.y } });
            this.firewallContact = false; this.wantsPull = false; this.releaseAt = null;
            w.setCubePulling(this.id, false); this.correction = true;
        }
        if (!this.client.connected || !this.owns) this.firewallContact = false;
        // Contact can happen during a predicted drop/pull/pickup. Wait for that
        // result, then use the accepted epoch. A reset/death race can retry with
        // the new epoch; loss of authority abandons the report and follows truth.
        if (this.firewallContact && !this.pending && this.action('cube-reset'))
            this.resetEffectEpoch = state.epoch + 1;
        const pending = this.pending;
        if (this.resetting) {
            c.carried = false; c.grounded = false; w.setCubePulling(this.id, false);
            return; // Dissolve locally; no physics/publication or invented spawn.
        }
        const rollback = resolved && !result?.accepted;
        const keep = !resetChanged && (pending || resolved && result?.accepted && result.kind !== 'cube-reset' && this.owns);
        const at = w.cubePlacementPosition(this.id, room.cubePlacements[this.id]);
        if (rollback) {
            this.wantsPull = false; this.releaseAt = null; this.correction = true;
            w.setCubePulling(this.id, false);
        }
        if (rollback || this.epoch !== state.epoch && !keep) {
            Object.assign(c, this.replica.latest() ?? state.transform ?? { ...at, vx: 0, vy: 0, grounded: true }, { groundId: null });
            w.setCubePulling(this.id, false);
        }
        if (!pending) this.epoch = state.epoch;
        if (!this.simulates) {
            Object.assign(c, (rollback ? this.replica.latest() : this.replica.sample(performance.now()))
                ?? state.transform ?? { ...at, vx: 0, vy: 0, grounded: true });
            w.setCubePulling(this.id, false);
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
                && this.replica.latest() && now - this.replica.lastAt <= PARTNER_SUPPORT_MAX_AGE_MS
                && (!remote.lastDiscontinuity || now - remote.lastDiscontinuity.at >= 100)) {
                this.partnerSupport = { cubeId: this.id, carrier: holder, surface: {
                    id: this.id === 'cube' ? 'partner-cube-support' : `partner-cube-support:${this.id}`, x: c.x - CUBE_SIZE / 2, y: c.y - CUBE_SIZE / 2,
                    w: CUBE_SIZE, h: 1, enabled: true, oneWay: true, grappleable: false,
                } };
            }
        }
        if (!pending && this.releaseAt) {
            const drop = this.releaseAt; this.releaseAt = null;
            if (state.holder === this.client.slot && this.action('cube-drop', drop)) Object.assign(c, drop, { carried: false });
        }
        if (state.pulling && this.owns && !this.wantsPull) this.stop();
        if (!this.owns || pending && pending.kind !== 'cube-drop') this.cargoVisual = undefined;
    }
    private near(w: PuzzleWorld) { return !!w.cubes[this.id] && Math.hypot(w.player.x - w.cubes[this.id]!.x, w.player.y - w.cubes[this.id]!.y) < CARRY.reach; }
    firewall(w: PuzzleWorld, cause: CubeResetCause = 'firewall'): boolean {
        if (!this.owns || this.resetting) return false;
        this.resetCause = cause; this.firewallContact = true; this.correction = true;
        this.wantsPull = false; this.releaseAt = null;
        w.setCubePulling(this.id, false); this.partnerSupport = null;
        this.sync(w);
        return true;
    }
    hint(w: PuzzleWorld): string {
        if (this.resetting) return '';
        if (this.heldLocally) return 'E · put down cube';
        if (!cubeAvailable(this.client.room, this.id) || !this.near(w)) return '';
        return this.client.room?.cubes[this.id]?.holder ? 'PARTNER CARRYING' : 'E · carry cube';
    }
    interact(w: PuzzleWorld): boolean {
        if (this.resetting) return true;
        if (this.pending) return this.heldLocally || this.near(w);
        if (this.heldLocally) {
            const transform = w.cubeDropTransform();
            if (this.action('cube-drop', transform)) {
                this.wantsPull = false; w.setCubePulling(this.id, false);
                Object.assign(w.cubes[this.id]!, transform, { carried: false, groundId: null });
            }
            return true;
        }
        if (cubeAvailable(this.client.room, this.id) && this.near(w)) {
            if (!this.client.room?.cubes[this.id]?.holder && this.action('cube-pickup')) { this.wantsPull = false; this.sync(w); }
            return true;
        }
        return false;
    }
    pull(start: boolean, held: boolean): boolean {
        if (this.resetting) return false;
        const state = this.client.room?.cubes[this.id];
        if (start && held && cubeAvailable(this.client.room, this.id) && !state?.holder && !this.pending)
            this.wantsPull = this.action('cube-pull-start');
        if (!held) this.cancelPull();
        return this.wantsPull && this.simulates && !state?.holder
            && (this.pending?.kind === 'cube-pull-start' || !!state?.pulling);
    }
    private stop(): void {
        if (this.client.room?.cubes[this.id]?.pulling && this.owns && !this.pending) this.action('cube-pull-stop');
    }
    cancelPull(): void { this.wantsPull = false; this.stop(); }
    release(w: PuzzleWorld): void {
        this.cancelPull();
        if (!this.heldLocally) return;
        const drop = w.cubeDropTransform();
        if (this.pending) this.releaseAt = drop;
        else if (this.action('cube-drop', drop)) Object.assign(w.cubes[this.id]!, drop, { carried: false, groundId: null });
    }
    sample(w: PuzzleWorld): void {
        if (this.resetting) { this.cargoVisual = undefined; return; }
        const pads = w.room.cubePads ?? (w.room.cargoPlate ? [{ id: 'cargoPlate' as const, at: w.room.cargoPlate }] : []);
        if (!pads.length) return;
        if (!this.owns || this.pending && this.pending.kind !== 'cube-drop') { this.cargoVisual = undefined; return; }
        const c = w.cubes[this.id], state = this.client.room?.cubes[this.id];
        const pad = c && !c.carried && !state?.pulling && c.grounded ? pads.find(({ id, at }) =>
            Math.abs(c.x - at.x) < 45 + CUBE_SIZE / 2 - 8 && Math.abs(c.y + CUBE_SIZE / 2 - at.y) < 5
            && !Object.entries(this.client.room!.cubePlacements).some(([other, placement]) => other !== this.id && placement === id)) : undefined;
        this.cargoVisual = !!pad;
        this.client.cubeOccupancy(pad?.id ?? 'spawn', this.id);
    }
}
