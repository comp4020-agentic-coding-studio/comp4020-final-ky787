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
import { newRecord } from '../server/coop-state.ts';
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
async function setup(switchB = true) {
    Socket.instances = [];
    vi.stubGlobal('WebSocket', Socket);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ id: 'visitor' }) })));
    vi.stubGlobal('location', { href: 'http://localhost/' });
    const record: RoomRecord<'pairing-bay'> = { version: 4, code: 'ABCD', level: 'pairing-bay', revision: 1, visitors: ['a', 'b'], levelState: { switchB },
        checkpoint: switchB ? 'reunion' : 'entry', cubePlacement: 'spawn', exitUnlocked: false, reachedExit: [false, false], completed: false,
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
    interactCube(state, 1, { type: 'cube-pickup', seq: pending.seq, epoch: state.epoch }); record.revision++;
    ws.receive({ type: 'action-result', seq: pending.seq, accepted: true, room: view() });
    expect(client.prediction.cube).toBeNull(); expect(client.prediction.last['cube-pickup']?.accepted).toBe(true);
    client.publishCube(world.cube!, 1050);
    expect(ws.sent.at(-1)).toMatchObject({ type: 'cube', epoch: state.epoch, seq: 1 });
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
    interactCube(state, 1, { type: 'cube-pickup', seq: oldSeq, epoch: state.epoch });
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
    interactCube(state, 1, { type: 'cube-pickup', seq, epoch: state.epoch }); record.revision++;
    ws.receive({ type: 'action-result', seq, accepted: true, room: view() });
    expect(client.prediction.cubeResult?.accepted).toBe(true);
    record.cubePlacement = 'cargoPlate'; assignCube(state, 1); state.transform = null;
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
    interactCube(state, 1, { type: 'cube-pickup', seq, epoch: state.epoch }); record.revision++;
    ws.receive({ type: 'action-result', seq, accepted: true, room: view() });
    client.publishCube(world.cube!, 1002);
    expect(ws.sent.at(-1)).toMatchObject({ type: 'cube', discontinuity: 'relay', epoch: state.epoch });
    client.publishCube(world.cube!, 1100); expect(ws.sent.at(-1)).not.toHaveProperty('discontinuity');
});
it('accepted remote carried transit emits one cue and stale stream markers cannot replay it', async () => {
    const { client, ws, state, record, view } = await setup();
    interactCube(state, 2, { type: 'cube-pickup', seq: 1, epoch: state.epoch }); record.revision++;
    ws.receive({ type: 'room', room: view() });
    const avatar = { x: 220, y: 543, vx: 0, vy: 0, facing: 1 as const, grounded: true, rope: null };
    ws.receive({ type: 'avatar', slot: 2, stream: 1, seq: 1, avatar });
    ws.receive({ type: 'avatar', slot: 2, stream: 1, seq: 2, avatar: { ...avatar, x: 280 }, discontinuity: 'relay' });
    ws.receive({ type: 'cube', epoch: state.epoch, seq: 1, transform: { x: 280, y: 500, vx: 0, vy: 0, grounded: false }, discontinuity: 'relay' });
    expect(client.remote.sample(performance.now())!.x).toBe(280);
    expect(client.takeMachineryEvents().map(e => e.kind)).toEqual(['teleport']);
    ws.receive({ type: 'avatar', slot: 2, stream: 1, seq: 1, avatar, discontinuity: 'relay' });
    expect(client.takeMachineryEvents()).toEqual([]); expect(client.remote.sample(performance.now())!.x).toBe(280);
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
