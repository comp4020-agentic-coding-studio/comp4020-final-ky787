import type { PuzzleWorld } from './world.ts';
import type { MachinePresentation } from './presentation.ts';
import { isCoopLevel } from '../coop/protocol.ts';

/** Machinery graphics consume power/transients; they never decide physical state. */
export function drawMachinery(c: CanvasRenderingContext2D, w: PuzzleWorld, presentation: MachinePresentation): void {
    const text = (s: string, x: number, y: number, colour: string, size = 13) => {
        c.font = `500 ${size}px ui-monospace, monospace`; c.fillStyle = colour; c.fillText(s, x, y);
    };
    const message = (signal: 'liftField' | 'relayGates', pulse: number) => {
        const feedback = presentation.describe(w.room.id, w.frame, signal);
        return feedback.active ? feedback.text.split('').map((ch, i) => i / feedback.text.length < 1 - pulse ? ch : ((i * 7 + Math.floor(w.elapsed * 10)) % 16).toString(16).toUpperCase()).join('') : 'SIGNAL OFF';
    };
    c.save();
    for (const lift of w.lifts) {
        const b = lift.def, colour = lift.enabled ? '#64e6d5' : '#43545d';
        c.fillStyle = lift.enabled ? '#12343766' : '#18222944';
        c.fillRect(b.x, b.y, b.w, b.h);
        c.strokeStyle = colour; c.lineWidth = 2; c.setLineDash([5, 9]);
        c.strokeRect(b.x, b.y, b.w, b.h); c.setLineDash([]);
        if (lift.enabled) {
            for (let i = 0; i < 12; i++) {
                const y = b.y + (i * b.h / 12 + b.h - w.elapsed * 110 % b.h) % b.h;
                c.globalAlpha = .15 + .25 * (1 - (y - b.y) / b.h);
                c.fillStyle = colour; c.fillRect(b.x + 14, y, b.w - 28, 2);
                text(i % 2 ? '↑  ↑  ↑' : '01  ↑  10', b.x + 56, y - 8, colour);
            }
            c.globalAlpha = 1;
        }
        c.fillStyle = '#243b43'; c.fillRect(b.x, b.y + b.h - 10, b.w, 10);
        c.fillStyle = colour;
        for (let x = b.x + 8; x < b.x + b.w - 8; x += 18) c.fillRect(x, b.y + b.h - 8, 9, 5);
        if (w.room.id !== 'uplink') {
            text('LIFT / VERTICAL TRANSPORT', b.x + 5, b.y + b.h + 35, colour);
            text(message('liftField', lift.pulse), b.x + 6, b.y + 50, colour, 12);
        }
        if (lift.pulse > 0) {
            c.globalAlpha = lift.pulse; c.strokeStyle = '#c6fff5'; c.lineWidth = 4;
            c.strokeRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8); c.globalAlpha = 1;
        }
    }
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
