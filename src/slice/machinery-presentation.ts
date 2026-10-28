import type { Vec2 } from '../engine/geometry.ts';
import type { PuzzleWorld } from './world.ts';
import type { LiftField } from './machinery.ts';

export interface PressurePad { id: string; at: Vec2; label: string; active: boolean; supported: boolean; labelOffset?: number }
export interface PowerState { active: boolean; age: number; from: number }
export const MACHINERY_TIMING = { press: .14, release: .18, liftOn: .64, liftOff: .28 } as const;
export const machineryEase = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
export function transitionPower(state: PowerState, on: number, off: number): number {
    return state.from + (Number(state.active) - state.from) * machineryEase(state.age / (state.active ? on : off));
}
export const padDepression = (s: PowerState) => transitionPower(s, MACHINERY_TIMING.press, MACHINERY_TIMING.release);
export const liftIllumination = (s: PowerState) => transitionPower(s, MACHINERY_TIMING.liftOn, MACHINERY_TIMING.liftOff);

/** Read existing accepted inputs only. Dedicated payload sockets never enter this
 * list. Legacy personnel pads retain their room-owned occupancy contracts; the
 * CROSSFEED vault's two biometric scanners use the same pad art plus their rails. */
export function pressurePads(w: Pick<PuzzleWorld, 'room' | 'inputs' | 'frame' | 'platforms'>): PressurePad[] {
    const r = w.room, pads: Omit<PressurePad, 'supported'>[] = [];
    const add = (id: string, at: Vec2 | undefined, active: boolean, label: string) => { if (at) pads.push({ id, at, active, label }); };
    if (r.id !== 'crossfeed-vault') {
        add('plateA', r.plate, w.inputs.plateA, r.id === 'lift-lab' ? 'HOLD / LIFT POWER'
            : ['pairing-bay', 'relay', 'uplink'].includes(r.id) ? 'PLATE A / ANCHOR' : 'BUTTON');
        add('plateB', r.plateB, w.inputs.plateB, r.id === 'pairing-bay' ? 'FINAL / LEFT' : r.id === 'uplink' ? 'PLATE B / LIFT' : 'PLATE B / EXIT');
        if (r.id === 'pairing-bay') add('plateC', r.plateC, w.inputs.plateC, 'FINAL / RIGHT');
    } else {
        add('plateB', r.plateB, w.inputs.plateB, 'LEFT / SCANNER');
        add('plateC', r.plateC, w.inputs.plateC, 'RIGHT / SCANNER');
    }
    for (const p of r.plates ?? []) if (!p.kind || p.kind === 'plate') {
        const active = w.frame.plates?.[p.id] ?? (p.id === 'dropA' ? w.inputs.plateA : p.id === 'dropB' ? w.inputs.plateB
            : p.id === 'trace' ? w.inputs.plateC : p.id === 'receiver' ? w.inputs.cubeOnPlate : w.inputs.cubeOnPlateB);
        add(p.id, p.at, active, p.label);
    }
    return pads.map(p => {
        const support = w.platforms.filter(s => Math.abs(s.def.y - p.at.y) < 5 && p.at.x >= s.def.x && p.at.x <= s.def.x + s.def.w);
        return { ...p, supported: !support.length || support.some(s => s.solid.enabled),
            labelOffset: support.some(s => s.def.kind !== 'static') ? 72 : 49 };
    });
}

/** Disposable presentation, independent of sensors, machine power, audio and saves.
 * Existing LiftField.enabled/pulse remain the physical machine's source of truth. */
export class MachineryPresentation {
    readonly pads = new Map<string, PowerState>();
    readonly lifts = new Map<string, PowerState>();
    private support = new Map<string, boolean>();
    reset(pads: readonly PressurePad[], lifts: readonly LiftField[]) {
        this.pads.clear(); this.lifts.clear(); this.support.clear();
        this.update(pads, lifts, 0, false);
    }
    update(pads: readonly PressurePad[], lifts: readonly LiftField[], dt: number, animate: boolean) {
        const advance = (map: Map<string, PowerState>, id: string, active: boolean, on: number, off: number) => {
            const old = map.get(id), changed = old && old.active !== active;
            map.set(id, { active, age: !old || !animate ? Infinity : changed ? 0 : old.age + Math.max(0, Number.isFinite(dt) ? dt : 0),
                from: !old || !animate ? Number(active) : changed ? transitionPower(old, on, off) : old.from });
        };
        for (const p of pads) { advance(this.pads, p.id, p.active, MACHINERY_TIMING.press, MACHINERY_TIMING.release); this.support.set(p.id, p.supported); }
        for (const l of lifts) advance(this.lifts, l.def.id, l.enabled, MACHINERY_TIMING.liftOn, MACHINERY_TIMING.liftOff);
        for (const id of this.pads.keys()) if (!pads.some(p => p.id === id)) { this.pads.delete(id); this.support.delete(id); }
        for (const id of this.lifts.keys()) if (!lifts.some(l => l.def.id === id)) this.lifts.delete(id);
    }
    snapshot() {
        return { pads: [...this.pads].map(([id, s]) => ({ id, active: s.active, supported: this.support.get(id), age: Number.isFinite(s.age) ? s.age : null, depression: padDepression(s) })),
            lifts: [...this.lifts].map(([id, s]) => ({ id, enabled: s.active, age: Number.isFinite(s.age) ? s.age : null, illumination: liftIllumination(s) })) };
    }
}
