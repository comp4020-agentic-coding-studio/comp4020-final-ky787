/** Compact static excerpts. No traces, UI strings, geometry or controller logic. */
import type { NativeDisasmInstruction } from './native-evidence.ts';

export const CARGO_OUTPUTS = ['topBridge', 'bufferBridge', 'safetyFirewall', 'raceFirewall'] as const;
export type CargoOutput = typeof CARGO_OUTPUTS[number];
export const CARGO_SECTIONS = ['upper-support', 'buffer-support', 'safety-interlock', 'overlap-interlock'] as const;
export type CargoSectionId = typeof CARGO_SECTIONS[number];
export const CARGO_PE_SHA256 = '371d0217e00d8662430df701ab2f8b34d4192a9b574534b5b32099dddc6c491a';
export const CARGO_IMAGE_BASE = 0x140000000;
export const CARGO_STUDY = 'experiments/coop-controller-studies/race-cargo-v1';
export const CARGO_ASSET_URL = '/evidence/coop/race-condition.cargo.json';
export const CARGO_ASSET_BUDGET = 36_000;

export interface CargoFragment {
    id: string;
    section: CargoSectionId;
    output: CargoOutput;
    role: 'pointer_context' | 'input_check' | 'puzzle_branch' | 'output_store' | 'obfuscator_guard';
    source_block_id: string;
    address_range: { start_rva: number; end_rva_exclusive: number; start_va: number; end_va_exclusive: number };
    instructions: NativeDisasmInstruction[];
    verified_output_store: null | {
        output: CargoOutput; value: 0 | 1; byte_offset: number; instruction_rva: number;
        instruction_address: number; instruction_id: string; source_block_id: string;
    };
}
export interface CargoSection {
    id: CargoSectionId;
    output: CargoOutput;
    machinery: string;
    condition_fragments: string[];
    store_alternatives: { '0': string; '1': string };
}
export interface CargoArtifact {
    schema: 'race-cargo-presentation/v1';
    chamber_id: 'race-condition';
    specimen_id: 'race-condition_ollvm_bcf';
    bcf_pe_sha256: string;
    image_base: number;
    study: string;
    /** Repository-relative source paths and exact retained file hashes. */
    sources: Record<string, string>;
    /** Every fragment is separate; never an asserted edge or case-specific gap. */
    separation: 'omitted-code-not-cfg-edges';
    sections: CargoSection[];
    fragments: CargoFragment[];
}
