import { afterEach, expect, it, vi } from 'vitest';
import { CoopClient } from '../src/coop/client.ts';
import { createCoopAuthority } from '../src/coop/lab-authority.ts';
import { COOP_LABS } from '../src/coop/labs.ts';
import { RemoteAvatar, RemoteCube } from '../src/coop/remote.ts';
import { type CoopLevelId, type Slot } from '../src/coop/protocol.ts';
import { newRecord, sharedRoom } from '../server/coop-state.ts';
import { assignCube, freshCube } from '../server/cube-state.ts';
import { advanceCrumble, freshCrumble, triggerCrumble } from '../server/crumble-state.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { emptyInput, playerBox } from '../src/engine/physics.ts';
import { boxesOverlap } from '../src/engine/geometry.ts';
import { FIXED_DT } from '../src/engine/constants.ts';
import { AudioPresentation } from '../src/slice/audio-presentation.ts';
import { avatar } from './helpers/coop-server.ts';
afterEach(() => vi.restoreAllMocks());

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
it.each([0, 1])('untouched loose cargo at gate %s cannot deadlock later P1 and P2 transit', source => {
    const fixtures = [setup('relay-lab', 1), setup('relay-lab', 2, 1)];
    for (const f of fixtures) {
        if (f.record.level !== 'relay-lab') throw new Error('fixture');
        f.record.levelState.relayEnabled = true; f.record.exitUnlocked = true; f.sync();
    }
    const w = fixtures[0].world, [from, to] = [w.gates[0].def.gates[source], w.gates[0].def.gates[1 - source]];
    const cube = w.cube!;
    Object.assign(cube, { x: from.x + from.w / 2, y: from.y + from.h - 22, vx: 0, vy: 0, grounded: false });
    w.step(FIXED_DT, emptyInput());
    expect(w.events.filter(e => e.kind === 'relay-cargo')).toHaveLength(1);
    expect(w.gates[0].cooldown('cube')).toBeGreaterThan(0);
    steps(w, 120); // Nobody follows, retrieves or moves the cargo.
    expect(cube.grounded).toBe(true);
    const resting = { x: cube.x, y: cube.y, vx: cube.vx, vy: cube.vy, grounded: cube.grounded };
    fixtures[1].cube!.transform = resting;
    fixtures[1].client.remoteCube.reset(fixtures[1].cube!, performance.now()); fixtures[1].sync();
    for (const f of fixtures) {
        Object.assign(f.world.player, { x: from.x + from.w / 2, y: from.y + from.h - 17, vx: 0, vy: 0 });
        f.world.step(FIXED_DT, emptyInput());
        expect(f.world.player.x).toBe(source === 0 ? to.x + to.w + 29 : resting.x - 22 - 11 - 2);
        expect(f.client.lastLocalDiscontinuity?.kind).toBe('relay');
        expect(f.world.cube).toMatchObject(resting);
        expect(f.world.cube!.carried).toBe(false);
        expect(f.cube!.physicsAuthority).toBe(1);
        steps(f.world, 90); // Ordinary cube overlap resolution must not cause a relay loop.
        const body = playerBox(f.world.player);
        expect(body.x).toBeGreaterThanOrEqual(0); expect(body.x + body.w).toBeLessThanOrEqual(f.world.room.width);
        expect(body.y).toBeGreaterThanOrEqual(0); expect(body.y + body.h).toBeLessThanOrEqual(f.world.room.height);
        expect(f.world.solids.some(s => s.enabled && boxesOverlap(body, s))).toBe(false);
        expect(boxesOverlap(body, { x: resting.x - 22, y: resting.y - 22, w: 44, h: 44 })).toBe(false);
        expect(f.world.cube).toMatchObject(resting);
        expect(f.world.events.filter(e => e.kind === 'teleport')).toHaveLength(1);
    }
    expect(w.cube).toBe(cube);
    expect(w.events.filter(e => e.kind === 'relay-cargo')).toHaveLength(1);
});
it.each(['wall', 'floor', 'bounds'] as const)('shared player egress still refuses unsafe authored %s', obstacle => {
    const { world: w, record, sync } = setup('relay-lab', 1);
    if (record.level !== 'relay-lab') throw new Error('fixture');
    record.levelState.relayEnabled = true; record.exitUnlocked = true; sync();
    if (obstacle === 'bounds') w.room.gates![0].gates[1].x = w.room.width - 50;
    else w.solids.push({ id: 'unsafe-exit', x: 1050, y: obstacle === 'floor' ? 550 : 450, w: 100, h: 100,
        enabled: true, oneWay: false, grappleable: false });
    Object.assign(w.player, { x: 485, y: 543 }); w.step(FIXED_DT, emptyInput());
    expect(w.player.x).toBe(485); expect(w.gates[0].cooldown('player')).toBe(0);
});

