/**
 * Hand-authored room layout. Rooms are written by hand, not generated from the
 * control-flow graph: they place each stage card by its stage id and say
 * nothing else about the binary. Everything in here is physical gameplay
 * layout; binary facts stay in the bundle.
 */

import type { Box, Vec2 } from "../engine/geometry.ts";

export type SolidKind = "wall" | "floor" | "ceiling" | "catwalk" | "rung" | "step";

export interface RoomSolid extends Box {
  id: string;
  kind: SolidKind;
  /** One-way surfaces can be jumped up through and dropped through. */
  oneWay: boolean;
}

/** A stage card mounted on the back wall above a walkway. */
export interface RoomCard {
  stageId: string;
  /** Left edge of the card panel. */
  x: number;
  /** Top of the walkway the card stands on. */
  floorY: number;
  width: number;
  height: number;
}

export interface RoomDef {
  id: string;
  /** The specimen whose stage ids this room places. */
  specimenId: string;
  name: string;
  world: { width: number; height: number };
  spawn: Vec2;
  solids: RoomSolid[];
  cards: RoomCard[];
  /** Retractable bridge: extends rightwards from `x` when open. */
  bridge: { x: number; y: number; length: number };
  /** Decorative bounds of the pit the bridge spans. */
  pit: Box;
  cube: Vec2;
  /** The locked analysis station and the slot the cube powers it through. */
  station: { x: number; floorY: number; width: number; height: number; slot: Vec2 };
  /** In-world readout of the controller's state fields. */
  stateBoard: Box;
  /** The area across the bridge, for the "crossed" check and framing. */
  farSide: Box;
  /**
   * Vertical camera rail while following the player: the camera centre sits
   * `offsetY` from the player, kept within [minY, maxY], so a two-tier room
   * shows both tiers instead of tracking the player's feet.
   */
  camera: { offsetY: number; minY: number; maxY: number };
}

/** Card sockets sit at chest height at the panel's lower corners. */
export const SOCKET_RISE = 26;

export interface CardSockets {
  in: Vec2;
  out: Vec2;
}

export function cardSockets(card: RoomCard): CardSockets {
  const y = card.floorY - SOCKET_RISE;
  return {
    in: { x: card.x - 4, y },
    out: { x: card.x + card.width + 4, y },
  };
}

/** The panel rectangle, which sits just above the walkway. */
export function cardPanel(card: RoomCard): Box {
  return { x: card.x, y: card.floorY - 8 - card.height, w: card.width, h: card.height };
}
