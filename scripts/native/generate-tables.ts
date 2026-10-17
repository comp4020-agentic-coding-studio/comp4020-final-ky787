#!/usr/bin/env node
/**
 * Deterministic generator for the native-backed co-op runtime artifacts.
 *
 *   node scripts/native/generate-tables.ts            # write artifacts
 *   node scripts/native/generate-tables.ts --check     # verify only, write nothing
 *
 * Inputs (read-only): experiments/coop-controllers/<chamber>/{contract,integration}.json
 *   and evidence/*.gz, verified by shared/verify_portable.py.
 *
 * Outputs:
 *   server/native/tables/<chamber>.json        packed Boolean truth table (server bundle)
 *   public/evidence/coop/manifest.json         chamber index for the inspector
 *   public/evidence/coop/<chamber>.evidence.json   static mappings + bogus proof summary
 *   public/evidence/coop/<chamber>.traces.json     compact retained traces (lazy-loaded)
 *   public/evidence/coop/<chamber>.disasm.json     compact BCF instructions/blocks (lazy)
 *
 * The runtime table values are the retained native BCF outputs, never a recomputed
 * TypeScript expression. The generator refuses to write if any case's bcf result
 * disagrees with the retained expected/clean results.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CHAMBER_CONTRACTS, NATIVE_CHAMBERS, caseIdForInputs, type NativeChamberId } from '../../server/native/contracts.ts';
import { encodeTable, type NativeTable } from '../../server/native/table-format.ts';
import { loadChamberEvidence, readGzipJson, readJson, readBytes, sha256, type NativeContract } from './package.ts';

const CHECK = process.argv.includes('--check');
const TABLES_DIR = join('server', 'native', 'tables');
const EVIDENCE_DIR = join('public', 'evidence', 'coop');

const stable = (value: unknown): string => JSON.stringify(sortKeys(value), null, 2) + '\n';
function sortKeys(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value as Record<string, unknown>)
            .filter(([, v]) => v !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => [k, sortKeys(v)]));
    }
    return value;
}

interface Written { path: string; bytes: number; sha256: string }
const written: Written[] = [];
let mismatch = false;

function emit(path: string, contents: string) {
    const bytes = Buffer.from(contents);
    written.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
    if (CHECK) {
        if (!existsSync(path)) { console.error(`✗ missing generated artifact: ${path}`); mismatch = true; return; }
        const current = readFileSync(path);
        if (!current.equals(bytes)) { console.error(`✗ stale generated artifact: ${path} (run pnpm gen:native)`); mismatch = true; }
        else console.log(`✓ ${path}`);
    } else {
        mkdirSync(join(path, '..'), { recursive: true });
        writeFileSync(path, bytes);
        console.log(`• wrote ${path} (${bytes.length} bytes)`);
    }
}

/** Build the packed truth table for one chamber from retained native BCF results. */
function buildTable(chamber: NativeChamberId): NativeTable {
    const contract = CHAMBER_CONTRACTS[chamber];
    const { contract: acquired, contractSha, results, nativeResultsSha256 } = loadChamberEvidence(chamber);

    // Field orderings must match the shared contract exactly.
    if (results.input_names.join(',') !== contract.inputs.join(',')) throw new Error(`${chamber}: input ordering drift vs contract`);
    if (results.output_names.join(',') !== contract.outputs.join(',')) throw new Error(`${chamber}: output ordering drift vs contract`);
    const acquiredIn = acquired.inputs.map(i => i.name).join(',');
    const acquiredOut = acquired.outputs.map(o => o.name).join(',');
    if (acquiredIn !== contract.inputs.join(',') || acquiredOut !== contract.outputs.join(',')) throw new Error(`${chamber}: acquired contract ordering drift`);

    const rows: number[][] = new Array(contract.caseCount);
    let seen = 0;
    for (const row of results.rows) {
        if (typeof row.id !== 'number') continue; // ordered-sequence snapshots are not exhaustive cases
        // Retained native BCF output is the source of truth; refuse on any disagreement.
        if (row.bcf.length !== contract.outputs.length) throw new Error(`${chamber}: case ${row.id} output arity`);
        if (JSON.stringify(row.bcf) !== JSON.stringify(row.expected) || JSON.stringify(row.bcf) !== JSON.stringify(row.clean)) {
            throw new Error(`${chamber}: case ${row.id} native/clean/expected disagree; do not mask a mismatch`);
        }
        if (row.bcf.some(v => v !== 0 && v !== 1)) throw new Error(`${chamber}: case ${row.id} non-Boolean output`);
        // The row's id must equal the encoding of its own input vector.
        if (caseIdForInputs(contract, row.inputs) !== row.id) throw new Error(`${chamber}: case ${row.id} id/input encoding drift`);
        if (rows[row.id]) throw new Error(`${chamber}: duplicate case id ${row.id}`);
        rows[row.id] = row.bcf.slice();
        seen++;
    }
    if (seen !== contract.caseCount) throw new Error(`${chamber}: ${seen} exhaustive cases, expected ${contract.caseCount}`);
    for (let c = 0; c < contract.caseCount; c++) if (!rows[c]) throw new Error(`${chamber}: missing case ${c}`);

    const identity = readJson<{ specimen_id?: string; builds?: { variant: string; binary_sha256: string }[] }>(chamber, 'build_or_identity', 'identity.json');
    const bcfBuild = identity.builds?.find(b => b.variant === 'bcf');
    const cleanBuild = identity.builds?.find(b => b.variant === 'clean');
    if (results.processes.bcf.binary_sha256 !== bcfBuild?.binary_sha256) throw new Error(`${chamber}: BCF PE identity mismatch`);
    if (results.processes.clean.binary_sha256 !== cleanBuild?.binary_sha256) throw new Error(`${chamber}: clean PE identity mismatch`);

    return encodeTable({
        schema: 'coop-native-table/v1', chamber_id: chamber,
        native_results_sha256: nativeResultsSha256, contract_sha256: contractSha,
        bcf_pe_sha256: bcfBuild.binary_sha256, clean_pe_sha256: cleanBuild.binary_sha256,
        specimen_id: `${chamber}_ollvm_bcf`,
        input_names: contract.inputs,
        input_game_ports: contract.inputs.map(name => acquired.inputs.find(i => i.name === name)?.game_port ?? null),
        output_names: contract.outputs,
        case_count: contract.caseCount, bits_per_case: contract.outputs.length,
    }, rows);
}

