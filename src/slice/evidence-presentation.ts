import type { ControllerFrame, ControllerOutputs } from './controller.ts';
import type { NativeInstruction, RetainedTrace } from '../data/uplink-bundle.ts';
import { uplinkEvidence as bundle } from './validated-controller.ts';
export const provenCrumbleId = 'bcf_clone_originalBB71alteredBB';
export const provenCrumble = bundle.bogus_candidates.find(c => c.id === provenCrumbleId)!;
const instructions = new Map(bundle.raw.instructions.map(i => [i.address, i]));
const traces = new Map(bundle.traces.map(t => [t.id, t]));
export function retainedTrace(frame: ControllerFrame): RetainedTrace | null {
    if (!frame.evidence) return null;
    const trace = traces.get(frame.evidence.traceId);
    if (!trace) throw new Error(`Unresolved retained trace ${frame.evidence.traceId}`);
    return trace;
}
export function machineExcerpt(bindingId: string, trace: RetainedTrace): NativeInstruction[] {
    const binding = bundle.machine_bindings.find(b => b.id === bindingId);
    if (!binding) throw new Error(`Unknown assembly binding ${bindingId}`);
    const event = trace.semantic_events.find(e => e.output === binding.signal)!;
    const regions = bundle.presentation_regions.filter(r => binding.region_ids.includes(r.id));
    if (!regions.some(r => r.output_commit_sites.some(s => s.instruction_address === event.instruction_address && s.output === event.output))) throw new Error(`Unmapped retained commit ${event.id}`);
    const block = bundle.raw.blocks.find(b => b.id === event.raw_block_id)!;
    const index = block.instruction_addresses.indexOf(event.instruction_address);
    const start = Math.max(0, Math.min(index - 3, block.instruction_addresses.length - 5));
    return block.instruction_addresses.slice(start, start + 5).map(a => instructions.get(a)!);
}
export function bogusInstructions(): NativeInstruction[] {
    return provenCrumble.raw_block_ids.flatMap(id => bundle.raw.blocks.find(b => b.id === id)!.instruction_addresses.map(a => instructions.get(a)!));
}
export const hex = (n: number) => `0x${n.toString(16).toUpperCase()}`;
export const instructionText = (i: NativeInstruction) => `${i.mnemonic} ${i.op_str}`.trim();
/** Explanatory replay only. Replacing a state starts its own trace; no invented connecting edge. */
export class TracePlayback {
    trace: RetainedTrace | null = null;
    seconds = 0;
    private roomKey = '';
    private stepTimes: number[] = [];
    private cursor = 0;
    update(frame: ControllerFrame, dt: number): void {
        const key = frame.evidence?.traceId ?? '';
        if (key !== this.roomKey) {
            this.trace = retainedTrace(frame); this.roomKey = key; this.seconds = 0; this.cursor = 0;
            const commits = new Set(this.trace?.semantic_events.map(e => e.step_index));
            let time = 0, lastCommit = -1;
            this.stepTimes = (this.trace?.step_instruction_addresses ?? []).map((_, step) => {
                if (step) time += 1 / 180;
                // Separate close native stores for readability, preserving all real step order.
                if (commits.has(step)) { time = Math.max(time, lastCommit + 0.16); lastCommit = time; }
                return time;
            });
        } else this.seconds += dt;
        while (this.cursor + 1 < this.stepTimes.length && this.stepTimes[this.cursor + 1] <= this.seconds) this.cursor++;
    }
    get step(): number { return this.cursor; }
    get occurrence() { return this.trace?.raw_occurrences.find(o => o.step_indices.includes(this.step)) ?? null; }
    get events() { return this.trace?.semantic_events.filter(e => e.step_index <= this.step) ?? []; }
    pulse(output: string): number {
        const e = this.trace?.semantic_events.find(e => e.output === output);
        const age = e ? this.seconds - this.stepTimes[e.step_index] : -1;
        return age >= 0 ? Math.max(0, 1 - age / 0.25) : 0;
    }
    snapshot() {
        return this.trace ? { traceId: this.trace.id, stateId: this.trace.state_id, step: this.step,
            address: hex(this.trace.step_instruction_addresses[this.step]), occurrence: this.occurrence,
            outputEvents: this.events.map(e => ({ id: e.id, occurrence: e.raw_occurrence_id, step: e.step_index, output: e.output, value: e.bool_value })),
            complete: this.step === this.trace.instruction_count - 1, timing: 'presentation only; outputs already applied' } : null;
    }
}
export function evidenceDetails(bindingId: string, trace: RetainedTrace): string {
    const bogus = bindingId === provenCrumbleId;
    const binding = bundle.machine_bindings.find(b => b.id === bindingId);
    const regions = bundle.presentation_regions.filter(r => binding?.region_ids.includes(r.id));
    const blockIds = bogus ? provenCrumble.raw_block_ids : [...new Set(regions.flatMap(r => r.raw_block_ids))];
    const lines = [
        'VALIDATED OLLVM BCF / retained evidence', `Specimen: ${bundle.specimen_id}`,
        `BCF PE SHA-256: ${bundle.identity.bcf_pe_sha256}`, `Trace: ${trace.id} · state ${trace.state_id}`,
        'Semantic labels and physical placement are authored presentation metadata.',
        'String decode effects are authored; this experiment does not validate string decoding.',
        'Regions may overlap. This list is not a new CFG or a separate machine function.', '',
    ];
    if (bogus) lines.push('PROVEN BOGUS — gameplay crumble metaphor, not successful CPU execution',
        `Proof: ${provenCrumble.proof_id} · guards: ${provenCrumble.guard_ids.join(', ')}`,
        `IR original: ${provenCrumble.original_ir_block} · clone: ${provenCrumble.clone_ir_block}`,
        'All six real instructions remain unchanged. See retained proof assumptions below.', '');
    else lines.push(...regions.map(r => `${r.label} (presentation): ${r.explanation}`), '');
    for (const id of blockIds) {
        const block = bundle.raw.blocks.find(b => b.id === id)!;
        lines.push(`${id} · ${hex(block.start_va)}–${hex(block.end_va_exclusive)} exclusive · IR ${block.ir_block}`);
        for (const a of block.instruction_addresses) { const i = instructions.get(a)!; lines.push(`${hex(i.address)}  ${i.bytes.padEnd(24)}  ${instructionText(i)}`); }
        const visits = trace.raw_occurrences.filter(o => o.block_id === id);
        lines.push(visits.length ? visits.map(o => `${o.id}: visit ${o.visit_number}, steps ${o.start_step}–${o.end_step}`).join('\n') : 'No occurrence in this selected trace (absence alone is not bogus evidence).', '');
    }
    if (bogus) lines.push('RETAINED PROOF / PROVENANCE', JSON.stringify({
        candidate: provenCrumble,
        proof: bundle.proof_evidence.clones.find(p => p.id === provenCrumble.proof_id),
        retainedProof: bundle.proof_evidence.retained_proof, formula: bundle.proof_evidence.formula,
        quantification: bundle.proof_evidence.quantification, assumptions: bundle.proof_evidence.assumptions, solver: bundle.proof_evidence.solver,
    }, null, 2), '');
    lines.push('CHRONOLOGICAL OUTPUT COMMITS (includes false writes; never animation-gated)');
    for (const e of trace.semantic_events) lines.push(`${e.id} · step ${e.step_index} · ${e.raw_occurrence_id}\n${hex(e.instruction_address)} ${e.instruction_text} → ${e.output}=${e.value}`);
    lines.push('', 'RETAINED TRACE OCCURRENCES (not inferred CFG edges)');
    for (const o of trace.raw_occurrences) lines.push(`${o.id} · ${o.block_id} · visit ${o.visit_number} · steps ${o.start_step}–${o.end_step}`);
    lines.push('', `Helper steps remain in chronological timing; no helper platforms. Trace retention: ${JSON.stringify(trace.retained_trace)}`);
    return lines.join('\n');
}
export function signalForBinding(id: string): keyof ControllerOutputs {
    return bundle.machine_bindings.find(b => b.id === id)!.signal as keyof ControllerOutputs;
}
