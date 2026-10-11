import type { CubeId, CubeAction, SharedRoom, Slot } from './protocol.ts';

export type PredictedAction = CubeAction | 'cube-drop' | 'switch';
export interface PendingAction {
    kind: PredictedAction; cubeId: CubeId; seq: number; epoch: number; generation: number;
    predictedAt: number; sentAt: number;
}
export interface ActionResult extends PendingAction {
    accepted: boolean; receivedAt: number; rttMs: number;
}

/** Local feedback ledger. Never merged into SharedRoom or written to persistence. */
export class LocalPrediction {
    cube: PendingAction | null = null;
    switch: PendingAction | null = null;
    cubeResult: ActionResult | null = null;
    last: Partial<Record<PredictedAction, ActionResult>> = {};
    begin(kind: PredictedAction, seq: number, epoch: number, generation: number, now: number, cubeId: CubeId = 'cube'): boolean {
        const key = kind === 'switch' ? 'switch' : 'cube';
        if (this[key]) return false;
        this[key] = { kind, cubeId, seq, epoch, generation, predictedAt: now, sentAt: now };
        return true;
    }
    resolve(seq: number, generation: number, accepted: boolean, room: SharedRoom, slot: Slot, now: number): boolean {
        const key = this.cube?.seq === seq ? 'cube' : this.switch?.seq === seq ? 'switch' : null;
        const pending = key && this[key];
        if (!key || !pending || pending.generation !== generation) return false;
        const c = room.cubes[pending.cubeId];
        const matches = pending.kind === 'switch' ? room.level === 'pairing-bay' && room.levelState.inputs.switchB
            : !c ? false
            : pending.kind === 'cube-pickup' ? c.holder === slot && c.physicsAuthority === slot && c.epoch > pending.epoch
            : pending.kind === 'cube-pull-start' ? c.holder === null && c.physicsAuthority === slot && c.pulling && c.epoch > pending.epoch
            : pending.kind === 'cube-drop' ? c.holder === null && c.physicsAuthority === slot && c.epoch > pending.epoch
            : pending.kind === 'cube-reset' ? c.holder === null && !c.pulling && c.lastReset?.epoch === pending.epoch + 1
            : c.physicsAuthority === slot && !c.pulling && c.epoch === pending.epoch;
        this.finish(key, pending, accepted && matches, now);
        return true;
    }
    private finish(key: 'cube' | 'switch', pending: PendingAction, accepted: boolean, now: number): void {
        const result = { ...pending, accepted, receivedAt: now, rttMs: Math.round(now - pending.sentAt) };
        this.last[pending.kind] = result;
        if (key === 'cube') this.cubeResult = result;
        this[key] = null;
    }
    clear(now: number): void {
        for (const key of ['cube', 'switch'] as const) if (this[key]) this.finish(key, this[key], false, now);
    }
    cancelCube(now: number): void { if (this.cube) this.finish('cube', this.cube, false, now); }
}
