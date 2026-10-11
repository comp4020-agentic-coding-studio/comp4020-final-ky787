import type { RoomDef } from '../slice/rooms.ts';
import type { CoopLevelId, Slot } from './protocol.ts';
import { pairingBay } from './pairing-bay.ts';
import { crossfeedVault } from './crossfeed-vault.ts';

/** Hand-authored co-op rooms: accepted mechanics labs and the provisional chamber. */
export const COOP_LABS: Record<CoopLevelId, { title: string; description: string; room: (slot: Slot) => RoomDef }> = {
    'crossfeed-vault': { title: 'CROSSFEED VAULT', description: 'First full cooperative puzzle', room: crossfeedVault },
    'pairing-bay': { title: 'PAIRING BAY', description: 'Shared inputs, cube handoff, two-player finish', room: pairingBay },
    'firewall-lab': { title: 'FIREWALL LAB', description: 'Static beams, local respawn, shared cube recovery', room: slot => ({
        id: 'firewall-lab', title: 'FIREWALL LAB', instruction: 'BEAMS STAY LIVE. TEST THE CUBE, THEN REGROUP.',
        width: 1450, height: 800, spawn: { x: slot === 1 ? 90 : 180, y: 623 }, checkpoint: { x: slot === 1 ? 130 : 220, y: 623 },
        cube: { x: 280, y: 618 }, lever: { x: 110, y: 640 }, display: { x: 1040, y: 340 },
        exit: { x: 1260, y: 500, w: 130, h: 140 },
        platforms: [
            { id: 'floor', kind: 'static', x: 0, y: 640, w: 1450, h: 160 },
            { id: 'drop-perch', kind: 'static', x: 320, y: 540, w: 120, h: 20 },
            { id: 'safe-overpass', kind: 'static', x: 480, y: 450, w: 180, h: 20 },
        ],
        firewalls: [
            { id: 'horizontal-test', x: 460, y: 560, orientation: 'horizontal', length: 150 },
            { id: 'vertical-test', x: 860, y: 560, orientation: 'vertical', length: 80, thickness: 16 },
        ],
        hazards: [],
    }) },
    'boost-lab': { title: 'BOOST LAB', description: 'Hold the cube. Boost your partner. Swap roles.', room: slot => ({
        id: 'boost-lab', title: 'BOOST LAB', instruction: 'USE THE CUBE TO REACH THE UPPER ROUTE',
        width: 1150, height: 760, spawn: { x: slot === 1 ? 110 : 200, y: 583 }, checkpoint: { x: slot === 1 ? 110 : 200, y: 583 },
        cube: { x: 300, y: 578 }, lever: { x: 720, y: 410 }, display: { x: 820, y: 540 },
        exit: { x: 950, y: 270, w: 130, h: 140 },
        platforms: [
            { id: 'floor', kind: 'static', x: 0, y: 600, w: 1150, h: 160 },
            // 190 above the floor; held cube top is 82 up, then a normal held jump.
            { id: 'upper', kind: 'static', x: 550, y: 410, w: 600, h: 32 },
            { id: 'return-step-low', kind: 'code', x: 280, y: 510, w: 150, h: 24, signal: 'bridge', label: 'RETURN STEP' },
            { id: 'return-step-high', kind: 'code', x: 430, y: 430, w: 150, h: 24, signal: 'bridge', label: 'UPPER ROUTE' },
        ],
        hazards: [],
    }) },
    'relay-lab': { title: 'RELAY LAB', description: 'Player and cube relay synchronization', room: slot => ({
        id: 'relay-lab', title: 'RELAY LAB', instruction: 'POWER THE RELAY. TAKE YOUR PARTNER AND CUBE THROUGH.',
        width: 1500, height: 760, spawn: { x: slot === 1 ? 110 : 200, y: 543 }, checkpoint: { x: slot === 1 ? 110 : 200, y: 543 },
        cube: { x: 280, y: 538 }, lever: { x: 380, y: 560 }, display: { x: 750, y: 245 },
        exit: { x: 1320, y: 500, w: 130, h: 140 },
        platforms: [
            { id: 'start', kind: 'static', x: 0, y: 560, w: 570, h: 200 },
            // Cargo falls clear of the fixed relay exit; jump into B for a return trip.
            { id: 'target', kind: 'static', x: 940, y: 640, w: 560, h: 120 },
        ],
        gates: [{ id: 'lab-relay', signal: 'relayGates', gates: [
            { id: 'A', x: 470, y: 450, w: 56, h: 110, exitSide: -1 },
            { id: 'B', x: 980, y: 450, w: 56, h: 110, exitSide: 1 },
        ] }],
        hazards: [{ x: 570, y: 675, w: 370, h: 85 }],
    }) },
    'lift-lab': { title: 'LIFT LAB', description: 'Shared vertical transport and checkpoints', room: slot => ({
        id: 'lift-lab', title: 'LIFT LAB', instruction: 'HOLD BELOW. RIDE UP. LATCH THE LIFT FOR BOTH.',
        width: 1250, height: 1000, spawn: { x: slot === 1 ? 130 : 240, y: 823 }, checkpoint: { x: slot === 1 ? 130 : 240, y: 823 },
        upperCheckpoint: { x: slot === 1 ? 790 : 885, y: 343 },
        cube: { x: 355, y: 818 }, plate: { x: 440, y: 840 }, upperLever: { x: 800, y: 360 }, display: { x: 820, y: 560 },
        exit: { x: 1060, y: 220, w: 130, h: 140 },
        platforms: [
            { id: 'lower', kind: 'static', x: 0, y: 840, w: 1010, h: 160 },
            { id: 'upper', kind: 'static', x: 750, y: 360, w: 500, h: 32 },
        ],
        lifts: [{ id: 'lab-lift', x: 530, y: 320, w: 220, h: 520, signal: 'liftField' }],
        hazards: [{ x: 1010, y: 920, w: 240, h: 80 }],
    }) },
    'crumble-lab': { title: 'CRUMBLE LAB', description: 'Shared unstable platforms: step and hook', room: slot => ({
        id: 'crumble-lab', title: 'CRUMBLE LAB', instruction: 'TEST A STEP AND A HOOK. THEN REGROUP AT THE EXIT.',
        width: 1450, height: 780, spawn: { x: slot === 1 ? 120 : 220, y: 543 }, checkpoint: { x: slot === 1 ? 120 : 220, y: 543 },
        display: { x: 780, y: 180 }, exit: { x: 1270, y: 420, w: 130, h: 140 },
        platforms: [
            { id: 'start', kind: 'static', x: 0, y: 560, w: 430, h: 220 },
            { id: 'catch', kind: 'static', x: 640, y: 560, w: 810, h: 220 },
            { id: 'crumbleA', kind: 'crumble-prototype', x: 430, y: 560, w: 210, h: 28, hookCrumbleDelay: 1.65, label: 'SYNC CRUMBLE / STEP' },
            { id: 'crumbleB', kind: 'crumble-prototype', x: 860, y: 315, w: 230, h: 28, hookCrumbleDelay: 1.65, label: 'UNSTABLE TEST / HOOK' },
        ],
        hazards: [{ x: 430, y: 695, w: 210, h: 85 }],
    }) },
};
