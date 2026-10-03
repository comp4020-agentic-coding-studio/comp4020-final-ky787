/**
 * Loads and indexes the specimen bundle. Validation here is structural: it
 * rejects an unsupported schema or broken internal references so the game
 * fails loudly instead of replaying something the contract does not describe.
 * It never repairs, reorders or fills in data.
 */

import type {
  BranchOutcome,
  BranchSite,
  Bundle,
  Comparison,
  Instruction,
  OutputPort,
  RawBlock,
  SemanticEvent,
  Stage,
  StageEvent,
  Trace,
} from "./bundle-types.ts";
import { SUPPORTED_SCHEMA } from "./bundle-types.ts";

export class BundleError extends Error {}

function fail(message: string): never {
  throw new BundleError(`Specimen bundle rejected: ${message}`);
}

/**
 * One thing that happens inside a stage occurrence, at its real instruction
 * step: the original timeline's comparisons and writes, plus v2's branch
 * feedback (the SETcc materializing the Boolean) and port activation (the
 * branch consuming it).
 */
export interface StageStep {
  step_index: number;
  kind: "comparison" | "semantic" | "feedback" | "activation";
  id: string;
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
  const ports = new Map(bundle.output_ports.map((p) => [p.id, p]));

  for (const stage of bundle.stages) {
    for (const id of stage.raw_block_ids) {
      if (!blockIds.has(id)) fail(`stage ${stage.id} names unknown raw block ${id}`);
    }
    for (const id of bundle.stage_port_ids[stage.id] ?? fail(`stage ${stage.id} has no port list`)) {
      if (ports.get(id)?.owner_stage_id !== stage.id) fail(`port ${id} is not owned by ${stage.id}`);
    }
  }
  for (const port of bundle.output_ports) {
    if (!stageIds.has(port.expected_destination_stage_id)) fail(`port ${port.id} leads to an unknown stage`);
  }
  for (const site of bundle.branch_sites) {
    for (const answer of ["TRUE", "FALSE"] as const) {
      const out = site.outputs[answer];
      if (ports.get(out.port_id)?.expected_destination_stage_id !== out.destination_stage_id) {
        fail(`site ${site.id} ${answer} disagrees with port ${out.port_id}`);
      }
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
    const outcomes = new Map(trace.branch_outcomes.map((o) => [o.id, o]));
    trace.events.forEach((event, i) => {
      if (event.trace_index !== i) fail(`${event.id} is out of chronological order`);
      if (!stageIds.has(event.stage_id)) fail(`${event.id} names unknown stage ${event.stage_id}`);
      const next = trace.events[i + 1];
      if ((next?.id ?? null) !== event.next_event_id) fail(`${event.id} next_event_id does not link`);
      if ((next?.stage_id ?? null) !== event.next_stage_id) fail(`${event.id} next_stage_id does not link`);
      if (next && !event.exit_port_id) fail(`${event.id} continues without an exit port`);
      if (event.exit_port_id && ports.get(event.exit_port_id)?.owner_stage_id !== event.stage_id) {
        fail(`${event.id} exits through a port its stage does not own`);
      }
      for (const id of event.comparison_event_ids) {
        if (!comparisonIds.has(id)) fail(`${event.id} names unknown comparison ${id}`);
      }
      for (const id of event.semantic_event_ids) {
        if (!semanticIds.has(id)) fail(`${event.id} names unknown semantic event ${id}`);
      }
      if (event.branch_outcome_event_id) {
        const outcome = outcomes.get(event.branch_outcome_event_id);
        if (!outcome || outcome.stage_event_id !== event.id) fail(`${event.id} names an unknown branch outcome`);
        if (outcome.selected_port_id !== event.exit_port_id) fail(`${event.id} exit disagrees with its outcome`);
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
  readonly portsById = new Map<string, OutputPort>();
  readonly sitesById = new Map<string, BranchSite>();
  /** Instruction by full-width address string, e.g. `0x1400010a2`. */
  readonly instructionsByAddress = new Map<string, { instruction: Instruction; block: RawBlock }>();
  private comparisons = new Map<string, Comparison>();
  private semantics = new Map<string, SemanticEvent>();
  private outcomes = new Map<string, BranchOutcome>();

  constructor(readonly bundle: Bundle) {
    for (const stage of bundle.stages) this.stagesById.set(stage.id, stage);
    for (const port of bundle.output_ports) this.portsById.set(port.id, port);
    for (const site of bundle.branch_sites) this.sitesById.set(site.id, site);
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
      for (const o of trace.branch_outcomes) this.outcomes.set(o.id, o);
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

  port(id: string): OutputPort {
    const port = this.portsById.get(id);
    if (!port) throw new BundleError(`unknown port ${id}`);
    return port;
  }

  /** A stage's output terminals, in the bundle's order. */
  stagePorts(stageId: string): OutputPort[] {
    return (this.bundle.stage_port_ids[stageId] ?? []).map((id) => this.port(id));
  }

  /** The comparison site a stage owns, if it is a comparison stage. */
  siteForStage(stageId: string): BranchSite | null {
    return this.bundle.branch_sites.find((s) => s.stage_id === stageId) ?? null;
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

  outcome(id: string): BranchOutcome {
    const o = this.outcomes.get(id);
    if (!o) throw new BundleError(`unknown branch outcome ${id}`);
    return o;
  }

  /**
   * Everything inside one stage occurrence, in actual instruction-step order:
   * the timeline's comparisons and writes, plus the occurrence's branch
   * feedback and port activation. Nothing is applied from `state_after`.
   */
  stageTimeline(trace: Trace, event: StageEvent): StageStep[] {
    const ids = new Set([...event.comparison_event_ids, ...event.semantic_event_ids]);
    const steps: StageStep[] = trace.timeline
      .filter((entry) => ids.has(entry.id))
      .map((entry) => ({ step_index: entry.step_index, kind: entry.kind, id: entry.id }));
    if (event.branch_outcome_event_id) {
      const o = this.outcome(event.branch_outcome_event_id);
      steps.push({ step_index: o.feedback_step_index, kind: "feedback", id: o.id });
      steps.push({ step_index: o.port_activation_step_index, kind: "activation", id: o.id });
    }
    return steps.sort((a, b) => a.step_index - b.step_index);
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
