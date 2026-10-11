import { COOP_CAMPAIGN, isCampaignLevel } from '../src/coop/campaign.ts';
import { newRecord, type RoomRecord } from './coop-state.ts';

export function newParty(code: string, visitor: string): RoomRecord {
    const record = newRecord(code, visitor, COOP_CAMPAIGN[0].id);
    record.party!.phase = 'lobby';
    return record;
}
/** Fresh chamber, same durable membership/progress. No geometry or ephemeral state. */
export function selectChamber(record: RoomRecord, visitor: string, level: unknown): RoomRecord | null {
    if (!record.party || record.visitors[0] !== visitor || !isCampaignLevel(level)
        || record.levelInstance >= Number.MAX_SAFE_INTEGER) return null;
    return { ...newRecord(record.code, visitor, level, record.createdAt),
        visitors: [...record.visitors], revision: record.revision, updatedAt: record.updatedAt,
        levelInstance: record.levelInstance + 1,
        party: { phase: 'playing', completedLevels: [...record.party.completedLevels] } };
}
export function completeParty(record: RoomRecord): void {
    if (!record.party || !record.completed || !isCampaignLevel(record.level)) return;
    record.party.phase = 'victory';
    if (!record.party.completedLevels.includes(record.level)) record.party.completedLevels.push(record.level);
}
