/**
 * Coordinate-free identity of the five verified native co-op controllers.
 *
 * This file is the single source of truth for each chamber's canonical input
 * ordering, output ordering and case-id encoding. The offline generator
 * (`scripts/native/generate-tables.ts`) and the runtime adapter
 * (`server/native/adapter.ts`) both consume it, so a table can never be built
 * with one encoding and read with another.
 *
 * It contains no native results, assembly or traces: only the contract shape.
 * The acquired evidence in `experiments/coop-controllers/` remains the
 * authority for the actual output values; see `shared/verify_portable.py`.
 */

export type NativeChamberId =
    | 'handshake' | 'deadlock' | 'use-after-free' | 'crossfeed-vault' | 'race-condition';

export const NATIVE_CHAMBERS: readonly NativeChamberId[] =
    ['handshake', 'deadlock', 'use-after-free', 'crossfeed-vault', 'race-condition'] as const;

export const isNativeChamber = (value: unknown): value is NativeChamberId =>
    NATIVE_CHAMBERS.includes(value as NativeChamberId);

/** How a case id is derived from an ordered canonical input vector. */
export interface ChamberContract {
    id: NativeChamberId;
    /** Declarative chambers project the authored JSON controller; temporal chambers
     * project the server reducer/projection layer. Only affects evidence labelling. */
    kind: 'declarative' | 'temporal';
    /** Canonical input field names in ABI offset order (offset = 4 * index). */
    inputs: readonly string[];
    /** Canonical output field names in ABI offset order (offset = 4 * index). */
    outputs: readonly string[];
    /** Total exhaustive case count. */
    caseCount: number;
    /** Count of Boolean inputs; equals inputs.length unless a multi-valued field exists. */
    booleanInputs: number;
    /** Name of the one multi-valued input field (RACE bufferPhase), if any. */
    enumInput?: { name: string; values: number };
}

/**
 * Case-id encoding, matching each chamber's acquired native-results.json.gz:
 *   declarative / crossfeed: id = sum_i (input[i] & 1) << i
 *   race:                    id = (boolMask << 2) | bufferPhase,
 *                            boolMask = sum_{i<10} (input[i] & 1) << i
 */
export function caseIdForInputs(contract: ChamberContract, inputs: readonly number[]): number {
    if (inputs.length !== contract.inputs.length) {
        throw new Error(`${contract.id}: expected ${contract.inputs.length} inputs, received ${inputs.length}`);
    }
    if (contract.enumInput) {
        const bits = contract.booleanInputs;
        let mask = 0;
        for (let i = 0; i < bits; i++) mask |= (inputs[i] & 1) << i;
        const phase = inputs[bits];
        if (phase < 0 || phase >= contract.enumInput.values) {
            throw new Error(`${contract.id}: ${contract.enumInput.name} out of domain: ${phase}`);
        }
        return (mask << 2) | phase;
    }
    let id = 0;
    for (let i = 0; i < inputs.length; i++) id |= (inputs[i] & 1) << i;
    return id;
}

/** Declarative chambers: inputs/outputs are discovered from the acquired contract at
 * generation time, so only identity and kind live here. Temporal field orders are
 * fixed by the acquired contract and asserted by the generator. */
const DECLARATIVE: Pick<ChamberContract, 'inputs' | 'outputs' | 'caseCount' | 'booleanInputs'>[] = [];

export const CHAMBER_CONTRACTS: Record<NativeChamberId, ChamberContract> = {
    handshake: {
        id: 'handshake', kind: 'declarative', booleanInputs: 5, caseCount: 32,
        inputs: ['crossing', 'liftPlate', 'link', 'maintenance', 'exitSocket'],
        outputs: ['crossingPower', 'liftPower', 'relayPower', 'exitReady'],
    },
    deadlock: {
        id: 'deadlock', kind: 'declarative', booleanInputs: 6, caseCount: 64,
        inputs: ['feed', 'safe', 'hatchToggle', 'payloadOne', 'payloadTwo', 'payloadThree'],
        outputs: ['cargoLift', 'shaftFirewall', 'serviceRelay', 'hatchOpen', 'payloadReady'],
    },
    'use-after-free': {
        id: 'use-after-free', kind: 'declarative', booleanInputs: 5, caseCount: 32,
        inputs: ['launch', 'plateA', 'plateB', 'plateC', 'assist'],
        outputs: ['launchPower', 'routeA', 'routeB', 'routeC', 'assistBlocked', 'exitReady'],
    },
    'crossfeed-vault': {
        id: 'crossfeed-vault', kind: 'temporal', booleanInputs: 14, caseCount: 16384,
        inputs: ['switchB', 'switchC', 'switchD', 'routeMode', 'plateAOccupied', 'routePowerOccupied',
            'cubeOnLiftCargo', 'cubeOnFinalLeft', 'cubeOnFinalRight', 'finalPlateLeftOccupied',
            'finalPlateRightOccupied', 'exitUnlocked', 'leftGraceActive', 'rightGraceActive'],
        outputs: ['grappleAnchor', 'bridge', 'liftField', 'serviceAccess', 'relayGates', 'leftRoute',
            'rightRoute', 'galleryAccess', 'vaultPower', 'vaultReturn', 'exitDoor',
            'physicalLeftRoute', 'physicalRightRoute', 'exitUnlockCandidate'],
    },
    'race-condition': {
        id: 'race-condition', kind: 'temporal', booleanInputs: 10, caseCount: 4096,
        enumInput: { name: 'bufferPhase', values: 4 },
        inputs: ['dropA', 'dropB', 'payloadDelivered', 'traceOccupied', 'phase', 'returnOccupied',
            'finalControl', 'exitUnlocked', 'phaseGraceActive', 'returnGraceActive', 'bufferPhase'],
        outputs: ['topBridge', 'bufferBridge', 'safetyFirewall', 'raceFirewall', 'spanMaster',
            'phaseA', 'phaseB', 'returnBridge', 'exitDoor', 'physicalPhaseA', 'physicalPhaseB',
            'physicalReturnBridge', 'exitUnlockCandidate'],
    },
};
void DECLARATIVE;

/** The RACE four-valued buffer phase, shared so no site invents a Boolean timer. */
export const RACE_BUFFER_PHASES = ['idle', 'window', 'released', 'expired'] as const;
export type RaceBufferPhase = typeof RACE_BUFFER_PHASES[number];
