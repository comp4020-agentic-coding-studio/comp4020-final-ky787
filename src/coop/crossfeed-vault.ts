import type { RoomDef, Platform } from '../slice/rooms.ts';
import type { Slot } from './protocol.ts';

const stone = (id: string, x: number, y: number, w: number, h = 32): Platform => ({ id, kind: 'static', x, y, w, h });
const code = (id: string, x: number, y: number, w: number, signal: Platform['signal'], label: string): Platform =>
    ({ id, kind: 'code', x, y, w, h: 24, signal, label });

/** Hand-authored geometry. Provisional mock contract; never generated from a CFG. */
export function crossfeedVault(slot: Slot): RoomDef<'crossfeed-vault'> {
    return {
        id: 'crossfeed-vault', title: 'CROSSFEED VAULT', instruction: 'ROUTE BOTH PAYLOADS TO THE VAULT',
        width: 4320, height: 1780,
        spawn: { x: slot === 1 ? 1660 : 1760, y: 1483 }, checkpoint: { x: slot === 1 ? 1660 : 1760, y: 1483 },
        upperCheckpoint: { x: slot === 1 ? 1120 : 1220, y: 733 },
        cubes: [{ id: 'cubeA', spawn: { x: 2760, y: 1478 }, mark: 'A' }, { id: 'cubeB', spawn: { x: 510, y: 1478 }, mark: 'B' }],
        plate: { x: 1870, y: 1500 }, plateB: { x: 2160, y: 260 }, plateC: { x: 3040, y: 260 },
        cubePads: [{ id: 'liftCargo', at: { x: 1750, y: 1500 }, label: 'CARGO / C' },
            { id: 'finalLeft', at: { x: 2210, y: 560 }, label: 'E' }, { id: 'finalRight', at: { x: 2940, y: 560 }, label: 'F' }],
        controls: [{ id: 'switchB', kind: 'terminal', at: { x: 2560, y: 1500 }, label: 'B' },
            { id: 'switchC', kind: 'terminal', at: { x: 1210, y: 750 }, label: 'C' }, { id: 'switchD', kind: 'terminal', at: { x: 3900, y: 750 }, label: 'D' }],
        display: { x: 1680, y: 1040 }, exit: { x: 2520, y: 120, w: 140, h: 140 },
        platforms: [
            stone('central-floor', 200, 1500, 1800, 280), stone('access-balcony', 2420, 1500, 1900, 280),
            stone('service-roof', 850, 1100, 400, 310),
            { ...stone('service-door', 1300, 1120, 36, 380), openWhen: 'relayGates', label: 'SERVICE' },
            stone('control-catwalk', 1010, 750, 430),
            stone('boost-gallery', 3100, 940, 1220), stone('control-ledge', 3650, 750, 670),
            stone('vault-cargo-deck', 2050, 560, 1130), stone('vault-crown', 2050, 260, 1130),
            { ...code('crossing-anchor', 2220, 1160, 160, 'grappleAnchor', 'A'), h: 60, anchor: true },
            code('return-bridge', 2000, 1500, 420, 'bridge', 'B'),
            // Several physical manifestations, one provisional codePlatformA output.
            code('gallery-return-low', 3370, 850, 150, 'codePlatformA', 'D'),
            code('gallery-return-high', 3500, 770, 170, 'codePlatformA', 'D'),
            code('upper-crossfeed', 1440, 750, 2210, 'codePlatformA', 'CROSSFEED'),
            code('vault-rise-low', 1740, 660, 160, 'codePlatformA', 'VAULT'),
            code('vault-rise-high', 1890, 575, 190, 'codePlatformA', 'VAULT'),
            // Mirrored final approaches are two manifestations of codePlatformB.
            code('final-left-low', 1900, 470, 150, 'codePlatformB', 'E + F'),
            code('final-left-high', 1880, 370, 160, 'codePlatformB', 'E + F'),
            code('final-right-low', 3180, 470, 160, 'codePlatformB', 'E + F'),
            code('final-right-high', 3200, 370, 160, 'codePlatformB', 'E + F'),
        ],
        lifts: [{ id: 'central-lift', x: 1440, y: 710, w: 220, h: 790, signal: 'liftField' }],
        gates: [{ id: 'transfer', signal: 'relayGates', gates: [
            { id: 'R1', x: 280, y: 1390, w: 56, h: 110, exitSide: 1 },
            { id: 'R2', x: 3180, y: 830, w: 56, h: 110, exitSide: 1 },
        ] }],
        // Player height 34 fits below the core; a resting 44-high or overhead
        // payload intersects it. The long roofed passage prevents jumping cargo over.
        firewalls: [{ id: 'service-filter', x: 850, y: 1452, orientation: 'horizontal', length: 400, thickness: 12 }],
        hazards: [{ x: 0, y: 1710, w: 4320, h: 70 }],
        regions: [{ at: { x: 1600, y: 1390 }, label: 'CROSSFEED' }, { at: { x: 2510, y: 1390 }, label: 'ACCESS' },
            { at: { x: 360, y: 1270 }, label: 'SERVICE' }, { at: { x: 1080, y: 650 }, label: 'CONTROL' },
            { at: { x: 3320, y: 690 }, label: 'GALLERY' }, { at: { x: 2490, y: 60 }, label: 'VAULT' }],
    };
}
