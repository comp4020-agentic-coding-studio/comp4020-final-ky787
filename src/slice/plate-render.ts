import { heroMaterials } from './hero-render.ts';
import { energyPhase } from './payload-energy.ts';
import { machineryEase, padDepression, type PowerState, type PressurePad } from './machinery-presentation.ts';
import { connectionPowered, connectionPulse, type MachineConnection } from './connections.ts';
import type { PuzzleWorld } from './world.ts';

const { panel, line, dot, text } = heroMaterials;
export const PAD_COLOURS = { idle: '#f9ba68', active: '#43c9ff', bright: '#a8f1ff', deep: '#1679b4' };
/** Exact 90-unit illuminated tread; three pixels of cosmetic travel. The player,
 * cube, floor and sensor never move with the surface. No receiver docking here. */
export function drawPressurePad(c: CanvasRenderingContext2D, p: PressurePad, state: PowerState, time: number, motion: boolean): void {
    const depth = motion ? padDepression(state) : Number(p.active), top = -6 + depth * 3;
    const seed = energyPhase(p.id), colour = p.active ? PAD_COLOURS.active : PAD_COLOURS.idle;
    c.save(); c.translate(p.at.x, p.at.y);
    if (!p.supported) {
        c.globalAlpha = .23; c.strokeStyle = '#8399a5'; c.lineWidth = 1; c.setLineDash([4, 5]);
        c.strokeRect(-45, -3, 90, 10); c.setLineDash([]);
        text(c, p.label, 0, p.labelOffset ?? 49, 12, '#8399a5'); c.restore(); return;
    }
    // Keep the base above the code slab's own caption when mounted on a slab.
    panel(c, -48, 2, 96, 7, '#15232d', '#526772', 3);
    panel(c, -41, 1, 82, 6, '#09151f', '#344955', 2);
    for (const side of [-1, 1]) {
        // Short exposed suspension strips disappear into the recess on compression.
        line(c, side * 36, top + 4, side * 34, 7, '#83949d', 2);
        line(c, side * 29, top + 4, side * 29, 6, '#435b68', 2);
    }
    panel(c, -45, top, 90, 6, '#243743', colour, 2);
    panel(c, -31, top + .8, 62, 4.3, '#0b1b28', p.active ? PAD_COLOURS.deep : '#584a36', 1);
    line(c, -39, top, 39, top, colour, 1.8);
    const circuit = p.active ? motion ? machineryEase(state.age / .24) : 1 : 0;
    for (const side of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
            const y = top + 1.4 + i * 2.3;
            c.beginPath(); c.moveTo(side * 39, y); c.lineTo(side * (28 - i * 4), y); c.lineTo(side * (25 - i * 4), top + 3); c.lineTo(side * 11, top + 3);
            c.strokeStyle = p.active ? PAD_COLOURS.active : '#5e503b'; c.globalAlpha = p.active ? .4 + circuit * .5 : .55; c.lineWidth = .8; c.stroke();
        }
        c.globalAlpha = 1; dot(c, side * 40, top + 3, 1.2, p.active ? PAD_COLOURS.bright : '#ffe0a1');
        line(c, side * 44, top + 1, side * 44, top + 4, colour, 2);
        // Surface packets spread toward the output terminals; no object displacement.
        const pulse = motion ? (time * .4 + seed + (side > 0 ? .2 : 0)) % 1 : .5;
        if (p.active) {
            c.globalAlpha = motion ? .65 + Math.sin(time * 2 + seed * 6) * .12 : .8;
            line(c, side * (13 + pulse * 24), top + 3, side * (17 + pulse * 24), top + 3, PAD_COLOURS.bright, 1.4);
        } else {
            c.globalAlpha = motion ? .24 + .08 * Math.sin(time * 1.6 + seed * 6) : .28;
            line(c, side * 36, 8, side * 43, 8, colour);
        }
    }
    c.globalAlpha = 1;
    // Three recessed contact bands keep a button silhouette even with motion off.
    for (const x of [-6, 0, 6]) line(c, x, top + 1, x, top + 4, p.active ? PAD_COLOURS.bright : '#b89a69', 1.2);
    if (motion && p.active && state.age < .36) {
        const pulse = state.age / .36;
        c.globalAlpha = Math.sin(pulse * Math.PI) * .75;
        line(c, -43 * pulse, top, 43 * pulse, top, PAD_COLOURS.bright, 2.5);
    } else if (motion && !p.active && state.age < .18) {
        c.globalAlpha = (1 - state.age / .18) * .35;
        line(c, -39, top + 1, 39, top + 1, PAD_COLOURS.active, 1);
    }
    c.globalAlpha = 1; text(c, p.label, 0, p.labelOffset ?? 49, 12, colour);
    c.restore();
}

/** A small one-shot accent follows the existing resolved wire, never a raw or
 * inverted input that would misleadingly suggest the destination has power. */
export function drawPadOutputPulse(c: CanvasRenderingContext2D, pad: PressurePad, state: PowerState,
    links: readonly MachineConnection[], world: PuzzleWorld, motion: boolean) {
    if (!motion || !pad.active || !pad.supported || state.age < .1 || state.age > .46) return;
    c.save(); c.globalAlpha = Math.sin((state.age - .1) / .36 * Math.PI) * .85;
    for (const link of links) if (Math.hypot(link.points[0].x - pad.at.x, link.points[0].y - pad.at.y) < 60 && connectionPowered(link, world)) {
        const point = connectionPulse(link.points, state.age - .1); dot(c, point.x, point.y, 2.3, PAD_COLOURS.bright);
    }
    c.restore();
}
