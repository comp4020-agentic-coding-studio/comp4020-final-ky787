import { describe, expect, it } from 'vitest';
import type { Box } from '../src/engine/geometry.ts';
import { drawDeathZone, drawStaticPlatform, hazardSignals, staticSignals, type RailSignal } from '../src/slice/terrain-render.ts';

function record(kind: 'static' | 'hazard', box: Box, view: Box, time = 0, motion = true) {
    const commands: unknown[][] = [];
    const context = new Proxy({}, {
        get: (_, name) => (...args: unknown[]) => {
            commands.push([name, ...args]);
            if (name === 'createLinearGradient') return { addColorStop: (...stops: unknown[]) => commands.push(['stop', ...stops]) };
        },
        set: (_, name, value) => { commands.push(['set', name, typeof value === 'object' ? 'gradient' : value]); return true; },
    }) as CanvasRenderingContext2D;
    if (kind === 'static') drawStaticPlatform(context, box, view, time, motion);
    else drawDeathZone(context, box, view, time, motion);
    return commands;
}
const view = Object.freeze({ x: 100, y: 100, w: 1600, h: 900 });
describe.each(['static', 'hazard'] as const)('%s terrain presentation', kind => {
    it('does no Canvas work for invisible or empty rectangles', () => {
        for (const b of [{ x: -100, y: 0, w: 50, h: 50 }, { x: 1700, y: 100, w: 80, h: 80 },
            { x: 100, y: 100, w: 0, h: 100 }, { x: 100, y: 100, w: 100, h: -5 }]) {
            expect(record(kind, b, view)).toEqual([]);
        }
    });
    it('bounds work by the visible slice, even for enormous authored boxes', () => {
        const small = record(kind, { x: 0, y: 0, w: 10000, h: 10000 }, view);
        const enormous = record(kind, { x: 0, y: 0, w: 1e9, h: 1e9 }, view);
        expect(enormous.length).toBe(small.length);
        expect(enormous.length).toBeLessThan(6000);
    });
    it('clips to the visible intersection and restores Canvas state without mutating geometry', () => {
        const box = Object.freeze({ x: 0, y: 0, w: 1250, h: 720 });
        const commands = record(kind, box, view);
        expect(commands.slice(0, 4)).toEqual([['save'], ['beginPath'], ['rect', 100, 100, 1150, 620], ['clip']]);
        expect(commands.at(-1)).toEqual(['restore']);
        expect(box).toEqual({ x: 0, y: 0, w: 1250, h: 720 });
    });
    it('has a deterministic still appearance for reduced motion and pause', () => {
        const box = { x: 70, y: 120, w: 4320, h: 70 };
        expect(record(kind, box, view, 0, false)).toEqual(record(kind, box, view, 100, false));
        expect(record(kind, box, view, 2.5)).toEqual(record(kind, box, view, 2.5));
        expect(record(kind, box, view, 0)).not.toEqual(record(kind, box, view, 2.5));
    });
    it('draws moving signals only after the complete still architecture', () => {
        // A paused or reduced-motion frame is exactly the moving frame minus its signals,
        // so no body, etched trace or lethal boundary depends on presentation time.
        const box = { x: 70, y: 120, w: 1600, h: 300 };
        const still = record(kind, box, view, 0, false), moving = record(kind, box, view, 7.3);
        expect(moving.slice(0, still.length - 1)).toEqual(still.slice(0, -1));
        expect(moving.length).toBeGreaterThan(still.length);
    });
});

/** Union length of the parts of signal bodies that fall inside [lo, hi]. */
function coverage(signals: RailSignal[], lo: number, hi: number) {
    const spans = signals.map(s => [Math.max(lo, Math.min(s.head, s.tail)), Math.min(hi, Math.max(s.head, s.tail))]).filter(([a, z]) => z > a).sort((a, b) => a[0] - b[0]);
    let total = 0, end = -Infinity;
    for (const [a, z] of spans) { if (z > end) total += z - Math.max(a, end); end = Math.max(end, z); }
    return total;
}
const floor = Object.freeze({ x: 0, y: 1500, w: 1800, h: 280 }), camera = Object.freeze({ x: 300, y: 1100, w: 1300, h: 731 });

