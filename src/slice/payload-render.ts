import type { Vec2 } from '../engine/geometry.ts';
import { heroMaterials } from './hero-render.ts';
import { CUBE_SIZE } from './tuning.ts';

const { palette: M, panel, polygon, line, text } = heroMaterials;
/** One 44-unit containment frame in every room, carried or loose. No decoration
 * changes its contact silhouette. Receiver connections draw in a separate pass. */
export function drawPayload(c: CanvasRenderingContext2D, at: Vec2, mark: string | undefined, time: number, docked: boolean): void {
    const half = CUBE_SIZE / 2, ink = docked ? M.cyan : '#f9ba68', pulse = .5 + .5 * Math.sin(time * 2.2);
    c.save(); c.translate(at.x, at.y);
    panel(c, -half, -half, CUBE_SIZE, CUBE_SIZE, '#0c1d28', '#859aa5', 3);
    panel(c, -17, -17, 34, 34, '#102d37', ink + '80', 2);
    const glow = c.createRadialGradient(0, 0, 2, 0, 0, 20);
    glow.addColorStop(0, M.cyan + (docked ? '92' : '70')); glow.addColorStop(.55, M.cyan + '24'); glow.addColorStop(1, M.cyan + '00');
    c.globalAlpha = .7 + .2 * pulse; c.fillStyle = glow; c.fillRect(-20, -20, 40, 40); c.globalAlpha = 1;
    // Containment channels terminate at the luminous core, leaving the mark clear.
    for (const side of [-1, 1]) for (const y of [-1, 1]) {
        line(c, side * 17, y * 11, side * 11, y * 11, M.cyan + '75');
        line(c, side * 11, y * 11, side * 7, y * 7, M.cyan + '75');
    }
    polygon(c, [[0, -12], [12, 0], [0, 12], [-12, 0]], '#8cece518', M.cyan + '99');
    if (mark) {
        panel(c, -8, -9, 16, 19, '#0c202bd9', undefined, 2);
        text(c, mark, 0, 6, 15, '#dcfff5');
    } else {
        polygon(c, [[0, -6], [6, 0], [0, 6], [-6, 0]], '#c7fff0');
        line(c, -3, 0, 3, 0, M.dark);
    }
    // Four bright L corners retain an unmistakable box at overview scale.
    for (const x of [-1, 1]) for (const y of [-1, 1]) {
        c.beginPath(); c.moveTo(x * 11, y * 21); c.lineTo(x * 21, y * 21); c.lineTo(x * 21, y * 11);
        c.strokeStyle = ink; c.lineWidth = 2; c.stroke();
        line(c, x * 17, y * 18, x * 17, y * 15, '#e4edf0');
    }
    // Four small terminals match the receiver's two lower and two side traces.
    for (const x of [-1, 1]) { line(c, x * 20, 5, x * 20, 10, ink, 2); line(c, x * 12, 21, x * 7, 21, ink, 2); }
    c.restore();
}
