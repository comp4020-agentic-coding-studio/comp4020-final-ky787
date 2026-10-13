import type { SessionLevelId } from '../src/coop/protocol.ts';
import type { LevelDefinition } from './coop-state.ts';
import { crumbleView, freshCrumble } from './crumble-state.ts';
import { LAB_DEFINITIONS } from './lab-definitions.ts';
import { pairingDefinition } from './pairing-state.ts';
import { raceDefinition } from './race-state.ts';
import { crossfeedDefinition } from './crossfeed-state.ts';

/** Small coordinate-free mock controllers. No frontend geometry imports. */
export const LEVEL_DEFINITIONS: { [K in SessionLevelId]: LevelDefinition<K> } = {
    // Production cannot create this discriminator. A local frozen registry supplies its real rules.
    workbench: { cubeIds: [], defaults: () => ({ devices: {} }), valid: () => false, acceptsPlate: p => p === null,
        action: () => false, project: () => ({ devices: {}, outputs: {}, platforms: crumbleView(freshCrumble(), 0) }), unlock: () => false, cubeEnabled: () => false },
    'race-condition': raceDefinition,
    'crossfeed-vault': crossfeedDefinition,
    'pairing-bay': pairingDefinition,
    ...LAB_DEFINITIONS,
};
