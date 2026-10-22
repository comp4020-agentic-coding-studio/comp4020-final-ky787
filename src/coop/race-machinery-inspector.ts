import type { RaceMachineryEvidence } from './race-machinery-evidence.ts';
import { machineryState, machineryMessage, selectedMachineryStore } from '../slice/race-machinery-presentation.ts';
import { hex } from './native-evidence.ts';

export function machineryEvidenceDetails(e: Pick<RaceMachineryEvidence, 'data' | 'state' | 'status'>, output: string): string {
    const { data, state } = e;
    if (!data) return `RACE MACHINERY · STATE-LINKED\nAssembly ${e.status}. Gameplay continues independently; no substitute instructions.`;
    const section = data.sections.find(s => s.name === output) ?? data.sections[0];
    const accepted = state ? machineryState(state, section) : null;
    const selected = accepted ? selectedMachineryStore(data, section.name, accepted.raw) : null;
    const lines = ['RACE MACHINERY · STATE-LINKED', `${section.name} → ${section.target}`,
        'Accepted raw output selects a genuine store. Accent and authored string describe accepted machinery power/open state.',
        'This is result association, not an instruction executing. Colour does not assert the store immediate is the physical power.',
        `Raw: ${accepted?.raw ?? 'UNKNOWN'} · physical projection: ${accepted?.physical ?? 'N/A'} · ${state?.connected ? 'ACCEPTED' : 'LAST KNOWN / unavailable'}`,
        `AUTHORED STATUS: ${machineryMessage(section.name, accepted?.powered ?? null, !!state?.connected)}`,
        `Associated fragment: ${selected?.id ?? 'UNKNOWN'}`, '',
        'Phase and return power include accepted server grace; no local timer or prediction is used.',
        'Phase B power does not override authored unstable-platform breakage/collisions.',
        'Exit open state uses the persisted server latch. spanMaster is a wire signal, not a platform.',
        `Specimen: ${data.specimen_id} · image base ${hex(data.image_base)}`, `PE SHA-256: ${data.bcf_pe_sha256}`, '',
        'GENUINE ALTERNATIVES (not consecutive instructions)'];
    for (const id of [section.stores['0'], section.stores['1'], ...section.context]) {
        const f = data.fragments.find(f => f.id === id)!;
        lines.push('', '… OMITTED code / alternative; NOT a direct CFG edge', `${f.id} · ${f.role} · ${f.block_id}`,
            `RVA [${hex(f.start_rva)}, ${hex(f.end_rva_exclusive)})`);
        for (const i of f.instructions) lines.push(`${hex(i.address)}  RVA ${hex(i.rva)}  ${i.bytes.padEnd(24)} ${i.mnemonic} ${i.op_str}  [${i.size} bytes]`);
        if (f.store) lines.push(`Write ${f.store.value} · ${f.output} · output buffer +${f.store.byte_offset}${selected?.id === id ? ' · ASSOCIATED WITH ACCEPTED RAW RESULT' : ''}`);
    }
    lines.push('', 'STATIC CONTEXT / LIMITS',
        'Reads: spanMaster tests the saved master local; phase A/B test inputs.phase (+0x10); return tests returnOccupied (+0x14); exit tests exitUnlocked (+0x1c).',
        'Pointer setup and other checks are omitted. The master local was computed from payloadDelivered && traceOccupied.',
        'CMP/SETNE spills a Boolean; intervening OLLVM BCF guards clobber AL and flags. The later reload/TEST supplies the gameplay JNE flags.',
        'These excerpts exclude global-variable opaque predicates. Branch operands retain their real destinations, including intervening guards.',
        'Static context may short-circuit. No branch direction, registers, flags, PC or execution timing is inferred.',
        'NO MATCHING LIVE TRACE: the complete canonical eleven-input frame is unavailable. Inspector representative samples remain samples.',
        'Layout, colour and decoded strings are authored presentation, not PE strings or obfuscator evidence.', '', 'SOURCE FILES / SHA-256',
        ...Object.entries(data.sources).map(([p, h]) => `${p}\n  ${h}`));
    return lines.join('\n');
}
