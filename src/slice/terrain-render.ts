import type { Box } from '../engine/geometry.ts';

/** Scenery only: all ink stays inside the authored collision/reset rectangle.
 * Detail cells use fixed world coordinates; the camera only culls them. */
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

/** Move a short dash along a fixed orthogonal path. Only dash phase changes;
 * vertices, colour and width remain stationary, with no shadows or flicker. */
function signal(c: CanvasRenderingContext2D, x: number, y: number, run: number, rise: number, tail: number,
    clock: number, phase: number, speed: number, colour: string, size = 9) {
    const span = Math.abs(run) + Math.abs(rise) + Math.abs(tail), gap = span + 24;
    c.save(); c.strokeStyle = colour; c.lineWidth = 1.25;
    c.setLineDash([size, gap]); c.lineDashOffset = -(clock * speed + phase * gap) % (size + gap);
    c.beginPath(); c.moveTo(x, y);
    if (run) c.lineTo(x + run, y);
    if (rise) c.lineTo(x + run, y + rise);
    if (tail) c.lineTo(x + run + tail, y + rise);
    c.stroke(); c.restore();
}

/** An etched circuit neighbourhood, not a tile outline. Its seed and bounds
 * belong to the world; rotating the same vocabulary gives walls vertical buses. */
function circuitCell(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, upright: boolean, phase: number) {
    c.save(); c.translate(x, y);
    if (upright) { c.translate(w, 0); c.rotate(Math.PI / 2); [w, h] = [h, w]; }
    const variant = Math.floor(phase * 4), mid = w * (.36 + phase * .25);
    const lane = Math.min(h - 3, Math.max(3, h * (.3 + (variant % 2) * .32)));
    const offset = h < 16 ? 3 : Math.min(15, h * .23), branch = lane + (variant % 2 ? -offset : offset);
    c.strokeStyle = variant === 2 ? '#203240' : '#1c2e3a'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(3, lane); c.lineTo(mid - 9, lane);
    c.lineTo(mid - 9, branch); c.lineTo(w - 5, branch);
    if (h >= 20) {
        const split = Math.max(6, mid - 24), end = variant % 2 ? h - 5 : 4;
        c.moveTo(split, lane); c.lineTo(split, end); c.lineTo(split + 13, end);
    }
    c.stroke();
    // Flat contact pads, deliberately square and dim rather than luminous bolts.
    c.fillStyle = '#2d434f'; c.fillRect(2, lane - 1, 2, 2); c.fillRect(w - 6, branch - 1, 2, 2);
    if (w >= 48 && h >= 20 && variant !== 1) {
        const chipW = h >= 48 ? 22 + variant * 4 : 13, chipH = h >= 48 ? 16 + variant * 2 : 7;
        const cx = Math.min(mid + 6, w - chipW - 5), cy = Math.min(h - chipH - 3, Math.max(3, branch - chipH / 2));
        c.fillStyle = '#0b141d'; c.fillRect(cx - 2, cy - 2, chipW + 4, chipH + 4);
        c.fillStyle = '#152530'; c.fillRect(cx, cy, chipW, chipH);
        c.fillStyle = '#0c1720'; c.fillRect(cx + 2, cy + 2, chipW - 4, chipH - 4);
        c.fillStyle = '#263b47';
        for (let pin = 3; pin < chipH - 1; pin += 5) {
            c.fillRect(cx - 3, cy + pin, 3, 1); c.fillRect(cx + chipW, cy + pin, 3, 1);
        }
        if (h >= 48) {
            c.fillStyle = '#1c303b'; c.fillRect(cx + 5, cy + 5, chipW - 10, chipH - 10);
            c.fillStyle = '#384f5c'; c.fillRect(cx + 3, cy + 3, 2, 1);
        }
    }
    if (h >= 42 && w >= 72) {
        // Short parallel contacts suggest a data bus, with generous blank substrate.
        const bx = variant % 2 ? 10 : w - 37, by = variant % 2 ? 7 : h - 12;
        c.fillStyle = '#20333e';
        for (let bit = 0; bit < 4; bit++) c.fillRect(bx + bit * 6, by, 3, 5);
        line(c, bx, by + 8, bx + 21, by + 8, '#192b36');
    }
    c.restore();
}

