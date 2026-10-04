import { boxesOverlap, clamp, type Box } from '../engine/geometry.ts';
import type { Body, LooseBody, Solid, VerticalMotion } from '../engine/physics.ts';
import type { ControllerOutputs } from './controller.ts';

export interface LiftFieldDef extends Box { id: string; signal: keyof ControllerOutputs }
export interface RelayGateDef extends Box { id: string; exitSide: -1 | 1 }
export interface RelayGatePairDef {
    id: string;
    signal: keyof ControllerOutputs;
    gates: readonly [RelayGateDef, RelayGateDef];
}

/** Transient machinery state. Logical power always comes from the controller. */
class PoweredMachine {
    enabled = false;
    pulse = 0;
    power(on: boolean): void {
        if (on !== this.enabled) this.pulse = 1;
        this.enabled = on;
    }
    step(dt: number): void { this.pulse = Math.max(0, this.pulse - dt * 1.5); }
}

/** Vertical transport with a soft hover at the top and no horizontal launch. */
export class LiftField extends PoweredMachine {
    constructor(readonly def: LiftFieldDef) { super(); }
    influence(body: Body, _width: number, height: number): VerticalMotion | undefined {
        const b = this.def;
        if (!this.enabled || body.x < b.x || body.x > b.x + b.w
            || body.y + height / 2 < b.y || body.y - height / 2 > b.y + b.h) return;
        // Keep the entire body above a generous landing at the top of the field.
        return { targetY: -clamp((body.y - b.y - height / 2) * 5, 0, 240),
            acceleration: 1800, maxRise: 240, maxHorizontal: 240, horizontalDrag: 1000 };
    }
}

export interface GateTransit { from: string; to: string; pair: string }
/** Fixed destinations, per-entity cooldown, and separation from the arrival volume. */
export class RelayGatePair extends PoweredMachine {
    private cooldowns = new Map<string, number>();
    constructor(readonly def: RelayGatePairDef) { super(); }
    override step(dt: number): void {
        super.step(dt);
        for (const [id, time] of this.cooldowns) {
            if (time <= dt) this.cooldowns.delete(id);
            else this.cooldowns.set(id, time - dt);
        }
    }
    cooldown(id: string): number { return this.cooldowns.get(id) ?? 0; }
    teleport(id: string, body: LooseBody, width: number, height: number,
        solids: readonly Solid[], bounds: { width: number; height: number }, carriedHeight = 0): GateTransit | null {
        if (!this.enabled || this.cooldown(id)) return null;
        const index = this.def.gates.findIndex(g => boxesOverlap(
            { x: body.x - width / 2, y: body.y - height / 2, w: width, h: height }, g));
        if (index < 0) return null;
        const from = this.def.gates[index], to = this.def.gates[1 - index];
        const x = to.exitSide > 0 ? to.x + to.w + width / 2 + 18 : to.x - width / 2 - 18;
        const y = to.y + to.h - height / 2;
        const box = { x: x - width / 2, y: y - height / 2 - carriedHeight, w: width, h: height + carriedHeight };
        // Authored exits must be inside the room and clear for the whole payload.
        if (box.x < 0 || box.x + box.w > bounds.width || box.y < 0 || box.y + box.h > bounds.height
            || solids.some(s => s.enabled && boxesOverlap(box, s))) return null;
        Object.assign(body, { x, y, vx: to.exitSide * Math.min(Math.abs(body.vx), 240), vy: 0, grounded: false, groundId: null });
        this.cooldowns.set(id, .65);
        this.pulse = 1;
        return { pair: this.def.id, from: from.id, to: to.id };
    }
}
