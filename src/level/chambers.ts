/**
 * The tutorial progression: four hand-authored chambers over the same frozen
 * specimen, each teaching one physical idea before any program idea.
 *
 *   0 POWER    carry a cube to a socket; the exit opens. No code at all.
 *   1 CONNECT  one cable (START → CALCULATE), then a power cube in RUN. The
 *              rest of input 7's execution runs through sealed, pre-wired
 *              machinery and its real bridge_open write extends the bridge.
 *   2 INPUT    numbered cubes 6/7/8 and an INPUT socket. Everything is
 *              pre-wired; the LOW/MATCH/HIGH outcome machines light up per
 *              run, and only the real MATCH execution opens the bridge.
 *   3 BRANCH   the first comparison, VALUE < 22 ?, with TRUE and FALSE jacks.
 *              Wire both once; the door needs 6, 7 and 8 to finish on that one
 *              circuit.
 *
 * Shared shape: a wide room, floor at y 1000, gentle plinths (≤ 60 high, one
 * hop), controls spread apart so two players could later split the work, and
 * the exit in view. Decoys are never placed: they stay hidden until a later
 * chamber. Every prewired route and every reachable stage is checked against
 * the bundle in `tests/chambers.test.ts`, and reachability against the real
 * physics in `tests/chamber-physics.test.ts`.
 */

import type { ChamberDef, ChamberSolid } from "./chamber.ts";

const FLOOR = 1000;
const HEIGHT = 1160;
const CAMERA = { viewHeight: 1000, offsetY: -300, minY: 500, maxY: 660 };

function shell(width: number): ChamberSolid[] {
  return [
    { id: "ceiling", kind: "ceiling", oneWay: false, x: 0, y: 0, w: width, h: 60 },
    { id: "wall_left", kind: "wall", oneWay: false, x: 0, y: 0, w: 40, h: HEIGHT },
    { id: "wall_right", kind: "wall", oneWay: false, x: width - 40, y: 0, w: 40, h: HEIGHT },
  ];
}

/** A floor with a 340-wide pit at `pitX`, unjumpable and only climbable back out. */
function floorWithPit(width: number, pitX: number): ChamberSolid[] {
  return [
    { id: "floor_main", kind: "floor", oneWay: false, x: 40, y: FLOOR, w: pitX - 40, h: HEIGHT - FLOOR },
    { id: "pit_floor", kind: "floor", oneWay: false, x: pitX, y: 1150, w: 340, h: 10 },
    { id: "pit_step", kind: "step", oneWay: true, x: pitX + 4, y: 1070, w: 84, h: 14 },
    { id: "floor_far", kind: "floor", oneWay: false, x: pitX + 340, y: FLOOR, w: width - 40 - pitX - 340, h: HEIGHT - FLOOR },
  ];
}

const ALL_PREWIRED = {
  "entry:NEXT": "calculate_compare",
  "cmp_000010a2:TRUE": "low",
  "cmp_000010a2:FALSE": "compare_high",
  "cmp_00001183:TRUE": "high",
  "cmp_00001183:FALSE": "match",
  "low:NEXT": "end",
  "high:NEXT": "end",
  "match:NEXT": "end",
};

// --- 0 · POWER ---------------------------------------------------------------

