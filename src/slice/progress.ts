import { ROOM_IDS, type RoomId } from "./controller.ts";
export interface RoomMemory {
    switchB: boolean;
    cubeOnPlate: boolean;
    checkpoint: "entry" | "relay";
}
export interface Progress {
    version: 1;
    currentRoom: RoomId;
    completedRooms: RoomId[];
    rooms: Record<RoomId, RoomMemory>;
    mechanics: string[];
    history: {
        room: RoomId;
        event: string;
        at: string;
    }[];
}
export const EVENTS = ["carry", "plate", "switch", "grapple", "cube-pull", "bridge", "crumble", "checkpoint", "death", "complete", "cube-return"];
export function freshProgress(): Progress {
    return { version: 1, currentRoom: "pressure", completedRooms: [],
        rooms: Object.fromEntries(ROOM_IDS.map(id => [id, { switchB: false, cubeOnPlate: false, checkpoint: "entry" }])) as Progress["rooms"],
        mechanics: [], history: [] };
}
/** Strict storage boundary; schema-versioned for later room/shared-state adapters. */
export function validProgress(value: unknown): value is Progress {
    if (!value || typeof value !== "object")
        return false;
    const p = value as Progress;
    return p.version === 1 && ROOM_IDS.includes(p.currentRoom)
        && Array.isArray(p.completedRooms) && p.completedRooms.length <= 3 && p.completedRooms.every(r => ROOM_IDS.includes(r))
        && !!p.rooms && ROOM_IDS.every(id => {
        const m = p.rooms[id];
        return m && typeof m.switchB === "boolean" && typeof m.cubeOnPlate === "boolean"
            && (m.checkpoint === "entry" || (id === "relay" && m.checkpoint === "relay" && m.switchB));
    }) && Array.isArray(p.mechanics) && p.mechanics.length <= EVENTS.length && p.mechanics.every(e => EVENTS.includes(e))
        && Array.isArray(p.history) && p.history.length <= 40 && p.history.every(e => e && ROOM_IDS.includes(e.room)
        && EVENTS.includes(e.event) && typeof e.at === "string" && e.at.length <= 30 && Number.isFinite(Date.parse(e.at)));
}
