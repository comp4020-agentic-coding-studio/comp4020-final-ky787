import { afterEach, expect, it, vi } from 'vitest';
import { CoopClient } from '../src/coop/client.ts';
import { LocalPrediction } from '../src/coop/prediction.ts';
import { PairingAuthority } from '../src/coop/authority.ts';
import { SharedCubeAuthority } from '../src/coop/cube.ts';
import { sharedRoom, type RoomRecord } from '../server/coop-state.ts';
import { assignCube, freshCube, interactCube } from '../server/cube-state.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { pairingBay } from '../src/coop/pairing-bay.ts';
import { freshProgress } from '../src/slice/progress.ts';
import { AudioPresentation } from '../src/slice/audio-presentation.ts';
import type { ClientMessage, ServerMessage, SharedRoom } from '../src/coop/protocol.ts';
import { freshCubes, newRecord } from '../server/coop-state.ts';
import { createCoopAuthority } from '../src/coop/lab-authority.ts';
import { COOP_LABS } from '../src/coop/labs.ts';
import { createPlayer, emptyInput } from '../src/engine/physics.ts';
import { FIXED_DT } from '../src/engine/constants.ts';

class Socket {
    static OPEN = 1;
    static instances: Socket[] = [];
    readyState = 1; bufferedAmount = 0; sent: ClientMessage[] = [];
    onopen = () => {}; onclose = () => {}; onerror = () => {};
    onmessage = (_: { data: string }) => {};
    constructor() { Socket.instances.push(this); }
    send(text: string) { this.sent.push(JSON.parse(text)); }
    close() { this.readyState = 3; }
    receive(message: ServerMessage) { this.onmessage({ data: JSON.stringify(message) }); }
}
const cleanups: (() => void)[] = [];
afterEach(() => { for (const fn of cleanups.splice(0)) fn(); vi.unstubAllGlobals(); });
it('RACE lever predicts presentation immediately, sounds once on acceptance, and reconciles a denial', async () => {
    Socket.instances = [];
    vi.stubGlobal('WebSocket', Socket);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ id: 'visitor' }) })));
    vi.stubGlobal('location', { href: 'http://localhost/' });
    const r = newRecord('ABCD', 'visitor', 'race-condition'); r.cubePlacements.cubeA = 'receiver';
    const view = () => sharedRoom(r, [true, true], ['trace', null]);
    let world: PuzzleWorld, authority: ReturnType<typeof createCoopAuthority>;
    const client = new CoopClient((room, initial) => {
        if (initial) {
            authority = createCoopAuthority(room, client);
            world = new PuzzleWorld(COOP_LABS['race-condition'].room(1), freshProgress().rooms.relay, undefined, authority);
        } else { authority.room = room; world.syncAuthority(); }
    }, () => {});
    cleanups.push(() => client.leave()); client.start(undefined, 'race-condition');
    await vi.waitFor(() => expect(Socket.instances).toHaveLength(1));
    const ws = Socket.instances[0]; ws.onopen(); ws.receive({ type: 'snapshot', slot: 1, room: view() });
    const sink = { play: vi.fn(), setLoop: vi.fn(), stopAll: vi.fn() }, audio = new AudioPresentation(sink);
    Object.assign(world!.player, { x: 615, y: 703 }); world!.step(FIXED_DT, emptyInput()); audio.reset(world!);
    client.control('phase'); const pending = client.pendingPhase!;
    world!.step(FIXED_DT, emptyInput()); audio.observe(world!, world!.events.splice(0));
    expect(client.room!.levelState).toMatchObject({ inputs: { phase: false } });
    expect(world!.power('phaseB')).toBe(true); expect(world!.physicalPower('phaseB')).toBe(false);
    r.levelState.phase = true; r.revision++;
    ws.receive({ type: 'action-result', seq: pending.seq, accepted: true, room: view() });
    world!.step(FIXED_DT, emptyInput()); audio.observe(world!, world!.events.splice(0));
    expect(sink.play.mock.calls.filter(c => c[0] === 'switch')).toHaveLength(1);
    client.control('phase'); const denied = client.pendingPhase!; world!.syncAuthority();
    expect(world!.power('phaseA')).toBe(true);
    ws.receive({ type: 'action-result', seq: denied.seq, accepted: false, room: view() });
    expect(client.pendingPhase).toBeNull(); expect(world!.power('phaseA')).toBe(false);
    expect(world!.power('phaseB')).toBe(true);
});
async function setup(switchB = true) {
    Socket.instances = [];
    vi.stubGlobal('WebSocket', Socket);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ id: 'visitor' }) })));
    vi.stubGlobal('location', { href: 'http://localhost/' });
    const record: RoomRecord<'pairing-bay'> = { version: 5, code: 'ABCD', level: 'pairing-bay', revision: 1, visitors: ['a', 'b'], levelState: { switchB },
        checkpoint: switchB ? 'reunion' : 'entry', cubePlacements: { cube: 'spawn' }, exitUnlocked: false, reachedExit: [false, false], completed: false,
        createdAt: '', updatedAt: '' };
    const state = freshCube(); assignCube(state, 1);
    state.transform = { x: 1190, y: 538, vx: 0, vy: 0, grounded: true };
    const view = () => sharedRoom(record, [true, true], [null, null], state);
    let world: PuzzleWorld | undefined, authority: PairingAuthority;
    const client = new CoopClient((room, initial) => {
        if (room.level !== 'pairing-bay') throw new Error('Unexpected fixture level');
        if (initial) {
            authority = new PairingAuthority(room, 1, p => client.occupy(p), () => client.switchB(), () => client.reachExit(), new SharedCubeAuthority(client), client.prediction);
            world = new PuzzleWorld(pairingBay(1), freshProgress().rooms.relay, undefined, authority);
        } else { authority.room = room; world!.syncAuthority(); }
    }, () => { if (!client.connected) world?.syncAuthority(); });
    cleanups.push(() => client.leave()); client.start();
    await vi.waitFor(() => expect(Socket.instances).toHaveLength(1));
    const ws = Socket.instances[0]; ws.onopen(); ws.receive({ type: 'snapshot', slot: 1, room: view() });
    return { client, ws, record, state, view, world: world! };
}

