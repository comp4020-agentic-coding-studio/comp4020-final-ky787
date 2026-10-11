import { expect, it } from 'vitest';
import { Camera } from '../src/render/camera.ts';
import { ContextualCamera, revealFrame } from '../src/slice/camera-reveals.ts';
import { raceCondition } from '../src/coop/race-condition.ts';
import { createPlayer, playerBox } from '../src/engine/physics.ts';
import type { PuzzleWorld } from '../src/slice/world.ts';

function fixture() {
    const w: Pick<PuzzleWorld, 'room' | 'player' | 'deaths' | 'localControl'> = {
        room: raceCondition(1), player: createPlayer(250, 1223), deaths: 0, localControl: null,
    };
    const view = new ContextualCamera(); view.reset(w);
    const stand = (id: string) => {
        const p = w.room.plates!.find(p => p.id === id)!;
        Object.assign(w.player, { x: p.at.x, y: p.at.y - 17, grounded: true });
    };
    const interact = () => { w.localControl = { id: 'phase', sequence: (w.localControl?.sequence ?? 0) + 1 }; };
    return { w, view, stand, interact };
}

it('local body entry immediately reveals a plate, holds indefinitely, and leaving restores follow', () => {
    const { w, view, stand } = fixture();
    expect(view.update(w, .016, false).kind).toBe('follow');
    stand('trace'); const initial = view.update(w, .016, false);
    expect(initial).toMatchObject({ kind: 'plate', id: 'trace' });
    for (let i = 0; i < 1200; i++) expect(view.update(w, 1 / 60, false)).toEqual(initial);
    w.player.x = 700;
    expect(view.update(w, .016, false).kind).toBe('follow');
    stand('trace'); w.player.grounded = false;
    expect(view.update(w, .016, false).kind).toBe('follow');
});

it('local lever edges reveal for 1.5 seconds; repeated snapshots cannot extend the timer', () => {
    const { w, view, interact } = fixture();
    Object.assign(w.player, { x: 690, y: 703, grounded: true });
    interact(); expect(view.update(w, .016, false)).toMatchObject({ kind: 'control', id: 'phase' });
    for (let i = 0; i < 80; i++) expect(view.update(w, 1 / 60, false).kind).toBe('control');
    expect(view.update(w, .2, false).kind).toBe('follow');
    interact(); expect(view.update(w, .016, false).kind).toBe('control');
});

it('held TRACE suppresses repeated lever edges without recentering or replaying them after release', () => {
    const { w, view, stand, interact } = fixture(); stand('trace');
    const target = view.update(w, .016, false), cam = new Camera();
    cam.setWorld(w.room.width, w.room.height, 740);
    for (let i = 0; i < 600; i++) cam.update(1 / 120, w.player, w.player, 1600, 780, target.frame);
    const pose = { x: cam.x, y: cam.y, zoom: cam.zoom };
    for (let i = 0; i < 8; i++) {
        interact(); w.player.x = 615 + (i % 2 ? 3 : -3);
        const next = view.update(w, .7, false); expect(next).toEqual(target);
        cam.update(.7, w.player, w.player, 1600, 780, next.frame);
        expect(cam.x).toBeCloseTo(pose.x, 5); expect(cam.y).toBeCloseTo(pose.y, 5); expect(cam.zoom).toBeCloseTo(pose.zoom, 5);
    }
    w.player.x = 690; expect(view.update(w, .016, false).kind).toBe('follow');
});

it('remote bodies, accepted plate outputs and resting cubes do not select a local view', () => {
    const { w, view } = fixture();
    // These can all arrive/change independently of the local body or input edge.
    const shared = { ...w, remote: createPlayer(615, 703), cubes: { cubeB: { x: 3470, y: 698, grounded: true } },
        inputs: { plateC: true, cubeOnPlateB: true }, outputs: { phaseA: true, returnBridge: true } };
    for (let i = 0; i < 100; i++) expect(view.update(shared, .05, false).kind).toBe('follow');
});

it('manual overview wins, then returns to a still-held plate; hidden temporary views expire', () => {
    const { w, view, stand, interact } = fixture(); stand('trace');
    expect(view.update(w, .016, true)).toMatchObject({ kind: 'overview', frame: { x: 0, y: 0, w: 4180, h: 1420 } });
    expect(view.update(w, .016, false).id).toBe('trace');
    w.player.x = 690; interact(); view.update(w, .016, false);
    expect(view.update(w, 2, true).kind).toBe('overview');
    expect(view.update(w, .016, false).kind).toBe('follow');
});