export const CHAMBER_POWER: ChamberDef = {
  id: "chamber0_power",
  number: 0,
  title: "POWER",
  world: { width: 2200, height: HEIGHT },
  spawn: { x: 200, y: FLOOR - 17 },
  solids: [
    ...shell(2200),
    { id: "floor", kind: "floor", oneWay: false, x: 40, y: FLOOR, w: 2120, h: HEIGHT - FLOOR },
    { id: "cube_ledge", kind: "plinth", oneWay: false, x: 560, y: 940, w: 200, h: 60 },
    { id: "socket_dais", kind: "plinth", oneWay: false, x: 1160, y: 950, w: 280, h: 50 },
    { id: "door_wall", kind: "wall", oneWay: false, x: 1880, y: 60, w: 40, h: 700 },
  ],
  camera: CAMERA,
  fixedInput: null,
  stages: [],
  editablePorts: [],
  prewired: {},
  showFeedback: false,
  cubes: [{ id: "power", kind: "power", x: 660, y: 922 }],
  sockets: [{ id: "power_socket", kind: "power", x: 1300, floorY: 950, label: "POWER" }],
  bridge: null,
  pit: null,
  doors: [{ id: "exit_door", x: 1880, y: 760, w: 40, h: 240, rule: { kind: "socket", socketId: "power_socket" } }],
  exit: { x: 1930, y: 760, w: 220, h: 240 },
  signs: [
    { text: "POWER THE EXIT", x: 1300, y: 400, size: 76 },
    { text: "PICK UP", x: 660, y: 820, size: 42, arrowTo: { x: 660, y: 885 }, fadeWhen: { kind: "cube_carried", cubeId: "power" } },
    { text: "PLACE HERE", x: 1300, y: 830, size: 42, arrowTo: { x: 1300, y: 900 }, fadeWhen: { kind: "socket_filled", socketId: "power_socket" } },
    { text: "EXIT", x: 2040, y: 700, size: 40 },
  ],
  conduits: [
    { points: [{ x: 1340, y: 996 }, { x: 1860, y: 996 }, { x: 1860, y: 740 }], socketId: "power_socket" },
  ],
};

// --- 1 · CONNECT / RUN -------------------------------------------------------

export const CHAMBER_CONNECT: ChamberDef = {
  id: "chamber1_connect",
  number: 1,
  title: "CONNECT",
  world: { width: 2700, height: HEIGHT },
  spawn: { x: 180, y: FLOOR - 17 },
  solids: [
    ...shell(2700),
    ...floorWithPit(2700, 1900),
    { id: "calc_plinth", kind: "plinth", oneWay: false, x: 820, y: 950, w: 420, h: 50 },
    { id: "run_dais", kind: "plinth", oneWay: false, x: 1440, y: 960, w: 240, h: 40 },
  ],
  camera: CAMERA,
  // The room's machine always runs the retained execution for input 7.
  fixedInput: 7,
  stages: [
    { stageId: "entry", mode: "machine", x: 380, floorY: FLOOR, w: 260, h: 200 },
    { stageId: "calculate_compare", mode: "machine", x: 860, floorY: 950, w: 340, h: 230, title: "CALCULATE" },
    { stageId: "low", mode: "sealed", x: 1080, floorY: 380, w: 110, h: 70 },
    { stageId: "compare_high", mode: "sealed", x: 1320, floorY: 300, w: 120, h: 70 },
    { stageId: "high", mode: "sealed", x: 1560, floorY: 380, w: 110, h: 70 },
    { stageId: "match", mode: "sealed", x: 1770, floorY: 820, w: 110, h: 70 },
    { stageId: "end", mode: "sealed", x: 2060, floorY: 300, w: 110, h: 70 },
  ],
  editablePorts: ["entry:NEXT"],
  prewired: Object.fromEntries(Object.entries(ALL_PREWIRED).filter(([port]) => port !== "entry:NEXT")),
  showFeedback: false,
  cubes: [{ id: "power", kind: "power", x: 1490, y: 942 }],
  sockets: [{ id: "run", kind: "run", x: 1610, floorY: 960, label: "RUN" }],
  bridge: { x: 1900, y: FLOOR, length: 340 },
  pit: { x: 1900, y: FLOOR, w: 340, h: 150 },
  doors: [],
  exit: { x: 2440, y: 760, w: 210, h: 240 },
  signs: [
    { text: "CONNECT", x: 750, y: 600, size: 50, arrowTo: { x: 845, y: 890 }, fadeWhen: { kind: "ports_wired", portIds: ["entry:NEXT"] } },
    { text: "RUN", x: 1610, y: 840, size: 50, arrowTo: { x: 1610, y: 905 }, fadeWhen: { kind: "run_started" } },
    { text: "EXIT", x: 2545, y: 720, size: 40 },
  ],
  conduits: [
    { points: [{ x: 1600, y: 996 }, { x: 510, y: 996 }, { x: 510, y: 990 }], socketId: "run" },
  ],
};

