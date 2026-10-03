/**
 * Paces a replay for the player to watch. The replay decides *what* happens;
 * the director only decides *when* the next replay step is taken, and keeps
 * the transient visuals (active card, travelling pulse, popups, the current
 * comparison hint) that the renderer and HUD read. No DOM, no rendering.
 */

import type { SpecimenIndex } from "../data/bundle.ts";
import type { Comparison } from "../data/bundle-types.ts";
import { RUN } from "../engine/constants.ts";
import { Replay } from "./replay.ts";
import type { ConnectionLookup, ReplayStep } from "./replay.ts";

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
  from: string;
  to: string;
  elapsed: number;
  duration: number;
}

export interface RunVisual {
  /** The card execution is in, or stopped/finished at. */
  activeStageId: string | null;
  pulse: Pulse | null;
  /** Stage ids entered during this run. */
  executed: Set<string>;
  /** Connections execution followed this run, as "from>to" keys. */
  followed: Set<string>;
  /** Where the run stopped: the card and the wrong (or missing) connection. */
  failed: { from: string; to: string | null } | null;
  popups: Popup[];
  /** The comparison hint currently shown, kept until execution leaves its card. */
  comparison: Comparison | null;
}

export type DirectorEvent =
  | { kind: "reset"; input: number }
  | { kind: "started"; input: number; traceId: string }
  | { kind: "step"; step: ReplayStep };

export const connectionKey = (from: string, to: string): string => `${from}>${to}`;

function emptyVisual(): RunVisual {
  return {
    activeStageId: null,
    pulse: null,
    executed: new Set(),
    followed: new Set(),
    failed: null,
    popups: [],
    comparison: null,
  };
}

export class RunDirector {
  selectedInput: number;
  replay: Replay;
  visual: RunVisual = emptyVisual();
  fast = false;
  /** Developer step mode: replay steps only advance on `stepOnce()`. */
  stepMode = false;
  /** Number of runs started this session (debug readout). */
  runs = 0;

  private wait = 0;
  private events: DirectorEvent[] = [];

  constructor(
    private readonly index: SpecimenIndex,
    input: number,
  ) {
    this.selectedInput = input;
    this.replay = new Replay(index, input);
  }

  get running(): boolean {
    return this.replay.status === "running";
  }

  /** Choosing an input discards any run in progress: a fresh replay, nothing spliced. */
  select(input: number): void {
    this.selectedInput = input;
    this.reset();
  }

  /** Back to a fresh, not-yet-started replay of the selected input. */
  reset(): void {
    this.replay = new Replay(this.index, this.selectedInput);
    this.visual = emptyVisual();
    this.wait = 0;
    this.events.push({ kind: "reset", input: this.selectedInput });
  }

  /** Starts a fresh execution from event 0, whatever state the last one was in. */
  run(): void {
    this.replay = new Replay(this.index, this.selectedInput);
    this.replay.start();
    this.visual = emptyVisual();
    this.wait = 0;
    this.runs += 1;
    this.events.push({ kind: "started", input: this.selectedInput, traceId: this.replay.trace.id });
  }

  update(dt: number, connections: ConnectionLookup, cableLength: (from: string, to: string) => number): void {
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
    while (this.wait <= 0 && this.running && guard < 16) {
      this.takeStep(connections, cableLength);
      guard += 1;
    }
  }

  /** Developer step mode: take exactly one replay step now. */
  stepOnce(connections: ConnectionLookup, cableLength: (from: string, to: string) => number): void {
    if (!this.running) return;
    this.takeStep(connections, cableLength);
  }

  drainEvents(): DirectorEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  private takeStep(connections: ConnectionLookup, cableLength: (from: string, to: string) => number): void {
    const step = this.replay.step(connections);
    if (!step) return;
    this.events.push({ kind: "step", step });
    const v = this.visual;

    switch (step.kind) {
      case "enter": {
        const id = step.event.stage_id;
        if (v.comparison && v.comparison.stage_id !== id) v.comparison = null;
        v.activeStageId = id;
        v.executed.add(id);
        this.wait += RUN.enter;
        break;
      }
      case "semantic": {
        const s = step.semantic;
        const tone: PopupTone = s.kind === "bridge_open" ? "bridge" : s.kind === "output" ? "output" : "write";
        const shown = s.label ? `${s.label} (${s.value})` : String(s.value);
        v.popups.push({ stageId: step.event.stage_id, text: `${s.field} ← ${shown}`, tone, label: s.label, age: 0, life: 2.6 });
        this.wait += tone === "bridge" ? RUN.bridge : tone === "output" ? RUN.output : RUN.write;
        break;
      }
      case "comparison":
        v.comparison = step.comparison;
        this.wait += RUN.comparison;
        break;
      case "advance": {
        const from = step.from.stage_id;
        const to = step.to.stage_id;
        const duration = Math.min(RUN.transferMax, RUN.transferBase + cableLength(from, to) * RUN.transferPerUnit);
        v.pulse = { from, to, elapsed: 0, duration };
        v.followed.add(connectionKey(from, to));
        this.wait += duration;
        break;
      }
      case "stopped":
        v.failed = { from: step.stop.event.stage_id, to: step.stop.proposed };
        v.activeStageId = step.stop.event.stage_id;
        v.popups.push({
          stageId: step.stop.event.stage_id,
          text: step.stop.reason === "no_connection" ? "no cable out — stopped" : "execution went elsewhere",
          tone: "fail",
          age: 0,
          life: 3.2,
        });
        break;
      case "finished":
        v.activeStageId = step.event.stage_id;
        v.popups.push({ stageId: step.event.stage_id, text: "returned", tone: "done", age: 0, life: 3.2 });
        break;
    }
  }
}
