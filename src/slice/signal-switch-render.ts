import type { Vec2 } from '../engine/geometry.ts';
import { heroMaterials } from './hero-render.ts';

const { panel, polygon, line, dot } = heroMaterials;
export interface SignalSwitchState {
    active: boolean;
    /** Observes the existing authority's E hint, including cube interaction priority. */
    ready: boolean;
    latched: boolean;
    terminal: boolean;
}

/** Wall-mounted trace actuator. Ink stays within x ±28, y -94…-24 around
 * the original floor contact; no collision/reach box or animated world position.
 * Keeping the underside above the floor separates RACE's PHASE from TRACE.
 * Toggle handles change direction; one-use terminals seat their press face.
 * Existing floating controls and breakpoint pedestals keep their own artwork. */
export function drawSignalSwitch(c: CanvasRenderingContext2D, at: Vec2,
    state: SignalSwitchState, time: number, motion: boolean): void {
    const { active, ready, latched, terminal } = state;
    const committed = active && latched;
    const colour = committed ? '#59ed93' : active ? '#64e6d5' : '#f9ba68';
    const rim = ready ? '#c9fff5' : active ? colour : '#647c88';
    c.save(); c.translate(at.x, at.y - 58);

    // Compact clipped-corner housing and recessed circuit bed, shared metal palette.
    panel(c, -27, -35, 54, 68, '#09141d', '#354a58', 9);
    panel(c, -25, -35, 50, 63, '#1e303d', rim, 8);
    panel(c, -20, -30, 40, 50, '#081820', '#3d5664', 5);
    line(c, -17, 28, 17, 28, '#4d6571');
    line(c, -12, 32, 12, 32, colour, 1.5);

    // Two short bent traces convey a signal path without a decorative halo.
    for (const side of [-1, 1]) {
        c.beginPath(); c.moveTo(side * 16, -23); c.lineTo(side * 16, -3);
        c.lineTo(side * 10, 3); c.lineTo(side * 10, 17);
        c.strokeStyle = active ? colour + '70' : '#45535a'; c.lineWidth = 1; c.stroke();
        dot(c, side * 16, -24, 1.5, colour);
        if (motion && (active || ready)) {
            // Packet on the vertical run; fixed-size motion, no pulse of the whole asset.
            const y = -22 + ((time * .65 + (side + 1) * .25) % 1) * 17;
            line(c, side * 16, y, side * 16, y + 3, '#d7fff5', 1.3);
        }
    }
    if (terminal) {
        panel(c, -12, -19, 24, 29, '#152936', '#527080', 4);
        panel(c, -9, active ? -12 : -16, 18, active ? 14 : 19,
            committed ? '#205a42' : '#304956', colour, 3);
        if (committed) {
            line(c, -5, -5, -1, -1, '#d0ffdf', 2);
            line(c, -1, -1, 6, -9, '#d0ffdf', 2);
        } else line(c, -4, -7, 4, -7, colour, 2);
    } else {
        // A visible pivot and angled handle distinguish a toggle from a push button.
        polygon(c, [[-12, -19], [-8, -24], [0, -7], [8, -24], [12, -19], [3, 11], [-3, 11]], '#172e39', '#365260');
        dot(c, 0, 8, 7, '#2b4552'); dot(c, 0, 8, 3, '#90a7ae');
        const x = active ? 10 : -10;
        line(c, 0, 8, x, -14, '#08131c', 8);
        line(c, 0, 8, x, -14, '#8aabb2', 4);
        panel(c, x - 7, -22, 14, 11, '#294754', colour, 3);
        line(c, x - 4, -19, x + 4, -19, '#d1f9f0', 1.5);
        // OFF ring / ON bar remain legible without colour or animation.
        c.beginPath(); c.arc(-11, -29, 2, 0, Math.PI * 2);
        c.strokeStyle = active ? '#59717b' : colour; c.lineWidth = 1.2; c.stroke();
        line(c, 11, -31, 11, -27, active ? colour : '#59717b', 1.5);
    }
    if (committed) {
        // Closed catches denote an irreversible latch, independent of the caption.
        for (const side of [-1, 1]) line(c, side * 17, 10, side * 12, 10, colour, 2.5);
    }
    if (ready && !committed) {
        panel(c, -6, 13, 12, 11, '#132e34', '#82c5c3', 2);
        c.font = '600 9px ui-monospace, monospace'; c.textAlign = 'center';
        c.fillStyle = '#dcfff8'; c.fillText('E', 0, 22);
    } else for (const x of [-5, 0, 5]) line(c, x, 17, x, 20, colour, 1.5);
    c.restore();
}
