import type { CoopLevelId } from '../src/coop/protocol.ts';
import type { LevelDefinition } from './coop-state.ts';
import { crumbleView, triggerCrumble } from './crumble-state.ts';
import { pairingDefinition } from './pairing-state.ts';
import { crossfeedDefinition } from './crossfeed-state.ts';

/** Small coordinate-free mock controllers. No frontend geometry imports. */
export const LEVEL_DEFINITIONS: { [K in CoopLevelId]: LevelDefinition<K> } = {
    'crossfeed-vault': crossfeedDefinition,
    'pairing-bay': pairingDefinition,
    'firewall-lab': {
        cubeIds: ['cube'], defaults: () => ({ checkpointSet: false }),
        valid: r => Object.keys(r.levelState).length === 1 && typeof r.levelState.checkpointSet === 'boolean'
            && r.checkpoint === (r.levelState.checkpointSet ? 'reunion' : 'entry') && r.cubePlacements.cube === 'spawn'
            && r.exitUnlocked === r.levelState.checkpointSet,
        acceptsPlate: p => p === null,
        action: ({ record }, m) => {
            if (m.type !== 'control' || m.control !== 'firewallCheckpoint') return false;
            record.levelState.checkpointSet = true; record.checkpoint = 'reunion'; return true;
        },
        project: ({ record }) => ({ ...record.levelState }),
        unlock: ({ record }) => record.levelState.checkpointSet,
        cubeEnabled: () => true,
    },
    'boost-lab': {
        cubeIds: ['cube'], defaults: () => ({ routeLatched: false }),
        valid: r => Object.keys(r.levelState).length === 1 && typeof r.levelState.routeLatched === 'boolean'
            && r.checkpoint === 'entry' && r.cubePlacements.cube === 'spawn' && r.exitUnlocked === r.levelState.routeLatched,
        acceptsPlate: p => p === null,
        action: ({ record }, m) => {
            if (m.type !== 'control' || m.control !== 'boostRoute') return false;
            record.levelState.routeLatched = true; return true;
        },
        project: ({ record }) => ({ ...record.levelState }),
        unlock: ({ record }) => record.levelState.routeLatched,
        cubeEnabled: () => true,
    },
    'relay-lab': {
        cubeIds: ['cube'], defaults: () => ({ relayEnabled: false }),
        valid: r => Object.keys(r.levelState).length === 1 && typeof r.levelState.relayEnabled === 'boolean'
            && r.checkpoint === 'entry' && r.cubePlacements.cube === 'spawn' && r.exitUnlocked === r.levelState.relayEnabled,
        acceptsPlate: p => p === null,
        action: ({ record }, m) => {
            if (m.type !== 'control' || m.control !== 'relayPower') return false;
            record.levelState.relayEnabled = true; return true;
        },
        project: ({ record }) => ({ ...record.levelState }),
        unlock: ({ record }) => record.levelState.relayEnabled,
        cubeEnabled: () => true,
    },
    'lift-lab': {
        cubeIds: ['cube'], defaults: () => ({ liftLatched: false }),
        valid: r => Object.keys(r.levelState).length === 1 && typeof r.levelState.liftLatched === 'boolean'
            && r.checkpoint === (r.levelState.liftLatched ? 'upper' : 'entry') && r.cubePlacements.cube === 'spawn'
            && r.exitUnlocked === r.levelState.liftLatched,
        acceptsPlate: p => p === null || p === 'liftControl',
        action: ({ record }, m) => {
            if (m.type !== 'control' || m.control !== 'liftLatch') return false;
            record.levelState.liftLatched = true; record.checkpoint = 'upper'; return true;
        },
        project: ({ record, held }) => ({ ...record.levelState, lowerHeld: held.includes('liftControl'), liftEnabled: held.includes('liftControl') || record.levelState.liftLatched }),
        unlock: ({ record }) => record.levelState.liftLatched,
        cubeEnabled: () => true,
    },
    'crumble-lab': {
        cubeIds: [], defaults: () => ({ tested: { foot: false, hook: false } }),
        valid: r => Object.keys(r.levelState).length === 1 && !!r.levelState.tested && Object.keys(r.levelState.tested).length === 2
            && typeof r.levelState.tested.foot === 'boolean' && typeof r.levelState.tested.hook === 'boolean'
            && r.checkpoint === 'entry' && Object.keys(r.cubePlacements).length === 0 && r.exitUnlocked === (r.levelState.tested.foot && r.levelState.tested.hook),
        acceptsPlate: p => p === null,
        action: ({ record, crumble, now }, m) => {
            if (m.type !== 'crumble-trigger' || !triggerCrumble(crumble, m.platform, m.trigger, now)) return false;
            record.levelState.tested[m.trigger] = true; return true;
        },
        project: ({ record, crumble, now }) => ({ tested: { ...record.levelState.tested }, platforms: crumbleView(crumble, now) }),
        unlock: ({ record }) => record.levelState.tested.foot && record.levelState.tested.hook,
        cubeEnabled: () => false,
    },
};
