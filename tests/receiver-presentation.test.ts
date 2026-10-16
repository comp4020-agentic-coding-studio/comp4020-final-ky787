import { expect, it, vi } from 'vitest';
import { payloadReceivers, ReceiverPresentation, receiverPose } from '../src/slice/receiver-presentation.ts';
import { HeroPresentation } from '../src/slice/hero-presentation.ts';
import { AudioPresentation } from '../src/slice/audio-presentation.ts';
import { createRuntime } from '../src/workbench/runtime.ts';
import { receiverReview } from '../scripts/fixtures/receiver-review.ts';
import { COOP_LABS } from '../src/coop/labs.ts';
import { roomById } from '../src/slice/rooms.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { freshProgress } from '../src/slice/progress.ts';
import { emptyInput } from '../src/engine/physics.ts';

const receiver = (id = 'a', active = false) => ({ id, active, at: { x: 800, y: 620 }, label: 'PAYLOAD' });
const dock = { receiver: 'a', cube: 'draft:cargoA' as const, at: { x: 800, y: 598 } };
it('connects once when a carrier clears the bay, without replaying confirmation or reconnect effects', () => {
    const p = new ReceiverPresentation(), waiting = receiver('a', true), connected = { ...waiting, dock };
    p.reset([receiver()]); expect(p.update([waiting], .1, true)).toHaveLength(1);
    p.update([waiting], 1, true);
    expect(p.update([connected], .1, true)).toEqual([]);
    expect(p.snapshot()[0]).toMatchObject({ age: 0, dock: { cube: 'draft:cargoA', x: 800, y: 598 } });
    p.update([connected], .2, true); expect(p.snapshot()[0].age).toBe(.2);
    p.update([receiver()], .1, true); expect(p.snapshot()[0].dock).toBeNull();
    p.reset([waiting]); p.update([connected], .1, true);
    expect(p.snapshot()[0]).toMatchObject({ age: null, connection: 1, transfer: null });
});
it('baselines existing cargo silently and ignores repeated accepted snapshots', () => {
    const p = new ReceiverPresentation(), active = [receiver('a', true)]; p.reset(active);
    expect(p.snapshot()[0]).toMatchObject({ active: true, age: null, engagement: 1, connection: 1, transfer: null });
    for (let i = 0; i < 100; i++) expect(p.update(structuredClone(active), .02, true)).toEqual([]);
    p.reset(active); expect(p.update(active, .1, true)).toEqual([]);
});
it('confirms once on accepted contact, releases without latching, and can detect a later delivery', () => {
    const p = new ReceiverPresentation(); p.reset([receiver()]);
    expect(p.update([receiver('a', true)], .016, true)).toEqual([{ cue: 'payloadConfirm', at: receiver().at }]);
    expect(p.snapshot()[0]).toMatchObject({ active: true, age: 0, status: 'PAYLOAD DETECTED' });
    expect(p.update([receiver('a', true)], .35, true)).toEqual([]);
    expect(p.snapshot()[0].connection).toBeGreaterThan(0);
    p.update([receiver('a', true)], .23, true); expect(p.snapshot()[0].transfer).toBeGreaterThan(0);
    expect(p.update([receiver()], .01, true)).toEqual([]);
    expect(p.snapshot()[0]).toMatchObject({ active: false, release: 1, status: 'AWAITING PAYLOAD' });
    p.update([receiver()], .5, true); expect(p.snapshot()[0].release).toBe(0);
    expect(p.update([receiver('a', true)], .01, true)).toHaveLength(1);
});
it('tracks multiple receivers independently and settles stopped editor previews', () => {
    const p = new ReceiverPresentation(); p.reset([receiver('a'), receiver('b'), receiver('c')]);
    expect(p.update([receiver('a', true), receiver('b'), receiver('c')], .1, true)).toHaveLength(1);
    p.update([receiver('a', true), receiver('b'), receiver('c')], .6, true);
    expect(p.update([receiver('a', true), receiver('b', true), receiver('c', true)], .1, true)).toHaveLength(2);
    expect(p.snapshot().map(r => r.age)).toEqual([.7, 0, 0]);
    p.update([receiver('a'), receiver('b', true), receiver('c', true)], .1, true);
    expect(p.snapshot().map(r => r.active)).toEqual([false, true, true]);
    expect(p.update([receiver('a', true), receiver('b', true), receiver('c', true)], 0, false)).toEqual([]);
    expect(p.snapshot().every(r => r.age === null && r.connection === 1 && r.engagement === 1)).toBe(true);
    expect(receiverPose(false, Infinity)).toEqual({ engagement: 0, connection: 0, transfer: null, release: 0 });
});
it('audits genuine receiver semantics: generic and legacy universal plates do not become cargo docks', () => {
    const base = new PuzzleWorld(roomById('uplink'), freshProgress().rooms.uplink);
    expect(payloadReceivers(base).map(r => r.id)).toEqual(['plateC']);
    for (const id of ['pressure', 'relay'] as const) expect(payloadReceivers({ ...base, room: roomById(id) })).toEqual([]);
    expect(payloadReceivers({ ...base, room: COOP_LABS['race-condition'].room(1) })).toEqual([]);
    expect(payloadReceivers({ ...base, room: COOP_LABS['crossfeed-vault'].room(1) }).map(r => r.id)).toEqual(['liftCargo', 'finalLeft', 'finalRight']);
    const customCrossfeed = COOP_LABS['crossfeed-vault'].room(1);
    customCrossfeed.cubePads!.push({ id: 'entry', at: { x: 500, y: 1500 }, label: 'UNIVERSAL' });
    expect(payloadReceivers({ ...base, room: customCrossfeed }).some(r => r.id === 'entry')).toBe(false);
    expect(payloadReceivers({ ...base, room: COOP_LABS['pairing-bay'].room(1) }).map(r => r.id)).toEqual(['cargoPlate']);
    const runtime = createRuntime(receiverReview());
    expect(payloadReceivers(runtime.world).map(r => r.id)).toEqual(['draft:receiver1', 'draft:receiver2']);
    // A predicted cargo visualization or an unlocked exit is not accepted socket occupancy.
    runtime.world.frame.outputs.exitDoor = true;
    expect(payloadReceivers(runtime.world).every(r => !r.active)).toBe(true);
});
it('actual player/cube contact drives the presentation immediately, without changing world state or duplicating plate audio', () => {
    const d = receiverReview(), spawn = d.geometry.objects.find(o => o.id === 'p1')!, cube = d.geometry.objects.find(o => o.id === 'cargoA')!;
    spawn.x = 800; cube.x = 880;
    const rt = createRuntime(d), w = rt.world, h = new HeroPresentation();
    const state = () => ({ checkpoint: w.checkpoint, exitReady: w.frame.outputs.exitDoor, completed: w.exited, receivers: payloadReceivers(w) });
    h.reset(w.room, state()); h.update(w.room, state(), 0, true);
    for (let i = 0; i < 6; i++) rt.step();
    expect(payloadReceivers(w).every(r => !r.active)).toBe(true);
    const audio = { play: vi.fn(), stopAll: vi.fn(), setLoop: vi.fn() }, sound = new AudioPresentation(audio); sound.reset(w);
    // Walk to the nearby cube, carry back and drop through the real interaction path.
    for (let i = 0; i < 90 && w.player.x < 845; i++) rt.step({ ...emptyInput(), right: true });
    for (let i = 0; i < 20; i++) rt.step();
    rt.step(emptyInput(), true); expect(w.cubes['draft:cargoA']!.carried).toBe(true);
    rt.step({ ...emptyInput(), left: true });
    for (let i = 0; i < 20; i++) rt.step();
    rt.step(emptyInput(), true);
    for (let i = 0; i < 45; i++) rt.step();
    expect(payloadReceivers(w)[0].active).toBe(true);
    const before = JSON.stringify({ player: w.player, cubes: w.cubes, frame: w.frame, solids: w.solids, memory: w.memory() });
    expect(h.update(w.room, state(), .016, true).filter(c => c.cue === 'payloadConfirm')).toHaveLength(1);
    sound.observe(w, []);
    expect(audio.play.mock.calls.some(([cue]) => cue === 'plate')).toBe(false);
    expect(JSON.stringify({ player: w.player, cubes: w.cubes, frame: w.frame, solids: w.solids, memory: w.memory() })).toBe(before);
    rt.step(emptyInput(), true); expect(payloadReceivers(w)[0].active).toBe(false);
    expect(h.update(w.room, state(), .016, true)).toEqual([]);
    expect(h.snapshot().receivers[0]).toMatchObject({ active: false, age: 0, release: 1 });
});
