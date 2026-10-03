/**
 * Chamber interactions: cubes into matching sockets, doors following their
 * rules, cables carried between jacks by port id, door lamps clearing when
 * the circuit changes, and the bridge following only its target.
 */

import { describe, expect, it } from "vitest";
import { loadSpecimen } from "../src/data/specimen.ts";
import { FIXED_DT, PLAYER } from "../src/engine/constants.ts";
import type { Vec2 } from "../src/engine/geometry.ts";
import { emptyInput } from "../src/engine/physics.ts";
import { CHAMBER_BRANCH, CHAMBER_CONNECT, CHAMBER_INPUT, CHAMBER_POWER } from "../src/level/chambers.ts";
import { World } from "../src/world/world.ts";
import type { WorldEvent } from "../src/world/world.ts";

const specimen = loadSpecimen();

function standAt(world: World, point: Vec2): void {
  Object.assign(world.player, { x: point.x, y: point.y, vx: 0, vy: 0 });
}

function tick(world: World, seconds: number, input = emptyInput()): WorldEvent[] {
  const events: WorldEvent[] = [];
  for (let i = 0; i < Math.round(seconds / FIXED_DT); i += 1) {
    world.step(input, false, FIXED_DT);
    events.push(...world.drainEvents());
  }
  return events;
}

describe("cubes and sockets", () => {
  it("chamber 0: carrying the cube to its socket opens the exit door", () => {
    const world = new World(CHAMBER_POWER, specimen);
    tick(world, 0.5);
    const cube = world.cubes.get("power");
    if (!cube) throw new Error("no cube");
    standAt(world, { x: cube.x, y: cube.y });
    world.interact();
    expect(world.held).toEqual({ kind: "cube", cubeId: "power" });

    const socket = world.sockets.get("power_socket")?.def;
    if (!socket) throw new Error("no socket");
    standAt(world, { x: socket.x - 30, y: socket.floorY - PLAYER.height / 2 });
    world.interact();
    expect(world.sockets.get("power_socket")?.cubeId).toBe("power");
    const events = tick(world, 1.2);
    expect(events.some((e) => e.kind === "door_opened")).toBe(true);
    expect(world.doors[0].solid.enabled).toBe(false);

    // Taking the cube back out closes it again.
    standAt(world, { x: socket.x - 30, y: socket.floorY - PLAYER.height / 2 });
    world.interact();
    tick(world, 1.2);
    expect(world.doors[0].solid.enabled).toBe(true);
  });

  it("an INPUT socket only takes numbered cubes, and RUN only the power cube", () => {
    const world = new World(CHAMBER_INPUT, specimen);
    expect(world.insert("power", "input")).toBe(false);
    expect(world.insert("input_7", "run")).toBe(false);
    expect(world.insert("input_7", "input")).toBe(true);
    expect(world.insert("input_8", "input")).toBe(false);
    expect(world.socketCube("input")?.def.value).toBe(7);
  });

  it("a cube dropped onto its pedestal seats itself", () => {
    const world = new World(CHAMBER_INPUT, specimen);
    const cube = world.cubes.get("input_6");
    const socket = world.sockets.get("input")?.def;
    if (!cube || !socket) throw new Error("missing");
    Object.assign(cube, { x: socket.x + 4, y: socket.floorY - 120, vx: 0, vy: 0 });
    const events = tick(world, 1);
    expect(events).toContainEqual({ kind: "socket_filled", socketId: "input", cubeId: "input_6" });
  });

  it("a cube put down on the floor stays where it was put down", () => {
    const world = new World(CHAMBER_BRANCH, specimen);
    tick(world, 0.5);
    const cube = world.cubes.get("input_7");
    if (!cube) throw new Error("no cube");
    world.held = { kind: "cube", cubeId: "input_7" };
    cube.carried = true;
    standAt(world, { x: 700, y: 1000 - PLAYER.height / 2 });
    world.player.facing = 1;
    world.interact();
    const events = tick(world, 1);
    expect(events.some((e) => e.kind === "cube_respawned")).toBe(false);
    expect(Math.abs(cube.x - 700)).toBeLessThan(60);
    expect(cube.grounded).toBe(true);
  });

  it("holding a cube at an occupied socket swaps it", () => {
    const world = new World(CHAMBER_INPUT, specimen);
    world.insert("input_6", "input");
    world.held = { kind: "cube", cubeId: "input_7" };
    const cube = world.cubes.get("input_7");
    if (!cube) throw new Error("no cube");
    cube.carried = true;
    const socket = world.socketPoint(world.sockets.get("input")!.def);
    standAt(world, { x: socket.x - 20, y: 1000 - PLAYER.height / 2 });
    world.interact();
    expect(world.socketCube("input")?.def.value).toBe(7);
    expect(world.held).toEqual({ kind: "cube", cubeId: "input_6" });
  });

  it("resetting cubes empties sockets but keeps the wiring", () => {
    const world = new World(CHAMBER_BRANCH, specimen);
    world.connect("cmp_000010a2:TRUE", "low");
    world.insert("input_6", "input");
    world.resetCubes();
    expect(world.socketCube("input")).toBeNull();
    expect(world.connection("cmp_000010a2:TRUE")).toBe("low");
  });
});

