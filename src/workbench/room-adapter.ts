import type { CubeId, CubePlacement, PressurePlateId, Slot } from '../coop/protocol.ts';
import { PRESSURE_PLATES, CROSSFEED_PLATES } from '../coop/protocol.ts';
import type { MachineSignal } from '../slice/controller.ts';
import type { MachineConnection } from '../slice/connections.ts';
import type { RoomDef, CameraReveal } from '../slice/rooms.ts';
import { draftSignal } from './evaluate.ts';
import { codeActivation, type DraftDocument, type DraftDevice, type DraftBinding } from './model.ts';
import { requirePlayable } from './validation.ts';
const nativeSignals = ['exitDoor', 'grappleAnchor', 'bridge', 'codePlatformA', 'codePlatformB', 'relayGates', 'liftField', 'topBridge', 'bufferBridge', 'safetyFirewall', 'raceFirewall', 'spanMaster', 'phaseA', 'phaseB', 'returnBridge', 'serviceAccess', 'leftRoute', 'rightRoute', 'galleryAccess', 'vaultPower', 'vaultReturn'] as const;
export function nativeSignal(id: string): MachineSignal { const found = nativeSignals.find(s => s === id); if (!found) throw new Error(`Unknown built-in signal '${id}'`); return found; }
export function cubeRuntimeId(draft: DraftDocument, id: string): CubeId { if (draft.controller.kind === 'declarative') return draftSignal(id); if (id === 'cube' || id === 'cubeA' || id === 'cubeB') return id; throw new Error(`Built-in controller does not own cube '${id}'.`); }
function nativePlate(id: string): PressurePlateId { const found = [...PRESSURE_PLATES, ...CROSSFEED_PLATES].find(p => p === id); if (!found) throw new Error(`Unsupported retained plate '${id}'`); return found; }
function nativeControl(id: string): NonNullable<RoomDef['controls']>[number]['id'] { if (id === 'switchB' || id === 'switchC' || id === 'switchD' || id === 'routeMode' || id === 'phase' || id === 'commit') return id; throw new Error(`Unsupported retained control '${id}'`); }
function placement(id: string): Exclude<CubePlacement, 'spawn'> { if (id === 'cargoPlate' || id === 'liftCargo' || id === 'finalLeft' || id === 'finalRight') return id; return nativePlate(id); }
function nativeInput(id: string | undefined): MachineConnection['input'] { if (id === 'plateA' || id === 'plateB' || id === 'plateC' || id === 'switchB' || id === 'switchC' || id === 'switchD' || id === 'cubeOnPlate' || id === 'cubeOnPlateB' || id === 'cubeOnPlateC') return id; return 'plateA'; }
export function draftRoom(document: DraftDocument, slot: Slot = 1): RoomDef {
    const draft = requirePlayable(document), builtin = draft.controller.kind === 'builtin', objects = draft.geometry.objects;
    const at = (o: { x: number; y: number }) => ({ x: o.x, y: o.y });
    const spawn = objects.find(o => o.type === 'spawn' && o.slot === slot)!;
    const checkpoint = objects.find(o => o.type === 'checkpoint' && o.slot === slot && o.checkpoint === 'relay');
    const upper = objects.find(o => o.type === 'checkpoint' && o.slot === slot && o.checkpoint === 'upper');
    const exit = objects.find(o => o.type === 'exit'); if (!exit || exit.type !== 'exit') throw new Error('No exit');
    const room: RoomDef = { id: draft.controller.kind === 'builtin' ? draft.controller.id : 'workbench', title: draft.title, instruction: draft.instruction, width: draft.geometry.width, height: draft.geometry.height,
        spawn: at(spawn), checkpoint: at(checkpoint ?? spawn), entryPoints: objects.filter(o => o.type === 'spawn').map(at), ...(upper ? { upperCheckpoint: at(upper) } : {}),
        platforms: [], hazards: [], exit: { ...at(exit), w: exit.w, h: exit.h }, display: { ...draft.presentation.display }, wires: [], regions: draft.presentation.labels.map(l => ({ at: at(l), label: l.text })) };
    const bindingSignal = (b: DraftBinding): MachineSignal => builtin && !b.invert ? nativeSignal(b.output) : draftSignal(b.id);
    const feed = (id: string, property: DraftBinding['property']) => { const b = draft.bindings.find(b => b.target === id && b.property === property); return b ? bindingSignal(b) : undefined; };
    const reveal = (device: DraftDevice): CameraReveal | undefined => { const r = draft.presentation.cameraReveals.find(r => r.source === device.id); if (!r) return; const { id: _id, source: _source, ...camera } = r; return structuredClone(camera); };
    for (const o of objects) {
        if (o.type === 'platform') { const { type: _type, activation: _activation, kind, ...p } = o; room.platforms.push({ ...p, kind: kind === 'unstable' ? 'crumble-prototype' : kind, ...(kind === 'unstable' && !builtin ? { hookCrumbleDelay: o.hookCrumbleDelay ?? 1.65 } : {}), ...(kind === 'code' && codeActivation(o) !== 'signal' ? { signal: codeActivation(o) === 'always-powered' ? 'draft:activation:on' as const : 'draft:activation:off' as const } : feed(o.id, 'active') ? { signal: feed(o.id, 'active') } : {}), ...(feed(o.id, 'open') ? { openWhen: feed(o.id, 'open') } : {}) }); }
        else if (o.type === 'cube') { const id = cubeRuntimeId(draft, o.id); if (id === 'cube') room.cube = at(o); else (room.cubes ??= []).push({ id, spawn: at(o), mark: o.mark }); }
        else if (o.type === 'device') {
            if (o.legacy && o.legacy !== 'cubePad') room[o.legacy] = at(o);
            else if (o.legacy === 'cubePad') (room.cubePads ??= []).push({ id: placement(o.id), at: at(o), label: o.label ?? o.id });
            else if (o.kind === 'toggle' || o.kind === 'terminal') (room.controls ??= []).push({ id: builtin ? nativeControl(o.id) : draftSignal(o.id), kind: o.kind, ...(o.floating ? { floating: true } : {}), at: at(o), label: o.label ?? o.id, ...(reveal(o) ? { cameraReveal: reveal(o) } : {}) });
            else (room.plates ??= []).push({ id: builtin ? nativePlate(o.id) : draftSignal(o.id), ...(builtin ? {} : { kind: o.kind }), at: at(o), label: o.label ?? `${o.kind.toUpperCase()} / ${o.id}`, ...(reveal(o) ? { cameraReveal: reveal(o) } : {}) });
        }
        else if (o.type === 'lift') (room.lifts ??= []).push({ id: o.id, ...at(o), w: o.w, h: o.h, signal: feed(o.id, 'power')! });
        else if (o.type === 'firewall') (room.firewalls ??= []).push({ id: o.id, ...at(o), orientation: o.orientation, length: o.length, thickness: o.thickness, ...(feed(o.id, 'active') ? { signal: feed(o.id, 'active') } : {}) });
        else if (o.type === 'hazard') room.hazards.push({ ...at(o), w: o.w, h: o.h });
        else if (o.type === 'breakpoint') room.breakpoints = [...(room.breakpoints ?? []), { id: o.id, at: at(o), checkpoint: o.checkpoint, ...(o.label ? { label: o.label } : {}), ...(!builtin || draft.controller.kind === 'builtin' && draft.controller.id === 'crossfeed-vault' ? { automatic: true } : o.activationControl ? { activationControl: o.activationControl === 'lever' || o.activationControl === 'upperLever' ? o.activationControl : nativeControl(o.activationControl) } : {}) }];
        else if (o.type === 'marker') room.cargoRecovery = at(o);
    }
    const pairIds = [...new Set(objects.filter(o => o.type === 'relay').map(o => o.pair))];
    for (const pair of pairIds) { const gates = objects.filter(o => o.type === 'relay' && o.pair === pair); if (gates[0]?.type !== 'relay' || gates[1]?.type !== 'relay') throw new Error(`Missing relay pair ${pair}`); const one = gates[0], two = gates[1]; (room.gates ??= []).push({ id: pair, signal: feed(one.id, 'power')!, gates: [{ id: one.nativeId ?? one.id, ...at(one), w: one.w, h: one.h, exitSide: one.exitSide }, { id: two.nativeId ?? two.id, ...at(two), w: two.w, h: two.h, exitSide: two.exitSide }] }); }
    room.wires = draft.presentation.wires.flatMap(w => { const b = w.binding ? draft.bindings.find(b => b.id === w.binding) : undefined; const output = b ? bindingSignal(b) : w.output ? builtin ? nativeSignal(w.output) : draftSignal(w.output) : draftSignal(`decorative:${w.id}`); return [{ id: w.id.replace(/^wire-/, ''), input: nativeInput(w.legacyInput), output, points: structuredClone(w.points), resolved: !w.sourcePowered, ...(w.invertedLabel || b?.invert ? { inverted: true } : {}) }]; });
    return room;
}
