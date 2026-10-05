import { expect } from 'vitest';
import { FIXED_DT } from '../../src/engine/constants.ts';
import { emptyInput, type InputState } from '../../src/engine/physics.ts';
import type { PuzzleWorld } from '../../src/slice/world.ts';

export function tick(w: PuzzleWorld, i: Partial<InputState> = {}, n = 1) {
    for (let f = 0; f < n; f++) w.step(FIXED_DT, { ...emptyInput(), ...i, grapplePressed: !!i.grapplePressed && f === 0, jumpPressed: !!i.jumpPressed && f === 0 });
}
/** Physical controls only, starting from the core deck. No velocity/position overrides. */
export function swingReturn(w: PuzzleWorld, transferFrames = 8, releaseOffset = 135, jumpOff = false) {
    tick(w, { left: true, jumpPressed: true, jumpHeld: true }, 12);
    for (const id of ['upper-route', 'return-mid', 'return-high', 'return-near', 'proven-clone']) {
        const b = w.platforms.find(p => p.def.id === id)!.def;
        const aim = { x: b.x + b.w / 2, y: b.y + 6 };
        expect(w.target(aim)?.solid.id, `target ${id}`).toBe(id);
        tick(w, { left: true, grapplePressed: true, grappleHeld: true, aim });
        let attached = false;
        for (let n = 0; n < 360; n++) {
            tick(w, { left: true, grappleHeld: true, aim });
            attached ||= w.player.rope.anchorId === id;
            if (w.player.x >= w.room.lifts![0].x && w.player.x <= w.room.lifts![0].x + w.room.lifts![0].w)
                expect(w.player.y + 17, `${id}: ${JSON.stringify({ x: w.player.x, y: w.player.y, rope: w.player.rope.phase, anchor: w.player.rope.anchorId, n })}`).toBeLessThan(w.room.lifts![0].y);
            if (attached && w.player.x < aim.x - releaseOffset && w.player.y < aim.y + 290) break;
        }
        expect(attached, id).toBe(true);
        expect(w.player.x, `swing past ${id}`).toBeLessThan(aim.x - releaseOffset);
        if (id === 'proven-clone') expect(w.platforms.find(p => p.def.id === id)!.fuse).toBeGreaterThan(0);
        tick(w, { left: true, jumpPressed: jumpOff, jumpHeld: jumpOff }, transferFrames);
        if (jumpOff) expect(w.player.ropeJumpAnchors).toContain(id);
    }
    for (let n = 0; n < 360 && !w.exited; n++) tick(w, { left: true });
    expect(w.exited).toBe(true); expect(w.deaths).toBe(0);
    expect(w.inputs.cubeOnPlateC).toBe(true);
}
