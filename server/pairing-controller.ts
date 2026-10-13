import type { LevelDefinition } from './coop-state.ts';
/** Accepted PAIRING BAY rules, independent of common membership/cube infrastructure. */
export const pairingDefinition: LevelDefinition<'pairing-bay'> = {
    cubeIds: ['cube'], defaults: () => ({ switchB: false }),
    valid: r => Object.keys(r.levelState).length === 1 && typeof r.levelState.switchB === 'boolean'
        && r.checkpoint === (r.levelState.switchB ? 'reunion' : 'entry')
        && (r.cubePlacements.cube === 'spawn' || r.cubePlacements.cube === 'cargoPlate' && r.levelState.switchB)
        && (!r.exitUnlocked || r.levelState.switchB && r.visitors[1] !== null),
    acceptsPlate: (p, r) => p === null || p === 'plateA' || (p === 'finalLeft' || p === 'finalRight') && r.levelState.switchB,
    action: ({ record }, m) => {
        if (m.type !== 'switch') return false;
        record.levelState.switchB = true; record.checkpoint = 'reunion'; return true;
    },
    project: ({ record: r, held }) => {
        const inputs = { plateAOccupied: held.includes('plateA'), switchB: r.levelState.switchB, cubeOnCargoPlate: r.cubePlacements.cube === 'cargoPlate',
            finalPlateLeftOccupied: held.includes('finalLeft'), finalPlateRightOccupied: held.includes('finalRight') };
        return { inputs, outputs: { grappleAnchor: inputs.plateAOccupied, returnBridge: inputs.switchB, finalAccess: inputs.cubeOnCargoPlate, exitDoor: r.exitUnlocked } };
    },
    unlock: ({ record: r, held }) => r.levelState.switchB && r.cubePlacements.cube === 'cargoPlate' && held.includes('finalLeft') && held.includes('finalRight'),
    acceptsPlacement: (r, placement) => placement === 'cargoPlate' && r.levelState.switchB,
    cubeEnabled: r => r.levelState.switchB,
};
