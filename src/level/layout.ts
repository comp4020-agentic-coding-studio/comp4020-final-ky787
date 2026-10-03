/**
 * Where every connection in a chamber runs: fixed pipes for pre-wired ports,
 * sagging cables for editable ones. The renderer draws these paths and the
 * run director times its pulse along the same ones.
 */

import type { SpecimenIndex } from "../data/bundle.ts";
import type { Vec2 } from "../engine/geometry.ts";
import type { ChamberDef, ChamberStage } from "./chamber.ts";
import { inJack, outJack, pipeIn, pipeOut, pipeRoute, polylineLength } from "./chamber.ts";

/** Cubic cable path between jacks, with cosmetic sag. */
export function cableCurve(a: Vec2, b: Vec2): [Vec2, Vec2, Vec2, Vec2] {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const reach = Math.max(70, Math.abs(b.x - a.x) * 0.25);
  const sag = 26 + dist * 0.1;
  return [a, { x: a.x + reach, y: a.y + sag }, { x: b.x - reach, y: b.y + sag }, b];
}

export function cubicPoint(p: [Vec2, Vec2, Vec2, Vec2], t: number): Vec2 {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x,
    y: a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y,
  };
}

export class ChamberLayout {
  readonly stages = new Map<string, ChamberStage>();
  /** Fixed pipe route for each pre-wired port. */
  readonly pipes = new Map<string, Vec2[]>();

  constructor(
    readonly chamber: ChamberDef,
    private readonly specimen: SpecimenIndex,
  ) {
    for (const s of chamber.stages) this.stages.set(s.stageId, s);
    let lane = 0;
    for (const [portId, to] of Object.entries(chamber.prewired)) {
      const from = this.portSpout(portId);
      const dest = this.stages.get(to);
      if (!from || !dest) continue;
      this.pipes.set(portId, pipeRoute(from, pipeIn(dest), lane));
      lane += 1;
    }
  }

  /** Where a port leaves its stage: a jack if editable, else a pipe spout. */
  portJack(portId: string): Vec2 | null {
    const port = this.specimen.port(portId);
    const stage = this.stages.get(port.owner_stage_id);
    if (!stage) return null;
    const ports = this.specimen.stagePorts(stage.stageId);
    const i = ports.findIndex((p) => p.id === portId);
    return outJack(stage, i, ports.length);
  }

  portSpout(portId: string): Vec2 | null {
    const port = this.specimen.port(portId);
    const stage = this.stages.get(port.owner_stage_id);
    if (!stage) return null;
    const i = this.specimen.stagePorts(stage.stageId).findIndex((p) => p.id === portId);
    return pipeOut(stage, i);
  }

  /**
   * The path a pulse takes along `portId` to `to`: the pipe if pre-wired,
   * otherwise the player's cable, sampled into a polyline.
   */
  path(portId: string, to: string): Vec2[] | null {
    const pipe = this.pipes.get(portId);
    if (pipe && this.chamber.prewired[portId] === to) return pipe;
    const a = this.portJack(portId);
    const dest = this.stages.get(to);
    if (!a || !dest) return null;
    const curve = cableCurve(a, inJack(dest));
    return Array.from({ length: 25 }, (_, i) => cubicPoint(curve, i / 24));
  }

  pathLength(portId: string, to: string): number {
    const path = this.path(portId, to);
    return path ? polylineLength(path) : 0;
  }
}
