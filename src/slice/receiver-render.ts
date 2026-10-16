import { CUBE_SIZE } from './tuning.ts';
import { heroMaterials } from './hero-render.ts';
import { energyEase, energyPhase, PAYLOAD_COLOURS } from './payload-energy.ts';
import { receiverPose, type PayloadReceiver, type ReceiverPresentation } from './receiver-presentation.ts';

const { palette: M, panel, line, text, dot } = heroMaterials;
const AMBER = PAYLOAD_COLOURS.waiting, GREEN = PAYLOAD_COLOURS.connected.primary;
const colour = (active: boolean) => active ? GREEN : AMBER;
type Point = readonly [number, number];
const traces = [
    [[43, 2], [37, 2], [37, -6], [31, -12], [22, -12]],
    [[37, 2], [30, 2], [27, -1], [27, -7], [22, -7]],
    [[18, 3], [9, 3], [9, -1]],
    [[43, 11], [43, 18], [18, 18], [15, 16]],
].map(points => { const p = points as unknown as Point[]; return { points: p,
    lengths: p.slice(1).map(([x, y], i) => Math.hypot(x - p[i][0], y - p[i][1])) }; });
function tracePoint(trace: typeof traces[number], progress: number): Point {
    let remaining = Math.max(0, Math.min(1, progress)) * trace.lengths.reduce((a, b) => a + b, 0);
    for (let i = 0; i < trace.lengths.length; i++) {
        const length = trace.lengths[i], [x, y] = trace.points[i], [xx, yy] = trace.points[i + 1];
        if (remaining <= length) return [x + (xx - x) * remaining / length, y + (yy - y) * remaining / length];
        remaining -= length;
    }
    return trace.points.at(-1)!;
}
function drawTrace(c: CanvasRenderingContext2D, trace: typeof traces[number], ink: string, progress = 1) {
    let remaining = Math.max(0, Math.min(1, progress)) * trace.lengths.reduce((a, b) => a + b, 0);
    c.beginPath(); c.moveTo(...trace.points[0]);
    for (let i = 0; i < trace.lengths.length && remaining > 0; i++) {
        const [x, y] = trace.points[i], [xx, yy] = trace.points[i + 1], t = Math.min(1, remaining / trace.lengths[i]);
        c.lineTo(x + (xx - x) * t, y + (yy - y) * t); remaining -= trace.lengths[i];
    }
    c.strokeStyle = ink; c.lineWidth = 1; c.stroke();
}

/** The existing 94-unit chassis and short guides; energy adds no geometry. */
export function drawReceiverRear(c: CanvasRenderingContext2D, receiver: PayloadReceiver, age: number, time: number, motion = true): void {
    const { at, active } = receiver, ink = colour(active), pose = receiverPose(active, motion ? age : Infinity);
    c.save(); c.translate(at.x, at.y);
    panel(c, -47, -2, 94, 21, M.dark, M.edge, 4);
    line(c, -45, -1, 45, -1, ink + '99');
    line(c, -40, 18, 40, 18, active ? '#146b48' : M.edge);
    for (const side of [-1, 1]) {
        c.save(); c.scale(side, 1);
        panel(c, 26, -16, 8, 18, M.inset, M.edge, 2);
        line(c, 27, -14, 27, -4, ink, 2);
        line(c, 27, -4, 23, -4, ink, 2);
        for (const trace of traces) drawTrace(c, trace, active ? '#146b48' : '#34414e');
        c.restore();
    }
    c.globalAlpha = active ? .16 : .28 + (motion ? .05 * Math.sin(time * 1.7 + energyPhase(receiver.id) * 6) : 0);
    for (const side of [-1, 1]) {
        line(c, side * 22, -CUBE_SIZE, side * 14, -CUBE_SIZE, ink);
        line(c, side * 22, -CUBE_SIZE, side * 22, -CUBE_SIZE + 7, ink);
    }
    c.globalAlpha = 1;
    if (pose.transfer !== null && motion) {
        c.globalAlpha = .65 * Math.sin(pose.transfer * Math.PI);
        line(c, -45 * pose.transfer, 18, 45 * pose.transfer, 18, '#bcffb2', 2);
    }
    c.restore();
}

/** Branching PCB paths light in sequence, feeding inward then pulsing outward.
 * Only established docks connect to cube terminals. Inactive means no green. */
export function drawReceiverFront(c: CanvasRenderingContext2D, receiver: PayloadReceiver, age: number, time: number, motion = true): void {
    const { at, active } = receiver, ink = colour(active), pose = receiverPose(active, motion ? age : Infinity);
    const seed = energyPhase(receiver.id), clock = motion ? time : 0;
    c.save(); c.translate(at.x, at.y);
    for (const side of [-1, 1]) {
        c.save(); c.scale(side, 1);
        line(c, 24, -8, 24, 0, ink, 1.5 + pose.engagement * .5);
        line(c, 24, 0, 16, 0, ink, 1.5 + pose.engagement * .5);
        if (active) {
            traces.forEach((trace, i) => {
                const progress = !motion ? 1 : energyEase((age - i * .07) / .25);
                // When centring is obstructed, board nodes report accepted power;
                // paths to the absent cube remain dark until the physical dock exists.
                if (!receiver.dock && i < 3) return;
                c.globalAlpha = .68;
                drawTrace(c, trace, GREEN, progress);
                const flow = (clock * (.32 - i * .035) + seed + i * .19 + (side > 0 ? .28 : 0)) % 1;
                if (motion && progress >= 1) {
                    const incoming = age < .35 ? age / .35 : age < .74 ? 1 - (age - .35) / .39 : flow;
                    const [x, y] = tracePoint(trace, incoming);
                    c.globalAlpha = .95; dot(c, x, y, 1.2, '#bcffb2');
                }
                c.globalAlpha = progress * (motion ? .7 + .17 * Math.sin(clock * 1.7 + i * 1.9 + seed * 6) : .9);
                dot(c, ...trace.points[0], 1.4, GREEN);
            });
            if (receiver.dock) { c.globalAlpha = .9; dot(c, 22, -12, 1.4, '#bcffb2'); }
        } else {
            c.globalAlpha = motion ? .25 + .08 * Math.sin(clock * 1.7 + seed * 6 + side) : .3;
            line(c, 36, 2, 43, 2, AMBER); dot(c, 43, 2, 1.1, AMBER);
        }
        c.globalAlpha = 1; c.restore();
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
    time: number, layer: 'rear' | 'front', motion = true): void {
    for (const r of receivers) (layer === 'rear' ? drawReceiverRear : drawReceiverFront)(c, r, states.states.get(r.id)?.age ?? Infinity, time, motion);
}
