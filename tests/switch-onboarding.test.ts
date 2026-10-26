import { describe, expect, it } from 'vitest';
import { FIXED_DT } from '../src/engine/constants.ts';
import { emptyInput } from '../src/engine/physics.ts';
import { freshProgress } from '../src/slice/progress.ts';
import { roomById } from '../src/slice/rooms.ts';
import { SwitchOnboarding } from '../src/slice/switch-onboarding.ts';
import { PuzzleWorld } from '../src/slice/world.ts';

const aim = { x: 770, y: 226 };
function fixture(powered = true) {
    const w = new PuzzleWorld(roomById('switch'), { ...freshProgress().rooms.switch, switchB: powered });
    Object.assign(w.player, { x: 415, y: 543 });
    w.step(FIXED_DT, emptyInput());
    const cue = new SwitchOnboarding(); cue.reset(w.room.id);
    const observe = (cursor = aim, dt = FIXED_DT, running = true, motion = true) => cue.update(w, w.target(cursor), dt, running, motion);
    return { w, cue, observe };
}

describe('SWITCH grapple onboarding', () => {
    it('waits for the powered anchor and distinguishes genuine targeting from mouse movement', () => {
        const { w, cue, observe } = fixture(false);
        observe(); expect(cue.stage).toBe('hidden');
        w.player.x = 300; w.interact();
        observe({ x: 300, y: 400 }); expect(cue.stage).toBe('aim');
        // Cursor on the anchor is insufficient outside the existing grapple range.
        w.player.x = 130; observe(); expect(cue.stage).toBe('aim');
        w.player.x = 415;
        expect(w.target(aim)?.solid.id).toBe('anchor');
        observe(); expect(cue.stage).toBe('targeted');
        observe({ x: 300, y: 400 }); expect(cue.stage).toBe('aim');
        expect(cue.snapshot().learned).toBe(false);
        w.player.x = 300; w.interact(); observe(); expect(cue.stage).toBe('hidden');
    });

    it('confirms only a real rope attachment after jump then air-grapple, and retires once', () => {
        const { w, cue, observe } = fixture();
        observe(); expect(cue.stage).toBe('targeted');
        w.step(FIXED_DT, { ...emptyInput(), jumpPressed: true, airGrapplePressed: true, aim });
        observe(); expect(w.player.grounded).toBe(false); expect(cue.snapshot().learned).toBe(false);
        w.step(FIXED_DT, { ...emptyInput(), airGrapplePressed: true, aim });
        observe(); expect(w.player.rope.phase).toBe('firing'); expect(cue.snapshot().learned).toBe(false);
        for (let i = 0; i < 90 && w.player.rope.phase !== 'attached'; i++) {
            w.step(FIXED_DT, { ...emptyInput(), aim }); observe();
        }
        expect(w.player.rope.phase).toBe('attached');
        expect(cue.snapshot()).toMatchObject({ stage: 'attached', learned: true });
        const confirmed = cue.snapshot().confirmation;
        observe(aim, 30, false); expect(cue.snapshot().confirmation).toBe(confirmed);
        w.cancelGrapple(); observe(aim, 1); expect(cue.stage).toBe('attached');
        observe(aim, 2); expect(cue.stage).toBe('complete');
        w.respawn(); observe(); expect(cue.stage).toBe('complete');
    });

    it('reuses saved grapple knowledge and never spreads the tutorial to other rooms', () => {
        const { w, cue, observe } = fixture();
        cue.reset('switch', ['carry', 'grapple']); observe();
        expect(cue.snapshot()).toEqual({ stage: 'complete', learned: true, confirmation: 0 });
        for (const id of ['pressure', 'relay', 'uplink'] as const) {
            cue.reset(id);
            const other = new PuzzleWorld(roomById(id), freshProgress().rooms[id]);
            cue.update(other, other.target(aim), 1, true, true);
            expect(cue.stage).toBe('hidden');
        }
        cue.reset(w.room.id, ['switch']); observe(); expect(cue.stage).toBe('targeted');
    });

    it('freezes presentation while paused and gives reduced motion a stable readable highlight', () => {
        const { cue, observe } = fixture();
        observe({ x: 0, y: 0 }); expect(cue.stage).toBe('aim');
        const pulse = cue.pulse(true);
        observe(aim, 10, false); expect(cue.stage).toBe('aim'); expect(cue.pulse(true)).toBe(pulse);
        observe(aim, 10, true, false); expect(cue.stage).toBe('targeted'); expect(cue.pulse(true)).toBe(pulse);
        expect(cue.pulse(false)).toBe(.5);
    });
});