/** Permanently solid computational substrate: crisp contact edge, etched buses
 * and embedded chips. Cosmetic edge packets never change the solid architecture. */
export function drawStaticPlatform(c: CanvasRenderingContext2D, b: Box, view: Box, time: number, motion: boolean): void {
    const v = visiblePart(b, view); if (!v) return;
    const right = b.x + b.w, foot = b.y + b.h;
    const upright = b.h > b.w, inset = Math.min(7, b.w / 5, b.h / 4);
    c.save(); clip(c, v);
    const substrate = c.createLinearGradient(0, b.y, 0, foot);
    substrate.addColorStop(0, '#101b24'); substrate.addColorStop(.4, '#0d161f'); substrate.addColorStop(1, '#0a1219');
    c.fillStyle = substrate; c.fillRect(v.x, v.y, v.w, v.h);

    // Fixed world cells contain different circuit topologies, with no panel seams.
    // A shallow ledge gets one row; a narrow wall gets one column. Neither is stretched.
    if (b.w >= 16 && b.h >= 18) {
        const thin = b.h < 42, narrow = upright && b.w < 60;
        const pitchX = upright ? 112 : 208, pitchY = upright ? 208 : 112;
        const top = b.y + Math.min(7, b.h / 3), bottom = foot - Math.min(5, b.h / 4);
        const firstRow = Math.floor((thin ? b.y : v.y) / pitchY), lastRow = thin ? firstRow : Math.floor((v.y + v.h) / pitchY);
        for (let row = firstRow; row <= lastRow; row++) {
            const y = thin ? top : Math.max(top, row * pitchY + 6);
            const endY = thin ? bottom : Math.min(bottom, (row + 1) * pitchY - 6);
            if (endY - y < 5) continue;
            const stagger = upright ? 0 : (Math.abs(row) % 2) * pitchX / 2;
            const firstCol = Math.floor(((narrow ? b.x : v.x) - stagger) / pitchX);
            const lastCol = narrow ? firstCol : Math.floor((v.x + v.w - stagger) / pitchX);
            for (let col = firstCol; col <= lastCol; col++) {
                const x = narrow ? b.x + inset : Math.max(b.x + inset, col * pitchX + stagger + 8);
                const endX = narrow ? right - inset : Math.min(right - inset, (col + 1) * pitchX + stagger - 8);
                const w = endX - x, h = endY - y;
                if ((upright ? h >= 26 && w >= 6 : w >= 26 && h >= 6))
                    circuitCell(c, x, y, w, h, upright, cellPhase(col + 17, row * 3 - 11));
            }
        }
    }

    // A precise desaturated contact edge, not a powered cyan frame or metal bevel.
    const edge = Math.min(1.25, b.h / 3), under = Math.min(3, b.h / 4);
    c.fillStyle = '#081119'; c.fillRect(b.x, foot - under, b.w, under);
    c.fillStyle = '#465967'; c.fillRect(b.x, b.y, b.w, edge);
    c.fillStyle = '#1b2d39'; c.fillRect(b.x, b.y + edge, b.w, Math.min(2, b.h / 6));
    c.fillStyle = '#243843'; c.fillRect(b.x, b.y + edge, Math.min(1, b.w / 4), Math.max(0, b.h - edge - under));
    c.fillStyle = '#09121b'; c.fillRect(right - Math.min(2, b.w / 4), b.y + edge, Math.min(2, b.w / 4), Math.max(0, b.h - edge));
    const clock = motion ? time : 0;
    if (b.w >= 48 && b.h >= 10 && b.y + 8 >= v.y) {
        for (let col = Math.floor(v.x / 256); col <= Math.floor((v.x + v.w) / 256); col++) {
            const phase = cellPhase(col, Math.floor(b.y));
            signal(c, col * 256 + 16, b.y + 3, 110, 3, 30, clock, phase, 13 + phase * 4, '#4d687a');
        }
    }
    if (b.h >= 90 && b.w >= 12) {
        for (const [x, turn] of [[b.x + 4, 3], [right - 5, -3]]) {
            if (x + 4 < v.x || x - 4 > v.x + v.w) continue;
            for (let row = Math.floor(v.y / 240); row <= Math.floor((v.y + v.h) / 240); row++)
                signal(c, x, row * 240 + 12, 0, 150, turn, clock, cellPhase(Math.floor(x), row), 11, '#3c5668', 7);
        }
    }
    c.restore();
}

