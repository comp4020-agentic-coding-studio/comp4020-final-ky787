import { describe, expect, it } from 'vitest';
import type { Box } from '../src/engine/geometry.ts';
import { drawDeathZone, drawStaticPlatform } from '../src/slice/terrain-render.ts';

function record(kind: 'static' | 'hazard', box: Box, view: Box, time = 0, motion = true) {
    const commands: unknown[][] = [];
    const context = new Proxy({}, {
        get: (_, name) => (...args: unknown[]) => {
            commands.push([name, ...args]);
            if (name === 'createLinearGradient') return { addColorStop: (...stops: unknown[]) => commands.push(['stop', ...stops]) };
        },
        set: (_, name, value) => { commands.push(['set', name, typeof value === 'object' ? 'gradient' : value]); return true; },
    }) as CanvasRenderingContext2D;
    if (kind === 'static') drawStaticPlatform(context, box, view);
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
        if (kind === 'hazard') expect(record(kind, box, view, 0)).not.toEqual(record(kind, box, view, 2.5));
        else expect(record(kind, box, view, 0)).toEqual(record(kind, box, view, 2.5));
    });
});
