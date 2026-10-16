/** Public campaign order. The complete mechanics registry remains separate. */
export const AUTHORED_CAMPAIGN_LEVELS = ['handshake', 'deadlock', 'use-after-free'] as const;
export type AuthoredCampaignLevel = typeof AUTHORED_CAMPAIGN_LEVELS[number];
export const isAuthoredCampaignLevel = (value: unknown): value is AuthoredCampaignLevel => AUTHORED_CAMPAIGN_LEVELS.some(id => id === value);
export const COOP_CAMPAIGN = [
    { id: 'handshake', title: 'HANDSHAKE' },
    { id: 'crossfeed-vault', title: 'CROSSFEED VAULT' },
    { id: 'race-condition', title: 'RACE CONDITION' },
    { id: 'deadlock', title: 'DEADLOCK' },
    { id: 'use-after-free', title: 'USE AFTER FREE' },
] as const;
export type CampaignLevel = typeof COOP_CAMPAIGN[number]['id'];
export const isCampaignLevel = (value: unknown): value is CampaignLevel => COOP_CAMPAIGN.some(level => level.id === value);
export const nextChamber = (level: CampaignLevel): CampaignLevel | null => COOP_CAMPAIGN[COOP_CAMPAIGN.findIndex(l => l.id === level) + 1]?.id ?? null;
export interface PartyState {
    /** Host identity is the first reserved visitor, never connection order. */
    phase: 'lobby' | 'playing' | 'victory';
    completedLevels: CampaignLevel[];
}