/** Corrupted data, distinct from the hot orange controller-driven firewall.
 * No exterior glow, triangles, labels or solid-looking contact rail. */
export function drawDeathZone(c: CanvasRenderingContext2D, b: Box, view: Box, time: number, motion: boolean): void {
    const v = visiblePart(b, view); if (!v) return;
    const clock = motion ? time : 0, right = b.x + b.w, foot = b.y + b.h;
    c.save(); clip(c, v);
    const depth = c.createLinearGradient(0, b.y, 0, foot);
    depth.addColorStop(0, '#310f24'); depth.addColorStop(.35, '#200d1c'); depth.addColorStop(1, '#100c16');
    c.fillStyle = depth; c.fillRect(v.x, v.y, v.w, v.h);
    const rim = c.createLinearGradient(0, b.y, 0, b.y + Math.min(24, b.h));
    rim.addColorStop(0, '#f13b702e'); rim.addColorStop(1, '#f13b7000');
    c.fillStyle = rim; c.fillRect(v.x, b.y, v.w, Math.min(24, b.h));

    // Sparse broken scanlines and tiny packets on a fixed world lattice. Motion
    // stays within a cell, so culling/panning can never reseed or stretch the pattern.
    for (let row = Math.floor(v.y / 36); row <= Math.floor((v.y + v.h) / 36); row++) {
        const baseY = row * 36;
        for (let col = Math.floor(v.x / 128); col <= Math.floor((v.x + v.w) / 128); col++) {
            const phase = cellPhase(col, row), x = col * 128 + 16 + phase * 28;
            const y = baseY + 13 + phase * 10;
            line(c, x, y, x + 42 + phase * 28, y, '#73244155');
            const drift = Math.sin(clock * .45 + phase * 6.28) * 7;
            c.fillStyle = phase > .65 ? '#b43d645e' : '#8933584a';
            c.fillRect(x + 20 + drift, y + 6, 5 + phase * 11, 2);
            if (phase > .72) {
                c.fillStyle = '#d34a7444'; c.fillRect(x + 15 + drift, y + 10, 3, 3);
                line(c, x + 45, y - 4, x + 62, y - 4, '#92305645');
            }
            if (motion && phase > .74)
                signal(c, x, y, 42 + phase * 28, 0, 0, clock, phase, 20 + phase * 15, '#d34a7488');
        }
    }

    // A dim continuous perimeter marks the exact lethal extent even when paused;
    // brighter interrupted signals sit inside it, never above the collision box.
    c.strokeStyle = '#a72f54'; c.lineWidth = 1;
    c.strokeRect(b.x + .5, b.y + .5, Math.max(0, b.w - 1), Math.max(0, b.h - 1));
    c.globalAlpha = .82 + .08 * Math.sin(clock * .8);
    for (let col = Math.floor(v.x / 88); col <= Math.floor((v.x + v.w) / 88); col++) {
        const phase = cellPhase(col, 7), x = col * 88 + 6, length = 23 + phase * 29;
        const y = b.y + Math.min(3, b.h / 4), dip = Math.min(4, b.h / 4);
        c.strokeStyle = '#ef527f'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + length * .6, y);
        c.lineTo(x + length * .6, y + dip); c.lineTo(x + length, y + dip); c.stroke();
        c.fillStyle = '#fa7293'; c.fillRect(x + length + 5, y + dip - 1, 3, 2);
        line(c, x + 22, foot - 3, x + 45, foot - 3, '#9a335b');
        if (motion && col % 2 === 0)
            signal(c, x, y, length * .6, dip, length * .4, clock, phase, 26 + phase * 8, '#fa7293', 11);
    }
    for (let row = Math.floor(v.y / 64); row <= Math.floor((v.y + v.h) / 64); row++) {
        const y = row * 64 + 14;
        line(c, b.x + 2, y, b.x + 2, y + 23, '#d44570');
        line(c, right - 3, y + 12, right - 3, y + 33, '#c53e68');
    }
    c.restore();
}
