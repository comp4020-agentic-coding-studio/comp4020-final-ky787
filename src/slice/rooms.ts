import { CUBE_SIZE } from './tuning.ts';
import type { Box, Vec2 } from "../engine/geometry.ts";
import type { ControllerOutputs, RoomId } from "./controller.ts";
import type { LiftFieldDef, RelayGatePairDef } from './machinery.ts';
export interface Platform extends Box {
    id: string;
    kind: "static" | "code" | "crumble-prototype" | "crumble-proven";
    evidenceId?: string;
    /** Authored manifestation of an existing exported binding, never a new native block. */
    assemblyBinding?: string;
    listingOffsetX?: number;
    signal?: keyof ControllerOutputs;
    anchor?: boolean;
    label?: string;
}
export interface RoomDef {
    id: RoomId;
    title: string;
    instruction: string;
    width: number;
    height: number;
    spawn: Vec2;
    checkpoint: Vec2;
    cube?: Vec2;
    plate?: Vec2;
    plateB?: Vec2;
    plateC?: Vec2;
    lever?: Vec2;
    upperLever?: Vec2;
    upperCheckpoint?: Vec2;
    cargoRecovery?: Vec2;
    lifts?: LiftFieldDef[];
    gates?: RelayGatePairDef[];
    platforms: Platform[];
    hazards: Box[];
    exit: Box;
    display: Vec2;
}
const floor = (id: string, x: number, y: number, w: number, h = 160): Platform => ({ id, x, y, w, h, kind: "static" });
export const ROOMS: readonly RoomDef[] = [
    {
        id: "pressure", title: "PRESSURE", instruction: "PUT THE CUBE ON THE BUTTON",
        width: 1250, height: 720, spawn: { x: 140, y: 543 }, checkpoint: { x: 140, y: 543 },
        cube: { x: 310, y: 560 - CUBE_SIZE / 2 }, plate: { x: 610, y: 560 }, display: { x: 760, y: 340 },
        platforms: [floor("floor", 0, 560, 1250)], hazards: [],
        exit: { x: 1130, y: 420, w: 60, h: 140 },
    },
    {
        id: "switch", title: "SWITCH", instruction: "FLIP THE SWITCH. WAKE THE ANCHOR.",
        width: 1420, height: 780, spawn: { x: 130, y: 543 }, checkpoint: { x: 130, y: 543 },
        lever: { x: 300, y: 560 }, display: { x: 100, y: 265 },
        platforms: [floor("near", 0, 560, 460, 240), floor("far", 880, 560, 540, 240),
            { id: "anchor", kind: "code", x: 690, y: 220, w: 160, h: 60, signal: "grappleAnchor", anchor: true, label: "ANCHOR" }],
        hazards: [{ x: 460, y: 695, w: 420, h: 100 }],
        exit: { x: 1300, y: 420, w: 60, h: 140 },
    },
    {
        id: "relay", title: "RELAY", instruction: "HOLD A. LOCK THE BRIDGE. MOVE THE CUBE TO B.",
        width: 2000, height: 800, spawn: { x: 130, y: 543 }, checkpoint: { x: 1050, y: 543 },
        cube: { x: 260, y: 560 - CUBE_SIZE / 2 }, plate: { x: 375, y: 560 }, plateB: { x: 1270, y: 470 }, lever: { x: 1080, y: 560 },
        display: { x: 950, y: 175 },
        platforms: [floor("near", 0, 560, 480, 240), floor("far", 920, 560, 260, 240),
            floor("recovery", 1180, 650, 820), floor("recovery-step", 1160, 550, 140, 100),
            floor("exit-shelf", 1660, 350, 340, 450),
            { id: "anchor", kind: "code", x: 700, y: 220, w: 160, h: 60, signal: "grappleAnchor", anchor: true, label: "RELAY A" },
            { id: "bridge", kind: "code", x: 480, y: 560, w: 440, h: 20, signal: "bridge", label: "RETURN BRIDGE" },
            { id: "step-a", kind: "code", x: 1140, y: 470, w: 210, h: 32, signal: "codePlatformA", label: "PATH 01" },
            { id: "step-b", kind: "code", x: 1430, y: 410, w: 165, h: 32, signal: "codePlatformB", label: "PATH 02" },
            { id: "inactive", kind: "code", x: 1260, y: 320, w: 130, h: 32, label: "NO SIGNAL" },
            { id: "crumble", kind: "crumble-prototype", x: 1360, y: 520, w: 140, h: 32, label: "UNSTABLE" }],
        hazards: [{ x: 480, y: 710, w: 440, h: 100 }],
        exit: { x: 1870, y: 210, w: 60, h: 140 },
    },
    {
        id: 'uplink', title: 'CONTROL SPINE', instruction: 'ROUTE THE PAYLOAD TO THE CORE NODE',
        width: 3540, height: 1100,
        spawn: { x: 245, y: 843 }, checkpoint: { x: 1130, y: 843 }, upperCheckpoint: { x: 1980, y: 243 },
        cube: { x: 380, y: 838 }, cargoRecovery: { x: 1400, y: 838 },
        plate: { x: 320, y: 860 }, plateB: { x: 1510, y: 860 }, plateC: { x: 3310, y: 260 },
        lever: { x: 1140, y: 860 }, upperLever: { x: 1970, y: 260 }, display: { x: 1110, y: 545 },
        // The raised right-hand machine plinth prevents reaching upper code from the lower wing.
        // All three RETURN sections are manifestations of ONE retained codePlatformB output.
        platforms: [floor('near', 0, 860, 480, 240), floor('far', 960, 860, 1300, 240),
            floor('upper-deck', 1870, 260, 260, 32), floor('node-deck', 2790, 260, 750, 32),
            floor('uplink-deck', 0, 170, 360, 32),
            floor('payload-recovery', 2260, 490, 1280, 610), floor('recovery-step', 2120, 385, 170, 105),
            { id: 'anchor', kind: 'code', x: 700, y: 520, w: 160, h: 60, signal: 'grappleAnchor', anchor: true, label: 'PLATE A / ANCHOR' },
            { id: 'service', kind: 'code', x: 2260, y: 280, w: 420, h: 28, signal: 'codePlatformA', label: 'SERVICE / A' },
            { id: 'upper-route', kind: 'code', x: 1990, y: 170, w: 830, h: 28, signal: 'codePlatformB', listingOffsetX: -95, label: 'RETURN / B · 01' },
            { id: 'return-mid', kind: 'code', x: 1200, y: 170, w: 680, h: 28, signal: 'codePlatformB', assemblyBinding: 'payload-route-display', label: 'RETURN / B · 02' },
            { id: 'return-near', kind: 'code', x: 470, y: 170, w: 620, h: 28, signal: 'codePlatformB', assemblyBinding: 'payload-route-display', label: 'RETURN / B · 03' },
            // A tempting lower shortcut between service and core; crumble lands on the plinth.
            { id: 'proven-clone', kind: 'crumble-proven', evidenceId: 'bcf_clone_originalBB71alteredBB', x: 2670, y: 330, w: 200, h: 28, label: 'UNSTABLE' }],
        lifts: [{ id: 'lift', x: 1630, y: 150, w: 240, h: 710, signal: 'liftField' }],
        gates: [{ id: 'R1', signal: 'relayGates', gates: [
            { id: 'A', x: 120, y: 750, w: 56, h: 110, exitSide: 1 },
            { id: 'B', x: 1300, y: 750, w: 56, h: 110, exitSide: 1 },
        ] }],
        hazards: [{ x: 480, y: 1010, w: 480, h: 90 }],
        exit: { x: 210, y: 30, w: 60, h: 140 },
    },
];
export function roomById(id: RoomId): RoomDef { return ROOMS.find(r => r.id === id)!; }
