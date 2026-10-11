/**
 * Player movement, collision and the controlled puzzle rope.
 *
 * Adapted from the previous Binary Ninja game (crit 5, `src/engine/physics.ts`).
 * Kept as they were: the acceleration/friction model, variable-height jump,
 * coyote time, jump buffering, one-way landing and drop-through, the speed
 * caps and grapple/rope structure. C8 bounds reel/swing energy and marks targets.
 * Added: full solid boxes
 * (walls, floors, ceilings) resolved one axis at a time, because a
 * hand-authored room has walls where the old floating code blocks did not,
 * and a small `stepBody` for carried objects.
 *
 * Everything here is pure with respect to the DOM, on a fixed timestep, so the
 * room tests drive the same physics the browser does.
 */

import { GRAPPLE, PLAYER } from "./constants.ts";
import type { Box, Vec2 } from "./geometry.ts";
import { raycastBoxes } from "./geometry.ts";

export interface Solid extends Box {
  id: string;
  /** Landable from above only; jump up through it, drop through with Down. */
  oneWay: boolean;
  /** Disabled solids stay in the list but stop colliding (e.g. a retracted bridge). */
  enabled: boolean;
  /** Excluded from grapple targeting when false. */
  grappleable: boolean;
  /** Centred grapple target width when it differs from the collision box. */
  grappleWidth?: number;
  /** Optional visible slab height, independent of decorative listings. */
  grappleHeight?: number;
  /** Explicit marked point, when this object exposes a puzzle anchor. */
  grapplePoint?: Vec2;
}

export type RopePhase = "idle" | "firing" | "attached" | "retracting";

export interface RopeState {
  phase: RopePhase;
  anchorId: string | null;
  anchor: Vec2;
  /** Animated hook position while firing or retracting. */
  tip: Vec2;
  /** Unit direction the hook was fired along. */
  dir: Vec2;
  /** Where the hook was fired from; the hook flies a straight world ray. */
  origin: Vec2;
  /** How far along that ray the hook has flown. */
  travelled: number;
  length: number;
  taut: boolean;
  /** Units the rope shortened this step; converted into inward momentum. */
  shrink: number;
}

export interface PlayerState {
  /** Centre of the player's AABB. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  groundId: string | null;
  facing: 1 | -1;
  coyote: number;
  jumpBuffer: number;
  dropThrough: number;
  /** Ground solid ignored while dropping through it. */
  dropIgnore: string | null;
  rope: RopeState;
  /** Set for one step when the player lands, so callers can trigger effects. */
  justLanded: boolean;
  /** Downward speed at the last landing, for landing effects. */
  landingSpeed: number;
  airTime: number;
  /** Transient jump budget. Re-hooking a used anchor cannot manufacture lift. */
  ropeJumpAnchors: string[];
}

export interface InputState {
  left: boolean;
  right: boolean;
  down: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
  /** Space-only edge: the C8 world may consume it for a hinted airborne hook. */
  airGrapplePressed?: boolean;
  grappleHeld: boolean;
  grapplePressed: boolean;
  reelIn: boolean;
  reelOut: boolean;
  /** Pointer position in world units. */
  aim: Vec2;
}

export function emptyInput(): InputState {
  return {
    left: false,
    right: false,
    down: false,
    jumpHeld: false,
    jumpPressed: false,
    grappleHeld: false,
    grapplePressed: false,
    reelIn: false,
    reelOut: false,
    aim: { x: 0, y: 0 },
  };
}

export function createPlayer(x: number, y: number): PlayerState {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    grounded: false,
    groundId: null,
    facing: 1,
    coyote: 0,
    jumpBuffer: 0,
    dropThrough: 0,
    dropIgnore: null,
    justLanded: false,
    landingSpeed: 0,
    airTime: 0,
    ropeJumpAnchors: [],
    rope: {
      phase: "idle",
      anchorId: null,
      anchor: { x: 0, y: 0 },
      tip: { x, y },
      dir: { x: 1, y: 0 },
      origin: { x, y },
      travelled: 0,
      length: 0,
      taut: false,
      shrink: 0,
    },
  };
}

