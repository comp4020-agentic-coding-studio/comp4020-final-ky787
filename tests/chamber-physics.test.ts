/**
 * Each chamber on foot, with the game's own physics: every cube, socket and
 * jack is reachable without precision jumping, and the exit is reachable only
 * once its door or bridge opens — never around it.
 */

import { describe, expect, it } from "vitest";
import { loadSpecimen } from "../src/data/specimen.ts";
import { CARRY, PLAYER } from "../src/engine/constants.ts";
import type { Box, Vec2 } from "../src/engine/geometry.ts";
import { boxesOverlap } from "../src/engine/geometry.ts";
import { CHAMBERS } from "../src/level/chambers.ts";
import { World } from "../src/world/world.ts";
import type { Stand } from "./support/explore.ts";
import { explore, settle } from "./support/explore.ts";

const specimen = loadSpecimen();

const near = (stands: Stand[], point: Vec2, reach: number): boolean =>
  stands.some((s) => Math.hypot(s.x - point.x, s.y - point.y) <= reach);

const inBox = (stands: Stand[], box: Box): boolean =>
  stands.some((s) => boxesOverlap({ x: s.x - PLAYER.width / 2, y: s.y - PLAYER.height / 2, w: PLAYER.width, h: PLAYER.height }, box));

function barriers(world: World, open: boolean): void {
  for (const door of world.doors) {
    door.solid.enabled = !open;
    door.solid.h = open ? 0 : door.def.h;
  }
  if (world.bridgeSolid && world.chamber.bridge) {
    world.bridgeSolid.enabled = open;
    world.bridgeSolid.w = open ? world.chamber.bridge.length : 0;
  }
}

describe.each(CHAMBERS)("chamber $number · $title on foot", (chamber) => {
  const world = new World(chamber, specimen);
  const start = settle(world.solids, chamber.spawn.x, chamber.spawn.y);
  barriers(world, false);
  const shut = explore(world.solids, start);
  barriers(world, true);
  const open = explore(world.solids, start);
  barriers(world, false);

  it("reaches every cube, socket and jack before the exit opens", () => {
    for (const cube of chamber.cubes) expect(near(shut, cube, CARRY.reach), `cube ${cube.id}`).toBe(true);
    for (const socket of world.sockets.values()) {
      expect(near(shut, world.socketPoint(socket.def), CARRY.socketReach), `socket ${socket.def.id}`).toBe(true);
    }
    for (const jack of world.jacks) {
      expect(near(shut, jack.at, CARRY.reach), `jack ${jack.portId ?? `${jack.stageId}:IN`}`).toBe(true);
    }
  });

  it("cannot reach the exit until it is opened", () => {
    expect(inBox(shut, chamber.exit)).toBe(false);
    expect(inBox(open, chamber.exit)).toBe(true);
  });

  it.runIf(chamber.pit !== null)("can always climb back out of the pit", () => {
    const pit = chamber.pit as Box;
    barriers(world, false);
    const bottom = settle(world.solids, pit.x + pit.w / 2, pit.y + 40);
    expect(bottom.surfaceId).toBe("pit_floor");
    expect(explore(world.solids, bottom).some((s) => s.surfaceId === "floor_main")).toBe(true);
  });
});
