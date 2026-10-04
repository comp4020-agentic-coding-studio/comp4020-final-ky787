import { CUBE_SIZE } from './tuning.ts';
import type { Box, Vec2 } from "../engine/geometry.ts";
import type { ControllerOutputs, RoomId } from "./controller.ts";
export interface Platform extends Box {
    id: string;
    kind: "static" | "code" | "crumble-prototype";
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
    lever?: Vec2;
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
];
export function roomById(id: RoomId): RoomDef { return ROOMS.find(r => r.id === id)!; }
