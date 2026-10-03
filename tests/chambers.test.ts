/**
 * Every tutorial chamber is a faithful presentation of the one specimen, in
 * the v2 tutorial contract's terms: hidden stages are still placed (sealed)
 * wherever a run can reach them, pre-wired routes are exactly the verified
 * destinations, every port a run can traverse is either pre-wired or wired by
 * the player, decoys stay out, and the correct circuit finishes every input
 * the chamber can run.
 */

import { describe, expect, it } from "vitest";
import { loadSpecimen } from "../src/data/specimen.ts";
import { CHAMBERS } from "../src/level/chambers.ts";
import { Replay } from "../src/replay/replay.ts";

const specimen = loadSpecimen();
const inputsFor = (c: (typeof CHAMBERS)[number]): number[] =>
  c.fixedInput !== null ? [c.fixedInput] : c.sockets.some((s) => s.kind === "input") ? specimen.inputs : [];

describe.each(CHAMBERS)("chamber $number · $title", (chamber) => {
  const placed = new Map(chamber.stages.map((s) => [s.stageId, s]));

  it("places real, distinct stages and never a decoy", () => {
    expect(placed.size).toBe(chamber.stages.length);
    for (const s of chamber.stages) {
      expect(specimen.stage(s.stageId).kind).not.toBe("analysis_candidate");
    }
  });

  it("pre-wires only verified destinations and never a player-editable port", () => {
    for (const [port, to] of Object.entries(chamber.prewired)) {
      expect(specimen.port(port).expected_destination_stage_id, port).toBe(to);
      expect(chamber.editablePorts).not.toContain(port);
    }
  });

  it("gives every editable port a jack on a visible machine, with visible targets", () => {
    for (const port of chamber.editablePorts) {
      const owner = specimen.port(port).owner_stage_id;
      expect(placed.get(owner)?.mode, port).toBe("machine");
      const target = specimen.port(port).expected_destination_stage_id;
      expect(placed.get(target)?.mode, `${port} → ${target}`).toBe("machine");
    }
  });

  it("covers every stage and port its runs can reach", () => {
    for (const input of inputsFor(chamber)) {
      for (const event of specimen.traceForInput(input).events) {
        expect(placed.has(event.stage_id), `input ${input} enters ${event.stage_id}`).toBe(true);
        if (event.exit_port_id) {
          const covered = event.exit_port_id in chamber.prewired || chamber.editablePorts.includes(event.exit_port_id);
          expect(covered, `input ${input} leaves via ${event.exit_port_id}`).toBe(true);
        }
      }
    }
  });

  it("finishes every input it can run once the editable ports are wired correctly", () => {
    const wiring = new Map(Object.entries(chamber.prewired));
    for (const port of chamber.editablePorts) wiring.set(port, specimen.port(port).expected_destination_stage_id);
    for (const input of inputsFor(chamber)) {
      const replay = new Replay(specimen, input);
      replay.start();
      for (let i = 0; i < 500 && replay.status === "running"; i += 1) replay.step((p) => wiring.get(p) ?? null);
      expect(replay.status, `input ${input}`).toBe("finished");
      // Hidden stages ran their retained events too: the state is the real final state.
      expect(replay.state).toEqual(specimen.traceForInput(input).final_state);
    }
  });

  it("references only its own cubes, sockets and ports", () => {
    const sockets = new Set(chamber.sockets.map((s) => s.id));
    const cubes = new Set(chamber.cubes.map((c) => c.id));
    for (const door of chamber.doors) {
      if (door.rule.kind === "socket") expect(sockets.has(door.rule.socketId)).toBe(true);
      else for (const n of door.rule.inputs) expect(specimen.inputs).toContain(n);
    }
    for (const sign of chamber.signs) {
      const f = sign.fadeWhen;
      if (f?.kind === "cube_carried") expect(cubes.has(f.cubeId)).toBe(true);
      if (f?.kind === "socket_filled") expect(sockets.has(f.socketId)).toBe(true);
      if (f?.kind === "ports_wired") for (const p of f.portIds) expect(chamber.editablePorts).toContain(p);
    }
    for (const conduit of chamber.conduits) expect(sockets.has(conduit.socketId)).toBe(true);
    for (const cube of chamber.cubes) {
      if (cube.kind === "input") expect(specimen.inputs).toContain(cube.value);
    }
  });
});

describe("the tutorial progression", () => {
  const [power, connect, input, branch] = CHAMBERS;

  it("0 POWER has no code at all", () => {
    expect(power.stages).toEqual([]);
    expect(power.sockets.map((s) => s.kind)).toEqual(["power"]);
  });

  it("1 CONNECT asks for one cable and a physical RUN, on a fixed input that opens the bridge", () => {
    expect(connect.editablePorts).toHaveLength(1);
    expect(connect.stages.filter((s) => s.mode === "machine")).toHaveLength(2);
    expect(connect.sockets.map((s) => s.kind)).toEqual(["run"]);
    expect(specimen.traceForInput(connect.fixedInput as number).semantic_events.some((s) => s.kind === "bridge_open")).toBe(true);
    expect(connect.bridge).not.toBeNull();
  });

  it("2 INPUT offers every input as a cube, wires nothing, and only one input opens its bridge", () => {
    expect(input.editablePorts).toEqual([]);
    expect(input.cubes.filter((c) => c.kind === "input").map((c) => c.value)).toEqual(specimen.inputs);
    const opens = specimen.inputs.filter((n) => specimen.traceForInput(n).semantic_events.some((s) => s.kind === "bridge_open"));
    expect(opens).toEqual([7]);
  });

  it("3 BRANCH exposes exactly the first comparison's TRUE and FALSE", () => {
    const site = specimen.siteForStage("calculate_compare");
    expect(branch.editablePorts.sort()).toEqual([site?.outputs.TRUE.port_id, site?.outputs.FALSE.port_id].sort());
    expect(branch.showFeedback).toBe(true);
    expect(branch.doors[0].rule).toEqual({ kind: "inputs_finished", inputs: [6, 7, 8] });
  });
});
