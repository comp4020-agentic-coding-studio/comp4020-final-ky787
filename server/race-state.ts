import { PRESSURE_PLATES, type RaceInputs, type RaceOutputs } from '../src/coop/protocol.ts';
import type { LevelContext, LevelDefinition } from './coop-state.ts';
import { crumbleView, triggerCrumble } from './crumble-state.ts';

/** Authored gameplay clocks, never CPU timing or binary evidence. */
export const RACE_TIMING = { buffer: 2800, handover: 350, toggleInterval: 650, fake: 1550 } as const;
export interface RaceRuntime {
    buffer: 'idle' | 'window' | 'released' | 'expired'; deadline: number; contactEpoch: number;
    phaseUntil: number; toggleAfter: number; returnUntil: number; returnOn: boolean;
}
export const freshRace = (): RaceRuntime => ({ buffer: 'idle', deadline: 0, contactEpoch: -1, phaseUntil: 0, toggleAfter: 0, returnUntil: 0, returnOn: false });
export function raceInputs({ record, held }: Pick<LevelContext<'race-condition'>, 'record' | 'held'>): RaceInputs {
    const occupied = (p: typeof PRESSURE_PLATES[number]) => held.includes(p) || Object.values(record.cubePlacements).includes(p);
    return { dropA: occupied('dropA'), dropB: occupied('dropB'), payloadDelivered: occupied('receiver'),
        traceOccupied: occupied('trace'), phase: record.levelState.phase, returnOccupied: occupied('return'), finalControl: record.levelState.finalControl };
}
export function raceOutputs(i: RaceInputs, buffer: RaceRuntime['buffer'], exitUnlocked: boolean): RaceOutputs {
    const spanMaster = i.payloadDelivered && i.traceOccupied;
    return { topBridge: !i.dropA, bufferBridge: !i.dropB && (buffer === 'idle' || buffer === 'window'),
        // Expiry commits this attempt to failure, so a late B cannot erase it in flight.
        safetyFirewall: !i.dropB || buffer === 'expired', raceFirewall: i.dropA && i.dropB,
        spanMaster, phaseA: spanMaster && !i.phase, phaseB: spanMaster && i.phase,
        returnBridge: i.returnOccupied, exitDoor: exitUnlocked };
}
export function syncRace(ctx: LevelContext): void {
    if (ctx.record.level !== 'race-condition') return;
    const i = raceInputs(ctx as LevelContext<'race-condition'>), on = i.returnOccupied, r = ctx.race;
    if (i.payloadDelivered) ctx.record.checkpoint = 'reunion';
    if (i.payloadDelivered) { r.buffer = 'idle'; r.deadline = 0; }
    else if (r.buffer === 'window' && i.dropB) { r.buffer = 'released'; r.deadline = 0; }
    if (r.returnOn && !on) r.returnUntil = ctx.now + RACE_TIMING.handover;
    if (on) r.returnUntil = 0;
    r.returnOn = on;
}
export function raceDue(r: RaceRuntime, now: number) {
    return r.buffer === 'window' && now >= r.deadline || r.phaseUntil > 0 && now >= r.phaseUntil || r.returnUntil > 0 && now >= r.returnUntil;
}
export function advanceRace(r: RaceRuntime, now: number): boolean {
    if (!raceDue(r, now)) return false;
    if (r.buffer === 'window' && now >= r.deadline) r.buffer = 'expired';
    if (r.phaseUntil && now >= r.phaseUntil) r.phaseUntil = 0;
    if (r.returnUntil && now >= r.returnUntil) r.returnUntil = 0;
    return true;
}
export const raceDefinition: LevelDefinition<'race-condition'> = {
    cubeIds: ['cubeA', 'cubeB'], defaults: () => ({ phase: false, finalControl: false }),
    valid: r => Object.keys(r.levelState).length === 2 && typeof r.levelState.phase === 'boolean' && typeof r.levelState.finalControl === 'boolean'
        && (r.checkpoint === 'entry' || r.checkpoint === 'reunion') && (!r.exitUnlocked || r.levelState.finalControl),
    acceptsPlate: p => p === null || PRESSURE_PLATES.includes(p as typeof PRESSURE_PLATES[number]),
    acceptsPlacement: (_, p) => PRESSURE_PLATES.includes(p as typeof PRESSURE_PLATES[number]),
    cubeEnabled: () => true,
    action: (ctx, m) => {
        if (m.type === 'crumble-trigger') {
            const on = raceOutputs(raceInputs(ctx), ctx.race.buffer, ctx.record.exitUnlocked);
            if (!on.spanMaster || !on.phaseB && ctx.now >= ctx.race.phaseUntil) return false;
            return triggerCrumble(ctx.crumble, m.platform, m.trigger, ctx.now, RACE_TIMING.fake);
        }
        if (m.type !== 'control') return false;
        if (m.control === 'commit') { ctx.record.levelState.finalControl = true; return true; }
        if (m.control !== 'phase' || ctx.now < ctx.race.toggleAfter) return false;
        ctx.record.levelState.phase = !ctx.record.levelState.phase;
        ctx.race.phaseUntil = ctx.now + RACE_TIMING.handover;
        ctx.race.toggleAfter = ctx.now + RACE_TIMING.toggleInterval;
        return true;
    },
    project: ctx => {
        const inputs = raceInputs(ctx), outputs = raceOutputs(inputs, ctx.race.buffer, ctx.record.exitUnlocked);
        const overlap = ctx.now < ctx.race.phaseUntil && outputs.spanMaster;
        return { inputs, outputs, physical: { phaseA: outputs.phaseA || overlap, phaseB: outputs.phaseB || overlap,
            returnBridge: outputs.returnBridge || ctx.now < ctx.race.returnUntil },
            handoverMs: Math.max(0, ctx.race.phaseUntil - ctx.now),
            buffer: { phase: ctx.race.buffer, remainingMs: ctx.race.buffer === 'window' ? Math.max(0, ctx.race.deadline - ctx.now) : 0, durationMs: RACE_TIMING.buffer },
            platforms: crumbleView(ctx.crumble, ctx.now) };
    },
    unlock: ctx => ctx.record.levelState.finalControl && raceInputs(ctx).payloadDelivered,
};
