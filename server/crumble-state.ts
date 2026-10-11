import type { CrumbleId, CrumblePhase, CrumbleTrigger } from '../src/coop/protocol.ts';

/** Authored mock timing, not binary evidence. No geometry or persistence. */
export const CRUMBLE_TIMING = { foot: 600, hook: 1650, broken: 2400 } as const;
interface RuntimePhase { phase: CrumblePhase['phase']; deadline: number; durationMs: number }
export type CrumbleRuntime = Record<CrumbleId, RuntimePhase>;
const stable = (): RuntimePhase => ({ phase: 'stable', deadline: 0, durationMs: 0 });
export const freshCrumble = (): CrumbleRuntime => ({ crumbleA: stable(), crumbleB: stable() });
export function triggerCrumble(state: CrumbleRuntime, id: CrumbleId, trigger: CrumbleTrigger, now: number, warningMs: number = CRUMBLE_TIMING[trigger]): boolean {
    if (state[id].phase !== 'stable') return false;
    const durationMs = warningMs;
    state[id] = { phase: 'warning', deadline: now + durationMs, durationMs };
    return true;
}
export function crumbleDue(state: CrumbleRuntime, now: number): boolean {
    return Object.values(state).some(p => p.phase !== 'stable' && p.deadline <= now);
}
export function advanceCrumble(state: CrumbleRuntime, now: number): boolean {
    let changed = false;
    for (const id of ['crumbleA', 'crumbleB'] as const) {
        const p = state[id];
        if (p.phase === 'stable' || now < p.deadline) continue;
        // Give every broken phase its full duration even after a busy event loop.
        state[id] = p.phase === 'warning' ? { phase: 'broken', deadline: now + CRUMBLE_TIMING.broken, durationMs: CRUMBLE_TIMING.broken } : stable();
        changed = true;
    }
    return changed;
}
export function crumbleView(state: CrumbleRuntime, now: number): Record<CrumbleId, CrumblePhase> {
    const view = (p: RuntimePhase): CrumblePhase => ({ phase: p.phase, remainingMs: Math.max(0, p.deadline - now), durationMs: p.durationMs });
    return { crumbleA: view(state.crumbleA), crumbleB: view(state.crumbleB) };
}