// --- 2 · INPUT ---------------------------------------------------------------

export const CHAMBER_INPUT: ChamberDef = {
  id: "chamber2_input",
  number: 2,
  title: "INPUT",
  world: { width: 2900, height: HEIGHT },
  spawn: { x: 100, y: FLOOR - 17 },
  solids: [
    ...shell(2900),
    ...floorWithPit(2900, 2050),
    { id: "cube_rack", kind: "shelf", oneWay: false, x: 180, y: 960, w: 260, h: 40 },
    { id: "input_dais", kind: "plinth", oneWay: false, x: 520, y: 965, w: 140, h: 35 },
    { id: "run_platform", kind: "plinth", oneWay: false, x: 880, y: 940, w: 240, h: 60 },
  ],
  camera: CAMERA,
  fixedInput: null,
  stages: [
    { stageId: "entry", mode: "sealed", x: 700, floorY: 330, w: 110, h: 70 },
    { stageId: "calculate_compare", mode: "sealed", x: 930, floorY: 300, w: 120, h: 70 },
    { stageId: "compare_high", mode: "sealed", x: 1240, floorY: 330, w: 120, h: 70 },
    { stageId: "low", mode: "machine", x: 1220, floorY: FLOOR, w: 220, h: 170 },
    { stageId: "high", mode: "machine", x: 1500, floorY: FLOOR, w: 220, h: 170 },
    { stageId: "match", mode: "machine", x: 1760, floorY: FLOOR, w: 220, h: 170 },
    { stageId: "end", mode: "sealed", x: 2160, floorY: 300, w: 110, h: 70 },
  ],
  editablePorts: [],
  prewired: ALL_PREWIRED,
  showFeedback: false,
  cubes: [
    { id: "input_6", kind: "input", value: 6, x: 230, y: 942 },
    { id: "input_7", kind: "input", value: 7, x: 310, y: 942 },
    { id: "input_8", kind: "input", value: 8, x: 390, y: 942 },
    { id: "power", kind: "power", x: 930, y: 922 },
  ],
  sockets: [
    { id: "input", kind: "input", x: 590, floorY: 965, label: "INPUT" },
    { id: "run", kind: "run", x: 1060, floorY: 940, label: "RUN" },
  ],
  bridge: { x: 2050, y: FLOOR, length: 340 },
  pit: { x: 2050, y: FLOOR, w: 340, h: 150 },
  doors: [],
  exit: { x: 2600, y: 760, w: 250, h: 240 },
  signs: [
    { text: "INPUT", x: 590, y: 850, size: 46, arrowTo: { x: 590, y: 915 } },
    { text: "RUN", x: 1060, y: 820, size: 46, arrowTo: { x: 1060, y: 885 } },
    { text: "6 · 7 · 8", x: 310, y: 860, size: 34, fadeWhen: { kind: "socket_filled", socketId: "input" } },
    { text: "EXIT", x: 2725, y: 720, size: 40 },
  ],
  conduits: [
    { points: [{ x: 625, y: 990 }, { x: 690, y: 990 }, { x: 690, y: 400 }, { x: 740, y: 400 }, { x: 740, y: 330 }], socketId: "input" },
    { points: [{ x: 1090, y: 934 }, { x: 1150, y: 934 }, { x: 1150, y: 420 }, { x: 775, y: 420 }, { x: 775, y: 330 }], socketId: "run" },
  ],
};

// --- 3 · BRANCH --------------------------------------------------------------

