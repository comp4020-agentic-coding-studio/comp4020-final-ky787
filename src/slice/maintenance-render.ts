import type { Vec2 } from '../engine/geometry.ts';
import { heroMaterials } from './hero-render.ts';

const { panel, polygon, line, dot, text } = heroMaterials;
const COLOURS = { dormant: '#718b95', ready: '#64e6d5', complete: '#59ed93', metal: '#223440', dark: '#091821' };

/** Floating, one-use controls in HANDSHAKE and RACE. Both booleans observe the
 * existing interaction/latch, never new puzzle state. All motion is cosmetic.
 * The 56 × 48 housing floats above the authored contact point; four filaments
 * stay within 64 units either side and clear of the ledge. Players draw on top. */
export function drawFloatingControl(c: CanvasRenderingContext2D, at: Vec2, completed: boolean,
    ready: boolean, time: number, motion: boolean, zoom: number, label: string,
    caption: Vec2 = { x: 0, y: 34 }): void {
    const colour = completed ? COLOURS.complete : ready ? COLOURS.ready : COLOURS.dormant;
    const lit = completed || ready;
    const t = motion ? time : 0;
    const pulse = motion && ready && !completed ? .78 + Math.sin(t * 2.8) * .12 : 1;
    const hover = motion ? Math.sin(t * 1.8) * 1.2 : 0;
    c.save(); c.translate(at.x, at.y - 38 + hover);

    // Short, articulated signal filaments: a quiet sheath and travelling packet.
    // No particles, long trails, physical cables, floor mount or screen-sized glow.
    for (const side of [-1, 1]) for (const branch of [-1, 1]) {
        const phase = t * (completed ? .35 : .55) + (side + branch * .7) * .4;
        const wave = Math.sin(t * 2 + side + branch) * (lit ? 2 : .6);
        c.beginPath(); c.moveTo(side * 25, branch * 10);
        c.bezierCurveTo(side * 36, branch * 10, side * 32, branch * (18 + wave), side * 43, branch * (18 + wave));
        c.bezierCurveTo(side * 52, branch * (18 + wave), side * 51, branch * (12 + wave), side * 62, branch * (17 + wave));
        c.strokeStyle = colour; c.lineWidth = 4;
        c.globalAlpha = lit ? .09 * pulse : .025; c.stroke();
        c.lineWidth = 1.1; c.globalAlpha = lit ? .58 * pulse : .24; c.stroke();
        if (lit) {
            c.setLineDash([4, 72]); c.lineDashOffset = -((phase % 1 + 1) % 1) * 76;
            c.strokeStyle = completed ? '#ceffdf' : '#c6fff5'; c.lineWidth = 1.6;
            c.globalAlpha = .8 * pulse; c.stroke(); c.setLineDash([]);
        }
        c.globalAlpha = lit ? .65 : .3;
        dot(c, side * 62, branch * (17 + wave), 1.2, colour);
    }
    c.globalAlpha = 1;
    if (lit) {
        const halo = c.createRadialGradient(0, -4, 7, 0, -4, 38);
        halo.addColorStop(0, colour + '28'); halo.addColorStop(1, colour + '00');
        c.fillStyle = halo; c.globalAlpha = pulse; c.fillRect(-38, -42, 76, 76); c.globalAlpha = 1;
    }

    // Chamfered capsule with a shallow lower lip, not a grounded terminal mast.
    panel(c, -26, -24, 52, 48, COLOURS.dark, '#354c59', 9);
    panel(c, -28, -24, 56, 44, COLOURS.metal, lit ? colour + 'b0' : '#637d87', 8);
    panel(c, -22, -20, 44, 35, '#0e202b', '#3c5663', 4);
    for (const side of [-1, 1]) {
        polygon(c, [[side * 23, -14], [side * 28, -10], [side * 28, 6], [side * 23, 10]], '#304956', '#5c7883');
        line(c, side * 26, -8, side * 26, 3, colour, 2);
        dot(c, side * 19, -19, 1, '#9bafb7');
        line(c, side * 19, 17, side * 10, 17, colour + (lit ? 'cc' : '60'), 1.5);
    }

    // Small recessed display: low-energy telemetry becomes a persistent check.
    panel(c, -17, -19, 34, 14, completed ? '#143e2c' : ready ? '#123c3e' : '#12262f', lit ? colour : '#3c5964', 2);
    c.globalAlpha = lit ? pulse : .6;
    if (completed) {
        line(c, -11, -11, -7, -7, '#caffdc', 2.3); line(c, -7, -7, 0, -15, '#caffdc', 2.3);
        line(c, 5, -13, 12, -13, colour, 1.5); line(c, 5, -9, 10, -9, colour, 1.5);
    } else {
        line(c, -12, -9, -8, -9, colour, 1.5); line(c, -8, -9, -5, -14, colour, 1.5);
        line(c, -5, -14, -1, -8, colour, 1.5); line(c, -1, -8, 3, -12, colour, 1.5);
        line(c, 3, -12, 7, -12, colour, 1.5); dot(c, 12, -11, 1.5, colour);
    }
    c.globalAlpha = 1;

    // A raised press face seats three units into its recess after commitment.
    panel(c, -16, -4, 32, 12, '#07141d', '#37515f', 2);
    const faceY = completed ? -1 : -4;
    panel(c, -13, faceY, 26, completed ? 6 : 9, completed ? '#216444' : '#294752', lit ? colour : '#8299a1', 2);
    if (completed) {
        line(c, -7, 2, 7, 2, '#baffd0', 2);
        // Closed catches make the latched state readable without colour alone.
        for (const side of [-1, 1]) line(c, side * 17, 0, side * 12, 0, colour, 2);
    } else if (ready) text(c, 'E', 0, 4, 9, '#d5fff7');
    else for (const x of [-5, 0, 5]) line(c, x, -1, x, 2, '#8299a1');
    c.restore();

    // World caption stays fixed while the housing hovers. A bounded type scale
    // keeps small desktop views readable without enlarging the actual object.
    const typeScale = Math.min(1.45, Math.max(1, .9 / zoom));
    c.save(); c.translate(at.x + caption.x, at.y + caption.y); c.scale(typeScale, typeScale);
    text(c, label, 0, 0, 12, lit ? colour : '#99acb4');
    text(c, completed ? 'LATCHED' : ready ? 'E · CONFIRM' : 'UNCONFIRMED', 0, 15, 10, colour);
    c.restore();
}
