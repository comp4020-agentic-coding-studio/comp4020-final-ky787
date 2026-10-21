#!/usr/bin/env node
/**
 * Derive small, static world excerpts from frozen acquired output-store evidence.
 * This never builds/runs a PE, changes a controller, or infers an execution path.
 * Run without arguments to generate; --check validates committed artifacts only.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { NATIVE_CHAMBERS, CHAMBER_CONTRACTS, type NativeChamberId } from '../../server/native/contracts.ts';
import { crossfeedVault } from '../../src/coop/crossfeed-vault.ts';
import { raceCondition } from '../../src/coop/race-condition.ts';
import type { NativeDisasmInstruction } from '../../src/coop/native-evidence.ts';
import type { NativeWorldArtifact, NativeWorldBinding, NativeWorldOutput } from '../../src/coop/native-world-types.ts';
import { readBytes, readJson, readGzipJson, sha256 } from './package.ts';

type Store = {
    output: string; byte_offset: number; instruction_rva: number; instruction_address: number;
    instruction: Omit<NativeDisasmInstruction, 'block_id'>;
    raw_block_id: string; observed_values: number[]; case_ids: (string | number)[];
};
type IntegrationOutput = {
    name: string; kind: NativeWorldOutput['kind']; game_signal?: string; offset: number;
    bindings: NativeWorldBinding[]; verified_bcf_store_sites: Store[];
};
type Integration = { chamber_id: NativeChamberId; contract_sha256: string; outputs: IntegrationOutput[] };
type Disassembly = {
    binary: { sha256: string; image_base: number }; contract_sha256: string;
    instructions: NativeDisasmInstruction[];
    blocks: { id: string; start_va: number; end_va: number; instruction_addresses: number[] }[];
};
type DraftSource = {
    geometry: { objects: { id: string }[] };
    bindings: { id: string; output: string; target: string; property: string; invert?: boolean }[];
};

function requireFact(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(`native world evidence: ${message}`);
}

function compactBinding(b: NativeWorldBinding): NativeWorldBinding {
    return {
        id: b.id, output: b.output, target: b.target, property: b.property, invert: b.invert,
        ...(b.collection ? { collection: b.collection } : {}),
        ...(b.resolved_signal ? { resolved_signal: b.resolved_signal } : {}),
        ...(b.physical_output ? { physical_output: b.physical_output } : {}),
        ...(b.additional_server_constraint ? { additional_server_constraint: b.additional_server_constraint } : {}),
    };
}
function compactInstruction(i: NativeDisasmInstruction): NativeDisasmInstruction {
    return { address: i.address, rva: i.rva, size: i.size, bytes: i.bytes, mnemonic: i.mnemonic, op_str: i.op_str, block_id: i.block_id };
}

/** Resolve each RVA to real PE bytes, independently of the disassembly JSON. */
export function peBytesAt(pe: Buffer, rva: number, size: number): Buffer {
    requireFact(pe.toString('ascii', 0, 2) === 'MZ', 'missing DOS header');
    const header = pe.readUInt32LE(0x3c);
    requireFact(pe.readUInt32LE(header) === 0x4550, 'missing PE signature');
    const optional = header + 24;
    requireFact(pe.readUInt16LE(optional) === 0x20b, 'expected PE32+');
    const sections = optional + pe.readUInt16LE(header + 20);
    for (let i = 0; i < pe.readUInt16LE(header + 6); i++) {
        const section = sections + i * 40;
        const start = pe.readUInt32LE(section + 12), rawSize = pe.readUInt32LE(section + 16);
        if (rva >= start && rva + size <= start + rawSize) {
            const offset = pe.readUInt32LE(section + 20) + rva - start;
            requireFact(offset + size <= pe.length, 'instruction extends beyond PE');
            return pe.subarray(offset, offset + size);
        }
    }
    throw new Error(`native world evidence: unmapped instruction RVA ${rva}`);
}

