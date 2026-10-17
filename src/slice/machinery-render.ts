import type { PuzzleWorld } from './world.ts';
import { isCoopLevel } from '../coop/protocol.ts';

/** Machinery graphics consume power/transients; they never decide physical state. */
export function drawMachinery(c: CanvasRenderingContext2D, w: PuzzleWorld): void {
    const text = (s: string, x: number, y: number, colour: string, size = 13) => {
        c.font = `500 ${size}px ui-monospace, monospace`; c.fillStyle = colour; c.fillText(s, x, y);
    };
    c.save();
    for (const pair of w.gates) for (const g of pair.def.gates) {
        const colour = pair.enabled ? '#b59bff' : '#61707e';
        c.fillStyle = pair.enabled ? '#624fa633' : '#16222c'; c.fillRect(g.x, g.y, g.w, g.h);
        c.strokeStyle = colour; c.lineWidth = 5; c.strokeRect(g.x, g.y, g.w, g.h);
        if (pair.enabled) {
            c.globalAlpha = .3;
            for (let i = 0; i < 7; i++) {
                const y = g.y + (i * 16 + w.elapsed * 25) % g.h;
                c.fillStyle = colour; c.fillRect(g.x + 6, y, g.w - 12, 2);
            }
            c.globalAlpha = 1;
            text('↔', g.x + 10, g.y + 57, colour, 28);
        } else text('×', g.x + 18, g.y + 58, colour, 24);
        text(isCoopLevel(w.room.id) ? `GATE ${g.id}` : `RELAY ${pair.def.id} · ${g.id}`, g.x - (isCoopLevel(w.room.id) ? 8 : 35), g.y - 20, colour);
        text(pair.enabled ? 'LINK ON ↔' : 'OFF', g.x - 8, g.y + g.h + 28, colour);
        if (pair.pulse > 0) {
            c.globalAlpha = pair.pulse; c.strokeStyle = '#e4d9ff'; c.lineWidth = 2;
            c.strokeRect(g.x - 8, g.y - 8, g.w + 16, g.h + 16); c.globalAlpha = 1;
        }
    }
    c.restore();
}