export function playerBox(p: PlayerState): Box {
  return {
    x: p.x - PLAYER.width / 2,
    y: p.y - PLAYER.height / 2,
    w: PLAYER.width,
    h: PLAYER.height,
  };
}

// --- shared collision ------------------------------------------------------

/** A moving AABB described by its centre and velocity. */
export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Contact tolerance, so a body resting exactly on a surface is not "inside" it. */
const EPS = 0.01;

/** Pushes a body out of solid (non-one-way) boxes along x. */
function resolveX(b: Body, w: number, h: number, solids: readonly Solid[]): void {
  const top = b.y - h / 2;
  const bottom = b.y + h / 2;
  for (const s of solids) {
    if (!s.enabled || s.oneWay) continue;
    const left = b.x - w / 2;
    const right = b.x + w / 2;
    if (right <= s.x || left >= s.x + s.w) continue;
    if (bottom <= s.y + EPS || top >= s.y + s.h - EPS) continue;
    // A sliver of vertical overlap is a floor or ceiling contact for resolveY,
    // not a wall: pushing sideways out of a long floor would fling the body.
    if (Math.min(bottom, s.y + s.h) - Math.max(top, s.y) < 4) continue;
    const pushLeft = right - s.x;
    const pushRight = s.x + s.w - left;
    if (b.vx > 0 || (b.vx === 0 && pushLeft < pushRight)) b.x -= pushLeft;
    else b.x += pushRight;
    b.vx = 0;
  }
}

/**
 * Lands a falling body on the highest surface it crossed this step (one-way
 * platforms and solid tops alike), or stops a rising body under a solid.
 * Returns the id of the surface landed on.
 */
function resolveY(
  b: Body,
  w: number,
  h: number,
  prevBottom: number,
  prevTop: number,
  solids: readonly Solid[],
  ignoreId: string | null,
): string | null {
  const left = b.x - w / 2;
  const right = b.x + w / 2;
  if (b.vy >= 0) {
    const bottom = b.y + h / 2;
    let bestTop = Infinity;
    let bestId: string | null = null;
    for (const s of solids) {
      if (!s.enabled) continue;
      if (s.oneWay && s.id === ignoreId) continue;
      if (right <= s.x || left >= s.x + s.w) continue;
      const surface = s.y;
      // Only catch the body if its feet were above the surface last step.
      if (prevBottom > surface + 1.5) continue;
      if (bottom < surface) continue;
      if (surface < bestTop) {
        bestTop = surface;
        bestId = s.id;
      }
    }
    if (bestId !== null) {
      b.y = bestTop - h / 2;
      b.vy = 0;
    }
    return bestId;
  }

  const top = b.y - h / 2;
  let ceiling = -Infinity;
  for (const s of solids) {
    if (!s.enabled || s.oneWay) continue;
    if (right <= s.x || left >= s.x + s.w) continue;
    const under = s.y + s.h;
    if (prevTop < under - 1.5) continue;
    if (top > under) continue;
    ceiling = Math.max(ceiling, under);
  }
  if (ceiling > -Infinity) {
    b.y = ceiling + h / 2;
    b.vy = 0;
  }
  return null;
}

/** Minimal-axis push out of any solid, used after a rope constraint moved the player. */
function pushOutOfSolids(b: Body, w: number, h: number, solids: readonly Solid[]): void {
  for (const s of solids) {
    if (!s.enabled || s.oneWay) continue;
    const left = b.x - w / 2;
    const right = b.x + w / 2;
    const top = b.y - h / 2;
    const bottom = b.y + h / 2;
    if (right <= s.x || left >= s.x + s.w || bottom <= s.y + EPS || top >= s.y + s.h - EPS) continue;
    const pushes = [
      { dx: s.x - right, dy: 0 },
      { dx: s.x + s.w - left, dy: 0 },
      { dx: 0, dy: s.y - bottom },
      { dx: 0, dy: s.y + s.h - top },
    ];
    pushes.sort((a, c) => Math.abs(a.dx) + Math.abs(a.dy) - (Math.abs(c.dx) + Math.abs(c.dy)));
    b.x += pushes[0].dx;
    b.y += pushes[0].dy;
  }
}