it.each(['respawn', 'room', 'disconnect'] as const)('%s clears a temporary reveal and never replays the old local edge', reason => {
    const { w, view, interact } = fixture(); interact(); view.update(w, .016, false);
    if (reason === 'respawn') { w.deaths++; w.player = createPlayer(695, 703); }
    const next = reason === 'room' ? { ...w, room: { ...w.room } } : w;
    expect(view.update(next, .016, false, reason !== 'disconnect').kind).toBe('follow');
    expect(view.update(next, .016, false, true).kind).toBe('follow');
});

it('disconnect suppresses a held plate until reconnected; legacy framing remains below explicit overview', () => {
    const { w, view, stand } = fixture(); stand('trace');
    expect(view.update(w, .016, false, false).kind).toBe('follow');
    expect(view.update(w, .016, false, true).kind).toBe('plate');
    w.player.x = 700;
    const legacy = { x: 0, y: 0, w: 3540, h: 850 };
    expect(view.update(w, .016, false, true, legacy)).toMatchObject({ kind: 'legacy', frame: legacy });
    expect(view.update(w, .016, true, true, legacy).kind).toBe('overview');
});

it.each([[1600, 780], [960, 500]])('authored targets fit at %s×%s, remain bounded, and preserve pointer mapping while easing', (width, height) => {
    const { w, view, stand } = fixture();
    for (const id of ['trace', 'dropA', 'dropB', 'return']) {
        stand(id); const selection = view.update(w, .016, false), f = selection.frame!;
        expect(f.x).toBeGreaterThanOrEqual(0); expect(f.y).toBeGreaterThanOrEqual(0);
        expect(f.x + f.w).toBeLessThanOrEqual(w.room.width); expect(f.y + f.h).toBeLessThanOrEqual(w.room.height);
        const cam = new Camera(); cam.viewW = width; cam.viewH = height; cam.setWorld(w.room.width, w.room.height, 740); cam.snapTo(w.player.x, w.player.y);
        const start = cam.zoom;
        for (let i = 0; i < 600; i++) {
            cam.update(1 / 120, w.player, { x: 0, y: 0 }, width, height, f);
            const aim = { x: 1505, y: 305 };
            const converted = cam.screenToWorld((aim.x - cam.originX()) * cam.zoom, (aim.y - cam.originY()) * cam.zoom);
            expect(converted.x).toBeCloseTo(aim.x, 9); expect(converted.y).toBeCloseTo(aim.y, 9);
            if (i === 0) expect(Math.abs(cam.zoom - start)).toBeLessThan(.05);
        }
        expect(cam.zoom).toBeGreaterThan(.3);
        expect(cam.originX()).toBeLessThanOrEqual(f.x + .01); expect(cam.originY()).toBeLessThanOrEqual(f.y + .01);
        expect(cam.originX() + width / cam.zoom).toBeGreaterThanOrEqual(f.x + f.w - .01);
        expect(cam.originY() + height / cam.zoom).toBeGreaterThanOrEqual(f.y + f.h - .01);
        const wider = cam.zoom; w.player.x += 120; w.player.grounded = false;
        const follow = view.update(w, .016, false); expect(follow.frame).toBeNull();
        cam.update(1 / 120, w.player, { x: 0, y: 0 }, width, height, follow.frame);
        expect(cam.zoom).toBeGreaterThanOrEqual(wider); expect(cam.zoom - wider).toBeLessThan(.05);
    }
});

it('platform-ID targets include ghost/fake blocks and clamp oversized authored rectangles', () => {
    const { w } = fixture();
    const ids = ['span1', 'crumbleA', 'span3', 'crumbleB', 'span5'];
    const frame = revealFrame(w.room, { platformIds: ids }, playerBox(w.player))!;
    for (const p of w.room.platforms.filter(p => ids.includes(p.id))) expect(frame.x + frame.w).toBeGreaterThanOrEqual(p.x + p.w);
    expect(revealFrame(w.room, { bounds: { x: -100, y: -100, w: 10000, h: 10000 } }, playerBox(w.player)))
        .toMatchObject({ x: 0, y: 0, w: 4180, h: 1420 });
    expect(revealFrame(w.room, { platformIds: ['missing'] }, playerBox(w.player))).toBeNull();
});
