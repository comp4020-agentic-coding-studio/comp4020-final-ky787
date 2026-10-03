/**
 * Paces a replay for the player to watch. The replay decides *what* happens;
 * the director only decides *when* the next replay step is taken, and keeps
 * the transient visuals (lit machine, travelling pulse, lit port, answers,
 * write popups) that the renderer reads. No DOM, no rendering.
 *
 * Sealed (hidden) stages replay every event exactly like visible ones; they
 * are only paced faster, because there is nothing to read inside them.
 */

import type { SpecimenIndex } from "../data/bundle.ts";
import type { BranchOutcome } from "../data/bundle-types.ts";
import { RUN } from "../engine/constants.ts";
import { Replay } from "./replay.ts";
import type { PortLookup, ReplayStep } from "./replay.ts";

export type PopupTone = "write" | "output" | "bridge" | "fail" | "done";

export interface Popup {
  stageId: string;
  text: string;
  tone: PopupTone;
  /** Result label (LOW/MATCH/HIGH) of an output write, for colouring. */
  label?: string;
  age: number;
  life: number;
}

export interface Pulse {
  portId: string;
  from: string;
  to: string;
  elapsed: number;
  duration: number;
}

export interface RunVisual {
  /** The machine execution is in, or stopped/finished at. */
  activeStageId: string | null;
  pulse: Pulse | null;
  /** Stage ids entered during this run. */
  executed: Set<string>;
  /** Ports execution followed this run. */
  followedPorts: Set<string>;
  /** Ports lit by their branch activation this run. */
  litPorts: Set<string>;
  /** Where the run stopped: the stage and its active port. */
  failed: { stageId: string; portId: string | null; proposed: string | null } | null;
  popups: Popup[];
  /** The latest answer shown on each comparison machine this run. */
  answers: Map<string, BranchOutcome>;
  /** Output machines whose result write happened this run, with the label written. */
  results: Map<string, string>;
}

export type DirectorEvent =
  | { kind: "reset"; input: number | null }
  | { kind: "started"; input: number; traceId: string }
  | { kind: "step"; step: ReplayStep };

/** What the director needs to know about the chamber's presentation. */
export interface PacingView {
  visible: (stageId: string) => boolean;
  /** Seconds a pulse should take along this port's cable or pipe. */
  travel: (portId: string) => number;
}

function emptyVisual(): RunVisual {
  return {
    activeStageId: null,
    pulse: null,
    executed: new Set(),
    followedPorts: new Set(),
    litPorts: new Set(),
    failed: null,
    popups: [],
    answers: new Map(),
    results: new Map(),
  };
}

export class RunDirector {
  /** The selected program input, or null when no input cube is seated. */
  input: number | null;
  replay: Replay | null;
  visual: RunVisual = emptyVisual();
  fast = false;
  /** Developer step mode: replay steps only advance on `stepOnce()`. */
  stepMode = false;
  runs = 0;

  private wait = 0;
  private events: DirectorEvent[] = [];

  constructor(
    private readonly index: SpecimenIndex,
    input: number | null,
  ) {
    this.input = input;
    this.replay = input === null ? null : new Replay(index, input);
  }

  get running(): boolean {
    return this.replay?.status === "running";
  }

  /** A new input discards any run in progress: a fresh replay, wiring untouched. */
  select(input: number | null): void {
    this.input = input;
    this.reset();
  }

  reset(): void {
    this.replay = this.input === null ? null : new Replay(this.index, this.input);
    this.visual = emptyVisual();
    this.wait = 0;
    this.events.push({ kind: "reset", input: this.input });
  }

  /** Starts a fresh execution from event 0. False when there is no input to run. */
  run(): boolean {
    if (this.input === null) return false;
    this.replay = new Replay(this.index, this.input);
    this.replay.start();
    this.visual = emptyVisual();
    this.wait = 0;
    this.runs += 1;
    this.events.push({ kind: "started", input: this.input, traceId: this.replay.trace.id });
    return true;
  }

  update(dt: number, wiring: PortLookup, view: PacingView): void {
    const speed = this.fast ? RUN.fastFactor : 1;
    const v = this.visual;
    for (const popup of v.popups) popup.age += dt * speed;
    v.popups = v.popups.filter((p) => p.age < p.life);
    if (v.pulse) {
      v.pulse.elapsed += dt * speed;
      if (v.pulse.elapsed >= v.pulse.duration) v.pulse = null;
    }
    if (!this.running || this.stepMode) return;
    this.wait -= dt * speed;
    let guard = 0;
    while (this.wait <= 0 && this.running && guard < 32) {
      this.takeStep(wiring, view);
      guard += 1;
    }
  }

  stepOnce(wiring: PortLookup, view: PacingView): void {
    if (this.running) this.takeStep(wiring, view);
  }

  drainEvents(): DirectorEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  private takeStep(wiring: PortLookup, view: PacingView): void {
    const step = this.replay?.step(wiring);
    if (!step) return;
    this.events.push({ kind: "step", step });
    const v = this.visual;
    const shown = (stageId: string): boolean => view.visible(stageId);

    switch (step.kind) {
      case "enter": {
        const id = step.event.stage_id;
        v.activeStageId = id;
        v.executed.add(id);
        this.wait += shown(id) ? RUN.enter : RUN.hidden;
        break;
      }
      case "comparison":
        // The answer is shown at the feedback step; the CMP itself is brief.
        this.wait += RUN.hidden;
        break;
      case "feedback":
        v.answers.set(step.outcome.stage_id, step.outcome);
        this.wait += shown(step.outcome.stage_id) ? RUN.feedback : RUN.hidden;
        break;
      case "activation":
        v.litPorts.add(step.outcome.selected_port_id);
        this.wait += shown(step.outcome.stage_id) ? RUN.activation : RUN.hidden;
        break;
      case "semantic": {
        const s = step.semantic;
        const id = step.event.stage_id;
        const tone: PopupTone = s.kind === "bridge_open" ? "bridge" : s.kind === "output" ? "output" : "write";
        if (s.kind === "output" && s.label) v.results.set(id, s.label);
        // The bridge write always shows: it is the room's physical consequence.
        if (shown(id) || tone === "bridge") {
          const value = s.label ?? String(s.value);
          v.popups.push({ stageId: id, text: `${s.field.toUpperCase()} = ${value}`, tone, label: s.label, age: 0, life: 2.6 });
        }
        this.wait += tone === "bridge" ? RUN.bridge : !shown(id) ? RUN.hidden : tone === "output" ? RUN.output : RUN.write;
        break;
      }
      case "advance": {
        const duration = view.travel(step.portId);
        v.pulse = { portId: step.portId, from: step.from.stage_id, to: step.to.stage_id, elapsed: 0, duration };
        v.followedPorts.add(step.portId);
        this.wait += duration;
        break;
      }
      case "stopped":
        v.failed = { stageId: step.stop.event.stage_id, portId: step.stop.portId, proposed: step.stop.proposed };
        v.activeStageId = step.stop.event.stage_id;
        v.popups.push({
          stageId: step.stop.event.stage_id,
          text: step.stop.reason === "no_connection" ? "NOT CONNECTED" : "WRONG WAY",
          tone: "fail",
          age: 0,
          life: 3.2,
        });
        break;
      case "finished":
        v.activeStageId = step.event.stage_id;
        break;
    }
  }
}
