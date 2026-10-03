/**
 * Hand-authored tutorial chambers. A chamber is physical layout plus a
 * presentation of the one frozen specimen, in the v2 contract's tutorial
 * terms:
 *
 * - every stage the chamber's runs can reach is placed, either as a readable
 *   `machine` (visible_stage_ids) or as a `sealed` housing — hidden, but still
 *   replayed exactly, event for event;
 * - `editablePorts` get cable jacks the player wires (editable_port_ids);
 * - `prewired` routes are fixed pipes (prewired_connections), using the same
 *   port ids and the same exit validation as player cables.
 *
 * Nothing here is a binary fact. Coordinates are world units, y grows down.
 */

import type { Box, Vec2 } from "../engine/geometry.ts";

export type SolidKind = "wall" | "floor" | "ceiling" | "plinth" | "step" | "shelf";

export interface ChamberSolid extends Box {
  id: string;
  kind: SolidKind;
  /** One-way surfaces can be jumped up through and dropped through. */
  oneWay: boolean;
}

/** One stage's physical form in this chamber. */
export interface ChamberStage {
  stageId: string;
  /** `machine`: visible, readable, inspectable. `sealed`: hidden housing, pipes only. */
  mode: "machine" | "sealed";
  x: number;
  /** Bottom of the housing (the floor it stands on, or its wall mount). */
  floorY: number;
  w: number;
  h: number;
  /** Presentation override for this chamber, e.g. calculation only, no question. */
  title?: string;
  /** A display high on the wall: shows its state, takes no cables. */
  wallMounted?: boolean;
}

export type CubeKind = "power" | "input";

export interface ChamberCube {
  id: string;
  kind: CubeKind;
  /** Program input carried by an input cube (6, 7 or 8). */
  value?: number;
  x: number;
  y: number;
}

export type SocketKind = "power" | "run" | "input";

export interface ChamberSocket {
  id: string;
  kind: SocketKind;
  /** Centre of the cube when seated. */
  x: number;
  /** Top of the pedestal the socket is set into. */
  floorY: number;
  label: string;
}

export type DoorRule =
  /** Opens while a socket holds a cube. */
  | { kind: "socket"; socketId: string }
  /** Opens once every listed input has finished a run on the current wiring. */
  | { kind: "inputs_finished"; inputs: number[] };

export interface ChamberDoor extends Box {
  id: string;
  rule: DoorRule;
}

/** When an environmental sign stops being needed. */
export type SignFade =
  | { kind: "cube_carried"; cubeId: string }
  | { kind: "socket_filled"; socketId: string }
  | { kind: "ports_wired"; portIds: string[] }
  | { kind: "run_started" };

export interface ChamberSign {
  text: string;
  x: number;
  y: number;
  size: number;
  colour?: string;
  /** Draw an arrow from the text toward this point. */
  arrowTo?: Vec2;
  fadeWhen?: SignFade;
}

/** A decorative power line (e.g. RUN socket to START), drawn through `points`. */
export interface ChamberConduit {
  points: Vec2[];
  /** Lights while this socket holds a cube. */
  socketId: string;
}

export interface ChamberDef {
  id: string;
  number: number;
  /** One word the room is about: POWER, CONNECT, INPUT, BRANCH. */
  title: string;
  world: { width: number; height: number };
  spawn: Vec2;
  solids: ChamberSolid[];
  camera: { viewHeight: number; offsetY: number; minY: number; maxY: number };

  /** Program input when the chamber has no INPUT socket. */
  fixedInput: number | null;
  stages: ChamberStage[];
  editablePorts: string[];
  prewired: Record<string, string>;
  /** Show comparison answers on visible comparison machines. */
  showFeedback: boolean;

  cubes: ChamberCube[];
  sockets: ChamberSocket[];
  bridge: { x: number; y: number; length: number } | null;
  /** Decorative bounds of the pit under the bridge. */
  pit: Box | null;
  doors: ChamberDoor[];
  /** Walking in here (past any door) finishes the chamber. */
  exit: Box;
  signs: ChamberSign[];
  conduits: ChamberConduit[];
}

// --- machine geometry ------------------------------------------------------

/** Jacks sit at chest height on the housing's front, along its base. */
export const JACK_RISE = 26;

export function housing(s: ChamberStage): Box {
  return { x: s.x, y: s.floorY - s.h, w: s.w, h: s.h };
}

/** Where a player cable plugs into this stage. */
export function inJack(s: ChamberStage): Vec2 {
  return { x: s.x + 34, y: s.floorY - JACK_RISE };
}

/**
 * Where player cables leave, for the stage's ports in bundle order. A
 * comparison's TRUE sits left of its FALSE, far enough apart that the nearest
 * jack is never ambiguous.
 */
export function outJack(s: ChamberStage, portIndex: number, portCount: number): Vec2 {
  const fromRight = portCount === 1 ? 34 : portIndex === 0 ? 124 : 34;
  return { x: s.x + s.w - fromRight, y: s.floorY - JACK_RISE };
}

/** Where a fixed pipe enters this stage (top left of the housing). */
export function pipeIn(s: ChamberStage): Vec2 {
  return { x: s.x + Math.min(40, s.w / 4), y: s.floorY - s.h };
}

/** Where a fixed pipe leaves this stage (top right, one spout per port). */
export function pipeOut(s: ChamberStage, portIndex: number): Vec2 {
  return { x: s.x + s.w - Math.min(40, s.w / 4) - portIndex * Math.min(44, s.w / 4), y: s.floorY - s.h };
}

/**
 * An orthogonal pipe route: up out of the source, across a lane above both
 * housings, and down into the destination.
 */
export function pipeRoute(from: Vec2, to: Vec2, lane: number): Vec2[] {
  const y = Math.min(from.y, to.y) - 34 - lane * 14;
  return [from, { x: from.x, y }, { x: to.x, y }, to];
}

/** Length of a polyline, and the point a fraction t along it. */
export function polylineLength(points: Vec2[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

export function polylinePoint(points: Vec2[], t: number): Vec2 {
  const target = polylineLength(points) * Math.min(1, Math.max(0, t));
  let walked = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (walked + seg >= target && seg > 0) {
      const k = (target - walked) / seg;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    walked += seg;
  }
  return points[points.length - 1];
}
