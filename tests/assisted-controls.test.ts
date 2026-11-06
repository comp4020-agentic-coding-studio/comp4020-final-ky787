import { describe, expect, it } from 'vitest';
import { FIXED_DT, GRAPPLE, PLAYER } from '../src/engine/constants.ts';
import { assistedGrappleTarget } from '../src/engine/grapple-targeting.ts';
import { createPlayer, emptyInput, stepPlayer, type Solid } from '../src/engine/physics.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { roomById } from '../src/slice/rooms.ts';
import { freshProgress } from '../src/slice/progress.ts';

const floor: Solid = { id: 'floor', x: -1000, y: 500, w: 3000, h: 100, enabled: true, oneWay: false, grappleable: false };
const held = { ...emptyInput(), jumpHeld: true, airGrappleHeld: true };
function switchWorld() {
  const w = new PuzzleWorld(roomById('switch'), { ...freshProgress().rooms.switch, switchB: true });
  Object.assign(w.player, { x: 415, y: 543 });
  w.step(FIXED_DT, emptyInput());
  return w;
}
function hook() {
  const w = switchWorld();
  w.step(FIXED_DT, { ...held, jumpPressed: true, airGrapplePressed: true });
  w.step(FIXED_DT, { ...emptyInput(), airGrappleReleased: true });
  w.step(FIXED_DT, { ...held, jumpPressed: true, airGrapplePressed: true });
  for (let n = 0; n < 35 && w.player.rope.phase !== 'attached'; n++) w.step(FIXED_DT, held);
  expect(w.player.rope.anchorId).toBe('anchor');
  return w;
}

describe('constant ordinary jump arc', () => {
  it('keeps the original held apex and launch speed for both a tap and hold', () => {
    for (const jumpHeld of [false, true]) {
      const p = createPlayer(0, 483); stepPlayer(p, emptyInput(), [floor], FIXED_DT);
      stepPlayer(p, { ...emptyInput(), jumpPressed: true, jumpHeld }, [floor], FIXED_DT);
      expect(p.vy).toBeCloseTo(-800 + 3400 * .72 * FIXED_DT);
      let top = p.y;
      for (let n = 0; n < 150; n++) { stepPlayer(p, { ...emptyInput(), jumpHeld }, [floor], FIXED_DT); top = Math.min(top, p.y); }
      expect(483 - top).toBeCloseTo(127.4, 5);
      expect(p.grounded).toBe(true); expect(p.groundJumpAscent).toBe(false);
    }
  });
  it('retains coyote and buffered jumps without requiring a held key', () => {
    const p = createPlayer(0, 480); p.coyote = PLAYER.coyoteTime;
    stepPlayer(p, { ...emptyInput(), jumpPressed: true }, [], FIXED_DT);
    expect(p.groundJumpAscent).toBe(true); expect(p.vy).toBeLessThan(-770);
    const landing = createPlayer(0, 481); landing.vy = 200;
    stepPlayer(landing, { ...emptyInput(), jumpPressed: true }, [floor], FIXED_DT);
    for (let n = 0; n < 5; n++) stepPlayer(landing, emptyInput(), [floor], FIXED_DT);
    expect(landing.groundJumpAscent).toBe(true); expect(landing.vy).toBeLessThan(-650);
  });
  it('ends ascent assistance at ceilings and does not apply it to externally rising bodies or lifts', () => {
    const p = createPlayer(0, 483); p.grounded = true;
    const ceiling = { ...floor, id: 'ceiling', y: 400, h: 20 };
    stepPlayer(p, { ...emptyInput(), jumpPressed: true }, [floor, ceiling], FIXED_DT);
    for (let n = 0; n < 15; n++) stepPlayer(p, emptyInput(), [floor, ceiling], FIXED_DT);
    expect(p.groundJumpAscent).toBe(false); expect(p.y).toBeGreaterThanOrEqual(437);
    const external = createPlayer(0, 0); external.vy = -500;
    stepPlayer(external, emptyInput(), [], FIXED_DT);
    expect(external.vy).toBeCloseTo(-500 + PLAYER.gravity * FIXED_DT);
    external.groundJumpAscent = true;
    stepPlayer(external, emptyInput(), [], FIXED_DT, { targetY: -400, acceleration: 1200, maxRise: 500, maxHorizontal: 400, horizontalDrag: 0 });
    expect(external.groundJumpAscent).toBe(false);
    expect(external.vy).toBeCloseTo(-500 + PLAYER.gravity * FIXED_DT + 10);
  });
});

