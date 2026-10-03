/**
 * Room interactions: carrying cable ends between sockets, carrying the cube,
 * powering the analysis station, and the bridge following only its target.
 */

import { describe, expect, it } from "vitest";
import { loadSpecimen } from "../src/data/specimen.ts";
import { FIXED_DT, PLAYER } from "../src/engine/constants.ts";
import type { Vec2 } from "../src/engine/geometry.ts";
import { emptyInput } from "../src/engine/physics.ts";
import { ROOM01 } from "../src/level/room01.ts";
import { World } from "../src/world/world.ts";

const specimen = loadSpecimen();

function standAt(world: World, point: Vec2): void {
  world.player.x = point.x;
  world.player.y = point.y;
  world.player.vx = 0;
  world.player.vy = 0;
}

function tick(world: World, seconds: number, input = emptyInput()): void {
  for (let i = 0; i < Math.round(seconds / FIXED_DT); i += 1) world.step(input, false, FIXED_DT);
}

describe("cables", () => {
  it("carries a cable from an output to another card's input", () => {
    const world = new World(ROOM01, specimen);
    const entry = world.cards.get("entry");
    const calc = world.cards.get("calculate_compare");
    if (!entry?.out || !calc?.in) throw new Error("missing sockets");

    standAt(world, entry.out);
    world.interact();
    expect(world.held).toEqual({ kind: "cable", from: "entry" });

    standAt(world, calc.in);
    world.interact();
    expect(world.held).toBeNull();
    expect(world.connection("entry")).toBe("calculate_compare");
  });

  it("re-plugging an output replaces its single connection", () => {
    const world = new World(ROOM01, specimen);
    world.connect("calculate_compare", "low");
    const calc = world.cards.get("calculate_compare");
    const high = world.cards.get("compare_high");
    if (!calc?.out || !high?.in) throw new Error("missing sockets");
    standAt(world, calc.out);
    world.interact();
    expect(world.connection("calculate_compare")).toBeNull();
    standAt(world, high.in);
    world.interact();
    expect(world.connection("calculate_compare")).toBe("compare_high");
    expect(world.wiring()).toHaveLength(1);
  });

  it("dropping a held cable away from any socket disconnects it", () => {
    const world = new World(ROOM01, specimen);
    world.connect("low", "end");
    const low = world.cards.get("low");
    if (!low?.out) throw new Error("missing socket");
    standAt(world, low.out);
    world.interact();
    standAt(world, ROOM01.spawn);
    world.interact();
    expect(world.held).toBeNull();
    expect(world.connection("low")).toBeNull();
  });

  it("entry has no input and end has no output", () => {
    const world = new World(ROOM01, specimen);
    expect(world.cards.get("entry")?.in).toBeNull();
    expect(world.cards.get("end")?.out).toBeNull();
    world.connect("end", "entry");
    expect(world.wiring()).toEqual([]);
  });
});

describe("bridge", () => {
  it("extends only while its target is set, and the far side becomes walkable", () => {
    const world = new World(ROOM01, specimen);
    tick(world, 2);
    expect(world.bridgeExtent).toBe(0);
    expect(world.bridgeSolid.enabled).toBe(false);

    world.bridgeTarget = true;
    tick(world, 1.2);
    expect(world.bridgeExtent).toBe(1);

    standAt(world, { x: ROOM01.bridge.x - 60, y: ROOM01.bridge.y - PLAYER.height / 2 });
    const right = emptyInput();
    right.right = true;
    tick(world, 2, right);
    expect(world.playerOnFarSide()).toBe(true);

    world.bridgeTarget = false;
    tick(world, 1.2);
    expect(world.bridgeSolid.enabled).toBe(false);
  });
});

describe("cube and analysis station", () => {
  it("the station stays locked until the cube is delivered, then reveals on use", () => {
    const world = new World(ROOM01, specimen);
    const station = { x: ROOM01.station.x + ROOM01.station.width / 2, y: ROOM01.station.floorY - 17 };
    standAt(world, station);
    world.interact();
    expect(world.station).toBe("locked");

    standAt(world, ROOM01.cube);
    tick(world, 0.5);
    standAt(world, { x: ROOM01.cube.x, y: ROOM01.cube.y });
    world.interact();
    expect(world.held).toEqual({ kind: "cube" });

    standAt(world, { x: ROOM01.station.slot.x, y: ROOM01.station.slot.y });
    world.interact();
    expect(world.cube.socketed).toBe(true);
    expect(world.station).toBe("online");

    standAt(world, station);
    world.interact();
    expect(world.station).toBe("revealed");
  });

  it("a cube put down on the slot powers the station by itself", () => {
    const world = new World(ROOM01, specimen);
    world.held = { kind: "cube" };
    world.cube.carried = true;
    standAt(world, { x: ROOM01.station.slot.x - 40, y: ROOM01.station.floorY - PLAYER.height / 2 });
    world.player.facing = 1;
    world.interact();
    expect(world.held).toBeNull();
    tick(world, 1);
    expect(world.station).toBe("online");
  });
});
