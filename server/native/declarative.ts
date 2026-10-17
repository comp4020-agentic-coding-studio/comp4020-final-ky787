/**
 * Bridges the verified native lookup table to the declarative controller's
 * output layer for the three declarative campaign chambers (HANDSHAKE,
 * DEADLOCK, USE AFTER FREE).
 *
 * The returned evaluator has the exact signature the declarative controller
 * expects. It reads the authored device values the server already resolved,
 * encodes them with the native contract's game-port mapping, and returns the
 * retained native BCF outputs. All binding inversions (e.g. USE AFTER FREE's
 * assistBlocked -> finalLift, retry shelves) remain in draftFrame, applied
 * exactly once, because this layer returns the same raw output names the mock
 * evaluator did.
 */
import type { DraftDocument } from '../../src/workbench/model.ts';
import type { OutputEvaluator } from '../declarative-state.ts';
import { nativeController, type NativeControllerTable } from './adapter.ts';
import type { NativeChamberId } from './contracts.ts';

/** Build a native-backed output evaluator for a declarative campaign chamber. */
export function nativeDeclarativeEvaluator(chamber: NativeChamberId): OutputEvaluator {
    const controller = nativeController(chamber);
    const ports = controller.gamePorts;
    let verified = false;
    return (draft: DraftDocument, deviceValues: Readonly<Record<string, boolean>>): Record<string, boolean> => {
        if (!verified) { verifyBindings(controller, draft); verified = true; }
        const inputs: Record<string, number> = {};
        for (const { name, port } of ports) {
            if (!(port in deviceValues)) throw new Error(`native ${chamber}: device port ${port} absent from resolved values`);
            inputs[name] = deviceValues[port] ? 1 : 0;
        }
        return controller.evaluate(inputs);
    };
}

/** One-time cross-check that the draft's outputs are exactly the native outputs. */
function verifyBindings(controller: NativeControllerTable, draft: DraftDocument): void {
    const declared = Object.keys(draft.controller.kind === 'declarative' ? draft.controller.outputs : {});
    const native = new Set(controller.contract.outputs);
    if (declared.length !== native.size || declared.some(name => !native.has(name))) {
        throw new Error(`native ${controller.chamber}: draft outputs ${declared.join(',')} do not match native outputs ${[...native].join(',')}`);
    }
}