describe('assisted selection', () => {
  const anchor = (id: string, x: number, y: number): Solid => ({ ...floor, id, x: x - 20, y, w: 40, h: 24, grapplePoint: { x, y }, oneWay: true, grappleable: true });
  it('prefers a useful forward anchor over the nearest behind and follows direction intentionally', () => {
    const p = createPlayer(0, 400), back = anchor('back', -90, 320), front = anchor('front', 250, 180);
    expect(assistedGrappleTarget(p, [back, front])?.solid.id).toBe('front');
    p.facing = -1;
    expect(assistedGrappleTarget(p, [back, front], 'front')?.solid.id).toBe('back');
  });
  it('keeps nearby alternatives stable but immediately rejects disabled, unhookable and out-of-range targets', () => {
    const p = createPlayer(0, 400), a = anchor('a', 200, 200), b = anchor('b', 210, 190);
    expect(assistedGrappleTarget(p, [a, b], 'a')?.solid.id).toBe('a');
    a.enabled = false;
    expect(assistedGrappleTarget(p, [a, b], 'a')?.solid.id).toBe('b');
    b.grappleable = false; expect(assistedGrappleTarget(p, [a, b])).toBeNull();
    expect(assistedGrappleTarget(p, [anchor('too-far', 501, 400), anchor('too-near', 0, 390)])).toBeNull();
  });
  it('highlights exactly the keyboard attempt, while explicit mouse aim can select another surface', () => {
    const w = switchWorld();
    expect(w.selectedTarget({ x: 0, y: 0 })?.solid.id).toBe('anchor');
    w.step(FIXED_DT, { ...emptyInput(), manualAim: true, aim: { x: 200, y: 543 } });
    expect(w.selectedTarget({ x: 200, y: 543 })).toBeNull();
    w.step(FIXED_DT, emptyInput());
    const target = w.selectedTarget({ x: 0, y: 0 });
    expect(target?.solid.id).toBe('anchor');
    const attached = hook(); expect(attached.player.rope.anchor).toEqual(target!.point);
    expect(attached.pullingCube).toBe(false);
  });
});

describe('keyboard rope release ownership', () => {
  it('release uses exactly the existing unheld deliberate rope-jump impulse and steering order', () => {
    const w = hook(), released = structuredClone(w.player), pressed = structuredClone(w.player);
    stepPlayer(released, { ...emptyInput(), right: true, ropeJumpReleased: true }, w.solids, FIXED_DT);
    stepPlayer(pressed, { ...emptyInput(), right: true, jumpPressed: true }, w.solids, FIXED_DT);
    expect(released).toEqual(pressed);
  });
  it('performs one bounded rope jump on keyup and cannot repeat it', () => {
    const w = hook();
    w.step(FIXED_DT, { ...emptyInput(), airGrappleReleased: true, right: true });
    expect(w.keyboardGrapple).toBe(false); expect(w.player.rope.phase).toBe('retracting');
    expect(w.player.ropeJumpAnchors).toEqual(['anchor']);
    expect(w.player.vy).toBeCloseTo(-GRAPPLE.jumpVelocity + PLAYER.gravity * FIXED_DT);
    const vy = w.player.vy;
    w.step(FIXED_DT, { ...emptyInput(), airGrappleReleased: true });
    expect(w.player.vy).toBeGreaterThan(vy); expect(w.player.jumpBuffer).toBe(0);
  });
  it.each(['down', 'released-down', 'spent', 'grounded', 'unpowered', 'cancelled', 'respawn', 'lost-input'] as const)('%s cannot grant a release jump', reason => {
    const w = hook(); const p = w.player;
    if (reason === 'spent') p.ropeJumpAnchors.push('anchor');
    if (reason === 'grounded') p.grounded = true;
    if (reason === 'unpowered') w.inputs.switchB = false;
    if (reason === 'cancelled') w.cancelGrapple();
    if (reason === 'respawn') w.respawn();
    w.player.vy = 150;
    w.step(FIXED_DT, { ...emptyInput(), airGrappleReleased: reason !== 'lost-input', down: reason === 'down', airGrappleReleaseDown: reason === 'released-down' });
    expect(w.player.vy).toBeGreaterThanOrEqual(0);
    expect(w.player.ropeJumpAnchors).toEqual(reason === 'spent' ? ['anchor'] : []);
    expect(w.keyboardGrapple).toBe(false); expect(w.player.jumpBuffer).toBe(0);
  });
  it('a tap shorter than hook flight cancels without attachment, and a failed hook never learns or jumps', () => {
    const w = switchWorld(); Object.assign(w.player, { grounded: false, coyote: 0, y: 440, vy: 100 });
    w.step(FIXED_DT, { ...held, airGrapplePressed: true, jumpPressed: true });
    expect(w.player.rope.phase).toBe('firing');
    w.step(FIXED_DT, { ...emptyInput(), airGrappleReleased: true });
    expect(w.player.rope.phase).toBe('retracting'); expect(w.player.vy).toBeGreaterThan(0);
    expect(w.events.some(e => e.kind === 'grapple')).toBe(false);
    expect(w.player.ropeJumpAnchors).toEqual([]);
  });
  it('Space release never jumps a mouse-owned rope; its optional keyboard press still does', () => {
    const w = hook();
    w.step(FIXED_DT, { ...held, grappleHeld: true, grapplePressed: true, aim: { x: 770, y: 226 } });
    expect(w.keyboardGrapple).toBe(false);
    w.step(FIXED_DT, { ...emptyInput(), grappleHeld: true, airGrappleReleased: true });
    expect(w.player.rope.phase).toBe('attached'); expect(w.player.ropeJumpAnchors).toEqual([]);
    w.step(FIXED_DT, { ...held, grappleHeld: true, jumpPressed: true, airGrapplePressed: true });
    expect(w.player.rope.phase).toBe('retracting'); expect(w.player.ropeJumpAnchors).toEqual(['anchor']);
  });
});
