import type { Vec2 } from '../engine/geometry.ts';
import { heroMaterials } from './hero-render.ts';
import { payloadEnergy } from './payload-energy.ts';
import { CUBE_SIZE } from './tuning.ts';

const { palette: M, panel, polygon, line, text, dot } = heroMaterials;
/** The outline remains the actual 44-unit body. Energy moves inside it; only a
 * faint, bounded halo extends outside. No shadowBlur, particles or displaced art. */
export function drawPayload(c: CanvasRenderingContext2D, at: Vec2, mark: string | undefined, time: number,
    id: string, connectionAge: number | null, motion = true): void {
    const half = CUBE_SIZE / 2, e = payloadEnergy(id, time, connectionAge, motion);
    c.save(); c.translate(at.x, at.y);
    const halo = c.createRadialGradient(0, 0, 12, 0, 0, 32);
    halo.addColorStop(0, e.primary + '48'); halo.addColorStop(.55, e.primary + '26'); halo.addColorStop(1, e.primary + '00');
    c.globalAlpha = Math.min(1, .65 + e.breath * .25 + e.surge * .2);
    c.fillStyle = halo; c.fillRect(-32, -32, 64, 64); c.globalAlpha = 1;
    panel(c, -half, -half, CUBE_SIZE, CUBE_SIZE, '#101323', e.primary, 3);
    panel(c, -18, -18, 36, 36, e.deep + '40', e.primary + 'aa', 2);
    const glow = c.createRadialGradient(0, 0, 1, 0, 0, 22);
    glow.addColorStop(0, e.core + 'ee'); glow.addColorStop(.38, e.primary + 'c0'); glow.addColorStop(1, e.deep + '10');
    c.globalAlpha = Math.min(1, e.breath + e.surge * .25); c.fillStyle = glow; c.fillRect(-20, -20, 40, 40); c.globalAlpha = 1;
    // Out-of-phase secondary contour and moving containment packets.
    c.globalAlpha = e.contour;
    c.strokeStyle = e.bright; c.lineWidth = .8; c.strokeRect(-15, -15, 30, 30);
    c.globalAlpha = 1;
    c.strokeStyle = e.core; c.lineWidth = 1.6;
    c.setLineDash([11, 125]); c.lineDashOffset = -e.perimeter * 136;
    c.strokeRect(-17, -17, 34, 34); c.setLineDash([]);
    for (const x of [-1, 1]) for (const y of [-1, 1]) {
        // Tiny smooth internal discharges, never a full-face blink.
        c.beginPath(); c.moveTo(x * 16, y * 11); c.lineTo(x * (11 + e.electric), y * 11); c.lineTo(x * 7, y * 7);
        c.strokeStyle = e.bright + 'b0'; c.lineWidth = .9; c.stroke();
    }
    polygon(c, [[0, -13], [13, 0], [0, 13], [-13, 0]], e.primary + '26', e.bright);
    for (const x of [-1, 1]) dot(c, x * 11, 0, 1.5, e.core);
    if (mark) {
        panel(c, -8, -9, 16, 19, '#0c1420ed', e.deep, 2);
        text(c, mark, 0, 6, 15, '#f4fff5');
    } else {
        polygon(c, [[0, -6], [6, 0], [0, 6], [-6, 0]], e.core, e.bright);
        line(c, -3, 0, 3, 0, M.dark);
    }
    // Fixed bright L corners keep a clear square at overview scale.
    for (const x of [-1, 1]) for (const y of [-1, 1]) {
        c.beginPath(); c.moveTo(x * 11, y * 21); c.lineTo(x * 21, y * 21); c.lineTo(x * 21, y * 11);
        c.strokeStyle = e.primary; c.lineWidth = 2.2; c.stroke();
        line(c, x * 20, y * 20, x * 15, y * 20, e.bright, 1.5);
    }
    // Connected terminals have a brighter, thicker shape as well as a new colour.
    for (const x of [-1, 1]) {
        line(c, x * 20, 5, x * 20, 10, e.primary, e.connected ? 3 : 1.5);
        line(c, x * 12, 21, x * 7, 21, e.bright, e.connected ? 3 : 1.5);
    }
    c.restore();
}
