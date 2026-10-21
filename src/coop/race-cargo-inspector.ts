import type { RaceCargoEvidence } from './race-cargo-evidence.ts';
import { CARGO_IMAGE_BASE, type CargoFragment } from './race-cargo-types.ts';
import { CARGO_LABELS, cargoFeedback, selectedCargoStore } from '../slice/race-cargo-presentation.ts';
import { hex } from './native-evidence.ts';

export function cargoEvidenceDetails(e: Pick<RaceCargoEvidence, 'data' | 'state' | 'status'>, id: string): string {
    const { data, state } = e;
    if (!data) return `CARGO TRANSFER CONTROLLER · STATE-LINKED\nAssembly ${e.status}. Gameplay continues independently.\nNo substitute native evidence is shown.`;
    const section = data.sections.find(s => s.id === id) ?? data.sections[0];
    const selected = state ? selectedCargoStore(data, section.output, state.outputs[section.output]) : null;
    const lines = ['CARGO TRANSFER CONTROLLER · STATE-LINKED',
        'Accepted raw output selects a real store; this is result association, never instruction execution.',
        `Specimen: ${data.specimen_id} · image base ${hex(data.image_base)}`,
        `PE SHA-256: ${data.bcf_pe_sha256}`, `Study: ${data.study}`,
        `AUTHORED INPUTS: A=${state?.dropA ?? 'UNKNOWN'} B=${state?.dropB ?? 'UNKNOWN'} phase=${state?.phase ?? 'UNKNOWN'} · ${state?.connected ? 'ACCEPTED' : 'LAST KNOWN / unavailable'}`,
        ...(state ? [`AUTHORED STATUS: ${cargoFeedback(state).title}`] : []), ''];
    const provenance = () => lines.push('', 'PROVENANCE / LIMITS',
        'NO MATCHING LIVE TRACE: the complete canonical eleven-input native frame is not available.',
        'Representative samples elsewhere in Evidence remain samples, not current cargo execution.',
        'Each accepted snapshot is a separate evaluation; waiting is not a continuous CPU trace.',
        'Static checks may short-circuit; no branch direction, CPU flags, registers or PC are inferred.',
        'Layout, labels, colours and reveals are authored UI annotations, not extracted PE strings.',
        'Authored unstable platforms are not proven bogus blocks.',
        'Phase enum: 0 idle, 1 window, 2 released, 3 expired. This is not a Boolean.',
        'Countdown uses server remainingMs/durationMs and receipt time. Displayed zero cannot change phase.',
        'Sources and exact file SHA-256:', ...Object.entries(data.sources).map(([p, h]) => `${p}\n  ${h}`));
    const fragment = (f: CargoFragment) => {
        lines.push(`${f.id} · ${f.role} · ${f.source_block_id}`,
            `RVA [${hex(f.address_range.start_rva)}, ${hex(f.address_range.end_rva_exclusive)}) · VA [${hex(f.address_range.start_va)}, ${hex(f.address_range.end_va_exclusive)})`);
        for (const i of f.instructions) lines.push(`${hex(i.address)}  RVA ${hex(i.rva)}  ${i.bytes.padEnd(24)} ${i.mnemonic} ${i.op_str}  [${i.size} bytes]`);
        if (f.verified_output_store) {
            const s = f.verified_output_store;
            lines.push(`Genuine write ${s.value} · ${s.output} · output buffer +${s.byte_offset} · ${hex(CARGO_IMAGE_BASE + s.instruction_rva)}`);
        }
        lines.push('');
    };
    if (id === 'guard') {
        lines.push('OPTIONAL OBFUSCATOR CODE · global x/y comparisons are NOT DROP A, DROP B or phase checks.',
            'This guard sits after the upper Boolean spill and before its reload. Its clobbers explain the saved byte.', '');
        fragment(data.fragments.find(f => f.role === 'obfuscator_guard')!);
        provenance(); return lines.join('\n');
    }
    lines.push(`${CARGO_LABELS[data.sections.indexOf(section)]} · ${section.output} → existing target ${section.machinery}`,
        `Result-associated fragment: ${selected?.id ?? 'UNKNOWN'}${state?.connected ? '' : ' (LAST KNOWN)'}`, '');
    lines.push('… OMITTED intervening code. Both real output alternatives follow as alternatives, NOT consecutive instructions.', '');
    for (const bit of ['0', '1'] as const) {
        const f = data.fragments.find(f => f.id === section.store_alternatives[bit])!;
        lines.push(`ALTERNATIVE WRITE ${bit}${selected?.id === f.id ? ' · ASSOCIATED WITH ACCEPTED RESULT' : ' · STATIC'}`);
        fragment(f);
    }
    lines.push('STATIC NATIVE CONTEXT / explicit omissions', 'CMP/SETcc spills a gameplay Boolean; intervening BCF code clobbers AL and flags.', 'The later reload restores the saved Boolean; TEST AL,1 supplies the gameplay JNE flags.', 'Dividers are NOT direct CFG edges. JNE retains its actual destination, often an intervening guard.', 'No case-specific gap counts, register values or observed edges are applied here.', '');
    if (section.id === 'upper-support') {
        fragment(data.fragments.find(f => f.id === 'upper-support.input-slot')!);
        lines.push('… OMITTED master-local code between input-slot RVA 0x1183 and dereference RVA 0x1196. No new edge asserted.', '');
    }
    for (const [n, fragmentId] of section.condition_fragments.entries()) {
        if (n) lines.push(n % 2 ? '… OMITTED BCF guard code (clobbers AL/flags); saved Boolean survives.' : '… OMITTED intervening code; next check is static context and may short-circuit.', '');
        fragment(data.fragments.find(f => f.id === fragmentId)!);
    }
    provenance();
    return lines.join('\n');
}