export const CHAMBER_BRANCH: ChamberDef = {
  id: "chamber3_branch",
  number: 3,
  title: "BRANCH",
  world: { width: 3000, height: HEIGHT },
  spawn: { x: 100, y: FLOOR - 17 },
  solids: [
    ...shell(3000),
    { id: "floor", kind: "floor", oneWay: false, x: 40, y: FLOOR, w: 2920, h: HEIGHT - FLOOR },
    { id: "cube_rack", kind: "shelf", oneWay: false, x: 160, y: 960, w: 260, h: 40 },
    { id: "input_dais", kind: "plinth", oneWay: false, x: 500, y: 965, w: 140, h: 35 },
    { id: "run_platform", kind: "plinth", oneWay: false, x: 760, y: 940, w: 240, h: 60 },
    { id: "low_plinth", kind: "plinth", oneWay: false, x: 1660, y: 950, w: 260, h: 50 },
    { id: "door_wall", kind: "wall", oneWay: false, x: 2660, y: 60, w: 40, h: 700 },
  ],
  camera: CAMERA,
  fixedInput: null,
  stages: [
    { stageId: "entry", mode: "sealed", x: 620, floorY: 330, w: 110, h: 70 },
    { stageId: "calculate_compare", mode: "machine", x: 1120, floorY: FLOOR, w: 380, h: 250 },
    { stageId: "low", mode: "machine", x: 1680, floorY: 950, w: 220, h: 170 },
    { stageId: "compare_high", mode: "machine", x: 2040, floorY: FLOOR, w: 360, h: 240 },
    { stageId: "high", mode: "machine", x: 2030, floorY: 650, w: 170, h: 120, wallMounted: true },
    { stageId: "match", mode: "machine", x: 2240, floorY: 650, w: 170, h: 120, wallMounted: true },
    { stageId: "end", mode: "sealed", x: 2460, floorY: 330, w: 110, h: 70 },
  ],
  editablePorts: ["cmp_000010a2:TRUE", "cmp_000010a2:FALSE"],
  prewired: Object.fromEntries(Object.entries(ALL_PREWIRED).filter(([port]) => !port.startsWith("cmp_000010a2:"))),
  showFeedback: true,
  cubes: [
    { id: "input_6", kind: "input", value: 6, x: 210, y: 942 },
    { id: "input_7", kind: "input", value: 7, x: 290, y: 942 },
    { id: "input_8", kind: "input", value: 8, x: 370, y: 942 },
    { id: "power", kind: "power", x: 810, y: 922 },
  ],
  sockets: [
    { id: "input", kind: "input", x: 570, floorY: 965, label: "INPUT" },
    { id: "run", kind: "run", x: 940, floorY: 940, label: "RUN" },
  ],
  bridge: null,
  pit: null,
  doors: [{ id: "exit_door", x: 2660, y: 760, w: 40, h: 240, rule: { kind: "inputs_finished", inputs: [6, 7, 8] } }],
  exit: { x: 2710, y: 760, w: 240, h: 240 },
  signs: [
    { text: "WIRE TRUE AND FALSE", x: 1310, y: 660, size: 36, fadeWhen: { kind: "ports_wired", portIds: ["cmp_000010a2:TRUE", "cmp_000010a2:FALSE"] } },
    { text: "INPUT", x: 570, y: 850, size: 46, arrowTo: { x: 570, y: 915 } },
    { text: "RUN", x: 940, y: 820, size: 46, arrowTo: { x: 940, y: 885 } },
    { text: "RUN 6 · 7 · 8", x: 2760, y: 630, size: 30 },
    { text: "EXIT", x: 2830, y: 720, size: 40 },
  ],
  conduits: [
    { points: [{ x: 605, y: 990 }, { x: 665, y: 990 }, { x: 665, y: 330 }], socketId: "input" },
    { points: [{ x: 970, y: 934 }, { x: 1030, y: 934 }, { x: 1030, y: 420 }, { x: 700, y: 420 }, { x: 700, y: 330 }], socketId: "run" },
  ],
};

export const CHAMBERS: ChamberDef[] = [CHAMBER_POWER, CHAMBER_CONNECT, CHAMBER_INPUT, CHAMBER_BRANCH];
