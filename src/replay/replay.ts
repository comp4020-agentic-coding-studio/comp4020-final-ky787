/**
 * Chronological replay of one retained execution against persistent port
 * wiring, following the v2 replay contract (`game_data/README.md` in the
 * evidence workspace):
 *
 * - wiring is a map from stable output-port id to destination stage id,
 *   independent of the selected input — player cables and a chamber's
 *   pre-wired routes alike;
 * - one trace per selected input; a new input or a new run starts a fresh
 *   replay at event 0, never a splice, and leaves the wiring untouched;
 * - within a stage occurrence, its comparison/write events and its branch
 *   feedback/port activation are processed one at a time in instruction-step
 *   order — `state_after` is never pre-applied;
 * - at the occurrence's exit only its `exit_port_id` is consulted: the
 *   connection there must equal both the port's expected destination and the
 *   occurrence's `next_stage_id`. Inactive ports are never followed;
 * - a missing or wrong active connection latches the stopped state: no later
 *   feedback, output or bridge event is ever processed by this replay;
 * - the bridge opens only on a processed `bridge_open` semantic event.
 *
 * It does not consult the static CFG, the union stage graph, or visibility.
 * Hidden stages replay exactly like visible ones. Pure: no DOM, no timing.
 */

import type { SpecimenIndex, StageStep } from "../data/bundle.ts";
import type {
  BranchOutcome,
  Comparison,
  SemanticEvent,
  StageEvent,
  StateSnapshot,
  Trace,
} from "../data/bundle-types.ts";

export type ReplayStatus = "ready" | "running" | "stopped" | "finished";

/** Why a run stopped. `no_connection` is the active port left unplugged. */
export type StopReason = "wrong_connection" | "no_connection" | "invalid_exit";

export interface StopRecord {
  reason: StopReason;
  event: StageEvent;
  portId: string | null;
  proposed: string | null;
  /** The real destination. Developer view only; the player UI does not show it. */
  expected: string | null;
}

export type ReplayStep =
  | { kind: "enter"; event: StageEvent }
  | { kind: "semantic"; event: StageEvent; semantic: SemanticEvent }
  | { kind: "comparison"; event: StageEvent; comparison: Comparison }
  | { kind: "feedback"; event: StageEvent; outcome: BranchOutcome }
  | { kind: "activation"; event: StageEvent; outcome: BranchOutcome }
  | { kind: "advance"; from: StageEvent; to: StageEvent; portId: string }
  | { kind: "stopped"; stop: StopRecord }
  | { kind: "finished"; event: StageEvent };

/** Persistent wiring: the stage an output port is connected to, if any. */
export type PortLookup = (portId: string) => string | null;

export type ExitVerdict =
  | { status: "finished" }
  | { status: "advance"; cursor: number }
  | { status: "stop"; reason: StopReason; proposed: string | null; expected: string | null };

/**
 * The contract's exit check for the occurrence at `cursor`. Call it only after
 * that occurrence has completed.
 */
export function checkExit(index: SpecimenIndex, trace: Trace, cursor: number, wiring: PortLookup): ExitVerdict {
  const event = trace.events[cursor];
  if (!event) return { status: "stop", reason: "invalid_exit", proposed: null, expected: null };
  if (event.next_event_id === null) return { status: "finished" };
  if (!event.exit_port_id) return { status: "stop", reason: "invalid_exit", proposed: null, expected: event.next_stage_id };
  const port = index.port(event.exit_port_id);
  const proposed = wiring(port.id);
  if (proposed === null) return { status: "stop", reason: "no_connection", proposed, expected: event.next_stage_id };
  if (proposed !== port.expected_destination_stage_id || proposed !== event.next_stage_id) {
    return { status: "stop", reason: "wrong_connection", proposed, expected: event.next_stage_id };
  }
  return { status: "advance", cursor: cursor + 1 };
}

