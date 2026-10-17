/**
 * Native-verified projection functions for the two temporal chambers, and the
 * server-side native-backed level definitions built from them.
 *
 * The server still owns every clock: CROSSFEED route-handover grace and toggle
 * cooldown, RACE buffer window/release/expiry, phase handover, return grace,
 * crumble, persisted latches, checkpoints and arrivals. These functions only
 * take the server's current temporal observations, encode them with the native
 * contract, and return the verified native combinational decisions in the shape
 * the state modules already consume.
 *
 * This file imports node:fs transitively through the adapter, so it must never
 * reach the browser bundle. It is imported only by the server registry
 * (server/level-definitions.ts), not by the browser's workbench builtin-local.
 */
import { nativeController } from './adapter.ts';
import { RACE_BUFFER_PHASES } from './contracts.ts';
import type { LevelContext, LevelDefinition } from '../coop-state.ts';
import { crossfeedDefinitionWith, crossfeedInputs, type CrossfeedProjection } from '../crossfeed-state.ts';
import { raceDefinitionWith, raceInputs, type RaceProjection } from '../race-state.ts';

/** Verified native BCF projection for CROSSFEED's current server state. */
export function nativeCrossfeedProjection(ctx: LevelContext<'crossfeed-vault'>): CrossfeedProjection {
    const i = crossfeedInputs(ctx), r = ctx.crossfeed;
    const n = nativeController('crossfeed-vault').evaluate({
        ...i, exitUnlocked: ctx.record.exitUnlocked,
        leftGraceActive: !!r && ctx.now < r.leftUntil, rightGraceActive: !!r && ctx.now < r.rightUntil,
    } as unknown as Record<string, boolean>);
    return {
        outputs: {
            grappleAnchor: n.grappleAnchor, bridge: n.bridge, liftField: n.liftField,
            serviceAccess: n.serviceAccess, relayGates: n.relayGates,
            leftRoute: n.leftRoute, rightRoute: n.rightRoute, galleryAccess: n.galleryAccess,
            vaultPower: n.vaultPower, vaultReturn: n.vaultReturn, exitDoor: n.exitDoor,
        },
        physical: { leftRoute: n.physicalLeftRoute, rightRoute: n.physicalRightRoute },
        unlockCandidate: n.exitUnlockCandidate,
    };
}

/** Verified native BCF projection for RACE's current server state. */
export function nativeRaceProjection(ctx: LevelContext<'race-condition'>): RaceProjection {
    const i = raceInputs(ctx), r = ctx.race;
    const n = nativeController('race-condition').evaluate({
        ...i, exitUnlocked: ctx.record.exitUnlocked,
        phaseGraceActive: ctx.now < r.phaseUntil, returnGraceActive: ctx.now < r.returnUntil,
        bufferPhase: RACE_BUFFER_PHASES.indexOf(r.buffer),
    } as unknown as Record<string, number | boolean>);
    return {
        outputs: {
            topBridge: n.topBridge, bufferBridge: n.bufferBridge, safetyFirewall: n.safetyFirewall,
            raceFirewall: n.raceFirewall, spanMaster: n.spanMaster, phaseA: n.phaseA, phaseB: n.phaseB,
            returnBridge: n.returnBridge, exitDoor: n.exitDoor,
        },
        physical: { phaseA: n.physicalPhaseA, phaseB: n.physicalPhaseB, returnBridge: n.physicalReturnBridge },
        unlockCandidate: n.exitUnlockCandidate,
    };
}

/** Native-backed temporal level definitions for the released campaign chambers. */
export const nativeCrossfeedDefinition: LevelDefinition<'crossfeed-vault'> = crossfeedDefinitionWith(nativeCrossfeedProjection);
export const nativeRaceDefinition: LevelDefinition<'race-condition'> = raceDefinitionWith(nativeRaceProjection);
