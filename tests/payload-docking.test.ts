import { expect, it, vi } from 'vitest';
import { emptyInput } from '../src/engine/physics.ts';
import { alignPayloads } from '../src/slice/payload-docking.ts';
import { createRuntime } from '../src/workbench/runtime.ts';
import { receiverReview } from '../scripts/fixtures/receiver-review.ts';
import type { CubeAuthority } from '../src/slice/world.ts';

function scene(offset = 40) {
    const d = receiverReview(); d.geometry.objects.find(o => o.id === 'cargoA')!.x = 800 + offset;
    return d;
}
it('leaves a resting cube on a universal pressure plate at its original position', () => {
    const d = scene(); d.geometry.objects.find(o => o.id === 'cargoA')!.x = 1115;
    const rt = createRuntime(d);
    for (let i = 0; i < 30; i++) rt.step();
    expect(rt.authority.values['pressure.occupied']).toBe(true);
    expect(rt.world.cubes['draft:cargoA']!.x).toBe(1115);
    expect(rt.world.payloadDocks).toEqual([]);
});
it.each([-58, -30, 0, 30, 58])('centres a valid resting cube from offset %s and holds the same live pose', offset => {
    const rt = createRuntime(scene(offset)), w = rt.world, c = w.cubes['draft:cargoA']!;
    for (let i = 0; i < 60; i++) rt.step();
    expect(c).toMatchObject({ x: 800, y: 598, grounded: true, carried: false, vx: 0, vy: 0 });
    expect(w.payloadDocks).toEqual([{ receiver: 'draft:receiver1', cube: 'draft:cargoA', at: { x: 800, y: 598 } }]);
    expect(rt.authority.values['receiver1.occupied']).toBe(true);
    expect(rt.authority.values['pressure.occupied']).toBe(false);
});
it('uses the same centred body for standing support, immediate pickup and subsequent normal drop', () => {
    const d = scene(); const p = d.geometry.objects.find(o => o.id === 'p1')!; p.x = 800; p.y = 490;
    const rt = createRuntime(d), w = rt.world;
    for (let i = 0; i < 80; i++) rt.step();
    expect(w.player.groundId).toBe('cube-body:draft:cargoA');
    expect(w.player.y).toBe(559);
    rt.step(emptyInput(), true);
    expect(w.cubes['draft:cargoA']!.carried).toBe(true);
    expect(w.payloadDocks).toEqual([]);
    expect(rt.authority.values['receiver1.occupied']).toBe(false);
    for (let i = 0; i < 60; i++) rt.step({ ...emptyInput(), right: true });
    rt.step(emptyInput(), true);
    for (let i = 0; i < 60; i++) rt.step();
    expect(w.cubes['draft:cargoA']!.carried).toBe(false);
    expect(w.cubes['draft:cargoA']!.x).toBeGreaterThan(900);
    expect(w.payloadDocks).toEqual([]);
});
it('grapples the visible centred cube and immediately releases the connection', () => {
    const d = scene(); d.geometry.objects.find(o => o.id === 'p1')!.x = 650;
    const rt = createRuntime(d), w = rt.world;
    for (let i = 0; i < 12; i++) rt.step();
    rt.step({ ...emptyInput(), grapplePressed: true, grappleHeld: true, aim: { x: 800, y: 598 } });
    expect(w.pullingCubeId).toBe('draft:cargoA');
    expect(w.payloadDocks).toEqual([]);
    expect(rt.authority.values['receiver1.occupied']).toBe(false);
    for (let i = 0; i < 30; i++) rt.step({ ...emptyInput(), grappleHeld: true });
    expect(w.cubes['draft:cargoA']!.x).toBeLessThan(740);
});
it('losing support allows cargo to fall instead of pinning it to an active socket', () => {
    const rt = createRuntime(scene()), w = rt.world;
    w.platforms.find(p => p.def.id === 'floor')!.solid.enabled = false;
    for (let i = 0; i < 10; i++) rt.step();
    expect(w.cubes['draft:cargoA']!.y).toBeGreaterThan(598);
    expect(w.payloadDocks).toEqual([]);
    expect(rt.authority.values['receiver1.occupied']).toBe(false);
});
it('preserves simultaneous neighbouring sensor contacts rather than altering the controller inputs', () => {
    const d = scene(50); d.geometry.objects.find(o => o.id === 'pressure')!.x = 895;
    const rt = createRuntime(d);
    for (let i = 0; i < 20; i++) rt.step();
    expect(rt.world.cubes['draft:cargoA']!.x).toBe(850);
    expect(rt.authority.values['receiver1.occupied']).toBe(true);
    expect(rt.authority.values['pressure.occupied']).toBe(true);
    expect(rt.world.payloadDocks).toEqual([]);
});
it('does not snap through solid architecture or across an unsupported bay', () => {
    const d = scene(55);
    d.geometry.objects.push({ type: 'platform', id: 'barrier', kind: 'static', x: 810, y: 560, w: 10, h: 60 });
    const rt = createRuntime(d);
    for (let i = 0; i < 12; i++) rt.step();
    expect(rt.world.cubes['draft:cargoA']!.x).toBe(855);
    expect(rt.world.payloadDocks).toEqual([]);
    rt.world.platforms.find(p => p.def.id === 'barrier')!.solid.enabled = false;
    const floor = rt.world.platforms.find(p => p.def.id === 'floor')!.solid; floor.x = 830;
    expect(alignPayloads(rt.world)).toEqual([]);
});
it('requires the accepted cube identity even if a different cube overlaps an active receiver', () => {
    const rt = createRuntime(scene(40)), w = rt.world, c = w.cubes['draft:cargoA']!;
    c.x = 840;
    const authority = { acceptedPlacement: 'draft:receiver2' } as CubeAuthority;
    vi.spyOn(w, 'cubeAuthority').mockReturnValue(authority);
    expect(alignPayloads(w)).toEqual([]); expect(c.x).toBe(840);
    Object.assign(authority, { acceptedPlacement: 'draft:receiver1' });
    expect(alignPayloads(w)).toHaveLength(1); expect(c.x).toBe(800);
    // Pending pickup/reset/pull or disconnection revokes alignment immediately.
    Object.assign(authority, { acceptedPlacement: null });
    expect(alignPayloads(w)).toEqual([]);
});

it('waits for either avatar to clear the bay without delaying live occupancy or moving the player', () => {
    const d = scene(45); d.geometry.objects.find(o => o.id === 'p1')!.x = 800;
    const rt = createRuntime(d), w = rt.world;
    for (let i = 0; i < 12; i++) rt.step();
    expect(w.cubes['draft:cargoA']!.x).toBe(845);
    expect(w.player.x).toBe(800); expect(rt.authority.values['receiver1.occupied']).toBe(true);
    expect(w.payloadDocks).toEqual([]);
    const authority = { acceptedPlacement: 'draft:receiver1', dockingObstacle: { x: 800, y: 603 },
        simulates: true, sync() {}, pull() { return false; }, cancelPull() {} } as unknown as CubeAuthority;
    vi.spyOn(w, 'cubeAuthority').mockReturnValue(authority);
    for (let i = 0; i < 50; i++) rt.step({ ...emptyInput(), left: true });
    expect(w.payloadDocks).toEqual([]); // The partner is still inside the bay.
    Object.assign(authority, { dockingObstacle: { x: 700, y: 603 } }); rt.step();
    expect(w.payloadDocks).toHaveLength(1); expect(w.cubes['draft:cargoA']!.x).toBe(800);
    expect(rt.authority.values['receiver1.occupied']).toBe(true);
});