it('prediction never changes authoritative room or publishes cube snapshots/occupancy until its epoch is confirmed', async () => {
    const { client, ws, state, view, record, world } = await setup();
    ws.sent = [];
    Object.assign(world.player, { x: 1190, y: 543 }); world.interact();
    expect(world.cube!.carried).toBe(true); expect(client.room!.cube!.holder).toBeNull();
    client.publishCube(world.cube!, 1000); client.cubeOccupancy(true);
    expect(ws.sent.some(m => m.type === 'cube' || m.type === 'cube-occupancy')).toBe(false);
    const pending = client.prediction.cube!;
    interactCube(state, 1, { type: 'cube-pickup', cubeId: 'cube' as const, seq: pending.seq, epoch: state.epoch }); record.revision++;
    ws.receive({ type: 'action-result', seq: pending.seq, accepted: true, room: view() });
    expect(client.prediction.cube).toBeNull(); expect(client.prediction.last['cube-pickup']?.accepted).toBe(true);
    client.publishCube(world.cube!, 1050);
    expect(ws.sent.at(-1)).toMatchObject({ type: 'cube', cubeId: 'cube' as const, epoch: state.epoch, seq: 1 });
    world.interact(); expect(world.cube!.carried).toBe(false);
    const drop = client.prediction.cube!;
    // A stale drop must restore the accepted holder, with a fresher same-revision transform.
    state.transform = { x: 1200, y: 500, vx: 0, vy: 0, grounded: false };
    ws.receive({ type: 'action-result', seq: drop.seq, accepted: false, room: view() });
    expect(world.cube!.carried).toBe(true); expect(client.prediction.cube).toBeNull();
    expect(client.prediction.last['cube-drop']?.accepted).toBe(false);
});

