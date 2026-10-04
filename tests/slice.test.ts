import { describe, expect, it } from 'vitest';
import { FIXED_DT, GRAPPLE, PLAYER } from '../src/engine/constants.ts';
import { emptyInput, type InputState } from '../src/engine/physics.ts';
import { ROOMS } from '../src/slice/rooms.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { CUBE_SIZE } from '../src/slice/tuning.ts';
import { freshProgress } from '../src/slice/progress.ts';
import { mockController, ROOM_IDS } from '../src/slice/controller.ts';
function world(index: number) { return new PuzzleWorld(ROOMS[index], freshProgress().rooms[ROOMS[index].id]); }
function step(w: PuzzleWorld, seconds: number, input: Partial<InputState> = {}) {
    const i = { ...emptyInput(), ...input };
    for (let n = 0; n < seconds / FIXED_DT; n++) {
        w.step(FIXED_DT, i);
        i.jumpPressed = false;
        i.airGrapplePressed = false;
        i.grapplePressed = false;
    }
}
function move(w: PuzzleWorld, x: number) {
    const right = x > w.player.x;
    for (let n = 0; n < 1500 && (right ? w.player.x < x : w.player.x > x); n++)
        w.step(FIXED_DT, { ...emptyInput(), right, left: !right });
    step(w, .15);
}
function hookAcross(w: PuzzleWorld) {
    const anchor = w.platforms.find(p => p.def.anchor)!.def;
    const i = { ...emptyInput(), right: true, grapplePressed: true, grappleHeld: true, aim: { x: anchor.x + anchor.w / 2, y: anchor.y + 6 } };
    let attached = false;
    for (let n = 0; n < 108; n++) {
        w.step(FIXED_DT, i);
        i.grapplePressed = false;
        attached ||= w.player.rope.phase === 'attached';
        if (w.deaths)
            break;
    }
    step(w, .4, { right: true });
    expect(attached).toBe(true);
    expect(w.deaths).toBe(0);
    expect(w.player.x).toBeGreaterThan(920);
}
describe('C8 physical vocabulary', () => {
    it('exhaustively maps all mock boolean inputs without geometry or binary claims', () => {
        for (const room of ROOM_IDS)
            for (let bits = 0; bits < 32; bits++) {
                const inputs = { plateA: !!(bits & 1), cubeOnPlate: !!(bits & 2), switchB: !!(bits & 4), plateB: !!(bits & 8), cubeOnPlateB: !!(bits & 16) };
                const f = mockController.evaluate(room, inputs);
                expect(f.source).toBe('mock-greybox');
                expect(f.outputs.exitDoor).toBe(room === 'pressure' ? inputs.plateA : room === 'relay' ? inputs.switchB && inputs.plateB : inputs.switchB);
                expect(f.outputs.grappleAnchor).toBe(room === 'pressure' ? false : room === 'switch' ? inputs.switchB : inputs.plateA);
                expect(f.outputs.bridge).toBe(room === 'relay' && inputs.switchB);
            }
    });
    it('plate accepts player or resting cube, releases, and carried cubes do not activate it', () => {
        const w = world(0);
        step(w, .1);
        Object.assign(w.player, { x: 590, y: 543 });
        move(w, 610);
        expect(w.inputs.plateA).toBe(true);
        move(w, 700);
        expect(w.inputs.plateA).toBe(false);
        Object.assign(w.cube!, { x: 610, y: 560 - CUBE_SIZE / 2 });
        step(w, .1);
        expect(w.inputs.cubeOnPlate).toBe(true);
        expect(w.frame.outputs.exitDoor).toBe(true);
        Object.assign(w.player, { x: 610, y: 543 });
        w.interact();
        step(w, .1);
        move(w, 700);
        expect(w.cube!.carried).toBe(true);
        expect(w.inputs.plateA).toBe(false);
    });
    it('pressure solves with actual movement and carry/drop', () => {
        const w = world(0);
        step(w, .1);
        move(w, 260);
        w.interact();
        expect(w.cube!.carried).toBe(true);
        move(w, 565);
        w.interact();
        step(w, .2);
        expect(w.inputs.cubeOnPlate).toBe(true);
        step(w, .55, { right: true, jumpPressed: true, jumpHeld: true });
        move(w, 1170);
        expect(w.exited).toBe(true);
    });
    it('inactive code is intangible and cannot catch a hook; lever feedback is immediate', () => {
        const w = world(1), a = w.platforms.find(p => p.def.anchor)!;
        Object.assign(w.player, { x: 430, y: 543 });
        step(w, .1);
        expect(w.target({ x: 770, y: 226 })).toBe(null);
        expect(w.target({ x: 100, y: 560 })).toBe(null);
        Object.assign(w.player, { x: 300, y: 543 });
        w.interact();
        expect(a.solid.enabled).toBe(true);
        expect(a.solid.grappleable).toBe(true);
        Object.assign(w.player, { x: 430, y: 543 });
        expect(w.target({ x: 770, y: 226 })).not.toBe(null);
        Object.assign(w.player, { x: 300, y: 543 });
        w.interact();
        expect(a.solid.enabled).toBe(false);
    });
    it('switch gap cannot be jumped but enabled anchor gives a forgiving crossing', () => {
        const jump = world(1);
        Object.assign(jump.player, { x: 430, y: 543, vx: 380 });
        step(jump, .05);
        step(jump, 2, { right: true, jumpPressed: true, jumpHeld: true });
        expect(jump.deaths).toBeGreaterThan(0);
        const w = world(1);
        step(w, .1);
        move(w, 290);
        w.interact();
        move(w, 420);
        hookAcross(w);
    });
    it('relay preserves cube and switch across death and logical reload', () => {
        const w = world(2);
        step(w, .1);
        move(w, 210);
        w.interact();
        move(w, 330);
        w.interact();
        step(w, .2);
        expect(w.inputs.cubeOnPlate).toBe(true);
        step(w, .23, { right: true, jumpPressed: true, jumpHeld: true });
        move(w, 435);
        hookAcross(w);
        move(w, 1070);
        w.interact();
        expect(w.frame.outputs.bridge).toBe(true);
        expect(w.checkpoint).toBe('relay');
        w.respawn();
        expect(w.inputs.switchB).toBe(true);
        expect(w.player.x).toBe(1050);
        const restored = new PuzzleWorld(ROOMS[2], w.memory());
        expect(restored.frame.outputs.bridge).toBe(true);
        expect(restored.inputs.cubeOnPlate).toBe(true);
        expect(restored.player.x).toBe(1050);
    });
    it('turning off a controller output releases an attached hook', () => {
        const w = world(1);
        w.inputs.switchB = true;
        Object.assign(w.player, { x: 430, y: 543 });
        step(w, .2, { right: true, grapplePressed: true, grappleHeld: true, aim: { x: 770, y: 226 } });
        expect(w.player.rope.phase).toBe('attached');
        w.inputs.switchB = false;
        step(w, .02, { grappleHeld: true });
        expect(w.player.rope.phase).not.toBe('attached');
        expect(w.platforms.find(p => p.def.anchor)!.solid.enabled).toBe(false);
    });
    it('cube hook pulls toward player and never makes a swing anchor', () => {
        const w = world(2);
        Object.assign(w.player, { x: 420, y: 543 });
        step(w, .1);
        const distance = Math.abs(w.player.x - w.cube!.x);
        step(w, .35, { grapplePressed: true, grappleHeld: true, aim: { x: 260, y: 542 } });
        expect(Math.abs(w.player.x - w.cube!.x)).toBeLessThan(distance - 40);
        expect(w.player.rope.phase).not.toBe('attached');
        expect(w.pullingCube).toBe(true);
    });
    it('crumble warns, collapses, recovers onto safe architecture and respawns', () => {
        const w = world(2);
        Object.assign(w.player, { x: 1410, y: 480, vy: 0 });
        step(w, .25);
        const crumble = w.platforms.find(p => p.def.id === 'crumble')!;
        expect(crumble.fuse).toBeGreaterThan(0);
        step(w, .65);
        expect(crumble.solid.enabled).toBe(false);
        step(w, .45);
        expect(w.player.groundId).toBe('recovery');
        expect(w.deaths).toBe(0);
        step(w, 2.1);
        expect(crumble.solid.enabled).toBe(true);
    });
    it('long alternating swing input stays capped and release adds no jump kick', () => {
        const w = world(1);
        w.inputs.switchB = true;
        Object.assign(w.player, { x: 430, y: 500 });
        const i = { ...emptyInput(), grapplePressed: true, grappleHeld: true, aim: { x: 770, y: 226 } };
        let attached = 0;
        for (let n = 0; n < 3600; n++) {
            i.right = Math.floor(n / 90) % 2 === 0;
            i.left = !i.right;
            w.step(FIXED_DT, i);
            i.grapplePressed = false;
            if (w.player.rope.phase === 'attached') {
                attached++;
                expect(Math.hypot(w.player.vx, w.player.vy)).toBeLessThanOrEqual(GRAPPLE.maxSwingSpeed + .001);
            }
        }
        expect(attached).toBeGreaterThan(1000);
        w.step(FIXED_DT, { ...emptyInput(), jumpPressed: true });
        expect(Math.hypot(w.player.vx, w.player.vy)).toBeLessThan(600);
    });
});

