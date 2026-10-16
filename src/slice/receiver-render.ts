import { CUBE_SIZE } from './tuning.ts';
import { heroMaterials } from './hero-render.ts';
import { receiverPose, type PayloadReceiver, type ReceiverPresentation } from './receiver-presentation.ts';

const { palette: M, panel, polygon, line, text, dot, bolts } = heroMaterials;
const AMBER = '#f9ba68', CYAN = '#8cece5';
const colour = (active: boolean) => active ? CYAN : AMBER;

/** Open cargo dock, not a clamp. The 90-unit tread matches the existing sensor.
 * Base metal is inset into the floor; rails are visual guides, never colliders. */
export function drawReceiverRear(c: CanvasRenderingContext2D, receiver: PayloadReceiver, age: number, time: number): void {
    const { at, active } = receiver, ink = colour(active), pose = receiverPose(active, age);
    c.save(); c.translate(at.x, at.y);
    // Footing, inset shock absorbers and the broad bevelled base.
    panel(c, -56, 6, 112, 22, M.dark, M.edge, 5);
    for (const x of [-45, 33]) { panel(c, x, 17, 12, 12, M.inset, M.edge, 2); line(c, x + 2, 25, x + 10, 25, M.rim); }
    const metal = c.createLinearGradient(0, -5, 0, 22);
    metal.addColorStop(0, '#4d616c'); metal.addColorStop(.22, '#344954'); metal.addColorStop(1, '#1e2d37');
    polygon(c, [[-49, -5], [49, -5], [55, 1], [55, 20], [49, 25], [-49, 25], [-55, 20], [-55, 1]], M.metal, M.rim);
    c.fillStyle = metal; c.fill();
    line(c, -47, -3, 47, -3, '#a2b3b9');
    // The landing tread stays exactly centred on the authored sensor.
    panel(c, -45, -4, 90, 7, M.dark, M.edge, 2);
    for (let x = -40; x <= 40; x += 10) line(c, x, -2, x + 4, 0, '#50636b');
    // A cube-sized registration mark behind the cargo, rather than a solid box.
    const half = CUBE_SIZE / 2;
    c.globalAlpha = active ? .2 : .36;
    for (const sx of [-1, 1]) for (const y of [-CUBE_SIZE, -7]) {
        line(c, sx * half, y, sx * (half - 7), y, ink);
        line(c, sx * half, y, sx * half, y + (y < -10 ? 7 : -7), ink);
    }
    c.globalAlpha = 1;
    // Open-topped guide pylons flare outward, leaving the cargo face and lid visible.
    for (const side of [-1, 1]) {
        c.save(); c.scale(side, 1);
        polygon(c, [[38, -5], [78, -17], [80, -43], [86, -55], [94, -55], [91, -15], [55, -5]], M.inset, M.rim);
        polygon(c, [[49, -7], [85, -19], [86, -38], [89, -49], [92, -49], [88, -17]], '#41535e');
        line(c, 54, -9, 81, -19, M.rim);
        line(c, 81, -19, 82, -34, M.rim);
        panel(c, 80, -47 + pose.engagement * 2, 11, 13, M.metal, M.edge, 2);
        c.fillStyle = ink; c.fillRect(81, -43 + pose.engagement * 2, 3, 5);
        bolts(c, 89, -51); bolts(c, 50, -10);
        // Cables and inset channels stay on the machine's outer silhouette.
        line(c, 94, -38, 93, -17, M.dark, 3);
        line(c, 93, -35, 92, -20, ink + (active ? 'aa' : '44'));
        for (let y = -29; y <= -17; y += 5) line(c, 86, y, 89, y, M.dark);
        c.restore();
    }
    // Empty-dock scanner is quiet and confined to the receiving bay.
    if (!active) {
        const sweep = (time * .28) % 1, y = -9 - sweep * 32;
        c.globalAlpha = .09 + .08 * Math.sin(sweep * Math.PI);
        line(c, -76, y, 76, y, AMBER);
        c.globalAlpha = 1;
    }
    c.restore();
}

/** Draw after cargo, before people/ropes. Only the shallow front lips overlap the cube. */
export function drawReceiverFront(c: CanvasRenderingContext2D, receiver: PayloadReceiver, age: number, time: number): void {
    const { at, active } = receiver, ink = colour(active), pose = receiverPose(active, age);
    c.save(); c.translate(at.x, at.y);
    // Small translating guide shoes signal engagement without enclosing or locking cargo.
    for (const side of [-1, 1]) {
        c.save(); c.scale(side, 1);
        panel(c, 36 - pose.engagement * 1.5, -9, 16, 13, M.metal, M.rim, 3);
        line(c, 39, -6, 49, -6, ink, 2);
        line(c, 42, -3, 47, -3, M.dark);
        c.restore();
    }
    // Inset screen and a separate immediate accepted-state pilot light.
    panel(c, -46, 6, 92, 16, M.dark, M.edge, 2);
    text(c, active ? 'PAYLOAD DETECTED' : 'AWAITING PAYLOAD', 0, 17, 7.5, ink);
    dot(c, -50, 13, 2, ink); bolts(c, 50, 13);
    // Power trunk: an amber standby circuit, cyan steady transfer, release retracts it.
    for (const side of [-1, 1]) {
        c.save(); c.scale(side, 1);
        line(c, 34, 3, 49, 3, M.dark, 3);
        line(c, 34, 3, 49, 3, ink + (active ? 'bb' : '55'));
        line(c, 49, 3, 49, -4, ink + (active ? 'bb' : '55'));
        if (pose.release) line(c, 34, 3, 34 + pose.release * 15, 3, CYAN, 2);
        c.restore();
    }
    if (active) {
        c.globalAlpha = .4 + .12 * Math.sin(time * 2.8);
        line(c, -29, 3, 29, 3, CYAN, 2); c.globalAlpha = 1;
    }
    // A thin scan crosses the visible cube; translucent trail preserves its mark.
    if (pose.scan !== null) {
        const y = -CUBE_SIZE + pose.scan * (CUBE_SIZE - 5);
        const glow = c.createLinearGradient(0, y - 8, 0, y + 2);
        glow.addColorStop(0, CYAN + '00'); glow.addColorStop(1, CYAN + '38');
        c.fillStyle = glow; c.fillRect(-80, y - 8, 160, 10);
        line(c, -82, y, 82, y, '#c7fff7', 1.5);
        dot(c, -83, y, 1.8, CYAN); dot(c, 83, y, 1.8, CYAN);
    }
    if (pose.transfer !== null) {
        const t = pose.transfer, x = -45 + t * 90;
        c.globalAlpha = Math.sin(t * Math.PI);
        line(c, x - 8, 3, x + 8, 3, '#e4fff9', 3);
        line(c, -28, 24, -28 + 56 * t, 24, CYAN, 2); c.globalAlpha = 1;
    }
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
            text(c, 'PAYLOAD RECEIVER', r.at.x, r.at.y + 41, 9, M.ink);
            text(c, r.label, r.at.x, r.at.y + 54, 8, ink);
        } else {
            // Work in CSS pixels while retaining the world anchor and DPR transform.
            c.translate(r.at.x, r.at.y + 29); c.scale(1 / zoom, 1 / zoom);
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
