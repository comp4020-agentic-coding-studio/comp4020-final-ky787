import { expect, it } from 'vitest';
import { pairingBay } from '../src/coop/pairing-bay.ts';
import { PairingAuthority } from '../src/coop/authority.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { freshProgress } from '../src/slice/progress.ts';
import { emptyInput } from '../src/engine/physics.ts';
import { FIXED_DT } from '../src/engine/constants.ts';
import { sharedRoom, type RoomRecord } from '../server/pairing-state.ts';
import type { Plate, Slot } from '../src/coop/protocol.ts';

function setup(slot: Slot) {
    const r: RoomRecord = { version: 1, code: 'ABCD', level: 'pairing-bay', revision: 1,
        visitors: ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'],
        switchB: false, checkpoint: 'entry', completed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const reported: Plate[] = []; let switches = 0;
    const authority = new PairingAuthority(sharedRoom(r, [true, true], [null, null]), slot, p => reported.push(p), () => { switches++; });
    const world = new PuzzleWorld(pairingBay(slot), freshProgress().rooms.switch, undefined, authority);
    return { world, authority, r, reported, switches: () => switches };
}
it('reports physical occupancy without locally powering machinery, and never creates a cube', () => {
    const { world, reported } = setup(1);
    for (let i = 0; i < 45; i++) world.step(FIXED_DT, { ...emptyInput(), right: world.player.x < 245 });
    expect(reported).toContain('plateA');
    expect(world.inputs.plateA).toBe(false); expect(world.frame.outputs.grappleAnchor).toBe(false);
    expect(world.cube).toBeNull(); expect(world.frame.source).toBe('mock-multiplayer'); expect(world.frame.evidence).toBeUndefined();
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
it('a switch request cannot latch locally and completion is never inferred from local exit contact', () => {
    const { world, authority, r, switches } = setup(2);
    // Fixture placement isolates the adapter; the browser suite covers the real approach.
    Object.assign(world.player, { x: 1050, y: 543 }); world.interact();
    expect(switches()).toBe(1); expect(world.frame.outputs.bridge).toBe(false);
    r.switchB = true; r.checkpoint = 'reunion'; authority.room = sharedRoom(r, [true, true], ['finalLeft', 'finalRight']);
    world.syncAuthority(); Object.assign(world.player, { x: 1780, y: 543 }); world.step(FIXED_DT, emptyInput());
    expect(world.frame.outputs.exitDoor).toBe(true); expect(world.exited).toBe(false);
    world.respawn(); expect(world.player.x).toBe(1150);
});
