import { expect, it, vi } from 'vitest';
import { CoopClient } from '../src/coop/client.ts';
import { createCoopAuthority } from '../src/coop/lab-authority.ts';
import { COOP_LABS } from '../src/coop/labs.ts';
import { RemoteAvatar, RemoteCube } from '../src/coop/remote.ts';
import { type CoopLevelId, type Slot } from '../src/coop/protocol.ts';
import { newRecord, sharedRoom } from '../server/coop-state.ts';
import { assignCube, freshCube } from '../server/cube-state.ts';
import { advanceCrumble, freshCrumble, triggerCrumble } from '../server/crumble-state.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { emptyInput } from '../src/engine/physics.ts';
import { FIXED_DT } from '../src/engine/constants.ts';
import { AudioPresentation } from '../src/slice/audio-presentation.ts';
import { avatar } from './helpers/coop-server.ts';

function setup(level: CoopLevelId, slot: Slot, physics: Slot = slot) {
    const record = newRecord('ABCD', '11111111-1111-4111-8111-111111111111', level), cube = level === 'crumble-lab' ? null : freshCube(), crumble = freshCrumble();
    if (cube) assignCube(cube, physics);
    const client = new CoopClient(() => {}, () => {}); client.slot = slot; client.status = 'CONNECTED';
    client.room = sharedRoom(record, [true, true], [null, null], cube, crumble); client.roomReceivedAt = performance.now();
    if (cube) client.remoteCube.reset(cube, performance.now());
    const authority = createCoopAuthority(client.room, client);
    vi.spyOn(client, 'occupy'); vi.spyOn(client, 'control'); vi.spyOn(client, 'localReset'); vi.spyOn(client, 'reachExit');
    vi.spyOn(client, 'triggerCrumble').mockImplementation((id, trigger) => {
        if (!client.pendingCrumble.has(id)) client.pendingCrumble.set(id, { seq: 1, trigger, at: performance.now() });
    });
    const world = new PuzzleWorld(COOP_LABS[level].room(slot), { checkpoint: 'entry', switchB: false, cubeOnPlate: false, cubeOnPlateB: false }, undefined, authority);
    const sync = (plates: ['liftControl' | null, 'liftControl' | null] = [null, null], now = Date.now()) => {
        client.room = sharedRoom(record, [true, true], plates, cube, crumble, now); client.roomReceivedAt = performance.now();
        authority.room = client.room; world.syncAuthority();
    };
    return { record, cube, crumble, client, authority, world, sync };
}
const steps = (w: PuzzleWorld, n: number) => { for (let i = 0; i < n; i++) w.step(FIXED_DT, emptyInput()); };
it.each([1, 2] as const)('P%s uses the original relay for player, loose and carried cube, retaining authority', slot => {
    const { world: w, record, cube, client, sync } = setup('relay-lab', slot);
    if (record.level !== 'relay-lab') throw new Error('fixture');
    Object.assign(w.player, { x: 380, y: 543 }); w.interact(); expect(client.control).toHaveBeenCalledWith('relayPower');
    expect(w.gates[0].enabled).toBe(false);
    record.levelState.relayEnabled = true; record.exitUnlocked = true; sync();
    const epoch = cube!.epoch;
    Object.assign(w.player, { x: 485, y: 543, vx: 0, vy: 0 }); w.step(FIXED_DT, emptyInput());
    expect(w.player.x).toBe(1065); expect(client.lastLocalDiscontinuity?.kind).toBe('relay');
    expect(w.gates[0].cooldown('player')).toBeGreaterThan(0); expect(cube!.epoch).toBe(epoch);
    Object.assign(w.cube!, { x: 485, y: 538, vx: 100, vy: 0 }); w.step(FIXED_DT, emptyInput());
    expect(w.cube!.x).toBe(1076); expect(client.lastLocalDiscontinuity?.entity).toBe('cube');
    expect(cube!.physicsAuthority).toBe(slot); expect(cube!.epoch).toBe(epoch);
    // Clear the receiving gate so the resting cube cannot push this fixture back through it.
    Object.assign(w.player, { x: 1200, y: 543 }); steps(w, 90); cube!.holder = slot; sync();
    Object.assign(w.player, { x: 485, y: 543, vx: 0, vy: 0 }); w.step(FIXED_DT, emptyInput());
    expect(w.player.x).toBe(1076); expect(w.cube!.x).toBe(w.player.x); expect(w.cube!.y).toBe(w.player.y - 43);
    expect(w.cube!.carried).toBe(true); expect(cube!.holder).toBe(slot); expect(cube!.epoch).toBe(epoch);
    expect(w.events.filter(e => e.kind === 'relay-cargo')).toHaveLength(2);
    expect(w.frame.evidence).toBeUndefined();
});
it.each([1, 2] as const)('P%s replica never independently transports the loose cube, and a partner-held cube does not enlarge local relay clearance', slot => {
    const { world: w, record, cube, client, sync } = setup('relay-lab', slot, (3 - slot) as Slot);
    if (record.level !== 'relay-lab') throw new Error('fixture');
    record.levelState.relayEnabled = true;
    cube!.transform = { x: 485, y: 538, vx: 0, vy: 0, grounded: true }; client.remoteCube.reset(cube!, performance.now()); sync();
    steps(w, 180); expect(w.cube!.x).toBe(485); expect(w.gates[0].cooldown('cube')).toBe(0);
    cube!.holder = (3 - slot) as Slot; sync();
    Object.assign(w.player, { x: 485, y: 543 }); w.step(FIXED_DT, emptyInput());
    expect(w.player.x).toBe(1065); expect(w.events.filter(e => e.kind === 'relay-cargo')).toHaveLength(0);
});
it.each(['relay', 'respawn'] as const)('explicit %s snaps both remote buffers even below the fallback distance, rejecting stale markers', kind => {
    const remote = new RemoteAvatar(); remote.push(avatar, 1, 1, 1000); remote.push({ ...avatar, x: 280 }, 1, 2, 1100);
    expect(remote.sample(1150)!.x).toBe(240);
    remote.push({ ...avatar, x: 310 }, 1, 3, 1151, kind); expect(remote.sample(1151)!.x).toBe(310);
    expect(remote.push(avatar, 1, 2, 1152, kind)).toBe(false); expect(remote.sample(1152)!.x).toBe(310);
    const cube = freshCube(), replica = new RemoteCube(); assignCube(cube, 1); replica.reset(cube, 1000);
    const t = { x: 100, y: 100, vx: 0, vy: 0, grounded: false };
    replica.push(t, cube.epoch, 1, 1000); replica.push({ ...t, x: 150 }, cube.epoch, 2, 1100, kind);
    expect(replica.sample(1100)!.x).toBe(150); expect(cube.physicsAuthority).toBe(1);
    expect(replica.push(t, cube.epoch - 1, 100, 1150, kind)).toBe(false);
});
it.each([1, 2] as const)('P%s can operate or ride a shared lift; loose/carry integration and local checkpoint resets remain coherent', slot => {
    const { world: w, record, cube, client, sync } = setup('lift-lab', slot);
    Object.assign(w.player, { x: 440, y: 823, grounded: true }); w.step(FIXED_DT, emptyInput());
    expect(client.occupy).toHaveBeenCalledWith('liftControl'); expect(w.lifts[0].enabled).toBe(false);
    sync(slot === 1 ? [null, 'liftControl'] : ['liftControl', null]);
    Object.assign(w.player, { x: 640, y: 823, vx: 0, vy: 0 }); Object.assign(w.cube!, { x: 665, y: 818, vx: 0, vy: 0 });
    steps(w, 240); expect(w.player.y).toBeLessThan(450); expect(w.cube!.y).toBeLessThan(450);
    expect(cube!.physicsAuthority).toBe(slot); expect(w.cube!.carried).toBe(false);
    cube!.holder = slot; sync(slot === 1 ? [null, 'liftControl'] : ['liftControl', null]);
    Object.assign(w.player, { x: 640, y: 700 }); steps(w, 60);
    expect(w.cube!.y).toBe(w.player.y - 43); expect(w.cube!.vy).toBe(0);
    cube!.holder = null; sync(); Object.assign(w.player, { x: 800, y: 343 }); w.interact(); expect(client.control).toHaveBeenCalledWith('liftLatch');
    if (record.level !== 'lift-lab') throw new Error('fixture');
    const before = { x: w.player.x, y: w.player.y }; record.levelState.liftLatched = true; record.checkpoint = 'upper'; record.exitUnlocked = true; sync();
    expect({ x: w.player.x, y: w.player.y }).toEqual(before);
    const partner = setup('lift-lab', (3 - slot) as Slot).world, partnerAt = { ...partner.player };
    w.respawn(); expect(w.player.x).toBe(slot === 1 ? 790 : 885); expect(w.player.y).toBe(343);
    expect(client.localReset).toHaveBeenCalledOnce(); expect(partner.player).toEqual(partnerAt);
    expect(w.frame.outputs.liftField).toBe(true); expect(client.lastLocalDiscontinuity?.kind).toBe('respawn');
    Object.assign(w.player, { x: 1110, y: 343 }); w.step(FIXED_DT, emptyInput()); expect(client.reachExit).toHaveBeenCalled(); expect(w.exited).toBe(false);
});
it('a lift replica never applies a second force to the loose shared cube', () => {
    const { world: w, cube, client, sync } = setup('lift-lab', 2, 1);
    cube!.transform = { x: 640, y: 650, vx: 0, vy: -200, grounded: false }; client.remoteCube.reset(cube!, performance.now());
    sync(['liftControl', null]); steps(w, 240); expect(w.cube!.y).toBe(650);
});
it.each([1, 2] as const)('P%s predicts only crumble warning; authoritative collapse disables hooks, cancels rope, and sounds once on both worlds', slot => {
    const a = setup('crumble-lab', slot), b = setup('crumble-lab', (3 - slot) as Slot);
    const soundSink = { play: vi.fn(), setLoop: vi.fn(), stopAll: vi.fn() }, sound = new AudioPresentation(soundSink); sound.reset(a.world);
    Object.assign(a.world.player, { x: 510, y: 543, grounded: true, groundId: 'crumbleA' });
    a.world.step(FIXED_DT, emptyInput()); sound.observe(a.world, a.world.events.splice(0));
    const p = a.world.platforms.find(p => p.def.id === 'crumbleA')!;
    expect(a.client.triggerCrumble).toHaveBeenCalledWith('crumbleA', 'foot'); expect(p.fuse).toBeGreaterThan(0);
    // No network confirmation for several seconds: local time cannot break the platform.
    a.client.pendingCrumble.get('crumbleA')!.at -= 5000; steps(a.world, 120);
    expect(p.solid.enabled).toBe(true); expect(p.respawn).toBe(0);
    for (const fixture of [a, b]) {
        triggerCrumble(fixture.crumble, 'crumbleA', 'foot', 1000); fixture.client.pendingCrumble.clear(); fixture.sync([null, null], 1000);
        Object.assign(fixture.world.player.rope, { phase: 'attached', anchorId: 'crumbleA', tip: { x: 520, y: 560 } });
    }
    sound.observe(a.world, a.world.events.splice(0));
    expect(soundSink.play.mock.calls.filter(c => c[0] === 'crumbleWarn')).toHaveLength(1);
    for (const fixture of [a, b]) {
        advanceCrumble(fixture.crumble, 1600); fixture.sync([null, null], 1600);
        const block = fixture.world.platforms.find(p => p.def.id === 'crumbleA')!;
        expect(block.solid.enabled || block.solid.grappleable).toBe(false); expect(fixture.world.player.rope.phase).not.toBe('attached');
        fixture.sync([null, null], 1650); expect(fixture.world.events.filter(e => e.kind === 'crumble')).toHaveLength(1);
    }
    sound.observe(a.world, a.world.events.splice(0)); expect(soundSink.play.mock.calls.filter(c => c[0] === 'crumbleBreak')).toHaveLength(1);
    const bDeaths = b.world.deaths; steps(a.world, 120); expect(a.world.deaths).toBe(1); expect(b.world.deaths).toBe(bDeaths);
    for (const fixture of [a, b]) {
        advanceCrumble(fixture.crumble, 4000); fixture.sync([null, null], 4000);
        expect(fixture.world.platforms.find(p => p.def.id === 'crumbleA')!.solid.grappleable).toBe(true);
    }
    expect(a.world.frame.source).toBe('mock-multiplayer'); expect(a.world.frame.evidence).toBeUndefined();
});
it('hooking the authored test block reports the hook trigger, not a foot fuse', () => {
    const { world: w, client } = setup('crumble-lab', 1);
    Object.assign(w.player, { x: 805, y: 543, grounded: true });
    for (let n = 0; n < 50; n++) w.step(FIXED_DT, { ...emptyInput(), grapplePressed: n === 0, grappleHeld: true, aim: { x: 920, y: 320 } });
    expect(client.triggerCrumble).toHaveBeenCalledWith('crumbleB', 'hook');
    expect(w.platforms.find(p => p.def.id === 'crumbleB')!.fuseDuration).toBe(1.65);
});
