import { describe, expect, it } from 'vitest';
import { FIXED_DT } from '../src/engine/constants.ts';
import { emptyInput, type InputState } from '../src/engine/physics.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { ROOMS } from '../src/slice/rooms.ts';
import { freshProgress, validProgress } from '../src/slice/progress.ts';
const fresh = () => new PuzzleWorld(ROOMS[3], freshProgress().rooms.uplink);
function tick(w: PuzzleWorld, n = 1, input: Partial<InputState> = {}) {
    const i = { ...emptyInput(), ...input };
    for (let f = 0; f < n; f++) { w.step(FIXED_DT, i); i.jumpPressed = false; i.grapplePressed = false; }
}
function until(w: PuzzleWorld, label: string, done: () => boolean, input: () => Partial<InputState> = () => ({}), max = 1500) {
    for (let n = 0; n < max && !done(); n++) tick(w, 1, input());
    expect(done(), `${label}: ${JSON.stringify({ p: w.player, c: w.cube, i: w.inputs })}`).toBe(true);
}
function steer(w: PuzzleWorld, x: number): Partial<InputState> {
    const desired = Math.max(-380, Math.min(380, (x - w.player.x) * 6));
    return { right: desired - w.player.vx > 20, left: desired - w.player.vx < -20 };
}
function move(w: PuzzleWorld, x: number, ground?: string) {
    until(w, `move ${x}`, () => Math.abs(w.player.x - x) < 8 && Math.abs(w.player.vx) < 30 && (!ground || w.player.groundId === ground), () => steer(w, x));
}
function ride(w: PuzzleWorld) {
    move(w, 1740);
    until(w, 'rise to landing', () => w.player.y < 190, () => steer(w, 1740));
    move(w, 1980, 'upper-deck');
}
function jump(w: PuzzleWorld, x: number, ground: string) {
    tick(w, 1, { ...steer(w, x), jumpPressed: true, jumpHeld: true });
    until(w, `jump ${ground}`, () => w.player.groundId === ground, () => ({ ...steer(w, x), jumpHeld: true }));
    move(w, x, ground);
}

