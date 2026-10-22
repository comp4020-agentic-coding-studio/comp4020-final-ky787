/** Compact native records for the five distributed RACE decorations. No gameplay logic. */
import type { NativeDisasmInstruction } from './native-evidence.ts';
import type { NativeWorldOutput } from './native-world-types.ts';

export const RACE_MACHINERY_OUTPUTS = ['spanMaster', 'phaseA', 'phaseB', 'returnBridge', 'exitDoor'] as const;
export type RaceMachineryOutput = typeof RACE_MACHINERY_OUTPUTS[number];
export const RACE_MACHINERY_URL = '/evidence/coop/race-condition.machinery.json';
export const RACE_MACHINERY_BUDGET = 24_000;
export const RACE_MACHINERY_PE = '371d0217e00d8662430df701ab2f8b34d4192a9b574534b5b32099dddc6c491a';
export const RACE_MACHINERY_BASE = 0x140000000;
export interface MachineryFragment {
    id: string;
    output: RaceMachineryOutput;
    role: 'input_check' | 'saved_boolean_branch' | 'output_store';
    block_id: string;
    start_rva: number;
    end_rva_exclusive: number;
    instructions: NativeDisasmInstruction[];
    store: { value: 0 | 1; rva: number; byte_offset: number } | null;
}
export interface MachinerySection extends Omit<NativeWorldOutput, 'name' | 'excerpt'> {
    name: RaceMachineryOutput;
    target: string;
    context: string[];
    stores: { '0': string; '1': string };
}
export interface RaceMachineryArtifact {
    schema: 'race-machinery-presentation/v1';
    chamber_id: 'race-condition';
    specimen_id: 'race-condition_ollvm_bcf';
    bcf_pe_sha256: string;
    image_base: number;
    sources: Record<string, string>;
    separation: 'omitted-code-not-cfg-edges';
    sections: MachinerySection[];
    fragments: MachineryFragment[];
}