export class Replay {
  readonly trace: Trace;
  status: ReplayStatus = "ready";
  /** Index into `trace.events`; an occurrence cursor, never a visited set. */
  cursor: number;
  /** Controller state as written by processed events only. Starts at the harness sentinel. */
  readonly state: StateSnapshot;
  /** Latched true only by a processed `bridge_open` semantic event. */
  bridgeOpen = false;
  bridgeEvent: SemanticEvent | null = null;
  readonly processedSemantic: SemanticEvent[] = [];
  readonly processedComparisons: Comparison[] = [];
  /** Branch answers shown so far, in order. */
  readonly outcomesShown: BranchOutcome[] = [];
  /** Ports that have been activated (illuminated) this run. */
  readonly activatedPorts: string[] = [];
  /** Stage occurrences execution has entered, in order. */
  readonly entered: StageEvent[] = [];
  /** Ports execution actually followed this run. */
  readonly followedPorts: string[] = [];
  stop: StopRecord | null = null;

  private pending: StageStep[] = [];
  private inStage = false;

  constructor(
    private readonly index: SpecimenIndex,
    readonly input: number,
  ) {
    this.trace = index.traceForInput(input);
    this.cursor = index.bundle.replay_contract.start_event_index;
    this.state = { ...this.trace.initial_state };
  }

  get currentEvent(): StageEvent | null {
    return this.trace.events[this.cursor] ?? null;
  }

  get lastOutcome(): BranchOutcome | null {
    return this.outcomesShown.at(-1) ?? null;
  }

  /** Remaining steps in the current occurrence (debug view). */
  get pendingSteps(): readonly StageStep[] {
    return this.pending;
  }

  get isInStage(): boolean {
    return this.inStage;
  }

  start(): void {
    if (this.status === "ready") this.status = "running";
  }

  /** Performs exactly one replay action and reports it, or null once not running. */
  step(wiring: PortLookup): ReplayStep | null {
    if (this.status !== "running") return null;
    const event = this.currentEvent;
    if (!event) {
      return this.halt({ reason: "invalid_exit", event: this.trace.events[0], portId: null, proposed: null, expected: null });
    }

    if (!this.inStage) {
      this.inStage = true;
      this.pending = this.index.stageTimeline(this.trace, event);
      this.entered.push(event);
      return { kind: "enter", event };
    }

    const next = this.pending.shift();
    if (next) {
      switch (next.kind) {
        case "comparison": {
          const comparison = this.index.comparison(next.id);
          this.processedComparisons.push(comparison);
          return { kind: "comparison", event, comparison };
        }
        case "semantic": {
          const semantic = this.index.semantic(next.id);
          this.applyWrite(semantic);
          return { kind: "semantic", event, semantic };
        }
        case "feedback": {
          const outcome = this.index.outcome(next.id);
          this.outcomesShown.push(outcome);
          return { kind: "feedback", event, outcome };
        }
        case "activation": {
          const outcome = this.index.outcome(next.id);
          this.activatedPorts.push(outcome.selected_port_id);
          return { kind: "activation", event, outcome };
        }
      }
    }

    // The occurrence has completed; only now is its active port consulted.
    const verdict = checkExit(this.index, this.trace, this.cursor, wiring);
    switch (verdict.status) {
      case "finished":
        this.status = "finished";
        return { kind: "finished", event };
      case "advance": {
        const to = this.trace.events[verdict.cursor];
        const portId = event.exit_port_id as string;
        this.followedPorts.push(portId);
        this.cursor = verdict.cursor;
        this.inStage = false;
        this.pending = [];
        return { kind: "advance", from: event, to, portId };
      }
      case "stop":
        return this.halt({
          reason: verdict.reason,
          event,
          portId: event.exit_port_id,
          proposed: verdict.proposed,
          expected: verdict.expected,
        });
    }
  }

  private halt(stop: StopRecord): ReplayStep {
    this.status = "stopped";
    this.stop = stop;
    this.pending = [];
    return { kind: "stopped", stop };
  }

  private applyWrite(semantic: SemanticEvent): void {
    this.state[semantic.field] = semantic.value;
    this.processedSemantic.push(semantic);
    if (semantic.kind === "bridge_open") {
      this.bridgeOpen = true;
      this.bridgeEvent = semantic;
    }
  }
}