/** Compact a disassembly CFG to only what the inspector renders. */
function compactDisasm(chamber: NativeChamberId) {
    const { value: dis, fileSha256 } = readGzipJson<{
        binary: { sha256: string; image_base: number };
        function: { name: string; start_va: number; end_va: number; bytes_sha256: string };
        instructions: { address: number; rva: number; size: number; bytes: string; mnemonic: string; op_str: string; block_id: string }[];
        blocks: { id: string; start_va: number; end_va: number; instruction_addresses: number[] }[];
    }>(chamber, 'evidence', 'disassembly-bcf.json.gz');
    return {
        schema: 'coop-native-disasm/v1', chamber_id: chamber,
        source_file: 'evidence/disassembly-bcf.json.gz', source_sha256: fileSha256,
        binary_sha256: dis.binary.sha256, image_base: dis.binary.image_base,
        function: { name: dis.function.name, start_va: dis.function.start_va, end_va: dis.function.end_va, bytes_sha256: dis.function.bytes_sha256 },
        instructions: dis.instructions.map(i => ({ address: i.address, rva: i.rva, size: i.size, bytes: i.bytes, mnemonic: i.mnemonic, op_str: i.op_str, block_id: i.block_id })),
        blocks: dis.blocks.map(b => ({ id: b.id, start_va: b.start_va, end_va: b.end_va, instruction_addresses: b.instruction_addresses })),
    };
}

/** Compact retained traces: drop per-step register/memory deltas, keep the step
 * address sequence, output-commit events and raw-occurrence chronology. */
