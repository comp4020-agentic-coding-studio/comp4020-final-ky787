import type { Box } from '../engine/geometry.ts';
import type { EnvironmentalChamber } from '../coop/environmental-types.ts';

/** Authored decoration and wording only; never geometry or native instruction data. */
export interface EnvironmentalBlock extends Box {
    output: string;
    target: string;
    group: string;
    label: string;
    on: string;
    off: string;
    hazard?: boolean;
    excerpt: 'compare' | 'boolean' | 'branch' | 'store';
}

/** Stable local rectangles. A shared group name adds no frame, links or runtime layout. */
export const ENVIRONMENTAL_BLOCKS: Record<EnvironmentalChamber, readonly EnvironmentalBlock[]> = {
    handshake: [
        { output: 'crossingPower', target: 'nearAnchor', group: 'crossing', x: 675, y: 805, w: 328, h: 124,
            label: 'CROSSING', on: 'POWERED', off: 'IDLE', excerpt: 'compare' },
        { output: 'liftPower', target: 'serviceLift', group: 'service-lift', x: 1080, y: 290, w: 328, h: 124,
            label: 'SERVICE LIFT', on: 'ACTIVE', off: 'INACTIVE', excerpt: 'branch' },
        { output: 'relayPower', target: 'lowerRelay', group: 'service-relay', x: 1788, y: 610, w: 280, h: 124,
            label: 'SERVICE RELAY', on: 'AVAILABLE', off: 'UNAVAILABLE', excerpt: 'store' },
        { output: 'exitReady', target: 'exit', group: 'exit', x: 2140, y: 610, w: 280, h: 124,
            label: 'EXIT', on: 'UNLOCKED', off: 'LOCKED', excerpt: 'boolean' },
    ],
    'crossfeed-vault': [
        { output: 'grappleAnchor', target: 'crossing-anchor', group: 'crossing', x: 2580, y: 1200, w: 328, h: 124,
            label: 'CROSSING ANCHOR', on: 'POWERED', off: 'IDLE', excerpt: 'compare' },
        { output: 'bridge', target: 'return-bridge', group: 'lower-return', x: 2050, y: 1540, w: 328, h: 124,
            label: 'RETURN CROSSING', on: 'ACTIVE', off: 'INACTIVE', excerpt: 'store' },
        { output: 'liftField', target: 'central-lift', group: 'cargo-lift', x: 1760, y: 1165, w: 328, h: 124,
            label: 'CARGO LIFT', on: 'ACTIVE', off: 'INACTIVE', excerpt: 'boolean' },
        { output: 'relayGates', target: 'transfer', group: 'transfer-relay', x: 340, y: 1320, w: 328, h: 124,
            label: 'TRANSFER RELAY', on: 'AVAILABLE', off: 'UNAVAILABLE', excerpt: 'branch' },
        { output: 'leftRoute', target: 'left1', group: 'left-route', x: 1420, y: 405, w: 328, h: 124,
            label: 'LEFT ROUTE', on: 'POWERED', off: 'IDLE', excerpt: 'boolean' },
        { output: 'rightRoute', target: 'right1', group: 'gallery', x: 3800, y: 260, w: 328, h: 124,
            label: 'RIGHT ROUTE', on: 'POWERED', off: 'IDLE', excerpt: 'branch' },
        { output: 'galleryAccess', target: 'gallery-return-low', group: 'gallery', x: 3800, y: 470, w: 328, h: 124,
            label: 'GALLERY ACCESS', on: 'OPEN', off: 'CLOSED', excerpt: 'compare' },
        { output: 'vaultPower', target: 'final-left-low', group: 'final-vault', x: 2500, y: 815, w: 328, h: 124,
            label: 'VAULT APPROACH', on: 'POWERED', off: 'IDLE', excerpt: 'branch' },
        { output: 'vaultReturn', target: 'vault-return', group: 'vault-return', x: 1940, y: 800, w: 328, h: 124,
            label: 'REGROUP BRIDGE', on: 'ACTIVE', off: 'INACTIVE', excerpt: 'store' },
        { output: 'serviceAccess', target: 'service-door', group: 'service-passage', x: 900, y: 880, w: 328, h: 124,
            label: 'SERVICE PASSAGE', on: 'OPEN', off: 'CLOSED', excerpt: 'boolean' },
    ],
    deadlock: [
        { output: 'cargoLift', target: 'cargoField', group: 'lower-cargo', x: 780, y: 2830, w: 328, h: 124,
            label: 'CARGO LIFT', on: 'ACTIVE', off: 'INACTIVE', excerpt: 'branch' },
        { output: 'shaftFirewall', target: 'shaftBeam', group: 'shaft-interlock', x: 220, y: 2320, w: 328, h: 124,
            label: 'SHAFT', on: 'BLOCKED', off: 'CLEAR', hazard: true, excerpt: 'compare' },
        { output: 'serviceRelay', target: 'serviceUpper', group: 'completion', x: 760, y: 650, w: 328, h: 124,
            label: 'SERVICE RELAY', on: 'AVAILABLE', off: 'UNAVAILABLE', excerpt: 'boolean' },
        { output: 'hatchOpen', target: 'hatch', group: 'hatch', x: 250, y: 1080, w: 328, h: 124,
            label: 'HATCH', on: 'OPEN', off: 'CLOSED', excerpt: 'store' },
        { output: 'payloadReady', target: 'exit', group: 'completion', x: 1150, y: 650, w: 328, h: 124,
            label: 'EXIT', on: 'UNLOCKED', off: 'LOCKED', excerpt: 'branch' },
    ],
    'use-after-free': [
        { output: 'routeA', target: 'a2', group: 'route-a', x: 690, y: 1798, w: 328, h: 124,
            label: 'ROUTE A', on: 'POWERED', off: 'IDLE', excerpt: 'compare' },
        { output: 'routeB', target: 'b1', group: 'route-b', x: 1000, y: 1420, w: 328, h: 124,
            label: 'ROUTE B', on: 'POWERED', off: 'IDLE', excerpt: 'branch' },
        { output: 'routeC', target: 'c1', group: 'route-c', x: 650, y: 1420, w: 328, h: 124,
            label: 'ROUTE C', on: 'POWERED', off: 'IDLE', excerpt: 'boolean' },
        { output: 'launchPower', target: 'lowerLift', group: 'launch', x: 1240, y: 2130, w: 328, h: 124,
            label: 'LAUNCH LIFT', on: 'ACTIVE', off: 'INACTIVE', excerpt: 'store' },
        { output: 'assistBlocked', target: 'finalLift', group: 'assist', x: 1500, y: 1450, w: 280, h: 124,
            label: 'ASSIST LIFT', on: 'ACTIVE', off: 'INACTIVE', excerpt: 'branch' },
        { output: 'exitReady', target: 'exit', group: 'summit', x: 1430, y: 590, w: 328, h: 124,
            label: 'EXIT', on: 'UNLOCKED', off: 'LOCKED', excerpt: 'compare' },
    ],
};
