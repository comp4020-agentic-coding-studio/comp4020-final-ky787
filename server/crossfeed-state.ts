import type { LevelContext, LevelDefinition } from './coop-state.ts';

/** PROVISIONAL UNTIL HUMAN PLAYTEST ACCEPTANCE. Authored mock; no binary evidence. */
function inputs({ record: r, held }: LevelContext<'crossfeed-vault'>) {
    const placements = Object.values(r.cubePlacements);
    return { ...r.levelState, plateAOccupied: held.includes('plateA'), cubeOnLiftCargo: placements.includes('liftCargo'),
        cubeOnFinalLeft: placements.includes('finalLeft'), cubeOnFinalRight: placements.includes('finalRight'),
        finalPlateLeftOccupied: held.includes('finalLeft'), finalPlateRightOccupied: held.includes('finalRight') };
}
function ready(ctx: LevelContext<'crossfeed-vault'>) {
    const i = inputs(ctx);
    return i.cubeOnFinalLeft && i.cubeOnFinalRight && i.finalPlateLeftOccupied && i.finalPlateRightOccupied;
}
export const crossfeedDefinition: LevelDefinition<'crossfeed-vault'> = {
    cubeIds: ['cubeA', 'cubeB'], defaults: () => ({ switchB: false, switchC: false, switchD: false }),
    valid: r => Object.keys(r.levelState).length === 3 && (['switchB', 'switchC', 'switchD'] as const).every(key => typeof r.levelState[key] === 'boolean')
        && (!r.levelState.switchC || r.levelState.switchB) && (!r.levelState.switchD || r.levelState.switchC)
        && r.checkpoint === (r.levelState.switchC ? 'upper' : 'entry')
        && (!r.exitUnlocked || r.levelState.switchD && r.visitors[1] !== null)
        && ['liftCargo', 'finalLeft', 'finalRight'].every(p => Object.values(r.cubePlacements).filter(v => v === p).length <= 1),
    acceptsPlacement: (r, p) => p === 'liftCargo' && r.levelState.switchB
        || (p === 'finalLeft' || p === 'finalRight') && r.levelState.switchD,
    acceptsPlate: (p, r) => p === null || p === 'plateA' || (p === 'finalLeft' || p === 'finalRight') && r.levelState.switchD,
    action: ({ record: r }, m) => {
        if (m.type !== 'control') return false;
        if (m.control === 'switchB') r.levelState.switchB = true;
        else if (m.control === 'switchC' && r.levelState.switchB) { r.levelState.switchC = true; r.checkpoint = 'upper'; }
        else if (m.control === 'switchD' && r.levelState.switchC) r.levelState.switchD = true;
        else return false;
        return true;
    },
    project: ctx => {
        const i = inputs(ctx);
        return { inputs: i, outputs: { grappleAnchor: i.plateAOccupied, bridge: i.switchB,
            liftField: i.cubeOnLiftCargo || i.switchC, relayGates: i.switchC, codePlatformA: i.switchD,
            codePlatformB: i.cubeOnFinalLeft && i.cubeOnFinalRight, exitDoor: ctx.record.exitUnlocked } };
    },
    unlock: ctx => ctx.record.levelState.switchD && ready(ctx),
    cubeEnabled: (r, id) => id === 'cubeA' ? r.levelState.switchB : id === 'cubeB' && r.levelState.switchC,
};
