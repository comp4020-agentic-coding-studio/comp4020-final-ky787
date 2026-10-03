/**
 * v2 replay contract: persistent port wiring, only the active port is
 * consulted, stop on the first wrong or missing active connection with
 * nothing processed after it, a fresh replay per input that never touches
 * the wiring, and the bridge opening only at its own retained write.
 */

import { describe, expect, it } from "vitest";
import { loadSpecimen } from "../src/data/specimen.ts";
import type { PacingView } from "../src/replay/director.ts";
import { RunDirector } from "../src/replay/director.ts";
import { checkExit, Replay } from "../src/replay/replay.ts";
import type { PortLookup, ReplayStep } from "../src/replay/replay.ts";

const specimen = loadSpecimen();

/** The full correct circuit, read from the bundle's ports — one map for every input. */
const CORRECT = new Map(specimen.bundle.output_ports.map((p) => [p.id, p.expected_destination_stage_id]));
const lookup = (wiring: Map<string, string>): PortLookup => (port) => wiring.get(port) ?? null;
const pacing: PacingView = { visible: () => true, travel: () => 0.2 };

function runToEnd(replay: Replay, wiring: Map<string, string>): ReplayStep[] {
  const steps: ReplayStep[] = [];
  replay.start();
  for (let guard = 0; guard < 500; guard += 1) {
    const step = replay.step(lookup(wiring));
    if (!step) break;
    steps.push(step);
  }
  return steps;
}

describe("one circuit serves every input", () => {
  it.each([6, 7, 8])("input %i finishes on the same wiring with its retained final state", (input) => {
    const trace = specimen.traceForInput(input);
    const replay = new Replay(specimen, input);
    runToEnd(replay, CORRECT);
    expect(replay.status).toBe("finished");
    expect(replay.state).toEqual(trace.final_state);
    expect(replay.entered.map((e) => e.id)).toEqual(trace.events.map((e) => e.id));
  });

  it("each input lights different branch ports", () => {
    const lit = (input: number): string[] => {
      const replay = new Replay(specimen, input);
      runToEnd(replay, CORRECT);
      return replay.activatedPorts;
    };
    expect(lit(6)).toEqual(["cmp_000010a2:TRUE"]);
    expect(lit(7)).toEqual(["cmp_000010a2:FALSE", "cmp_00001183:FALSE"]);
    expect(lit(8)).toEqual(["cmp_000010a2:FALSE", "cmp_00001183:TRUE"]);
  });

  it("shows the exported TRUE/FALSE feedback, not LOW/MATCH/HIGH", () => {
    const replay = new Replay(specimen, 6);
    const steps = runToEnd(replay, CORRECT);
    const feedback = steps.flatMap((s) => (s.kind === "feedback" ? [s.outcome.feedback.lines] : []));
    expect(feedback).toEqual([["VALUE = 19", "19 < 22", "TRUE"]]);
  });

  it.each([6, 7, 8])("input %i processes every retained write and outcome in step order", (input) => {
    const trace = specimen.traceForInput(input);
    const replay = new Replay(specimen, input);
    const steps = runToEnd(replay, CORRECT);
    const seen = steps.flatMap((s) =>
      s.kind === "semantic" ? [s.semantic.id] : s.kind === "comparison" ? [s.comparison.id] : [],
    );
    expect(seen).toEqual([...trace.timeline].sort((a, b) => a.step_index - b.step_index).map((e) => e.id));
    expect(replay.outcomesShown.map((o) => o.id)).toEqual(trace.branch_outcomes.map((o) => o.id));
  });
});

describe("the bridge", () => {
  it("opens only for input 7, exactly at its bridge_open write", () => {
    for (const input of [6, 8]) {
      const replay = new Replay(specimen, input);
      runToEnd(replay, CORRECT);
      expect(replay.bridgeOpen, `input ${input}`).toBe(false);
    }
    const replay = new Replay(specimen, 7);
    replay.start();
    let openedBy: ReplayStep | null = null;
    for (let i = 0; i < 300 && replay.status === "running"; i += 1) {
      const before = replay.bridgeOpen;
      const step = replay.step(lookup(CORRECT));
      if (!before && replay.bridgeOpen) openedBy = step;
    }
    expect(openedBy?.kind === "semantic" && openedBy.semantic.kind).toBe("bridge_open");
    expect(replay.bridgeEvent?.instruction_rva).toBe("0x126e");
  });

  it("stays shut on reaching MATCH until the write itself, and branch answers never open it", () => {
    const replay = new Replay(specimen, 7);
    replay.start();
    for (let i = 0; i < 300; i += 1) {
      const step = replay.step(lookup(CORRECT));
      if (step?.kind === "feedback" || step?.kind === "activation") expect(replay.bridgeOpen).toBe(false);
      if (step?.kind === "enter" && step.event.stage_id === "match") break;
    }
    expect(replay.bridgeOpen).toBe(false);
    expect(replay.state.result).toBe(-999);
  });
});

