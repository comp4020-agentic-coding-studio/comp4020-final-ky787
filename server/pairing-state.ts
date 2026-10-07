import type { CubePlacement } from '../src/coop/protocol.ts';
import { CODE_PATTERN } from '../src/coop/protocol.ts';
import type { LevelDefinition } from './coop-state.ts';
import { UUID } from './identity.ts';
interface LegacyBaseRecord {
    code: string; level: 'pairing-bay'; revision: number;
    visitors: [string, string | null];
    switchB: boolean; checkpoint: 'entry' | 'reunion'; completed: boolean;
    createdAt: string; updatedAt: string;
}
interface LegacyPairingRecord extends LegacyBaseRecord {
    version: 3;
    cubePlacement: CubePlacement;
    exitUnlocked: boolean;
    reachedExit: [boolean, boolean];
}
function validBase(v: unknown, code: string): v is LegacyBaseRecord {
    if (!v || typeof v !== 'object') return false;
    const r = v as LegacyBaseRecord;
    return r.code === code && CODE_PATTERN.test(code) && r.level === 'pairing-bay'
        && Number.isSafeInteger(r.revision) && r.revision >= 0
        && Array.isArray(r.visitors) && r.visitors.length === 2 && UUID.test(r.visitors[0])
        && (r.visitors[1] === null || UUID.test(r.visitors[1]) && r.visitors[1] !== r.visitors[0])
        && typeof r.switchB === 'boolean' && r.checkpoint === (r.switchB ? 'reunion' : 'entry')
        && typeof r.completed === 'boolean' && (!r.completed || r.switchB)
        && typeof r.createdAt === 'string' && Number.isFinite(Date.parse(r.createdAt))
        && typeof r.updatedAt === 'string' && Number.isFinite(Date.parse(r.updatedAt));
}
function validLegacyRecord(v: unknown, code: string): v is LegacyPairingRecord {
    if (!validBase(v, code)) return false;
    const r = v as LegacyPairingRecord;
    return r.version === 3 && (r.cubePlacement === 'spawn' || r.cubePlacement === 'cargoPlate' && r.switchB) && typeof r.exitUnlocked === 'boolean'
        && (!r.exitUnlocked || r.switchB && r.visitors[1] !== null)
        && Array.isArray(r.reachedExit) && r.reachedExit.length === 2 && r.reachedExit.every(v => typeof v === 'boolean')
        && (!r.reachedExit.some(Boolean) || r.exitUnlocked)
        && r.completed === r.reachedExit.every(Boolean);
}
/** V1 completion meant solving the plates, not physically reaching the exit. */
export function readLegacyPairingRecord(v: unknown, code: string): LegacyPairingRecord | null {
    if (!validBase(v, code)) return null;
    if ('version' in v && v.version === 1) {
        const migrated = { ...v, version: 3, cubePlacement: 'spawn', exitUnlocked: v.completed, reachedExit: [false, false], completed: false };
        return validLegacyRecord(migrated, code) ? migrated : null;
    }
    if ('version' in v && v.version === 2) {
        const migrated = { ...v, version: 3, cubePlacement: 'spawn' };
        return validLegacyRecord(migrated, code) ? migrated : null;
    }
    return validLegacyRecord(v, code) ? v : null;
}
/** Accepted PAIRING BAY rules, independent of common membership/cube infrastructure. */
export const pairingDefinition: LevelDefinition<'pairing-bay'> = {
    cube: true, defaults: () => ({ switchB: false }),
    valid: r => Object.keys(r.levelState).length === 1 && typeof r.levelState.switchB === 'boolean'
        && r.checkpoint === (r.levelState.switchB ? 'reunion' : 'entry')
        && (r.cubePlacement === 'spawn' || r.cubePlacement === 'cargoPlate' && r.levelState.switchB)
        && (!r.exitUnlocked || r.levelState.switchB && r.visitors[1] !== null),
    acceptsPlate: (p, r) => p === null || p === 'plateA' || (p === 'finalLeft' || p === 'finalRight') && r.levelState.switchB,
    action: ({ record }, m) => {
        if (m.type !== 'switch') return false;
        record.levelState.switchB = true; record.checkpoint = 'reunion'; return true;
    },
    project: ({ record: r, held }) => {
        const inputs = { plateAOccupied: held.includes('plateA'), switchB: r.levelState.switchB, cubeOnCargoPlate: r.cubePlacement === 'cargoPlate',
            finalPlateLeftOccupied: held.includes('finalLeft'), finalPlateRightOccupied: held.includes('finalRight') };
        return { inputs, outputs: { grappleAnchor: inputs.plateAOccupied, returnBridge: inputs.switchB, finalAccess: inputs.cubeOnCargoPlate, exitDoor: r.exitUnlocked } };
    },
    unlock: ({ record: r, held }) => r.levelState.switchB && r.cubePlacement === 'cargoPlate' && held.includes('finalLeft') && held.includes('finalRight'),
    cubeEnabled: r => r.levelState.switchB,
};
