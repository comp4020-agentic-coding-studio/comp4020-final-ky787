import type { Plate, SharedRoom } from '../src/coop/protocol.ts';
import { CODE_PATTERN } from '../src/coop/protocol.ts';
import { UUID } from './identity.ts';
interface BaseRecord {
    code: string; level: 'pairing-bay'; revision: number;
    visitors: [string, string | null];
    switchB: boolean; checkpoint: 'entry' | 'reunion'; completed: boolean;
    createdAt: string; updatedAt: string;
}
export interface RoomRecord extends BaseRecord {
    version: 2;
    exitUnlocked: boolean;
    reachedExit: [boolean, boolean];
}
function validBase(v: unknown, code: string): v is BaseRecord {
    if (!v || typeof v !== 'object') return false;
    const r = v as BaseRecord;
    return r.code === code && CODE_PATTERN.test(code) && r.level === 'pairing-bay'
        && Number.isSafeInteger(r.revision) && r.revision >= 0
        && Array.isArray(r.visitors) && r.visitors.length === 2 && UUID.test(r.visitors[0])
        && (r.visitors[1] === null || UUID.test(r.visitors[1]) && r.visitors[1] !== r.visitors[0])
        && typeof r.switchB === 'boolean' && r.checkpoint === (r.switchB ? 'reunion' : 'entry')
        && typeof r.completed === 'boolean' && (!r.completed || r.switchB)
        && typeof r.createdAt === 'string' && Number.isFinite(Date.parse(r.createdAt))
        && typeof r.updatedAt === 'string' && Number.isFinite(Date.parse(r.updatedAt));
}
export function validRecord(v: unknown, code: string): v is RoomRecord {
    if (!validBase(v, code)) return false;
    const r = v as RoomRecord;
    return r.version === 2 && typeof r.exitUnlocked === 'boolean'
        && (!r.exitUnlocked || r.switchB && r.visitors[1] !== null)
        && Array.isArray(r.reachedExit) && r.reachedExit.length === 2 && r.reachedExit.every(v => typeof v === 'boolean')
        && (!r.reachedExit.some(Boolean) || r.exitUnlocked)
        && r.completed === r.reachedExit.every(Boolean);
}
/** V1 completion meant solving the plates, not physically reaching the exit. */
export function readRoomRecord(v: unknown, code: string): RoomRecord | null {
    if (!validBase(v, code)) return null;
    if ('version' in v && v.version === 1) {
        const migrated = { ...v, version: 2, exitUnlocked: v.completed, reachedExit: [false, false], completed: false };
        return validRecord(migrated, code) ? migrated : null;
    }
    return validRecord(v, code) ? v : null;
}
export function sharedRoom(record: RoomRecord, connected: [boolean, boolean], plates: [Plate, Plate]): SharedRoom {
    const held = plates.map((p, i) => connected[i] ? p : null);
    const inputs = { plateAOccupied: held.includes('plateA'), switchB: record.switchB,
        finalPlateLeftOccupied: held.includes('finalLeft'), finalPlateRightOccupied: held.includes('finalRight') };
    return { code: record.code, level: record.level, revision: record.revision,
        assigned: [true, record.visitors[1] !== null], connected, inputs,
        outputs: { grappleAnchor: inputs.plateAOccupied, returnBridge: record.switchB, exitDoor: record.exitUnlocked },
        checkpoint: record.checkpoint, exitUnlocked: record.exitUnlocked, reachedExit: [...record.reachedExit], completed: record.completed };
}
export function acceptsPlate(plate: Plate, record: RoomRecord): boolean {
    return plate === null || plate === 'plateA' || (plate === 'finalLeft' || plate === 'finalRight') && record.switchB;
}
