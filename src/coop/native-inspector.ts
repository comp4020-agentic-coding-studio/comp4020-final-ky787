/**
 * Paused co-op evidence inspector for the five native-backed chambers.
 *
 * Renders into the existing #evidence aside. It is a separate adapter from the
 * CONTROL SPINE EvidenceInspector so that single-player evidence is untouched.
 * It never writes world or controller state; it only reads the current co-op
 * room snapshot and the lazy-loaded evidence files.
 */
import {
    loadEvidence, loadTraces, declarativeCaseId, traceForState, hex,
    isNativeChamber, type NativeChamberId, type NativeEvidence, type NativeTraces, type NativeTrace,
} from './native-evidence.ts';
import type { SharedRoom, SessionRoom } from './protocol.ts';
import type { RaceCargoEvidence } from './race-cargo-evidence.ts';
import { cargoEvidenceDetails } from './race-cargo-inspector.ts';
import { CARGO_SECTIONS } from './race-cargo-types.ts';
import { CARGO_LABELS } from '../slice/race-cargo-presentation.ts';
import type { RaceMachineryEvidence } from './race-machinery-evidence.ts';
import { RACE_MACHINERY_OUTPUTS } from './race-machinery-types.ts';
import { machineryEvidenceDetails } from './race-machinery-inspector.ts';
import type { EnvironmentalEvidence } from './environmental-evidence.ts';
import { ENVIRONMENTAL_OUTPUTS, isEnvironmentalChamber } from './environmental-types.ts';
import { environmentalEvidenceDetails } from './environmental-inspector.ts';

export interface NativeInspectorView {
    chamber: NativeChamberId;
    /** Current declarative device values, or null for temporal chambers. */
    devices: Readonly<Record<string, boolean>> | null;
    /** Current named native outputs the server reported, for display. */
    outputs: Readonly<Record<string, boolean>>;
    cargo?: Pick<RaceCargoEvidence, 'data' | 'state' | 'status'>;
    machinery?: Pick<RaceMachineryEvidence, 'data' | 'state' | 'status'>;
    environmental?: Pick<EnvironmentalEvidence, 'data' | 'state' | 'status'>;
}

/** Derive the inspector view from a co-op room snapshot, if it is native-backed. */
export function nativeInspectorView(room: SessionRoom | null, cargo?: RaceCargoEvidence, machinery?: RaceMachineryEvidence, environmental?: EnvironmentalEvidence): NativeInspectorView | null {
    if (!room || room.draft || !isNativeChamber(room.level)) return null;
    const chamber = room.level;
    const state = room.levelState as { devices?: Record<string, boolean>; outputs?: Record<string, boolean> };
    if ('devices' in state && state.devices && state.outputs) {
        return { chamber, devices: state.devices, outputs: state.outputs, environmental };
    }
    const temporal = room.levelState as { outputs?: Record<string, boolean> };
    return { chamber, devices: null, outputs: temporal.outputs ?? {}, ...(chamber === 'race-condition' ? { cargo, machinery } : { environmental }) };
}

export class NativeEvidenceInspector {
    readonly element = document.querySelector<HTMLElement>('#evidence')!;
    private readonly select = this.element.querySelector<HTMLSelectElement>('select')!;
    private readonly pre = this.element.querySelector<HTMLElement>('pre')!;
    private readonly bogusLabel = this.element.querySelector<HTMLLabelElement>('label:last-of-type')!;
    private current: NativeChamberId | null = null;
    private evidence: NativeEvidence | null = null;
    private traces: NativeTraces | null = null;
    private view: NativeInspectorView | null = null;
    private renderKey = '';
    private generation = 0;

    constructor(private onClose: () => void) {
        this.element.querySelector('button')!.addEventListener('click', () => this.onClose());
        this.select.addEventListener('change', () => { this.renderKey = ''; this.render(); });
    }

    /** Open the inspector for the current native-backed room. Loads evidence on demand. */
    async open(view: NativeInspectorView): Promise<void> {
        this.view = view;
        this.element.hidden = false;
        this.bogusLabel.style.display = 'none'; // native inspector manages bogus via the region select
        if (this.current !== view.chamber || !this.evidence) {
            const generation = ++this.generation;
            this.current = view.chamber;
            this.evidence = null; this.traces = null; this.renderKey = '';
            this.pre.textContent = 'Loading verified native evidence…';
            this.populateRegions(); this.render();
            try {
                const [evidence, traces] = await Promise.all([loadEvidence(view.chamber), loadTraces(view.chamber)]);
                if (generation !== this.generation) return;
                this.evidence = evidence; this.traces = traces;
                // Current/environment navigation exists before the lazy package
                // arrives; unchanged accepted state must still paint newly loaded data.
                this.renderKey = '';
            } catch (error) {
                if (generation !== this.generation) return;
                if (/^(cargo|machinery|environmental):/.test(this.select.value)) this.render();
                else this.pre.textContent = `Native evidence could not be loaded: ${(error as Error).message}`;
                return;
            }
            this.populateRegions();
        }
        this.render();
    }

