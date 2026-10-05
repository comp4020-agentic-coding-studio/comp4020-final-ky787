import data from '../../game_data/uplink_controller_ollvm_bcf_v1.json';
import { INPUT_BITS, OUTPUT_FIELDS, validateUplinkBundle } from '../data/uplink-bundle.ts';
import { mockController, type ControllerInputs, type ControllerOutputs, type RoomController } from './controller.ts';
export const uplinkEvidence = validateUplinkBundle(data);
/** The export defines this encoding. Ignored frontend occupancy details are not controller bits. */
export function uplinkStateKey(inputs: Readonly<ControllerInputs>): number {
    return INPUT_BITS.reduce((key, name, bit) => key | (Number(inputs[name]) << bit), 0);
}
const frames = new Map(uplinkEvidence.state_table.map(row => [row.state_id, Object.freeze({
    source: 'validated-trace' as const,
    outputs: Object.freeze(Object.fromEntries(OUTPUT_FIELDS.map(name => [name, row.bcf_native.outputs[name] === 1])) as unknown as ControllerOutputs),
    evidence: Object.freeze({ stateId: row.state_id, traceId: row.trace_id, specimenId: uplinkEvidence.specimen_id, binarySha256: uplinkEvidence.identity.bcf_pe_sha256 }),
})]));
export const validatedTraceController: RoomController = {
    evaluate(room, inputs) {
        if (room !== 'uplink') throw new Error('Validated UPLINK controller cannot evaluate another room');
        const frame = frames.get(uplinkStateKey(inputs));
        if (!frame) throw new Error('Missing validated UPLINK state; no mock fallback');
        return frame;
    },
};
export const roomController: RoomController = {
    evaluate: (room, inputs) => (room === 'uplink' ? validatedTraceController : mockController).evaluate(room, inputs),
};
