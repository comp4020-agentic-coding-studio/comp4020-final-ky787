import { expect, it, vi } from 'vitest';
import { acceptCubeSnapshot, assignCube, freshCube, interactCube } from '../server/cube-state.ts';
import { parseClientMessage, type Slot } from '../src/coop/protocol.ts';
import { RemoteCube, RemoteAvatar } from '../src/coop/remote.ts';
import { SharedCubeAuthority } from '../src/coop/cube.ts';
import { PairingAuthority } from '../src/coop/authority.ts';
import { pairingBay } from '../src/coop/pairing-bay.ts';
import { sharedRoom, type RoomRecord } from '../server/pairing-state.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { emptyInput } from '../src/engine/physics.ts';
import { FIXED_DT } from '../src/engine/constants.ts';
import { freshProgress } from '../src/slice/progress.ts';
import { AudioPresentation } from '../src/slice/audio-presentation.ts';

const transform = { x: 1200, y: 538, vx: 0, vy: 0, grounded: true };
it.each([1, 2] as const)('slot %s can win a pickup race, drop, and hand authority to the partner', slot => {
    const cube = freshCube(), partner = (3 - slot) as Slot;
    assignCube(cube, 1);
    const epoch = cube.epoch;
    expect(interactCube(cube, slot, { type: 'cube-pickup', seq: 1, epoch })).toBe(true);
    expect(interactCube(cube, partner, { type: 'cube-pickup', seq: 1, epoch })).toBe(false);
    expect(cube.holder).toBe(slot); expect(cube.physicsAuthority).toBe(slot);
    expect(interactCube(cube, partner, { type: 'cube-drop', seq: 2, epoch: cube.epoch, transform })).toBe(false);
    expect(interactCube(cube, slot, { type: 'cube-drop', seq: 2, epoch: cube.epoch, transform })).toBe(true);
    expect(cube.holder).toBeNull(); expect(cube.physicsAuthority).toBe(slot);
    expect(interactCube(cube, partner, { type: 'cube-pickup', seq: 3, epoch: cube.epoch })).toBe(true);
    expect(cube.holder).toBe(partner); expect(cube.physicsAuthority).toBe(partner);
});

it.each([1, 2] as const)('slot %s claims a loose pull; competing pull/carry waits until release', slot => {
    const cube = freshCube(), partner = (3 - slot) as Slot;
    assignCube(cube, partner);
    expect(interactCube(cube, slot, { type: 'cube-pull-start', seq: 1, epoch: cube.epoch })).toBe(true);
    expect(cube.holder).toBeNull(); expect(cube.pulling).toBe(true); expect(cube.physicsAuthority).toBe(slot);
    for (const type of ['cube-pull-start', 'cube-pickup', 'cube-pull-stop'] as const)
        expect(interactCube(cube, partner, { type, seq: 2, epoch: cube.epoch })).toBe(false);
    expect(interactCube(cube, slot, { type: 'cube-pull-stop', seq: 3, epoch: cube.epoch })).toBe(true);
    expect(cube.pulling).toBe(false); expect(cube.physicsAuthority).toBe(slot);
    expect(interactCube(cube, partner, { type: 'cube-pull-start', seq: 4, epoch: cube.epoch })).toBe(true);
    expect(cube.physicsAuthority).toBe(partner);
    expect(interactCube(cube, partner, { type: 'cube-pickup', seq: 5, epoch: cube.epoch })).toBe(true);
    expect(cube.pulling).toBe(false);
    expect(interactCube(cube, slot, { type: 'cube-pull-start', seq: 6, epoch: cube.epoch })).toBe(false);
});

it('retains only the latest accepted transform and revokes old streams even when the same slot returns', () => {
    const cube = freshCube(); assignCube(cube, 1);
    const frame = { type: 'cube' as const, epoch: cube.epoch, seq: 10, transform };
    expect(acceptCubeSnapshot(cube, 2, frame)).toBe(false);
    expect(acceptCubeSnapshot(cube, 1, frame)).toBe(true);
    expect(acceptCubeSnapshot(cube, 1, { ...frame, transform: { ...transform, x: 0 } })).toBe(false);
    assignCube(cube, 2); expect(cube.transform).toEqual(transform);
    expect(acceptCubeSnapshot(cube, 1, { ...frame, seq: 11 })).toBe(false);
    expect(acceptCubeSnapshot(cube, 2, { ...frame, epoch: cube.epoch, seq: 0 })).toBe(true);
    assignCube(cube, null); assignCube(cube, 1);
    expect(acceptCubeSnapshot(cube, 1, { ...frame, seq: 100 })).toBe(false);
});