/** A loose object (the cube): gravity, walls, floors, platforms. */
export interface LooseBody extends Body {
  grounded: boolean;
  groundId: string | null;
}

/** Optional bounded external vertical transport; independent of controller/room data. */
export interface VerticalMotion {
  targetY: number;
  acceleration: number;
  maxRise: number;
  maxHorizontal: number;
  horizontalDrag: number;
}
function applyVerticalMotion(b: Body, field: VerticalMotion, dt: number, steering = false): void {
  const change = field.targetY - b.vy;
  b.vy += Math.sign(change) * Math.min(Math.abs(change), field.acceleration * dt);
  b.vy = Math.max(-field.maxRise, b.vy);
  b.vx = Math.max(-field.maxHorizontal, Math.min(field.maxHorizontal, b.vx));
  if (!steering) b.vx = Math.sign(b.vx) * Math.max(0, Math.abs(b.vx) - field.horizontalDrag * dt);
}

export function stepBody(
  b: LooseBody,
  size: number,
  solids: readonly Solid[],
  gravity: number,
  maxFall: number,
  dt: number,
  field?: VerticalMotion,
): void {
  b.vy = Math.min(maxFall, b.vy + (field ? 0 : gravity) * dt);
  if (b.grounded) b.vx = 0;
  if (field) applyVerticalMotion(b, field, dt);
  const prevBottom = b.y + size / 2;
  const prevTop = b.y - size / 2;
  b.x += b.vx * dt;
  resolveX(b, size, size, solids);
  b.y += b.vy * dt;
  b.groundId = resolveY(b, size, size, prevBottom, prevTop, solids, null);
  b.grounded = b.groundId !== null;
}

// --- grapple (adapted from the previous game; marked targets in C8) --------

export interface GrappleTarget {
  solid: Solid;
  point: Vec2;
  distance: number;
}

/** The actual box a grapple ray can catch, centred on the collision box. */
export function grappleBox(solid: Solid): Box {
  if (solid.grapplePoint && solid.grappleHeight === undefined) return { x: solid.grapplePoint.x - 10, y: solid.grapplePoint.y - 10, w: 20, h: 20 };
  const w = solid.grappleWidth ?? solid.w;
  return {
    x: solid.x + (solid.w - w) / 2,
    y: solid.y,
    w,
    h: solid.grappleHeight ?? solid.h,
  };
}

/**
 * What the rope would catch on, running `maxDistance` from `origin` along
 * `dir`. Used for the targeting reticle, and every step of the hook's flight to
 * see whether the line has swept across a block.
 */
export function probeRope(
  origin: Vec2,
  dir: Vec2,
  maxDistance: number,
  solids: readonly Solid[],
  /** Block the player is standing on; never a useful anchor. */
  ignoreId?: string | null,
): GrappleTarget | null {
  if (maxDistance <= 0) return null;
  const grappleBoxes = solids.map(grappleBox);
  const hit = raycastBoxes(
    origin,
    dir,
    maxDistance,
    grappleBoxes,
    GRAPPLE.aimAssistRadius,
    (i) => solids[i].grappleable && solids[i].enabled && solids[i].id !== ignoreId,
  );
  if (!hit) return null;
  const solid = solids[hit.index];
  const point = solid.grapplePoint ?? hit.point;
  const reach = Math.hypot(point.x - origin.x, point.y - origin.y);
  if (reach < GRAPPLE.minRange || reach > GRAPPLE.maxRange) return null;
  return { solid, point, distance: reach };
}

/** Unit vector from `origin` to `aim`, or null if they coincide. */
export function aimDirection(origin: Vec2, aim: Vec2): Vec2 | null {
  const dx = aim.x - origin.x;
  const dy = aim.y - origin.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-4) return null;
  return { x: dx / len, y: dy / len };
}

/** What the hook would attach to if fired at `aim` right now (the reticle). */
export function findGrappleTarget(
  origin: Vec2,
  aim: Vec2,
  solids: readonly Solid[],
  ignoreId?: string | null,
): GrappleTarget | null {
  const dir = aimDirection(origin, aim);
  if (!dir) return null;
  return probeRope(origin, dir, GRAPPLE.maxRange, solids, ignoreId);
}

