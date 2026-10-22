#!/usr/bin/env node
/** Select from frozen acquisition; never execute, rebuild or write research inputs. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { readBytes, readJson, readGzipJson, sha256 } from './package.ts';
import { buildNativeWorldArtifact, peBytesAt } from './world-evidence.ts';
import { nativeWorldPlacementBinding, WORLD_ASSEMBLY_PLACEMENTS } from '../../src/slice/native-world-presentation.ts';
import { raceCondition } from '../../src/coop/race-condition.ts';
import type { NativeDisasmInstruction } from '../../src/coop/native-evidence.ts';
import { RACE_MACHINERY_BASE, RACE_MACHINERY_BUDGET, RACE_MACHINERY_OUTPUTS, RACE_MACHINERY_PE,
    type MachineryFragment, type RaceMachineryArtifact } from '../../src/coop/race-machinery-types.ts';

const chamber = 'race-condition';
function fact(ok: unknown, why: string): asserts ok { if (!ok) throw Error(`RACE machinery evidence: ${why}`); }
const compact = (i: NativeDisasmInstruction): NativeDisasmInstruction => ({ address: i.address, rva: i.rva, size: i.size, bytes: i.bytes, mnemonic: i.mnemonic, op_str: i.op_str, block_id: i.block_id });
type Dis = { instructions: NativeDisasmInstruction[]; blocks: { id: string; instruction_addresses: number[] }[] };
type Site = { output: string; byte_offset: number; instruction_rva: number; instruction_address: number; raw_block_id: string;
    observed_values: number[]; case_ids: unknown[]; instruction: NativeDisasmInstruction };
// Audited source dataflow: rbp-0x28 holds the input pointer slot, rbp-0x20 the
// local master slot. The five reads spill to 0x44/46/48/49/4a before BCF guards;
// the listed later blocks reload those bytes and TEST them, not guard flags.
// These addresses are selectors into the acquired disassembly, never authored code.
const contexts = [
    { read: [0x18a5, 4], branch: 0x18e0 },
    { read: [0x1a64, 5], branch: 0x1aa3 },
    { read: [0x1c27, 5], branch: 0x1c66 },
    { read: [0x1d75, 5], branch: 0x1db4 },
    { read: [0x1ec3, 5], branch: 0x1f02 },
] as const;

export function buildRaceMachineryArtifact(): RaceMachineryArtifact {
    const manifest = readJson<{ files: Record<string, string> }>(chamber, 'manifest.json');
    const sources: Record<string, string> = {};
    for (const file of ['contract.json', 'integration.json', 'src/controller.c', 'src/controller.h', 'evidence/disassembly-bcf.json.gz', 'bin/obfuscated_x64.exe']) {
        const hash = sha256(readBytes(chamber, file));
        fact(hash === manifest.files[file], `source hash ${file}`);
        sources[`experiments/coop-controllers/${chamber}/${file}`] = hash;
    }
    const pe = readBytes(chamber, 'bin/obfuscated_x64.exe');
    fact(sha256(pe) === RACE_MACHINERY_PE && Number(pe.readBigUInt64LE(pe.readUInt32LE(0x3c) + 48)) === RACE_MACHINERY_BASE, 'PE identity');
    const dis = readGzipJson<Dis>(chamber, 'evidence/disassembly-bcf.json.gz').value;
    const integration = readJson<{ outputs: { name: string; offset: number; verified_bcf_store_sites: Site[] }[] }>(chamber, 'integration.json');
    const world = buildNativeWorldArtifact(chamber); // verifies all existing bindings/targets
    const fragments: MachineryFragment[] = [];
    const sections = RACE_MACHINERY_OUTPUTS.map((name, n) => {
        const output = world.outputs.find(o => o.name === name)!;
        const place = WORLD_ASSEMBLY_PLACEMENTS[chamber]!.find(p => p.output === name)!;
        fact(nativeWorldPlacementBinding(world, place, raceCondition(1)), `target ${name}`);
        const add = (suffix: string, role: MachineryFragment['role'], start: number, count: number, store: MachineryFragment['store'] = null) => {
            const first = dis.instructions.findIndex(i => i.rva === start);
            fact(first >= 0, `missing instruction ${start}`);
            const instructions = dis.instructions.slice(first, first + count).map(compact);
            const block = dis.blocks.find(b => b.id === instructions[0].block_id)!;
            fact(block, 'missing block');
            const offset = block.instruction_addresses.indexOf(instructions[0].address);
            for (const [k, i] of instructions.entries()) {
                fact(i.block_id === block.id && block.instruction_addresses[offset + k] === i.address, 'block order');
                fact(i.address === RACE_MACHINERY_BASE + i.rva && (!k || instructions[k - 1].address + instructions[k - 1].size === i.address), 'contiguity');
                const bytes = Buffer.from(i.bytes.replaceAll(' ', ''), 'hex');
                fact(bytes.length === i.size && bytes.equals(peBytesAt(pe, i.rva, i.size)), 'PE bytes');
            }
            const last = instructions.at(-1)!;
            const id = `${name}.${suffix}`;
            fragments.push({ id, output: name, role, block_id: block.id, start_rva: start, end_rva_exclusive: last.rva + last.size, instructions, store });
            return id;
        };
        const context = [add('read', 'input_check', contexts[n].read[0], contexts[n].read[1]), add('branch', 'saved_boolean_branch', contexts[n].branch, 3)];
        const stores = {} as { '0': string; '1': string };
        for (const bit of [0, 1] as const) {
            const acquired = integration.outputs.find(o => o.name === name)!;
            const site = acquired.verified_bcf_store_sites.find(s => s.observed_values.length === 1 && s.observed_values[0] === bit);
            fact(site && site.case_ids.length && site.output === name && site.byte_offset === output.byte_offset && acquired.offset === output.byte_offset, `observed store ${name}/${bit}`);
            const index = dis.instructions.findIndex(i => i.address === site.instruction_address);
            fact(index >= 2, 'store context');
            const original = dis.instructions[index];
            fact(original.block_id === site.raw_block_id && original.rva === site.instruction_rva &&
                ['address', 'rva', 'size', 'bytes', 'mnemonic', 'op_str'].every(k => original[k as keyof NativeDisasmInstruction] === site.instruction[k as keyof NativeDisasmInstruction]), 'store identity');
            stores[bit] = add(`write-${bit}`, 'output_store', dis.instructions[index - 2].rva, 3, { value: bit, rva: site.instruction_rva, byte_offset: output.byte_offset });
        }
        const { excerpt: _excerpt, ...definition } = output;
        return { ...definition, name, target: place.target, context, stores };
    });
    return { schema: 'race-machinery-presentation/v1', chamber_id: chamber, specimen_id: 'race-condition_ollvm_bcf',
        bcf_pe_sha256: RACE_MACHINERY_PE, image_base: RACE_MACHINERY_BASE, sources,
        separation: 'omitted-code-not-cfg-edges', sections, fragments };
}
export function verifyRaceMachineryArtifact(value: unknown): void {
    fact(isDeepStrictEqual(value, buildRaceMachineryArtifact()), 'not the canonical acquired fragments/associations');
}
export const serializeRaceMachineryArtifact = (a: RaceMachineryArtifact) => JSON.stringify(a) + '\n';
function main() {
    const content = serializeRaceMachineryArtifact(buildRaceMachineryArtifact());
    const path = 'public/evidence/coop/race-condition.machinery.json', pin = 'src/coop/race-machinery-integrity.ts';
    const digest = `// Generated by scripts/native/race-machinery-evidence.ts.\nexport const RACE_MACHINERY_SHA256 = '${sha256(Buffer.from(content))}';\n`;
    fact(Buffer.byteLength(content) <= RACE_MACHINERY_BUDGET, 'asset exceeds budget');
    if (process.argv.includes('--check')) {
        verifyRaceMachineryArtifact(JSON.parse(readFileSync(path, 'utf8')));
        fact(readFileSync(path, 'utf8') === content && readFileSync(pin, 'utf8') === digest, 'stale asset/integrity pin');
    } else { writeFileSync(path, content); writeFileSync(pin, digest); }
    console.log(`✓ ${path}: ${Buffer.byteLength(content)} / ${RACE_MACHINERY_BUDGET} bytes; 20 separate fragments; exact PE bytes, blocks, ten observed stores and targets verified`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
