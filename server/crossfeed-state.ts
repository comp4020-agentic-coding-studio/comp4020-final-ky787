import { CROSSFEED_HANDOVER_MS, CROSSFEED_PLATES, type CrossfeedOutputs } from '../src/coop/protocol.ts';
import type { LevelContext, LevelDefinition } from './coop-state.ts';
import { crumbleView, triggerCrumble } from './crumble-state.ts';

/** Raw + grace-inclusive physical + unlock candidate, matching the native contract's output classes. */
export interface CrossfeedProjection { outputs: CrossfeedOutputs; physical: { leftRoute: boolean; rightRoute: boolean }; unlockCandidate: boolean }
export type CrossfeedProjectionFn = (ctx: LevelContext<'crossfeed-vault'>) => CrossfeedProjection;

/** Provisional authored mechanics, never binary timing/evidence. */
export const CROSSFEED_TIMING = { handover: CROSSFEED_HANDOVER_MS, toggleInterval: 650, fake: 1650 } as const;
export const freshCrossfeed = () => ({ leftRoute: false, rightRoute: false, leftUntil: 0, rightUntil: 0, toggleAfter: 0 });
export type CrossfeedRuntime = ReturnType<typeof freshCrossfeed>;
export function crossfeedInputs({ record: r, held }: Pick<LevelContext<'crossfeed-vault'>, 'record' | 'held'>) {
    const placements = Object.values(r.cubePlacements);
    return { switchB: r.levelState.switchB, switchC: r.levelState.switchC, switchD: r.levelState.switchD, routeMode: r.levelState.routeMode,
        plateAOccupied: held.includes('entry') || placements.includes('entry'),
        routePowerOccupied: held.includes('routePower') || placements.includes('routePower'),
        cubeOnLiftCargo: placements.includes('liftCargo'), cubeOnFinalLeft: placements.includes('finalLeft'), cubeOnFinalRight: placements.includes('finalRight'),
        finalPlateLeftOccupied: held.includes('finalLeft'), finalPlateRightOccupied: held.includes('finalRight') };
}
/** Independent TypeScript oracle: the authored combinational decision. Retained as a
 * differential comparison against the native table in tests; live gameplay uses the
 * native projection via nativeCrossfeedProjection below. */
export function crossfeedOutputs(ctx: Pick<LevelContext<'crossfeed-vault'>, 'record' | 'held'>): CrossfeedOutputs {
    const i = crossfeedInputs(ctx), master = i.switchC && i.routePowerOccupied, vault = i.cubeOnFinalLeft && i.cubeOnFinalRight;
    return { grappleAnchor: i.plateAOccupied && !i.switchB, bridge: i.switchB,
        liftField: i.cubeOnLiftCargo || i.switchC, serviceAccess: i.switchC, relayGates: i.switchC && !i.switchB,
        leftRoute: master && !i.routeMode, rightRoute: master && i.routeMode, galleryAccess: i.switchD,
        vaultPower: vault, vaultReturn: vault, exitDoor: ctx.record.exitUnlocked };
}
/** Default projection: the authored TypeScript oracle, for custom/workbench local preview.
 * The server replaces this with the verified native projection for the released campaign chamber. */
export const mockCrossfeedProjection: CrossfeedProjectionFn = ctx => {
    const outputs = crossfeedOutputs(ctx), r = ctx.crossfeed ?? freshCrossfeed(), i = crossfeedInputs(ctx);
    return { outputs, physical: { leftRoute: outputs.leftRoute || ctx.now < r.leftUntil, rightRoute: outputs.rightRoute || ctx.now < r.rightUntil },
        unlockCandidate: i.cubeOnFinalLeft && i.cubeOnFinalRight && i.finalPlateLeftOccupied && i.finalPlateRightOccupied };
};
/** Start grace only on a real falling edge; snapshots never extend its deadline.
 * Uses raw route outputs only, which the native table and TS oracle agree on exactly
 * (verified exhaustively in tests/native-adapter.test.ts). */
