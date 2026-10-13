import { COOP_LABS } from '../coop/labs.ts';
import { roomConnections } from '../slice/connections.ts';
import type { RoomDef, CameraReveal } from '../slice/rooms.ts';
import type { MachineSignal } from '../slice/controller.ts';
import { type BuiltinControllerId, type DraftDocument, type DraftObject, type DraftBinding, type DraftReveal, newDraft } from './model.ts';
export { newDraft } from './model.ts';
/** Allowlisted factories only. No paths, evaluated strings, uploaded source or binary imports. */
export function importDraft(factory: string): DraftDocument {
    if (!Object.hasOwn(COOP_LABS, factory)) throw new Error(`Unknown trusted room factory '${factory}'. Choose ${Object.keys(COOP_LABS).join(', ')}.`);
    const id = factory as BuiltinControllerId, first = COOP_LABS[id].room(1), second = COOP_LABS[id].room(2);
    const objects: DraftObject[] = [], bindings: DraftBinding[] = [], reveals: DraftReveal[] = [];
    const bind = (target: string, output: MachineSignal, property: DraftBinding['property']) => bindings.push({ id: `binding-${target}`, target, output, property });
    const reveal = (source: string, camera?: CameraReveal) => { if (camera) reveals.push({ id: `camera-${source}`, source, ...(camera.bounds ? { bounds: { ...camera.bounds } } : {}), ...(camera.padding !== undefined ? { padding: camera.padding } : {}), ...(camera.duration !== undefined ? { duration: camera.duration } : {}), ...(camera.platformIds ? { platformIds: [...camera.platformIds] } : {}) }); };
    for (const [slot, room] of [[1, first], [2, second]] as const) {
        objects.push({ type: 'spawn', id: `player${slot}`, slot, ...room.spawn });
        objects.push({ type: 'checkpoint', id: `checkpoint${slot}`, slot, checkpoint: 'relay', ...room.checkpoint });
        if (room.upperCheckpoint) objects.push({ type: 'checkpoint', id: `upperCheckpoint${slot}`, slot, checkpoint: 'upper', ...room.upperCheckpoint });
    }
    for (const p of first.platforms) {
        const { id, kind, signal, openWhen, evidenceId: _evidence, ...geometry } = p;
        objects.push({ type: 'platform', id, ...geometry, kind: kind === 'crumble-proven' || kind === 'crumble-prototype' ? 'unstable' : kind });
        if (signal) bind(id, signal, 'active'); if (openWhen) bind(id, openWhen, 'open');
    }
    if (first.cube) objects.push({ type: 'cube', id: 'cube', mark: 'C', ...first.cube });
    for (const c of first.cubes ?? []) objects.push({ type: 'cube', id: c.id, mark: c.mark, ...c.spawn });
    for (const [legacy, name] of [['plate', 'plateA'], ['plateB', 'finalLeftScanner'], ['plateC', 'finalRightScanner'], ['cargoPlate', 'cargoPlate'], ['lever', 'lever'], ['upperLever', 'upperLever']] as const) {
        const at = first[legacy]; if (!at) continue;
        const control = legacy === 'lever' || legacy === 'upperLever';
        objects.push({ type: 'device', id: name, ...at, legacy, kind: control ? id === 'pairing-bay' || id.endsWith('-lab') ? 'terminal' : 'toggle' : legacy === 'cargoPlate' ? 'socket' : id === 'crossfeed-vault' ? 'scanner' : 'plate', label: name });
    }
    for (const p of first.plates ?? []) { objects.push({ type: 'device', id: p.id, kind: 'plate', ...p.at, label: p.label }); reveal(p.id, p.cameraReveal); }
    for (const p of first.cubePads ?? []) objects.push({ type: 'device', id: p.id, kind: 'socket', legacy: 'cubePad', ...p.at, label: p.label });
    for (const c of first.controls ?? []) { objects.push({ type: 'device', id: c.id, kind: c.kind ?? 'terminal', ...c.at, label: c.label }); reveal(c.id, c.cameraReveal); }
    for (const l of first.lifts ?? []) { const { signal, ...geometry } = l; objects.push({ type: 'lift', ...geometry }); bind(l.id, signal, 'power'); }
    for (const pair of first.gates ?? []) for (const g of pair.gates) { const gateId = `${pair.id}-${g.id}`; objects.push({ type: 'relay', ...g, id: gateId, pair: pair.id, nativeId: g.id }); bind(gateId, pair.signal, 'power'); }
    for (const f of first.firewalls ?? []) { const { signal, ...geometry } = f; objects.push({ type: 'firewall', ...geometry, thickness: f.thickness ?? 12 }); if (signal) bind(f.id, signal, 'active'); }
    first.hazards.forEach((h, i) => objects.push({ type: 'hazard', id: `hazard-${i + 1}`, ...h }));
    for (const b of first.breakpoints ?? []) objects.push({ type: 'breakpoint', id: b.id, ...b.at, checkpoint: b.checkpoint, ...(b.label ? { label: b.label } : {}), ...(b.activationControl ? { activationControl: b.activationControl } : {}) });
    if (first.cargoRecovery) objects.push({ type: 'marker', id: 'cargoRecovery', ...first.cargoRecovery, role: 'cargoRecovery' });
    objects.push({ type: 'exit', id: 'exit', ...first.exit, latch: true, arrivals: 2 }); bind('exit', 'exitDoor', 'unlock');
    const known = new Set(['id', 'title', 'instruction', 'width', 'height', 'spawn', 'entryPoints', 'breakpoints', 'checkpoint', 'cube', 'cubes', 'cubePads', 'controls', 'plates', 'wires', 'regions', 'plate', 'plateB', 'plateC', 'lever', 'upperLever', 'upperCheckpoint', 'cargoRecovery', 'cargoPlate', 'lifts', 'gates', 'firewalls', 'platforms', 'hazards', 'exit', 'display']);
    const warnings = Object.keys(first).filter(k => !known.has(k)).map(k => `Unsupported trusted room field '${k}'. Import blocked until an adapter is written.`);
    if (warnings.length) throw new Error(warnings.join('\n'));
    const base = newDraft(`${id}-copy`);
    return { ...base, title: `${first.title} / DRAFT`, instruction: first.instruction, geometry: { width: first.width, height: first.height, objects }, controller: { kind: 'builtin', id, version: 1 }, bindings,
        presentation: { display: { ...first.display }, labels: (first.regions ?? []).map((r, i) => ({ id: `label-${i + 1}`, ...r.at, text: r.label })), cameraReveals: reveals,
            wires: roomConnections(first).map(w => ({ id: `wire-${w.id}`, output: w.output, points: structuredClone(w.points), ...(w.inverted ? { invertedLabel: true } : {}), legacyInput: w.input, ...(w.resolved === false ? { sourcePowered: true } : {}) })) },
        previewStates: { idle: {} }, imported: { factory: id, warnings }, editor: { hidden: [], locked: [], grid: 20, snap: true } };
}
/** Normalized comparison for import tests. No runtime state, source code or evidence bundles. */
export function normalizedRoom(room: RoomDef): unknown { return JSON.parse(JSON.stringify(room)); }
