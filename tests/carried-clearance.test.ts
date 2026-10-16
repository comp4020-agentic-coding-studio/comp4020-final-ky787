import { expect, it, vi } from 'vitest';
import { newDraft, type DraftDocument } from '../src/workbench/model.ts';
import { createRuntime } from '../src/workbench/runtime.ts';
import { emptyInput } from '../src/engine/physics.ts';
import { CoopClient } from '../src/coop/client.ts';
import { SharedCubeAuthority } from '../src/coop/cube.ts';
import { assignCube, freshCube } from '../server/cube-state.ts';
import { newRecord, sharedRoom } from '../server/coop-state.ts';

function fixture(): DraftDocument {
    const d = newDraft('carry-clearance-fixture');
    d.geometry = { width: 1000, height: 700, objects: [
        { type: 'spawn', id: 'p1', slot: 1, x: 400, y: 583 }, { type: 'spawn', id: 'p2', slot: 2, x: 850, y: 583 },
        { type: 'platform', id: 'floor', kind: 'static', x: 0, y: 600, w: 1000, h: 100 },
        { type: 'platform', id: 'ceiling', kind: 'static', x: 200, y: 500, w: 500, h: 38 },
        { type: 'cube', id: 'payload', x: 430, y: 578, mark: 'A' },
        { type: 'exit', id: 'exit', x: 900, y: 460, w: 80, h: 140, arrivals: 2, latch: true },
    ] };
    d.controller = { kind: 'declarative', outputs: { off: { op: 'const', value: false }, on: { op: 'const', value: true } } };
    d.bindings = [{ id: 'exitPower', output: 'off', target: 'exit', property: 'unlock' }];
    d.presentation = { display: { x: 800, y: 100 }, labels: [], wires: [], cameraReveals: [] };
    d.previewStates = { idle: {} };
    return d;
}

it('a local pickup under a low ceiling is refused without ejecting the player to the roof edge', () => {
    const r = createRuntime(fixture());
    for (let n = 0; n < 3; n++) r.step();
    const before = { x: r.world.player.x, y: r.world.player.y };
    expect(r.world.canCarryCube()).toBe(false);
    r.step(emptyInput(), true);
    for (let n = 0; n < 30; n++) r.step();
    expect(r.world.cubes['draft:payload']!.carried).toBe(false);
    expect({ x: r.world.player.x, y: r.world.player.y }).toEqual(before);
});

it('the shared-cube pickup path does not send an impossible overhead carry request', () => {
    const r = createRuntime(fixture()), state = freshCube(); assignCube(state, 1);
    const client = new CoopClient(() => {}, () => {}); client.slot = 1; client.status = 'CONNECTED';
    client.room = sharedRoom(newRecord('ABCD', '11111111-1111-4111-8111-111111111111', 'boost-lab'), [true, true], [null, null], state);
    client.room.cubes = { 'draft:payload': state };
    const action = vi.spyOn(client, 'cubeAction').mockReturnValue(true);
    const authority = new SharedCubeAuthority(client, 'draft:payload');
    expect(authority.interact(r.world)).toBe(true);
    expect(action).not.toHaveBeenCalled();
    expect(state.holder).toBeNull();
});

it('a cube-only firewall reset before relay transit cannot produce a stale cargo transfer', () => {
    const d = fixture();
    d.geometry.objects = d.geometry.objects.filter(o => o.id !== 'ceiling');
    Object.assign(d.geometry.objects.find(o => o.id === 'p1')!, { x: 100 });
    Object.assign(d.geometry.objects.find(o => o.id === 'payload')!, { x: 130 });
    d.geometry.objects.push(
        { type: 'firewall', id: 'overhead', x: 70, y: 520, orientation: 'horizontal', length: 100, thickness: 10 },
        { type: 'relay', id: 'relayA', pair: 'pair', x: 90, y: 490, w: 56, h: 110, exitSide: 1 },
        { type: 'relay', id: 'relayB', pair: 'pair', x: 700, y: 490, w: 56, h: 110, exitSide: 1 },
    );
    for (const id of ['relayA', 'relayB']) d.bindings.push({ id: `${id}Power`, output: 'on', target: id, property: 'power' });
    const r = createRuntime(d);
    // Isolated event-order fixture: an already held cube enters its beam while
    // the avatar enters the relay in the same fixed step.
    r.world.cubes['draft:payload']!.carried = true;
    r.step();
    expect(r.world.player.x).toBe(785);
    expect(r.world.deaths).toBe(0);
    expect(r.world.cubes['draft:payload']!.carried).toBe(false);
    expect(r.world.cubes['draft:payload']!.x).toBe(130);
    expect(r.world.cubeTransferred).toBe(false);
    expect(r.world.events.some(e => e.kind === 'cube-firewall')).toBe(true);
    expect(r.world.events.some(e => e.kind === 'teleport')).toBe(true);
    expect(r.world.events.some(e => e.kind === 'relay-cargo')).toBe(false);
});

it('pickup checks the overhead payload envelope, including the gap above the head', () => {
    const d = fixture();
    Object.assign(d.geometry.objects.find(o => o.id === 'p1')!, { x: 210 });
    Object.assign(d.geometry.objects.find(o => o.id === 'payload')!, { x: 170 });
    // Both initial bodies fit: the cube is outside the ceiling's left edge.
    // On pickup, this thin ledge would sit exactly in the four-pixel hold gap.
    Object.assign(d.geometry.objects.find(o => o.id === 'ceiling')!, { y: 562, h: 4 });
    const r = createRuntime(d);
    for (let n = 0; n < 3; n++) r.step();
    expect(r.world.canCarryCube()).toBe(false);
    r.step(emptyInput(), true);
    expect(r.world.cubes['draft:payload']!.carried).toBe(false);
    expect(r.world.player.x).toBe(210);
    expect(r.world.player.y).toBe(583);
});

it('a foot-level obstacle beside the avatar does not block a clear overhead pickup', () => {
    const d = fixture();
    Object.assign(d.geometry.objects.find(o => o.id === 'payload')!, { x: 365 });
    // The avatar's right edge is 411; this short obstacle starts at 412. It
    // overlaps the old 44-wide full-height envelope, but neither actual body.
    Object.assign(d.geometry.objects.find(o => o.id === 'ceiling')!, { x: 412, y: 580, w: 10, h: 20 });
    const r = createRuntime(d);
    for (let n = 0; n < 3; n++) r.step();
    expect(r.world.canCarryCube()).toBe(true);
    r.step(emptyInput(), true);
    for (let n = 0; n < 30; n++) r.step();
    expect(r.world.cubes['draft:payload']!.carried).toBe(true);
    expect(r.world.player.x).toBe(400);
    expect(r.world.player.y).toBe(583);
});
