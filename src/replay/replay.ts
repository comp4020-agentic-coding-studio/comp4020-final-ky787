/**
 * Chronological replay of one retained execution against the player's wiring.
 *
 * This follows the bundle's replay contract (`game_data/README.md` in the
 * evidence workspace) and nothing else:
 *
 * - one trace per selected input; a new input or a new run starts a fresh
 *   replay at event 0, never a splice;
 * - within a stage occurrence, comparison and write events are processed one
 *   at a time in instruction-step order — `state_after` is never pre-applied;
 * - only once the stage has completed is the player's proposed next stage
 *   compared with that occurrence's `next_stage_id`;
 * - a mismatch latches the stopped state: no later hint, output or bridge
 *   event is ever processed by this replay;
 * - the bridge opens only on a processed `bridge_open` semantic event.
 *
 * It does not consult the static CFG or the union stage graph. It is pure (no
 * DOM, no timing) so tests drive the same object the game animates.
 */

import type { SpecimenIndex } from "../data/bundle.ts";
import type {
  Comparison,
  SemanticEvent,
  StageEvent,
  StateSnapshot,
  TimelineEntry,
  Trace,
} from "../data/bundle-types.ts";

export type ConnectionStatus = "invalid_cursor" | "finished" | "stopped_wrong_connection" | "advance";

/**
 * The contract's reference check, kept in its documented shape. Call it only
 * after the current stage occurrence has completed.
 */
export function tryConnection(
  trace: Trace,
  cursor: number,
  proposedStageId: string | null,
): { status: ConnectionStatus; cursor: number } {
  const current = trace.events[cursor];
  if (!current) return { status: "invalid_cursor", cursor };
  if (current.next_event_id === null) return { status: "finished", cursor };
  if (proposedStageId !== current.next_stage_id) return { status: "stopped_wrong_connection", cursor };
  return { status: "advance", cursor: cursor + 1 };
}

export type ReplayStatus = "ready" | "running" | "stopped" | "finished";

/** Why a run stopped. `no_connection` is a wrong connection with nothing plugged in. */
export type StopReason = "wrong_connection" | "no_connection" | "invalid_cursor";

export interface StopRecord {
  reason: StopReason;
  event: StageEvent;
  proposed: string | null;
  /** The occurrence's real next stage. Developer view only; the player UI does not show it. */
  expected: string | null;
}

export type ReplayStep =
  | { kind: "enter"; event: StageEvent }
  | { kind: "semantic"; event: StageEvent; semantic: SemanticEvent }
  | { kind: "comparison"; event: StageEvent; comparison: Comparison }
  | { kind: "advance"; from: StageEvent; to: StageEvent }
  | { kind: "stopped"; stop: StopRecord }
  | { kind: "finished"; event: StageEvent };

/** The player's wiring: which stage each stage's output is plugged into. */
export type ConnectionLookup = (stageId: string) => string | null;

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
  /** Stage occurrences execution has entered, in order. */
  readonly entered: StageEvent[] = [];
  /** Connections that execution actually followed, as [from, to] stage ids. */
  readonly followed: [string, string][] = [];
  stop: StopRecord | null = null;

  /** Timeline entries of the current occurrence not yet processed. */
  private pending: TimelineEntry[] = [];
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

  /** The most recent comparison processed in this run, if any. */
  get lastComparison(): Comparison | null {
    return this.processedComparisons.at(-1) ?? null;
  }

  /** Remaining timeline entries in the current occurrence (debug view). */
  get pendingEntries(): readonly TimelineEntry[] {
    return this.pending;
  }

  get isInStage(): boolean {
    return this.inStage;
  }

  start(): void {
    if (this.status !== "ready") return;
    this.status = "running";
  }

  /**
   * Performs exactly one replay action and reports it, or returns null once
   * the run is no longer running. The caller decides the pacing.
   */
  step(connections: ConnectionLookup): ReplayStep | null {
    if (this.status !== "running") return null;
    const event = this.currentEvent;
    if (!event) return this.halt({ reason: "invalid_cursor", event: this.trace.events[0], proposed: null, expected: null });

    if (!this.inStage) {
      this.inStage = true;
      this.pending = this.index.stageTimeline(this.trace, event);
      this.entered.push(event);
      return { kind: "enter", event };
    }

    const entry = this.pending.shift();
    if (entry) {
      if (entry.kind === "comparison") {
        const comparison = this.index.comparison(entry.id);
        this.processedComparisons.push(comparison);
        return { kind: "comparison", event, comparison };
      }
      const semantic = this.index.semantic(entry.id);
      this.applyWrite(semantic);
      return { kind: "semantic", event, semantic };
    }

    // The occurrence has completed; only now is the wiring consulted.
    const proposed = connections(event.stage_id);
    const verdict = tryConnection(this.trace, this.cursor, proposed);
    switch (verdict.status) {
      case "finished":
        this.status = "finished";
        return { kind: "finished", event };
      case "advance": {
        const to = this.trace.events[verdict.cursor];
        this.followed.push([event.stage_id, to.stage_id]);
        this.cursor = verdict.cursor;
        this.inStage = false;
        this.pending = [];
        return { kind: "advance", from: event, to };
      }
      case "stopped_wrong_connection":
        return this.halt({
          reason: proposed === null ? "no_connection" : "wrong_connection",
          event,
          proposed,
          expected: event.next_stage_id,
        });
      case "invalid_cursor":
        return this.halt({ reason: "invalid_cursor", event, proposed, expected: null });
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
