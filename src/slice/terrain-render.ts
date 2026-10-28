import type { Box } from '../engine/geometry.ts';

/** Scenery only: all ink stays inside the authored collision/reset rectangle.
 * Detail cells and signal trains use fixed world coordinates; the camera only
 * culls them. Time-dependent ink is drawn after the still architecture, so a
 * paused or reduced-motion frame is exactly a moving frame without its signals. */
function visiblePart(b: Box, view: Box): Box | null {
    const x = Math.max(b.x, view.x), y = Math.max(b.y, view.y);
    const w = Math.min(b.x + b.w, view.x + view.w) - x;
    const h = Math.min(b.y + b.h, view.y + view.h) - y;
    return w > 0 && h > 0 ? { x, y, w, h } : null;
}
function clip(c: CanvasRenderingContext2D, b: Box) {
    c.beginPath(); c.rect(b.x, b.y, b.w, b.h); c.clip();
}
function line(c: CanvasRenderingContext2D, x: number, y: number, x2: number, y2: number, colour: string) {
    c.strokeStyle = colour; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke();
}
function cellPhase(x: number, y: number) {
    // Stable integer mixing, including negative world coordinates; never random per frame.
    return ((Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0) / 0xffffffff;
}

/** A luminous segment on an axis-aligned rail inside its box. It runs from
 * `tail` to `head` along `axis`, the head leading at `velocity` world units per
 * second. The rail spans `across`..`across + thick`; signed `glow` points inward. */
export type RailSignal = { axis: 'x' | 'y'; across: number; thick: number; glow: number; tail: number; head: number; bright: number; velocity: number };
type Train = { pitch: number; speed: number; bright: number; trail: number };
type Palette = { head: string; body: string; fade: string; glow: string; clear: string };

// Three interleaved trains of fine segments keep long floors visibly flowing.
const EDGE_TRAINS: readonly Train[] = [{ pitch: 132, speed: 146, bright: 22, trail: 40 },
    { pitch: 176, speed: 118, bright: 16, trail: 30 }, { pitch: 236, speed: 160, bright: 12, trail: 24 }];
const LEDGE: Train = { pitch: 0, speed: 124, bright: 18, trail: 34 };
// Sides carry one sparse train; undersides two co-prime trains, so streak spacing
// never repeats evenly. Both stay well under a third of the top's density.
const PERIMETER: Train = { pitch: 360, speed: 104, bright: 16, trail: 32 };
const UNDERSIDE: readonly Train[] = [{ pitch: 520, speed: 102, bright: 16, trail: 32 }, { pitch: 740, speed: 112, bright: 12, trail: 26 }];
const BOUNDARY: Train = { pitch: 232, speed: 228, bright: 48, trail: 92 };
const CONTACT: Palette = { head: '#ffffff', body: '#c9ceff', fade: '#c9ceff00', glow: '#8a94ff', clear: '#8a94ff00' };
const LETHAL: Palette = { head: '#ffe0e8', body: '#ff5a8c', fade: '#ff5a8c00', glow: '#ff3d7a', clear: '#ff3d7a00' };
const BACKFLOW: Palette = { head: '#ff9bb6', body: '#e0487a', fade: '#e0487a00', glow: '#c9306a', clear: '#c9306a00' };

/** Heads, repeating every `pitch` from `origin`, whose tail..head span meets
 * [lo, hi]. Placement depends only on world position, phase and clock. */
function heads(t: Train, origin: number, lo: number, hi: number, dir: number, phase: number, clock: number): number[] {
    const span = t.bright + t.trail, out: number[] = [];
    const shift = ((phase * t.pitch + dir * t.speed * clock) % t.pitch + t.pitch) % t.pitch;
    const first = dir > 0 ? lo : lo - span, last = dir > 0 ? hi + span : hi;
    for (let n = Math.ceil((first - origin - shift) / t.pitch); origin + shift + n * t.pitch <= last; n++) out.push(origin + shift + n * t.pitch);
    return out;
}
function rail(out: RailSignal[], t: Train, axis: 'x' | 'y', across: number, thick: number, glow: number,
    from: number, to: number, lo: number, hi: number, dir: number, phase: number, clock: number, origin = 0) {
    const a = Math.max(from, lo), z = Math.min(to, hi);
    if (z > a) for (const head of heads(t, origin, a, z, dir, phase, clock))
        out.push({ axis, across, thick, glow, head, tail: head - dir * (t.bright + t.trail), bright: t.bright, velocity: dir * t.speed });
}

/** Trailing fade, bright body and blue-white head, plus a soft inward glow. */
function drawRail(c: CanvasRenderingContext2D, s: RailSignal, p: Palette) {
    const along = s.axis === 'x', lo = Math.min(s.tail, s.head), span = Math.abs(s.head - s.tail);
    const band = (start: number, size: number) => along ? c.fillRect(lo, start, span, size) : c.fillRect(start, lo, size, span);
    const ramp = () => along ? c.createLinearGradient(s.tail, 0, s.head, 0) : c.createLinearGradient(0, s.tail, 0, s.head);
    const knee = 1 - s.bright / span, inner = s.glow >= 0 ? s.across + s.thick : s.across;
    const halo = ramp(); halo.addColorStop(0, p.clear); halo.addColorStop(1, p.glow);
    c.fillStyle = halo;
    // Nested bands fade the glow away from the rail, without a hard outer edge.
    for (const [part, alpha] of [[1, .18], [.6, .2], [.3, .26]]) {
        const size = Math.abs(s.glow) * part;
        c.globalAlpha = alpha; band(s.glow >= 0 ? inner : inner - size, size);
    }
    c.globalAlpha = 1;
    const core = ramp(); core.addColorStop(0, p.fade); core.addColorStop(knee, p.body); core.addColorStop(1, p.head);
    c.fillStyle = core; band(s.glow >= 0 ? s.across : s.across - 1.5, s.thick + 1.5);
}

/** A fine static signal: a hairline core with a short white head and fading tail
 * over a narrow inward glow. Brightness, not width, separates it from its track. */
function drawFine(c: CanvasRenderingContext2D, s: RailSignal) {
    const along = s.axis === 'x', lo = Math.min(s.tail, s.head), span = Math.abs(s.head - s.tail);
    const band = (start: number, size: number) => along ? c.fillRect(lo, start, span, size) : c.fillRect(start, lo, size, span);
    const ramp = () => along ? c.createLinearGradient(s.tail, 0, s.head, 0) : c.createLinearGradient(0, s.tail, 0, s.head);
    const knee = Math.max(0, 1 - s.bright / span), inner = s.glow >= 0 ? s.across + s.thick : s.across;
    const halo = ramp(); halo.addColorStop(0, CONTACT.clear); halo.addColorStop(1, CONTACT.glow);
    c.fillStyle = halo; c.globalAlpha = .4; band(s.glow >= 0 ? inner : inner + s.glow, Math.abs(s.glow));
    c.globalAlpha = 1;
    const core = ramp();
    core.addColorStop(0, CONTACT.fade); core.addColorStop(knee * .5, '#9aa3ff66'); core.addColorStop(knee, CONTACT.body); core.addColorStop(1, CONTACT.head);
    c.fillStyle = core; band(s.across, s.thick);
    // A 4-unit white tip, one rail wide, keeps each fine head crisp at gameplay zoom.
    const tip = Math.min(4, span), at = s.velocity >= 0 ? s.head - tip : s.head;
    c.fillStyle = CONTACT.head;
    if (along) c.fillRect(at, s.across, tip, s.thick); else c.fillRect(s.across, at, s.thick, tip);
}

/** Static contact geometry: crisp strip, inner glow and, for narrow walls, side rails. */
function contact(b: Box) {
    return { edge: Math.min(2.5, b.h / 3), glow: Math.min(12, b.h * .4), halo: Math.min(2.5, b.h * .2),
        wall: b.h >= b.w * 2 && b.w >= 10 && b.w <= 80, rail: Math.min(1.5, b.w / 8) };
}
/** Fine signal thickness and inner glow; never over a quarter of the box. */
const FINE = 1.25, FINE_GLOW = 2;

/** Moving signals on a static platform's contact edges. Long top surfaces carry
 * three interleaved world-anchored trains; short ledges one signal. Sides and the
 * underside carry a sparser train, flowing clockwise around the silhouette. */
export function staticSignals(b: Box, view: Box, clock: number): RailSignal[] {
    const out: RailSignal[] = [], v = visiblePart(b, view);
    if (!v) return out;
    const k = contact(b), right = b.x + b.w, foot = b.y + b.h;
    const thick = Math.min(FINE, b.h / 4, b.w / 4), glow = Math.min(FINE_GLOW, b.h / 4, b.w / 4);
    if (b.w >= 48 && v.y <= b.y + thick + k.halo) {
        if (b.w < 240) rail(out, { ...LEDGE, pitch: b.w + LEDGE.bright + LEDGE.trail + 40 }, 'x', b.y, thick, k.halo,
            b.x, right, v.x, v.x + v.w, 1, cellPhase(Math.floor(b.x), Math.floor(b.y)), clock, b.x);
        else EDGE_TRAINS.forEach((t, i) => rail(out, t, 'x', b.y, thick, k.halo,
            b.x, right, v.x, v.x + v.w, i === 1 ? -1 : 1, cellPhase(i * 7 + 1, Math.floor(b.y)), clock));
    }
    // Down the right face, leftward along the underside, up the left face.
    const inset = k.wall ? 1 : 0, seed = Math.floor(b.x) * 3 + Math.floor(b.y);
    if (b.h >= 40 && b.w >= 8) {
        if (right - inset - thick - glow <= v.x + v.w && right >= v.x)
            rail(out, PERIMETER, 'y', right - inset - thick, thick, -glow, b.y + k.edge, foot, v.y, v.y + v.h, 1, cellPhase(seed, 11), clock);
        if (b.x <= v.x + v.w && b.x + inset + thick + glow >= v.x)
            rail(out, PERIMETER, 'y', b.x + inset, thick, glow, b.y + k.edge, foot, v.y, v.y + v.h, -1, cellPhase(seed, 13), clock);
    }
    if (b.w >= 48 && b.h >= 24 && foot - thick - glow <= v.y + v.h)
        UNDERSIDE.forEach((t, i) => rail(out, t, 'x', foot - thick, thick, -glow, b.x, right, v.x, v.x + v.w, -1, cellPhase(seed, 17 + i), clock));
    return out;
}

/** Barely visible etched runs, about one per 416×232 world cell, kept below the
 * contact glow. Ledges and narrow walls stay plain; blocks turn the runs upright. */
function etch(c: CanvasRenderingContext2D, b: Box, v: Box) {
    const upright = b.h > b.w;
    if (b.h < 48 || b.w < 48 || (upright && b.w < 60)) return;
    const map = (a: number, p: number): [number, number] => upright ? [p, a] : [a, p];
    const [aMin, aMax, pMin, pMax] = upright ? [b.y + 26, b.y + b.h - 12, b.x + 12, b.x + b.w - 12] : [b.x + 12, b.x + b.w - 12, b.y + 26, b.y + b.h - 12];
    const [aLo, aHi, pLo, pHi] = upright ? [v.y, v.y + v.h, v.x, v.x + v.w] : [v.x, v.x + v.w, v.y, v.y + v.h];
    const vias: [number, number][] = [];
    c.strokeStyle = '#0d1721'; c.lineWidth = 1; c.beginPath();
    for (let j = Math.floor(pLo / 232) - 1; j <= Math.floor(pHi / 232); j++) {
        for (let i = Math.floor(aLo / 416) - 1; i <= Math.floor(aHi / 416); i++) {
            const phase = cellPhase(i * 3 + 7, j * 5 - 2);
            if (phase > .58) continue;
            const p0 = j * 232 + 50 + phase * 120, p1 = p0 + (phase < .29 ? 1 : -1) * (12 + phase * 10);
            if (p0 < pMin || p0 > pMax || p1 < pMin || p1 > pMax) continue;
            const a0 = Math.max(aMin, i * 416 + 40 + phase * 150), a1 = Math.min(aMax, a0 + 70 + phase * 60);
            const a2 = Math.min(aMax, a1 + 50 + (1 - phase) * 60);
            if (a2 - a0 < 30) continue;
            c.moveTo(...map(a0, p0)); c.lineTo(...map(a1, p0)); c.lineTo(...map(a1, p1)); c.lineTo(...map(a2, p1));
            vias.push(map(a2, p1));
        }
    }
    c.stroke();
    c.fillStyle = '#13202d';
    for (const [x, y] of vias) c.fillRect(x - 1, y - 1, 2, 2);
}

/** Permanently solid architecture: a near-black mass defined by its luminous
 * periwinkle contact strip. Cosmetic signals never change the solid rectangle. */
export function drawStaticPlatform(c: CanvasRenderingContext2D, b: Box, view: Box, time: number, motion: boolean): void {
    const v = visiblePart(b, view); if (!v) return;
    const k = contact(b), right = b.x + b.w, foot = b.y + b.h;
    c.save(); clip(c, v);
    const substrate = c.createLinearGradient(0, b.y, 0, foot);
    substrate.addColorStop(0, '#080f16'); substrate.addColorStop(1, '#04080e');
    c.fillStyle = substrate; c.fillRect(v.x, v.y, v.w, v.h);
    etch(c, b, v);

    // Dim indigo side and underside tracks for the sparse perimeter signals; the
    // lit top still carries the silhouette.
    const side = Math.min(1, b.w / 4), under = Math.min(3, b.h / 4), cap = Math.min(2, b.w / 6);
    c.fillStyle = '#020509'; c.fillRect(b.x, foot - under, b.w, under);
    c.fillStyle = '#222e66'; c.fillRect(b.x, b.y, side, b.h); c.fillRect(right - side, b.y, side, b.h);
    if (b.h >= 24) c.fillRect(b.x, foot - Math.min(1, b.h / 4), b.w, Math.min(1, b.h / 4));
    const glow = c.createLinearGradient(0, b.y + k.edge, 0, b.y + k.edge + k.glow);
    glow.addColorStop(0, '#5f6aff2c'); glow.addColorStop(1, '#5f6aff00');
    c.fillStyle = glow; c.fillRect(b.x, b.y + k.edge, b.w, k.glow);
    c.fillStyle = '#5560d8'; c.fillRect(b.x, b.y, b.w, k.edge);
    c.fillRect(b.x, b.y, cap, Math.min(9, b.h * .6)); c.fillRect(right - cap, b.y, cap, Math.min(9, b.h * .6));
    c.fillStyle = '#8f97f5'; c.fillRect(b.x, b.y, b.w, Math.min(.75, k.edge / 3));
    if (k.wall) {
        c.fillStyle = '#4653c8';
        c.fillRect(b.x + 1, b.y + k.edge, k.rail, b.h - k.edge);
        c.fillRect(right - 1 - k.rail, b.y + k.edge, k.rail, b.h - k.edge);
    }
    if (motion) for (const s of staticSignals(b, view, time)) drawFine(c, s);
    c.restore();
}

/** An orthogonal polyline; segment `gap` is a break that signals cross unseen. */
type Route = { pts: number[]; gap: number; length: number };
type Pulse = { route: Route; head: number; bright: number; trail: number };
function route(gap: number, ...pts: number[]): Route {
    let length = 0;
    for (let i = 0; i + 3 < pts.length; i += 2) length += Math.abs(pts[i + 2] - pts[i]) + Math.abs(pts[i + 3] - pts[i + 1]);
    return { pts, gap, length };
}
/** Append the part of a route between two distances, continuing through turns. */
function trace(c: CanvasRenderingContext2D, r: Route, from: number, to: number) {
    let d = 0, open = false;
    for (let i = 0; i + 3 < r.pts.length; i += 2) {
        const x = r.pts[i], y = r.pts[i + 1], x2 = r.pts[i + 2], y2 = r.pts[i + 3];
        const len = Math.abs(x2 - x) + Math.abs(y2 - y), a = Math.max(from, d), z = Math.min(to, d + len);
        if (!len) continue;
        if (i / 2 === r.gap || z <= a) { open = false; d += len; continue; }
        if (!open) c.moveTo(x + (x2 - x) * (a - d) / len, y + (y2 - y) * (a - d) / len);
        c.lineTo(x + (x2 - x) * (z - d) / len, y + (y2 - y) * (z - d) / len);
        open = z === d + len; d += len;
    }
}
function travel(r: Route, phase: number, speed: number, bright: number, trail: number, gap: number, clock: number): Pulse {
    const period = r.length + bright + trail + gap;
    return { route: r, head: ((phase * period + speed * clock) % period + period) % period, bright, trail };
}
// Layered strokes give corner-following signals a stepped trailing fade.
const PULSE: readonly [(s: Pulse) => number, number, string][] = [
    [s => s.bright + s.trail, 3.5, '#ff3d7a38'], [s => s.bright + s.trail * .45, 1.5, '#e64a7c'],
    [s => s.bright, 1.75, '#ff86a6'], [() => 5, 2, '#ffdbe4'],
];

/** Long data buses beneath the lethal edge on 176-unit world cells. Each cell
 * holds the bus at one of two levels, so a change is a right-angle riser at the
 * cell boundary; some cells also break the trace. Deep fields thin out. */
type Bus = { y: number; step: number; lane: number; train: Train; dir: number; phase: number };
const BUS_CELL = 176;
function buses(b: Box, v: Box): Bus[] {
    const out: Bus[] = [], bottom = b.y + b.h - 6;
    for (let lane = Math.max(0, Math.floor((v.y - b.y - 19) / 15)); ; lane++) {
        const y = b.y + 12 + lane * 15;
        if (y > bottom || y > v.y + v.h + 8) break;
        if (lane > 6 && lane % 2) continue;
        const p = cellPhase(lane, 21), step = lane % 2 ? -Math.min(7, y - b.y - 6) : Math.min(7, bottom - y);
        // The first lane is a backflow; signals stop below the top 110 units.
        out.push({ y, step, lane, phase: cellPhase(lane, 33), dir: lane === 0 || cellPhase(lane, 13) < .3 ? -1 : 1,
            train: { pitch: y - b.y > 110 ? 0 : 250 + p * 110, speed: 172 + p * 76, bright: 38 + p * 16, trail: 70 + p * 30 } });
    }
    return out;
}
function busLevel(bus: Bus, cell: number) { return cellPhase(cell, bus.lane * 7 + 3) < .42 ? bus.y + bus.step : bus.y; }
function busGap(bus: Bus, cell: number): [number, number] | null {
    const p = cellPhase(cell, bus.lane * 5 + 1), x = cell * BUS_CELL + 36 + (p - .74) * 300;
    return p < .74 ? null : [x, x + 12];
}
/** Append a bus between two x positions, including its risers and breaks. */
function busPath(c: CanvasRenderingContext2D, bus: Bus, from: number, to: number) {
    let cell = Math.floor(from / BUS_CELL), x = from, y = busLevel(bus, cell);
    c.moveTo(x, y);
    for (;;) {
        const end = Math.min(to, (cell + 1) * BUS_CELL), gap = busGap(bus, cell);
        if (gap && gap[1] > x && gap[0] < end) {
            if (gap[0] > x) c.lineTo(gap[0], y);
            x = Math.min(end, gap[1]); c.moveTo(x, y);
        }
        if (end > x) c.lineTo(end, y);
        if (end >= to) return;
        x = end; cell++;
        const next = busLevel(bus, cell);
        if (next !== y) { c.lineTo(x, next); y = next; }
    }
}
function drawBus(c: CanvasRenderingContext2D, bus: Bus, s: RailSignal, p: Palette) {
    const lo = Math.min(s.tail, s.head), hi = Math.max(s.tail, s.head), knee = 1 - s.bright / (hi - lo);
    const halo = c.createLinearGradient(s.tail, 0, s.head, 0); halo.addColorStop(0, p.clear); halo.addColorStop(1, p.glow);
    const core = c.createLinearGradient(s.tail, 0, s.head, 0);
    core.addColorStop(0, p.fade); core.addColorStop(knee, p.body); core.addColorStop(1, p.head);
    for (const [style, width, alpha] of [[halo, 4, .3], [core, 1.6, 1]] as const) {
        c.globalAlpha = alpha; c.strokeStyle = style; c.lineWidth = width;
        c.beginPath(); busPath(c, bus, lo, hi); c.stroke();
    }
    c.globalAlpha = 1;
}

/** The approved interrupted bends just inside the lethal top edge. */
function bends(b: Box, v: Box) {
    const y = b.y + Math.min(3, b.h / 4), dip = Math.min(4, b.h / 4);
    const out: { route: Route; phase: number; x: number; length: number; y: number; dip: number }[] = [];
    for (let col = Math.floor(v.x / 88); col <= Math.floor((v.x + v.w) / 88); col++) {
        const phase = cellPhase(col, 7), x = col * 88 + 6, length = 23 + phase * 29;
        out.push({ route: route(-1, x, y, x + length * .6, y, x + length * .6, y + dip, x + length, y + dip), phase, x, length, y, dip });
    }
    return out;
}

/** Fast signals on the lethal top edge plus trailing packets on the stepped
 * buses below it. Bus signals use `across` for the lane and follow its risers. */
export function hazardSignals(b: Box, view: Box, clock: number): (RailSignal & { bus?: Bus })[] {
    const out: (RailSignal & { bus?: Bus })[] = [], v = visiblePart(b, view);
    if (!v) return out;
    if (v.y <= b.y + 24) rail(out, BOUNDARY, 'x', b.y, Math.min(2, b.h / 4), Math.min(9, b.h / 3),
        b.x, b.x + b.w, v.x, v.x + v.w, 1, cellPhase(3, Math.floor(b.y)), clock);
    for (const bus of buses(b, v)) if (bus.train.pitch) {
        const first = out.length;
        rail(out, bus.train, 'x', bus.y, 1.6, 4, b.x, b.x + b.w, v.x, v.x + v.w, bus.dir, bus.phase, clock);
        for (let i = first; i < out.length; i++) out[i].bus = bus;
    }
    return out;
}

/** Corrupted data, distinct from the hot orange controller-driven firewall.
 * No exterior glow, triangles, labels or continuous contact rail. */
export function drawDeathZone(c: CanvasRenderingContext2D, b: Box, view: Box, time: number, motion: boolean): void {
    const v = visiblePart(b, view); if (!v) return;
    const right = b.x + b.w, foot = b.y + b.h, boundary = v.y <= b.y + 24;
    c.save(); clip(c, v);
    const depth = c.createLinearGradient(0, b.y, 0, foot);
    depth.addColorStop(0, '#310f24'); depth.addColorStop(.35, '#200d1c'); depth.addColorStop(1, '#100c16');
    c.fillStyle = depth; c.fillRect(v.x, v.y, v.w, v.h);
    const rim = c.createLinearGradient(0, b.y, 0, b.y + Math.min(26, b.h));
    rim.addColorStop(0, '#f13b7040'); rim.addColorStop(1, '#f13b7000');
    c.fillStyle = rim; c.fillRect(v.x, b.y, v.w, Math.min(26, b.h));

    // Etched stepped buses with breaks and a few stale corrupted blocks, fixed to the world.
    const lanes = buses(b, v), arcs = boundary ? bends(b, v) : [];
    c.strokeStyle = '#6a2242'; c.lineWidth = 1; c.beginPath();
    for (const bus of lanes) busPath(c, bus, v.x, v.x + v.w);
    c.stroke();
    for (const bus of lanes) for (let cell = Math.floor(v.x / BUS_CELL); cell <= Math.floor((v.x + v.w) / BUS_CELL); cell++) {
        const p = cellPhase(cell * 3 + 1, bus.lane);
        if (p > .82) { c.fillStyle = p > .93 ? '#d34a7444' : '#8933584a'; c.fillRect(cell * BUS_CELL + 70 + p * 40, busLevel(bus, cell) + 3, 4 + p * 10, 2); }
    }

    // The exact lethal extent stays readable when still: dim perimeter, a broken
    // hot top edge and the interrupted bends.
    c.strokeStyle = '#a72f54'; c.lineWidth = 1;
    c.strokeRect(b.x + .5, b.y + .5, Math.max(0, b.w - 1), Math.max(0, b.h - 1));
    if (boundary) {
        // Broken, not a walkable-looking rail: corrupted runs with world-fixed gaps.
        c.fillStyle = '#d63c6d';
        for (let col = Math.floor(v.x / 44); col <= Math.floor((v.x + v.w) / 44); col++) {
            const p = cellPhase(col, 19);
            c.fillRect(col * 44, b.y, 44 - 5 - p * 9, Math.min(2, b.h / 4));
        }
        c.strokeStyle = '#ef527f'; c.lineWidth = 1.5; c.beginPath();
        for (const a of arcs) trace(c, a.route, 0, a.route.length);
        c.stroke();
        c.fillStyle = '#fa7293';
        for (const a of arcs) c.fillRect(a.x + a.length + 5, a.y + a.dip - 1, 3, 2);
    }
    if (foot - 3 >= v.y) for (let col = Math.floor(v.x / 88); col <= Math.floor((v.x + v.w) / 88); col++)
        line(c, col * 88 + 28, foot - 3, col * 88 + 51, foot - 3, '#9a335b');
    for (let row = Math.floor(v.y / 64); row <= Math.floor((v.y + v.h) / 64); row++) {
        const y = row * 64 + 14;
        line(c, b.x + 2, y, b.x + 2, y + 23, '#d44570');
        line(c, right - 3, y + 12, right - 3, y + 33, '#c53e68');
    }

    if (motion) {
        for (const s of hazardSignals(b, view, time))
            if (s.bus) drawBus(c, s.bus, s, s.velocity > 0 ? LETHAL : BACKFLOW); else drawRail(c, s, LETHAL);
        const pulses = arcs.map(a => travel(a.route, a.phase, 196 + a.phase * 44, 14, 24, 40 + a.phase * 50, time));
        for (const [span, width, colour] of PULSE) {
            c.strokeStyle = colour; c.lineWidth = width; c.beginPath();
            for (const s of pulses) trace(c, s.route, s.head - span(s), s.head);
            c.stroke();
        }
    }
    c.restore();
}
