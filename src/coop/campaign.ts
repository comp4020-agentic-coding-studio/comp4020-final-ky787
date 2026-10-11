/** Public campaign order. The complete mechanics registry remains separate. */
export const COOP_CAMPAIGN = [
    { id: 'crossfeed-vault', title: 'CROSSFEED VAULT' },
    { id: 'race-condition', title: 'RACE CONDITION' },
] as const;
export type CampaignLevel = typeof COOP_CAMPAIGN[number]['id'];
export const isCampaignLevel = (value: unknown): value is CampaignLevel => COOP_CAMPAIGN.some(level => level.id === value);
export const nextChamber = (level: CampaignLevel): CampaignLevel | null => COOP_CAMPAIGN[COOP_CAMPAIGN.findIndex(l => l.id === level) + 1]?.id ?? null;
export interface PartyState {
    /** Host identity is the first reserved visitor, never connection order. */
    phase: 'lobby' | 'playing' | 'victory';
    completedLevels: CampaignLevel[];
}