describe('UPLINK', () => {
    it('solves the retrieval loop with physical controls and restores both checkpoints', () => {
        let w = fresh(); tick(w, 10);
        move(w, 345); w.interact(); expect(w.cube!.carried).toBe(true);
        move(w, 363); tick(w, 1, { left: true }); w.interact(); tick(w, 25);
        expect(w.inputs.cubeOnPlate).toBe(true);
        move(w, 440);
        tick(w, 1, { right: true, grapplePressed: true, grappleHeld: true, aim: { x: 780, y: 526 } });
        until(w, 'grapple release', () => w.player.x > 880 && w.player.y < 810,
            () => ({ right: true, grappleHeld: true }));
        until(w, 'far bank', () => w.player.groundId === 'far', () => ({ right: true }));
        expect(w.deaths).toBe(0);
        move(w, 1120); w.interact(); expect(w.frame.outputs.relayGates).toBe(true);
        expect(w.checkpoint).toBe('relay');
        w = new PuzzleWorld(ROOMS[3], w.memory()); tick(w, 5);
        expect(w.player.x).toBe(1130); expect(w.inputs.cubeOnPlate).toBe(true);
        until(w, 'gate B to A', () => w.player.x < 480, () => ({ right: true })); tick(w, 25);
        move(w, 275); w.interact(); expect(w.cube!.carried).toBe(true);
        until(w, 'carry A to B', () => w.player.x > 1300, () => ({ left: true })); tick(w, 25);
        expect(w.cubeTransferred).toBe(true); expect(w.inputs.plateA).toBe(false);
        move(w, 1467); tick(w, 1, { right: true }); w.interact(); tick(w, 25);
        expect(w.inputs.cubeOnPlateB).toBe(true); expect(w.frame.outputs.liftField).toBe(true);
        jump(w, 1580, 'far');
        ride(w); w.interact(); expect(w.inputs.switchC).toBe(true);
        expect(w.frame.outputs.codePlatformA).toBe(true); expect(w.frame.outputs.codePlatformB).toBe(false);
        expect(w.frame.outputs.exitDoor).toBe(false); expect(w.checkpoint).toBe('upper');
        w = new PuzzleWorld(ROOMS[3], w.memory()); tick(w, 5);
        expect(w.inputs.switchC).toBe(true); expect(w.inputs.cubeOnPlateB).toBe(true);
        move(w, 2180); until(w, 'safe drop', () => w.player.groundId === 'far');
        move(w, 1555, 'far'); w.interact(); expect(w.cube!.carried).toBe(true);
        tick(w, 3); expect(w.inputs.plateB).toBe(false); expect(w.frame.outputs.liftField).toBe(true);
        ride(w); move(w, 2070); jump(w, 2275, 'node-deck');
        tick(w, 1, { right: true }); w.interact(); tick(w, 25);
        expect(w.inputs.cubeOnPlateC).toBe(true); expect(w.frame.outputs.codePlatformB).toBe(true);
        expect(w.exited).toBe(false);
        const p = freshProgress(); p.currentRoom = 'uplink'; p.rooms.uplink = w.memory();
        expect(validProgress(p)).toBe(true);
        const restored = new PuzzleWorld(ROOMS[3], w.memory());
        expect(restored.cube!.x).toBe(2320); expect(restored.frame.outputs.exitDoor).toBe(true);
        move(w, 2250); jump(w, 2080, 'upper-deck');
        until(w, 'exit on upper return route', () => w.exited, () => ({ left: true }));
        expect(w.deaths).toBe(0);
    });
    it('cannot jump the gap, hook an inactive anchor, or pull the near-side payload from the far bank', () => {
        for (const x of [430, 455, 479]) {
            const w = fresh(); Object.assign(w.player, { x, y: 843 }); tick(w, 3);
            expect(w.target({ x: 780, y: 526 })).toBeNull();
            tick(w, 1, { right: true, jumpHeld: true, jumpPressed: true });
            until(w, 'gap death', () => w.deaths === 1, () => ({ right: true, jumpHeld: true }));
            expect(w.checkpoint).toBe('entry');
        }
        const w = new PuzzleWorld(ROOMS[3], { ...freshProgress().rooms.uplink, cubeOnPlate: true });
        Object.assign(w.player, { x: 972, y: 843 }); tick(w, 3);
        tick(w, 90, { grapplePressed: true, grappleHeld: true, aim: { x: 320, y: 838 } });
        expect(w.pullingCube).toBe(false); expect(w.cube!.x).toBe(320);
    });
    it('cube and run-jump height cannot reach the upper deck; only payload C opens the final route', () => {
        const w = fresh(); Object.assign(w.player, { x: 1950, y: 843 });
        Object.assign(w.cube!, { x: 1950, y: 838 }); tick(w, 5);
        Object.assign(w.player, { x: 1950, y: 780 }); tick(w, 30);
        expect(w.player.groundId).toBe('cube-body');
        tick(w, 1, { jumpPressed: true, jumpHeld: true });
        let highest = w.player.y;
        for (let n = 0; n < 100; n++) { tick(w, 1, { jumpHeld: true }); highest = Math.min(highest, w.player.y); }
        expect(highest).toBeGreaterThan(600);
        expect(w.inputs.switchC).toBe(false); expect(w.frame.outputs.liftField).toBe(false);
        Object.assign(w.player, { x: 2320, y: 243 }); w.inputs.switchC = true; tick(w, 10);
        expect(w.inputs.plateC).toBe(true); expect(w.inputs.cubeOnPlateC).toBe(false);
        expect(w.frame.outputs.exitDoor).toBe(false); expect(w.frame.outputs.codePlatformB).toBe(false);
    });
    it('the initial grapple cannot reach the upper control through swinging or repeated re-hooks', () => {
        for (const rehook of [false, true]) {
            const w = new PuzzleWorld(ROOMS[3], { ...freshProgress().rooms.uplink, cubeOnPlate: true });
            Object.assign(w.player, { x: 440, y: 843 }); tick(w, 3);
            let highest = w.player.y, attached = 0;
            for (let n = 0; n < 1800; n++) {
                const fire = n === 0 || (rehook && n % 60 === 0);
                tick(w, 1, { right: Math.floor(n / 90) % 2 === 0, left: Math.floor(n / 90) % 2 === 1,
                    grapplePressed: fire, grappleHeld: !rehook || n % 60 < 50, reelIn: true, aim: { x: 780, y: 526 } });
                highest = Math.min(highest, w.player.y);
                if (w.player.rope.phase === 'attached') attached++;
            }
            expect(attached).toBeGreaterThan(30);
            expect(highest).toBeGreaterThan(300);
            expect(w.inputs.switchC).toBe(false); expect(w.frame.outputs.exitDoor).toBe(false);
        }
    });
    it('lifting the cube off its power plate stops the field before it can carry a payload upstairs', () => {
        const w = new PuzzleWorld(ROOMS[3], { ...freshProgress().rooms.uplink, cubeOnPlateB: true, cubeTransferred: true, switchB: true });
        Object.assign(w.player, { x: 1555, y: 843 }); tick(w, 5);
        expect(w.frame.outputs.liftField).toBe(true); w.interact(); tick(w, 2);
        expect(w.cube!.carried).toBe(true); move(w, 1580);
        expect(w.frame.outputs.liftField).toBe(false);
        move(w, 1740); tick(w, 240);
        expect(w.player.groundId).toBe('far'); expect(w.inputs.switchC).toBe(false);
    });
    it('power toggling and recovery keep latched progress and transferred cargo', () => {
        const w = new PuzzleWorld(ROOMS[3], { ...freshProgress().rooms.uplink, switchB: true, switchC: true, checkpoint: 'upper', cubeTransferred: true });
        Object.assign(w.player, { x: 1140, y: 843 }); tick(w, 3); w.interact();
        expect(w.frame.outputs.relayGates).toBe(false); expect(w.frame.outputs.liftField).toBe(true);
        w.cube!.carried = true; w.respawn(); tick(w, 3);
        expect(w.player.x).toBe(1980); expect(w.inputs.switchC).toBe(true);
        expect(w.cube!.x).toBe(1400); expect(w.cube!.carried).toBe(false);
        w.interact(); expect(w.inputs.switchC).toBe(true);
        const restored = new PuzzleWorld(ROOMS[3], w.memory());
        expect(restored.player.x).toBe(1980); expect(restored.cube!.x).toBe(1400);
    });
});
