import { expect, it } from 'vitest';
import { HeroPresentation, breakpointPose, entryGateways, type HeroState } from '../src/slice/hero-presentation.ts';
import { crossfeedVault } from '../src/coop/crossfeed-vault.ts';
import { COOP_LABS } from '../src/coop/labs.ts';
import { ROOMS, roomById } from '../src/slice/rooms.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { freshProgress } from '../src/slice/progress.ts';
import { Camera } from '../src/render/camera.ts';

const initial: HeroState = { checkpoint: 'entry', exitReady: false, completed: false };
it('waits for gameplay to attach once; observing state and local respawns cannot reattach', () => {
    const room = roomById('pressure'), h = new HeroPresentation(); h.reset(room, initial);
    expect(h.update(room, initial, 8, false)).toEqual([]); expect(h.entryAge).toBe(Infinity);
    expect(h.update(room, initial, .1, true).map(c => c.cue)).toEqual(['entryAttach']);
    expect(h.update(room, initial, 1, true)).toEqual([]);
    const w = new PuzzleWorld(room, freshProgress().rooms.pressure); w.respawn();
    expect(h.update(room, { ...initial, checkpoint: w.checkpoint }, .1, true)).toEqual([]);
    expect(h.entryAge).toBeGreaterThan(1);
});
it('deploys on the accepted checkpoint edge once, in terminal/mast/flag/confirmation phases', () => {
    const room = crossfeedVault(1), h = new HeroPresentation(); h.reset(room, initial);
    h.update(room, initial, 0, true);
    const active = { ...initial, checkpoint: 'upper' as const };
    expect(h.update(room, active, 0, true).map(c => c.cue)).toEqual(['breakpointDeploy']);
    expect(h.snapshot().breakpoints[0]).toMatchObject({ mast: 0, flag: 0, active: true });
    h.update(room, active, .5, true);
    expect(h.snapshot().breakpoints[0].mast).toBeCloseTo(.5);
    expect(h.snapshot().breakpoints[0].flag).toBe(0);
    h.update(room, active, .5, true);
    expect(h.snapshot().breakpoints[0].mast).toBe(1);
    expect(h.snapshot().breakpoints[0].flag).toBeCloseTo(.5);
    expect(h.update(room, active, .3, true).map(c => c.cue)).toEqual(['breakpointConfirm']);
    for (let i = 0; i < 100; i++) expect(h.update(room, active, .02, true)).toEqual([]);
    expect(h.snapshot().breakpoints[0]).toMatchObject({ mast: 1, flag: 1, flash: 0, confirmation: 0 });
});
it('baselines reconnect/reload snapshots without deployment, attach, unlock, or victory replay', () => {
    const room = crossfeedVault(2), h = new HeroPresentation();
    const restored = { checkpoint: 'upper' as const, exitReady: true, completed: true };
    h.reset(room, restored);
    expect(h.update(room, restored, .1, true)).toEqual([]);
    expect(h.snapshot()).toMatchObject({ entryAge: null, exitAge: null, completionAge: null });
    expect(h.snapshot().breakpoints[0]).toMatchObject({ active: true, age: null, mast: 1, flag: 1 });
});
it('keeps exit readiness and authoritative completion independent, including reversible exits', () => {
    const room = roomById('pressure'), h = new HeroPresentation(); h.reset(room, initial);
    h.update(room, { ...initial, exitReady: true }, 0, false);
    expect(h.exitAge).toBe(0); expect(h.completionAge).toBe(Infinity);
    h.update(room, { ...initial, exitReady: true }, 1.1, false);
    expect(h.exitAge).toBe(1.1); expect(h.completionAge).toBe(Infinity);
    h.update(room, initial, .1, false);
    h.update(room, { ...initial, exitReady: true }, .1, false); expect(h.exitAge).toBe(0);
    h.update(room, { ...initial, exitReady: true, completed: true }, 0, false); expect(h.completionAge).toBe(0);
});
it('respawning at an authored milestone preserves the deployed pose without replay', () => {
    const room = { ...roomById('uplink'), breakpoints: [{ id: 'saved', at: { x: 1980, y: 620 }, checkpoint: 'upper' as const }] };
    const w = new PuzzleWorld(room, { ...freshProgress().rooms.uplink, checkpoint: 'upper', switchC: true });
    const h = new HeroPresentation(), state = { ...initial, checkpoint: w.checkpoint };
    h.reset(room, state); w.respawn();
    expect(w.player.x).toBe(room.upperCheckpoint!.x); expect(w.player.y).toBe(room.upperCheckpoint!.y);
    expect(h.update(room, { ...state, checkpoint: w.checkpoint }, .2, true)).toEqual([]);
    expect(h.snapshot().breakpoints[0]).toMatchObject({ age: null, mast: 1, flag: 1 });
});
it('supports independent authored stations and retains earlier milestones without inventing controls', () => {
    const room = { ...roomById('uplink'), breakpoints: [
        { id: 'lower', checkpoint: 'relay' as const, at: { x: 1130, y: 1220 } },
        { id: 'upper', checkpoint: 'upper' as const, at: { x: 1980, y: 620 } }] };
    const h = new HeroPresentation(); h.reset(room, { ...initial, checkpoint: 'relay' });
    expect(h.update(room, { ...initial, checkpoint: 'upper' }, 0, false).map(c => c.at)).toEqual([{ x: 1980, y: 620 }]);
    expect(h.snapshot().breakpoints.map(s => s.active)).toEqual([true, true]);
    expect(breakpointPose(false, Infinity)).toEqual({ mast: 0, flag: 0, flash: 0, confirmation: 0 });
});
it('shows the same entrances for both slots and places every spawn inside its opening', () => {
    for (const lab of Object.values(COOP_LABS)) expect(entryGateways(lab.room(1))).toEqual(entryGateways(lab.room(2)));
    for (const room of [...ROOMS, ...Object.values(COOP_LABS).map(l => l.room(1))]) {
        for (const { opening: b, points } of entryGateways(room)) for (const p of points) {
            expect(p.x - 11).toBeGreaterThan(b.x); expect(p.x + 11).toBeLessThan(b.x + b.w);
            expect(p.y + 17).toBe(b.y + b.h);
        }
    }
    expect(entryGateways(COOP_LABS['pairing-bay'].room(1))).toHaveLength(2);
    expect(entryGateways(crossfeedVault(1))).toHaveLength(1);
});
it('leaves gameplay, trigger geometry and camera-to-aim mapping unchanged at overview zoom', () => {
    const w = new PuzzleWorld(roomById('relay'), freshProgress().rooms.relay), h = new HeroPresentation();
    const before = JSON.stringify({ player: w.player, door: w.door, memory: w.memory(), solids: w.solids });
    h.reset(w.room, initial); h.update(w.room, initial, .85, true);
    expect(JSON.stringify({ player: w.player, door: w.door, memory: w.memory(), solids: w.solids })).toBe(before);
    const camera = new Camera(); camera.setWorld(w.room.width, w.room.height);
    for (const zoom of [.1, .3, .65, 1.2]) {
        camera.zoom = zoom;
        const aim = { x: 780, y: 226 };
        const mapped = camera.screenToWorld((aim.x - camera.originX()) * zoom, (aim.y - camera.originY()) * zoom);
        expect(mapped.x).toBeCloseTo(aim.x, 10); expect(mapped.y).toBeCloseTo(aim.y, 10);
    }
});
