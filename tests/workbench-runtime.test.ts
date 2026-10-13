import { describe, expect, test } from 'vitest';
import { newDraft, serializeDraft, draftHash, objectPort, type DraftDocument, type DraftObject } from '../src/workbench/model.ts';
import { validateDraft, parseDraft } from '../src/workbench/validation.ts';
import { evaluateDraft } from '../src/workbench/evaluate.ts';
import { importDraft } from '../src/workbench/imports.ts';
import { draftRoom } from '../src/workbench/room-adapter.ts';
import { COOP_LABS } from '../src/coop/labs.ts';
import { createRuntime, validateStart } from '../src/workbench/runtime.ts';
import { emptyInput } from '../src/engine/physics.ts';
import { FIXED_DT } from '../src/engine/constants.ts';
import { roomConnections } from '../src/slice/connections.ts';
const step = (runtime: ReturnType<typeof createRuntime>, n: number, input = emptyInput()) => { for (let i = 0; i < n; i++) runtime.step(input); };
describe('canonical draft schema and typed logic', () => {
    test('canonical JSON hashing preserves drawing order and ignores object-key insertion order', async () => {
        const draft = newDraft('canonical'), reversed = { ...draft, geometry: { objects: draft.geometry.objects, height: draft.geometry.height, width: draft.geometry.width } };
        expect(serializeDraft(reversed)).toBe(serializeDraft(draft)); expect(await draftHash(reversed)).toBe(await draftHash(draft));
        const reordered = structuredClone(draft); reordered.geometry.objects.reverse(); expect(await draftHash(reordered)).not.toBe(await draftHash(draft));
        expect(parseDraft(JSON.parse(serializeDraft(draft)))).toEqual(draft);
    });
    test('AND/NOT outputs support fanout and single destination inversion', () => {
        const d = newDraft(); if (d.controller.kind !== 'declarative') throw new Error('fixture');
        d.controller.outputs.rightRoute = { op: 'and', args: [{ op: 'ref', id: 'powerPlate.occupied' }, { op: 'ref', id: 'routeLever.value' }] };
        expect(evaluateDraft(d, { 'powerPlate.occupied': true, 'routeLever.value': false })).toMatchObject({ routePower: true, rightRoute: false });
        expect(evaluateDraft(d, { 'powerPlate.occupied': true, 'routeLever.value': true })).toMatchObject({ routePower: false, rightRoute: true });
        d.bindings[0].invert = true; const runtime = createRuntime(d); runtime.preview({ 'powerPlate.occupied': true });
        expect(runtime.world.platforms.find(p => p.def.id === 'route')!.solid.enabled).toBe(false);
    });
    test('structural failures reject unsafe shapes; incomplete semantic drafts save but cannot run', () => {
        expect(validateDraft({ ...newDraft(), version: 99 }).structural).toBe(false);
        expect(validateDraft({ ...newDraft(), execute: 'alert(1)' }).diagnostics.some(d => d.code === 'schema.field')).toBe(true);
        const missing = newDraft(); missing.geometry.objects = missing.geometry.objects.filter(o => o.id !== 'powerPlate');
        expect(validateDraft(missing).structural).toBe(true); expect(validateDraft(missing).playable).toBe(false); expect(() => parseDraft(missing)).not.toThrow(); expect(() => createRuntime(missing)).toThrow(/reference/);
        const cyclic = newDraft(); if (cyclic.controller.kind !== 'declarative') throw new Error('fixture'); cyclic.controller.outputs.a = { op: 'ref', id: 'b' }; cyclic.controller.outputs.b = { op: 'ref', id: 'a' };
        expect(validateDraft(cyclic).diagnostics.some(d => d.code === 'logic.cycle')).toBe(true);
        const nonfinite = newDraft(); nonfinite.geometry.objects[0].x = Infinity; expect(validateDraft(nonfinite).structural).toBe(false);
    });
    test('blocked spawn is a genuine blocking error, ordinary scenery overlap is allowed', () => {
        const d = newDraft(); d.geometry.objects.find(o => o.id === 'player1')!.y = 700;
        expect(validateDraft(d).diagnostics.some(d => d.code === 'spawn.intersection')).toBe(true);
        const good = newDraft(); good.geometry.objects.push({ type: 'platform', id: 'stacked', kind: 'static', x: 0, y: 710, w: 300, h: 100 }); expect(validateDraft(good).playable).toBe(true);
    });
});
describe('trusted draft import compatibility', () => {
    for (const id of ['race-condition', 'crossfeed-vault', 'relay-lab', 'lift-lab', 'crumble-lab', 'boost-lab', 'firewall-lab', 'pairing-bay'] as const) test(`${id} preserves geometry, both spawns and camera metadata after roundtrip`, () => {
        const imported = importDraft(id), draft = parseDraft(JSON.parse(serializeDraft(imported)));
        expect(validateDraft(draft).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
        for (const slot of [1, 2] as const) {
            const source = COOP_LABS[id].room(slot), room = draftRoom(draft, slot);
            expect(room.spawn).toEqual(source.spawn); expect(room.checkpoint).toEqual(source.checkpoint); expect(room.upperCheckpoint).toEqual(source.upperCheckpoint);
            expect(room.platforms).toEqual(source.platforms); expect(room.cubes).toEqual(source.cubes); expect(room.cube).toEqual(source.cube);
            expect(room.gates).toEqual(source.gates); expect(room.lifts).toEqual(source.lifts); expect(room.hazards).toEqual(source.hazards);
            expect(room.controls).toEqual(source.controls); expect(room.plates).toEqual(source.plates); expect(room.cubePads).toEqual(source.cubePads); expect(room.breakpoints).toEqual(source.breakpoints);
            expect(room.regions).toEqual(source.regions ?? []);
            const normalizedWires = (wires: NonNullable<typeof room.wires>) => wires.map(w => ({ ...w, resolved: w.resolved !== false, inverted: !!w.inverted }));
            expect(normalizedWires(room.wires!)).toEqual(normalizedWires(roomConnections(source)));
        }
    });
});
describe('same PuzzleWorld physics with multiple instances', () => {
    test('running and recording never changes authored spawn/cube geometry', () => {
        const d = newDraft(), before = serializeDraft(d), runtime = createRuntime(d); step(runtime, 120, { ...emptyInput(), right: true });
        expect(runtime.world.player.x).toBeGreaterThan(200); expect(runtime.world.player.grounded).toBe(true); expect(runtime.recording.samples.length).toBeGreaterThan(20); expect(serializeDraft(d)).toBe(before); expect(serializeDraft(runtime.document)).toBe(before);
        expect(validateStart(runtime.world, { x: 200, y: 710 })).toMatch(/intersects/); expect(() => runtime.restart({ x: 200, y: 710 })).toThrow(/intersects/);
    });
    test('ordinary plate, socket and scanner retain distinct real contact semantics', () => {
        const d = newDraft(); d.geometry.objects.push({ type: 'device', id: 'socket', kind: 'socket', x: 800, y: 680 }, { type: 'device', id: 'scanner', kind: 'scanner', x: 1100, y: 680 });
        const runtime = createRuntime(d, 1, { start: { x: 440, y: 663 } }); step(runtime, 3);
        expect(runtime.snapshot().deviceValues['powerPlate.occupied']).toBe(true);
        runtime.restart({ x: 800, y: 663 }); step(runtime, 3); expect(runtime.snapshot().deviceValues['socket.occupied']).toBe(false);
        runtime.restart({ x: 1100, y: 663 }); step(runtime, 3); expect(runtime.snapshot().deviceValues['scanner.occupied']).toBe(true);
    });
    test('three cubes, two relay pairs, one held cube, and independent resets within bounds', () => {
        const d = newDraft(); d.geometry.objects.push({ type: 'cube', id: 'payloadB', mark: 'B', x: 380, y: 658 }, { type: 'cube', id: 'payloadC', mark: 'C', x: 510, y: 658 });
        for (const [id, pair, x] of [['gateA', 'pairA', 70], ['gateB', 'pairA', 1000], ['gateC', 'pairB', 700], ['gateD', 'pairB', 1200]] as const) { d.geometry.objects.push({ type: 'relay', id, pair, x, y: 570, w: 56, h: 110, exitSide: 1 }); d.bindings.push({ id: `power-${id}`, output: 'relayPower', target: id, property: 'power' }); }
        if (d.controller.kind !== 'declarative') throw new Error('fixture'); d.controller.outputs.relayPower = { op: 'const', value: false };
        expect(validateDraft(d).playable).toBe(true); const runtime = createRuntime(d, 1, { start: { x: 310, y: 663 } }); step(runtime, 3); runtime.step(emptyInput(), true);
        expect(Object.values(runtime.world.cubes).filter(c => c.carried)).toHaveLength(1); runtime.world.respawn(); expect(Object.values(runtime.world.cubes).filter(c => c.carried)).toHaveLength(0); expect(runtime.world.cubes['draft:payload']!.x).not.toBe(310); runtime.restart({ x: 310, y: 663 }); step(runtime, 3); runtime.step(emptyInput(), true); runtime.step(emptyInput(), true); expect(Object.values(runtime.world.cubes).filter(c => c.carried)).toHaveLength(0);
        const b = runtime.world.cubes['draft:payloadB']!, c = runtime.world.cubes['draft:payloadC']!; const cHome = { x: c.x, y: c.y }; b.x = 999; runtime.world.returnCube('draft:payloadB'); expect(b.x).toBe(380); expect({ x: c.x, y: c.y }).toEqual(cHome); expect(runtime.world.gates).toHaveLength(2);
        d.controller.outputs.relayPower = { op: 'const', value: true };
        const firstPair = createRuntime(d, 1, { start: { x: 95, y: 663 } }); step(firstPair, 1); expect(firstPair.world.player.x).toBe(1085);
        const secondPair = createRuntime(d, 1, { start: { x: 725, y: 663 } }); step(secondPair, 1); expect(secondPair.world.player.x).toBe(1285);
    });
    test('unstable defaults agree with shared timing and hook eligibility stays disabled', () => {
        const d = newDraft(); d.geometry.objects.push({ type: 'platform', id: 'unstable', kind: 'unstable', x: 700, y: 400, w: 180, h: 30, hookable: false });
        const runtime = createRuntime(d), platform = runtime.world.platforms.find(p => p.def.id === 'unstable')!;
        expect(platform.def.hookCrumbleDelay).toBe(1.65); expect(platform.solid.grappleable).toBe(false); step(runtime, 3); expect(platform.solid.grappleable).toBe(false);
    });
    test('retained controller IDs cannot silently change device types or exit semantics', () => {
        const d = importDraft('race-condition'), control = d.geometry.objects.find(o => o.id === 'phase'); if (control?.type !== 'device') throw new Error('fixture'); control.kind = 'plate';
        expect(validateDraft(d).diagnostics.some(d => d.code === 'controller.required-role')).toBe(true);
        const extra = importDraft('relay-lab'); extra.geometry.objects.push({ type: 'cube', id: 'newPayload', x: 330, y: 538, mark: 'X' }); expect(validateDraft(extra).diagnostics.some(d => d.code === 'controller.extra-role')).toBe(true);
        const exit = importDraft('crossfeed-vault'); exit.bindings.find(b => b.property === 'unlock')!.invert = true; expect(validateDraft(exit).diagnostics.some(d => d.code === 'controller.exit')).toBe(true);
    });
    test('imported Race Cargo Clock still closes buffer at expiry using trusted timing', () => {
        const runtime = createRuntime(importDraft('race-condition'));
        // Explicit initial diagnostic cube setup: this is Cargo Clock section validation, not a solved route.
        const cube = runtime.world.cubes.cubeA!; Object.assign(cube, { x: 205, y: 658, vx: 0, vy: 0, grounded: true, groundId: 'cargo-buffer' });
        step(runtime, 3); expect(runtime.world.frame.timer?.phase).toBe('window'); runtime.world.respawn(); step(runtime, 3); expect(runtime.world.frame.timer?.phase).toBe('window'); step(runtime, Math.ceil(2.9 / FIXED_DT)); expect(runtime.world.frame.timer?.phase).toBe('expired'); expect(runtime.world.platforms.find(p => p.def.id === 'cargo-buffer')!.solid.enabled).toBe(false);
        runtime.world.returnCube('cubeA'); step(runtime, 2); expect(runtime.world.frame.timer?.phase).toBe('idle');
    });
});
