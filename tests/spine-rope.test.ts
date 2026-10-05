import { expect, it } from 'vitest';
import { swingReturn, tick } from './helpers/spine-controls.ts';
import { roomById } from '../src/slice/rooms.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { freshProgress } from '../src/slice/progress.ts';

const complete = () => new PuzzleWorld(roomById('uplink'), { ...freshProgress().rooms.uplink,
    checkpoint: 'upper', switchB: true, switchC: true, cubeOnPlateC: true, cubeTransferred: true });
it.each([[2840, 6, 100], [2860, 8, 120], [2880, 24, 140]])('chains every anchor from x=%s with varied release timing (%s frames / %s offset)', (x, delay, offset) => {
    const w = complete();
    Object.assign(w.player, { x, y: 603 }); tick(w, {}, 5);
    swingReturn(w, delay, offset);
});
it.each([18, 30, 42])('rope jumps allow a %s-frame transfer pause through the chain and its final fake block', delay => {
    const w = complete();
    Object.assign(w.player, { x: 2860, y: 603 }); tick(w, {}, 5);
    swingReturn(w, delay, 120, true);
});
it('hook load warns, breaks the unstable anchor, cancels its rope, and recovers without losing C', () => {
    const w = complete(), b = w.platforms.find(p => p.def.id === 'proven-clone')!;
    const x = b.def.x + b.def.w / 2, aim = { x, y: b.def.y + 6 };
    Object.assign(w.player, { x, y: 470 });
    tick(w, { grapplePressed: true, grappleHeld: true, aim }, 25);
    expect(w.player.rope.anchorId).toBe(b.def.id); expect(b.fuse).toBeGreaterThan(1);
    const left = b.fuse;
    // Re-hooking does not reset the load warning timer.
    tick(w, {}, 8); tick(w, { grapplePressed: true, grappleHeld: true, aim }, 25);
    expect(b.fuse).toBeLessThan(left);
    tick(w, { grappleHeld: true }, 170);
    expect(b.solid.enabled).toBe(false); expect(b.solid.grappleable).toBe(false);
    expect(w.player.rope.anchorId).toBeNull();
    tick(w, {}, 80);
    expect(w.player.groundId).toBe('return-catch'); expect(w.deaths).toBe(0);
    expect(w.inputs.cubeOnPlateC).toBe(true); expect(w.frame.outputs.exitDoor).toBe(true);
    tick(w, {}, 200); expect(b.solid.enabled).toBe(true);
    tick(w, { jumpHeld: true, jumpPressed: true }, 25);
    expect(w.target(aim)?.solid.id).toBe('proven-clone');
    // The relocated catch is also a forgiving fallback to the exit's 50-unit lip.
    for (let n = 0; n < 240 && w.player.x > 625; n++) tick(w, { left: true });
    tick(w, {}, 120);
    expect(w.player.groundId).toBe('return-catch');
    tick(w, { left: true, jumpHeld: true, jumpPressed: true });
    for (let n = 0; n < 240 && !w.exited; n++) tick(w, { left: true, jumpHeld: true });
    expect(w.exited).toBe(true); expect(w.deaths).toBe(0); expect(w.inputs.cubeOnPlateC).toBe(true);
});
it('final route stays above the lift, and its gaps cannot be replaced by ordinary jumps', () => {
    const w = complete(), lift = w.room.lifts![0];
    const ids = ['upper-route', 'return-mid', 'return-high', 'return-near', 'proven-clone'];
    expect(w.room.platforms.find(p => p.id === 'return-near')!.x).toBe(1180);
    expect(w.room.platforms.find(p => p.id === 'proven-clone')!.x).toBe(700);
    for (const id of ids) {
        const b = w.platforms.find(p => p.def.id === id)!.def;
        expect(b.y + 140).toBeLessThan(lift.y); // Address, retained listing and string all clear.
    }
    expect(w.room.platforms.some(p => p.id === 'recovery-step')).toBe(false);
    for (let k = 0; k < ids.length - 1; k++) {
        const test = complete(), from = test.platforms.find(p => p.def.id === ids[k])!.def;
        Object.assign(test.player, { x: from.x + 5, y: from.y - 17, vx: -380, grounded: true, groundId: from.id });
        tick(test, { left: true, jumpHeld: true, jumpPressed: true });
        let landed = false;
        for (let n = 0; n < 180; n++) { tick(test, { left: true, jumpHeld: true }); landed ||= test.player.groundId === ids[k + 1]; }
        expect(landed, `jump bypass ${ids[k]}`).toBe(false);
    }
});
