import type { Box } from '../engine/geometry.ts';
import type { LiftField } from './machinery.ts';
import { heroMaterials } from './hero-render.ts';
import { energyPhase } from './payload-energy.ts';
import { liftIllumination, machineryEase, MACHINERY_TIMING, type PowerState } from './machinery-presentation.ts';

const { panel, line, dot, text } = heroMaterials;
const BLUE = '#5aabff', CYAN = '#77e8ff', BRIGHT = '#c4f7ff', RAIL = '#405969';
/** Counts depend on the visible slice and screen density, never total shaft height.
 * At most seven ribbons × eight segments, twenty rail rows and twenty flecks. */
export function liftDetailPlan(b: Box, view: Box, zoom: number) {
    if (b.x + b.w + 12 < view.x || b.x - 12 > view.x + view.w || b.y > view.y + view.h || b.y + b.h + 45 < view.y) return null;
    const top = Math.max(b.y, view.y - 12), bottom = Math.min(b.y + b.h, view.y + view.h + 12);
    const height = Math.max(0, bottom - top), pitch = Math.max(58, 54 / Math.max(.05, zoom), height / 16);
    return { top, bottom, height, pitch, first: Math.floor(top / pitch) - 1, rows: Math.min(20, Math.ceil(height / pitch) + 3),
        streams: Math.min(7, Math.max(3, Math.floor(b.w / 60))), segments: 8 };
}

/** Original Canvas art, drawn behind solids, hazards and cargo. All displacement
 * belongs to photons; LiftField.influence and the actual bounds are untouched. */