export function syncCrossfeed(ctx: LevelContext, projection: CrossfeedProjectionFn = mockCrossfeedProjection) {
    if (ctx.record.level !== 'crossfeed-vault' || !ctx.crossfeed) return;
    const o = projection(ctx as LevelContext<'crossfeed-vault'>).outputs, r = ctx.crossfeed;
    for (const [signal, until] of [['leftRoute', 'leftUntil'], ['rightRoute', 'rightUntil']] as const) {
        if (r[signal] && !o[signal]) r[until] = ctx.now + CROSSFEED_TIMING.handover;
        if (o[signal]) r[until] = 0;
        r[signal] = o[signal];
    }
}
export const crossfeedDue = (r: CrossfeedRuntime, now: number) => r.leftUntil > 0 && now >= r.leftUntil || r.rightUntil > 0 && now >= r.rightUntil;
export function advanceCrossfeed(r: CrossfeedRuntime, now: number) {
    const changed = crossfeedDue(r, now);
    if (r.leftUntil && now >= r.leftUntil) r.leftUntil = 0;
    if (r.rightUntil && now >= r.rightUntil) r.rightUntil = 0;
    return changed;
}
/** Build the CROSSFEED level definition with a pluggable projection. Custom/workbench local
 * preview uses the authored mock; the server injects the verified native projection. */
export function crossfeedDefinitionWith(projection: CrossfeedProjectionFn): LevelDefinition<'crossfeed-vault'> {
  return {
    cubeIds: ['cubeA', 'cubeB'], defaults: () => ({ chamberRevision: 2, switchB: false, switchC: false, switchD: false, routeMode: false }),
    valid: r => r.levelState.chamberRevision === 2
        && Object.keys(r.levelState).length === (r.levelState.legacyVictory ? 6 : 5)
        && (['switchB', 'switchC', 'switchD', 'routeMode'] as const).every(key => typeof r.levelState[key] === 'boolean')
        && (r.levelState.legacyVictory === undefined || r.levelState.legacyVictory === true && r.completed)
        && ['entry', 'upper'].includes(r.checkpoint)
        && (!r.exitUnlocked || r.visitors[1] !== null)
        && ['liftCargo', 'finalLeft', 'finalRight'].every(p => Object.values(r.cubePlacements).filter(v => v === p).length <= 1),
    acceptsPlacement: (_, p) => ['liftCargo', 'finalLeft', 'finalRight', ...CROSSFEED_PLATES].includes(p),
    acceptsPlate: p => p === null || ['finalLeft', 'finalRight', ...CROSSFEED_PLATES].includes(p),
    action: (ctx, m) => {
        if (m.type === 'checkpoint') {
            if (m.breakpoint !== 'system-online') return false;
            ctx.record.checkpoint = 'upper'; return true;
        }
        if (m.type === 'crumble-trigger') {
            // Grace-inclusive physical route power == raw route OR active handover grace.
            const route = m.platform === 'crumbleA' ? 'leftRoute' : 'rightRoute';
            if (!projection(ctx).physical[route]) return false;
            return triggerCrumble(ctx.crumble, m.platform, m.trigger, ctx.now, CROSSFEED_TIMING.fake);
        }
        if (m.type !== 'control') return false;
        const r = ctx.record;
        if (m.control === 'switchB') r.levelState.switchB = !r.levelState.switchB;
        else if (m.control === 'switchC') r.levelState.switchC = true;
        else if (m.control === 'switchD') r.levelState.switchD = true;
        else if (m.control === 'routeMode') {
            if (ctx.crossfeed && ctx.now < ctx.crossfeed.toggleAfter) return false;
            r.levelState.routeMode = !r.levelState.routeMode;
            if (ctx.crossfeed) ctx.crossfeed.toggleAfter = ctx.now + CROSSFEED_TIMING.toggleInterval;
        } else return false;
        return true;
    },
    project: ctx => {
        const p = projection(ctx), r = ctx.crossfeed ?? freshCrossfeed();
        return { inputs: crossfeedInputs(ctx), outputs: p.outputs,
            physical: p.physical,
            handoverMs: Math.max(0, r.leftUntil - ctx.now, r.rightUntil - ctx.now), platforms: crumbleView(ctx.crumble, ctx.now) };
    },
    unlock: ctx => projection(ctx).unlockCandidate,
    cubeEnabled: () => true,
  };
}
/** Default (browser-safe) definition: authored mock projection, used by custom/workbench preview. */
export const crossfeedDefinition: LevelDefinition<'crossfeed-vault'> = crossfeedDefinitionWith(mockCrossfeedProjection);