const sourceCache = new Map<NativeChamberId, ReturnType<typeof readSources>>();
function readSources(chamber: NativeChamberId) {
    const manifest = readJson<{ chamber_id: string; files: Record<string, string> }>(chamber, 'manifest.json');
    requireFact(manifest.chamber_id === chamber, `${chamber}: manifest specimen mismatch`);
    const files = ['contract.json', 'integration.json', 'evidence/disassembly-bcf.json.gz', 'bin/obfuscated_x64.exe'];
    for (const path of files) requireFact(sha256(readBytes(chamber, path)) === manifest.files[path], `${chamber}: acquired source hash mismatch: ${path}`);
    const integration = readJson<Integration>(chamber, 'integration.json');
    const dis = readGzipJson<Disassembly>(chamber, 'evidence/disassembly-bcf.json.gz');
    const pe = readBytes(chamber, 'bin/obfuscated_x64.exe');
    const contractSha = manifest.files['contract.json'];
    requireFact(integration.chamber_id === chamber, `${chamber}: integration specimen mismatch`);
    requireFact(integration.contract_sha256 === contractSha && dis.value.contract_sha256 === contractSha, `${chamber}: contract mismatch`);
    requireFact(dis.value.binary.sha256 === sha256(pe), `${chamber}: PE/disassembly identity mismatch`);
    const header = pe.readUInt32LE(0x3c);
    requireFact(Number(pe.readBigUInt64LE(header + 24 + 24)) === dis.value.binary.image_base, `${chamber}: image base mismatch`);
    requireFact(isDeepStrictEqual(integration.outputs.map(o => o.name), CHAMBER_CONTRACTS[chamber].outputs), `${chamber}: output contract mismatch`);
    const temporal = chamber === 'crossfeed-vault' ? crossfeedVault(1) : chamber === 'race-condition' ? raceCondition(1) : null;
    const draft = temporal ? null : JSON.parse(readFileSync(join('levels', 'campaign', `${chamber}.json`), 'utf8')) as DraftSource;
    return { integration, dis: dis.value, pe, contractSha, temporal, draft, integrationSha: manifest.files['integration.json'], disassemblySha: dis.fileSha256 };
}
function sources(chamber: NativeChamberId) {
    let source = sourceCache.get(chamber);
    if (!source) { source = readSources(chamber); sourceCache.set(chamber, source); }
    return source;
}

/** Check an acquired binding still targets the existing authored world. No geometry is generated. */
function validateTarget(chamber: NativeChamberId, b: NativeWorldBinding) {
    const { draft, temporal } = sources(chamber);
    if (draft) {
        requireFact(draft.geometry.objects.some(o => o.id === b.target), `${chamber}: unknown target ${b.target}`);
        const current = draft.bindings.find(binding => binding.id === b.id);
        requireFact(current && current.output === b.output && current.target === b.target && current.property === b.property
            && !!current.invert === b.invert, `${chamber}: changed authored binding ${b.id}`);
    } else {
        requireFact(temporal, `${chamber}: missing temporal room`);
        if (b.target === 'exit' && !b.collection) {
            requireFact(b.output === 'exitDoor' && b.property === 'unlocked' && !b.invert, `${chamber}: invalid exit association`);
            return;
        }
        requireFact(b.collection, `${chamber}: missing target collection for ${b.id}`);
        const object = temporal[b.collection]?.find(o => o.id === b.target) as unknown as Record<string, unknown> | undefined;
        requireFact(object, `${chamber}: unknown target ${b.target}`);
        requireFact(object[b.property] === b.output && !b.invert, `${chamber}: changed temporal binding ${b.id}`);
    }
}

/** Deterministic canonical excerpt: observed write of one plus its same-block pointer setup. */
export function buildNativeWorldArtifact(chamber: NativeChamberId): NativeWorldArtifact {
    const source = sources(chamber);
    const instructions = new Map(source.dis.instructions.map(i => [i.address, i]));
    const outputs = source.integration.outputs.map((output): NativeWorldOutput => {
        const site = output.verified_bcf_store_sites.find(s => s.observed_values.includes(1));
        requireFact(site, `${chamber}/${output.name}: no observed value-one store`);
        const block = source.dis.blocks.find(b => b.id === site.raw_block_id);
        requireFact(block, `${chamber}/${output.name}: missing store block`);
        const storeIndex = block.instruction_addresses.indexOf(site.instruction_address);
        requireFact(storeIndex >= 2, `${chamber}/${output.name}: insufficient same-block context`);
        // These frozen specimens put the two pointer loads immediately before their store.
        // Exclude unrelated following opaque-guard instructions, rather than pad a listing.
        const excerpt = block.instruction_addresses.slice(storeIndex - 2, storeIndex + 1).map(address => {
            const instruction = instructions.get(address);
            requireFact(instruction, `${chamber}: missing instruction ${address}`);
            return compactInstruction(instruction);
        });
        return {
            name: output.name, kind: output.kind, game_signal: output.game_signal ?? null, byte_offset: output.offset,
            bindings: output.bindings.map(compactBinding),
            excerpt: { block_id: block.id, store_address: site.instruction_address, observed_values: [...site.observed_values], instructions: excerpt },
        };
    });
    const artifact: NativeWorldArtifact = {
        schema: 'coop-native-world/v1', chamber_id: chamber, specimen_id: `${chamber}_ollvm_bcf`,
        bcf_pe_sha256: source.dis.binary.sha256, contract_sha256: source.contractSha, image_base: source.dis.binary.image_base,
        presentation: 'static-output-store', sources: { integration_sha256: source.integrationSha, disassembly_sha256: source.disassemblySha }, outputs,
    };
    validateNativeWorldArtifact(artifact, chamber);
    return artifact;
}

