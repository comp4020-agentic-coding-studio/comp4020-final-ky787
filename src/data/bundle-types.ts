/**
 * Types for the `binary-binja-specimen/v1` browser bundle. The authoritative
 * field definitions are the evidence workspace's `game_data/README.md`; these
 * types cover the fields the game reads and are never used to add or change
 * binary facts.
 */

export const SUPPORTED_SCHEMA = "binary-binja-specimen/v1";

export interface StateSnapshot {
  value: number;
  result: number;
  bridge_open: number;
}

export type StateField = keyof StateSnapshot;

export interface Stage {
  id: string;
  label: string;
  /** `entry`, `comparison`, `output`, `end` or `analysis_candidate`. */
  kind: string;
  raw_block_ids: string[];
  ir_blocks: string[];
  description: string;
  classification: string;
  classification_hidden_initially: boolean;
  proof_id: string | null;
}

export interface Instruction {
  rva: string;
  address: string;
  bytes: string;
  text: string;
}

export interface RawBlock {
  id: string;
  start_rva: string;
  /** Exclusive. */
  end_rva_exclusive: string;
  start_va: string;
  ir_block: string | null;
  stage_id: string | null;
  classification: string;
  executed_by_inputs: number[];
  clone_proof_id: string | null;
  infeasible_guard_id: string | null;
  instructions: Instruction[];
}

export interface RawEdge {
  source: string;
  target: string;
  kind: string;
  evidence_instruction: string;
}

/** One chronological stage occurrence in a retained trace. */
export interface StageEvent {
  id: string;
  trace_index: number;
  stage_id: string;
  visit_number: number;
  raw_occurrence_indices: number[];
  raw_block_ids: string[];
  start_step: number;
  end_step: number;
  state_before: StateSnapshot;
  state_after: StateSnapshot;
  comparison_event_ids: string[];
  semantic_event_ids: string[];
  next_event_id: string | null;
  next_stage_id: string | null;
}

export interface RawOccurrence {
  id: string;
  trace_index: number;
  block_id: string;
  visit_number: number;
  stage_id: string;
  stage_event_id: string;
  start_step: number;
  end_step: number;
  state_before: StateSnapshot;
  state_after: StateSnapshot;
  comparison_event_ids: string[];
  semantic_event_ids: string[];
  next_event_id: string | null;
  next_stage_id: string | null;
}

export interface Operand {
  kind: string;
  address?: number;
  register?: string;
  width: number;
  unsigned: number;
  signed: number;
}

export interface LineageStep {
  step_index: number;
  operation: string;
  operands?: Operand[];
  source?: Operand;
  destination?: Operand;
  boolean_value?: number;
  mnemonic?: string;
  instruction_address: string;
  instruction_text: string;
}

export interface BranchRecord {
  instruction_step_index: number;
  instruction_address: string;
  instruction_rva: string;
  instruction_text: string;
  block_id: string;
  raw_occurrence_index: number;
  condition: string;
  flags_used: Record<string, number | boolean>;
  taken: boolean;
  target_address: string;
  fallthrough_address: string;
  actual_next_address: string;
  actual_next_raw_block_id: string;
}

export type Relationship = "below" | "equal" | "above";
export type Hint = "LOW" | "MATCH" | "HIGH";

export interface Comparison {
  id: string;
  site_id: string;
  visit_number: number;
  block_id: string;
  block_visit_number: number;
  raw_occurrence_index: number;
  stage_event_id: string;
  stage_id: string;
  instruction_step_index: number;
  instruction_address: string;
  instruction_rva: string;
  instruction_text: string;
  operands: Operand[];
  operand_width_bits: number;
  interpretation: string;
  relationship: Relationship;
  hint: Hint;
  source_condition: string;
  source_condition_result: boolean;
  branch: BranchRecord;
  next_trace_stage_id: string | null;
  lineage_snapshot_phase: string;
  lineage: LineageStep[];
}

export interface SemanticEvent {
  id: string;
  /** `state_write`, `output` or `bridge_open`. Only `bridge_open` opens the bridge. */
  kind: string;
  instruction_step_index: number;
  instruction_address: string;
  instruction_rva: string;
  instruction_text: string;
  block_id: string;
  block_visit_number: number;
  raw_occurrence_index: number;
  stage_event_id: string;
  field: StateField;
  value: number;
  state_after: StateSnapshot;
  evidence: string;
  label?: string;
}

export interface TimelineEntry {
  step_index: number;
  kind: "comparison" | "semantic";
  id: string;
}

export interface Trace {
  id: string;
  input: number;
  binary_sha256: string;
  retained_trace_path: string;
  retained_trace_sha256: string;
  initial_state: StateSnapshot;
  final_state: StateSnapshot;
  return_value: number;
  events: StageEvent[];
  raw_occurrences: RawOccurrence[];
  comparisons: Comparison[];
  semantic_events: SemanticEvent[];
  timeline: TimelineEntry[];
  instruction_count: number;
  linked_helper_instruction_count: number;
}

export interface InputPreset {
  id: string;
  input: number;
  label: string;
  trace_id: string;
}

export interface CloneCandidate {
  id: string;
  classification: string;
  confidence: string;
  ir_block: string;
  assembly_label: string;
  symbol: string;
  start_rva: string;
  end_rva_exclusive: string;
  guard_ids: string[];
  proof: string;
  stage_id: string;
  raw_block_ids: string[];
  reached_by_inputs: number[];
  reachability_basis: string;
  assembly_from: string;
}

export interface AnalysisReward {
  initially_hidden: boolean;
  reveal_stage_ids: string[];
  not_observed_is_not_proven_bogus: boolean;
  candidates: CloneCandidate[];
  proof_artifact: string;
  proof_sha256: string;
  predicate: string;
  assumptions: string[];
  guard_count: number;
  total_clone_count: number;
}

export interface Bundle {
  schema: string;
  specimen_id: string;
  title: string;
  binary: {
    sha256: string;
    format: string;
    architecture: string;
    preferred_image_base: string;
    target_function: {
      name: string;
      start_va: number;
      start_rva: number;
      end_va: number;
      end_rva: number;
      boundary_source: string;
      bytes_sha256: string;
      complete_decoding: boolean;
    };
    artifact_path: string;
  };
  allowed_inputs: number[];
  input_presets: InputPreset[];
  result_codes: Record<string, string>;
  state_contract: {
    initial_sentinel: number;
    sentinel_meaning: string;
    field_width_bits: number;
    bridge_initial_ui_state: string;
    open_only_on: string;
  };
  stages: Stage[];
  stage_graph: {
    semantics: string;
    edges: { source: string; target: string; inputs: number[] }[];
  };
  raw: {
    cfg_convention: string;
    blocks: RawBlock[];
    edges: RawEdge[];
  };
  traces: Trace[];
  analysis_reward: AnalysisReward;
  validation: {
    all_native_and_emulated_results_agree: boolean;
  };
  replay_contract: {
    start_event_index: number;
    validation: string;
    input_changes: string;
    completion: string;
    event_timing: string;
    physical_layout: string;
  };
}
