import { cloneDraft, DRAFT_ID, objectBounds, objectPort, serializeDraft, type DraftBinding, type DraftDocument, type DraftExpression, type DraftObject } from './model.ts';
import type { Box, Vec2 } from '../engine/geometry.ts';

/** A gesture is a transaction: push its starting document once, at pointer-up. */
export class DraftHistory {
    private past: DraftDocument[] = [];
    private future: DraftDocument[] = [];
    constructor(public document: DraftDocument, readonly limit = 100) { this.document = cloneDraft(document); }
    get canUndo() { return this.past.length > 0; }
    get canRedo() { return this.future.length > 0; }
    replace(document: DraftDocument) { this.document = cloneDraft(document); this.past = []; this.future = []; }
    commit(next: DraftDocument, before = this.document): boolean {
        if (serializeDraft(next) === serializeDraft(before)) { this.document = cloneDraft(next); return false; }
        this.past.push(cloneDraft(before)); if (this.past.length > this.limit) this.past.shift();
        this.future = []; this.document = cloneDraft(next); return true;
    }
    change(edit: (draft: DraftDocument) => void): boolean { const next = cloneDraft(this.document); edit(next); return this.commit(next); }
    undo(): boolean { const previous = this.past.pop(); if (!previous) return false; this.future.push(cloneDraft(this.document)); this.document = previous; return true; }
    redo(): boolean { const next = this.future.pop(); if (!next) return false; this.past.push(cloneDraft(this.document)); this.document = next; return true; }
}
export type PaletteKind = 'static' | 'code' | 'door' | 'unstable' | 'plate' | 'socket' | 'scanner' | 'toggle' | 'terminal' | 'cube' | 'relay' | 'lift' | 'firewall' | 'hazard' | 'spawn' | 'checkpoint' | 'breakpoint' | 'exit' | 'reveal' | 'label' | 'wire';
export function allIds(draft: DraftDocument): Set<string> {
    return new Set([...draft.geometry.objects.map(o => o.id), ...draft.geometry.objects.filter(o => o.type === 'relay').map(o => o.pair), ...draft.bindings.map(b => b.id), ...draft.presentation.wires.map(w => w.id), ...draft.presentation.labels.map(l => l.id), ...draft.presentation.cameraReveals.map(r => r.id), ...(draft.controller.kind === 'declarative' ? Object.keys(draft.controller.outputs) : [])]);
}
export function uniqueId(draft: DraftDocument, stem: string, reserved = new Set<string>()): string {
    const ids = allIds(draft), base = stem.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 48).replace(/^[^A-Za-z]+/, '') || 'object';
    let id = base, i = 2; while (ids.has(id) || reserved.has(id)) id = `${base}_${i++}`;
    reserved.add(id); return id;
}
export function entityBounds(draft: DraftDocument, id: string): Box | undefined {
    const o = draft.geometry.objects.find(v => v.id === id); if (o) return objectBounds(o);
    const label = draft.presentation.labels.find(v => v.id === id); if (label) return { x: label.x, y: label.y - 24, w: Math.max(80, label.text.length * 14), h: 30 };
    const reveal = draft.presentation.cameraReveals.find(v => v.id === id); if (reveal) return reveal.bounds ?? boundsUnion((reveal.platformIds ?? []).map(i => entityBounds(draft, i)).filter((b): b is Box => !!b));
    const wire = draft.presentation.wires.find(v => v.id === id); if (wire) return boundsUnion(wire.points.map(p => ({ ...p, w: 0, h: 0 })));
}
export function boundsUnion(boxes: Box[]): Box | undefined {
    if (!boxes.length) return undefined;
    const x = Math.min(...boxes.map(b => b.x)), y = Math.min(...boxes.map(b => b.y));
    return { x, y, w: Math.max(...boxes.map(b => b.x + b.w)) - x, h: Math.max(...boxes.map(b => b.y + b.h)) - y };
}
export function translateEntities(draft: DraftDocument, ids: Set<string>, delta: Vec2) {
    for (const o of draft.geometry.objects) if (ids.has(o.id)) { o.x += delta.x; o.y += delta.y; }
    for (const o of draft.presentation.labels) if (ids.has(o.id)) { o.x += delta.x; o.y += delta.y; }
    for (const o of draft.presentation.cameraReveals) if (ids.has(o.id) && o.bounds) { o.bounds.x += delta.x; o.bounds.y += delta.y; }
    for (const w of draft.presentation.wires) if (ids.has(w.id)) for (const p of w.points) { p.x += delta.x; p.y += delta.y; }
}
export function createEntity(draft: DraftDocument, kind: PaletteKind, at: Vec2): string {
    const id = uniqueId(draft, kind); const base = { id, ...at };
    let object: DraftObject;
    switch (kind) {
        case 'static': case 'code': case 'door': case 'unstable': object = { ...base, type: 'platform', kind: kind === 'door' ? 'static' : kind, w: kind === 'door' ? 50 : 200, h: kind === 'static' ? 80 : kind === 'door' ? 160 : 30, hookable: kind === 'code' || kind === 'unstable', label: kind.toUpperCase(), ...(kind === 'unstable' ? { hookCrumbleDelay: .6, crumbleDelay: .6, respawnDelay: 3 } : {}) }; break;
        case 'cube': object = { ...base, type: 'cube', mark: 'C' }; break;
        case 'plate': case 'socket': case 'scanner': case 'toggle': case 'terminal': object = { ...base, type: 'device', kind, label: kind.toUpperCase(), ...(kind === 'toggle' || kind === 'terminal' ? { initial: false } : {}) }; break;
        case 'spawn': object = { ...base, type: 'spawn', slot: draft.geometry.objects.some(o => o.type === 'spawn' && o.slot === 1) ? 2 : 1 }; break;
        case 'checkpoint': object = { ...base, type: 'checkpoint', checkpoint: 'relay', slot: 1 }; break;
        case 'breakpoint': object = { ...base, type: 'breakpoint', checkpoint: 'relay' }; break;
        case 'lift': object = { ...base, type: 'lift', w: 150, h: 320 }; break;
        case 'relay': {
            const pair = uniqueId(draft, 'relayPair');
            object = { ...base, type: 'relay', w: 56, h: 110, pair, exitSide: 1 };
            draft.geometry.objects.push(object, { ...object, id: uniqueId(draft, 'relayExit'), x: at.x + 260, exitSide: -1 }); return id;
        }
        case 'firewall': object = { ...base, type: 'firewall', orientation: 'vertical', length: 150, thickness: 18 }; break;
        case 'hazard': object = { ...base, type: 'hazard', w: 200, h: 60 }; break;
        case 'exit': object = { ...base, type: 'exit', w: 80, h: 140, latch: true, arrivals: 2 }; break;
        case 'label': draft.presentation.labels.push({ ...base, text: 'ROOM LABEL' }); return id;
        case 'reveal': draft.presentation.cameraReveals.push({ id, source: draft.geometry.objects.find(o => o.type === 'device')?.id ?? 'unassignedControl', bounds: { ...at, w: 400, h: 260 }, padding: 64, duration: 2.5 }); return id;
        case 'wire': draft.presentation.wires.push({ id, points: [{ ...at }, { x: at.x + 100, y: at.y }, { x: at.x + 100, y: at.y + 100 }] }); return id;
    }
    draft.geometry.objects.push(object); return id;
}
function mapExpression(expression: DraftExpression, remap: Map<string, string>): DraftExpression {
    if (expression.op === 'ref') { const [id, ...port] = expression.id.split('.'); return { op: 'ref', id: `${remap.get(id) ?? id}${port.length ? '.' + port.join('.') : ''}` }; }
    if (expression.op === 'not') return { op: 'not', arg: mapExpression(expression.arg, remap) };
    if (expression.op === 'and' || expression.op === 'or') return { op: expression.op, args: expression.args.map(e => mapExpression(e, remap)) };
    return { ...expression };
}
export function duplicateEntities(draft: DraftDocument, selection: Set<string>, offset = { x: 40, y: 40 }): string[] {
    const reserved = new Set<string>(), remap = new Map<string, string>();
    for (const id of selection) remap.set(id, uniqueId(draft, `${id}_copy`, reserved));
    const remapId = (id: string) => remap.get(id) ?? id;
    const copies = draft.geometry.objects.filter(o => selection.has(o.id)).map(o => ({ ...structuredClone(o), id: remapId(o.id), x: o.x + offset.x, y: o.y + offset.y }));
    const pairs = new Map<string, string>();
    for (const o of copies) {
        if (o.type === 'relay') { if (!pairs.has(o.pair)) pairs.set(o.pair, uniqueId(draft, `${o.pair}_copy`, reserved)); o.pair = pairs.get(o.pair)!; }
        if (o.type === 'breakpoint' && o.activationControl) o.activationControl = remapId(o.activationControl);
    }
    draft.geometry.objects.push(...copies);
    if (draft.controller.kind === 'declarative') {
        const outputs = draft.controller.outputs;
        // Clone the dependency closure of outputs driving duplicated targets. This
        // preserves references to external controls while remapping selected ones.
        const wanted = new Set(draft.bindings.filter(b => selection.has(b.target)).map(b => b.output));
        const visit = (e: DraftExpression) => { if (e.op === 'ref' && outputs[e.id] && !wanted.has(e.id)) { wanted.add(e.id); visit(outputs[e.id]); } else if (e.op === 'not') visit(e.arg); else if (e.op === 'and' || e.op === 'or') e.args.forEach(visit); };
        for (const id of wanted) if (outputs[id]) visit(outputs[id]);
        for (const id of wanted) if (outputs[id]) remap.set(id, uniqueId(draft, `${id}_copy`, reserved));
        for (const id of wanted) if (outputs[id]) outputs[remapId(id)] = mapExpression(outputs[id], remap);
    }
    const copiedBindings = draft.bindings.filter(b => selection.has(b.target)).map(b => { const id = uniqueId(draft, `${b.id}_copy`, reserved); remap.set(b.id, id); return { ...b, id, target: remapId(b.target), output: remapId(b.output) }; });
    draft.bindings.push(...copiedBindings);
    const wires = draft.presentation.wires.filter(w => selection.has(w.id) || (w.binding && remap.has(w.binding))).map(w => ({ ...structuredClone(w), id: remap.get(w.id) ?? uniqueId(draft, `${w.id}_copy`, reserved), ...(w.binding ? { binding: remapId(w.binding) } : {}), ...(w.output ? { output: remapId(w.output) } : {}), points: w.points.map(p => ({ x: p.x + offset.x, y: p.y + offset.y })) }));
    draft.presentation.wires.push(...wires);
    draft.presentation.labels.push(...draft.presentation.labels.filter(l => selection.has(l.id)).map(l => ({ ...l, id: remapId(l.id), x: l.x + offset.x, y: l.y + offset.y })));
    draft.presentation.cameraReveals.push(...draft.presentation.cameraReveals.filter(r => selection.has(r.id) || selection.has(r.source)).map(r => ({ ...structuredClone(r), id: remap.get(r.id) ?? uniqueId(draft, `${r.id}_copy`, reserved), source: remapId(r.source), ...(r.platformIds ? { platformIds: r.platformIds.map(remapId) } : {}), ...(r.bounds ? { bounds: { ...r.bounds, x: r.bounds.x + offset.x, y: r.bounds.y + offset.y } } : {}) })));
    return [...selection].map(remapId);
}
/** Deletions preserve expressions: dangling references remain visible diagnostics. */
export function deleteEntities(draft: DraftDocument, selection: Set<string>) {
    draft.geometry.objects = draft.geometry.objects.filter(o => !selection.has(o.id));
    const removedBindings = new Set(draft.bindings.filter(b => selection.has(b.target)).map(b => b.id));
    draft.bindings = draft.bindings.filter(b => !removedBindings.has(b.id));
    draft.presentation.wires = draft.presentation.wires.filter(w => !selection.has(w.id) && !(w.binding && removedBindings.has(w.binding)));
    draft.presentation.labels = draft.presentation.labels.filter(l => !selection.has(l.id));
    draft.presentation.cameraReveals = draft.presentation.cameraReveals.filter(r => !selection.has(r.id));
    const surviving = allIds(draft); draft.editor.hidden = draft.editor.hidden.filter(id => surviving.has(id)); draft.editor.locked = draft.editor.locked.filter(id => surviving.has(id));
}
export function renameEntity(draft: DraftDocument, oldId: string, newId: string) {
    if (oldId === newId) return;
    if (!DRAFT_ID.test(newId) || allIds(draft).has(newId)) throw new Error('Use a unique ID: letter first, then letters, numbers, _ or -, up to 64 characters.');
    const remap = new Map([[oldId, newId]]);
    for (const o of draft.geometry.objects) { if (o.id === oldId) o.id = newId; if (o.type === 'breakpoint' && o.activationControl === oldId) o.activationControl = newId; }
    for (const b of draft.bindings) { if (b.target === oldId) b.target = newId; }
    for (const r of draft.presentation.cameraReveals) { if (r.id === oldId) r.id = newId; if (r.source === oldId) r.source = newId; if (r.platformIds) r.platformIds = r.platformIds.map(id => id === oldId ? newId : id); }
    for (const l of draft.presentation.labels) if (l.id === oldId) l.id = newId;
    for (const w of draft.presentation.wires) if (w.id === oldId) w.id = newId;
    if (draft.controller.kind === 'declarative') for (const [id, expr] of Object.entries(draft.controller.outputs)) draft.controller.outputs[id] = mapExpression(expr, remap);
    for (const state of Object.values(draft.previewStates)) for (const [port, value] of Object.entries(state)) if (port.startsWith(`${oldId}.`)) { state[newId + port.slice(oldId.length)] = value; delete state[port]; }
    draft.editor.hidden = draft.editor.hidden.map(id => id === oldId ? newId : id); draft.editor.locked = draft.editor.locked.map(id => id === oldId ? newId : id);
}
export function bindingProperty(target: DraftObject): DraftBinding['property'] | null {
    if (target.type === 'platform') return target.kind === 'static' ? 'open' : 'active';
    if (target.type === 'exit') return 'unlock';
    if (target.type === 'lift' || target.type === 'relay') return 'power';
    if (target.type === 'firewall') return 'active'; return null;
}
export function connectOutput(draft: DraftDocument, output: string, targetId: string, invert = false, sourceId?: string, pairMate = true): string {
    const target = draft.geometry.objects.find(o => o.id === targetId), property = target && bindingProperty(target);
    if (!target || !property) throw new Error('Select a platform, door, lift, relay, firewall or exit as the destination.');
    const existing = draft.bindings.find(b => b.target === targetId && b.property === property);
    const connectMate = () => { if (pairMate && target.type === 'relay') for (const mate of draft.geometry.objects) if (mate.type === 'relay' && mate.pair === target.pair && mate.id !== target.id) connectOutput(draft, output, mate.id, invert, sourceId, false); };
    if (existing) { existing.output = output; existing.invert = invert; connectMate(); return existing.id; }
    const binding = { id: uniqueId(draft, `${targetId}Binding`), output, target: targetId, property, ...(invert ? { invert } : {}) };
    draft.bindings.push(binding);
    const source = sourceId ? draft.geometry.objects.find(o => o.id === sourceId) : undefined;
    const box = objectBounds(target), start = source ? { x: source.x, y: source.y - 12 } : { x: box.x - 150, y: box.y - 60 }, end = { x: box.x + box.w / 2, y: box.y };
    draft.presentation.wires.push({ id: uniqueId(draft, `${targetId}Wire`), binding: binding.id, points: [start, { x: start.x, y: end.y - 50 }, { x: end.x, y: end.y - 50 }, end] }); connectMate(); return binding.id;
}
export function connectDevice(draft: DraftDocument, sourceId: string, targetId: string) {
    if (draft.controller.kind !== 'declarative') throw new Error('Built-in controller internals are code-owned. Bind one of its existing outputs.');
    const source = draft.geometry.objects.find(o => o.id === sourceId);
    if (source?.type !== 'device') throw new Error('The connection source must be a device.');
    const output = uniqueId(draft, `${source.id}Power`); draft.controller.outputs[output] = { op: 'ref', id: objectPort(source) };
    return connectOutput(draft, output, targetId, false, sourceId);
}
