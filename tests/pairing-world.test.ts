import { expect, it } from 'vitest';
import { pairingBay } from '../src/coop/pairing-bay.ts';
import { PairingAuthority } from '../src/coop/authority.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { freshProgress } from '../src/slice/progress.ts';
import { emptyInput } from '../src/engine/physics.ts';
import { FIXED_DT } from '../src/engine/constants.ts';
import { sharedRoom, type RoomRecord } from '../server/coop-state.ts';
import type { Plate, Slot } from '../src/coop/protocol.ts';

function setup(slot: Slot) {
    const r: RoomRecord<'pairing-bay'> = { version: 5, cubePlacements: { cube: 'spawn' }, code: 'ABCD', level: 'pairing-bay', revision: 1,
        visitors: ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'],
        levelState: { switchB: false }, checkpoint: 'entry', exitUnlocked: false, reachedExit: [false, false], completed: false,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const reported: Plate[] = []; let switches = 0, arrivals = 0;
    const authority = new PairingAuthority(sharedRoom(r, [true, true], [null, null]), slot, p => reported.push(p), () => { switches++; }, () => { arrivals++; });
    const world = new PuzzleWorld(pairingBay(slot), freshProgress().rooms.switch, undefined, authority);
    return { world, authority, r, reported, switches: () => switches, arrivals: () => arrivals };
}
it.each([1, 2] as const)('slot %s reports its own physical A occupancy without locally powering machinery', slot => {
    const { world, reported } = setup(slot);
    for (let i = 0; i < 65; i++) world.step(FIXED_DT, { ...emptyInput(), right: world.player.x < 245, left: world.player.x > 255 });
    expect(reported).toContain('plateA');
    expect(world.inputs.plateA).toBe(false); expect(world.frame.outputs.grappleAnchor).toBe(false);
    expect(world.cube?.x).toBe(1190); expect(world.frame.source).toBe('mock-multiplayer'); expect(world.frame.evidence).toBeUndefined();
    expect(world.solids.filter(s => s.id === 'near' || s.id === 'far').every(s => !s.grappleable)).toBe(true);
});
it('cannot cross the unpowered gap with an ordinary run-jump', () => {
    const { world } = setup(2);
    for (let i = 0; i < 10; i++) world.step(FIXED_DT, { ...emptyInput(), right: true });
    for (let i = 0; i < 150; i++) world.step(FIXED_DT, { ...emptyInput(), right: true, jumpHeld: true, jumpPressed: i === 0 });
    expect(world.deaths).toBeGreaterThan(0);
});
it('releases the reused grapple when authoritative power is withdrawn', () => {
    const { world, authority, r } = setup(2);
    authority.room = sharedRoom(r, [true, true], ['plateA', null]);
    world.syncAuthority();
    for (let i = 0; i < 25; i++) world.step(FIXED_DT, { ...emptyInput(), right: true, grappleHeld: true, grapplePressed: i === 0, aim: { x: 770, y: 226 } });
    expect(world.player.rope.phase).toBe('attached');
    authority.room = sharedRoom(r, [false, true], [null, null]);
    world.step(FIXED_DT, { ...emptyInput(), grappleHeld: true });
    expect(world.player.rope.phase).not.toBe('attached'); expect(world.frame.outputs.grappleAnchor).toBe(false);
});
it.each([1, 2] as const)('slot %s can request B and report its physical exit arrival, but never decide completion', slot => {
    const { world, authority, r, switches, arrivals } = setup(slot);
    world.interact(); expect(switches()).toBe(0);
    // Fixture placement isolates the adapter; the browser suite covers the real approach.
    Object.assign(world.player, { x: 1050, y: 543 }); world.interact();
    expect(world.interactionHint()).toBe('E · LATCH RETURN BRIDGE');
    expect(switches()).toBe(1); expect(world.frame.outputs.bridge).toBe(false);
    r.levelState.switchB = true; r.checkpoint = 'reunion'; authority.room = sharedRoom(r, [true, true], [null, null]);
    world.syncAuthority();
    Object.assign(world.player, { x: 2100, y: 323 }); authority.sample(world);
    expect(arrivals()).toBe(0);
    r.exitUnlocked = true; authority.room = sharedRoom(r, [true, true], [null, null]); world.syncAuthority();
    Object.assign(world.player, { x: 1600, y: 543 }); authority.sample(world); expect(arrivals()).toBe(0);
    Object.assign(world.player, { x: 2100, y: 323 }); world.step(FIXED_DT, emptyInput());
    expect(arrivals()).toBeGreaterThan(0);
    expect(world.frame.outputs.exitDoor).toBe(true); expect(world.exited).toBe(false);
    const count = arrivals(); r.reachedExit[slot - 1] = true; authority.room = sharedRoom(r, [true, true], [null, null]);
    world.step(FIXED_DT, emptyInput()); expect(arrivals()).toBe(count);
    world.respawn(); expect(world.player.x).toBe(slot === 1 ? 1050 : 1150);
});

it.each([1, 2] as const)('slot %s can sense either final plate and releases it when its body leaves', slot => {
    const { world, authority, r, reported } = setup(slot);
    r.levelState.switchB = true; r.checkpoint = 'reunion'; authority.room = sharedRoom(r, [true, true], [null, null]);
    for (const [x, plate] of [[1680, 'finalLeft'], [1920, 'finalRight']] as const) {
        Object.assign(world.player, { x, y: 323, grounded: true }); authority.sample(world);
        expect(reported.at(-1)).toBe(plate);
    }
    Object.assign(world.player, { x: 1500, y: 543 }); authority.sample(world);
    expect(reported.at(-1)).toBeNull(); expect(world.frame.outputs.exitDoor).toBe(false);
});