it('switch prediction plays once and shows the bridge without authorizing cube, checkpoint, cargo, exit or final plate reports', async () => {
    const { client, ws, record, view, world } = await setup(false);
    const sink = { play: vi.fn(), setLoop: vi.fn(), stopAll: vi.fn() }, audio = new AudioPresentation(sink); audio.reset(world);
    Object.assign(world.player, { x: 1050, y: 543 }); world.interact(); world.syncAuthority(); audio.observe(world, world.events.splice(0));
    expect(world.inputs.switchB).toBe(true); expect(world.frame.outputs.bridge).toBe(true);
    expect((client.room as SharedRoom<'pairing-bay'>).levelState.inputs.switchB).toBe(false); expect(client.room!.checkpoint).toBe('entry');
    expect(world.frame.outputs.codePlatformA).toBe(false); expect(world.frame.outputs.exitDoor).toBe(false);
    Object.assign(world.player, { x: 1190, y: 543 }); world.interact();
    expect(client.prediction.cube).toBeNull();
    const pending = client.prediction.switch!;
    record.levelState.switchB = true; record.checkpoint = 'reunion'; record.revision++;
    ws.receive({ type: 'action-result', seq: pending.seq, accepted: true, room: view() }); audio.observe(world, []);
    expect(client.prediction.switch).toBeNull();
    expect(sink.play.mock.calls.filter(c => c[0] === 'switch')).toHaveLength(1);
    expect(sink.play.mock.calls.filter(c => c[0] === 'codePower')).toHaveLength(1);
});

it('switch denial restores the accepted bridge and never creates durable progress', async () => {
    const { client, ws, view, world } = await setup(false);
    Object.assign(world.player, { x: 1050, y: 543 }); world.interact(); world.syncAuthority();
    ws.receive({ type: 'action-result', seq: client.prediction.switch!.seq, accepted: false, room: view() });
    expect(client.prediction.switch).toBeNull(); expect(world.frame.outputs.bridge).toBe(false);
    expect(client.room!.checkpoint).toBe('entry');
});

it('disconnect clears a predicted pickup; an old socket response cannot confirm a new generation', async () => {
    const { client, ws, world, state, view } = await setup();
    Object.assign(world.player, { x: 1190, y: 543 }); world.interact();
    const oldSeq = client.prediction.cube!.seq;
    ws.close(); ws.onclose();
    expect(client.prediction.cube).toBeNull(); expect(world.cube!.carried).toBe(false);
    client.start('ABCD'); await vi.waitFor(() => expect(Socket.instances).toHaveLength(2));
    const next = Socket.instances[1]; next.onopen(); next.receive({ type: 'snapshot', slot: 1, room: view() });
    client.cubeAction('cube-pickup'); const pending = client.prediction.cube;
    interactCube(state, 1, { type: 'cube-pickup', cubeId: 'cube' as const, seq: oldSeq, epoch: state.epoch });
    ws.receive({ type: 'action-result', seq: oldSeq, accepted: true, room: view() });
    expect(client.prediction.cube).toBe(pending); expect(client.room!.cube!.holder).toBeNull();
});

it('ledger correlates generation and sequence, rejects divergent acceptance, and measures confirmation/denial RTT', async () => {
    const { view } = await setup(), ledger = new LocalPrediction();
    ledger.begin('cube-pickup', 3, 1, 2, 100);
    expect(ledger.resolve(3, 1, true, view(), 1, 150)).toBe(false);
    expect(ledger.resolve(4, 2, true, view(), 1, 160)).toBe(false);
    expect(ledger.cube).not.toBeNull();
    ledger.resolve(3, 2, true, view(), 1, 300);
    expect(ledger.cube).toBeNull(); expect(ledger.last['cube-pickup']).toMatchObject({ accepted: false, rttMs: 200 });
});

