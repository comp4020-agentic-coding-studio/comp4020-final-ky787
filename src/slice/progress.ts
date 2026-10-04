import { ROOM_IDS, type RoomId } from './controller.ts';
export interface RoomMemory {
    /** RELAY's bridge locks ON; SWITCH and UPLINK's relay power are toggles. */
    switchB: boolean;
    cubeOnPlate: boolean;
    cubeOnPlateB: boolean;
    checkpoint: 'entry' | 'relay' | 'upper';
    /** UPLINK-only logical state; absent in the unchanged tutorial memories. */
    switchC?: boolean;
    cubeOnPlateC?: boolean;
    cubeTransferred?: boolean;
}
export interface Progress {
    version: 3;
    currentRoom: RoomId;
    completedRooms: RoomId[];
    rooms: Record<RoomId, RoomMemory>;
    mechanics: string[];
    history: { room: RoomId; event: string; at: string }[];
}
export const EVENTS = ['carry', 'plate', 'switch', 'grapple', 'cube-pull', 'bridge', 'crumble', 'checkpoint', 'death', 'complete', 'cube-return', 'relay-power', 'teleport', 'relay-cargo', 'lift', 'lift-latch', 'payload'];
const TUTORIALS = ['pressure', 'switch', 'relay'] as const;
export function freshProgress(): Progress {
    return { version: 3, currentRoom: 'pressure', completedRooms: [],
        rooms: Object.fromEntries(ROOM_IDS.map(id => [id, { switchB: false, cubeOnPlate: false, cubeOnPlateB: false, checkpoint: 'entry',
            ...(id === 'uplink' ? { switchC: false, cubeOnPlateC: false, cubeTransferred: false } : {}) }])) as Progress['rooms'],
        mechanics: [], history: [] };
}
function validShape(value: unknown, version: 1 | 2 | 3): boolean {
    if (!value || typeof value !== 'object') return false;
    const p = value as Progress;
    const ids: readonly RoomId[] = version === 3 ? ROOM_IDS : TUTORIALS;
    return (p.version as number) === version && ids.includes(p.currentRoom)
        && Array.isArray(p.completedRooms) && p.completedRooms.length <= ids.length && p.completedRooms.every(r => ids.includes(r))
        && new Set(p.completedRooms).size === p.completedRooms.length
        && !!p.rooms && ids.every(id => {
            const m = p.rooms[id];
            if (!m || typeof m.switchB !== 'boolean' || typeof m.cubeOnPlate !== 'boolean') return false;
            if (version !== 1 && (typeof m.cubeOnPlateB !== 'boolean' || (m.cubeOnPlate && m.cubeOnPlateB))) return false;
            if (id === 'uplink') {
                return typeof m.switchC === 'boolean' && typeof m.cubeOnPlateC === 'boolean' && typeof m.cubeTransferred === 'boolean'
                    && [m.cubeOnPlate, m.cubeOnPlateB, m.cubeOnPlateC].filter(Boolean).length <= 1
                    && (!(m.cubeOnPlateB || m.cubeOnPlateC) || m.cubeTransferred)
                    && (!m.cubeOnPlateC || m.switchC)
                    && (m.checkpoint === 'entry' || m.checkpoint === 'relay' || (m.checkpoint === 'upper' && m.switchC));
            }
            return (version === 1 || !m.cubeOnPlateB || (id === 'relay' && m.switchB))
                && (m.checkpoint === 'entry' || (id === 'relay' && m.checkpoint === 'relay' && m.switchB));
        }) && Array.isArray(p.mechanics) && p.mechanics.length <= EVENTS.length && p.mechanics.every(e => EVENTS.includes(e))
        && Array.isArray(p.history) && p.history.length <= 40 && p.history.every(e => e && ids.includes(e.room)
            && EVENTS.includes(e.event) && typeof e.at === 'string' && e.at.length <= 30 && Number.isFinite(Date.parse(e.at)));
}
export function validProgress(value: unknown): value is Progress { return validShape(value, 3); }
/** Pure migration: preserve old logical state, add UPLINK and make it available to finishers. */
export function readProgress(value: unknown): Progress | null {
    if (validProgress(value)) return value;
    const v1 = validShape(value, 1);
    if (!v1 && !validShape(value, 2)) return null;
    const old = value as Progress;
    const rooms = freshProgress().rooms;
    for (const id of TUTORIALS) rooms[id] = { ...old.rooms[id], ...(v1 ? { cubeOnPlateB: false } : {}) };
    return { ...old, version: 3, rooms,
        currentRoom: TUTORIALS.every(id => old.completedRooms.includes(id)) ? 'uplink' : old.currentRoom };
}
