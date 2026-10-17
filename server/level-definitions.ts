import { CAMPAIGN_DOCUMENTS } from '../src/coop/authored-campaign.ts';
import { declarativeDefinition } from './declarative-state.ts';
import { nativeDeclarativeEvaluator } from './native/declarative.ts';
import { nativeCrossfeedDefinition, nativeRaceDefinition } from './native/temporal.ts';
import type { SessionLevelId } from '../src/coop/protocol.ts';
import type { LevelDefinition } from './coop-state.ts';
import { crumbleView, freshCrumble } from './crumble-state.ts';
import { LAB_DEFINITIONS } from './lab-definitions.ts';
import { pairingDefinition } from './pairing-state.ts';

/** The five released campaign chambers are native-backed (verified OLLVM BCF result tables);
 * the lab/pairing/workbench definitions remain authored mock controllers. */
export const LEVEL_DEFINITIONS: { [K in SessionLevelId]: LevelDefinition<K> } = {
    // Frozen custom-session registries supply the real rules; this fallback cannot create a room.
    workbench: { cubeIds: [], defaults: () => ({ devices: {} }), valid: () => false, acceptsPlate: p => p === null,
        action: () => false, project: () => ({ devices: {}, outputs: {}, platforms: crumbleView(freshCrumble(), 0) }), unlock: () => false, cubeEnabled: () => false },
    handshake: declarativeDefinition<'handshake'>(CAMPAIGN_DOCUMENTS.handshake, nativeDeclarativeEvaluator('handshake')),
    deadlock: declarativeDefinition<'deadlock'>(CAMPAIGN_DOCUMENTS.deadlock, nativeDeclarativeEvaluator('deadlock')),
    'use-after-free': declarativeDefinition<'use-after-free'>(CAMPAIGN_DOCUMENTS['use-after-free'], nativeDeclarativeEvaluator('use-after-free')),
    'race-condition': nativeRaceDefinition,
    'crossfeed-vault': nativeCrossfeedDefinition,
    'pairing-bay': pairingDefinition,
    ...LAB_DEFINITIONS,
};
