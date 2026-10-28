import { expect, it, vi } from 'vitest';
import { MachineryPresentation, padDepression, liftIllumination, pressurePads, type PressurePad } from '../src/slice/machinery-presentation.ts';
import { LiftField } from '../src/slice/machinery.ts';
import { drawGravityLift, liftDetailPlan } from '../src/slice/lift-render.ts';
import { drawPressurePad } from '../src/slice/plate-render.ts';
import { AudioPresentation } from '../src/slice/audio-presentation.ts';
import { payloadReceivers } from '../src/slice/receiver-presentation.ts';
import { createRuntime } from '../src/workbench/runtime.ts';
import { machineryReview } from '../scripts/fixtures/machinery-review.ts';
import { COOP_LABS } from '../src/coop/labs.ts';
import { roomById } from '../src/slice/rooms.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { freshProgress } from '../src/slice/progress.ts';

const pad = (active = false, id = 'feed'): PressurePad => ({ id, at: { x: 650, y: 700 }, label: 'FEED', active, supported: true });
const lift = (id = 'lift', height = 580) => new LiftField({ id, x: 1080, y: 120, w: 240, h: height, signal: 'liftField' });
it('baselines restored power, ignores repeated snapshots and clears room-local clocks', () => {
    const p = new MachineryPresentation(), l = lift(); l.power(true); p.reset([pad(true)], [l]);
    expect(p.snapshot()).toEqual({ pads: [{ id: 'feed', active: true, supported: true, age: null, depression: 1 }],
        lifts: [{ id: 'lift', enabled: true, age: null, illumination: 1 }] });
    for (let n = 0; n < 100; n++) p.update([pad(true)], [l], .02, true);
    expect(p.snapshot().lifts[0].age).toBeNull();
    p.reset([], []); expect(p.snapshot()).toEqual({ pads: [], lifts: [] });
});
it('compresses, holds, releases and reverses continuously without delaying real power', () => {
    const p = new MachineryPresentation(), l = lift(); p.reset([pad()], [l]);
    l.power(true); p.update([pad(true)], [l], .01, true);
    expect(l.enabled).toBe(true); expect(l.influence({ x: 1200, y: 500, vx: 0, vy: 0 }, 44, 44)).toBeDefined();
    expect(padDepression(p.pads.get('feed')!)).toBe(0); expect(liftIllumination(p.lifts.get('lift')!)).toBe(0);
    p.update([pad(true)], [l], .07, true); expect(padDepression(p.pads.get('feed')!)).toBeCloseTo(.5);
    p.update([pad()], [l], .01, true); expect(padDepression(p.pads.get('feed')!)).toBeCloseTo(.5);
    p.update([pad()], [l], .18, true); expect(padDepression(p.pads.get('feed')!)).toBe(0);
    p.update([pad(true)], [l], .01, true); p.update([pad(true)], [l], .7, true);
    expect(padDepression(p.pads.get('feed')!)).toBe(1); expect(liftIllumination(p.lifts.get('lift')!)).toBe(1);
    const age = p.pads.get('feed')!.age; p.update([pad(true)], [l], .1, true); expect(p.pads.get('feed')!.age).toBeCloseTo(age + .1);
    l.power(false); p.update([pad()], [l], .01, true); expect(l.influence({ x: 1200, y: 500, vx: 0, vy: 0 }, 44, 44)).toBeUndefined();
    p.update([pad()], [l], .28, true); expect(liftIllumination(p.lifts.get('lift')!)).toBe(0);
});
it('keeps independent clocks and settles stopped editor or disconnected previews', () => {
    const p = new MachineryPresentation(), a = lift('a'), b = lift('b'); p.reset([pad(), pad(false, 'safe')], [a, b]);
    a.power(true); p.update([pad(true), pad(false, 'safe')], [a, b], .1, true);
    p.update([pad(true), pad(false, 'safe')], [a, b], .4, true);
    b.power(true); p.update([pad(true), pad(true, 'safe')], [a, b], .1, true);
    expect(p.snapshot().lifts.map(l => l.age)).toEqual([.5, 0]);
    p.update([pad(true), pad(true, 'safe')], [a, b], 0, false);
    expect(p.snapshot().pads.every(p => p.age === null && p.depression === 1)).toBe(true);
    expect(p.snapshot().lifts.every(l => l.age === null && l.illumination === 1)).toBe(true);
});
it('audits ordinary legacy/declarative pads and CROSSFEED scanners without relabelling receivers', () => {
    const base = new PuzzleWorld(roomById('uplink'), freshProgress().rooms.uplink);
    expect(pressurePads(base).map(p => p.id)).toEqual(['plateA', 'plateB']);
    for (const id of ['pressure', 'relay'] as const) expect(pressurePads({ ...base, room: roomById(id) }).length).toBeGreaterThan(0);
    const crossfeed = { ...base, room: COOP_LABS['crossfeed-vault'].room(1) };
    // The vault's biometric scanners share the animated pad art; payload sockets stay receivers.
    expect(pressurePads(crossfeed).map(p => [p.id, p.label, p.labelOffset])).toEqual([
        ['plateB', 'LEFT / SCANNER', 49], ['plateC', 'RIGHT / SCANNER', 49], ['entry', 'A', 49], ['routePower', 'ROUTE POWER', 49]]);
    expect(pressurePads({ ...crossfeed, inputs: { ...base.inputs, plateB: true } }).map(p => p.active)).toEqual([true, false, false, false]);
    expect(payloadReceivers(crossfeed).map(p => p.id)).toEqual(['liftCargo', 'finalLeft', 'finalRight']);
    expect(pressurePads({ ...base, room: COOP_LABS['race-condition'].room(1) }).map(p => p.id)).toContain('receiver');
    const w = createRuntime(machineryReview()).world;
    expect(pressurePads(w).map(p => p.id)).toEqual(['draft:feed', 'draft:unstable']);
    expect(payloadReceivers(w).map(p => p.id)).toEqual(['draft:receiver']);
    w.frame.outputs.exitDoor = true; expect(pressurePads(w).every(p => !p.active)).toBe(true);
});
it('real weight powers the pad and lift; actual support collapse ghosts the pad and releases contact', () => {
    const d = machineryReview(), spawn = d.geometry.objects.find(o => o.id === 'p1')!;
    spawn.x = 1870; spawn.y = 503;
    const rt = createRuntime(d), w = rt.world, p = new MachineryPresentation(); p.reset(pressurePads(w), w.lifts);
    for (let i = 0; i < 5; i++) rt.step();
    expect(pressurePads(w)[1]).toMatchObject({ active: true, supported: true });
    expect(w.platforms.find(s => s.def.id === 'operator')!.fuse).toBeGreaterThan(0);
    for (let i = 0; i < 850 && w.platforms.find(s => s.def.id === 'operator')!.solid.enabled; i++) rt.step();
    rt.step();
    expect(pressurePads(w)[1]).toMatchObject({ active: false, supported: false });
    expect(w.lifts[1].enabled).toBe(false);
    for (let i = 0; i < 100; i++) rt.step();
    expect(w.player.grounded).toBe(true);
    for (let i = 0; i < 360; i++) rt.step();
    expect(pressurePads(w)[1]).toMatchObject({ active: false, supported: true });
});

