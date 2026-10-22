#!/usr/bin/env node
/** Read frozen acquisition only. No binary execution, trace collection or research writes. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { readBytes, readJson, readGzipJson, sha256 } from './package.ts';
import { buildNativeWorldArtifact, peBytesAt } from './world-evidence.ts';
import { WORLD_ASSEMBLY_PLACEMENTS } from '../../src/slice/native-world-presentation.ts';
import type { NativeDisasmInstruction } from '../../src/coop/native-evidence.ts';
import { ENVIRONMENTAL_BASE, ENVIRONMENTAL_BUDGETS, ENVIRONMENTAL_CHAMBERS, ENVIRONMENTAL_OUTPUTS, ENVIRONMENTAL_PE,
    isEnvironmentalChamber, type EnvironmentalChamber, type EnvironmentalFragment, type EnvironmentalArtifact } from '../../src/coop/environmental-types.ts';

function fact(ok: unknown, why: string): asserts ok { if (!ok) throw Error(`environmental evidence: ${why}`); }
const compact = (i: NativeDisasmInstruction): NativeDisasmInstruction => ({ address: i.address, rva: i.rva, size: i.size, bytes: i.bytes, mnemonic: i.mnemonic, op_str: i.op_str, block_id: i.block_id });
type Dis = { binary: { sha256: string; image_base: number }; instructions: NativeDisasmInstruction[]; blocks: { id: string; instruction_addresses: number[] }[] };
type Site = { output: string; byte_offset: number; instruction_rva: number; instruction_address: number; raw_block_id: string;
    observed_values: number[]; case_ids: (number | string)[]; instruction: NativeDisasmInstruction };
type Trace = { variant: string; state_id: number | string; binary_sha256: string; machine_model: { output_address: number; output_layout: Record<string, number> };
    steps: { address: number; rva: number; block_id: string; memory_writes: { address: number; size: number; value: number }[] }[] };
// Audited selectors, never authored instruction text. Each read is CMP/SETNE/spill;
// each later branch reloads that same byte before TEST/JNE. Intervening BCF guards
// clobber AL and flags, and remain explicit omissions. Branch targets are untouched.
// CROSSFEED vault checks read its local derived Boolean; DEADLOCK service/payload
// checks read the completion Boolean. Other selectors read real input fields,
// sometimes the second operand of a short-circuited expression.
const contexts: Record<EnvironmentalChamber, Record<string, readonly [number, number]>> = {
    handshake: { crossingPower: [0x107c, 0x10b3], liftPower: [0x11c7, 0x11ff], relayPower: [0x1315, 0x134d], exitReady: [0x14dc, 0x1514] },
    'crossfeed-vault': { grappleAnchor: [0x132b, 0x1362], bridge: [0x1476, 0x14ad], liftField: [0x15c3, 0x15fb], relayGates: [0x194e, 0x1985],
        leftRoute: [0x1b10, 0x1b48], rightRoute: [0x1cd3, 0x1d0b], galleryAccess: [0x1e21, 0x1e59], vaultPower: [0x1f6c, 0x1fa3], vaultReturn: [0x20b6, 0x20ed], serviceAccess: [0x1787, 0x17bf] },
    deadlock: { cargoLift: [0x1290, 0x12c8], shaftFirewall: [0x13dc, 0x1414], serviceRelay: [0x1612, 0x1649], hatchOpen: [0x175f, 0x1797], payloadReady: [0x18aa, 0x18e1] },
    'use-after-free': { routeA: [0x11c7, 0x11ff], routeB: [0x138e, 0x13c6], routeC: [0x1555, 0x158d], launchPower: [0x107c, 0x10b3], assistBlocked: [0x1719, 0x1751], exitReady: [0x1867, 0x189f] },
};

export function buildEnvironmentalArtifact(chamber: EnvironmentalChamber): EnvironmentalArtifact {
    const manifest = readJson<{ chamber_id: string; files: Record<string, string> }>(chamber, 'manifest.json');
    fact(manifest.chamber_id === chamber, 'manifest chamber identity');
    const sources: Record<string, string> = {};
    for (const file of ['contract.json', 'integration.json', 'src/controller.c', 'src/controller.h', 'evidence/disassembly-bcf.json.gz', 'bin/obfuscated_x64.exe', 'evidence/representative-traces.json.gz']) {
        const hash = sha256(readBytes(chamber, file));
        fact(hash === manifest.files[file], `${chamber} source hash ${file}`);
        sources[`experiments/coop-controllers/${chamber}/${file}`] = hash;
    }
    const pe = readBytes(chamber, 'bin/obfuscated_x64.exe');
    fact(sha256(pe) === ENVIRONMENTAL_PE[chamber] && Number(pe.readBigUInt64LE(pe.readUInt32LE(0x3c) + 48)) === ENVIRONMENTAL_BASE, 'PE identity');
    const dis = readGzipJson<Dis>(chamber, 'evidence/disassembly-bcf.json.gz').value;
    fact(dis.binary.sha256 === ENVIRONMENTAL_PE[chamber] && dis.binary.image_base === ENVIRONMENTAL_BASE, 'disassembly identity');
    const integration = readJson<{ outputs: { name: string; offset: number; verified_bcf_store_sites: Site[] }[] }>(chamber, 'integration.json');
    const traces = readGzipJson<{ chamber_id: string; contract_sha256: string; traces: Trace[] }>(chamber, 'evidence/representative-traces.json.gz').value;
    fact(traces.chamber_id === chamber && traces.contract_sha256 === manifest.files['contract.json'], 'trace identity');
    const world = buildNativeWorldArtifact(chamber); // proves existing bindings and targets against the released room
    const placements = WORLD_ASSEMBLY_PLACEMENTS[chamber]!;
    fact(isDeepStrictEqual(placements.map(p => p.output), ENVIRONMENTAL_OUTPUTS[chamber]), 'representative placement accounting');
    const fragments: EnvironmentalFragment[] = [];
    const sections = ENVIRONMENTAL_OUTPUTS[chamber].map(name => {
        const output = world.outputs.find(o => o.name === name)!;
        const place = placements.find(p => p.output === name)!;
        fact(output && place && output.bindings.some(b => b.target === place.target), `target ${name}`);
        const add = (suffix: string, role: EnvironmentalFragment['role'], start: number, store: EnvironmentalFragment['store'] = null) => {
            const first = dis.instructions.findIndex(i => i.rva === start);
            fact(first >= 0, `missing instruction ${start}`);
            const instructions = dis.instructions.slice(first, first + 3).map(compact);
            const block = dis.blocks.find(b => b.id === instructions[0].block_id)!;
            fact(block && instructions.length === 3, 'missing block/instructions');
            const offset = block.instruction_addresses.indexOf(instructions[0].address);
            for (const [k, i] of instructions.entries()) {
                fact(i.block_id === block.id && block.instruction_addresses[offset + k] === i.address, 'block order');
                fact(i.address === ENVIRONMENTAL_BASE + i.rva && (!k || instructions[k - 1].address + instructions[k - 1].size === i.address), 'contiguity');
                const bytes = Buffer.from(i.bytes.replaceAll(' ', ''), 'hex');
                fact(bytes.length === i.size && bytes.equals(peBytesAt(pe, i.rva, i.size)), 'PE bytes');
            }
            const last = instructions.at(-1)!, id = `${name}.${suffix}`;
            fragments.push({ id, output: name, role, block_id: block.id, start_rva: start, end_rva_exclusive: last.rva + last.size, instructions, store });
            return id;
        };
        const [read, branch] = contexts[chamber][name];
        const context = [add('read', 'gameplay_check', read), add('branch', 'saved_boolean_branch', branch)];
        const readCode = fragments.at(-2)!.instructions, branchCode = fragments.at(-1)!.instructions;
        fact(isDeepStrictEqual(readCode.map(i => i.mnemonic), ['cmp', 'setne', 'mov']) && isDeepStrictEqual(branchCode.map(i => i.mnemonic), ['mov', 'test', 'jne']), 'gameplay context form');
        fact(readCode[2].op_str.replace(/, al$/, '') === branchCode[0].op_str.replace(/^al, /, '') && branchCode[1].op_str === 'al, 1', 'saved Boolean reload');
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
            // Verify the retained observations themselves. Nothing from these cases is
            // applied to a current snapshot or included as a runtime execution trace.
            const observed: (number | string)[] = [];
            for (const trace of traces.traces) {
                fact(trace.variant === 'bcf' && trace.binary_sha256 === ENVIRONMENTAL_PE[chamber] && trace.machine_model.output_layout[name] === output.byte_offset, 'trace specimen/layout');
                for (const step of trace.steps.filter(s => s.address === site.instruction_address)) {
                    fact(step.rva === site.instruction_rva && step.block_id === site.raw_block_id, 'observed step identity');
                    fact(step.memory_writes.some(w => w.address === trace.machine_model.output_address + output.byte_offset && w.size === 4 && w.value === bit), 'observed output write');
                    observed.push(trace.state_id);
                }
            }
            fact(isDeepStrictEqual(observed.map(String).sort(), site.case_ids.map(String).sort()), 'recorded store case association');
            stores[bit] = add(`write-${bit}`, 'output_store', dis.instructions[index - 2].rva,
                { value: bit, rva: site.instruction_rva, byte_offset: output.byte_offset, observed_case_count: observed.length });
        }
        const { excerpt: _excerpt, ...definition } = output;
        return { ...definition, target: place.target, context, stores };
    });
    return { schema: 'coop-environmental-presentation/v1', chamber_id: chamber, specimen_id: `${chamber}_ollvm_bcf`,
        bcf_pe_sha256: ENVIRONMENTAL_PE[chamber], image_base: ENVIRONMENTAL_BASE, sources,
        separation: 'omitted-code-not-cfg-edges', sections, fragments };
}
export function verifyEnvironmentalArtifact(value: unknown, chamber: EnvironmentalChamber): void {
    fact(isDeepStrictEqual(value, buildEnvironmentalArtifact(chamber)), 'not the canonical acquired fragments/associations');
}
export const serializeEnvironmentalArtifact = (a: EnvironmentalArtifact) => JSON.stringify(a) + '\n';
function main() {
    const selected = process.argv.find(a => a.startsWith('--chamber='))?.split('=')[1];
    fact(selected === undefined || isEnvironmentalChamber(selected), 'unknown selected chamber');
    const pins: Record<string, string> = {};
    for (const chamber of ENVIRONMENTAL_CHAMBERS) {
        const content = serializeEnvironmentalArtifact(buildEnvironmentalArtifact(chamber));
        pins[chamber] = sha256(Buffer.from(content));
        fact(Buffer.byteLength(content) <= ENVIRONMENTAL_BUDGETS[chamber], 'asset exceeds budget');
        if (selected && selected !== chamber) continue;
        const path = `public/evidence/coop/${chamber}.environment.json`;
        if (process.argv.includes('--check')) {
            verifyEnvironmentalArtifact(JSON.parse(readFileSync(path, 'utf8')), chamber);
            fact(readFileSync(path, 'utf8') === content, `stale ${path}`);
        } else writeFileSync(path, content);
        console.log(`✓ ${path}: ${Buffer.byteLength(content)} / ${ENVIRONMENTAL_BUDGETS[chamber]} bytes; ${ENVIRONMENTAL_OUTPUTS[chamber].length * 4} separate fragments; exact PE bytes, blocks, bindings and observed zero/one stores verified`);
    }
    const pinPath = 'src/coop/environmental-integrity.ts';
    const pin = `// Generated by scripts/native/environmental-evidence.ts.\nexport const ENVIRONMENTAL_SHA256 = ${JSON.stringify(pins, null, 4)} as const;\n`;
    if (process.argv.includes('--check')) fact(readFileSync(pinPath, 'utf8') === pin, 'stale integrity pins');
    else writeFileSync(pinPath, pin);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
