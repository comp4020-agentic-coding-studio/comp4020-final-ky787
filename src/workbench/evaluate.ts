import type { ControllerFrame, ControllerOutputs, MachineSignal } from '../slice/controller.ts';
import { objectPort, type DraftDocument, type DraftExpression } from './model.ts';
export const draftSignal = (id: string): `draft:${string}` => `draft:${id}`;
export const emptyOutputs = (): ControllerOutputs => ({ exitDoor: false, grappleAnchor: false, bridge: false, codePlatformA: false, codePlatformB: false, relayGates: false, liftField: false });
export function initialDeviceValues(draft: DraftDocument): Record<string, boolean> { return Object.fromEntries(draft.geometry.objects.filter(o => o.type === 'device').map(o => [objectPort(o), o.initial ?? false])); }
/** Shared by editor previews, local physics and authoritative draft sessions. */
export function evaluateDraft(draft: DraftDocument, values: Readonly<Record<string, boolean>>, forced?: Readonly<Record<string, boolean>>): Record<string, boolean> {
    if (draft.controller.kind !== 'declarative') throw new Error('Built-in controllers must run through their allowlisted authority.');
    const definitions = draft.controller.outputs, outputs: Record<string, boolean> = {}, active = new Set<string>(), devices = initialDeviceValues(draft);
    const expr = (e: DraftExpression): boolean => {
        if (e.op === 'const') return e.value;
        if (e.op === 'not') return !expr(e.arg);
        if (e.op === 'and') return e.args.every(expr);
        if (e.op === 'or') return e.args.some(expr);
        if (e.op !== 'ref') throw new Error('Invalid expression');
        if (Object.hasOwn(definitions, e.id)) return output(e.id);
        if (!Object.hasOwn(devices, e.id)) throw new Error(`Unknown device port ${e.id}`);
        return values[e.id] ?? devices[e.id];
    };
    const output = (id: string): boolean => {
        if (Object.hasOwn(outputs, id)) return outputs[id];
        if (active.has(id)) throw new Error(`Logic cycle at ${id}`);
        active.add(id); const value = expr(definitions[id]); active.delete(id); outputs[id] = value; return value;
    };
    for (const id of Object.keys(definitions)) output(id);
    if (forced) for (const [id, value] of Object.entries(forced)) { if (!Object.hasOwn(definitions, id)) throw new Error(`Unknown forced output ${id}`); outputs[id] = value; }
    return outputs;
}
/** Binding inversion is resolved once here. Render, wires and collision consume the result. */
export function draftFrame(draft: DraftDocument, values: Readonly<Record<string, boolean>>, outputs: Readonly<Record<string, boolean>>, exitUnlocked?: boolean): ControllerFrame {
    const signals: Partial<Record<MachineSignal, boolean>> = {}, controls: Record<string, boolean> = {}, plates: Record<string, boolean> = {};
    for (const [id, on] of Object.entries(outputs)) signals[draftSignal(id)] = on;
    for (const b of draft.bindings) signals[draftSignal(b.id)] = !!outputs[b.output] !== !!b.invert;
    for (const o of draft.geometry.objects) if (o.type === 'device') (o.kind === 'toggle' || o.kind === 'terminal' ? controls : plates)[draftSignal(o.id)] = !!values[objectPort(o)];
    const exit = draft.bindings.find(b => b.property === 'unlock');
    if (exit && exitUnlocked !== undefined) signals[draftSignal(exit.id)] = exitUnlocked;
    return { source: 'mock-greybox', outputs: { ...emptyOutputs(), exitDoor: exitUnlocked ?? (exit ? !!signals[draftSignal(exit.id)] : false) }, signals, controls, plates };
}
