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

/** Solid, unlit architecture. Small ledges keep the contact bevel and underside;
 * larger bodies add inset plates, while tall walls use upright reinforcement. */
export function drawStaticPlatform(c: CanvasRenderingContext2D, b: Box, view: Box): void {
    const v = visiblePart(b, view); if (!v) return;
    const right = b.x + b.w, foot = b.y + b.h;
    const upright = b.h > b.w * 1.5, inset = Math.min(7, b.w / 5, b.h / 4);
    c.save(); clip(c, v);
    const metal = c.createLinearGradient(0, b.y, 0, foot);
    metal.addColorStop(0, '#2b3c49'); metal.addColorStop(.3, '#23333f'); metal.addColorStop(1, '#182630');
    c.fillStyle = metal; c.fillRect(v.x, v.y, v.w, v.h);

    // Repeat plates rather than scaling a texture. Partial cells become endcaps.
    if (b.w >= 16 && b.h >= 18) {
        const pitchX = upright ? 104 : 192, pitchY = upright ? 144 : 96;
        const top = b.y + Math.min(9, b.h / 3), bottom = foot - Math.min(7, b.h / 4);
        for (let row = Math.floor(v.y / pitchY); row <= Math.floor((v.y + v.h) / pitchY); row++) {
            const y = Math.max(top, row * pitchY + 5), endY = Math.min(bottom, (row + 1) * pitchY - 5);
            if (endY - y < 5) continue;
            const stagger = upright ? 0 : (Math.abs(row) % 2) * pitchX / 2;
            for (let col = Math.floor((v.x - stagger) / pitchX); col <= Math.floor((v.x + v.w - stagger) / pitchX); col++) {
                const x = Math.max(b.x + inset, col * pitchX + stagger + 4);
                const endX = Math.min(right - inset, (col + 1) * pitchX + stagger - 4);
                const w = endX - x, h = endY - y;
                if (w < 6) continue;
                const cut = Math.min(4, w / 5, h / 3);
                c.beginPath(); c.moveTo(x + cut, y); c.lineTo(endX, y); c.lineTo(endX, endY - cut);
                c.lineTo(endX - cut, endY); c.lineTo(x, endY); c.lineTo(x, y + cut); c.closePath();
                c.fillStyle = cellPhase(col, row) > .55 ? '#263641' : '#22313c'; c.fill();
                line(c, x + cut, y + .5, endX - 1, y + .5, '#3a4c58');
                line(c, x + .5, y + cut, x + .5, endY - 1, '#17232c');
                line(c, x + 1, endY - .5, endX - cut, endY - .5, '#111d26');
                if (w > 44 && h > 24) {
                    c.fillStyle = '#111e27'; c.fillRect(endX - 10, y + 7, 4, 4);
                    c.fillStyle = '#596a74'; c.fillRect(endX - 9, y + 7, 2, 2);
                    if (w > 100 && h > 45) {
                        c.fillStyle = '#111e27'; c.fillRect(x + 7, endY - 11, 4, 4);
                        c.fillStyle = '#4a5d68'; c.fillRect(x + 8, endY - 11, 2, 2);
                    }
                }
                if (upright && h > 35) {
                    // Cross ties and longitudinal ribs read as a wall, even at 30 units wide.
                    c.fillStyle = '#344652'; c.fillRect(x, y + 3, w, 3);
                    line(c, endX - 3, y + 11, endX - 3, endY - 5, '#3b4d58');
                }
            }
        }
    }

    const bevel = Math.min(5, b.h / 3), under = Math.min(7, b.h / 4);
    c.fillStyle = '#111d26'; c.fillRect(b.x, foot - under, b.w, under);
    c.fillStyle = '#415563'; c.fillRect(b.x, b.y, b.w, bevel);
    c.fillStyle = '#71818b'; c.fillRect(b.x, b.y, b.w, Math.min(1.5, bevel));
    c.fillStyle = '#1b2933'; c.fillRect(b.x, b.y + bevel, b.w, Math.min(2, b.h / 6));
    // Recessed vertical edges stay inside the collision box, with no glowing outline.
    c.fillStyle = '#435560'; c.fillRect(b.x, b.y + bevel, Math.min(2, b.w / 4), Math.max(0, b.h - bevel - under));
    c.fillStyle = '#101b24'; c.fillRect(right - Math.min(3, b.w / 4), b.y + bevel, Math.min(3, b.w / 4), Math.max(0, b.h - bevel));
    if (upright && b.w >= 24) {
        c.fillStyle = '#17242e'; c.fillRect(b.x + 4, b.y + bevel, 2, Math.max(0, b.h - bevel));
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
    }
    for (let row = Math.floor(v.y / 64); row <= Math.floor((v.y + v.h) / 64); row++) {
        const y = row * 64 + 14;
        line(c, b.x + 2, y, b.x + 2, y + 23, '#d44570');
        line(c, right - 3, y + 12, right - 3, y + 33, '#c53e68');
    }
    c.restore();
}
