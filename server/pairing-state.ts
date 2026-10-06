import type { Plate, SharedRoom, Slot } from '../src/coop/protocol.ts';
import { CODE_PATTERN } from '../src/coop/protocol.ts';
import { UUID } from './identity.ts';
export interface RoomRecord {
    version: 1; code: string; level: 'pairing-bay'; revision: number;
    visitors: [string, string | null];
    switchB: boolean; checkpoint: 'entry' | 'reunion'; completed: boolean;
    createdAt: string; updatedAt: string;
}
export function validRecord(v: unknown, code: string): v is RoomRecord {
    if (!v || typeof v !== 'object') return false;
    const r = v as RoomRecord;
    return r.version === 1 && r.code === code && CODE_PATTERN.test(code) && r.level === 'pairing-bay'
        && Number.isSafeInteger(r.revision) && r.revision >= 0
        && Array.isArray(r.visitors) && r.visitors.length === 2 && UUID.test(r.visitors[0])
        && (r.visitors[1] === null || UUID.test(r.visitors[1]) && r.visitors[1] !== r.visitors[0])
        && typeof r.switchB === 'boolean' && r.checkpoint === (r.switchB ? 'reunion' : 'entry')
        && typeof r.completed === 'boolean' && (!r.completed || r.switchB)
        && typeof r.createdAt === 'string' && Number.isFinite(Date.parse(r.createdAt))
        && typeof r.updatedAt === 'string' && Number.isFinite(Date.parse(r.updatedAt));
}
export function sharedRoom(record: RoomRecord, connected: [boolean, boolean], plates: [Plate, Plate]): SharedRoom {
    const held = plates.map((p, i) => connected[i] ? p : null);
    const inputs = { player1OnPlateA: held[0] === 'plateA', switchB: record.switchB,
        finalPlateLeftOccupied: held.includes('finalLeft'), finalPlateRightOccupied: held.includes('finalRight') };
    return { code: record.code, level: record.level, revision: record.revision,
        assigned: [true, record.visitors[1] !== null], connected, inputs,
        outputs: { grappleAnchor: inputs.player1OnPlateA, returnBridge: record.switchB,
            exitDoor: record.switchB && connected.every(Boolean) && inputs.finalPlateLeftOccupied && inputs.finalPlateRightOccupied },
        checkpoint: record.checkpoint, completed: record.completed };
}
export function acceptsPlate(slot: Slot, plate: Plate, record: RoomRecord): boolean {
    return plate === null || plate === 'plateA' && slot === 1 || (plate === 'finalLeft' || plate === 'finalRight') && record.switchB;
}
