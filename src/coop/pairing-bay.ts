import type { RoomDef } from '../slice/rooms.ts';
import type { Slot } from './protocol.ts';

/** Authored mock chamber. Geometry is never sent to the server controller. */
export function pairingBay(slot: Slot): RoomDef<'pairing-bay'> {
    return {
        id: 'pairing-bay', title: 'PAIRING BAY', instruction: 'HOLD FOR YOUR PARTNER. CROSS TOGETHER.',
        width: 2200, height: 780,
        spawn: { x: slot === 1 ? 150 : 405, y: 543 },
        checkpoint: { x: slot === 1 ? 1050 : 1150, y: 543 },
        plate: { x: 250, y: 560 }, lever: { x: 1060, y: 560 },
        cube: { x: 1190, y: 538 }, cargoPlate: { x: 1310, y: 560 },
        plateB: { x: 1680, y: 340 }, plateC: { x: 1920, y: 340 },
        display: { x: 1100, y: 180 }, exit: { x: 2030, y: 200, w: 130, h: 140 },
        platforms: [
            { id: 'near', kind: 'static', x: 0, y: 560, w: 460, h: 240 },
            { id: 'far', kind: 'static', x: 880, y: 560, w: 700, h: 240 },
            { id: 'final-deck', kind: 'static', x: 1580, y: 340, w: 620, h: 460 },
            { id: 'anchor', kind: 'code', x: 690, y: 220, w: 160, h: 60, anchor: true, signal: 'grappleAnchor', label: 'A / GRAPPLE ANCHOR' },
            { id: 'bridge', kind: 'code', x: 460, y: 560, w: 420, h: 20, signal: 'bridge', label: 'B / RETURN BRIDGE' },
            { id: 'final-access', kind: 'code', x: 1400, y: 455, w: 160, h: 24, signal: 'codePlatformA', label: 'CARGO / FINAL ACCESS' },
        ],
        hazards: [{ x: 460, y: 695, w: 420, h: 100 }],
    };
}
