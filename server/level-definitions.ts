import { CAMPAIGN_DOCUMENTS } from '../src/coop/authored-campaign.ts';
import { declarativeDefinition } from './declarative-state.ts';
import type { SessionLevelId } from '../src/coop/protocol.ts';
import type { LevelDefinition } from './coop-state.ts';
import { crumbleView, freshCrumble } from './crumble-state.ts';
import { LAB_DEFINITIONS } from './lab-definitions.ts';
import { pairingDefinition } from './pairing-state.ts';
import { raceDefinition } from './race-state.ts';
import { crossfeedDefinition } from './crossfeed-state.ts';

/** Small coordinate-free mock controllers. No frontend geometry imports. */
export const LEVEL_DEFINITIONS: { [K in SessionLevelId]: LevelDefinition<K> } = {
    // Frozen custom-session registries supply the real rules; this fallback cannot create a room.
    workbench: { cubeIds: [], defaults: () => ({ devices: {} }), valid: () => false, acceptsPlate: p => p === null,
        action: () => false, project: () => ({ devices: {}, outputs: {}, platforms: crumbleView(freshCrumble(), 0) }), unlock: () => false, cubeEnabled: () => false },
    handshake: declarativeDefinition<'handshake'>(CAMPAIGN_DOCUMENTS.handshake),
    deadlock: declarativeDefinition<'deadlock'>(CAMPAIGN_DOCUMENTS.deadlock),
    'use-after-free': declarativeDefinition<'use-after-free'>(CAMPAIGN_DOCUMENTS['use-after-free']),
    'race-condition': raceDefinition,
    'crossfeed-vault': crossfeedDefinition,
    'pairing-bay': pairingDefinition,
    ...LAB_DEFINITIONS,
};