describe("cables", () => {
  it("chamber 1: carries START's cable to CALCULATE by port id", () => {
    const world = new World(CHAMBER_CONNECT, specimen);
    const out = world.jacks.find((j) => j.portId === "entry:NEXT");
    const into = world.jacks.find((j) => j.kind === "in" && j.stageId === "calculate_compare");
    if (!out || !into) throw new Error("missing jacks");
    standAt(world, out.at);
    world.interact();
    expect(world.held).toEqual({ kind: "cable", portId: "entry:NEXT" });
    standAt(world, into.at);
    world.interact();
    expect(world.connection("entry:NEXT")).toBe("calculate_compare");
    expect(world.cables()).toEqual([["entry:NEXT", "calculate_compare"]]);
  });

  it("pre-wired pipes are fixed: the player cannot unplug or replace them", () => {
    const world = new World(CHAMBER_CONNECT, specimen);
    expect(world.connect("cmp_000010a2:FALSE", "low")).toBe(false);
    expect(world.disconnect("cmp_000010a2:FALSE")).toBeNull();
    expect(world.connection("cmp_000010a2:FALSE")).toBe("compare_high");
  });

  it("chamber 3: both comparison outputs are wired once, and rewiring clears the door lamps", () => {
    const world = new World(CHAMBER_BRANCH, specimen);
    world.connect("cmp_000010a2:TRUE", "low");
    world.connect("cmp_000010a2:FALSE", "compare_high");
    world.finishedInputs.add(6);
    world.finishedInputs.add(7);
    world.connect("cmp_000010a2:TRUE", "compare_high");
    expect(world.finishedInputs.size).toBe(0);
    expect(world.connection("cmp_000010a2:FALSE")).toBe("compare_high");
  });

  it("chamber 3: the door opens only once 6, 7 and 8 have all finished", () => {
    const world = new World(CHAMBER_BRANCH, specimen);
    world.finishedInputs.add(6);
    world.finishedInputs.add(8);
    tick(world, 1.5);
    expect(world.doors[0].solid.enabled).toBe(true);
    world.finishedInputs.add(7);
    tick(world, 1.5);
    expect(world.doors[0].solid.enabled).toBe(false);
  });
});

describe("bridge", () => {
  it("extends only while its target is set, and carries the player across", () => {
    const world = new World(CHAMBER_INPUT, specimen);
    const bridge = CHAMBER_INPUT.bridge;
    if (!bridge || !world.bridgeSolid) throw new Error("no bridge");
    tick(world, 1);
    expect(world.bridgeSolid.enabled).toBe(false);
    world.bridgeTarget = true;
    tick(world, 1.2);
    expect(world.bridgeExtent).toBe(1);
    standAt(world, { x: bridge.x - 60, y: bridge.y - PLAYER.height / 2 });
    const right = emptyInput();
    right.right = true;
    const events = tick(world, 3, right);
    expect(events.some((e) => e.kind === "exited")).toBe(true);
  });
});
