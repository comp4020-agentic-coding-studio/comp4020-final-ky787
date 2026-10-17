import { PLAYER } from '../engine/constants.ts';
import type { Box, Vec2 } from '../engine/geometry.ts';
import type { RoomMemory } from './progress.ts';
import type { BreakpointDef, RoomDef } from './rooms.ts';
import { ReceiverPresentation, type PayloadReceiver } from './receiver-presentation.ts';
import { MachineryPresentation, type PressurePad } from './machinery-presentation.ts';
import type { LiftField } from './machinery.ts';

export const HERO_TIMING = { attach: .85, terminal: .2, mast: .8, flag: 1.2, breakpoint: 1.6, exit: 1, completion: .65 } as const;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
export interface HeroState { checkpoint: RoomMemory['checkpoint']; exitReady: boolean; completed: boolean; receivers?: readonly PayloadReceiver[]; pads?: readonly PressurePad[]; lifts?: readonly LiftField[] }
export interface HeroCue { cue: 'entryAttach' | 'breakpointDeploy' | 'breakpointConfirm' | 'payloadConfirm'; at: Vec2 }
export function breakpointActive(def: BreakpointDef, checkpoint: HeroState['checkpoint']): boolean {
    return checkpoint === def.checkpoint || def.checkpoint === 'relay' && checkpoint === 'upper';
}
export function breakpointPose(active: boolean, age: number) {
    return { mast: active ? ease((age - HERO_TIMING.terminal) / (HERO_TIMING.mast - HERO_TIMING.terminal)) : 0,
        flag: active ? ease((age - HERO_TIMING.mast) / (HERO_TIMING.flag - HERO_TIMING.mast)) : 0,
        flash: active && age < HERO_TIMING.terminal ? Math.sin(age / HERO_TIMING.terminal * Math.PI) : 0,
        confirmation: active && age >= HERO_TIMING.flag && age < HERO_TIMING.breakpoint
            ? Math.sin((age - HERO_TIMING.flag) / (HERO_TIMING.breakpoint - HERO_TIMING.flag) * Math.PI) : 0 };
}
/** Adjacent authored spawn points share a compact frame; no physics geometry is inferred or changed. */
export function entryGateways(room: RoomDef): { opening: Box; points: Vec2[] }[] {
    const groups: Vec2[][] = [];
    for (const p of [...(room.entryPoints ?? [room.spawn])].sort((a, b) => a.x - b.x)) {
        const group = groups.at(-1);
        if (group && Math.abs(group[0].y - p.y) < 1 && p.x - group[0].x <= 140) group.push(p);
        else groups.push([p]);
    }
    return groups.map(points => ({ points, opening: { x: points[0].x - 28, y: points[0].y + PLAYER.height / 2 - 112,
        w: points.at(-1)!.x - points[0].x + 56, h: 112 } }));
}

/** Local animation clocks observe accepted milestones. Reset baselines a restored snapshot.
 * No network messages, timers, world mutation, or gameplay events originate here. */
export class HeroPresentation {
    time = 0;
    entryAge = Infinity;
    exitAge = Infinity;
    completionAge = Infinity;
    private pendingEntry = false;
    private previous: HeroState = { checkpoint: 'entry', exitReady: false, completed: false };
    readonly breakpoints = new Map<string, { active: boolean; age: number }>();
    readonly receivers = new ReceiverPresentation();
    readonly machinery = new MachineryPresentation();
    reset(room: RoomDef, state: HeroState): void {
        this.time = 0; this.entryAge = this.exitAge = this.completionAge = Infinity;
        this.pendingEntry = state.checkpoint === 'entry' && !state.completed;
        this.previous = { ...state };
        this.breakpoints.clear();
        this.receivers.reset(state.receivers ?? []);
        this.machinery.reset(state.pads ?? [], state.lifts ?? []);
        for (const def of room.breakpoints ?? []) this.breakpoints.set(def.id, { active: breakpointActive(def, state.checkpoint), age: Infinity });
    }
    update(room: RoomDef, state: HeroState, dt: number, running: boolean): HeroCue[] {
        dt = Math.max(0, Number.isFinite(dt) ? dt : 0);
        this.time += dt; this.entryAge += dt; this.exitAge += dt; this.completionAge += dt;
        const cues: HeroCue[] = this.receivers.update(state.receivers ?? [], dt, running);
        this.machinery.update(state.pads ?? [], state.lifts ?? [], dt, running);
        if (this.pendingEntry && running) {
            this.pendingEntry = false; this.entryAge = 0;
            cues.push({ cue: 'entryAttach', at: room.spawn });
        }
        if (state.exitReady && !this.previous.exitReady) this.exitAge = 0;
        if (state.completed && !this.previous.completed) this.completionAge = 0;
        for (const def of room.breakpoints ?? []) {
            const old = this.breakpoints.get(def.id) ?? { active: breakpointActive(def, this.previous.checkpoint), age: Infinity };
            const active = breakpointActive(def, state.checkpoint);
            const age = active && !old.active ? 0 : old.age + dt;
            if (active && !old.active) cues.push({ cue: 'breakpointDeploy', at: def.at });
            if (active && old.active && old.age < HERO_TIMING.flag && age >= HERO_TIMING.flag) cues.push({ cue: 'breakpointConfirm', at: def.at });
            this.breakpoints.set(def.id, { active, age });
        }
        this.previous = { ...state };
        return cues;
    }
    snapshot() {
        const age = (n: number) => Number.isFinite(n) ? n : null;
        return { entryAge: age(this.entryAge), exitAge: age(this.exitAge), completionAge: age(this.completionAge),
            receivers: this.receivers.snapshot(),
            ...this.machinery.snapshot(),
            breakpoints: [...this.breakpoints].map(([id, s]) => ({ id, active: s.active, age: age(s.age), ...breakpointPose(s.active, s.age) })) };
    }
}