export function releaseRope(p: PlayerState, boost = true): void {
  if (p.rope.phase === "idle") return;
  if (p.rope.phase === "attached" && boost) {
    p.vx *= GRAPPLE.releaseMomentum;
    p.vy = Math.max(-GRAPPLE.maxReleaseRiseSpeed, p.vy * GRAPPLE.releaseVerticalMomentum);
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > GRAPPLE.maxReleaseSpeed) {
      p.vx *= GRAPPLE.maxReleaseSpeed / speed;
      p.vy *= GRAPPLE.maxReleaseSpeed / speed;
    }
  }
  p.rope.phase = "retracting";
  p.rope.anchorId = null;
  p.rope.taut = false;
  p.airTime = 0;
}

export function canJumpFromRope(p: PlayerState): boolean {
  return p.rope.phase === 'attached' && p.rope.anchorId !== null && !p.ropeJumpAnchors.includes(p.rope.anchorId);
}

/** Separate from letting go: retain sideways carry and set a bounded jump speed. */
export function jumpFromRope(p: PlayerState): void {
  const anchor = canJumpFromRope(p) ? p.rope.anchorId : null;
  releaseRope(p);
  if (anchor === null) return;
  p.ropeJumpAnchors.push(anchor);
  p.vy = -GRAPPLE.jumpVelocity; // Never add impulses to the current velocity.
  const speed = Math.hypot(p.vx, p.vy);
  if (speed > GRAPPLE.maxJumpSpeed) {
    p.vx *= GRAPPLE.maxJumpSpeed / speed;
    p.vy *= GRAPPLE.maxJumpSpeed / speed;
  }
}

function fireRope(p: PlayerState, dir: Vec2): void {
  const rope = p.rope;
  rope.phase = "firing";
  rope.anchorId = null;
  rope.dir = { x: dir.x, y: dir.y };
  rope.origin = { x: p.x, y: p.y };
  rope.travelled = 0;
  rope.tip = { x: p.x, y: p.y };
  rope.taut = false;
}

function attachRope(p: PlayerState, target: GrappleTarget): void {
  const rope = p.rope;
  rope.phase = "attached";
  rope.anchorId = target.solid.id;
  rope.anchor = { x: target.point.x, y: target.point.y };
  rope.tip = { ...rope.anchor };
  rope.length = Math.max(GRAPPLE.minLength, Math.hypot(p.x - rope.anchor.x, p.y - rope.anchor.y));
  rope.taut = false;
}

function stepRope(p: PlayerState, input: InputState, solids: readonly Solid[], dt: number): void {
  const rope = p.rope;
  rope.shrink = 0;

  if (input.grapplePressed && (rope.phase === "idle" || rope.phase === "retracting")) {
    const dir = aimDirection({ x: p.x, y: p.y }, input.aim);
    if (dir) fireRope(p, dir);
  }

  if (rope.phase === "firing") {
    if (!input.grappleHeld) {
      rope.phase = "retracting";
      return;
    }
    rope.travelled = Math.min(GRAPPLE.maxRange, rope.travelled + GRAPPLE.hookSpeed * dt);
    rope.tip = {
      x: rope.origin.x + rope.dir.x * rope.travelled,
      y: rope.origin.y + rope.dir.y * rope.travelled,
    };
    // The rope, not the hook, is what catches: test the whole line the player
    // is trailing, so a near miss that the line sweeps across still hooks up.
    const toTip = aimDirection({ x: p.x, y: p.y }, rope.tip);
    const reach = Math.hypot(rope.tip.x - p.x, rope.tip.y - p.y);
    const caught = toTip ? probeRope({ x: p.x, y: p.y }, toTip, reach, solids, p.groundId) : null;
    if (caught) {
      attachRope(p, caught);
      return;
    }
    if (rope.travelled >= GRAPPLE.maxRange) rope.phase = "retracting";
    return;
  }

  if (rope.phase === "retracting") {
    const dx = p.x - rope.tip.x;
    const dy = p.y - rope.tip.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 24) {
      rope.phase = "idle";
      rope.tip = { x: p.x, y: p.y };
      return;
    }
    const step = Math.min(dist, GRAPPLE.hookSpeed * 1.4 * dt);
    rope.tip = { x: rope.tip.x + (dx / dist) * step, y: rope.tip.y + (dy / dist) * step };
    return;
  }

  if (rope.phase === "attached") {
    if (!input.grappleHeld) {
      releaseRope(p);
      return;
    }
    const anchorSolid = solids.find((s) => s.id === rope.anchorId);
    if (!anchorSolid || !anchorSolid.grappleable || !anchorSolid.enabled) {
      releaseRope(p, false);
      return;
    }
    rope.tip = { ...rope.anchor };
    const dist = Math.hypot(p.x - rope.anchor.x, p.y - rope.anchor.y);
    const taut = dist >= rope.length - 4;
    if (input.reelOut) {
      rope.length = Math.min(GRAPPLE.maxRange, rope.length + GRAPPLE.reelOutSpeed * dt);
    } else if (taut || input.reelIn) {
      const next = Math.max(GRAPPLE.minLength, rope.length - GRAPPLE.reelInSpeed * dt);
      rope.shrink = rope.length - next;
      rope.length = next;
    }
  }
}

