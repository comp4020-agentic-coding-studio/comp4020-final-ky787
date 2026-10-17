/**
 * Browser-side loader and presenter for the verified native co-op evidence.
 *
 * Reuses the CONTROL SPINE evidence philosophy without touching its modules:
 * this is a separate, self-contained adapter for the five native-backed co-op
 * chambers. It lazy-loads the compact evidence files from /evidence/coop/ only
 * when the inspector is opened, so the default gameplay download stays small.
 *
 * It never executes a PE and never invents assembly. Every instruction, address
 * and trace comes from the generated files, which are verified against the
 * acquired package by scripts/native/generate-tables.ts and the portable
 * verifier. Values shown are the retained Windows-native results; the status
 * label states the Linux server reads a verified lookup table.
 */
import { CHAMBER_CONTRACTS, caseIdForInputs, isNativeChamber } from '../../server/native/contracts.ts';
import type { NativeChamberId } from '../../server/native/contracts.ts';
export type { NativeChamberId };

export interface NativeStoreSite {
    byte_offset: number; instruction_rva: number; instruction_address: number;
    bytes: string; mnemonic: string; op_str: string; raw_block_id: string;
    observed_values: number[]; observed_case_count: number;
}
export interface NativeEvidenceOutput { name: string; game_signal: string | null; memory: string; store_sites: NativeStoreSite[] }
export interface NativeBogusClone {
    id: string; classification: string; confidence: string; ir_block: string; original_ir_block: string;
    start_rva: string; end_rva_exclusive: string; raw_block_ids: string[]; reached_by_any_permitted_run: boolean;
    instruction_count: number; guard_ids: string[]; instructions: { rva: string; va: string; bytes: string; text: string }[];
    resembles: { output: string; value: number }[];
}
export interface NativeEvidence {
    schema: string; chamber_id: NativeChamberId; kind: 'declarative' | 'temporal'; contract_sha256: string;
    specimen_id: string; bcf_pe_sha256: string;
    obfuscation: { compiler: string; pass: string; status_label: string; note: string };
    outputs: NativeEvidenceOutput[]; server_owned: string[]; mapping_limits: string[];
    bogus: {
        source_file: string; source_sha256: string; guard_count: number; clone_count: number;
        formula: string; quantification: string; assumptions: string[]; limitations: string[];
        recommended_candidate_id: string; clones: NativeBogusClone[];
    };
}
export interface NativeTrace {
    trace_id: string; variant: string; state_id: number | string; inputs: Record<string, number>; binary_sha256: string;
    step_addresses: number[]; instruction_count: number;
    raw_occurrences: { id: string; block_id: string; visit_number: number; start_step: number; end_step: number; next_occurrence_id: string | null; next_block_id: string | null }[];
    semantic_events: { id: string; output: string; value: number; bool_value: boolean; instruction_address: number; instruction_rva: number; instruction_text: string; raw_block_id: string; raw_occurrence_id: string; step_index: number }[];
    final_outputs: Record<string, number>; native_outputs: Record<string, number>; expected_outputs: Record<string, number>;
}
export interface NativeTraces { chamber_id: NativeChamberId; source_file: string; source_sha256: string; exhaustive_coverage: boolean; state_to_trace: Record<number, string>; traces: NativeTrace[] }
export interface NativeDisasmInstruction { address: number; rva: number; size: number; bytes: string; mnemonic: string; op_str: string; block_id: string }
export interface NativeDisasm { chamber_id: NativeChamberId; binary_sha256: string; image_base: number; function: { name: string; start_va: number; end_va: number; bytes_sha256: string }; instructions: NativeDisasmInstruction[]; blocks: { id: string; start_va: number; end_va: number; instruction_addresses: number[] }[] }
export interface NativeManifestEntry {
    kind: 'declarative' | 'temporal'; status_label: string; bcf_pe_sha256: string; specimen_id: string;
    table_sha256: string; native_results_sha256: string; retained_trace_count: number; trace_coverage_exhaustive: boolean;
    evidence_file: string; traces_file: string; disasm_file: string;
}
export type NativeManifest = { schema: string; chambers: Record<string, NativeManifestEntry> };

const BASE = 'evidence/coop';
const cache = new Map<string, Promise<unknown>>();
function fetchJson<T>(path: string): Promise<T> {
    const existing = cache.get(path) as Promise<T> | undefined;
    if (existing) return existing;
    const promise = fetch(`${BASE}/${path}`).then(r => { if (!r.ok) throw new Error(`native evidence unavailable: ${path} (${r.status})`); return r.json() as Promise<T>; });
    cache.set(path, promise);
    return promise;
}

export const loadManifest = () => fetchJson<NativeManifest>('manifest.json');
export const loadEvidence = (chamber: NativeChamberId) => fetchJson<NativeEvidence>(`${chamber}.evidence.json`);
export const loadTraces = (chamber: NativeChamberId) => fetchJson<NativeTraces>(`${chamber}.traces.json`);
export const loadDisasm = (chamber: NativeChamberId) => fetchJson<NativeDisasm>(`${chamber}.disasm.json`);

export const hex = (n: number) => `0x${n.toString(16).toUpperCase()}`;

/** Build the ordered native input vector for the current declarative device values. */
export function declarativeInputVector(chamber: NativeChamberId, devices: Readonly<Record<string, boolean>>): number[] | null {
    const contract = CHAMBER_CONTRACTS[chamber];
    if (contract.kind !== 'declarative') return null;
    // Device port = input name + .occupied/.value; the port-suffix set is small, so probe both.
    return contract.inputs.map(name => {
        const occ = devices[`${name}.occupied`];
        const val = devices[`${name}.value`];
        return (occ ?? val) ? 1 : 0;
    });
}

/** Current declarative case id, or null if not a declarative chamber. */
export function declarativeCaseId(chamber: NativeChamberId, devices: Readonly<Record<string, boolean>>): number | null {
    const vector = declarativeInputVector(chamber, devices);
    return vector ? caseIdForInputs(CHAMBER_CONTRACTS[chamber], vector) : null;
}

/** Retained trace for a given state id, if one exists. */
export function traceForState(traces: NativeTraces, stateId: number): NativeTrace | null {
    const id = traces.state_to_trace[stateId];
    return id ? traces.traces.find(t => t.trace_id === id) ?? null : null;
}

export { isNativeChamber, CHAMBER_CONTRACTS };
