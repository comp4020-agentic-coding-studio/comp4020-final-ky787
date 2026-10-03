/**
 * Every gameplay-feel number lives here. Movement values are carried over
 * from the previous Binary Ninja game (crit 5, `src/engine/constants.ts`),
 * where they were tuned and play-tested; changes are marked.
 */

/** Physics runs on a fixed step so behaviour does not drift with frame rate. */
export const FIXED_DT = 1 / 120;
/** Never simulate more than this much wall time in one frame (tab-switch guard). */
export const MAX_FRAME_TIME = 0.25;

export const FEATURES = {
  /**
   * The grapple is kept but off: this prototype tests whether running,
   * jumping, carrying and wiring are enough on their own. `?grapple` turns it
   * on for comparison; the room is not designed around it.
   */
  grapple: false,
} as const;

export const PLAYER = {
  width: 22,
  height: 34,
  /** Horizontal ground acceleration. */
  accel: 3400,
  airAccel: 1900,
  maxRunSpeed: 380,
  groundFriction: 2900,
  airDrag: 130,
  gravity: 3400,
  /** Gravity multiplier while rising with jump held (floaty ascent). */
  jumpHoldGravity: 0.72,
  /** Extra gravity while falling, for a snappy arc. */
  fallGravity: 1.25,
  /**
   * Changed from 640: the old game climbed with the grapple, so its jump was a
   * hop (~84 units). With the grapple off, the jump does the climbing; 800
   * gives ~130 units held and ~94 tapped. Room steps are 105 apart.
   */
  jumpVelocity: 800,
  /** Grace period after leaving a ledge during which a jump still works. */
  coyoteTime: 0.11,
  /** Jump presses are remembered this long before landing. */
  jumpBuffer: 0.13,
  maxFallSpeed: 1500,
  /** Hard ceiling on speed, so rope slingshots cannot tunnel. */
  maxSpeed: 2100,
  /** How long a drop-through ignores the platform underfoot. */
  dropThroughTime: 0.22,
} as const;

export const GRAPPLE = {
  maxRange: 620,
  minRange: 58,
  hookSpeed: 3400,
  aimAssistRadius: 26,
  reelInSpeed: 330,
  reelOutSpeed: 430,
  minLength: 46,
  ropeStiffness: 1.0,
  reelTransfer: 0.9,
  swingAccel: 1500,
  releaseBoost: 90,
  releaseMomentum: 1.0,
} as const;

export const CAMERA = {
  /**
   * World units of height kept in view. Lower than the old game's 1020: the
   * old view was sized for grapple range, this one for reading code cards.
   */
  viewHeight: 880,
  viewWidth: 1250,
  minZoom: 0.3,
  maxZoom: 1.25,
  followRate: 9.5,
  velocityLead: 0.22,
  velocityResponse: 3.2,
  maxLead: 240,
  shakeDecay: 4.2,
  verticalMargin: 160,
  /** Zoom/position response while framing a run or the overview. */
  frameRate: 4.5,
  /** Padding around the player and the executing card when framing a run. */
  framePadding: 170,
  /** Seconds the run framing lingers after execution stops or finishes. */
  frameLinger: 1.6,
} as const;

export const CARRY = {
  /** How close (centre to point) the player must be to use a jack or cube. Jacks sit ≥ 90 apart. */
  reach: 66,
  /** Sockets are bigger targets than jacks. */
  socketReach: 70,
  /** The cube sits this far above the player's head while carried. */
  holdGap: 4,
  cubeSize: 36,
  cubeGravity: 3000,
  cubeMaxFall: 1400,
  /** Horizontal offset in front of the player when the cube is put down. */
  dropAhead: 30,
} as const;

export const BRIDGE = {
  /** Seconds for the bridge to fully extend or retract. */
  extendTime: 0.9,
  thickness: 18,
} as const;

/**
 * Execution pacing, in seconds at 1x. The replay itself is untimed; these only
 * space out what the player watches. Fast mode divides them.
 */
export const RUN = {
  enter: 0.32,
  write: 0.55,
  output: 0.9,
  bridge: 1.05,
  /** Time to read a comparison's answer before its port lights. */
  feedback: 1.3,
  activation: 0.45,
  /** Anything inside a sealed stage: replayed, just not dwelt on. */
  hidden: 0.08,
  /** Pulse travel along a cable or pipe: base plus per world unit, capped. */
  transferBase: 0.25,
  transferPerUnit: 0.0004,
  transferMax: 0.9,
  fastFactor: 3.2,
} as const;