    /** Update the current input state while the inspector is open (e.g. state changed). */
    update(view: NativeInspectorView): void {
        if (this.element.hidden || this.current !== view.chamber) return;
        this.view = view;
        this.render();
    }

    private populateRegions(): void {
        const previous = this.select.value;
        this.select.replaceChildren();
        if (this.current === 'race-condition') {
            CARGO_SECTIONS.forEach((s, n) => this.select.add(new Option(`Cargo · ${CARGO_LABELS[n]} · STATE-LINKED`, `cargo:${s}`)));
            this.select.add(new Option('Cargo · optional obfuscator guard', 'cargo:guard'));
            RACE_MACHINERY_OUTPUTS.forEach(s => this.select.add(new Option(`Machinery · ${s} · STATE-LINKED`, `machinery:${s}`)));
        }
        // Preserve existing current/sample navigation; compact provenance is also
        // available if the larger on-demand trace package fails to load.
        if (this.current !== 'race-condition') this.select.add(new Option('Current state · outputs and store sites', 'current'));
        if (this.current && isEnvironmentalChamber(this.current)) {
            for (const output of ENVIRONMENTAL_OUTPUTS[this.current]) this.select.add(new Option(`Environment · ${output} · STATE-LINKED`, `environmental:${output}`));
        }
        if (this.evidence) {
            if (this.current === 'race-condition') this.select.add(new Option('Current state · outputs and store sites', 'current'));
            for (const output of this.evidence.outputs) this.select.add(new Option(`Output · ${output.name}`, `output:${output.name}`));
            this.select.add(new Option(`Proven bogus clones (${this.evidence.bogus.clone_count})`, 'bogus'));
        }
        if ([...this.select.options].some(o => o.value === previous)) this.select.value = previous;
    }

    private currentTrace(): { trace: NativeTrace | null; caseId: number | null; exact: boolean } {
        if (!this.traces || !this.view) return { trace: null, caseId: null, exact: false };
        if (this.view.devices) {
            const caseId = declarativeCaseId(this.view.chamber, this.view.devices);
            const trace = caseId === null ? null : traceForState(this.traces, caseId);
            return { trace, caseId, exact: trace !== null };
        }
        return { trace: null, caseId: null, exact: false };
    }

    private render(): void {
        if (!this.view) return;
        const key = `${this.select.value}:${JSON.stringify({ ...this.view, cargo: this.view.cargo ? { status: this.view.cargo.status, state: this.view.cargo.state } : undefined,
            machinery: this.view.machinery ? { status: this.view.machinery.status, state: this.view.machinery.state } : undefined,
            environmental: this.view.environmental ? { status: this.view.environmental.status, state: this.view.environmental.state } : undefined })}`;
        if (key === this.renderKey) return;
        this.renderKey = key;
        const region = this.select.value;
        if (region.startsWith('environmental:')) {
            this.pre.textContent = this.view.environmental ? environmentalEvidenceDetails(this.view.environmental, region.slice(14)) : 'Environmental accepted state unavailable.';
            return;
        }
        if (region.startsWith('machinery:')) {
            this.pre.textContent = this.view.machinery ? machineryEvidenceDetails(this.view.machinery, region.slice(10)) : 'Machinery accepted state unavailable.';
            return;
        }
        if (region.startsWith('cargo:')) {
            this.pre.textContent = this.view.cargo ? cargoEvidenceDetails(this.view.cargo, region.slice(6)) : 'Cargo accepted state unavailable.';
            return;
        }
        if (!this.evidence || !this.traces) return;
        this.pre.textContent = region === 'bogus' ? this.renderBogus()
            : region.startsWith('output:') ? this.renderOutput(region.slice('output:'.length))
            : this.renderCurrent();
    }

    private header(): string[] {
        const e = this.evidence!;
        return [
            `${e.obfuscation.status_label} — NATIVE-VERIFIED OUTPUTS`,
            `Chamber: ${e.chamber_id} (${e.kind})   Specimen: ${e.specimen_id}`,
            `Obfuscated PE SHA-256: ${e.bcf_pe_sha256}`,
            `${e.obfuscation.compiler} · ${e.obfuscation.pass}`,
            e.obfuscation.note,
            '',
        ];
    }