it('a reconnect world restores docked cargo despite an earlier successful prediction in the same client', async () => {
    const { client, ws, world, state, view, record } = await setup();
    Object.assign(world.player, { x: 1190, y: 543 }); world.interact();
    const seq = client.prediction.cube!.seq;
    interactCube(state, 1, { type: 'cube-pickup', cubeId: 'cube' as const, seq, epoch: state.epoch }); record.revision++;
    ws.receive({ type: 'action-result', seq, accepted: true, room: view() });
    expect(client.prediction.cubeResult?.accepted).toBe(true);
    record.cubePlacements.cube = 'cargoPlate'; assignCube(state, 1); state.transform = null;
    ws.receive({ type: 'snapshot', slot: 1, room: view() });
    const cube = new SharedCubeAuthority(client), authority = new PairingAuthority(client.room as SharedRoom<'pairing-bay'>, 1, () => {}, () => {}, () => {}, cube, client.prediction);
    const restored = new PuzzleWorld(pairingBay(1), freshProgress().rooms.relay, undefined, authority);
    expect(restored.cube!.x).toBe(1310); expect(restored.cube!.y).toBe(538);
    expect(restored.frame.outputs.codePlatformA).toBe(true); expect(restored.cube!.carried).toBe(false);
});

it('explicit player/cube markers bypass ordinary throttling but never bypass pending cube authority', async () => {
    const { client, ws, state, record, view, world } = await setup();
    ws.sent = [];
    client.publish(world.player, 1000); client.publishCube(world.cube!, 1000);
    client.markDiscontinuity('player', 'relay'); client.publish(createPlayer(1076, 543), 1001);
    expect(ws.sent.at(-1)).toMatchObject({ type: 'avatar', discontinuity: 'relay', avatar: { x: 1076 } });
    Object.assign(world.player, { x: 1190, y: 543 }); world.interact();
    client.markDiscontinuity('cube', 'relay'); client.publishCube(world.cube!, 1001);
    expect(ws.sent.at(-1)?.type).toBe('cube-pickup');
    const seq = client.prediction.cube!.seq;
    interactCube(state, 1, { type: 'cube-pickup', cubeId: 'cube' as const, seq, epoch: state.epoch }); record.revision++;
    ws.receive({ type: 'action-result', seq, accepted: true, room: view() });
    client.publishCube(world.cube!, 1002);
    expect(ws.sent.at(-1)).toMatchObject({ type: 'cube', cubeId: 'cube' as const, discontinuity: 'relay', epoch: state.epoch });
    client.publishCube(world.cube!, 1100); expect(ws.sent.at(-1)).not.toHaveProperty('discontinuity');
});
it('accepted remote carried transit emits one cue and stale stream markers cannot replay it', async () => {
    const { client, ws, state, record, view } = await setup();
    interactCube(state, 2, { type: 'cube-pickup', cubeId: 'cube' as const, seq: 1, epoch: state.epoch }); record.revision++;
    ws.receive({ type: 'room', room: view() });
    const avatar = { x: 220, y: 543, vx: 0, vy: 0, facing: 1 as const, grounded: true, rope: null };
    ws.receive({ type: 'avatar', slot: 2, stream: 1, seq: 1, avatar });
    ws.receive({ type: 'avatar', slot: 2, stream: 1, seq: 2, avatar: { ...avatar, x: 280 }, discontinuity: 'relay' });
    ws.receive({ type: 'cube', cubeId: 'cube' as const, epoch: state.epoch, seq: 1, transform: { x: 280, y: 500, vx: 0, vy: 0, grounded: false }, discontinuity: 'relay' });
    expect(client.remote.sample(performance.now())!.x).toBe(280);
    expect(client.takeMachineryEvents().map(e => e.kind)).toEqual(['teleport']);
    ws.receive({ type: 'avatar', slot: 2, stream: 1, seq: 1, avatar, discontinuity: 'relay' });
    expect(client.takeMachineryEvents()).toEqual([]); expect(client.remote.sample(performance.now())!.x).toBe(280);
});
it('accepted firewall reset cancels stale pickup prediction and rejects a late old result/transform', async () => {
    const { client, ws, state, record, view, world } = await setup();
    assignCube(state, 2); record.revision++; ws.receive({ type: 'room', room: view() });
    Object.assign(world.player, { x: 1190, y: 543 }); world.interact();
    const seq = client.prediction.cube!.seq, stale = structuredClone(view());
    expect(world.cube!.carried).toBe(true);
    interactCube(state, 2, { type: 'cube-reset', cubeId: 'cube' as const, seq: 1, epoch: state.epoch, cause: 'firewall' }); record.revision++;
    ws.receive({ type: 'room', room: view() });
    expect(client.prediction.cube).toBeNull(); expect(world.cube).toMatchObject({ ...world.room.cube, carried: false });
    ws.receive({ type: 'action-result', seq, accepted: true, room: stale });
    ws.receive({ type: 'cube', cubeId: 'cube' as const, epoch: stale.cube!.epoch, seq: 999, transform: { x: 500, y: 500, vx: 0, vy: 0, grounded: false } });
    world.syncAuthority();
    expect(world.cube).toMatchObject({ ...world.room.cube, carried: false });
    expect(world.events.filter(e => e.kind === 'cube-firewall')).toHaveLength(1);
});
it('firewall reset discards an unsent relay marker and publishes only the accepted spawn epoch', async () => {
    const { client, ws, state, record, view, world } = await setup();
    client.markDiscontinuity('cube', 'relay'); client.cubeAction('cube-reset');
    const pending = client.prediction.cube!;
    client.publishCube(world.cube!, 1000); expect(ws.sent.at(-1)?.type).toBe('cube-reset');
    interactCube(state, 1, { type: 'cube-reset', cubeId: 'cube' as const, seq: pending.seq, epoch: state.epoch, cause: 'firewall' }); record.revision++;
    ws.receive({ type: 'action-result', seq: pending.seq, accepted: true, room: view() });
    client.publishCube(world.cube!, 1001);
    expect(ws.sent.at(-1)).toMatchObject({ type: 'cube', cubeId: 'cube' as const, epoch: state.epoch, transform: world.room.cube });
    expect(ws.sent.at(-1)).not.toHaveProperty('discontinuity');
});
it('delayed crumble prediction cannot collapse; denial reconciles without duplicate warning/collapse sound', async () => {
    await setup();
    const client = new CoopClient(() => {}, () => {}); cleanups.push(() => client.leave()); client.start('ABCD');
    await vi.waitFor(() => expect(Socket.instances).toHaveLength(2));
    const ws = Socket.instances[1]; ws.onopen();
    const record = newRecord('ABCD', 'visitor', 'crumble-lab'), state = sharedRoom(record, [true, true], [null, null]);
    ws.receive({ type: 'snapshot', slot: 1, room: state });
    const authority = createCoopAuthority(client.room!, client);
    const w = new PuzzleWorld(COOP_LABS['crumble-lab'].room(1), freshProgress().rooms.switch, undefined, authority);
    const sink = { play: vi.fn(), setLoop: vi.fn(), stopAll: vi.fn() }, sound = new AudioPresentation(sink); sound.reset(w);
    Object.assign(w.player, { x: 510, y: 543, groundId: 'crumbleA', grounded: true });
    w.step(FIXED_DT, emptyInput()); sound.observe(w, w.events.splice(0));
    const pending = client.pendingCrumble.get('crumbleA')!, block = w.platforms.find(p => p.def.id === 'crumbleA')!;
    expect(ws.sent.at(-1)).toMatchObject({ type: 'crumble-trigger', platform: 'crumbleA', trigger: 'foot' });
    pending.at -= 2000; authority.crumble!.sync(w); expect(block.fuse).toBe(0); expect(block.solid.enabled).toBe(true);
    ws.receive({ type: 'action-result', seq: pending.seq, accepted: false, room: client.room! });
    authority.crumble!.sync(w); sound.observe(w, w.events.splice(0));
    expect(block.fuse).toBe(-1); expect(block.solid.enabled).toBe(true); expect(client.pendingCrumble.size).toBe(0);
    expect(sink.play.mock.calls.filter(c => c[0] === 'crumbleWarn')).toHaveLength(1);
    expect(sink.play.mock.calls.filter(c => c[0] === 'crumbleBreak')).toHaveLength(0);
});