/** Record actual Canvas commands without rasterizing. Tests motion/culling and
 * mutation boundaries; the browser gallery separately checks the real pixels. */
function canvas() {
    const calls: unknown[][] = [], target: Record<string, unknown> = {};
    const c = new Proxy(target, { get: (_, key) => (...args: unknown[]) => {
        calls.push([key, ...args]);
        if (String(key).startsWith('create')) return { addColorStop: (...a: unknown[]) => calls.push(['stop', ...a]) };
    }, set: (_, key, value) => { calls.push([key, value]); return true; } });
    return { c: c as unknown as CanvasRenderingContext2D, calls };
}
it('bounds lift detail by visible area even in a 9000-unit shaft and culls hidden fields', () => {
    const view = { x: 1000, y: 200, w: 900, h: 650 }, b = lift().def;
    for (const h of [580, 3000, 9000]) for (const zoom of [.1, .5, 1, 2]) {
        const plan = liftDetailPlan({ ...b, h }, view, zoom)!;
        expect(plan.rows).toBeLessThanOrEqual(20); expect(plan.streams * plan.segments).toBeLessThanOrEqual(56);
    }
    expect(liftDetailPlan(b, { ...view, x: 5000 }, 1)).toBeNull();
    const l = lift('tall', 9000); l.power(true);
    const { c, calls } = canvas(); drawGravityLift(c, l, { active: true, age: Infinity, from: 1 }, 2, view, 1, true);
    expect(calls.length).toBeLessThan(650);
});
it('reduced motion freezes both assets, preserves distinct states, and rendering never changes physics', () => {
    const l = lift(); l.power(true); const view = { x: 0, y: 0, w: 2000, h: 900 }, before = JSON.stringify(l);
    const draw = (time: number, motion: boolean, active = true) => {
        const { c, calls } = canvas(), state = { active, age: Infinity, from: Number(active) };
        drawPressurePad(c, pad(active), state, time, motion);
        drawGravityLift(c, l, state, time, view, 1, motion); return JSON.stringify(calls);
    };
    expect(draw(0, false)).toEqual(draw(10, false));
    expect(draw(0, true)).not.toEqual(draw(1, true)); expect(draw(0, false, false)).not.toEqual(draw(0, false));
    expect(JSON.stringify(l)).toBe(before);
});
it('authored lift signals reuse one quiet edge cue, with silent snapshots and restored power', () => {
    const rt = createRuntime(machineryReview()), w = rt.world;
    Object.assign(w.player, { x: 1200, y: 500 });
    const companion = new LiftField({ ...w.lifts[0].def, id: 'same-output-second-field' }); w.lifts.push(companion);
    const audio = { play: vi.fn(), setLoop: vi.fn(), stopAll: vi.fn() }, sound = new AudioPresentation(audio); sound.reset(w);
    w.lifts[0].power(true); companion.power(true); sound.observe(w, []);
    for (let i = 0; i < 100; i++) sound.observe(w, []);
    expect(audio.play.mock.calls.filter(([cue]) => cue === 'liftPower')).toHaveLength(1);
    expect(audio.play).toHaveBeenCalledWith('liftPower', 1, 1);
    sound.reset(w); sound.observe(w, []); expect(audio.play.mock.calls.filter(([cue]) => cue === 'liftPower')).toHaveLength(1);
    w.lifts[0].power(false); companion.power(false); sound.observe(w, []);
    expect(audio.play.mock.calls.filter(([cue]) => cue === 'liftPower')).toHaveLength(2);
});
