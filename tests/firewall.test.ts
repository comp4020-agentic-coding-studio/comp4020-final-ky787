import { afterEach, expect, it, vi } from 'vitest';
import { firewallBox, FIREWALL_THICKNESS, type FirewallDef } from '../src/slice/firewall.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { emptyInput } from '../src/engine/physics.ts';
import { FIXED_DT } from '../src/engine/constants.ts';
import { COOP_LABS } from '../src/coop/labs.ts';
import { CoopClient } from '../src/coop/client.ts';
import { createCoopAuthority } from '../src/coop/lab-authority.ts';
import { type CoopLevelId, type Slot, parseClientMessage } from '../src/coop/protocol.ts';
import { newRecord, sharedRoom } from '../server/coop-state.ts';
import { freshCube, assignCube, interactCube, acceptCubeSnapshot } from '../server/cube-state.ts';
import { AudioPresentation } from '../src/slice/audio-presentation.ts';

afterEach(() => vi.restoreAllMocks());
const steps = (w: PuzzleWorld, n = 1) => { for (let i = 0; i < n; i++) w.step(FIXED_DT, emptyInput()); };
const horizontal: FirewallDef = { id: 'test', x: 460, y: 560, orientation: 'horizontal', length: 150 };
it('derives both orientations, lengths and thicknesses from authored data', () => {
    expect(firewallBox(horizontal)).toEqual({ x: 460, y: 560, w: 150, h: FIREWALL_THICKNESS });
    expect(firewallBox({ ...horizontal, orientation: 'vertical', length: 97, thickness: 7 })).toEqual({ x: 460, y: 560, w: 7, h: 97 });
    expect(firewallBox({ ...horizontal, length: 230, thickness: 18 })).toEqual({ x: 460, y: 560, w: 230, h: 18 });
    for (const patch of [{ length: 0 }, { length: -5 }, { thickness: NaN }, { x: Infinity }])
        expect(() => firewallBox({ ...horizontal, ...patch })).toThrow('Invalid authored firewall');
});

