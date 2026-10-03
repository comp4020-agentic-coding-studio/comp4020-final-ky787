/**
 * The hand-authored chamber: it places exactly the specimen's stages, its
 * cards are readable and reachable on foot, and the bridge is the only way
 * across the pit — checked with the game's own physics.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { loadSpecimen } from "../src/data/specimen.ts";
import { CARRY, PLAYER } from "../src/engine/constants.ts";
import { boxesOverlap } from "../src/engine/geometry.ts";
import type { Vec2 } from "../src/engine/geometry.ts";
import { cardPanel } from "../src/level/room.ts";
import { ROOM01 } from "../src/level/room01.ts";
import { World } from "../src/world/world.ts";
import type { Stand } from "./support/explore.ts";
import { explore, settle } from "./support/explore.ts";

const specimen = loadSpecimen();

describe("room 01 layout", () => {
  it("is authored for this specimen and places each of its stages exactly once", () => {
    expect(ROOM01.specimenId).toBe(specimen.bundle.specimen_id);
    const placed = ROOM01.cards.map((c) => c.stageId).sort();
    expect(placed).toEqual(specimen.bundle.stages.map((s) => s.id).sort());
  });

  it("keeps card panels apart, inside the room and clear of solid geometry", () => {
    const panels = ROOM01.cards.map((c) => ({ id: c.stageId, box: cardPanel(c) }));
    for (const [i, a] of panels.entries()) {
      expect(a.box.x).toBeGreaterThan(40);
      expect(a.box.x + a.box.w).toBeLessThan(ROOM01.world.width - 40);
      for (const b of panels.slice(i + 1)) {
        expect(boxesOverlap(a.box, b.box), `${a.id} overlaps ${b.id}`).toBe(false);
      }
      for (const s of ROOM01.solids.filter((s) => !s.oneWay)) {
        expect(boxesOverlap(a.box, s), `${a.id} is inside ${s.id}`).toBe(false);
      }
    }
  });
});

describe("room 01 on foot", () => {
  let closed: Stand[];
  let open: Stand[];
  const world = new World(ROOM01, specimen);
  const farSide = ROOM01.farSide;

  const canStandNear = (stands: Stand[], point: Vec2, reach = CARRY.reach): boolean =>
    stands.some((s) => Math.hypot(s.x - point.x, s.y - point.y) <= reach);

  beforeAll(() => {
    const start = settle(world.solids, ROOM01.spawn.x, ROOM01.spawn.y);
    world.bridgeSolid.enabled = false;
    closed = explore(world.solids, start);
    world.bridgeSolid.w = ROOM01.bridge.length;
    world.bridgeSolid.enabled = true;
    open = explore(world.solids, start);
    world.bridgeSolid.w = 0;
    world.bridgeSolid.enabled = false;
  });

  it("reaches every card socket, the run console and the cube without the bridge", () => {
    for (const [stageId, card] of world.cards) {
      if (card.in) expect(canStandNear(closed, card.in), `${stageId} input`).toBe(true);
      if (card.out) expect(canStandNear(closed, card.out), `${stageId} output`).toBe(true);
    }
    expect(canStandNear(closed, ROOM01.cube)).toBe(true);
  });

  it("cannot cross the pit while the bridge is retracted", () => {
    const across = closed.filter((s) => s.x - PLAYER.width / 2 >= farSide.x && s.y < farSide.y + farSide.h);
    expect(across, "the far side must need the bridge").toEqual([]);
  });

  it("can always climb back out of the pit", () => {
    const pit = settle(world.solids, ROOM01.pit.x + ROOM01.pit.w / 2, ROOM01.pit.y + 50);
    expect(pit.surfaceId).toBe("pit_floor");
    world.bridgeSolid.enabled = false;
    const fromPit = explore(world.solids, pit);
    expect(fromPit.some((s) => s.surfaceId === "floor_main")).toBe(true);
  });

  it("reaches the analysis station's slot once the bridge is open", () => {
    expect(canStandNear(open, ROOM01.station.slot)).toBe(true);
  });
});
