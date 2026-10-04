/** Character graphics reused from Crit 5's renderer.drawPlayer (read-only reference).
 * Keep the original silhouette, visor, scarf, lean, halo and two-frame stride.
 */
import { clamp } from '../engine/geometry.ts';
import { playerBox, type PlayerState } from '../engine/physics.ts';
function hexToRgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
export function drawNinja(ctx: CanvasRenderingContext2D, p: PlayerState, time: number, accent: string): void {
    const box = playerBox(p);
    const lean = clamp(p.vx / 700, -0.45, 0.45);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(lean * 0.35);

    // Shadow/afterglow when moving fast.
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 320) {
      ctx.globalAlpha = clamp((speed - 320) / 900, 0, 0.4);
      ctx.fillStyle = hexToRgba(accent, 0.5);
      ctx.fillRect(-box.w / 2 - p.vx * 0.012, -box.h / 2 - p.vy * 0.012, box.w, box.h);
      ctx.globalAlpha = 1;
    }

    // A soft halo: the player is 22x34 units in a 1900-unit-wide view, and
    // has to stay findable against a field of code blocks.
    const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
    halo.addColorStop(0, hexToRgba(accent, 0.30));
    halo.addColorStop(1, hexToRgba(accent, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(-46, -46, 92, 92);

    // Body: a flat silhouette, readable at any zoom.
    ctx.fillStyle = "#0d1420";
    ctx.fillRect(-box.w / 2, -box.h / 2, box.w, box.h);
    ctx.strokeStyle = hexToRgba(accent, 0.9);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-box.w / 2, -box.h / 2, box.w, box.h);

    // Visor.
    ctx.fillStyle = hexToRgba(accent, 0.95);
    ctx.fillRect(p.facing > 0 ? 0 : -box.w / 2 + 2, -box.h / 2 + 6, box.w / 2 - 2, 4);

    // Scarf: trails opposite to travel, sells momentum cheaply.
    ctx.strokeStyle = hexToRgba(accent, 0.55);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -box.h / 2 + 10);
    const tail = clamp(-p.vx * 0.035, -26, 26);
    const tailY = clamp(-p.vy * 0.02, -12, 14);
    ctx.quadraticCurveTo(tail * 0.5, -box.h / 2 + 14 + tailY * 0.4, tail, -box.h / 2 + 12 + tailY);
    ctx.stroke();

    // Legs: a two-frame run cycle while grounded.
    ctx.strokeStyle = "#0d1420";
    ctx.lineWidth = 3.5;
    const stride = p.grounded ? Math.sin(time * 18) * clamp(Math.abs(p.vx) / 320, 0, 1) * 7 : 4;
    ctx.beginPath();
    ctx.moveTo(-3, box.h / 2 - 1);
    ctx.lineTo(-3 - stride, box.h / 2 + 5);
    ctx.moveTo(3, box.h / 2 - 1);
    ctx.lineTo(3 + stride, box.h / 2 + 5);
    ctx.stroke();

    ctx.restore();
  }
