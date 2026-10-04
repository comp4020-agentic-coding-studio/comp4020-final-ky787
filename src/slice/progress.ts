import { ROOM_IDS, type RoomId } from './controller.ts';
export interface RoomMemory {
    /** RELAY's lever locks ON permanently; SWITCH remains a toggle. */
    switchB: boolean;
    cubeOnPlate: boolean;
    cubeOnPlateB: boolean;
    checkpoint: 'entry' | 'relay';
}
export interface Progress {
    version: 2;
    currentRoom: RoomId;
    completedRooms: RoomId[];
    rooms: Record<RoomId, RoomMemory>;
    mechanics: string[];
    history: { room: RoomId; event: string; at: string }[];
}
export const EVENTS = ['carry', 'plate', 'switch', 'grapple', 'cube-pull', 'bridge', 'crumble', 'checkpoint', 'death', 'complete', 'cube-return'];
export function freshProgress(): Progress {
    return { version: 2, currentRoom: 'pressure', completedRooms: [],
        rooms: Object.fromEntries(ROOM_IDS.map(id => [id, { switchB: false, cubeOnPlate: false, cubeOnPlateB: false, checkpoint: 'entry' }])) as Progress['rooms'],
        mechanics: [], history: [] };
}
function validShape(value: unknown, version: 1 | 2): boolean {
    if (!value || typeof value !== 'object') return false;
    const p = value as Progress;
    return (p.version as number) === version && ROOM_IDS.includes(p.currentRoom)
        && Array.isArray(p.completedRooms) && p.completedRooms.length <= 3 && p.completedRooms.every(r => ROOM_IDS.includes(r))
        && !!p.rooms && ROOM_IDS.every(id => {
            const m = p.rooms[id];
            return m && typeof m.switchB === 'boolean' && typeof m.cubeOnPlate === 'boolean'
                && (version === 1 || (typeof m.cubeOnPlateB === 'boolean' && !(m.cubeOnPlate && m.cubeOnPlateB)
                    && (!m.cubeOnPlateB || (id === 'relay' && m.switchB))))
                && (m.checkpoint === 'entry' || (id === 'relay' && m.checkpoint === 'relay' && m.switchB));
        }) && Array.isArray(p.mechanics) && p.mechanics.length <= EVENTS.length && p.mechanics.every(e => EVENTS.includes(e))
        && Array.isArray(p.history) && p.history.length <= 40 && p.history.every(e => e && ROOM_IDS.includes(e.room)
            && EVENTS.includes(e.event) && typeof e.at === 'string' && e.at.length <= 30 && Number.isFinite(Date.parse(e.at)));
}
export function validProgress(value: unknown): value is Progress { return validShape(value, 2); }
/** Upgrade existing visitors in memory; the next acknowledged save writes version 2. */
export function readProgress(value: unknown): Progress | null {
    if (validProgress(value)) return value;
    if (!validShape(value, 1)) return null;
    const old = value as Omit<Progress, 'version'> & { version: 1 };
    return { ...old, version: 2, rooms: Object.fromEntries(ROOM_IDS.map(id => [id, {
        ...old.rooms[id], cubeOnPlateB: false,
    }])) as Progress['rooms'] };
}
