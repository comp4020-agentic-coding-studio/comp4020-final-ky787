import type { RoomDef, Platform, CameraReveal } from '../slice/rooms.ts';
import type { Slot } from './protocol.ts';

const stone = (id: string, x: number, y: number, w: number, h = 32): Platform => ({ id, kind: 'static', x, y, w, h });
const code = (id: string, x: number, y: number, w: number, signal: Platform['signal'], label: string): Platform =>
    ({ id, kind: 'code', x, y, w, h: 24, signal, label });

const upperView: CameraReveal = { bounds: { x: 1060, y: 110, w: 3260, h: 700 }, padding: 45 };

/** Hand-authored geometry. Provisional mock contract; never generated from a CFG. */
export function crossfeedVault(slot: Slot): RoomDef<'crossfeed-vault'> {
    const room: RoomDef<'crossfeed-vault'> = {
        id: 'crossfeed-vault', title: 'CROSSFEED VAULT', instruction: 'ROUTE BOTH PAYLOADS TO THE VAULT',
        width: 4320, height: 1780,
        spawn: { x: slot === 1 ? 1660 : 1760, y: 1483 }, checkpoint: { x: slot === 1 ? 1660 : 1760, y: 1483 },
        upperCheckpoint: { x: slot === 1 ? 1120 : 1220, y: 733 },
        cubes: [{ id: 'cubeA', spawn: { x: 2760, y: 1478 }, mark: 'A' }, { id: 'cubeB', spawn: { x: 510, y: 1478 }, mark: 'B' }],
        plateB: { x: 2620, y: 350 }, plateC: { x: 2910, y: 350 },
        plates: [{ id: 'entry', at: { x: 1870, y: 1500 }, label: 'A', cameraReveal: { platformIds: ['crossing-anchor', 'return-bridge'], padding: 100 } },
            { id: 'routePower', at: { x: 1330, y: 750 }, label: 'ROUTE POWER', cameraReveal: upperView }],
        cubePads: [{ id: 'liftCargo', at: { x: 1750, y: 1500 }, label: 'PAYLOAD / LIFT' },
            { id: 'finalLeft', at: { x: 2620, y: 650 }, label: 'E' }, { id: 'finalRight', at: { x: 2910, y: 650 }, label: 'F' }],
        controls: [{ id: 'switchB', kind: 'toggle', at: { x: 2560, y: 1500 }, label: 'TRANSFER MODE',
                cameraReveal: { bounds: { x: 1950, y: 800, w: 2220, h: 720 }, padding: 45 } },
            { id: 'switchC', kind: 'terminal', at: { x: 1210, y: 750 }, label: 'SYSTEM ONLINE' },
            { id: 'routeMode', kind: 'toggle', at: { x: 1385, y: 750 }, label: 'ROUTE SELECT', cameraReveal: upperView },
            { id: 'switchD', kind: 'terminal', at: { x: 4200, y: 750 }, label: 'D / GALLERY ACCESS' }],
        display: { x: 1680, y: 1040 }, exit: { x: 2700, y: 210, w: 140, h: 140 },
        platforms: [
            stone('central-floor', 200, 1500, 1800, 280), stone('access-balcony', 2420, 1500, 1900, 280),
            stone('service-roof', 850, 1100, 400, 310),
            { ...stone('service-door', 1300, 1120, 36, 380), openWhen: 'serviceAccess', label: 'SERVICE' },
            stone('control-catwalk', 1010, 750, 430),
            stone('boost-gallery', 3600, 940, 720), stone('control-ledge', 4050, 750, 270),
            stone('vault-cargo-deck', 2550, 650, 430), stone('vault-crown', 2550, 350, 430),
            // Visible payload bays need opposite approaches. Open the bulkhead
            // with the final commit, then allow free recovery/assignment swaps.
            { ...stone('vault-divider', 2744, 382, 40, 300), openWhen: 'exitDoor', blocksCubeInteraction: true },
            // A low, unhookable recovery deck cannot power or bypass the upper routes.
            stone('route-recovery', 1660, 1120, 1940), stone('gallery-recovery-step', 3450, 1030, 160),
            { ...code('crossing-anchor', 2220, 1160, 160, 'grappleAnchor', 'A'), h: 60, anchor: true },
            code('return-bridge', 2000, 1500, 420, 'bridge', 'B'),
            // Local regrouping only: D does not energize either transport route.
            code('gallery-return-low', 3800, 850, 170, 'galleryAccess', 'D'),
            code('gallery-return-high', 3920, 770, 180, 'galleryAccess', 'D'),
            { ...code('gallery-launch', 4210, 650, 110, 'galleryAccess', 'D / LAUNCH'), hookable: false },
            { ...code('left1', 1465, 350, 150, 'leftRoute', 'LEFT / 1'), anchor: true, h: 32 },
            { ...code('crumbleA', 1915, 270, 150, 'leftRoute', 'LEFT / UNSTABLE'), kind: 'crumble-prototype', anchor: true, h: 32, hookCrumbleDelay: 1.65 },
            { ...code('left3', 2365, 350, 150, 'leftRoute', 'LEFT / 3'), anchor: true, h: 32 },
            { ...code('right1', 4025, 180, 150, 'rightRoute', 'RIGHT / 1'), anchor: true, h: 32 },
            { ...code('crumbleB', 3565, 150, 150, 'rightRoute', 'RIGHT / UNSTABLE'), kind: 'crumble-prototype', anchor: true, h: 32, hookCrumbleDelay: 1.65 },
            { ...code('right3', 3105, 300, 150, 'rightRoute', 'RIGHT / 3'), anchor: true, h: 32 },
            { ...code('vault-return', 1440, 750, 1000, 'vaultReturn', 'E + F / REGROUP'), hookable: false },
            { ...code('vault-return-step', 2380, 690, 180, 'vaultReturn', 'E + F'), hookable: false },
            // Opposite biometric approaches only receive power from both payloads.
            code('final-left-low', 2400, 560, 150, 'vaultPower', 'E + F'),
            code('final-left-high', 2380, 460, 160, 'vaultPower', 'E + F'),
            code('final-right-low', 2980, 560, 160, 'vaultPower', 'E + F'),
            code('final-right-high', 3000, 460, 160, 'vaultPower', 'E + F'),
        ],
        lifts: [{ id: 'central-lift', x: 1440, y: 710, w: 220, h: 790, signal: 'liftField' }],
        gates: [{ id: 'transfer', signal: 'relayGates', gates: [
            { id: 'R1', x: 280, y: 1390, w: 56, h: 110, exitSide: 1 },
            { id: 'R2', x: 3680, y: 855, w: 56, h: 85, exitSide: 1 },
        ] }],
        // Player height 34 fits below the core; a resting 44-high or overhead
        // payload intersects it. The long roofed passage prevents jumping cargo over.
        firewalls: [{ id: 'service-filter', x: 850, y: 1452, orientation: 'horizontal', length: 400, thickness: 12 }],
        hazards: [{ x: 0, y: 1710, w: 4320, h: 70 }],
        regions: [{ at: { x: 1600, y: 1390 }, label: 'CROSSFEED' }, { at: { x: 2510, y: 1390 }, label: 'ACCESS' },
            { at: { x: 360, y: 1270 }, label: 'SERVICE' }, { at: { x: 1080, y: 650 }, label: 'CONTROL' },
            { at: { x: 3690, y: 690 }, label: 'GALLERY' }, { at: { x: 2690, y: 105 }, label: 'VAULT' }],
    };
    const elbow = (from: { x: number; y: number }, to: { x: number; y: number }, y: number) => [from, { x: from.x, y }, { x: to.x, y }, to];
    const add = (id: string, input: import('../slice/connections.ts').MachineConnection['input'], output: Platform['signal'], from: { x: number; y: number }, to: { x: number; y: number }, y: number, inverted = false) =>
        room.wires!.push({ id, input, output: output!, points: elbow(from, to, y), inverted });
    room.wires = [];
    add('entry-anchor', 'plateA', 'grappleAnchor', { x: 1870, y: 1488 }, { x: 2300, y: 1160 }, 1350);
    add('transfer-bridge', 'switchB', 'bridge', { x: 2560, y: 1464 }, { x: 2220, y: 1500 }, 1400);
    for (const gate of room.gates![0].gates) add(`transfer-${gate.id}`, 'switchB', 'relayGates', { x: 2560, y: 1464 }, { x: gate.x, y: gate.y }, 1070, true);
    add('cargo-lift', 'cubeOnPlate', 'liftField', { x: 1750, y: 1488 }, { x: 1550, y: 1460 }, 1410);
    add('system-lift', 'switchC', 'liftField', { x: 1210, y: 714 }, { x: 1550, y: 710 }, 670);
    add('system-service', 'switchC', 'serviceAccess', { x: 1210, y: 714 }, { x: 1318, y: 1120 }, 1060);
    for (const p of room.platforms.filter(p => p.signal === 'leftRoute' || p.signal === 'rightRoute'))
        add(`route-${p.id}`, 'switchC', p.signal, { x: 1385, y: 714 }, { x: p.x + p.w / 2, y: p.y }, p.signal === 'leftRoute' ? 80 : 45, p.signal === 'leftRoute');
    add('gallery-access', 'switchD', 'galleryAccess', { x: 4200, y: 714 }, { x: 3880, y: 850 }, 690);
    for (const p of room.platforms.filter(p => p.signal === 'vaultPower' || p.signal === 'vaultReturn'))
        add(`vault-${p.id}`, 'cubeOnPlateB', p.signal, { x: 2770, y: 638 }, { x: p.x + p.w / 2, y: p.y }, 610);
    for (const [x, input] of [[2620, 'plateB'], [2910, 'plateC']] as const)
        add(`exit-${input}`, input, 'exitDoor', { x, y: 338 }, { x: 2770, y: 210 }, 160);
    return room;
}
