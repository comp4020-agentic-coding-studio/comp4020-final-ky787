/**
 * Brute-force reachability over the real player physics.
 *
 * From every standing position found so far, it plays a fixed menu of input
 * programs (walk, run-up jumps, taps, full jumps, coyote jumps off edges,
 * mid-air stops, drop-throughs) through `stepPlayer` and records where the
 * player comes to rest. Positions are bucketed per surface. It cannot prove
 * reachability for inputs outside the menu, but it is the same simulation the
 * game runs, so "reachable" results are real, and the menu covers the
 * longest jumps the movement model allows (full speed, full hold, coyote).
 */

import { FIXED_DT } from "../../src/engine/constants.ts";
import type { InputState, Solid } from "../../src/engine/physics.ts";
import { createPlayer, emptyInput, stepPlayer } from "../../src/engine/physics.ts";

export interface Stand {
  surfaceId: string;
  x: number;
  y: number;
}

interface Program {
  dir: -1 | 0 | 1;
  /** Seconds of jump hold; 0 means no jump. */
  hold: number;
  /** When to press jump: seconds after start, or "edge" for the first airborne step. */
  jumpAt: number | "edge";
  /** Release the direction key this many seconds in (never if undefined). */
  stopAt?: number;
  down?: boolean;
}

const PROGRAMS: Program[] = (() => {
  const out: Program[] = [];
  for (const dir of [-1, 0, 1] as const) {
    out.push({ dir, hold: 0, jumpAt: 0, stopAt: 0.2 });
    out.push({ dir, hold: 0, jumpAt: 0 });
    out.push({ dir, hold: 0, jumpAt: 0, down: true });
    for (const hold of [0.06, 0.6]) {
      for (const jumpAt of [0, 0.12, 0.3, "edge"] as const) {
        if (dir === 0 && jumpAt !== 0) continue;
        out.push({ dir, hold, jumpAt });
        out.push({ dir, hold, jumpAt, stopAt: (typeof jumpAt === "number" ? jumpAt : 0.2) + 0.25 });
      }
    }
  }
  return out;
})();

const BUCKET = 30;
const DURATION = 1.6;

function play(solids: readonly Solid[], from: Stand, program: Program): Stand[] {
  const p = createPlayer(from.x, from.y);
  p.grounded = true;
  p.groundId = from.surfaceId;
  const rests: Stand[] = [];
  let airborne = false;
  let jumpStart: number | null = null;
  const steps = Math.round(DURATION / FIXED_DT);
  for (let i = 0; i < steps; i += 1) {
    const t = i * FIXED_DT;
    const input: InputState = emptyInput();
    const moving = program.stopAt === undefined || t < program.stopAt;
    input.left = moving && program.dir < 0;
    input.right = moving && program.dir > 0;
    input.down = Boolean(program.down) && t < 0.05;
    if (program.hold > 0 && jumpStart === null) {
      const due = program.jumpAt === "edge" ? !p.grounded : t >= program.jumpAt;
      if (due) {
        jumpStart = t;
        input.jumpPressed = true;
      }
    }
    input.jumpHeld = jumpStart !== null && t - jumpStart < program.hold;
    stepPlayer(p, input, solids, FIXED_DT);
    if (!p.grounded) airborne = true;
    else if (airborne && p.groundId) {
      rests.push({ surfaceId: p.groundId, x: p.x, y: p.y });
      airborne = false;
      if (jumpStart !== null && program.stopAt === undefined) break;
    }
  }
  if (p.grounded && p.groundId) rests.push({ surfaceId: p.groundId, x: p.x, y: p.y });
  return rests;
}

const key = (s: Stand): string => `${s.surfaceId}:${Math.round(s.x / BUCKET)}`;

/** Every standing position reachable from `start` with the program menu. */
export function explore(solids: readonly Solid[], start: Stand, limit = 4000): Stand[] {
  const seen = new Map<string, Stand>([[key(start), start]]);
  const queue: Stand[] = [start];
  while (queue.length > 0 && seen.size < limit) {
    const from = queue.shift() as Stand;
    for (const program of PROGRAMS) {
      for (const rest of play(solids, from, program)) {
        const k = key(rest);
        if (seen.has(k)) continue;
        seen.set(k, rest);
        queue.push(rest);
      }
    }
  }
  return [...seen.values()];
}

/** Drops a player at (x, y) and returns where it comes to rest. */
export function settle(solids: readonly Solid[], x: number, y: number): Stand {
  const p = createPlayer(x, y);
  for (let i = 0; i < 600 && !p.grounded; i += 1) stepPlayer(p, emptyInput(), solids, FIXED_DT);
  if (!p.grounded || !p.groundId) throw new Error(`nothing to stand on below ${x}, ${y}`);
  return { surfaceId: p.groundId, x: p.x, y: p.y };
}
