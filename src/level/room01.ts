/**
 * Chamber 01 — the compare chamber. Hand-authored around the
 * `level01_compare_bcf_v1` specimen.
 *
 * Composition (world units, y grows downward):
 *
 *   ┌──────────────────────── ceiling ─────────────────────────────────────┐
 *   │                 [ controller state board ]                           │
 *   │   [cand. A?]  [compare high]  [HIGH out]  [return]                   │
 *   │ ══ gallery catwalk (one-way, drop through with S) ══════            │
 *   │ ╪ladder                                          ╪ladder             │
 *   │ cube [INPUT/RUN] [calc+compare] [LOW out] [MATCH?] ╪ [MATCH out] ▣motor│
 *   │ ════════════════ main floor ═════════════════════════════╗ pit ╔ far ═│
 *   │                                                          ║step ║ [analysis]│
 *
 * - Two tiers of four cards plus the entry console, joined by two rung
 *   ladders, so the player stays among the cards instead of running a long
 *   corridor. Every card is a few steps from its neighbours.
 * - The order is deliberately not the control-flow order: the comparison that
 *   follows "calculate" is upstairs, and so is the return card.
 * - The two MATCH-writing cards share the lower right, beside the bridge they
 *   both appear able to open; the two LOW-writing cards sit on different tiers.
 * - The pit is too wide to jump (340) and too deep to climb out of on the far
 *   side; the step inside it only leads back to the main floor. The far side
 *   holds the analysis station, the room's objective.
 *
 * Reachability and the "bridge is required" property are checked against the
 * real physics in `tests/room.test.ts`.
 */

import type { RoomDef } from "./room.ts";

const GROUND = 1100;
const GALLERY = 680;
const CARD_H = 178;
const RUNG = { w: 110, h: 14 };

export const ROOM01: RoomDef = {
  id: "room01_compare_chamber",
  specimenId: "level01_compare_bcf_v1",
  name: "Chamber 01 · Compare",
  world: { width: 3200, height: 1330 },
  spawn: { x: 425, y: GROUND - 17 },

  solids: [
    { id: "ceiling", kind: "ceiling", oneWay: false, x: 0, y: 0, w: 3200, h: 60 },
    { id: "wall_left", kind: "wall", oneWay: false, x: 0, y: 0, w: 40, h: 1330 },
    { id: "wall_right", kind: "wall", oneWay: false, x: 3160, y: 0, w: 40, h: 1330 },
    { id: "floor_main", kind: "floor", oneWay: false, x: 40, y: GROUND, w: 2220, h: 230 },
    { id: "pit_floor", kind: "floor", oneWay: false, x: 2260, y: 1290, w: 340, h: 40 },
    { id: "floor_far", kind: "floor", oneWay: false, x: 2600, y: GROUND, w: 560, h: 230 },

    { id: "gallery", kind: "catwalk", oneWay: true, x: 40, y: GALLERY, w: 1920, h: 16 },

    { id: "ladder_l1", kind: "rung", oneWay: true, x: 60, y: 995, ...RUNG },
    { id: "ladder_l2", kind: "rung", oneWay: true, x: 60, y: 890, ...RUNG },
    { id: "ladder_l3", kind: "rung", oneWay: true, x: 60, y: 785, ...RUNG },
    { id: "ladder_r1", kind: "rung", oneWay: true, x: 1715, y: 995, ...RUNG },
    { id: "ladder_r2", kind: "rung", oneWay: true, x: 1715, y: 890, ...RUNG },
    { id: "ladder_r3", kind: "rung", oneWay: true, x: 1715, y: 785, ...RUNG },

    { id: "pit_step", kind: "step", oneWay: true, x: 2264, y: 1200, w: 84, h: 14 },
  ],

  cards: [
    // Main floor, left to right.
    { stageId: "entry", x: 230, floorY: GROUND, width: 270, height: CARD_H },
    { stageId: "calculate_compare", x: 590, floorY: GROUND, width: 300, height: CARD_H },
    { stageId: "low", x: 980, floorY: GROUND, width: 300, height: CARD_H },
    { stageId: "decoy_match", x: 1370, floorY: GROUND, width: 300, height: CARD_H },
    { stageId: "match", x: 1880, floorY: GROUND, width: 300, height: CARD_H },
    // Gallery, left to right.
    { stageId: "decoy_low", x: 240, floorY: GALLERY, width: 300, height: CARD_H },
    { stageId: "compare_high", x: 650, floorY: GALLERY, width: 300, height: CARD_H },
    { stageId: "high", x: 1060, floorY: GALLERY, width: 300, height: CARD_H },
    { stageId: "end", x: 1470, floorY: GALLERY, width: 300, height: CARD_H },
  ],

  bridge: { x: 2260, y: GROUND, length: 340 },
  pit: { x: 2260, y: GROUND, w: 340, h: 190 },
  cube: { x: 120, y: GROUND - 18 },
  station: { x: 2790, floorY: GROUND, width: 300, height: 200, slot: { x: 2715, y: GROUND - 18 } },
  stateBoard: { x: 1000, y: 120, w: 600, h: 200 },
  farSide: { x: 2600, y: 700, w: 560, h: 400 },
  // On the main floor both tiers are in view; on the gallery, the state board.
  camera: { offsetY: -280, minY: 560, maxY: 820 },
};