it('validates exact cube keys, bounds, independent sequences and server-owned attribution', () => {
    const frame = { type: 'cube', epoch: 1, seq: 1, transform };
    expect(parseClientMessage(JSON.stringify(frame))).toEqual(frame);
    for (const extra of ['owner', 'slot', 'visitor', 'revision', 'finalAccess', 'holder', 'physicsAuthority'])
        expect(parseClientMessage(JSON.stringify({ ...frame, [extra]: 1 }))).toBeNull();
    for (const key of ['x', 'y', 'vx', 'vy']) for (const value of [1e8, -1e8, NaN, Infinity, '1'])
        expect(parseClientMessage(JSON.stringify({ ...frame, transform: { ...transform, [key]: value } }))).toBeNull();
    for (const value of [-1, 1.1, '1', null]) for (const key of ['seq', 'epoch'])
        expect(parseClientMessage(JSON.stringify({ ...frame, [key]: value }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ type: 'cube-occupancy', seq: 1, epoch: 1, cargo: true, placement: 'cargoPlate' }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ ...frame, transform: { ...transform, carried: true } }))).toBeNull();
});

it('buffers remote motion, holds when samples stop, and snaps transfers/discontinuities', () => {
    const replica = new RemoteCube(), cube = { ...freshCube(), epoch: 1, transform };
    replica.reset(cube, 1000);
    replica.push({ ...transform, x: 1300 }, 1, 1, 1100);
    expect(replica.sample(1150)!.x).toBe(1250);
    expect(replica.push({ ...transform, x: 0 }, 0, 999, 1150)).toBe(false);
    expect(replica.sample(5000)!.x).toBe(1300);
    replica.push({ ...transform, x: 1800 }, 1, 2, 5100); expect(replica.sample(5100)!.x).toBe(1800);
    replica.reset({ ...cube, epoch: 2, transform: { ...transform, x: 1100 } }, 5200);
    expect(replica.sample(5200)!.x).toBe(1100);
    replica.reset({ ...cube, epoch: 3, transform: { ...transform, y: 420, grounded: false } }, 6000);
    replica.push(transform, 3, 1, 6100);
    expect(replica.sample(6150)!.grounded).toBe(false); // Never an interpolated airborne platform.
    expect(replica.sample(6250)!.grounded).toBe(true);
});

