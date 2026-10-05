import { describe, expect, it } from 'vitest';
import { FIXED_DT } from '../src/engine/constants.ts';
import { createPlayer, emptyInput, stepBody, stepPlayer, type LooseBody, type Solid } from '../src/engine/physics.ts';
import { LiftField, RelayGatePair } from '../src/slice/machinery.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { ROOMS } from '../src/slice/rooms.ts';
import { freshProgress } from '../src/slice/progress.ts';
import { CUBE_SIZE } from '../src/slice/tuning.ts';

const floor: Solid = { id: 'floor', x: 0, y: 600, w: 1000, h: 50, enabled: true, oneWay: false, grappleable: false };
const field = () => new LiftField({ id: 'lift', x: 100, y: 100, w: 200, h: 500, signal: 'liftField' });
const pair = () => new RelayGatePair({ id: 'pair', signal: 'relayGates', gates: [
    { id: 'A', x: 100, y: 490, w: 56, h: 110, exitSide: 1 },
    { id: 'B', x: 700, y: 490, w: 56, h: 110, exitSide: -1 },
] });
const bounds = { width: 1000, height: 800 };

describe('LiftField transport', () => {
    it('releasing horizontal input settles within the shaft without constant counter-steering', () => {
        const l = field(), p = createPlayer(200, 550); l.power(true); p.vx = 240;
        for (let n = 0; n < 120; n++) stepPlayer(p, emptyInput(), [floor], FIXED_DT, l.influence(p, 22, 34));
        expect(p.x).toBeLessThan(245); expect(p.vx).toBe(0);
        expect(p.y).toBeLessThan(400); expect(p.vy).toBe(-240);
    });
    it('lifts a player and loose cube, hovers near its top, and caps horizontal and upward speed', () => {
        const l = field(), p = createPlayer(200, 583);
        const c: LooseBody = { x: 230, y: 578, vx: 0, vy: 0, grounded: true, groundId: 'floor' };
        expect(l.influence(p, 22, 34)).toBeUndefined();
        l.power(true);
        for (let n = 0; n < 600; n++) {
            stepPlayer(p, emptyInput(), [floor], FIXED_DT, l.influence(p, 22, 34));
            stepBody(c, 44, [floor], 3000, 1400, FIXED_DT, l.influence(c, 44, 44));
            expect(p.vy).toBeGreaterThanOrEqual(-240);
            expect(c.vy).toBeGreaterThanOrEqual(-240);
        }
        expect(p.y).toBeCloseTo(117, 0);
        expect(c.y).toBeCloseTo(122, 0);
        p.vx = 1600;
        stepPlayer(p, { ...emptyInput(), right: true }, [floor], FIXED_DT, l.influence(p, 22, 34));
        expect(p.vx).toBeLessThanOrEqual(240);
        l.power(false);
        for (let n = 0; n < 180; n++) {
            stepPlayer(p, emptyInput(), [floor], FIXED_DT, l.influence(p, 22, 34));
            stepBody(c, 44, [floor], 3000, 1400, FIXED_DT, l.influence(c, 44, 44));
        }
        expect(p.groundId).toBe('floor'); expect(c.groundId).toBe('floor');
        expect(p.y).toBe(583); expect(c.y).toBe(578);
    });
    it('leaving the field restores ordinary gravity without a high launch', () => {
        const l = field(), p = createPlayer(299, 300); l.power(true);
        p.vx = 240; p.vy = -240;
        let highest = p.y;
        for (let n = 0; n < 25; n++) {
            stepPlayer(p, { ...emptyInput(), right: true }, [], FIXED_DT, l.influence(p, 22, 34));
            highest = Math.min(highest, p.y);
        }
        expect(p.x).toBeGreaterThan(330); expect(highest).toBeGreaterThan(280);
        expect(p.vy).toBeGreaterThan(0);
    });
    it('carried cubes follow the rider once rather than receiving a second lift impulse', () => {
        const w = new PuzzleWorld(ROOMS[3], { ...freshProgress().rooms.uplink, switchC: true });
        const startY = w.room.lifts![0].y + 550;
        Object.assign(w.player, { x: 1740, y: startY }); w.cube!.carried = true;
        for (let n = 0; n < 120; n++) w.step(FIXED_DT, emptyInput());
        expect(w.player.y).toBeLessThan(startY - 190);
        expect(w.cube!.y).toBe(w.player.y - 17 - 4 - CUBE_SIZE / 2);
        expect(w.cube!.vy).toBe(0);
    });
});

describe('RelayGatePair transport', () => {
    it('powers both directions with per-entity cooldown, separation and bounded exit speed', () => {
        const g = pair(), p = createPlayer(128, 583), cube = createPlayer(128, 578);
        expect(g.teleport('player', p, 22, 34, [floor], bounds)).toBeNull();
        g.power(true); p.vx = 1800; p.vy = -1200;
        expect(g.teleport('player', p, 22, 34, [floor], bounds)).toMatchObject({ from: 'A', to: 'B', pair: 'pair' });
        expect(p.x).toBeLessThan(700 - 11); expect(p.vx).toBe(-240); expect(p.vy).toBe(0);
        expect(g.teleport('cube', cube, 44, 44, [floor], bounds)?.to).toBe('B');
        Object.assign(p, { x: 728, y: 583 });
        expect(g.teleport('player', p, 22, 34, [floor], bounds)).toBeNull();
        g.step(.7);
        expect(g.teleport('player', p, 22, 34, [floor], bounds)?.to).toBe('A');
        const at = p.x; g.step(5);
        expect(g.teleport('player', p, 22, 34, [floor], bounds)).toBeNull();
        expect(p.x).toBe(at);
        Object.assign(cube, { x: 728, y: 578 });
        expect(g.teleport('cube', cube, 44, 44, [floor], bounds)?.to).toBe('A');
    });
    it('refuses blocked, out-of-room, or insufficient carried-payload exit space', () => {
        const g = pair(), p = createPlayer(128, 583); g.power(true);
        const obstacle = { ...floor, x: 635, y: 490, w: 65, h: 110 };
        expect(g.teleport('player', p, 22, 34, [floor, obstacle], bounds)).toBeNull();
        expect(g.teleport('player', p, 22, 34, [floor], { width: 600, height: 800 })).toBeNull();
        const lintel = { ...obstacle, y: 520, h: 25 };
        expect(g.teleport('player', p, 44, 34, [floor, lintel], bounds, 48)).toBeNull();
        expect(p.x).toBe(128);
    });
    it('player teleport cancels the hook and takes a carried cube along intact', () => {
        const w = new PuzzleWorld(ROOMS[3], { ...freshProgress().rooms.uplink, switchB: true });
        const entry = w.room.gates![0].gates[0];
        Object.assign(w.player, { x: entry.x + entry.w / 2, y: entry.y + entry.h - 17, coyote: .1, jumpBuffer: .1 });
        w.cube!.carried = true;
        w.player.rope.phase = 'retracting';
        w.step(FIXED_DT, emptyInput());
        expect(w.player.x).toBeGreaterThan(1356);
        expect(w.cube!.x).toBe(w.player.x);
        expect(w.cube!.carried).toBe(true); expect(w.cubeTransferred).toBe(true);
        expect(w.player.coyote).toBe(0); expect(w.player.jumpBuffer).toBe(0);
        expect(w.gates[0].cooldown('player')).toBeGreaterThan(0);
        expect(w.events.some(e => e.kind === 'relay-cargo')).toBe(true);
    });
});
