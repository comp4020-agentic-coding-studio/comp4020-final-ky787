/**
 * Replay contract: chronological occurrences, stop on the first wrong next
 * stage, nothing processed after a stop, fresh run per input, and the bridge
 * opening only on its own retained semantic event.
 */

import { describe, expect, it } from "vitest";
import type { Trace } from "../src/data/bundle-types.ts";
import { loadSpecimen } from "../src/data/specimen.ts";
import { RunDirector } from "../src/replay/director.ts";
import { Replay, tryConnection } from "../src/replay/replay.ts";
import type { ReplayStep } from "../src/replay/replay.ts";

const specimen = loadSpecimen();
const trace = (input: number): Trace => specimen.traceForInput(input);

/** The wiring a trace actually takes, read from its own occurrences. */
function wiringOf(t: Trace): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of t.events) if (e.next_stage_id) map.set(e.stage_id, e.next_stage_id);
  return map;
}

function runToEnd(replay: Replay, wiring: Map<string, string>): ReplayStep[] {
  const steps: ReplayStep[] = [];
  replay.start();
  for (let guard = 0; guard < 500; guard += 1) {
    const step = replay.step((id) => wiring.get(id) ?? null);
    if (!step) break;
    steps.push(step);
  }
  return steps;
}

describe("replay with the correct wiring", () => {
  it.each([6, 7, 8])("input %i finishes with the retained final state", (input) => {
    const t = trace(input);
    const replay = new Replay(specimen, input);
    const steps = runToEnd(replay, wiringOf(t));
    expect(replay.status).toBe("finished");
    expect(replay.state).toEqual(t.final_state);
    expect(replay.entered.map((e) => e.id)).toEqual(t.events.map((e) => e.id));
    expect(steps.at(-1)?.kind).toBe("finished");
  });

  it.each([6, 7, 8])("input %i processes every retained hint and write, in step order", (input) => {
    const t = trace(input);
    const replay = new Replay(specimen, input);
    const steps = runToEnd(replay, wiringOf(t));
    const processed = steps.flatMap((s) =>
      s.kind === "semantic" ? [s.semantic.id] : s.kind === "comparison" ? [s.comparison.id] : [],
    );
    expect(processed).toEqual([...t.timeline].sort((a, b) => a.step_index - b.step_index).map((e) => e.id));
  });

  it("opens the bridge only for input 7, at its bridge_open event", () => {
    for (const input of [6, 8]) {
      const replay = new Replay(specimen, input);
      runToEnd(replay, wiringOf(trace(input)));
      expect(replay.bridgeOpen, `input ${input}`).toBe(false);
    }

    const replay = new Replay(specimen, 7);
    const wiring = wiringOf(trace(7));
    replay.start();
    let openedBy: string | null = null;
    for (let guard = 0; guard < 200 && replay.status === "running"; guard += 1) {
      const before = replay.bridgeOpen;
      const step = replay.step((id) => wiring.get(id) ?? null);
      if (!before && replay.bridgeOpen) {
        expect(step?.kind).toBe("semantic");
        if (step?.kind === "semantic") openedBy = step.semantic.kind;
      }
    }
    expect(openedBy).toBe("bridge_open");
    expect(replay.bridgeEvent?.instruction_address).toBe("0x14000126e");
  });

  it("does not open the bridge on reaching the MATCH card, only on the write", () => {
    const replay = new Replay(specimen, 7);
    const wiring = wiringOf(trace(7));
    replay.start();
    for (let guard = 0; guard < 200; guard += 1) {
      const step = replay.step((id) => wiring.get(id) ?? null);
      if (step?.kind === "enter" && step.event.stage_id === "match") break;
    }
    expect(replay.currentEvent?.stage_id).toBe("match");
    expect(replay.bridgeOpen).toBe(false);
    expect(replay.state.result).toBe(-999);
  });

  it("never pre-applies a stage's state_after on entry", () => {
    const replay = new Replay(specimen, 7);
    const wiring = wiringOf(trace(7));
    replay.start();
    replay.step((id) => wiring.get(id) ?? null); // enter entry
    replay.step((id) => wiring.get(id) ?? null); // advance
    const enter = replay.step((id) => wiring.get(id) ?? null);
    expect(enter?.kind === "enter" && enter.event.stage_id).toBe("calculate_compare");
    expect(replay.state).toEqual({ value: -999, result: -999, bridge_open: -999 });
  });
});