    private renderCurrent(): string {
        const e = this.evidence!, { trace, caseId, exact } = this.currentTrace();
        const lines = this.header();
        lines.push('CURRENT VALIDATED OUTPUTS (server-authoritative, from the verified lookup table)');
        for (const [name, on] of Object.entries(this.view!.outputs)) lines.push(`  ${name} = ${on ? 1 : 0}`);
        lines.push('');
        if (caseId !== null) lines.push(`Current controller case id: ${caseId}`);
        if (exact && trace) {
            lines.push(`Matching retained trace for this exact state: ${trace.trace_id}`, '');
            lines.push(...this.renderTrace(trace));
        } else if (this.view!.devices) {
            lines.push('No retained dynamic trace for this exact input state.',
                `${e.chamber_id} retained ${this.traces!.traces.length} traces (${this.traces!.exhaustive_coverage ? 'exhaustive' : 'representative'}).`,
                'Select an output below to see its verified static store sites, or a representative trace from the list.', '');
            const sample = this.traces!.traces[0];
            if (sample) lines.push(`Representative trace (sample, not the current execution): ${sample.trace_id}`, '', ...this.renderTrace(sample));
        } else {
            lines.push('Temporal chamber: the native controller computes the combinational projection;',
                'the server owns the buffer scheduler, grace clocks and latches.',
                'Dynamic traces are representative snapshots, not per-state recordings.',
                'Select an output for its verified static store sites.', '');
            const sample = this.traces!.traces.find(t => typeof t.state_id === 'number') ?? this.traces!.traces[0];
            if (sample) lines.push(`Representative trace (sample, not the current execution): ${sample.trace_id}`, '', ...this.renderTrace(sample));
        }
        lines.push('', 'SERVER-OWNED (not native):', ...e.server_owned.map(s => `  · ${s}`));
        return lines.join('\n');
    }

    private renderOutput(name: string): string {
        const e = this.evidence!;
        const output = e.outputs.find(o => o.name === name);
        if (!output) return `Unknown output ${name}`;
        const lines = this.header();
        lines.push(`OUTPUT · ${output.name}`, output.game_signal ? `Game signal: ${output.game_signal}` : 'No single game signal (shared region).',
            `Native output buffer: ${output.memory}`, '',
            'VERIFIED BCF OUTPUT-STORE SITES (exact instruction bytes from the obfuscated PE):');
        for (const s of output.store_sites) {
            lines.push(`  ${hex(s.instruction_address)} (RVA ${hex(s.instruction_rva)})  ${s.bytes.padEnd(22)}  ${s.mnemonic} ${s.op_str}`,
                `      block ${s.raw_block_id} · writes ${output.name} = ${s.observed_values.join('/')} · observed in ${s.observed_case_count} cases`);
        }
        lines.push('', ...e.mapping_limits.map(l => `Note: ${l}`));
        return lines.join('\n');
    }

    private renderTrace(trace: NativeTrace): string[] {
        const lines = [`RETAINED TRACE ${trace.trace_id} · state ${trace.state_id} · ${trace.instruction_count} steps`,
            `Inputs: ${Object.entries(trace.inputs).map(([k, v]) => `${k}=${v}`).join(' ')}`,
            `Native outputs: ${Object.entries(trace.native_outputs).map(([k, v]) => `${k}=${v}`).join(' ')}`,
            '', 'CHRONOLOGICAL OUTPUT COMMITS (actual store events while emulating exact PE bytes):'];
        for (const ev of trace.semantic_events) {
            lines.push(`  step ${ev.step_index} · ${hex(ev.instruction_address)} ${ev.instruction_text} → ${ev.output} = ${ev.value}`,
                `      ${ev.raw_occurrence_id} · block ${ev.raw_block_id}`);
        }
        lines.push('', 'RAW BLOCK OCCURRENCES (observed chronology, not inferred CFG edges):');
        for (const o of trace.raw_occurrences.slice(0, 24)) lines.push(`  ${o.id} · ${o.block_id} visit ${o.visit_number} · steps ${o.start_step}-${o.end_step}`);
        if (trace.raw_occurrences.length > 24) lines.push(`  … ${trace.raw_occurrences.length - 24} more occurrences`);
        return lines;
    }

    private renderBogus(): string {
        const e = this.evidence!, b = e.bogus;
        const lines = this.header();
        lines.push('PROVEN BOGUS CLONES — gameplay-neutral evidence, not executed code',
            `Guards: ${b.guard_count} · altered clones: ${b.clone_count} · recommended: ${b.recommended_candidate_id}`,
            `Opaque-predicate formula: ${b.formula}`,
            `Quantification: ${b.quantification}`, '',
            'These cloned blocks are unreachable under the documented assumptions below.',
            'An unobserved block is not automatically proven unreachable; the proof is the parity argument, not non-execution.', '');
        for (const clone of b.clones.slice(0, 8)) {
            lines.push(`${clone.id} [${clone.classification}, ${clone.confidence}]`,
                `  IR ${clone.original_ir_block} → ${clone.ir_block} · RVA ${clone.start_rva}–${clone.end_rva_exclusive} · guards ${clone.guard_ids.join(', ')}`,
                `  reached by any permitted run: ${clone.reached_by_any_permitted_run}`);
            for (const ins of clone.instructions) lines.push(`      ${ins.rva}  ${ins.bytes.padEnd(22)}  ${ins.text}`);
            if (clone.resembles.length) lines.push(`  static resemblance only: ${clone.resembles.map(r => `${r.output}=${r.value}`).join(', ')} (not an executed output event)`);
        }
        if (b.clones.length > 8) lines.push(`… ${b.clones.length - 8} more proven clones`);
        lines.push('', 'PROOF ASSUMPTIONS:', ...b.assumptions.map(a => `  · ${a}`), '', 'LIMITATIONS:', ...b.limitations.map(l => `  · ${l}`));
        return lines.join('\n');
    }
}

export type { SharedRoom };