/** Validate all displayable bytes, ordering, store associations and world targets against acquired sources. */
export function validateNativeWorldArtifact(artifact: NativeWorldArtifact, chamber: NativeChamberId): void {
    const source = sources(chamber);
    requireFact(artifact.schema === 'coop-native-world/v1' && artifact.presentation === 'static-output-store', `${chamber}: unsupported presentation`);
    requireFact(artifact.chamber_id === chamber && artifact.specimen_id === `${chamber}_ollvm_bcf`, `${chamber}: specimen mismatch`);
    requireFact(artifact.bcf_pe_sha256 === source.dis.binary.sha256 && artifact.contract_sha256 === source.contractSha
        && artifact.image_base === source.dis.binary.image_base, `${chamber}: PE/contract identity mismatch`);
    requireFact(artifact.sources.integration_sha256 === source.integrationSha && artifact.sources.disassembly_sha256 === source.disassemblySha,
        `${chamber}: source identity mismatch`);
    requireFact(isDeepStrictEqual(artifact.outputs.map(o => o.name), source.integration.outputs.map(o => o.name)), `${chamber}: output association mismatch`);
    for (const output of artifact.outputs) {
        const acquired = source.integration.outputs.find(o => o.name === output.name)!;
        requireFact(output.kind === acquired.kind && output.game_signal === (acquired.game_signal ?? null) && output.byte_offset === acquired.offset,
            `${chamber}/${output.name}: output metadata mismatch`);
        requireFact(isDeepStrictEqual(output.bindings, acquired.bindings.map(compactBinding)), `${chamber}/${output.name}: binding mismatch`);
        for (const binding of output.bindings) validateTarget(chamber, binding);
        const excerpt = output.excerpt;
        const site = acquired.verified_bcf_store_sites.find(s => s.instruction_address === excerpt.store_address);
        requireFact(site && site.output === output.name && site.byte_offset === output.byte_offset && site.raw_block_id === excerpt.block_id,
            `${chamber}/${output.name}: unverified output store`);
        requireFact(isDeepStrictEqual(excerpt.observed_values, site.observed_values) && site.case_ids.length > 0,
            `${chamber}/${output.name}: store observation mismatch`);
        const block = source.dis.blocks.find(b => b.id === excerpt.block_id);
        requireFact(block && excerpt.instructions.length >= 3 && excerpt.instructions.length <= 5, `${chamber}/${output.name}: invalid block/excerpt`);
        const first = block.instruction_addresses.indexOf(excerpt.instructions[0].address);
        requireFact(first >= 0, `${chamber}/${output.name}: instruction not in block`);
        let storeFound = false;
        for (let index = 0; index < excerpt.instructions.length; index++) {
            const instruction = excerpt.instructions[index];
            const original = source.dis.instructions.find(i => i.address === instruction.address);
            requireFact(original && isDeepStrictEqual(instruction, compactInstruction(original)), `${chamber}/${output.name}: instruction mismatch at ${instruction.address}`);
            requireFact(instruction.block_id === block.id && block.instruction_addresses[first + index] === instruction.address,
                `${chamber}/${output.name}: non-contiguous block ordering`);
            requireFact(instruction.address === artifact.image_base + instruction.rva, `${chamber}/${output.name}: address/RVA mismatch`);
            const bytes = Buffer.from(instruction.bytes.replaceAll(' ', ''), 'hex');
            requireFact(bytes.length === instruction.size && bytes.equals(peBytesAt(source.pe, instruction.rva, instruction.size)),
                `${chamber}/${output.name}: PE instruction bytes mismatch`);
            if (index > 0) requireFact(excerpt.instructions[index - 1].address + excerpt.instructions[index - 1].size === instruction.address,
                `${chamber}/${output.name}: non-contiguous instruction bytes`);
            if (instruction.address === site.instruction_address) {
                storeFound = true;
                for (const field of ['address', 'rva', 'size', 'bytes', 'mnemonic', 'op_str'] as const)
                    requireFact(instruction[field] === site.instruction[field], `${chamber}/${output.name}: recorded store mismatch`);
            }
        }
        requireFact(storeFound, `${chamber}/${output.name}: highlighted store absent from excerpt`);
    }
}

export const serializeNativeWorldArtifact = (artifact: NativeWorldArtifact): string => JSON.stringify(artifact, null, 2) + '\n';

function main() {
    const check = process.argv.includes('--check');
    for (const chamber of NATIVE_CHAMBERS) {
        const path = join('public', 'evidence', 'coop', `${chamber}.world.json`);
        const text = serializeNativeWorldArtifact(buildNativeWorldArtifact(chamber));
        if (check) {
            const existing = readFileSync(path, 'utf8');
            validateNativeWorldArtifact(JSON.parse(existing) as NativeWorldArtifact, chamber);
            requireFact(existing === text, `${path}: stale artifact (run pnpm gen:native-world)`);
            console.log(`✓ ${path} (${Buffer.byteLength(text)} bytes; PE bytes, blocks, stores and targets verified)`);
        } else {
            mkdirSync(join(path, '..'), { recursive: true });
            writeFileSync(path, text);
            console.log(`• wrote ${path} (${Buffer.byteLength(text)} bytes)`);
        }
    }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