describe('C8 playtest revisions', () => {
    it('ground Space jumps, airborne Space catches the hinted ring, another press releases', () => {
        const w = world(1);
        w.inputs.switchB = true;
        Object.assign(w.player, { x: 430, y: 543 });
        step(w, .02);
        const aim = { x: 770, y: 226 };
        step(w, .08, { jumpPressed: true, airGrapplePressed: true, jumpHeld: true, aim });
        expect(w.player.grounded).toBe(false);
        expect(w.player.rope.phase).toBe('idle');
        expect(w.target(aim)).not.toBeNull();
        step(w, .25, { jumpPressed: true, airGrapplePressed: true, aim });
        expect(w.player.rope.phase).toBe('attached');
        expect(w.keyboardGrapple).toBe(true);
        // A tap holds the hook without holding Space or mouse.
        step(w, .1, { aim });
        expect(w.player.rope.phase).toBe('attached');
        step(w, FIXED_DT, { jumpPressed: true, airGrapplePressed: true, aim });
        expect(w.player.rope.phase).not.toBe('attached');
        expect(w.keyboardGrapple).toBe(false);
        expect(Math.hypot(w.player.vx, w.player.vy)).toBeLessThanOrEqual(GRAPPLE.maxReleaseSpeed + PLAYER.gravity * PLAYER.fallGravity * FIXED_DT);
    });
    it('airborne Space cannot hook inactive cards or unmarked architecture', () => {
        for (const aim of [{ x: 770, y: 226 }, { x: 100, y: 560 }]) {
            const w = world(1);
            Object.assign(w.player, { x: 430, y: 440 });
            expect(w.target(aim)).toBeNull();
            step(w, .15, { jumpPressed: true, airGrapplePressed: true, aim });
            expect(w.keyboardGrapple).toBe(false);
            expect(w.player.rope.phase).toBe('idle');
        }
    });
    it('the larger cube supports a jump landing and stops supporting while carried', () => {
        const w = world(0);
        step(w, .02);
        expect(CUBE_SIZE).toBe(44);
        Object.assign(w.player, { x: w.cube!.x, y: 400, vy: 0 });
        step(w, .4);
        expect(w.player.groundId).toBe('cube-body');
        expect(w.player.y + 17).toBeCloseTo(w.cube!.y - CUBE_SIZE / 2);
        const y = w.player.y;
        step(w, .1, { jumpPressed: true, jumpHeld: true });
        expect(w.player.y).toBeLessThan(y - 40);
        step(w, .65);
        expect(w.player.groundId).toBe('cube-body');
        w.interact();
        step(w, .35);
        expect(w.cube!.carried).toBe(true);
        expect(w.player.groundId).toBe('floor');
    });
    it('the player cannot lift their own cube platform by grappling it', () => {
        const w = world(2);
        Object.assign(w.player, { x: w.cube!.x, y: 400 });
        step(w, .4);
        expect(w.player.groundId).toBe('cube-body');
        step(w, .4, { grapplePressed: true, grappleHeld: true, aim: { x: w.cube!.x, y: w.cube!.y } });
        expect(w.pullingCube).toBe(false);
        expect(w.cube!.y + CUBE_SIZE / 2).toBeCloseTo(560);
    });
    it('RELAY requires the cube transfer and preserves locked bridge plus Plate B on reload', () => {
        const w = world(2);
        const a = w.room.plate!, b = w.room.plateB!;
        Object.assign(w.cube!, { x: a.x, y: a.y - CUBE_SIZE / 2 });
        Object.assign(w.player, { x: 1050, y: 543 });
        step(w, .05);
        w.interact();
        expect(w.frame.outputs.bridge).toBe(true);
        expect(w.frame.outputs.exitDoor).toBe(false);
        w.interact(); // The relay lever cannot undo the permanent bridge.
        expect(w.inputs.switchB).toBe(true);
        Object.assign(w.player, { x: a.x - 40, y: 543 });
        w.interact();
        step(w, .02);
        Object.assign(w.player, { x: 1050, y: 543 });
        step(w, .02);
        expect(w.inputs.plateA).toBe(false);
        expect(w.frame.outputs.grappleAnchor).toBe(false);
        expect(w.frame.outputs.bridge).toBe(true);
        expect(w.frame.outputs.exitDoor).toBe(false);
        // Drop at B using the same carried-body interaction as a player.
        Object.assign(w.player, { x: b.x - 43, y: b.y - 17, facing: 1 });
        w.interact();
        step(w, .05);
        Object.assign(w.player, { x: 1490, y: 393 });
        step(w, .03);
        expect(w.inputs.cubeOnPlateB).toBe(true);
        expect(w.inputs.cubeOnPlate).toBe(false);
        expect(w.frame.outputs.exitDoor).toBe(true);
        const restored = new PuzzleWorld(ROOMS[2], w.memory());
        expect(restored.inputs.cubeOnPlateB).toBe(true);
        expect(restored.frame.outputs.exitDoor).toBe(true);
        expect(restored.frame.outputs.bridge).toBe(true);
        expect(restored.cube!.x).toBe(b.x);
        // As with A, B is momentary rather than a secretly latched door.
        Object.assign(restored.player, { x: b.x - 40, y: b.y - 17 });
        restored.interact();
        Object.assign(restored.player, { x: 1050, y: 543 });
        step(restored, .05);
        expect(restored.frame.outputs.exitDoor).toBe(false);
    });
});
