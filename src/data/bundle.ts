/**
 * Loads and indexes the specimen bundle. Validation here is structural: it
 * rejects an unsupported schema or broken internal references so the game
 * fails loudly instead of replaying something the contract does not describe.
 * It never repairs, reorders or fills in data.
 */

import type {
  Bundle,
  Comparison,
  Instruction,
  RawBlock,
  SemanticEvent,
  Stage,
  StageEvent,
  TimelineEntry,
  Trace,
} from "./bundle-types.ts";
import { SUPPORTED_SCHEMA } from "./bundle-types.ts";

export class BundleError extends Error {}

function fail(message: string): never {
  throw new BundleError(`Specimen bundle rejected: ${message}`);
}

/** Checks the contract the replay relies on, then returns the bundle untouched. */
export function parseBundle(data: unknown): Bundle {
  if (typeof data !== "object" || data === null) fail("not a JSON object");
  const bundle = data as Bundle;
  if (bundle.schema !== SUPPORTED_SCHEMA) {
    fail(`unsupported schema ${JSON.stringify(bundle.schema)} (expected ${SUPPORTED_SCHEMA})`);
  }
  const stageIds = new Set(bundle.stages.map((s) => s.id));
  const blockIds = new Set(bundle.raw.blocks.map((b) => b.id));
  const traceIds = new Set(bundle.traces.map((t) => t.id));

  for (const stage of bundle.stages) {
    for (const id of stage.raw_block_ids) {
      if (!blockIds.has(id)) fail(`stage ${stage.id} names unknown raw block ${id}`);
    }
  }
  for (const input of bundle.allowed_inputs) {
    const preset = bundle.input_presets.find((p) => p.input === input);
    if (!preset) fail(`allowed input ${input} has no preset`);
    if (!traceIds.has(preset.trace_id)) fail(`preset ${preset.id} names unknown trace ${preset.trace_id}`);
  }
  for (const trace of bundle.traces) {
    if (trace.binary_sha256 !== bundle.binary.sha256) {
      fail(`trace ${trace.id} is bound to a different binary`);
    }
    const comparisonIds = new Set(trace.comparisons.map((c) => c.id));
    const semanticIds = new Set(trace.semantic_events.map((s) => s.id));
    trace.events.forEach((event, i) => {
      if (event.trace_index !== i) fail(`${event.id} is out of chronological order`);
      if (!stageIds.has(event.stage_id)) fail(`${event.id} names unknown stage ${event.stage_id}`);
      const next = trace.events[i + 1];
      if ((next?.id ?? null) !== event.next_event_id) fail(`${event.id} next_event_id does not link`);
      if ((next?.stage_id ?? null) !== event.next_stage_id) fail(`${event.id} next_stage_id does not link`);
      for (const id of event.comparison_event_ids) {
        if (!comparisonIds.has(id)) fail(`${event.id} names unknown comparison ${id}`);
      }
      for (const id of event.semantic_event_ids) {
        if (!semanticIds.has(id)) fail(`${event.id} names unknown semantic event ${id}`);
      }
    });
    for (const entry of trace.timeline) {
      const known = entry.kind === "comparison" ? comparisonIds.has(entry.id) : semanticIds.has(entry.id);
      if (!known) fail(`${trace.id} timeline names unknown ${entry.kind} ${entry.id}`);
    }
  }
  for (const id of bundle.analysis_reward.reveal_stage_ids) {
    if (!stageIds.has(id)) fail(`analysis reward reveals unknown stage ${id}`);
  }
  return bundle;
}

/** Read-only lookups over one bundle. */
export class SpecimenIndex {
  readonly stagesById = new Map<string, Stage>();
  readonly blocksById = new Map<string, RawBlock>();
  readonly tracesById = new Map<string, Trace>();
  /** Instruction by full-width address string, e.g. `0x1400010a2`. */
  readonly instructionsByAddress = new Map<string, { instruction: Instruction; block: RawBlock }>();
  private comparisons = new Map<string, Comparison>();
  private semantics = new Map<string, SemanticEvent>();

  constructor(readonly bundle: Bundle) {
    for (const stage of bundle.stages) this.stagesById.set(stage.id, stage);
    for (const block of bundle.raw.blocks) {
      this.blocksById.set(block.id, block);
      for (const instruction of block.instructions) {
        this.instructionsByAddress.set(instruction.address.toLowerCase(), { instruction, block });
      }
    }
    for (const trace of bundle.traces) {
      this.tracesById.set(trace.id, trace);
      for (const c of trace.comparisons) this.comparisons.set(c.id, c);
      for (const s of trace.semantic_events) this.semantics.set(s.id, s);
    }
  }

  get inputs(): number[] {
    return this.bundle.allowed_inputs;
  }

  stage(id: string): Stage {
    const stage = this.stagesById.get(id);
    if (!stage) throw new BundleError(`unknown stage ${id}`);
    return stage;
  }

  traceForInput(input: number): Trace {
    if (!this.bundle.allowed_inputs.includes(input)) {
      throw new BundleError(`input ${input} is not one of ${this.bundle.allowed_inputs.join(", ")}`);
    }
    const preset = this.bundle.input_presets.find((p) => p.input === input);
    const trace = preset ? this.tracesById.get(preset.trace_id) : undefined;
    if (!trace) throw new BundleError(`no retained trace for input ${input}`);
    return trace;
  }

  comparison(id: string): Comparison {
    const c = this.comparisons.get(id);
    if (!c) throw new BundleError(`unknown comparison ${id}`);
    return c;
  }

  semantic(id: string): SemanticEvent {
    const s = this.semantics.get(id);
    if (!s) throw new BundleError(`unknown semantic event ${id}`);
    return s;
  }

  /**
   * The comparison and write events inside one stage occurrence, in actual
   * instruction-step order. This is the contract's within-stage animation
   * order; nothing is applied from `state_after`.
   */
  stageTimeline(trace: Trace, event: StageEvent): TimelineEntry[] {
    const ids = new Set([...event.comparison_event_ids, ...event.semantic_event_ids]);
    return trace.timeline
      .filter((entry) => ids.has(entry.id))
      .sort((a, b) => a.step_index - b.step_index);
  }

  /** Raw blocks of a stage, in the bundle's listed order. */
  stageBlocks(stageId: string): RawBlock[] {
    return this.stage(stageId).raw_block_ids.map((id) => {
      const block = this.blocksById.get(id);
      if (!block) throw new BundleError(`unknown raw block ${id}`);
      return block;
    });
  }

  resultName(code: number): string | null {
    return this.bundle.result_codes[String(code)] ?? null;
  }
}