function compactTraces(chamber: NativeChamberId) {
    const { value: pack, fileSha256 } = readGzipJson<{
        selection: { exhaustive_cases: boolean; case_ids: (number | string)[] };
        traces: {
            trace_id: string; variant: string; state_id: number | string; inputs: Record<string, number>;
            binary_sha256: string; steps: { address: number }[];
            raw_occurrences: { id: string; block_id: string; visit_number: number; start_step: number; end_step: number; step_indices: number[]; next_occurrence_id: string | null; next_block_id: string | null }[];
            semantic_events: { id: string; output: string; value: number; bool_value: boolean; instruction_address: number; instruction_rva: number; instruction_text: string; raw_block_id: string; raw_occurrence_id: string; step_index: number }[];
            final_outputs: Record<string, number>; expected_outputs: Record<string, number>; native_outputs: Record<string, number>;
            validation: { ok: boolean; native_output_matches: boolean; expected_output_matches: boolean };
        }[];
    }>(chamber, 'evidence', 'representative-traces.json.gz');

    const traces = pack.traces.map(t => {
        if (!t.validation.ok || !t.validation.native_output_matches || !t.validation.expected_output_matches) {
            throw new Error(`${chamber}: retained trace ${t.trace_id} failed its own validation`);
        }
        return {
            trace_id: t.trace_id, variant: t.variant, state_id: t.state_id, inputs: t.inputs, binary_sha256: t.binary_sha256,
            step_addresses: t.steps.map(s => s.address), instruction_count: t.steps.length,
            raw_occurrences: t.raw_occurrences.map(o => ({ id: o.id, block_id: o.block_id, visit_number: o.visit_number, start_step: o.start_step, end_step: o.end_step, next_occurrence_id: o.next_occurrence_id, next_block_id: o.next_block_id })),
            semantic_events: t.semantic_events.map(e => ({ id: e.id, output: e.output, value: e.value, bool_value: e.bool_value, instruction_address: e.instruction_address, instruction_rva: e.instruction_rva, instruction_text: e.instruction_text, raw_block_id: e.raw_block_id, raw_occurrence_id: e.raw_occurrence_id, step_index: e.step_index })),
            final_outputs: t.final_outputs, native_outputs: t.native_outputs, expected_outputs: t.expected_outputs,
        };
    });
    // Map an exhaustive case id -> trace id for the ones that have a retained trace.
    const byState: Record<number, string> = {};
    for (const t of traces) if (typeof t.state_id === 'number') byState[t.state_id] = t.trace_id;
    return {
        schema: 'coop-native-traces/v1', chamber_id: chamber,
        source_file: 'evidence/representative-traces.json.gz', source_sha256: fileSha256,
        exhaustive_coverage: pack.selection.exhaustive_cases, state_to_trace: byState, traces,
    };
}