export function drawGravityLift(c: CanvasRenderingContext2D, lift: LiftField, state: PowerState, time: number,
    view: Box, zoom: number, motion: boolean, label = true, layer: 'field' | 'emitter' = 'field'): void {
    const b = lift.def, plan = liftDetailPlan(b, view, zoom); if (!plan) return;
    const power = motion ? liftIllumination(state) : Number(lift.enabled), clock = motion && lift.enabled ? time : 0;
    const seed = energyPhase(b.id), foot = b.y + b.h, margin = Math.min(12, b.w * .12), railInset = Math.min(5, b.w * .08);
    const startup = lift.enabled && motion ? machineryEase(state.age / MACHINERY_TIMING.liftOn) : Number(lift.enabled);
    const front = foot - b.h * startup;
    c.save();
    if (layer === 'field' && plan.height > 0) {
        c.save(); c.beginPath(); c.rect(b.x, plan.top, b.w, plan.height); c.clip();
        if (power > 0) {
            // Blue edges, almost clear centre. One bounded gradient per visible field.
            const atmosphere = c.createLinearGradient(b.x, 0, b.x + b.w, 0);
            atmosphere.addColorStop(0, '#5aabff16'); atmosphere.addColorStop(.22, '#164d9112');
            atmosphere.addColorStop(.5, '#164d9106'); atmosphere.addColorStop(.78, '#164d9112'); atmosphere.addColorStop(1, '#5aabff16');
            c.globalAlpha = power; c.fillStyle = atmosphere; c.fillRect(b.x, plan.top, b.w, plan.height);
            for (let i = 0; i < plan.streams; i++) {
                const baseX = b.x + margin + (b.w - margin * 2) * (i + .5) / plan.streams;
                const speed = .55 + i * .08, amplitude = Math.min(4.5, b.w / 30);
                const xAt = (y: number) => baseX + Math.sin(y / 105 + clock * speed + i * 2.1 + seed * 6) * amplitude;
                c.beginPath(); c.moveTo(xAt(plan.top), plan.top);
                for (let segment = 1; segment <= plan.segments; segment++) {
                    const y0 = plan.top + plan.height * (segment - 1) / plan.segments, y = plan.top + plan.height * segment / plan.segments;
                    c.bezierCurveTo(xAt((y0 * 2 + y) / 3), (y0 * 2 + y) / 3, xAt((y0 + y * 2) / 3), (y0 + y * 2) / 3, xAt(y), y);
                }
                c.globalAlpha = power * (lift.enabled ? .14 : .035); c.strokeStyle = BLUE; c.lineWidth = 8; c.stroke();
                c.globalAlpha = power * (lift.enabled ? .38 : .07); c.strokeStyle = i % 2 ? BLUE : CYAN; c.lineWidth = 1.2; c.stroke();
            }
        }
        for (const side of [0, 1]) {
            const x = side ? b.x + b.w - railInset : b.x + railInset, inward = side ? -1 : 1;
            c.globalAlpha = .3; line(c, x, plan.top, x, plan.bottom, RAIL, .8);
            for (let row = 0; row < plan.rows; row++) {
                const cell = plan.first + row, y = cell * plan.pitch;
                if (y < plan.top - 24 || y > plan.bottom) continue;
                const lit = lift.enabled ? power * machineryEase((y - front + 40) / 70) : power * .18;
                c.globalAlpha = .3 + lit * .65;
                c.beginPath(); c.moveTo(x, y + 24); c.lineTo(x, y + 12); c.lineTo(x + inward * 3, y + 9); c.lineTo(x + inward * 3, y);
                c.strokeStyle = lit > .05 ? BLUE : RAIL; c.lineWidth = 1.2; c.stroke();
                const travelling = motion ? .65 + .25 * Math.sin(clock * 2.2 - cell * .7 + side + seed * 6) : .85;
                c.globalAlpha = lit > .05 ? lit * travelling : .3; dot(c, x + inward * 3, y, 1.7, lit > .05 ? BRIGHT : RAIL);
            }
        }
        if (lift.enabled) for (let row = 0; row < plan.rows; row++) {
            const cell = plan.first + row, phase = (clock * (.53 + (Math.abs(cell) % 3) * .1) + seed + Math.abs(Math.sin(cell * 12.7)) * .8) % 1;
            const y = (cell + 1 - phase) * plan.pitch;
            if (y < plan.top || y > plan.bottom || y < front - 40) continue;
            const x = b.x + b.w * (.18 + .64 * Math.abs(Math.sin(cell * 2.31 + seed * 7)));
            c.globalAlpha = (.3 + .5 * Math.sin(phase * Math.PI)) * Math.max(.3, power);
            if (Math.abs(cell) % 7 === 0 && zoom > .55) text(c, cell % 2 ? '01' : '10', x, y, 8, CYAN);
            else { line(c, x, y, x, y + 4.5, BRIGHT, 1.2); dot(c, x, y, 1, BLUE); }
        }
        // An airy convergence ring, never a fictitious top landing platform.
        if (b.y + 55 >= plan.top && power > 0) {
            const band = c.createLinearGradient(0, b.y, 0, b.y + 55);
            band.addColorStop(0, '#5aabff00'); band.addColorStop(.4, '#5aabff24'); band.addColorStop(1, '#5aabff00');
            c.globalAlpha = power; c.fillStyle = band; c.fillRect(b.x + margin, b.y, b.w - margin * 2, 55);
            c.globalAlpha = power * .38; c.strokeStyle = CYAN; c.lineWidth = 1;
            for (const y of [b.y + 18, b.y + 27]) { c.beginPath(); c.ellipse(b.x + b.w / 2, y, b.w * .34, 5, 0, Math.PI, Math.PI * 2); c.stroke(); }
        }
        if (lift.enabled && motion && state.age < MACHINERY_TIMING.liftOn) {
            // Reuse the physical machine's existing transient only as a brightness
            // accent. Settled/reset states suppress it even if power() just ran.
            c.globalAlpha = Math.sin(startup * Math.PI) * lift.pulse * .65;
            line(c, b.x + margin, front, b.x + b.w - margin, front, BRIGHT, 2);
        }
        // Sparse direction chevrons survive pause/reduced motion and distant views.
        if (lift.enabled) for (let i = 0; i < 3; i++) {
            const y = b.y + b.h * (.23 + i * .26); if (y < plan.top || y > plan.bottom) continue;
            const x = b.x + b.w * .5, size = Math.min(8, 5 / Math.max(.2, zoom));
            c.globalAlpha = .26 + power * .12;
            line(c, x - size, y + size * .6, x, y, BLUE, 1.3); line(c, x, y, x + size, y + size * .6, BLUE, 1.3);
        }
        c.restore();
    }
    if (layer === 'emitter' && foot >= view.y - 18 && foot <= view.y + view.h + 20) {
        const ink = lift.enabled ? BLUE : RAIL;
        c.globalAlpha = 1;
        panel(c, b.x + margin * .5, foot - 5, b.w - margin, 14, '#15232d', RAIL, 3);
        panel(c, b.x + margin, foot - 3, b.w - margin * 2, 6, '#0b1723', lift.enabled ? '#164d91' : RAIL, 2);
        const ports = Math.min(9, Math.max(3, Math.floor(b.w / 42)));
        for (let i = 0; i < ports; i++) {
            const x = b.x + margin + (b.w - margin * 2) * (i + .5) / ports, width = Math.min(20, b.w / ports * .55);
            line(c, x - width / 2, foot, x + width / 2, foot, ink, 2);
            line(c, x - width / 2, foot + 5, x, foot + 5, lift.enabled ? '#164d91' : RAIL);
            const bright = motion ? .6 + .25 * Math.sin(clock * 1.9 - i * .8 + seed * 6) : .85;
            c.globalAlpha = lift.enabled ? bright : .4; dot(c, x, foot + 5, 1.5, lift.enabled ? CYAN : RAIL);
        }
        c.globalAlpha = lift.enabled ? .6 + power * .35 : .3;
        line(c, b.x + margin, foot - 3, b.x + b.w - margin, foot - 3, lift.enabled ? BRIGHT : RAIL, 1.5);
        c.globalAlpha = 1;
        if (label) {
            text(c, 'GRAVITY LIFT', b.x + b.w / 2, foot + 27, 11, ink);
            text(c, lift.enabled ? '↑ POWER ON' : 'SIGNAL OFF', b.x + b.w / 2, foot + 40, 9, ink);
        }
    }
    c.restore();
}
