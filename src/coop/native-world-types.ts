/** Small generated static evidence only; authored world positions live elsewhere. */
import type { NativeChamberId } from '../../server/native/contracts.ts';
import type { NativeDisasmInstruction } from './native-evidence.ts';

export interface NativeWorldBinding {
    id: string;
    /** Raw output, including when this binding also has a physical projection. */
    output: string;
    /** Acquired target ID; declarative runtime objects add their existing draft: prefix. */
    target: string;
    property: string;
    invert: boolean;
    collection?: 'platforms' | 'lifts' | 'gates' | 'firewalls';
    resolved_signal?: string;
    physical_output?: string;
    additional_server_constraint?: string;
}

export interface NativeWorldExcerpt {
    block_id: string;
    store_address: number;
    observed_values: number[];
    /** Contiguous same-block excerpt. This is never a current execution trace. */
    instructions: NativeDisasmInstruction[];
}

export interface NativeWorldOutput {
    name: string;
    kind: 'raw_combinational' | 'physical_projection' | 'persisted_latch_projection' | 'unlock_candidate';
    game_signal: string | null;
    byte_offset: number;
    bindings: NativeWorldBinding[];
    excerpt: NativeWorldExcerpt;
}

export interface NativeWorldArtifact {
    schema: 'coop-native-world/v1';
    chamber_id: NativeChamberId;
    specimen_id: string;
    bcf_pe_sha256: string;
    contract_sha256: string;
    image_base: number;
    presentation: 'static-output-store';
    sources: { integration_sha256: string; disassembly_sha256: string };
    outputs: NativeWorldOutput[];
}