/** Static output-site mappings + proven-bogus summary for the inspector. */
function buildEvidence(chamber: NativeChamberId, contractSha: string) {
    const contract = CHAMBER_CONTRACTS[chamber];
    const integration = readJson<{
        contract_sha256: string;
        outputs: { name: string; game_signal?: string; memory: string; bindings?: unknown[]; verified_bcf_store_sites: { output: string; byte_offset: number; instruction_rva: number; instruction_address: number; instruction: { bytes: string; mnemonic: string; op_str: string }; raw_block_id: string; observed_values: number[]; case_ids: number[] }[] }[];
        server_owned: string[];
        mapping_limits: string[];
    }>(chamber, 'integration.json');
    if (integration.contract_sha256 !== contractSha) throw new Error(`${chamber}: integration.json contract hash mismatch`);

    const { value: proof, fileSha256: proofSha } = readGzipJson<{
        binary_sha256: string; target: { name: string; bytes_sha256: string };
        guard_count: number; clone_count: number; formula: string; quantification: string;
        assumptions: string[]; limitations: string[]; solver: Record<string, unknown>;
        clones: { id: string; classification: string; confidence: string; ir_block: string; original_ir_block: string; start_rva: string; end_rva_exclusive: string; raw_block_ids: string[]; reached_by_any_permitted_run: boolean; instruction_count: number; guard_ids: string[]; instructions: { rva: string; va: string; bytes: string; text: string }[]; semantic_resemblance?: { output_writes: { output: string; value: number }[] } }[];
        recommended_candidate_id: string;
    }>(chamber, 'evidence', 'bogus-proof.json.gz');

    return {
        schema: 'coop-native-evidence/v1', chamber_id: chamber, kind: contract.kind,
        contract_sha256: contractSha,
        specimen_id: `${chamber}_ollvm_bcf`, bcf_pe_sha256: proof.binary_sha256,
        obfuscation: {
            compiler: 'OLLVM Clang 16.0.6 (x86_64-pc-windows-msvc)',
            pass: 'Bogus Control Flow (bcf_prob=100, bcf_loop=1)',
            status_label: 'VALIDATED OLLVM BCF',
            note: 'Native outputs verified on Windows; the Linux server reads a verified lookup table, it does not execute the PE.',
        },
        outputs: integration.outputs.map(o => ({
            name: o.name, game_signal: o.game_signal ?? null, memory: o.memory,
            store_sites: o.verified_bcf_store_sites.map(s => ({
                byte_offset: s.byte_offset, instruction_rva: s.instruction_rva, instruction_address: s.instruction_address,
                bytes: s.instruction.bytes, mnemonic: s.instruction.mnemonic, op_str: s.instruction.op_str,
                raw_block_id: s.raw_block_id, observed_values: s.observed_values, observed_case_count: s.case_ids.length,
            })),
        })),
        server_owned: integration.server_owned,
        mapping_limits: integration.mapping_limits,
        bogus: {
            source_file: 'evidence/bogus-proof.json.gz', source_sha256: proofSha,
            guard_count: proof.guard_count, clone_count: proof.clone_count,
            formula: proof.formula, quantification: proof.quantification,
            assumptions: proof.assumptions, limitations: proof.limitations,
            recommended_candidate_id: proof.recommended_candidate_id,
            clones: proof.clones.map(c => ({
                id: c.id, classification: c.classification, confidence: c.confidence,
                ir_block: c.ir_block, original_ir_block: c.original_ir_block,
                start_rva: c.start_rva, end_rva_exclusive: c.end_rva_exclusive, raw_block_ids: c.raw_block_ids,
                reached_by_any_permitted_run: c.reached_by_any_permitted_run, instruction_count: c.instruction_count,
                guard_ids: c.guard_ids, instructions: c.instructions,
                resembles: c.semantic_resemblance?.output_writes ?? [],
            })),
        },
    };
}

function main() {
    const manifest: { schema: string; reference_commit: string; chambers: Record<string, unknown> } = {
        schema: 'coop-native-evidence-manifest/v1', reference_commit: 'see table contract_sha256', chambers: {},
    };
    for (const chamber of NATIVE_CHAMBERS) {
        const table = buildTable(chamber);
        emit(join(TABLES_DIR, `${chamber}.json`), stable(table));

        const evidence = buildEvidence(chamber, table.contract_sha256);
        const traces = compactTraces(chamber);
        const disasm = compactDisasm(chamber);
        emit(join(EVIDENCE_DIR, `${chamber}.evidence.json`), stable(evidence));
        emit(join(EVIDENCE_DIR, `${chamber}.traces.json`), stable(traces));
        emit(join(EVIDENCE_DIR, `${chamber}.disasm.json`), stable(disasm));

        manifest.chambers[chamber] = {
            kind: CHAMBER_CONTRACTS[chamber].kind,
            status_label: 'VALIDATED OLLVM BCF',
            bcf_pe_sha256: table.bcf_pe_sha256, specimen_id: table.specimen_id,
            table_sha256: table.table_sha256, native_results_sha256: table.native_results_sha256,
            retained_trace_count: traces.traces.length, trace_coverage_exhaustive: traces.exhaustive_coverage,
            evidence_file: `${chamber}.evidence.json`, traces_file: `${chamber}.traces.json`, disasm_file: `${chamber}.disasm.json`,
        };
    }
    emit(join(EVIDENCE_DIR, 'manifest.json'), stable(manifest));

    const total = written.reduce((n, w) => n + w.bytes, 0);
    console.log(`\n${CHECK ? 'checked' : 'wrote'} ${written.length} artifacts, ${(total / 1024).toFixed(1)} KB total`);
    if (CHECK && mismatch) { console.error('\nGenerated native artifacts are out of date. Run: pnpm gen:native'); process.exit(1); }
}

main();
