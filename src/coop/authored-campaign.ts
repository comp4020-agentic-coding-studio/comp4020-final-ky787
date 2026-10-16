import handshake from '../../levels/campaign/handshake.json' with { type: 'json' };
import deadlock from '../../levels/campaign/deadlock.json' with { type: 'json' };
import useAfterFree from '../../levels/campaign/use-after-free.json' with { type: 'json' };
import type { DraftDocument } from '../workbench/model.ts';
import type { AuthoredCampaignLevel } from './campaign.ts';

/** Released JSON snapshots: editing a workbench draft never changes a live campaign. */
export const CAMPAIGN_DOCUMENTS = { handshake, deadlock, 'use-after-free': useAfterFree } as Record<AuthoredCampaignLevel, DraftDocument>;