function setup(slot: Slot = 1) {
    const record: RoomRecord = { version: 3, cubePlacement: 'spawn', code: 'ABCD', level: 'pairing-bay', revision: 1,
        visitors: ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'],
        switchB: true, checkpoint: 'reunion', exitUnlocked: false, reachedExit: [false, false], completed: false,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const state = freshCube(); assignCube(state, 1);
    const client = { room: sharedRoom(record, [true, true], [null, null], state), slot,
        get ownsCube() { return this.room.cube.physicsAuthority === slot; },
        remote: new RemoteAvatar(), remoteCube: new RemoteCube(), cubeAction: vi.fn(), cubeOccupancy: vi.fn() };
    const cube = new SharedCubeAuthority(client);
    const authority = new PairingAuthority(client.room, slot, vi.fn(), vi.fn(), vi.fn(), cube);
    const world = new PuzzleWorld(pairingBay(slot), { ...freshProgress().rooms.relay, checkpoint: 'relay' }, undefined, authority);
    const update = () => { client.room = sharedRoom(record, [true, true], [null, null], state); authority.room = client.room;
        client.remoteCube.reset(state, performance.now()); world.syncAuthority(); };
    return { world, state, record, client, cube, update };
}

it('only the authority integrates loose physics; remote carried geometry follows the interpolated holder', () => {
    const { world, state, client, update } = setup(2);
    state.transform = { x: 1200, y: 430, vx: 100, vy: 300, grounded: false }; update();
    for (let n = 0; n < 120; n++) world.step(FIXED_DT, emptyInput());
    expect(world.cube!.x).toBe(1200); expect(world.cube!.y).toBe(430);
    state.holder = 1; state.epoch++;
    client.remote.push({ x: 1250, y: 543, vx: 0, vy: 0, facing: 1, grounded: true, rope: null }, 1, 1, performance.now()); update();
    world.step(FIXED_DT, emptyInput());
    expect(world.cube!.x).toBe(1250); expect(world.cube!.y).toBe(500); expect(world.cube!.carried).toBe(true);
    world.respawn(); expect(client.cubeAction).not.toHaveBeenCalled();
    assignCube(state, 2); state.transform = { x: 1200, y: 430, vx: 100, vy: 300, grounded: false }; update();
    world.step(FIXED_DT, emptyInput()); expect(world.cube!.x).toBeGreaterThan(1200); expect(world.cube!.y).toBeGreaterThan(430);
});

it('requests pickup without predicting it, and sounds accepted pickup/drop once on each client', () => {
    for (const slot of [1, 2] as const) {
        const { world, state, client, update } = setup(slot);
        const sink = { play: vi.fn(), setLoop: vi.fn(), stopAll: vi.fn() }, audio = new AudioPresentation(sink); audio.reset(world);
        Object.assign(world.player, { x: 1190, y: 543 }); world.interact(); audio.observe(world, []);
        expect(client.cubeAction).toHaveBeenCalledWith('cube-pickup'); expect(world.cube!.carried).toBe(false); expect(sink.play).not.toHaveBeenCalled();
        interactCube(state, 1, { type: 'cube-pickup', seq: 1, epoch: state.epoch }); update(); audio.observe(world, []); audio.observe(world, []);
        expect(sink.play.mock.calls.filter(c => c[0] === 'pickup')).toHaveLength(1);
        if (slot === 1) {
            world.interact(); audio.observe(world, []);
            expect(client.cubeAction).toHaveBeenLastCalledWith('cube-drop', world.cubeDropTransform());
            expect(sink.play.mock.calls.filter(c => c[0] === 'drop')).toHaveLength(0);
        }
        interactCube(state, 1, { type: 'cube-drop', seq: 2, epoch: state.epoch, transform }); update(); audio.observe(world, []); audio.observe(world, []);
        expect(sink.play.mock.calls.filter(c => c[0] === 'drop')).toHaveLength(1);
    }
});

it('only the authority cube senses cargo; players cannot substitute, and removing it releases access', () => {
    const { world, state, record, client, cube, update } = setup();
    Object.assign(world.player, { x: 1310, y: 543, grounded: true }); cube.sample(world);
    expect(client.cubeOccupancy).toHaveBeenLastCalledWith(false);
    Object.assign(world.cube!, { x: 1310, y: 538, grounded: true }); cube.sample(world);
    expect(client.cubeOccupancy).toHaveBeenLastCalledWith(true); expect(world.frame.outputs.codePlatformA).toBe(false);
    record.cubePlacement = 'cargoPlate'; update(); expect(world.frame.outputs.codePlatformA).toBe(true);
    record.cubePlacement = 'spawn'; update(); expect(world.frame.outputs.codePlatformA).toBe(false);
    assignCube(state, 2); update(); client.cubeOccupancy.mockClear(); cube.sample(world); expect(client.cubeOccupancy).not.toHaveBeenCalled();
});

it('pull force and sound wait for a grant; release before the reply cancels a late grant', () => {
    const { world, state, client, update } = setup(2);
    Object.assign(world.player, { x: 1090, y: 543 });
    const input = { ...emptyInput(), grapplePressed: true, grappleHeld: true, aim: { x: 1190, y: 538 } };
    world.step(FIXED_DT, input);
    expect(client.cubeAction).toHaveBeenCalledWith('cube-pull-start'); expect(world.pullingCube).toBe(false);
    expect(world.events.some(e => e.kind === 'cube-pull')).toBe(false);
    interactCube(state, 2, { type: 'cube-pull-start', seq: 1, epoch: state.epoch }); update();
    world.step(FIXED_DT, { ...input, grapplePressed: false });
    expect(world.pullingCube).toBe(true); expect(world.cube!.vx).toBeLessThan(0);
    expect(Math.abs(world.cube!.vx)).toBeLessThanOrEqual(330);
    world.step(FIXED_DT, emptyInput()); expect(world.pullingCube).toBe(false);
    expect(client.cubeAction).toHaveBeenLastCalledWith('cube-pull-stop');
    interactCube(state, 2, { type: 'cube-pull-stop', seq: 2, epoch: state.epoch }); update();
    world.step(FIXED_DT, input); world.step(FIXED_DT, emptyInput());
    interactCube(state, 2, { type: 'cube-pull-start', seq: 3, epoch: state.epoch }); update();
    expect(client.cubeAction).toHaveBeenLastCalledWith('cube-pull-stop'); expect(world.pullingCube).toBe(false);
});

it('resting shared cubes support a body, falling/carried cubes do not, and the cube beneath cannot self-lift', () => {
    const { world, state, update } = setup(2);
    state.transform = transform; update();
    Object.assign(world.player, { x: 1200, y: 450, vy: 100 });
    for (let n = 0; n < 100; n++) world.step(FIXED_DT, emptyInput());
    expect(world.player.groundId).toBe('cube-body');
    world.step(FIXED_DT, { ...emptyInput(), grappleHeld: true, grapplePressed: true, aim: transform });
    expect(world.pullingCube).toBe(false);
    state.transform = { ...transform, grounded: false }; update();
    for (let n = 0; n < 100; n++) world.step(FIXED_DT, emptyInput());
    expect(world.player.groundId).toBe('far');
});

it('cargo access is required to climb to the final deck, with a safe fall and walk back if disabled', () => {
    const { world, record, update } = setup();
    Object.assign(world.player, { x: 1470, y: 543, grounded: true });
    for (let n = 0; n < 140; n++) world.step(FIXED_DT, { ...emptyInput(), right: true, jumpHeld: true, jumpPressed: n === 0 });
    expect(world.player.x).toBeLessThan(1580); expect(world.player.y).toBe(543);
    record.cubePlacement = 'cargoPlate'; update();
    Object.assign(world.player, { x: 1470, y: 543, grounded: true, vx: 0 });
    for (let n = 0; n < 100; n++) world.step(FIXED_DT, { ...emptyInput(), jumpHeld: true, jumpPressed: n === 0 });
    expect(world.player.groundId).toBe('final-access');
    record.cubePlacement = 'spawn'; update();
    for (let n = 0; n < 100; n++) world.step(FIXED_DT, emptyInput());
    expect(world.player.groundId).toBe('far'); expect(world.deaths).toBe(0);
});
