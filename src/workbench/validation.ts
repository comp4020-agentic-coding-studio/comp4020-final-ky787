import { importDraft } from './imports.ts';
import { boxesOverlap } from '../engine/geometry.ts';
import { DRAFT_ID, DRAFT_LIMITS, objectBounds, objectPort, type DraftDocument, type DraftDiagnostic, type DraftExpression, type DraftValidation } from './model.ts';
export type Diagnostic = DraftDiagnostic;
const BUILTINS = ['race-condition', 'crossfeed-vault', 'relay-lab', 'lift-lab', 'crumble-lab', 'boost-lab', 'firewall-lab', 'pairing-bay'];
export const BUILTIN_OUTPUTS: Record<string, string[]> = {
    'race-condition': ['topBridge', 'bufferBridge', 'safetyFirewall', 'raceFirewall', 'spanMaster', 'phaseA', 'phaseB', 'returnBridge', 'exitDoor'],
    'crossfeed-vault': ['grappleAnchor', 'bridge', 'liftField', 'relayGates', 'serviceAccess', 'leftRoute', 'rightRoute', 'galleryAccess', 'vaultPower', 'vaultReturn', 'exitDoor'],
    'relay-lab': ['relayGates', 'exitDoor'], 'lift-lab': ['liftField', 'exitDoor'], 'crumble-lab': ['exitDoor'], 'boost-lab': ['bridge', 'exitDoor'], 'firewall-lab': ['exitDoor'],
    'pairing-bay': ['grappleAnchor', 'bridge', 'codePlatformA', 'codePlatformB', 'exitDoor'],
};
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
export function validateDraft(value: unknown): DraftValidation {
    const diagnostics: DraftDiagnostic[] = [];
    try { const json = JSON.stringify(value); if (json && new TextEncoder().encode(json).byteLength > DRAFT_LIMITS.bytes) return { document: null, diagnostics: [{ code: 'resource.bytes', severity: 'error', message: `Draft exceeds the ${DRAFT_LIMITS.bytes}-byte document limit.` }], structural: false, playable: false }; }
    catch { return { document: null, diagnostics: [{ code: 'schema.serializable', severity: 'error', message: 'Draft must be acyclic JSON data; executable objects and non-JSON values are unsupported.' }], structural: false, playable: false }; }
    const error = (code: string, message: string, objectId?: string) => diagnostics.push({ code, severity: 'error', message, ...(objectId ? { objectId } : {}) });
    const warn = (code: string, message: string, objectId?: string) => diagnostics.push({ code, severity: 'warning', message, ...(objectId ? { objectId } : {}) });
    const record = (v: unknown, path: string, keys?: string[]): v is Record<string, unknown> => {
        if (!isRecord(v)) { error('schema.object', `${path}: expected an object.`); return false; }
        for (const key of Object.keys(v)) if (['__proto__', 'constructor', 'prototype'].includes(key) || keys && !keys.includes(key)) error('schema.field', `${path}.${key}: unsupported field; nothing will be silently discarded.`);
        return true;
    };
    const text = (v: unknown, path: string, max = 256) => { if (typeof v !== 'string' || v.length > max) error('schema.string', `${path}: expected text of at most ${max} characters.`); };
    const id = (v: unknown, path: string) => { if (typeof v !== 'string' || !DRAFT_ID.test(v)) error('schema.id', `${path}: use a letter followed by up to 63 letters, digits, underscores or hyphens.`); };
    const number = (v: unknown, path: string, min: number = -DRAFT_LIMITS.coordinate, max: number = DRAFT_LIMITS.coordinate) => { if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) error('schema.number', `${path}: expected a finite number between ${min} and ${max}.`); };
    const bool = (v: unknown, path: string) => { if (typeof v !== 'boolean') error('schema.boolean', `${path}: expected true or false.`); };
    const oneOf = (v: unknown, values: readonly unknown[], path: string) => { if (!values.includes(v)) error('schema.enum', `${path}: expected ${values.join(', ')}.`); };
    const array = (v: unknown, path: string, limit: number): v is unknown[] => { if (!Array.isArray(v) || v.length > limit) { error('schema.array', `${path}: expected an array containing at most ${limit} items.`); return false; } return true; };
    const point = (v: unknown, path: string) => { if (record(v, path, ['x', 'y'])) { number(v.x, `${path}.x`); number(v.y, `${path}.y`); } };
    const box = (v: unknown, path: string) => { if (record(v, path, ['x', 'y', 'w', 'h'])) { number(v.x, `${path}.x`); number(v.y, `${path}.y`); number(v.w, `${path}.w`, .1); number(v.h, `${path}.h`, .1); } };
    let expressionNodes = 0;
    const expression = (v: unknown, path: string, depth = 0): void => {
        if (++expressionNodes > DRAFT_LIMITS.expressionNodes || depth > DRAFT_LIMITS.expressionDepth) { error('logic.limit', `${path}: expression complexity limit exceeded.`); return; }
        if (!record(v, path)) return;
        const keys = v.op === 'const' ? ['op', 'value'] : v.op === 'ref' ? ['op', 'id'] : v.op === 'not' ? ['op', 'arg'] : ['op', 'args'];
        record(v, path, keys);
        if (v.op === 'const') bool(v.value, `${path}.value`);
        else if (v.op === 'ref') text(v.id, `${path}.id`, 140);
        else if (v.op === 'not') expression(v.arg, `${path}.arg`, depth + 1);
        else if (v.op === 'and' || v.op === 'or') { if (array(v.args, `${path}.args`, 32)) { if (!v.args.length) error('logic.operands', `${path}: AND/OR needs at least one operand.`); v.args.forEach((a, i) => expression(a, `${path}.args[${i}]`, depth + 1)); } }
        else error('logic.operator', `${path}: unsupported operator; use const, ref, and, or or not.`);
    };
    if (!record(value, 'document', ['version', 'id', 'title', 'instruction', 'geometry', 'controller', 'bindings', 'presentation', 'previewStates', 'editor', 'imported'])) return { document: null, diagnostics, structural: false, playable: false };
    if (value.version !== 1) error('schema.version', 'document.version: only version 1 is supported.');
    id(value.id, 'document.id'); text(value.title, 'title'); text(value.instruction, 'instruction', 1024);
    if (record(value.geometry, 'geometry', ['width', 'height', 'objects'])) {
        number(value.geometry.width, 'geometry.width', 200, DRAFT_LIMITS.dimension); number(value.geometry.height, 'geometry.height', 200, DRAFT_LIMITS.dimension);
        if (array(value.geometry.objects, 'geometry.objects', DRAFT_LIMITS.objects)) value.geometry.objects.forEach((o, i) => {
            const path = `geometry.objects[${i}]`; if (!record(o, path)) return;
            const common = ['id', 'type', 'x', 'y', 'label'];
            const fields: Record<string, string[]> = { platform: ['w', 'h', 'kind', 'hookable', 'anchor', 'blocksCubeInteraction', 'hookCrumbleDelay', 'crumbleDelay', 'respawnDelay', 'listingOffsetX', 'assemblyBinding'], spawn: ['slot'], checkpoint: ['slot', 'checkpoint'], breakpoint: ['checkpoint', 'activationControl'], cube: ['mark'], device: ['kind', 'initial', 'checkpoint', 'legacy'], lift: ['w', 'h'], relay: ['w', 'h', 'pair', 'exitSide', 'nativeId'], firewall: ['orientation', 'length', 'thickness'], hazard: ['w', 'h'], exit: ['w', 'h', 'latch', 'arrivals'], marker: ['role'] };
            if (typeof o.type !== 'string' || !Object.hasOwn(fields, o.type)) { error('schema.object-type', `${path}: unsupported object type.`); return; }
            record(o, path, [...common, ...fields[o.type]]); id(o.id, `${path}.id`); number(o.x, `${path}.x`); number(o.y, `${path}.y`); if (o.label !== undefined) text(o.label, `${path}.label`);
            if (['platform', 'lift', 'relay', 'hazard', 'exit'].includes(o.type)) { number(o.w, `${path}.w`, .1); number(o.h, `${path}.h`, .1); }
            if (o.type === 'spawn' || o.type === 'checkpoint') oneOf(o.slot, [1, 2], `${path}.slot`);
            if (o.type === 'checkpoint' || o.type === 'breakpoint' || o.checkpoint !== undefined) oneOf(o.checkpoint, ['relay', 'upper'], `${path}.checkpoint`);
            if (o.type === 'platform') { oneOf(o.kind, ['static', 'code', 'unstable'], `${path}.kind`); for (const k of ['hookable', 'anchor', 'blocksCubeInteraction']) if (o[k] !== undefined) bool(o[k], `${path}.${k}`); for (const k of ['hookCrumbleDelay', 'crumbleDelay', 'respawnDelay']) if (o[k] !== undefined) number(o[k], `${path}.${k}`, .05, 60); if (o.listingOffsetX !== undefined) number(o.listingOffsetX, `${path}.listingOffsetX`); if (o.assemblyBinding !== undefined) text(o.assemblyBinding, `${path}.assemblyBinding`); }
            if (o.type === 'cube') text(o.mark, `${path}.mark`, 16);
            if (o.type === 'device') { oneOf(o.kind, ['plate', 'socket', 'scanner', 'toggle', 'terminal'], `${path}.kind`); if (o.initial !== undefined) bool(o.initial, `${path}.initial`); if (o.legacy !== undefined) oneOf(o.legacy, ['plate', 'plateB', 'plateC', 'cargoPlate', 'lever', 'upperLever', 'cubePad'], `${path}.legacy`); }
            if (o.type === 'relay') { id(o.pair, `${path}.pair`); oneOf(o.exitSide, [-1, 1], `${path}.exitSide`); if (o.nativeId !== undefined) id(o.nativeId, `${path}.nativeId`); }
            if (o.type === 'firewall') { oneOf(o.orientation, ['horizontal', 'vertical'], `${path}.orientation`); number(o.length, `${path}.length`, .1); number(o.thickness, `${path}.thickness`, .1, 256); }
            if (o.type === 'exit') { bool(o.latch, `${path}.latch`); oneOf(o.arrivals, [1, 2], `${path}.arrivals`); }
            if (o.type === 'breakpoint' && o.activationControl !== undefined) id(o.activationControl, `${path}.activationControl`);
            if (o.type === 'marker') oneOf(o.role, ['cargoRecovery'], `${path}.role`);
        });
    }
    if (record(value.controller, 'controller')) {
        if (value.controller.kind === 'declarative') { record(value.controller, 'controller', ['kind', 'outputs']); if (record(value.controller.outputs, 'controller.outputs')) { if (Object.keys(value.controller.outputs).length > DRAFT_LIMITS.outputs) error('resource.outputs', 'Too many controller outputs.'); for (const [k, v] of Object.entries(value.controller.outputs)) { id(k, `output ${k}`); expression(v, `output ${k}`); } } }
        else if (value.controller.kind === 'builtin') { record(value.controller, 'controller', ['kind', 'id', 'version']); oneOf(value.controller.id, BUILTINS, 'controller.id'); if (value.controller.version !== 1) error('controller.version', 'Only trusted built-in controller version 1 is supported.'); }
        else error('controller.kind', 'controller.kind must be declarative or builtin.');
    }
    if (array(value.bindings, 'bindings', DRAFT_LIMITS.bindings)) value.bindings.forEach((b, i) => { const p = `bindings[${i}]`; if (record(b, p, ['id', 'output', 'target', 'property', 'invert'])) { id(b.id, `${p}.id`); id(b.output, `${p}.output`); id(b.target, `${p}.target`); oneOf(b.property, ['active', 'open', 'power', 'unlock'], `${p}.property`); if (b.invert !== undefined) bool(b.invert, `${p}.invert`); } });
    if (record(value.presentation, 'presentation', ['wires', 'labels', 'cameraReveals', 'display'])) {
        point(value.presentation.display, 'presentation.display');
        if (array(value.presentation.wires, 'presentation.wires', DRAFT_LIMITS.wires)) value.presentation.wires.forEach((w, i) => { const p = `wires[${i}]`; if (record(w, p, ['id', 'binding', 'output', 'points', 'invertedLabel', 'legacyInput', 'sourcePowered'])) { id(w.id, `${p}.id`); for (const k of ['binding', 'output']) if (w[k] !== undefined) id(w[k], `${p}.${k}`); if (w.legacyInput !== undefined) text(w.legacyInput, `${p}.legacyInput`, 64); for (const k of ['invertedLabel', 'sourcePowered']) if (w[k] !== undefined) bool(w[k], `${p}.${k}`); if (array(w.points, `${p}.points`, DRAFT_LIMITS.wirePoints)) { if (w.points.length < 2) error('wire.points', `${p}: a wire needs two points.`); w.points.forEach((v, n) => point(v, `${p}.points[${n}]`)); } } });
        if (array(value.presentation.labels, 'presentation.labels', 128)) value.presentation.labels.forEach((l, i) => { const p = `labels[${i}]`; if (record(l, p, ['id', 'x', 'y', 'text'])) { id(l.id, `${p}.id`); number(l.x, `${p}.x`); number(l.y, `${p}.y`); text(l.text, `${p}.text`); } });
        if (array(value.presentation.cameraReveals, 'presentation.cameraReveals', 64)) value.presentation.cameraReveals.forEach((r, i) => { const p = `cameraReveals[${i}]`; if (record(r, p, ['id', 'source', 'platformIds', 'bounds', 'padding', 'duration'])) { id(r.id, `${p}.id`); id(r.source, `${p}.source`); if (r.bounds !== undefined) box(r.bounds, `${p}.bounds`); if (r.platformIds !== undefined && array(r.platformIds, `${p}.platformIds`, DRAFT_LIMITS.objects)) r.platformIds.forEach((v, j) => id(v, `${p}.platformIds[${j}]`)); if (r.padding !== undefined) number(r.padding, `${p}.padding`, 0, 1000); if (r.duration !== undefined) number(r.duration, `${p}.duration`, .05, 60); } });
    }
    if (record(value.previewStates, 'previewStates')) { if (Object.keys(value.previewStates).length > 32) error('resource.states', 'At most 32 preview states are supported.'); for (const [k, s] of Object.entries(value.previewStates)) { id(k, `previewStates.${k}`); if (record(s, `previewStates.${k}`)) for (const [port, v] of Object.entries(s)) { text(port, `preview port ${port}`, 140); bool(v, `preview port ${port}`); } } }
    if (record(value.editor, 'editor', ['hidden', 'locked', 'grid', 'snap'])) { for (const k of ['hidden', 'locked']) if (array(value.editor[k], `editor.${k}`, DRAFT_LIMITS.objects)) (value.editor[k] as unknown[]).forEach((v, i) => id(v, `editor.${k}[${i}]`)); number(value.editor.grid, 'editor.grid', 1, 256); bool(value.editor.snap, 'editor.snap'); }
    if (value.imported !== undefined && record(value.imported, 'imported', ['factory', 'warnings'])) { oneOf(value.imported.factory, BUILTINS, 'imported.factory'); if (array(value.imported.warnings, 'imported.warnings', 128)) value.imported.warnings.forEach((v, i) => text(v, `imported.warnings[${i}]`, 1024)); }
    if (diagnostics.length) return { document: null, diagnostics, structural: false, playable: false };
    // All structural branches above have checked every supported property.
    const document = value as unknown as DraftDocument, objects = document.geometry.objects;
    const ids = new Set<string>();
    for (const o of [...objects, ...document.bindings, ...document.presentation.wires, ...document.presentation.labels, ...document.presentation.cameraReveals]) { if (ids.has(o.id)) error('id.duplicate', `ID '${o.id}' is used more than once.`, o.id); ids.add(o.id); }
    const byId = new Map(objects.map(o => [o.id, o]));
    for (const slot of [1, 2]) if (objects.filter(o => o.type === 'spawn' && o.slot === slot).length !== 1) error('spawn.required', `Exactly one Player ${slot} spawn is required.`);
    if (objects.filter(o => o.type === 'exit').length !== 1) error('exit.required', 'Exactly one exit is required.');
    if (objects.filter(o => o.type === 'cube').length > DRAFT_LIMITS.cubes) error('resource.cubes', `At most ${DRAFT_LIMITS.cubes} cubes are supported.`);
    const devices = objects.filter(o => o.type === 'device'); if (devices.length > DRAFT_LIMITS.devices) error('resource.devices', `At most ${DRAFT_LIMITS.devices} devices are supported.`);
    const ports = new Set(devices.map(objectPort));
    const outputs = new Set(document.controller.kind === 'declarative' ? Object.keys(document.controller.outputs) : BUILTIN_OUTPUTS[document.controller.id]);
    const refs = (e: DraftExpression): string[] => e.op === 'ref' ? [e.id] : e.op === 'not' ? refs(e.arg) : e.op === 'and' || e.op === 'or' ? e.args.flatMap(refs) : [];
    if (document.controller.kind === 'declarative') {
        const expressions = document.controller.outputs, visited = new Set<string>(), active = new Set<string>();
        const visit = (k: string) => { if (active.has(k)) { error('logic.cycle', `Combinational cycle at output '${k}'. Stateful feedback is not supported.`, k); return; } if (visited.has(k)) return; active.add(k); for (const r of refs(expressions[k])) { if (outputs.has(r)) visit(r); else if (!ports.has(r)) error('logic.reference', `Output '${k}' references missing or incompatible port '${r}'.`, k); } active.delete(k); visited.add(k); };
        for (const k of outputs) visit(k);
        for (const o of devices) if (o.legacy) error('controller.legacy-device', 'Legacy roles are only valid with their trusted built-in controller.', o.id);
    }
    for (const [name, state] of Object.entries(document.previewStates)) for (const port of Object.keys(state)) if (!ports.has(port)) error('preview.reference', `State '${name}' references unknown device port '${port}'.`);
    const boundProperties = new Set<string>();
    for (const b of document.bindings) {
        if (!outputs.has(b.output)) error('binding.output', `Binding references unknown output '${b.output}'.`, b.target);
        const o = byId.get(b.target);
        if (!o) { error('binding.target', `Binding references missing object '${b.target}'.`, b.target); continue; }
        const valid = b.property === 'unlock' ? o.type === 'exit' : b.property === 'power' ? o.type === 'relay' || o.type === 'lift' : b.property === 'open' ? o.type === 'platform' && o.kind === 'static' : o.type === 'firewall' || o.type === 'platform' && o.kind !== 'static';
        if (!valid) error('binding.port', `${o.type} '${o.id}' does not support '${b.property}'.`, o.id);
        const key = `${b.target}.${b.property}`; if (boundProperties.has(key)) error('binding.duplicate', `More than one binding drives ${key}.`, o.id); boundProperties.add(key);
    }
    for (const o of objects) if (o.type === 'exit' || o.type === 'platform' && o.kind === 'code' || o.type === 'lift' || o.type === 'relay') {
        if (!document.bindings.some(b => b.target === o.id)) error('binding.required', `${o.type} '${o.id}' needs an explicit binding before playtesting.`, o.id);
    }
    for (const output of outputs) if (!document.bindings.some(b => b.output === output)) warn('output.unused', `Output '${output}' has no machinery target.`, output);
    for (const w of document.presentation.wires) { if (w.binding && !document.bindings.some(b => b.id === w.binding)) error('wire.binding', `Wire references missing binding '${w.binding}'.`, w.id); if (w.output && !outputs.has(w.output)) error('wire.output', `Wire references missing output '${w.output}'.`, w.id); }
    const pairs = new Map<string, typeof objects>(); for (const o of objects) if (o.type === 'relay') pairs.set(o.pair, [...(pairs.get(o.pair) ?? []), o]);
    if (pairs.size > DRAFT_LIMITS.relayPairs) error('resource.relays', `At most ${DRAFT_LIMITS.relayPairs} relay pairs are supported.`);
    for (const [name, gates] of pairs) { if (gates.length !== 2) error('relay.pair', `Relay pair '${name}' requires exactly two gates.`, gates[0]?.id); else { const feeds = gates.map(g => document.bindings.find(b => b.target === g.id)); if (feeds[0] && feeds[1] && (feeds[0].output !== feeds[1].output || !!feeds[0].invert !== !!feeds[1].invert)) error('relay.power', `Both ends of relay pair '${name}' must share the same power binding.`, gates[0].id); } }
    for (const r of document.presentation.cameraReveals) { if (byId.get(r.source)?.type !== 'device') error('camera.source', `Camera reveal source '${r.source}' must be a device.`, r.source); for (const p of r.platformIds ?? []) if (byId.get(p)?.type !== 'platform') error('camera.target', `Camera target '${p}' is not a platform.`, r.source); if (!r.bounds && !r.platformIds?.length) error('camera.empty', 'Camera reveal requires target platforms or bounds.', r.source); }
    for (const o of objects) {
        if (o.type === 'checkpoint') { if (objects.filter(c => c.type === 'checkpoint' && c.slot === o.slot && c.checkpoint === o.checkpoint).length > 1) error('checkpoint.duplicate', `Player ${o.slot} has duplicate '${o.checkpoint}' checkpoint positions.`, o.id); }
        if ((o.type === 'breakpoint' || o.type === 'device') && o.checkpoint) for (const slot of [1, 2]) if (!objects.some(c => c.type === 'checkpoint' && c.slot === slot && c.checkpoint === o.checkpoint)) error('checkpoint.reference', `Checkpoint '${o.checkpoint}' needs a Player ${slot} respawn centre.`, o.id);
        if (o.type === 'breakpoint' && o.activationControl && byId.get(o.activationControl)?.type !== 'device') error('checkpoint.control', `Breakpoint activation control '${o.activationControl}' is missing.`, o.id);
        if (o.type === 'platform' && o.kind === 'static' && o.hookable) warn('platform.static-hook', 'Static architecture remains unhookable; use a controlled code platform for hooks.', o.id);
    }
    for (const id of [...document.editor.hidden, ...document.editor.locked]) if (!ids.has(id)) error('editor.reference', `Editor metadata references missing ID '${id}'.`, id);
    const architecture = objects.filter(o => o.type === 'platform' && o.kind === 'static');
    for (const o of objects) {
        if (o.type === 'spawn' || o.type === 'checkpoint') {
            const b = objectBounds(o); if (b.x < 0 || b.y < 0 || b.x + b.w > document.geometry.width || b.y + b.h > document.geometry.height) error('spawn.bounds', 'Player centre is outside safe room bounds.', o.id);
            if (architecture.some(p => boxesOverlap(b, objectBounds(p)))) error('spawn.intersection', 'Player body intersects static architecture. Move the centre clear of the floor/wall.', o.id);
        }
        if (o.type === 'cube' && objects.some(h => (h.type === 'hazard' || h.type === 'firewall' && !document.bindings.some(b => b.target === h.id)) && boxesOverlap(objectBounds(o), objectBounds(h)))) warn('cube.hazard', 'Cube home intersects an always-active reset hazard.', o.id);
        if (o.type === 'relay') { const b = { x: o.exitSide > 0 ? o.x + o.w + 18 : o.x - 40, y: o.y + o.h - 34, w: 22, h: 34 }; if (architecture.some(p => boxesOverlap(b, objectBounds(p))) || b.x < 0 || b.x + b.w > document.geometry.width) warn('relay.obstructed', 'Relay destination is potentially obstructed by static geometry or room bounds; test actual transit.', o.id); }
    }
    if (document.controller.kind === 'builtin') {
        const template = importDraft(document.controller.id), retained = template.geometry.objects;
        const controlled = (o: typeof objects[number]) => o.type === 'device' || o.type === 'cube' || o.type === 'platform' && (o.kind === 'unstable' || o.id === 'cargo-buffer');
        for (const original of retained.filter(controlled)) {
            const edited = byId.get(original.id);
            if (!edited || edited.type !== original.type || original.type === 'device' && (edited.type !== 'device' || edited.kind !== original.kind || edited.legacy !== original.legacy)
                || original.type === 'platform' && (edited.type !== 'platform' || edited.kind !== original.kind)) error('controller.required-role', `Built-in ${document.controller.id} v1 requires the retained type and device role of '${original.id}'. Geometry and labels are editable; controller internals remain code-owned.`, original.id);
        }
        for (const object of objects.filter(controlled)) if (!retained.some(o => o.id === object.id && controlled(o))) error('controller.extra-role', `The trusted controller does not own additional ${object.type} '${object.id}'. Use declarative logic for new controls/cubes.`, object.id);
        for (const object of objects) if (object.type === 'platform' && object.kind === 'unstable') {
            const original = retained.find(o => o.id === object.id);
            if (original?.type === 'platform' && (object.hookCrumbleDelay !== original.hookCrumbleDelay || object.crumbleDelay !== original.crumbleDelay || object.respawnDelay !== original.respawnDelay)) error('controller.timing', 'Built-in unstable timing is code-owned. Keep the imported timing or create a declarative draft.', object.id);
        }
        for (const object of objects) if (object.type === 'device' && (object.initial || object.checkpoint)) error('controller.initial-state', 'Built-in initial state and checkpoint effects are code-owned; imported defaults must be preserved.', object.id);
        const exit = objects.find(o => o.type === 'exit'), unlock = document.bindings.find(b => b.target === exit?.id && b.property === 'unlock');
        if (!unlock || unlock.output !== 'exitDoor' || unlock.invert || exit?.type === 'exit' && (!exit.latch || exit.arrivals !== 2)) error('controller.exit', 'Built-in exit requires the retained latched exitDoor output and two physical arrivals.', exit?.id);
        const required: Record<string, string[]> = { 'race-condition': ['cubeA', 'cubeB', 'dropA', 'dropB', 'receiver', 'trace', 'return', 'phase', 'commit', 'crumbleA', 'crumbleB', 'cargo-buffer'], 'crossfeed-vault': ['cubeA', 'cubeB', 'entry', 'routePower', 'switchB', 'switchC', 'switchD', 'routeMode', 'crumbleA', 'crumbleB'], 'crumble-lab': ['crumbleA', 'crumbleB'] };
        for (const id of required[document.controller.id] ?? []) if (!byId.has(id)) error('controller.required-id', `Built-in ${document.controller.id} v1 requires retained object ID '${id}'.`, id);
        for (const message of document.imported?.warnings ?? []) warn('import.unsupported', message);
    }
    return { document, diagnostics, structural: true, playable: !diagnostics.some(d => d.severity === 'error') };
}
export function parseDraft(value: unknown): DraftDocument {
    const result = validateDraft(value);
    if (!result.structural || !result.document) throw new Error(result.diagnostics.map(d => `${d.code}: ${d.message}`).join('\n'));
    return result.document;
}
export function requirePlayable(value: unknown): DraftDocument {
    const result = validateDraft(value);
    if (!result.playable || !result.document) throw new Error(result.diagnostics.filter(d => d.severity === 'error').map(d => `${d.code}: ${d.message}`).join('\n'));
    return result.document;
}