function applyRopeConstraint(p: PlayerState, dt: number): void {
  const rope = p.rope;
  if (rope.phase !== "attached") {
    rope.taut = false;
    return;
  }
  const dx = p.x - rope.anchor.x;
  const dy = p.y - rope.anchor.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= rope.length || dist < 1e-4) {
    rope.taut = false;
    return;
  }
  rope.taut = true;
  const nx = dx / dist;
  const ny = dy / dist;
  p.x = rope.anchor.x + nx * rope.length;
  p.y = rope.anchor.y + ny * rope.length;
  const radial = p.vx * nx + p.vy * ny;
  if (radial > 0) {
    p.vx -= nx * radial * GRAPPLE.ropeStiffness;
    p.vy -= ny * radial * GRAPPLE.ropeStiffness;
  }
  if (rope.shrink > 0 && dt > 0) {
    const pull = (rope.shrink / dt) * GRAPPLE.reelTransfer;
    // Approach a bounded inward speed; the old per-step addition built energy indefinitely.
    const inward = p.vx * nx + p.vy * ny;
    if (inward > -pull) {
      p.vx -= nx * (inward + pull);
      p.vy -= ny * (inward + pull);
    }
  }
}

// --- player step -------------------------------------------------------------

/** One fixed physics step. `dt` must be the constant step, not frame time. */
export function stepPlayer(
  p: PlayerState,
  input: InputState,
  solids: readonly Solid[],
  dt: number,
  field?: VerticalMotion,
  /** Current C8/co-op opts in; retained pre-C8 World keeps its original movement. */
  groundRunLimit: number = PLAYER.maxRunSpeed,
): void {
  p.justLanded = false;
  p.coyote = Math.max(0, p.coyote - dt);
  p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
  p.dropThrough = Math.max(0, p.dropThrough - dt);
  if (p.dropThrough === 0) p.dropIgnore = null;
  if (input.jumpPressed) p.jumpBuffer = PLAYER.jumpBuffer;

  // A jump and mouse release may arrive in the same frame. Validate the anchor
  // before consuming the deliberate jump, rather than detaching it first.
  const ropeJump = input.jumpPressed && p.rope.phase === 'attached';
  stepRope(p, ropeJump ? { ...input, grappleHeld: true, grapplePressed: false } : input, solids, dt);
  let attached = p.rope.phase === "attached";
  if (attached) p.airTime += dt;

  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) p.facing = dir > 0 ? 1 : -1;

  // Horizontal control. Acceleration is skipped when it would push past the
  // run cap, so rope momentum survives but running still tops out.
  if (attached) {
    p.vx += dir * GRAPPLE.swingAccel * dt;
    p.vx *= Math.exp(-GRAPPLE.swingDrag * dt);
    p.vy *= Math.exp(-GRAPPLE.swingVerticalDrag * dt);
  } else if (dir !== 0) {
    const accel = p.grounded ? PLAYER.accel : PLAYER.airAccel;
    const runLimit = p.grounded ? groundRunLimit : PLAYER.maxRunSpeed;
    const over = Math.abs(p.vx) >= runLimit && Math.sign(p.vx) === dir;
    if (!over) {
      p.vx += dir * accel * dt;
      if (Math.sign(p.vx) === dir && Math.abs(p.vx) > runLimit) {
        p.vx = dir * runLimit;
      }
    }
  } else if (p.grounded) {
    const drop = PLAYER.groundFriction * dt;
    p.vx = Math.abs(p.vx) <= drop ? 0 : p.vx - Math.sign(p.vx) * drop;
  } else {
    const drop = PLAYER.airDrag * dt;
    p.vx = Math.abs(p.vx) <= drop ? 0 : p.vx - Math.sign(p.vx) * drop;
  }

  // Ground jumps keep their usual height; rope jumps are shorter transfer hops.
  if (p.jumpBuffer > 0 && (p.grounded || p.coyote > 0 || attached)) {
    if (attached && !p.grounded) {
      jumpFromRope(p);
      attached = false;
    } else {
      if (attached) { releaseRope(p); attached = false; }
      p.vy = -PLAYER.jumpVelocity;
    }
    p.jumpBuffer = 0;
    p.coyote = 0;
    p.grounded = false;
  }

  // Drop through a one-way platform; solid floors ignore Down.
  if (input.down && p.grounded && p.groundId) {
    const ground = solids.find((s) => s.id === p.groundId);
    if (ground?.oneWay) {
      p.dropIgnore = p.groundId;
      p.dropThrough = PLAYER.dropThroughTime;
      p.grounded = false;
      p.y += 2;
    }
  }

  let gravity = PLAYER.gravity;
  if (attached) gravity *= GRAPPLE.attachedGravity;
  else if (p.vy < 0 && input.jumpHeld) gravity *= PLAYER.jumpHoldGravity;
  else if (p.vy > 0) gravity *= PLAYER.fallGravity;
  p.vy += (field ? 0 : gravity) * dt;
  if (field) applyVerticalMotion(p, field, dt, dir !== 0);
  if (p.vy > PLAYER.maxFallSpeed) p.vy = PLAYER.maxFallSpeed;
  if (p.rope.phase === "attached") p.vy = Math.max(p.vy, -GRAPPLE.maxSwingRiseSpeed);

  const speed = Math.hypot(p.vx, p.vy);
  if (speed > PLAYER.maxSpeed) {
    p.vx = (p.vx / speed) * PLAYER.maxSpeed;
    p.vy = (p.vy / speed) * PLAYER.maxSpeed;
  }

  const w = PLAYER.width;
  const h = PLAYER.height;
  const prevBottom = p.y + h / 2;
  const prevTop = p.y - h / 2;
  const wasGrounded = p.grounded;
  const fallSpeed = p.vy;

  // One axis at a time: walls first, then floors and ceilings.
  p.x += p.vx * dt;
  resolveX(p, w, h, solids);
  p.y += p.vy * dt;
  applyRopeConstraint(p, dt);
  if (p.rope.phase === "attached") pushOutOfSolids(p, w, h, solids);

  // Constraint/reel corrections also obey the swing cap.
  if (p.rope.phase === "attached") {
    // Trim lift separately so extra horizontal momentum cannot become a launch.
    p.vy = Math.max(p.vy, -GRAPPLE.maxSwingRiseSpeed);
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > GRAPPLE.maxSwingSpeed) {
      p.vx *= GRAPPLE.maxSwingSpeed / speed;
      p.vy *= GRAPPLE.maxSwingSpeed / speed;
    }
  }
  const landed = resolveY(p, w, h, prevBottom, prevTop, solids, p.dropThrough > 0 ? p.dropIgnore : null);
  p.grounded = landed !== null;
  p.groundId = landed;
  if (p.grounded && !wasGrounded && fallSpeed > 120) {
    p.justLanded = true;
    p.landingSpeed = fallSpeed;
  }

  if (p.grounded) {
    p.coyote = PLAYER.coyoteTime;
    p.airTime = 0;
    p.ropeJumpAnchors.length = 0;
  }
}
