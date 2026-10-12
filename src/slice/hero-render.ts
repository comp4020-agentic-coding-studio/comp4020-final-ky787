import type { Box, Vec2 } from '../engine/geometry.ts';
import { PLAYER } from '../engine/constants.ts';
import type { BreakpointDef, RoomDef } from './rooms.ts';
import { breakpointPose, entryGateways, HERO_TIMING, type HeroPresentation } from './hero-presentation.ts';

// Authored debugger metaphors, not instruction listings or binary evidence.
const M = { edge: '#526772', rim: '#83949d', metal: '#293942', inset: '#14222b', dark: '#0a151e',
    cyan: '#8cece5', red: '#ff556b', green: '#8af0ac', grey: '#8d9a9f', amber: '#b8a076', ink: '#e4edf0' };
const clamp = (n: number) => Math.max(0, Math.min(1, n));
function line(c: CanvasRenderingContext2D, x: number, y: number, xx: number, yy: number, colour: string, width = 1) {
    c.strokeStyle = colour; c.lineWidth = width; c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.stroke();
}
function polygon(c: CanvasRenderingContext2D, points: number[][], fill: string, edge = M.edge) {
    c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
    c.fillStyle = fill; c.fill(); c.strokeStyle = edge; c.lineWidth = 1; c.stroke();
}
function panel(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill = M.metal, edge = M.edge, bevel = 5) {
    polygon(c, [[x + bevel, y], [x + w - bevel, y], [x + w, y + bevel], [x + w, y + h - bevel],
        [x + w - bevel, y + h], [x + bevel, y + h], [x, y + h - bevel], [x, y + bevel]], fill, edge);
}
function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, colour: string, align: CanvasTextAlign = 'center') {
    c.font = `600 ${size}px ui-monospace, monospace`; c.fillStyle = colour; c.textAlign = align; c.fillText(s, x, y);
}
function dot(c: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string) {
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = colour; c.fill();
}
function bolts(c: CanvasRenderingContext2D, x: number, y: number) {
    dot(c, x, y, 2.2, M.dark); line(c, x - 1, y, x + 1, y, M.rim);
}
/** Only major identification survives a room overview. The badge stays tethered to its machine. */
function overviewLabel(c: CanvasRenderingContext2D, label: string, x: number, y: number, zoom: number, colour: string, second?: string, below = false) {
    if (zoom >= .68) return;
    c.save(); c.translate(x, y); c.scale(1 / zoom, 1 / zoom);
    const width = Math.max(label.length * 5.5 + 16, 78), height = second ? 32 : 20;
    // Keep edge-of-room captions readable on compact canvases without moving the camera.
    const transform = c.getTransform(), left = -transform.e / transform.a, right = (c.canvas.width - transform.e) / transform.a;
    if (left > 0 || right < 0) { c.restore(); return; }
    const offset = Math.max(left + width / 2 + 4, Math.min(right - width / 2 - 4, 0));
    const top = below ? 8 : -8 - height;
    line(c, 0, 0, offset, below ? 8 : -8, M.edge);
    panel(c, offset - width / 2, top, width, height, M.dark, M.edge, 3);
    text(c, label, offset, top + 13, 9, colour);
    if (second) text(c, second, offset, top + 27, 8, M.ink);
    c.restore();
}
function brackets(c: CanvasRenderingContext2D, b: Box, colour: string) {
    for (const [x, sx] of [[b.x, 1], [b.x + b.w, -1]]) for (const [y, sy] of [[b.y, 1], [b.y + b.h, -1]]) {
        line(c, x, y, x + sx * 9, y, colour, 1.5); line(c, x, y, x, y + sy * 10, colour, 1.5);
    }
}
function field(c: CanvasRenderingContext2D, b: Box, colour: string, power: number, time: number, pulse: number) {
    c.save(); c.beginPath(); c.rect(b.x, b.y, b.w, b.h); c.clip();
    c.fillStyle = M.dark; c.fillRect(b.x, b.y, b.w, b.h);
    const glow = c.createLinearGradient(b.x, b.y, b.x + b.w, b.y);
    glow.addColorStop(0, colour + '08'); glow.addColorStop(.5, colour + '38'); glow.addColorStop(1, colour + '08');
    c.globalAlpha = .1 + power * .9 + pulse * .4; c.fillStyle = glow; c.fillRect(b.x, b.y, b.w, b.h);
    c.globalAlpha = .1 + power * .18;
    for (let y = b.y + (time * (8 + power * 19) % 12); y < b.y + b.h; y += 12) line(c, b.x, y, b.x + b.w, y, colour);
    for (let x = b.x + 12; x < b.x + b.w; x += 22) line(c, x, b.y, x, b.y + b.h, colour + '60');
    if (power > 0) {
        c.globalAlpha = power * .7;
        for (let i = 0; i < 7; i++) {
            const x = b.x + 8 + ((i * 37) % Math.max(1, b.w - 16));
            const y = b.y + b.h - (time * 38 + i * 23) % b.h;
            line(c, x, y, x, y - 7 - i % 3 * 3, colour);
        }
    }
    c.globalAlpha = .5 + power * .3;
    brackets(c, { x: b.x + 8, y: b.y + 8, w: b.w - 16, h: b.h - 16 }, colour);
    if (pulse > 0) { c.globalAlpha = pulse * .2; c.fillStyle = colour; c.fillRect(b.x, b.y, b.w, b.h); }
    c.restore();
}
/** Shared materials, different weight: the opening remains exactly the authored exit trigger. */
function gateway(c: CanvasRenderingContext2D, b: Box, entry: boolean, colour: string, power: number, time: number, pulse: number, unlockAge = Infinity) {
    const pylon = entry ? 18 : 30, cx = b.x + b.w / 2, headerW = Math.max(entry ? 126 : 176, b.w + pylon * 2 + 10);
    field(c, b, colour, power, time, pulse);
    for (const side of [-1, 1]) {
        const x = side < 0 ? b.x - pylon : b.x + b.w;
        panel(c, x, b.y - 9, pylon, b.h + 9, M.inset);
        panel(c, x + 3, b.y + 8, pylon - 6, b.h - 18, M.metal, M.edge, 3);
        const rail = side < 0 ? b.x - 3 : b.x + b.w + 3;
        line(c, rail, b.y + 5, rail, b.y + b.h - 9, colour + (power > 0 ? 'bb' : '44'), entry ? 2 : 3);
        for (let i = 0; i < (entry ? 3 : 4); i++) {
            const y = b.y + 19 + i * (b.h - 36) / (entry ? 3 : 4);
            panel(c, x - 2, y, pylon + 4, 12, M.inset, M.edge, 2);
            const lit = power > 0 && (unlockAge === Infinity || unlockAge * 6 > i);
            c.fillStyle = lit ? colour : M.edge; c.fillRect(x + pylon / 2 - 2, y + 4, 4, 4);
        }
        bolts(c, x + pylon / 2, b.y + 3); bolts(c, x + pylon / 2, b.y + b.h - 5);
        polygon(c, [[x - 8, b.y + b.h], [x - 8, b.y + b.h - 9], [x + 2, b.y + b.h - 19],
            [x + pylon - 2, b.y + b.h - 19], [x + pylon + 8, b.y + b.h - 9], [x + pylon + 8, b.y + b.h]], M.metal);
        line(c, x - 3, b.y + b.h - 5, x + pylon + 3, b.y + b.h - 5, M.rim);
    }
    panel(c, cx - headerW / 2, b.y - (entry ? 32 : 43), headerW, entry ? 34 : 45, M.metal, M.rim, entry ? 7 : 11);
    panel(c, cx - headerW / 2 + 9, b.y - (entry ? 27 : 37), headerW - 18, entry ? 23 : 28, M.dark, M.edge, 3);
    line(c, cx - headerW / 2 + 16, b.y - 3, cx + headerW / 2 - 16, b.y - 3, colour + (power > 0 ? 'aa' : '33'), 2);
    for (const x of [cx - headerW / 2 + 5, cx + headerW / 2 - 5]) bolts(c, x, b.y - 16);
    line(c, b.x + 3, b.y + b.h - 2, b.x + b.w - 3, b.y + b.h - 2, colour + '77', 2);
    if (unlockAge < HERO_TIMING.exit) {
        const progress = clamp(unlockAge / HERO_TIMING.exit);
        c.save(); c.strokeStyle = colour; c.lineWidth = 3; c.globalAlpha = Math.sin(progress * Math.PI);
        const perimeter = 2 * (b.w + b.h + 12); c.setLineDash([perimeter * .23, perimeter * .77]); c.lineDashOffset = -progress * perimeter;
        c.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 6); c.restore();
    }
}
export function drawEntryGateways(c: CanvasRenderingContext2D, room: RoomDef, heroes: HeroPresentation, zoom: number) {
    c.save();
    const flash = heroes.entryAge < HERO_TIMING.attach ? Math.sin(heroes.entryAge / HERO_TIMING.attach * Math.PI) : 0;
    for (const { opening: b, points } of entryGateways(room)) {
        gateway(c, b, true, M.cyan, .45, heroes.time, flash);
        text(c, 'ENTRY POINT', b.x + b.w / 2, b.y - 11, 12, M.cyan);
        text(c, 'SESSION ATTACHED', b.x + b.w / 2, b.y + 22, 7, M.grey);
        for (const p of points) {
            // Individual floor brackets identify both spawn lanes inside a shared station.
            brackets(c, { x: p.x - 15, y: b.y + b.h - 9, w: 30, h: 8 }, M.cyan + '88');
            if (zoom > .68 && points.length > 1) text(c, `P${room.entryPoints!.indexOf(p) + 1}`, p.x, b.y + 36, 8, M.cyan);
        }
        // Enlarge inward over the header at overview scale: RACE's receiver is directly above it.
        overviewLabel(c, 'ENTRY POINT', b.x + b.w / 2, b.y - 32 + 28 / zoom, zoom, M.cyan);
    }
    c.restore();
}
export function drawBreakpoint(c: CanvasRenderingContext2D, def: BreakpointDef, active: boolean, age: number, time: number, zoom: number) {
    c.save(); c.translate(def.at.x, def.at.y);
    const pose = breakpointPose(active, age), colour = active ? M.red : M.amber;
    // Telescoping mast behind the terminal; both sleeve joints remain visible.
    panel(c, -63, -69, 18, 53, M.inset, M.edge, 3);
    const tip = -65 - 91 * pose.mast;
    if (pose.mast > 0) {
        panel(c, -59, tip, 10, -25 - tip, M.metal, M.rim, 2);
        line(c, -55, tip + 7, -55, -50, M.red + 'a0', 2);
        for (const y of [-55 - 32 * pose.mast, -61 - 64 * pose.mast]) panel(c, -61, y, 14, 6, M.inset, M.rim, 1);
        panel(c, -64, tip - 6, 20, 13, M.metal, M.edge, 3);
        dot(c, -54, tip, 3, M.red);
    }
    if (pose.flag > 0) {
        c.save(); c.translate(-48, tip + 6); c.scale(pose.flag, 1);
        polygon(c, [[0, 0], [63, 0], [75, 12], [66, 30], [0, 30]], M.inset, M.red);
        panel(c, 5, 4, 56, 22, '#321c29', '#794451', 2);
        dot(c, 20, 15, 7, M.red); dot(c, 20, 15, 3, '#ffc2c9');
        line(c, 33, 10, 52, 10, M.red, 2); line(c, 33, 16, 46, 16, M.red + 'aa');
        line(c, 33, 21, 53, 21, M.red + '66'); c.restore();
    }
    // Heavy layered footing and an open recess with piston/circuit detail.
    polygon(c, [[-82, 0], [-82, -10], [-67, -23], [67, -23], [82, -10], [82, 0]], M.inset, M.rim);
    panel(c, -70, -14, 140, 11, M.metal, M.edge, 3);
    polygon(c, [[-55, -20], [-49, -59], [43, -59], [56, -20]], M.metal);
    panel(c, -35, -53, 64, 27, M.dark, M.edge, 3);
    for (let i = 0; i < 5; i++) line(c, -27, -47 + i * 4, -6, -47 + i * 4, M.edge, 2);
    line(c, 5, -47, 20, -47, colour + '99'); line(c, 20, -47, 20, -34, colour + '99');
    dot(c, 20, -34, 2.5, colour);
    const unlock = pose.mast > 0 && pose.mast < 1 ? Math.sin(pose.mast * Math.PI) * 5 : 0;
    for (const side of [-1, 1]) {
        panel(c, side < 0 ? -67 - unlock : 48 + unlock, -51, 18, 29, M.inset, M.edge, 3);
        bolts(c, side * 59, -9);
    }
    line(c, -46, -20, 47, -20, colour + '88', 2);
    // Angled display head, with a hood and a separate action legend.
    polygon(c, [[-78, -60], [-82, -88], [-71, -96], [70, -96], [80, -88], [77, -60]], M.metal, M.rim);
    panel(c, -73, -88, 144, 23, M.dark, active ? '#8d3d50' : M.edge, 3);
    dot(c, -64, -77, 3.5, active ? M.red : M.amber);
    const label = active ? 'BREAKPOINT ACTIVE' : 'BREAKPOINT OFFLINE';
    text(c, label, 6, -73, 10, colour);
    text(c, def.label ?? 'RESPAWN MILESTONE', 0, -102, 10, M.ink);
    if (active) {
        c.globalAlpha = .55 + .2 * Math.sin(time * 2.5); dot(c, 57, -9, 3, M.red); c.globalAlpha = 1;
    }
    if (pose.flash > 0) { c.globalAlpha = pose.flash * .5; c.fillStyle = '#ffd1d5'; c.fillRect(-69, -85, 136, 17); c.globalAlpha = 1; }
    if (pose.confirmation > 0) {
        const t = clamp((age - HERO_TIMING.flag) / (HERO_TIMING.breakpoint - HERO_TIMING.flag));
        c.globalAlpha = pose.confirmation * .65; c.strokeStyle = M.red; c.lineWidth = 2;
        c.beginPath(); c.ellipse(0, -7, 84 + 30 * t, 10 + 9 * t, 0, 0, Math.PI * 2); c.stroke();
        for (let i = 0; i < 12; i++) {
            const a = i * Math.PI / 6; dot(c, Math.cos(a) * (50 + t * 68), -35 + Math.sin(a) * (20 + t * 32), 1.5, M.red);
        }
        c.globalAlpha = 1;
    }
    overviewLabel(c, label, 0, active ? tip - 10 : -100, zoom, colour);
    c.restore();
}
export function drawExitGate(c: CanvasRenderingContext2D, b: Box, ready: boolean, heroes: HeroPresentation, zoom: number, arrivals?: number) {
    c.save();
    const colour = ready ? M.green : M.grey;
    const power = ready ? .55 + .45 * clamp(heroes.exitAge / HERO_TIMING.exit) : 0;
    const completion = heroes.completionAge < HERO_TIMING.completion ? Math.sin(heroes.completionAge / HERO_TIMING.completion * Math.PI) : 0;
    gateway(c, b, false, colour, power, heroes.time, completion, ready ? heroes.exitAge : Infinity);
    const cx = b.x + b.w / 2, label = ready ? 'TRAVEL COMPLETE' : 'TRAVEL INCOMPLETE';
    text(c, label, cx, b.y - 19, 11, colour);
    text(c, ready ? 'ROUTE VALIDATED' : 'AWAITING ROUTE', cx, b.y + 22, Math.min(8, b.w / 9), colour);
    const centre = { x: cx, y: b.y + b.h * .5 };
    brackets(c, { x: cx - 14, y: centre.y - 18, w: 28, h: 36 }, colour + '99');
    text(c, ready ? '»' : '–', cx, centre.y + 7, 23, colour);
    if (arrivals !== undefined) {
        panel(c, cx - 49, b.y + b.h - 30, 98, 22, M.dark, M.edge, 3);
        text(c, `${arrivals} / 2 ARRIVED`, cx, b.y + b.h - 15, 10, ready ? M.green : M.grey);
    }
    if (completion > 0) {
        const t = heroes.completionAge / HERO_TIMING.completion;
        c.globalAlpha = completion;
        for (let i = 0; i < 16; i++) {
            const a = i * Math.PI / 8, radius = (1 - t) * 130;
            line(c, cx + Math.cos(a) * radius, centre.y + Math.sin(a) * radius,
                cx + Math.cos(a) * (radius + 12), centre.y + Math.sin(a) * (radius + 12), M.green, 2);
        }
        c.globalAlpha = 1;
    }
    // Low-zoom exits often sit beneath the party HUD at the room's upper edge.
    overviewLabel(c, label, cx, b.y + b.h + 4, zoom, colour, arrivals === undefined ? undefined : `${arrivals} / 2 ARRIVED`, true);
    c.restore();
}
/** A projection crosses the avatars, so this thin effect is drawn after the players. */
export function drawEntryProjection(c: CanvasRenderingContext2D, room: RoomDef, heroes: HeroPresentation) {
    if (heroes.entryAge >= HERO_TIMING.attach) return;
    c.save();
    const t = clamp(heroes.entryAge / HERO_TIMING.attach), intensity = Math.sin(t * Math.PI);
    for (const { points } of entryGateways(room)) for (const p of points) {
        const floor = p.y + PLAYER.height / 2, y = floor - 100 + t * 100;
        c.globalAlpha = intensity * .8;
        line(c, p.x - 23, y, p.x + 23, y, M.cyan, 2);
        c.strokeStyle = M.cyan; c.lineWidth = 1; c.beginPath(); c.ellipse(p.x, y, 23, 5, 0, 0, Math.PI * 2); c.stroke();
        for (let i = 0; i < 10; i++) {
            const a = i * Math.PI / 5, r = (1 - t) * 45;
            dot(c, p.x + Math.cos(a) * r, Math.min(floor - 3, p.y + Math.sin(a) * r), 1.5, M.cyan);
        }
    }
    c.restore();
}
/** Rooms without authored machines keep a quiet respawn marker, never a fake terminal or entry flag. */
export function drawRespawnMarker(c: CanvasRenderingContext2D, at: Vec2) {
    c.save(); brackets(c, { x: at.x - 17, y: at.y + PLAYER.height / 2 - 6, w: 34, h: 6 }, M.red);
    dot(c, at.x, at.y + PLAYER.height / 2 - 4, 2, M.red); c.restore();
}