describe("replay stops on the first wrong connection", () => {
  it("input 7 wired into the MATCH clone stops at compare_high with the bridge shut", () => {
    const wiring = wiringOf(trace(7));
    wiring.set("compare_high", "decoy_match");
    const replay = new Replay(specimen, 7);
    const steps = runToEnd(replay, wiring);
    expect(replay.status).toBe("stopped");
    expect(replay.stop).toMatchObject({
      reason: "wrong_connection",
      proposed: "decoy_match",
      expected: "match",
    });
    expect(replay.stop?.event.stage_id).toBe("compare_high");
    expect(replay.bridgeOpen).toBe(false);
    expect(replay.processedSemantic.map((s) => s.id)).toEqual(["input_7/semantic/0", "input_7/semantic/1"]);
    expect(steps.some((s) => s.kind === "enter" && s.event.stage_id === "match")).toBe(false);
    // Latched: nothing more is processed, whatever the wiring becomes.
    expect(replay.step((id) => wiringOf(trace(7)).get(id) ?? null)).toBeNull();
    expect(replay.bridgeOpen).toBe(false);
  });

  it("an edge from the union stage graph is still wrong for the chosen occurrence", () => {
    // calculate_compare -> compare_high is valid for inputs 7 and 8, not 6.
    const wiring = wiringOf(trace(6));
    wiring.set("calculate_compare", "compare_high");
    const replay = new Replay(specimen, 6);
    runToEnd(replay, wiring);
    expect(replay.status).toBe("stopped");
    expect(replay.stop?.event.stage_id).toBe("calculate_compare");
    expect(replay.state.result).toBe(-999);
    // The comparison hint at the stopping card was still shown: it precedes the check.
    expect(replay.processedComparisons.map((c) => c.hint)).toEqual(["LOW"]);
  });

  it("a missing cable stops the run as no_connection", () => {
    const replay = new Replay(specimen, 8);
    runToEnd(replay, new Map());
    expect(replay.status).toBe("stopped");
    expect(replay.stop).toMatchObject({ reason: "no_connection", proposed: null });
    expect(replay.stop?.event.stage_id).toBe("entry");
  });

  it("the analysis candidates are never a retained next stage", () => {
    for (const t of specimen.bundle.traces) {
      for (const [i, event] of t.events.entries()) {
        expect(["decoy_low", "decoy_match"]).not.toContain(event.stage_id);
        for (const decoy of ["decoy_low", "decoy_match"]) {
          const verdict = tryConnection(t, i, decoy);
          expect(verdict.status === "advance").toBe(false);
        }
      }
    }
  });

  it("the final occurrence finishes whatever is plugged into it", () => {
    const t = trace(7);
    const last = t.events.length - 1;
    expect(tryConnection(t, last, null).status).toBe("finished");
    expect(tryConnection(t, last, "entry").status).toBe("finished");
    expect(tryConnection(t, last + 1, null).status).toBe("invalid_cursor");
  });
});

describe("run director", () => {
  const cable = (): number => 400;

  it("a new input or a new run starts a fresh replay, never a splice", () => {
    const director = new RunDirector(specimen, 7);
    const wiring = wiringOf(trace(7));
    director.run();
    for (let i = 0; i < 2000 && director.running; i += 1) director.update(0.05, (id) => wiring.get(id) ?? null, cable);
    expect(director.replay.status).toBe("finished");
    expect(director.replay.bridgeOpen).toBe(true);

    director.select(6);
    expect(director.replay.input).toBe(6);
    expect(director.replay.status).toBe("ready");
    expect(director.replay.bridgeOpen).toBe(false);
    expect(director.replay.state).toEqual(trace(6).initial_state);
    expect(director.visual.executed.size).toBe(0);

    director.select(7);
    director.run();
    expect(director.replay.cursor).toBe(0);
    expect(director.replay.bridgeOpen).toBe(false);
  });

  it("paces steps over time and records the cables execution followed", () => {
    const director = new RunDirector(specimen, 8);
    const wiring = wiringOf(trace(8));
    director.run();
    director.update(0.001, (id) => wiring.get(id) ?? null, cable);
    expect(director.running).toBe(true);
    for (let i = 0; i < 2000 && director.running; i += 1) director.update(0.05, (id) => wiring.get(id) ?? null, cable);
    expect(director.replay.status).toBe("finished");
    expect([...director.visual.followed]).toEqual([
      "entry>calculate_compare",
      "calculate_compare>compare_high",
      "compare_high>high",
      "high>end",
    ]);
  });

  it("step mode only advances on demand", () => {
    const director = new RunDirector(specimen, 7);
    director.stepMode = true;
    director.run();
    director.update(5, () => null, cable);
    expect(director.replay.entered).toHaveLength(0);
    director.stepOnce(() => null, cable);
    expect(director.replay.entered).toHaveLength(1);
  });
});