describe('static contact-edge flow', () => {
    it('keeps several luminous segments moving across the visible floor edge at gameplay speed', () => {
        for (const time of [0, 1.7, 9.2, 60]) {
            const signals = staticSignals(floor, camera, time).filter(s => s.axis === 'x');
            const visible = signals.filter(s => Math.max(s.head, s.tail) > camera.x && Math.min(s.head, s.tail) < camera.x + camera.w);
            // At least one bright head per 260 visible units, each 20–50 units bright.
            expect(visible.length).toBeGreaterThanOrEqual(Math.floor(camera.w / 260));
            for (const s of visible) {
                expect(Math.abs(s.velocity)).toBeGreaterThanOrEqual(100);
                expect(Math.abs(s.velocity)).toBeLessThanOrEqual(160);
                expect(s.bright).toBeGreaterThanOrEqual(20);
                expect(s.bright).toBeLessThanOrEqual(50);
                expect(s.across).toBe(floor.y);
            }
            // Lit signals and trails cover a substantial share of the visible edge.
            expect(coverage(visible, camera.x, camera.x + camera.w) / camera.w).toBeGreaterThan(.35);
        }
    });
    it('advances each world-anchored signal by its velocity rather than reseeding it', () => {
        const a = staticSignals(floor, camera, 4), b = staticSignals(floor, camera, 4.25);
        let tracked = 0;
        for (const s of a) {
            const next = b.find(n => n.velocity === s.velocity && Math.abs(n.head - s.head - s.velocity * .25) < 1e-6);
            if (next) tracked++;
        }
        // Signals near the edges may enter or leave; the rest move ~25–40 units in 0.25s.
        expect(tracked).toBeGreaterThanOrEqual(a.length - 3);
        expect(tracked).toBeGreaterThanOrEqual(4);
    });
    it('does not depend on the viewport for position or phase', () => {
        const wide = staticSignals(floor, { x: 0, y: 1100, w: 1800, h: 731 }, 3.3);
        const panned = staticSignals(floor, { x: 640, y: 1100, w: 500, h: 731 }, 3.3);
        for (const s of panned) expect(wide).toContainEqual(s);
    });
    it('gives narrow walls vertical rails and short ledges a single moving signal', () => {
        const wall = { x: 90, y: 420, w: 30, h: 652 }, wallView = { x: 0, y: 300, w: 400, h: 900 };
        const rails = staticSignals(wall, wallView, 2).filter(s => s.axis === 'y');
        expect(new Set(rails.map(s => Math.sign(s.velocity))).size).toBe(2);
        expect(rails.length).toBeGreaterThanOrEqual(4);
        for (const s of rails) expect(Math.abs(s.velocity)).toBeGreaterThanOrEqual(100);
        const ledge = { x: 300, y: 1136, w: 140, h: 22 };
        for (const time of [0, 1, 2, 3]) {
            const lit = staticSignals(ledge, { x: 0, y: 900, w: 900, h: 500 }, time)
                .filter(s => Math.max(s.head, s.tail) > ledge.x && Math.min(s.head, s.tail) < ledge.x + ledge.w);
            expect(lit.length).toBeLessThanOrEqual(1);
        }
        expect(staticSignals({ x: 0, y: 0, w: 30, h: 8 }, view, 2)).toEqual([]);
    });
    it('keeps the static body plain: no chips, pins or dense circuitry', () => {
        const commands = record('static', floor, camera, 0, false);
        const rects = commands.filter(c => c[0] === 'fillRect').length, vertices = commands.filter(c => c[0] === 'lineTo').length;
        // Substrate, sides, glow, contact strip and a handful of 2×2 etched vias.
        expect(rects).toBeLessThan(20);
        expect(vertices).toBeLessThan(40);
    });
});

describe('death-field corruption flow', () => {
    const field = Object.freeze({ x: 0, y: 1710, w: 4320, h: 70 });
    it('runs fast, long trailing signals along the lethal edge and several internal routes at once', () => {
        for (const time of [0, 2.2, 13]) {
            const signals = hazardSignals(field, camera, time);
            const edge = signals.filter(s => s.across === field.y), lanes = new Set(signals.map(s => s.across));
            expect(edge.length).toBeGreaterThanOrEqual(Math.floor(camera.w / 240));
            for (const s of edge) {
                expect(Math.abs(s.velocity)).toBeGreaterThanOrEqual(170);
                expect(Math.abs(s.velocity)).toBeLessThanOrEqual(250);
                expect(Math.abs(s.head - s.tail)).toBeGreaterThanOrEqual(90);
            }
            expect(lanes.size).toBeGreaterThanOrEqual(4);
            expect(signals.length).toBeGreaterThanOrEqual(15);
            expect(signals.filter(s => s.velocity < 0).length).toBeGreaterThan(0);
            for (const s of signals) expect(Math.abs(s.velocity)).toBeGreaterThanOrEqual(170);
        }
    });
    it('keeps boundary activity visible when terrain hides all but a thin exposed strip', () => {
        const strip = { x: 2050, y: 1690, w: 250, h: 40 };
        const exposed = hazardSignals(field, strip, 5).filter(s => s.across <= field.y + 16);
        expect(exposed.length).toBeGreaterThanOrEqual(1);
        expect(coverage(hazardSignals(field, { x: 0, y: 1690, w: 1300, h: 40 }, 5), 0, 1300) / 1300).toBeGreaterThan(.4);
    });
});
