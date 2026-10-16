import type { Vec2 } from '../engine/geometry.ts';
import type { PuzzleWorld } from './world.ts';

export interface PayloadReceiver { id: string; at: Vec2; label: string; active: boolean }
export const RECEIVER_TIMING = { engage: .24, scanStart: .12, scan: .62, transferStart: .48, transfer: .42, release: .4 } as const;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };

/** Semantic audit, not a proximity sensor. Only accepted cube-only inputs qualify.
 * RACE's receiver and tutorial A/B pads accept bodies too and intentionally stay plates.
 * In particular, do not use SharedCubeAuthority.cargoVisual: that is local prediction. */
export function payloadReceivers(w: Pick<PuzzleWorld, 'room' | 'frame' | 'inputs'>): PayloadReceiver[] {
    const r = w.room;
    return [
        ...(r.plates ?? []).filter(p => p.kind === 'socket').map(p => ({ id: p.id, at: p.at, label: p.label, active: !!w.frame.plates?.[p.id] })),
        ...(r.id === 'crossfeed-vault' ? r.cubePads ?? [] : [])
            .filter(p => p.id === 'liftCargo' || p.id === 'finalLeft' || p.id === 'finalRight').map(p => ({ id: p.id, at: p.at, label: p.label,
            active: p.id === 'liftCargo' ? w.inputs.cubeOnPlate : p.id === 'finalLeft' ? w.inputs.cubeOnPlateB : w.inputs.cubeOnPlateC })),
        ...(r.id === 'pairing-bay' && r.cargoPlate ? [{ id: 'cargoPlate', at: r.cargoPlate, label: 'CARGO', active: w.inputs.cubeOnPlate }] : []),
        ...(r.id === 'uplink' && r.plateC ? [{ id: 'plateC', at: r.plateC, label: 'NODE C', active: w.inputs.cubeOnPlateC }] : []),
    ];
}
export function receiverPose(active: boolean, age: number) {
    const release = !active && age < RECEIVER_TIMING.release ? 1 - ease(age / RECEIVER_TIMING.release) : 0;
    return {
        engagement: active ? ease(age / RECEIVER_TIMING.engage) : release,
        scan: active && age >= RECEIVER_TIMING.scanStart && age < RECEIVER_TIMING.scanStart + RECEIVER_TIMING.scan
            ? (age - RECEIVER_TIMING.scanStart) / RECEIVER_TIMING.scan : null,
        transfer: active && age >= RECEIVER_TIMING.transferStart && age < RECEIVER_TIMING.transferStart + RECEIVER_TIMING.transfer
            ? (age - RECEIVER_TIMING.transferStart) / RECEIVER_TIMING.transfer : null,
        release,
    };
}
/** Disposable per-device clocks. Loading/reconnecting baselines occupied docks silently.
 * Nothing here writes occupancy, latches a payload, or delays controller outputs. */
export class ReceiverPresentation {
    readonly states = new Map<string, { active: boolean; age: number }>();
    reset(receivers: readonly PayloadReceiver[]): void {
        this.states.clear();
        for (const r of receivers) this.states.set(r.id, { active: r.active, age: Infinity });
    }
    update(receivers: readonly PayloadReceiver[], dt: number, animate: boolean): { cue: 'payloadConfirm'; at: Vec2 }[] {
        const cues: { cue: 'payloadConfirm'; at: Vec2 }[] = [];
        for (const r of receivers) {
            const old = this.states.get(r.id), changed = old && old.active !== r.active;
            const age = !old || !animate ? Infinity : changed ? 0 : old.age + Math.max(0, Number.isFinite(dt) ? dt : 0);
            if (changed && r.active && animate) cues.push({ cue: 'payloadConfirm', at: r.at });
            this.states.set(r.id, { active: r.active, age });
        }
        for (const id of this.states.keys()) if (!receivers.some(r => r.id === id)) this.states.delete(id);
        return cues;
    }
    snapshot() {
        return [...this.states].map(([id, s]) => ({ id, active: s.active, age: Number.isFinite(s.age) ? s.age : null,
            status: s.active ? 'PAYLOAD DETECTED' : 'AWAITING PAYLOAD', ...receiverPose(s.active, s.age) }));
    }
}