it('prediction/denial for A never pauses or rewinds B, and a B relay marker only snaps B', async () => {
    Socket.instances = [];
    vi.stubGlobal('WebSocket', Socket);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ id: 'visitor' }) })));
    vi.stubGlobal('location', { href: 'http://localhost/' });
    const record = newRecord('ABCD', 'visitor', 'crossfeed-vault'), cubes = freshCubes(record.level);
    record.levelState.switchB = record.levelState.switchC = true; record.checkpoint = 'upper';
    for (const c of Object.values(cubes)) assignCube(c, 1);
    const view = () => sharedRoom(record, [true, true], [null, null], cubes);
    let world: PuzzleWorld, authority: ReturnType<typeof createCoopAuthority>;
    const client = new CoopClient((room, initial) => {
        if (initial) { authority = createCoopAuthority(room, client); world = new PuzzleWorld(COOP_LABS[room.level].room(1), freshProgress().rooms.relay, undefined, authority); }
        else { authority.room = room; world.syncAuthority(); }
    }, () => {});
    cleanups.push(() => client.leave()); client.start(undefined, 'crossfeed-vault');
    await vi.waitFor(() => expect(Socket.instances).toHaveLength(1));
    const ws = Socket.instances[0]; ws.onopen(); ws.receive({ type: 'snapshot', slot: 1, room: view() });
    Object.assign(world!.cubes.cubeB!, { x: 610, y: 1478 }); const beforeB = { ...world!.cubes.cubeB! };
    expect(client.cubeAction('cube-pickup', undefined, 'cubeA')).toBe(true); world!.syncAuthority();
    ws.sent = []; client.publishCube(world!.cubes.cubeA!, 1000, 'cubeA'); client.publishCube(world!.cubes.cubeB!, 1000, 'cubeB');
    expect(ws.sent).toHaveLength(1); expect(ws.sent[0]).toMatchObject({ type: 'cube', cubeId: 'cubeB', seq: 1 });
    ws.receive({ type: 'action-result', seq: client.prediction.cube!.seq, accepted: false, room: view() });
    expect(world!.cubes.cubeB).toEqual(beforeB); expect(world!.cubes.cubeA!.carried).toBe(false);
    expect(client.cubeAction('cube-pickup', undefined, 'cubeA')).toBe(true);
    interactCube(cubes.cubeA!, 1, { type: 'cube-pickup', cubeId: 'cubeA', seq: 2, epoch: cubes.cubeA!.epoch }); record.revision++;
    ws.receive({ type: 'action-result', seq: client.prediction.cube!.seq, accepted: true, room: view() });
    const beforeA = { ...world!.cubes.cubeA! };
    assignCube(cubes.cubeB!, 2); record.revision++; ws.receive({ type: 'room', room: view() });
    ws.receive({ type: 'cube', cubeId: 'cubeB', seq: 1, epoch: cubes.cubeB!.epoch, transform: { x: 3290, y: 918, vx: 0, vy: 0, grounded: true }, discontinuity: 'relay' });
    world!.syncAuthority(); expect(world!.cubes.cubeB!.x).toBe(3290); expect(world!.cubes.cubeA).toEqual(beforeA);
    expect(client.cubeReplica('cubeB').lastDiscontinuity?.kind).toBe('relay'); expect(client.cubeReplica('cubeA').lastDiscontinuity).toBeNull();
});
