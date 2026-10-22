/** Compact acquired code; layout and authored state strings live in presentation. */
import type { NativeDisasmInstruction } from './native-evidence.ts';
import type { NativeWorldOutput } from './native-world-types.ts';

export const ENVIRONMENTAL_CHAMBERS = ['handshake', 'crossfeed-vault', 'deadlock', 'use-after-free'] as const;
export type EnvironmentalChamber = typeof ENVIRONMENTAL_CHAMBERS[number];
export const isEnvironmentalChamber = (value: unknown): value is EnvironmentalChamber => ENVIRONMENTAL_CHAMBERS.some(id => id === value);
/** Existing representative placements, in their established order. */
export const ENVIRONMENTAL_OUTPUTS: Readonly<Record<EnvironmentalChamber, readonly string[]>> = {
    handshake: ['crossingPower', 'liftPower', 'relayPower', 'exitReady'],
    'crossfeed-vault': ['grappleAnchor', 'bridge', 'liftField', 'relayGates', 'leftRoute', 'rightRoute', 'galleryAccess', 'vaultPower', 'vaultReturn', 'serviceAccess'],
    deadlock: ['cargoLift', 'shaftFirewall', 'serviceRelay', 'hatchOpen', 'payloadReady'],
    'use-after-free': ['routeA', 'routeB', 'routeC', 'launchPower', 'assistBlocked', 'exitReady'],
};
export const ENVIRONMENTAL_BASE = 0x140000000;
export const ENVIRONMENTAL_BUDGETS: Readonly<Record<EnvironmentalChamber, number>> = {
    handshake: 16_000, 'crossfeed-vault': 40_000, deadlock: 20_000, 'use-after-free': 24_000,
};
export const ENVIRONMENTAL_PE: Readonly<Record<EnvironmentalChamber, string>> = {
    handshake: '002b39f41eaa83daf6c21881e4140800d5b1a3c2fe302570994db2e15d0cc4e8',
    'crossfeed-vault': '8cc4b8f4a989461afb15f8c957a7fa51816a12859df8cd4b8260a9956c7b282b',
    deadlock: '0ac0c12e5999cc17cc319bddbc2d20a3653a4c53b3cbb715b8b53bf808c506f6',
    'use-after-free': '733e5c0aeb6e3ef0fa92271e2f37df649ecf7f888b720ba17807b7f99cb283cb',
};
export interface EnvironmentalFragment {
    id: string;
    output: string;
    /** Checks may read an input or a derived local Boolean; never an opaque guard. */
    role: 'gameplay_check' | 'saved_boolean_branch' | 'output_store';
    block_id: string;
    start_rva: number;
    end_rva_exclusive: number;
    instructions: NativeDisasmInstruction[];
    store: { value: 0 | 1; rva: number; byte_offset: number; observed_case_count: number } | null;
}
export interface EnvironmentalSection extends Omit<NativeWorldOutput, 'excerpt'> {
    target: string;
    context: string[];
    stores: { '0': string; '1': string };
}
export interface EnvironmentalArtifact {
    schema: 'coop-environmental-presentation/v1';
    chamber_id: EnvironmentalChamber;
    specimen_id: string;
    bcf_pe_sha256: string;
    image_base: number;
    sources: Record<string, string>;
    separation: 'omitted-code-not-cfg-edges';
    sections: EnvironmentalSection[];
    fragments: EnvironmentalFragment[];
}
