import { expect, it } from 'vitest';
import { FIXED_DT, GRAPPLE, PLAYER } from '../src/engine/constants.ts';
import { canJumpFromRope, createPlayer, emptyInput, stepPlayer, type Solid } from '../src/engine/physics.ts';

const anchor = (id = 'anchor'): Solid => ({ id, x: 200, y: 100, w: 200, h: 28,
    oneWay: true, enabled: true, grappleable: true, grapplePoint: { x: 300, y: 106 } });
function attached() {
    const p = createPlayer(300, 360), s = anchor();
    for (let n = 0; n < 30 && p.rope.phase !== 'attached'; n++)
        stepPlayer(p, { ...emptyInput(), grappleHeld: true, grapplePressed: n === 0, aim: s.grapplePoint! }, [s], FIXED_DT);
    expect(p.rope.anchorId).toBe(s.id);
    return { p, s };
}

it.each([false, true])('jump detaches with sideways carry, including simultaneous mouse release (held: %s)', grappleHeld => {
    const { p, s } = attached();
    Object.assign(p, { vx: 620, vy: 250 });
    stepPlayer(p, { ...emptyInput(), grappleHeld, jumpPressed: true, jumpHeld: true }, [s], FIXED_DT);
    expect(p.rope.phase).toBe('retracting'); expect(p.ropeJumpAnchors).toEqual(['anchor']);
    expect(p.vx).toBeGreaterThan(600);
    expect(p.vy).toBeLessThan(-480); expect(p.vy).toBeGreaterThanOrEqual(-GRAPPLE.jumpVelocity);
    expect(Math.hypot(p.vx, p.vy)).toBeLessThanOrEqual(GRAPPLE.maxJumpSpeed);
});

it('the intentional hop has a modest apex; holding jump gives a little more height', () => {
    const rise = (jumpHeld: boolean) => {
        const { p, s } = attached(); const startY = p.y;
        stepPlayer(p, { ...emptyInput(), jumpPressed: true, jumpHeld }, [s], FIXED_DT);
        let highest = p.y;
        for (let n = 0; n < 60; n++) {
            stepPlayer(p, { ...emptyInput(), jumpHeld }, [s], FIXED_DT);
            highest = Math.min(highest, p.y);
        }
        return startY - highest;
    };
    const tap = rise(false), hold = rise(true);
    expect(tap).toBeGreaterThan(30); expect(hold).toBeGreaterThan(tap);
    expect(hold).toBeLessThan(60);
});

it('letting go, or losing an inactive anchor on a jump frame, never adds a hop', () => {
    for (const disable of [false, true]) {
        const { p, s } = attached(); Object.assign(p, { vx: 620, vy: 200 });
        s.enabled = !disable;
        stepPlayer(p, { ...emptyInput(), jumpPressed: disable, grappleHeld: disable }, [s], FIXED_DT);
        expect(p.rope.phase).toBe('retracting'); expect(p.vy).toBeGreaterThan(0);
        expect(p.ropeJumpAnchors).toEqual([]);
    }
});

it('each distinct anchor supplies one hop until a real landing, without additive upward impulses', () => {
    const { p, s } = attached();
    // Isolate repeated attachment events; complete route tests exercise real hook flight.
    for (const [id, available] of [['anchor', true], ['anchor', false], ['next', true], ['anchor', false], ['next', false]] as const) {
        s.id = id;
        Object.assign(p.rope, { phase: 'attached', anchorId: id, length: 300 });
        Object.assign(p, { vx: 800, vy: -300 });
        expect(canJumpFromRope(p)).toBe(available);
        stepPlayer(p, { ...emptyInput(), jumpPressed: true, jumpHeld: true }, [s], FIXED_DT);
        expect(Math.hypot(p.vx, p.vy)).toBeLessThanOrEqual(GRAPPLE.maxJumpSpeed);
        if (available) expect(p.vy).toBeLessThan(-400);
        else expect(p.vy).toBeGreaterThanOrEqual(-GRAPPLE.maxReleaseRiseSpeed);
    }
    expect(p.ropeJumpAnchors).toEqual(['anchor', 'next']);
    const floor: Solid = { ...s, id: 'floor', x: -1000, y: 800, w: 3000, grappleable: false };
    for (let n = 0; n < 180 && !p.grounded; n++) stepPlayer(p, emptyInput(), [floor], FIXED_DT);
    expect(p.groundId).toBe('floor'); expect(p.ropeJumpAnchors).toEqual([]);
    stepPlayer(p, { ...emptyInput(), jumpPressed: true, jumpHeld: true }, [floor], FIXED_DT);
    expect(p.vy).toBeCloseTo(-PLAYER.jumpVelocity + PLAYER.gravity * PLAYER.jumpHoldGravity * FIXED_DT);
    expect(createPlayer(0, 0).ropeJumpAnchors).toEqual([]);
});
