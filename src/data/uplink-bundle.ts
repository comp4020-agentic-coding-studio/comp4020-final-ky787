/** Retained Windows evidence: validate identities and references, never infer controller logic. */
import type bundle from '../../game_data/uplink_controller_ollvm_bcf_v1.json';
export type UplinkBundle = typeof bundle;
export type RetainedTrace = UplinkBundle['traces'][number];
export type NativeInstruction = UplinkBundle['raw']['instructions'][number];
export const UPLINK_ID = 'uplink_controller_ollvm_bcf_v1';
export const UPLINK_PE = '1e6e39f015613d03560e1dc49a93a8de43e16ea2f0006ee8809632cc3972aa61';
export const UPLINK_SHA = '87dec9e470119a951eb1486e25d62226c72b34367e754b0a14b4e5a818c4c082';
export const INPUT_BITS = ['plateA', 'switchB', 'plateB', 'switchC', 'cubeOnPlateC'] as const;
export const OUTPUT_FIELDS = ['grappleAnchor', 'relayGates', 'liftField', 'codePlatformA', 'codePlatformB', 'exitDoor', 'bridge'] as const;
function requireEvidence(ok: unknown, message: string): asserts ok {
    if (!ok) throw new Error(`UPLINK evidence: ${message}`);
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function unique<T>(values: T[], key: (v: T) => string | number, label: string) {
    const map = new Map(values.map(v => [key(v), v]));
    requireEvidence(map.size === values.length, `duplicate ${label}`);
    return map;
}
export function validateUplinkBundle(value: unknown): UplinkBundle {
    try {
        const b = value as UplinkBundle;
        requireEvidence(b.schema === 'room-controller/v1' && b.schema_version === 1, 'unsupported schema/version');
        requireEvidence(b.specimen_id === UPLINK_ID && b.room_id === 'uplink', 'specimen/room identity');
        requireEvidence(b.identity.bcf_pe_sha256 === UPLINK_PE && b.raw.binary_sha256 === UPLINK_PE, 'PE identity');
        requireEvidence(b.integration.controller_frame_source === 'validated-trace', 'source marker');
        requireEvidence(b.input_contract.state_count === 32 && same(b.input_contract.canonical_values, [0, 1]), 'input contract');
        requireEvidence(b.input_contract.fields.length === 5, 'input fields');
        for (const [bit, name] of INPUT_BITS.entries()) {
            const f = b.input_contract.fields[bit];
            requireEvidence(f.name === name && f.bit === bit && f.byte_offset === bit * 4 && f.width_bits === 32 && b.input_contract.frontend_mapping[name] === name, `input mapping ${name}`);
        }
        requireEvidence(same(b.input_contract.ignored_frontend_inputs, ['cubeOnPlate', 'cubeOnPlateB', 'plateC']), 'ignored inputs');
        requireEvidence(b.output_contract.fields.length === 7, 'required outputs');
        for (const [i, name] of OUTPUT_FIELDS.entries()) {
            const f = b.output_contract.fields[i];
            requireEvidence(f.name === name && f.byte_offset === i * 4 && f.width_bits === 32 && b.output_contract.frontend_mapping[name] === name, `output mapping ${name}`);
        }
        const blocks = unique(b.raw.blocks, v => v.id, 'raw block');
        const instructions = unique(b.raw.instructions, v => v.address, 'instruction address');
        const allInstructions = unique([...b.raw.instructions, ...b.raw.helper_instructions], v => v.address, 'raw/helper address');
        requireEvidence(b.raw.function.complete_decoding, 'incomplete raw function');
        for (const block of blocks.values()) {
            requireEvidence(block.instruction_addresses.length > 0, `empty block ${block.id}`);
            let next = block.start_va;
            for (const address of block.instruction_addresses) {
                const ins = instructions.get(address);
                requireEvidence(ins && ins.block_id === block.id && ins.address === next, `raw instruction ${address}`);
                requireEvidence(ins.rva === address - b.raw.image_base && ins.bytes.split(' ').length === ins.size, `instruction bytes/RVA ${address}`);
                next += ins.size;
            }
            requireEvidence(next === block.end_va_exclusive && block.start_va - b.raw.image_base === block.start_rva && next - b.raw.image_base === block.end_rva_exclusive, `block range ${block.id}`);
        }
        const traces = unique(b.traces, v => v.id, 'trace ID');
        const states = unique(b.state_table, v => v.state_id, 'state key');
        requireEvidence(states.size === 32 && traces.size === 32, 'complete 32-state coverage');
        for (let key = 0; key < 32; key++) {
            const row = states.get(key);
            requireEvidence(row, `missing state ${key}`);
            for (const [bit, name] of INPUT_BITS.entries()) requireEvidence(row.inputs[name] === ((key >> bit) & 1), `state encoding ${key}/${name}`);
            requireEvidence(row.validation_status === 'pass' && row.bcf_native.valid && row.clean_native.valid && row.bcf_native.exit_code === 0 && row.clean_native.exit_code === 0, `native validation ${key}`);
            requireEvidence(row.bcf_native.binary_sha256 === UPLINK_PE && row.clean_native.binary_sha256 === b.identity.clean_pe_sha256, `native identity ${key}`);
            const trace = traces.get(row.trace_id);
            requireEvidence(trace && trace.state_id === key && same(trace.inputs, row.inputs) && trace.binary_sha256 === UPLINK_PE, `trace reference ${key}`);
            requireEvidence(trace.validation.ok && trace.validation.normal_return && trace.validation.native_output_matches && trace.validation.expected_output_matches && trace.validation.errors.length === 0, `trace validation ${key}`);
            requireEvidence(trace.step_instruction_addresses.length === trace.instruction_count && trace.step_instruction_addresses.every(a => allInstructions.has(a)), `trace instruction sequence ${key}`);
            const occurrences = unique(trace.raw_occurrences, v => v.id, 'occurrence ID');
            const visits = new Map<string, number>();
            const covered = new Set<number>();
            for (const [index, occ] of trace.raw_occurrences.entries()) {
                const block = blocks.get(occ.block_id);
                requireEvidence(block && occ.index === index && occ.visit_number === (visits.get(occ.block_id) ?? 0) + 1, `occurrence order/visit ${occ.id}`);
                visits.set(occ.block_id, occ.visit_number);
                requireEvidence(occ.start_step === occ.step_indices[0] && occ.end_step === occ.step_indices.at(-1), `occurrence extent ${occ.id}`);
                requireEvidence(occ.next_occurrence_id === (trace.raw_occurrences[index + 1]?.id ?? null) && occ.next_block_id === (trace.raw_occurrences[index + 1]?.block_id ?? null), `occurrence successor ${occ.id}`);
                for (const step of occ.step_indices) {
                    requireEvidence(!covered.has(step) && block.instruction_addresses.includes(trace.step_instruction_addresses[step]), `occurrence instruction ${occ.id}`);
                    covered.add(step);
                }
            }
            requireEvidence(trace.step_instruction_addresses.every((a, s) => !instructions.has(a) || covered.has(s)), `unmapped controller step ${key}`);
            requireEvidence(trace.semantic_events.length === 7 && trace.validation.output_event_count === 7, `output events ${key}`);
            const events = unique(trace.semantic_events, v => v.output, 'output event');
            let previous = -1;
            for (const event of trace.semantic_events) {
                const ins = instructions.get(event.instruction_address), occ = occurrences.get(event.raw_occurrence_id);
                requireEvidence(ins && occ && event.step_index > previous && occ.step_indices.includes(event.step_index) && occ.block_id === event.raw_block_id, `event occurrence ${event.id}`);
                requireEvidence(event.trace_id === trace.id && event.state_id === key && same(event.inputs, row.inputs), `event identity ${event.id}`);
                requireEvidence(trace.step_instruction_addresses[event.step_index] === ins.address && event.instruction_rva === ins.rva && event.instruction_text === `${ins.mnemonic} ${ins.op_str}`.trim(), `event assembly ${event.id}`);
                requireEvidence(event.instruction.bytes === ins.bytes && event.instruction.address === ins.address && event.kind === 'output_write', `event instruction ${event.id}`);
                requireEvidence(event.underlying_instruction_addresses.every(a => occ.step_indices.some(s => s <= event.step_index && trace.step_instruction_addresses[s] === a)), `event prefix ${event.id}`);
                previous = event.step_index;
            }
            for (const name of OUTPUT_FIELDS) {
                const out = row.bcf_native.outputs[name], event = events.get(name);
                requireEvidence((out === 0 || out === 1) && row.clean_native.outputs[name] === out && row.expected_outputs[name] === !!out && trace.final_outputs[name] === out, `retained output ${key}/${name}`);
                requireEvidence(event && event.value === out && event.bool_value === !!out && event.memory_after === (out ? '01000000' : '00000000'), `output commit ${key}/${name}`);
            }
        }
        const regions = unique(b.presentation_regions, v => v.id, 'region ID');
        for (const region of regions.values()) {
            requireEvidence(region.mapping_kind === 'presentation_only' && region.raw_block_ids.length > 0, `region scope ${region.id}`);
            requireEvidence(same(region.instruction_addresses, region.raw_block_ids.flatMap(id => blocks.get(id)?.instruction_addresses ?? [])), `region instructions ${region.id}`);
            requireEvidence(region.ranges.length === region.raw_block_ids.length, `region ranges ${region.id}`);
            for (const range of region.ranges) {
                const block = blocks.get(range.raw_block_id);
                requireEvidence(block && region.raw_block_ids.includes(block.id) && range.start_rva === block.start_rva && range.end_rva_exclusive === block.end_rva_exclusive, `region raw range ${region.id}`);
            }
            for (const site of region.output_commit_sites) requireEvidence(region.raw_block_ids.includes(site.raw_block_id) && instructions.get(site.instruction_address)?.block_id === site.raw_block_id && b.traces.some(t => t.semantic_events.some(e => e.output === site.output && e.instruction_address === site.instruction_address)), `region commit ${region.id}`);
        }
        requireEvidence(b.machine_bindings.length === 6, 'machine bindings');
        unique(b.machine_bindings, v => v.id, 'binding ID');
        for (const binding of b.machine_bindings) requireEvidence(binding.region_ids.length && binding.region_ids.every(id => regions.get(id)?.related_outputs.includes(binding.signal)), `machine mapping ${binding.id}`);
        const clones = unique(b.proof_evidence.clones, v => v.id, 'clone proof');
        const guards = unique(b.proof_evidence.guards, v => v.id, 'guard proof');
        requireEvidence(clones.size === b.proof_evidence.clone_count && guards.size === b.proof_evidence.guard_count && b.proof_evidence.assumptions.length > 0, 'proof inventory');
        for (const candidate of b.bogus_candidates) {
            const proof = clones.get(candidate.proof_id);
            requireEvidence(proof && candidate.classification === 'proven_bogus_clone' && candidate.proof_reference.sha256 === b.proof_evidence.retained_proof.sha256, `bogus proof ${candidate.id}`);
            requireEvidence(same(candidate.raw_block_ids, proof.raw_block_ids) && candidate.start_rva === proof.start_rva && candidate.end_rva_exclusive === proof.end_rva_exclusive && same(candidate.guard_ids, proof.guard_ids) && proof.guard_ids.every(id => guards.has(id)), `bogus provenance ${candidate.id}`);
            const addresses = candidate.raw_block_ids.flatMap(id => {
                const block = blocks.get(id);
                requireEvidence(block?.clone_proof_id === proof.id && block.classification === 'proven_bogus_clone', `bogus block ${id}`);
                return block.instruction_addresses;
            });
            requireEvidence(candidate.instructions.length === addresses.length && candidate.instruction_count === addresses.length, `bogus instruction count ${candidate.id}`);
            candidate.instructions.forEach((line, i) => {
                const ins = instructions.get(addresses[i])!;
                requireEvidence(Number(line.va) === ins.address && Number(line.rva) === ins.rva && line.bytes === ins.bytes.replaceAll(' ', '') && line.text === `${ins.mnemonic} ${ins.op_str}`.trim(), `bogus assembly ${candidate.id}`);
            });
        }
        requireEvidence(b.bogus_candidates.some(c => c.id === 'bcf_clone_originalBB71alteredBB' && c.rank === 1), 'recommended bogus candidate');
        requireEvidence(b.presentation_messages.source === 'mock-presentation' && b.presentation_messages.decoded_by_binary === false, 'authored string boundary');
        return b;
    } catch (error) {
        throw new Error(`Invalid validated UPLINK bundle: ${error instanceof Error ? error.message : error}`, { cause: error });
    }
}
