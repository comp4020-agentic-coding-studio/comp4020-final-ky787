import { CUBE_SIZE } from './tuning.ts';
import { heroMaterials } from './hero-render.ts';
import { receiverPose, type PayloadReceiver, type ReceiverPresentation } from './receiver-presentation.ts';

const { palette: M, panel, line, text, dot } = heroMaterials;
const AMBER = '#f9ba68', CYAN = '#8cece5';
const colour = (active: boolean) => active ? CYAN : AMBER;

/** Compact debugger interface. The 90-unit contact strip retains the sensor's
 * width; a cube-sized bay and short open guides distinguish it from a plate. */
export function drawReceiverRear(c: CanvasRenderingContext2D, receiver: PayloadReceiver, age: number, time: number): void {
    const { at, active } = receiver, ink = colour(active), pose = receiverPose(active, age);
    c.save(); c.translate(at.x, at.y);
    panel(c, -47, -2, 94, 21, M.dark, M.edge, 4);
    line(c, -45, -1, 45, -1, ink + '99');
    line(c, -40, 18, 40, 18, M.rim);
    for (const side of [-1, 1]) {
        c.save(); c.scale(side, 1);
        panel(c, 26, -16, 8, 18, M.inset, M.edge, 2);
        line(c, 27, -14, 27, -4, ink, 2);
        line(c, 27, -4, 23, -4, ink, 2);
        c.beginPath(); c.moveTo(43, 5); c.lineTo(37, 5); c.lineTo(37, -5); c.lineTo(30, -12); c.lineTo(30, -17);
        c.strokeStyle = ink + (active ? '66' : '30'); c.lineWidth = 1; c.stroke();
        dot(c, 43, 5, 1.2, ink);
        c.restore();
    }
    // Faint registration marks show the real cube dimensions, without a scanner.
    c.globalAlpha = active ? .16 : .28 + .05 * Math.sin(time * 1.7);
    for (const side of [-1, 1]) {
        line(c, side * 22, -CUBE_SIZE, side * 14, -CUBE_SIZE, ink);
        line(c, side * 22, -CUBE_SIZE, side * 22, -CUBE_SIZE + 7, ink);
    }
    c.globalAlpha = 1;
    if (pose.transfer !== null) {
        c.globalAlpha = Math.sin(pose.transfer * Math.PI);
        line(c, -45 * pose.transfer, 18, 45 * pose.transfer, 18, '#d9fff6', 2);
    }
    c.restore();
}

/** Front traces connect to canonical payload terminals, avoiding its letter.
 * Removal disconnects immediately. No beam sweeps across the cargo. */
export function drawReceiverFront(c: CanvasRenderingContext2D, receiver: PayloadReceiver, age: number, time: number): void {
    const { at, active } = receiver, ink = colour(active), pose = receiverPose(active, age);
    c.save(); c.translate(at.x, at.y);
    for (const side of [-1, 1]) {
        c.save(); c.scale(side, 1);
        line(c, 24, -8, 24, 0, ink, 1.5 + pose.engagement * .5);
        line(c, 24, 0, 16, 0, ink, 1.5 + pose.engagement * .5);
        if (active && receiver.dock) {
            const intensity = .55 + .16 * Math.sin(time * 2.2);
            c.globalAlpha = intensity;
            const routes = [[[43, 5], [37, 5], [37, -5], [30, -12], [22, -12]], [[18, 3], [9, 3], [9, -1]]];
            for (const points of routes) {
                c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
                c.strokeStyle = CYAN; c.lineWidth = 1.2; c.stroke();
                c.globalAlpha = .5 * pose.connection;
                c.setLineDash([2, 14]); c.lineDashOffset = -time * 12;
                c.strokeStyle = '#e2fff5'; c.lineWidth = 2; c.stroke(); c.setLineDash([]); c.globalAlpha = intensity;
            }
            c.globalAlpha = 1; dot(c, 22, -12, 1.5, CYAN);
        } else if (pose.release) {
            line(c, 37, 5, 37 + 6 * pose.release, 5, CYAN + '88');
        } else if (!active) {
            c.globalAlpha = .2 + .12 * Math.sin(time * 1.7 + side);
            line(c, 36, 5, 43, 5, AMBER); c.globalAlpha = 1;
        }
        c.restore();
    }
    panel(c, -41, 6, 82, 10, '#091820', '#2d4957', 1);
    text(c, active ? 'PAYLOAD DETECTED' : 'AWAITING PAYLOAD', 0, 13.5, 6.8, ink);
    dot(c, -44, 11, 1.3, ink); dot(c, 44, 11, 1.3, ink);
    c.restore();
}

/** Screen-readable status at overview scale, with separate lanes for nearby docks.
 * These labels neither move the camera nor change the machine's physical footprint. */
export function drawReceiverLabels(c: CanvasRenderingContext2D, receivers: readonly PayloadReceiver[], zoom: number): void {
    const occupied: { x: number; y: number; w: number; h: number }[] = [];
    for (const r of receivers) {
        const ink = colour(r.active);
        c.save();
        if (zoom >= .72) {
            text(c, 'PAYLOAD RECEIVER', r.at.x, r.at.y + 32, 9, M.ink);
            text(c, r.label, r.at.x, r.at.y + 44, 8, ink);
        } else {
            // Work in CSS pixels while retaining the world anchor and DPR transform.
            c.translate(r.at.x, r.at.y + 20); c.scale(1 / zoom, 1 / zoom);
            const m = c.getTransform(), left = -m.e / m.a, right = (c.canvas.width - m.e) / m.a;
            const top = -m.f / m.d, bottom = (c.canvas.height - m.f) / m.d;
            if (left > 0 || right < 0 || top > 0 || bottom < 0) { c.restore(); continue; }
            const width = Math.max(104, Math.min(160, r.label.length * 4.9 + 18));
            const x = Math.max(left + width / 2 + 3, Math.min(right - width / 2 - 3, 0));
            const sx = m.e / m.a + x, sy = m.f / m.d;
            let y = 6;
            while (occupied.some(b => Math.abs(sx - b.x) < (width + b.w) / 2 + 4 && Math.abs(sy + y - b.y) < 30)) y += 32;
            occupied.push({ x: sx, y: sy + y, w: width, h: 28 });
            line(c, 0, 0, x, y, M.edge);
            panel(c, x - width / 2, y, width, 28, M.dark, M.edge, 3);
            dot(c, x - width / 2 + 7, y + 8, 2, ink);
            text(c, r.label, x + 3, y + 11, 8, M.ink);
            text(c, r.active ? 'PAYLOAD DETECTED' : 'AWAITING PAYLOAD', x, y + 22, 8, ink);
        }
        c.restore();
    }
}

export function drawReceivers(c: CanvasRenderingContext2D, receivers: readonly PayloadReceiver[], states: ReceiverPresentation,
    time: number, layer: 'rear' | 'front'): void {
    for (const r of receivers) (layer === 'rear' ? drawReceiverRear : drawReceiverFront)(c, r, states.states.get(r.id)?.age ?? Infinity, time);
}