describe("stopping", () => {
  it("swapped TRUE/FALSE cables stop input 6 at the first comparison, before any output", () => {
    const wiring = new Map(CORRECT);
    wiring.set("cmp_000010a2:TRUE", "compare_high");
    wiring.set("cmp_000010a2:FALSE", "low");
    const replay = new Replay(specimen, 6);
    runToEnd(replay, wiring);
    expect(replay.status).toBe("stopped");
    expect(replay.stop).toMatchObject({ reason: "wrong_connection", portId: "cmp_000010a2:TRUE", proposed: "compare_high", expected: "low" });
    // The answer was shown and the port lit before the exit check.
    expect(replay.activatedPorts).toEqual(["cmp_000010a2:TRUE"]);
    expect(replay.state.result).toBe(-999);
    expect(replay.step(lookup(CORRECT))).toBeNull();
  });

  it("an inactive wrong or missing port is never consulted", () => {
    const wiring = new Map(CORRECT);
    wiring.delete("cmp_000010a2:TRUE");
    wiring.set("cmp_00001183:TRUE", "low");
    const replay = new Replay(specimen, 7);
    runToEnd(replay, wiring);
    expect(replay.status).toBe("finished");
    expect(replay.bridgeOpen).toBe(true);
  });

  it("a missing active connection stops as no_connection with no later effects", () => {
    const wiring = new Map(CORRECT);
    wiring.delete("cmp_00001183:FALSE");
    const replay = new Replay(specimen, 7);
    runToEnd(replay, wiring);
    expect(replay.stop).toMatchObject({ reason: "no_connection", portId: "cmp_00001183:FALSE" });
    expect(replay.bridgeOpen).toBe(false);
    expect(replay.processedSemantic.map((s) => s.kind)).toEqual(["state_write", "state_write"]);
  });

  it("a connection must match both the port's destination and the occurrence's next stage", () => {
    const trace = specimen.traceForInput(7);
    // calculate_compare exits via FALSE; plugging FALSE into `high` matches neither.
    const verdict = checkExit(specimen, trace, 1, () => "high");
    expect(verdict).toMatchObject({ status: "stop", reason: "wrong_connection" });
    expect(checkExit(specimen, trace, trace.events.length - 1, () => null)).toEqual({ status: "finished" });
  });

  it("decoys are never a valid destination", () => {
    for (const trace of specimen.bundle.traces) {
      trace.events.forEach((_, i) => {
        for (const decoy of ["decoy_low", "decoy_match"]) {
          expect(checkExit(specimen, trace, i, () => decoy).status === "advance").toBe(false);
        }
      });
    }
  });
});

describe("run director", () => {
  it("a new input is a fresh replay and leaves the wiring alone", () => {
    const director = new RunDirector(specimen, 7);
    director.run();
    for (let i = 0; i < 3000 && director.running; i += 1) director.update(0.05, lookup(CORRECT), pacing);
    expect(director.replay?.bridgeOpen).toBe(true);
    director.select(6);
    expect(director.replay?.status).toBe("ready");
    expect(director.replay?.bridgeOpen).toBe(false);
    expect(director.visual.litPorts.size).toBe(0);
    director.select(null);
    expect(director.replay).toBeNull();
    expect(director.run()).toBe(false);
  });

  it("paces sealed stages faster but replays the same steps", () => {
    const count = (visible: boolean): number => {
      const director = new RunDirector(specimen, 8);
      director.run();
      let frames = 0;
      while (director.running && frames < 5000) {
        director.update(1 / 60, lookup(CORRECT), { visible: () => visible, travel: () => 0.2 });
        frames += 1;
      }
      expect(director.replay?.status).toBe("finished");
      expect([...director.visual.followedPorts]).toEqual(["entry:NEXT", "cmp_000010a2:FALSE", "cmp_00001183:TRUE", "high:NEXT"]);
      return frames;
    };
    expect(count(false)).toBeLessThan(count(true));
  });

  it("step mode only advances on demand", () => {
    const director = new RunDirector(specimen, 7);
    director.stepMode = true;
    director.run();
    director.update(5, lookup(CORRECT), pacing);
    expect(director.replay?.entered).toHaveLength(0);
    director.stepOnce(lookup(CORRECT), pacing);
    expect(director.replay?.entered).toHaveLength(1);
  });
});