function fixture(slot: Slot = 1, physics: Slot = slot, level: CoopLevelId = 'firewall-lab', firewalls?: FirewallDef[]) {
    const record = newRecord('ABCD', '11111111-1111-4111-8111-111111111111', level), cube = freshCube(); assignCube(cube, physics);
    const client = new CoopClient(() => {}, () => {}); client.slot = slot; client.status = 'CONNECTED';
    client.room = sharedRoom(record, [true, true], [null, null], cube); client.remoteCube.reset(cube, performance.now());
    const authority = createCoopAuthority(client.room, client), room = COOP_LABS[level].room(slot);
    if (firewalls) room.firewalls = firewalls;
    const world = new PuzzleWorld(room, { checkpoint: 'entry', switchB: false, cubeOnPlate: false, cubeOnPlateB: false }, undefined, authority);
    vi.spyOn(client, 'localReset'); vi.spyOn(client, 'occupy');
    let seq = 0;
    const request = vi.spyOn(client, 'cubeAction').mockImplementation(kind => client.prediction.begin(kind, ++seq, cube.epoch, 1, performance.now()));
    const sync = () => {
        client.room = sharedRoom(record, [true, true], [null, null], cube); authority.room = client.room;
        client.remoteCube.reset(cube, performance.now()); world.syncAuthority();
    };
    const acceptReset = () => {
        const pending = client.prediction.cube!;
        expect(interactCube(cube, slot, { type: 'cube-reset', cubeId: 'cube' as const, seq: pending.seq, epoch: pending.epoch, cause: 'firewall' })).toBe(true);
        record.cubePlacements.cube = 'spawn'; client.room = sharedRoom(record, [true, true], [null, null], cube);
        client.prediction.resolve(pending.seq, 1, true, client.room, slot, performance.now()); sync();
    };
    return { world, cube, record, client, authority, request, sync, acceptReset };
}
it.each(['vertical', 'horizontal'] as const)('%s player contact uses local death/checkpoint and leaves durable state and partner alone', orientation => {
    const f = fixture(), partner = fixture(2), w = f.world, before = { ...partner.world.player };
    if (f.record.level !== 'firewall-lab') throw new Error('fixture');
    f.record.levelState.checkpointSet = true; f.record.checkpoint = 'reunion'; f.record.exitUnlocked = true; f.record.reachedExit = [false, true]; f.sync();
    Object.assign(w.player, orientation === 'vertical' ? { x: 862, y: 623 } : { x: 520, y: 550 });
    Object.assign(w.player.rope, { phase: 'attached', anchorId: 'test', tip: { x: w.player.x, y: w.player.y - 50 } });
    steps(w);
    expect(w.deaths).toBe(1); expect(w.lastDeath?.cause).toBe('firewall');
    expect(w.player).toMatchObject({ ...w.room.checkpoint, rope: { phase: 'idle' } });
    expect(f.client.localReset).toHaveBeenCalledOnce(); expect(f.client.lastLocalDiscontinuity?.kind).toBe('respawn');
    expect(f.record).toMatchObject({ checkpoint: 'reunion', exitUnlocked: true, reachedExit: [false, true], levelState: { checkpointSet: true } });
    expect(partner.world.player).toEqual(before); expect(partner.world.deaths).toBe(0);
    expect(w.solids.some(s => w.firewalls.some(fw => fw.def.id === s.id))).toBe(false);
    expect(w.target({ x: 520, y: 566 })).toBeNull();
});
it.each(['loose', 'carried', 'both', 'pull'] as const)('%s cube contact dissolves once, cancels pull and reconciles to one original cube', kind => {
    const f = fixture(), w = f.world, original = w.cube!;
    if (kind === 'carried' || kind === 'both') {
        f.cube.holder = 1; f.sync();
        Object.assign(w.player, kind === 'both' ? { x: 862, y: 623 } : { x: 500, y: 623 });
    } else {
        if (kind === 'pull') {
            Object.assign(w.player, { x: 670, y: 623 });
            f.authority.cube!.pull(true, true);
            const pending = f.client.prediction.cube!;
            interactCube(f.cube, 1, { type: 'cube-pull-start', cubeId: 'cube' as const, epoch: f.cube.epoch, seq: pending.seq });
            f.client.room = sharedRoom(f.record, [true, true], [null, null], f.cube);
            f.client.prediction.resolve(pending.seq, 1, true, f.client.room, 1, 10);
        }
        f.sync();
        Object.assign(w.cube!, { x: 520, y: 548, vx: 100, vy: 100, grounded: false });
        w.pullingCube = kind === 'pull';
    }
    const epoch = f.cube.epoch;
    const sink = { play: vi.fn(), stopAll: vi.fn(), setLoop: vi.fn() }, sound = new AudioPresentation(sink); sound.reset(w);
    w.step(FIXED_DT, { ...emptyInput(), grappleHeld: kind === 'pull' }); sound.observe(w, w.events);
    expect(f.request.mock.calls.filter(c => c[0] === 'cube-reset')).toHaveLength(1);
    expect(w.cubeResetting).toBe(true); expect(w.pullingCube).toBe(false); expect(w.cube!.carried).toBe(false);
    expect(w.deaths).toBe(kind === 'both' ? 1 : 0);
    steps(w, 120); expect(f.request.mock.calls.filter(c => c[0] === 'cube-reset')).toHaveLength(1);
    f.acceptReset();
    expect(w.cubeResetting).toBe(false); expect(w.cube).toBe(original); expect(w.cube).toMatchObject({ ...w.room.cube, carried: false, vx: 0, vy: 0 });
    expect(f.cube).toMatchObject({ holder: null, pulling: false, physicsAuthority: 1, epoch: epoch + 1, transform: null });
    expect(w.events.filter(e => e.kind === 'cube-firewall')).toHaveLength(1);
    expect(sink.play.mock.calls.filter(c => c[0] === 'firewallZap')).toHaveLength(1);
});
it('a non-authority replica cannot report contact or reset the shared cube', () => {
    const f = fixture(2, 1); f.cube.transform = { x: 520, y: 548, vx: 0, vy: 0, grounded: false }; f.sync();
    steps(f.world, 120); expect(f.request).not.toHaveBeenCalled(); expect(f.world.cube!.x).toBe(520);
    expect(f.authority.cube!.firewall!(f.world)).toBe(false);
});
it('contact during a pending carry action waits for the accepted epoch, then resets', () => {
    const f = fixture(); f.client.prediction.begin('cube-pickup', 77, f.cube.epoch, 1, 0);
    Object.assign(f.world.player, { x: 500, y: 623 }); steps(f.world);
    expect(f.world.cubeResetting).toBe(true); expect(f.request).not.toHaveBeenCalled();
    expect(interactCube(f.cube, 1, { type: 'cube-pickup', cubeId: 'cube' as const, seq: 77, epoch: f.cube.epoch })).toBe(true);
    f.client.room = sharedRoom(f.record, [true, true], [null, null], f.cube);
    f.client.prediction.resolve(77, 1, true, f.client.room, 1, 10); f.sync();
    expect(f.client.prediction.cube).toMatchObject({ kind: 'cube-reset', epoch: f.cube.epoch });
    f.acceptReset(); expect(f.world.cube).toMatchObject(f.world.room.cube!);
});
it('a reset/death epoch race retries safely and a disconnect abandons pending feedback', () => {
    const f = fixture(); Object.assign(f.world.cube!, { x: 520, y: 548 }); steps(f.world);
    const pending = f.client.prediction.cube!; assignCube(f.cube, 1);
    f.client.room = sharedRoom(f.record, [true, true], [null, null], f.cube);
    f.client.prediction.resolve(pending.seq, 1, false, f.client.room, 1, 10); f.sync();
    expect(f.client.prediction.cube?.epoch).toBe(f.cube.epoch); f.acceptReset();
    Object.assign(f.world.cube!, { x: 520, y: 548 }); steps(f.world);
    f.client.prediction.clear(20); f.client.status = 'RECONNECTING'; f.sync();
    expect(f.world.cubeResetting).toBe(false); expect(f.world.cube).toMatchObject(f.world.room.cube!);
});
it('accepted destruction removes partner support without killing or launching its rider', () => {
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    const f = fixture(2, 1); f.cube.holder = 1;
    f.cube.transform = { x: 700, y: 580, vx: 0, vy: 0, grounded: false };
    f.client.remote.push({ x: 700, y: 623, vx: 0, vy: 0, grounded: true, facing: 1, rope: null }, 1, 1, 1000); f.sync();
    Object.assign(f.world.player, { x: 700, y: 541, grounded: true, groundId: 'partner-cube-support' }); steps(f.world);
    expect(f.world.groundedOnPartnerCube).toBe(true);
    expect(interactCube(f.cube, 1, { type: 'cube-reset', cubeId: 'cube' as const, seq: 1, epoch: f.cube.epoch, cause: 'firewall' })).toBe(true); f.sync(); steps(f.world);
    expect(f.world.partnerCubeSupport).toBeNull(); expect(f.world.player.grounded).toBe(false);
    expect(f.world.player.y).toBeGreaterThan(541); expect(f.world.player.vy).toBeGreaterThan(0); expect(f.world.deaths).toBe(0);
    expect(f.world.cube).toMatchObject(f.world.room.cube!);
});
it.each(['relay', 'lift'] as const)('%s can deliver loose cargo into a firewall without duplicate/reset loops', machine => {
    const f = fixture(1, 1, machine === 'relay' ? 'relay-lab' : 'lift-lab', [machine === 'relay'
        ? { id: 'egress', x: 1060, y: 495, orientation: 'vertical', length: 100 }
        : { id: 'overhead', x: 530, y: 620, orientation: 'horizontal', length: 220 }]);
    if (f.record.level === 'relay-lab') f.record.levelState.relayEnabled = true;
    if (f.record.level === 'lift-lab') f.record.levelState.liftLatched = true;
    f.sync(); Object.assign(f.world.cube!, machine === 'relay' ? { x: 485, y: 538 } : { x: 640, y: 818 });
    steps(f.world, machine === 'relay' ? 1 : 240);
    expect(f.client.prediction.cube?.kind).toBe('cube-reset'); expect(f.request.mock.calls.filter(c => c[0] === 'cube-reset')).toHaveLength(1);
    if (machine === 'relay') expect(f.world.gates[0].cooldown('cube')).toBeGreaterThan(0);
    f.acceptReset(); expect(f.world.cube).toMatchObject(f.world.room.cube!); expect(f.world.deaths).toBe(0);
    if (machine === 'relay') {
        // Firewall itself is lethal, never solid relay egress geometry.
        Object.assign(f.world.player, { x: 485, y: 543 }); steps(f.world);
        expect(f.world.events.some(e => e.kind === 'teleport')).toBe(true); expect(f.world.lastDeath?.cause).toBe('firewall');
    }
});
it('cube reset schema rejects invented causes/coordinates and stale or foreign streams cannot resurrect cargo', () => {
    const message = { type: 'cube-reset', cubeId: 'cube' as const, seq: 1, epoch: 1, cause: 'firewall' } as const;
    expect(parseClientMessage(JSON.stringify(message))).toEqual(message);
    for (const patch of [{ cause: 'arbitrary' }, { spawn: { x: 99, y: 99 } }, { slot: 1 }])
        expect(parseClientMessage(JSON.stringify({ ...message, ...patch }))).toBeNull();
    const c = freshCube(); assignCube(c, 1);
    expect(interactCube(c, 2, message)).toBe(false); expect(interactCube(c, 1, message)).toBe(true);
    expect(interactCube(c, 1, message)).toBe(false);
    expect(acceptCubeSnapshot(c, 1, { type: 'cube', cubeId: 'cube' as const, seq: 99, epoch: 1, transform: { x: 500, y: 550, vx: 0, vy: 0, grounded: false } })).toBe(false);
    expect(c.transform).toBeNull(); expect(c.epoch).toBe(2);
});