function boostFixture(slot: Slot) {
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    const holder = (3 - slot) as Slot, f = setup('boost-lab', slot, holder);
    f.cube!.holder = holder;
    f.cube!.transform = { x: 475, y: 540, vx: 0, vy: 0, grounded: false };
    f.client.remoteCube.reset(f.cube!, 1000);
    f.client.remote.push({ ...avatar, x: 475, y: 583, grounded: true }, 1, 1, 1000);
    f.sync();
    Object.assign(f.world.player, { x: 475, y: 583, grounded: true, groundId: 'floor' });
    return f;
}
function jumpOntoCube(w: PuzzleWorld) {
    for (let n = 0; n < 72; n++) w.step(FIXED_DT, { ...emptyInput(), jumpPressed: n === 0, jumpHeld: true });
    expect(w.groundedOnPartnerCube).toBe(true);
    expect(w.player.y).toBe(501);
}
it.each([1, 2] as const)('P%s lands through the underside onto the partner cube and jumps normally to BOOST LAB upper', slot => {
    const { world: w, cube, client } = boostFixture(slot);
    const epoch = cube!.epoch, holder = cube!.holder;
    const soundSink = { play: vi.fn(), setLoop: vi.fn(), stopAll: vi.fn() }, sound = new AudioPresentation(soundSink); sound.reset(w);
    for (let n = 0; n < 72; n++) {
        w.step(FIXED_DT, { ...emptyInput(), jumpPressed: n === 0, jumpHeld: true });
        sound.observe(w, w.events.splice(0));
    }
    expect(w.groundedOnPartnerCube).toBe(true); expect(w.player.y).toBe(501);
    expect(soundSink.play.mock.calls.some(c => c[0] === 'landing')).toBe(true);
    expect(w.partnerCubeSupport?.surface).toMatchObject({ oneWay: true, grappleable: false });
    expect(w.solids.some(s => s.id === 'partner-cube-support')).toBe(false);
    expect(w.target(w.cube!)).toBeNull();
    expect(w.cube!.grounded).toBe(false);
    for (let n = 0; n < 75; n++) w.step(FIXED_DT, { ...emptyInput(), jumpPressed: n === 0, jumpHeld: true, right: w.player.x < 640 });
    expect(w.player.groundId).toBe('upper'); expect(w.player.y).toBe(393);
    expect(cube!.holder).toBe(holder); expect(cube!.physicsAuthority).toBe(holder); expect(cube!.epoch).toBe(epoch);
    expect(client.occupy).not.toHaveBeenCalled();
    expect(w.frame.source).toBe('mock-multiplayer'); expect(w.frame.evidence).toBeUndefined();
});
it('BOOST LAB upper is unreachable by a floor jump, or a jump from a resting loose cube', () => {
    const { world: w } = setup('boost-lab', 1);
    for (const base of [600, 556]) {
        Object.assign(w.player, { x: 475, y: base - 17, grounded: true, vx: 0, vy: 0 });
        let highestFeet = base;
        for (let n = 0; n < 80; n++) {
            w.step(FIXED_DT, { ...emptyInput(), jumpPressed: n === 0, jumpHeld: true, right: true });
            highestFeet = Math.min(highestFeet, w.player.y + 17);
            expect(w.player.groundId).not.toBe('upper');
        }
        expect(highestFeet).toBeGreaterThan(410);
    }
});
it.each([1, 2] as const)('P%s never collides with their own held cube or their partner body', slot => {
    const f = boostFixture(slot);
    f.cube!.holder = slot; f.cube!.physicsAuthority = slot; f.sync();
    expect(f.world.partnerCubeSupport).toBeNull();
    for (let n = 0; n < 100; n++) f.world.step(FIXED_DT, { ...emptyInput(), jumpHeld: true, jumpPressed: n === 0 });
    expect(f.world.player.groundId).toBe('floor'); expect(f.world.cube!.carried).toBe(true);
    expect(f.world.player.x).toBe(475);
});
it.each(['drop', 'disconnect', 'reset', 'airborne', 'stale-avatar', 'stale-cube', 'relay'] as const)('partner support disappears cleanly on %s', reason => {
    const f = boostFixture(2), w = f.world;
    jumpOntoCube(w);
    if (reason === 'drop' || reason === 'disconnect' || reason === 'reset') {
        f.cube!.holder = null;
        f.cube!.transform = { x: 520, y: 578, vx: 0, vy: 0, grounded: false };
        f.client.remoteCube.reset(f.cube!, 1000); f.sync();
        if (reason === 'disconnect') f.client.room!.connected[0] = false;
    } else if (reason === 'airborne') f.client.remote.push({ ...avatar, x: 475, y: 580, grounded: false }, 1, 2, 1000);
    else if (reason === 'stale-avatar') f.client.remote.lastAt = 749;
    else if (reason === 'stale-cube') f.client.remoteCube.lastAt = 749;
    else f.client.remote.push({ ...avatar, x: 900, y: 393, grounded: true }, 1, 2, 1000, 'relay');
    w.step(FIXED_DT, emptyInput());
    expect(w.partnerCubeSupport).toBeNull(); expect(w.player.grounded).toBe(false);
    expect(w.player.y).toBeGreaterThan(501); expect(w.player.vy).toBeGreaterThan(0);
    expect(w.player.x).toBe(475); expect(w.deaths).toBe(0);
});
it('slight holder movement follows cube presentation without moving or launching the rider', () => {
    const f = boostFixture(2), w = f.world;
    jumpOntoCube(w);
    f.client.remote.push({ ...avatar, x: 483, y: 583, vx: 30, grounded: true }, 1, 2, 1050);
    vi.mocked(performance.now).mockReturnValue(1150);
    steps(w, 20);
    expect(w.groundedOnPartnerCube).toBe(true);
    expect(w.partnerCubeSupport!.surface.x).toBe(w.cube!.x - 22);
    expect(w.player.x).toBe(475); expect(w.player.y).toBe(501); expect(w.player.vy).toBe(0);
});
it('partner support neither holds lift controls nor acts as relay destination geometry', () => {
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    const f = setup('lift-lab', 2, 1);
    f.cube!.holder = 1; f.cube!.transform = { x: 440, y: 780, vx: 0, vy: 0, grounded: false };
    f.client.remoteCube.reset(f.cube!, 1000);
    f.client.remote.push({ ...avatar, x: 440, y: 823, grounded: true }, 1, 1, 1000); f.sync();
    Object.assign(f.world.player, { x: 440, y: 741, vy: 0 }); steps(f.world, 5);
    expect(f.world.groundedOnPartnerCube).toBe(true); expect(f.client.occupy).toHaveBeenLastCalledWith(null);
    expect(f.world.frame.outputs.liftField).toBe(false);
    const r = setup('relay-lab', 2, 1);
    if (r.record.level !== 'relay-lab') throw new Error('fixture');
    r.record.levelState.relayEnabled = true; r.cube!.holder = 1;
    // Cube top overlaps the player egress box (holder is on the raised arrival floor).
    r.cube!.transform = { x: 1065, y: 540, vx: 0, vy: 0, grounded: false };
    r.client.remoteCube.reset(r.cube!, 1000);
    r.client.remote.push({ ...avatar, x: 1065, y: 583, grounded: true }, 1, 1, 1000); r.sync();
    expect(r.world.partnerCubeSupport).not.toBeNull();
    Object.assign(r.world.player, { x: 485, y: 543 }); r.world.step(FIXED_DT, emptyInput());
    expect(r.world.player.x).toBe(1065); expect(r.world.cube!.carried).toBe(true);
});
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
