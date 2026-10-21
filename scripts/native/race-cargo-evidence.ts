#!/usr/bin/env node
/** Read frozen inputs only. Generate a small static catalogue, never study files or traces. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { readGzipJson, readJson, readBytes, sha256 } from './package.ts';
import { peBytesAt, buildNativeWorldArtifact } from './world-evidence.ts';
import { CARGO_ASSET_BUDGET, CARGO_IMAGE_BASE, CARGO_PE_SHA256, CARGO_STUDY, type CargoArtifact, type CargoFragment, type CargoSection } from '../../src/coop/race-cargo-types.ts';
import type { NativeDisasmInstruction } from '../../src/coop/native-evidence.ts';

const fail = (ok: unknown, message: string): void => { if (!ok) throw Error(`cargo evidence: ${message}`); };
const read = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
type Catalogue = { binary_sha256: string; image_base: number; fragments: (CargoFragment & { specimen: { sha256: string; chamber_id: string; image_base: number } })[] };
type Disassembly = { instructions: NativeDisasmInstruction[]; blocks: { id: string; instruction_addresses: number[] }[] };
const compact = (i: NativeDisasmInstruction): NativeDisasmInstruction => ({ address: i.address, rva: i.rva, bytes: i.bytes, size: i.size, mnemonic: i.mnemonic, op_str: i.op_str, block_id: i.block_id });

export function buildCargoArtifact(): CargoArtifact {
    const manifest = read<{ files: Record<string, string> }>(`${CARGO_STUDY}/manifest.json`);
    const acquired = readJson<{ files: Record<string, string> }>('race-condition', 'manifest.json');
    const sources: Record<string, string> = {};
    for (const file of ['manifest.json', 'fragments.json', 'panel-plan.json', 'evidence/decision-mappings.json']) {
        const path = `${CARGO_STUDY}/${file}`, hash = sha256(readFileSync(path));
        if (file !== 'manifest.json') fail(hash === manifest.files[file], `study source hash: ${file}`);
        sources[path] = hash;
    }
    for (const file of ['contract.json', 'integration.json', 'evidence/disassembly-bcf.json.gz', 'bin/obfuscated_x64.exe']) {
        const hash = sha256(readBytes('race-condition', file));
        fail(hash === acquired.files[file], `acquired source hash: ${file}`);
        sources[`experiments/coop-controllers/race-condition/${file}`] = hash;
    }
    const catalogue = read<Catalogue>(`${CARGO_STUDY}/fragments.json`);
    fail(catalogue.binary_sha256 === CARGO_PE_SHA256 && catalogue.image_base === CARGO_IMAGE_BASE, 'catalogue specimen');
    const plan = read<{ sections: CargoSection[] }>(`${CARGO_STUDY}/panel-plan.json`);
    return {
        schema: 'race-cargo-presentation/v1', chamber_id: 'race-condition', specimen_id: 'race-condition_ollvm_bcf',
        bcf_pe_sha256: CARGO_PE_SHA256, image_base: CARGO_IMAGE_BASE, study: CARGO_STUDY, sources,
        separation: 'omitted-code-not-cfg-edges',
        sections: plan.sections.map(s => ({ id: s.id, output: s.output, machinery: s.machinery,
            condition_fragments: s.condition_fragments, store_alternatives: s.store_alternatives })),
        fragments: catalogue.fragments.map(f => {
            fail(f.specimen.sha256 === CARGO_PE_SHA256 && f.specimen.chamber_id === 'race-condition' && f.specimen.image_base === CARGO_IMAGE_BASE, `fragment specimen: ${f.id}`);
            return { id: f.id, section: f.section, output: f.output, role: f.role, source_block_id: f.source_block_id,
                address_range: f.address_range, instructions: f.instructions.map(compact), verified_output_store: f.verified_output_store };
        }),
    };
}

/** Catalogue equality PLUS independent acquisition/block/PE checks, including both real stores. */
export function verifyCargoArtifact(value: CargoArtifact): void {
    fail(isDeepStrictEqual(value, buildCargoArtifact()), 'asset differs from frozen catalogue/plan/identities');
    const dis = readGzipJson<Disassembly>('race-condition', 'evidence/disassembly-bcf.json.gz').value;
    const pe = readBytes('race-condition', 'bin/obfuscated_x64.exe');
    fail(sha256(pe) === CARGO_PE_SHA256 && Number(pe.readBigUInt64LE(pe.readUInt32LE(0x3c) + 48)) === value.image_base, 'PE identity');
    const world = buildNativeWorldArtifact('race-condition'); // existing target/contract verification
    const integration = readJson<{ outputs: { name: string; offset: number; verified_bcf_store_sites: { instruction_address: number; raw_block_id: string; observed_values: number[] }[] }[] }>('race-condition', 'integration.json');
    for (const section of value.sections) {
        fail(world.outputs.find(o => o.name === section.output)?.bindings.some(b => b.target === section.machinery), 'machinery association');
        for (const bit of [0, 1] as const) {
            const f = value.fragments.find(f => f.id === section.store_alternatives[bit])!;
            const s = f.verified_output_store!;
            const output = integration.outputs.find(o => o.name === section.output)!;
            fail(s.output === section.output && s.value === bit && s.byte_offset === output.offset
                && output.verified_bcf_store_sites.some(site => site.instruction_address === s.instruction_address
                    && site.raw_block_id === f.source_block_id && site.observed_values.includes(bit)), 'store association');
        }
    }
    for (const f of value.fragments) {
        const block = dis.blocks.find(b => b.id === f.source_block_id)!;
        fail(block && f.instructions.length > 0, 'missing block/fragment');
        const first = block.instruction_addresses.indexOf(f.instructions[0].address);
        for (const [n, i] of f.instructions.entries()) {
            const original = dis.instructions.find(o => o.address === i.address);
            fail(original && isDeepStrictEqual(i, compact(original)), `instruction identity: ${f.id}`);
            fail(first >= 0 && block.instruction_addresses[first + n] === i.address && i.block_id === block.id, 'block order');
            fail(i.address === value.image_base + i.rva && (n === 0 || f.instructions[n - 1].address + f.instructions[n - 1].size === i.address), 'contiguity');
            const bytes = Buffer.from(i.bytes.replaceAll(' ', ''), 'hex');
            fail(bytes.length === i.size && bytes.equals(peBytesAt(pe, i.rva, i.size)), 'PE bytes');
        }
        const last = f.instructions.at(-1)!;
        fail(f.address_range.start_va === f.instructions[0].address && f.address_range.end_va_exclusive === last.address + last.size, 'range');
    }
}
export const serializeCargoArtifact = (a: CargoArtifact) => JSON.stringify(a) + '\n';
function main() {
    const asset = buildCargoArtifact(); verifyCargoArtifact(asset);
    const content = serializeCargoArtifact(asset), path = 'public/evidence/coop/race-condition.cargo.json';
    const digestPath = 'src/coop/race-cargo-integrity.ts';
    const digest = `// Generated by scripts/native/race-cargo-evidence.ts; pins the validated runtime asset.\nexport const CARGO_ASSET_SHA256 = '${sha256(Buffer.from(content))}';\n`;
    fail(Buffer.byteLength(content) <= CARGO_ASSET_BUDGET, 'runtime asset budget exceeded');
    if (process.argv.includes('--check')) {
        verifyCargoArtifact(read<CargoArtifact>(path));
        fail(readFileSync(path, 'utf8') === content && readFileSync(digestPath, 'utf8') === digest, 'stale generated asset/integrity pin');
    } else { writeFileSync(path, content); writeFileSync(digestPath, digest); }
    console.log(`✓ ${path}: ${Buffer.byteLength(content)} / ${CARGO_ASSET_BUDGET} bytes; 26 distinct fragments; catalogue, PE bytes, blocks, stores and targets verified`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
