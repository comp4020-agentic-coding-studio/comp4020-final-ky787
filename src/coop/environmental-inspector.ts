import type { EnvironmentalEvidence } from './environmental-evidence.ts';
import { ENVIRONMENTAL_BLOCKS } from '../slice/environmental-layout.ts';
import { environmentalMessage, environmentalState, selectedEnvironmentalStore } from '../slice/environmental-presentation.ts';
import { hex } from './native-evidence.ts';

/** Optional provenance detail; normal gameplay paints none of this bookkeeping. */
export function environmentalEvidenceDetails(e: Pick<EnvironmentalEvidence, 'data' | 'state' | 'status'>, output: string): string {
    const { data, state } = e;
    if (!data) return `ENVIRONMENTAL ASSEMBLY · STATE-LINKED\nAssembly ${e.status}. No substitute native instructions.`;
    const section = data.sections.find(s => s.name === output) ?? data.sections[0];
    const place = ENVIRONMENTAL_BLOCKS[data.chamber_id].find(p => p.output === section.name)!;
    const accepted = state?.chamber === data.chamber_id ? environmentalState(state, section) : null;
    const selected = accepted ? selectedEnvironmentalStore(data, section.name, accepted.raw) : null;
    const lines = ['ENVIRONMENTAL ASSEMBLY · STATE-LINKED', `${data.chamber_id} · ${section.name} → ${section.target}`,
        'Accepted raw output selects a genuine store; colour and authored string use the existing machinery binding.',
        'This associates a native result with accepted state. It does not show an instruction executing.',
        `Raw: ${accepted?.raw ?? 'UNKNOWN'} · binding power/open: ${accepted?.physical ?? 'UNKNOWN'} · ${state?.connected ? 'ACCEPTED' : 'LAST KNOWN / unavailable'}`,
        `AUTHORED STATUS: ${environmentalMessage(place, accepted?.powered ?? null, !!state?.connected)}`,
        `Associated fragment: ${selected?.id ?? 'UNKNOWN'}`,
        'CROSSFEED routes include accepted physical grace. USE AFTER FREE assist uses the inverted binding.',
        'Exit bindings use the persisted unlock latch. Powered routes do not claim every unstable slab is solid.',
        'DEADLOCK service power includes the accepted completion-enabled result; controls alone do not determine its label.',
        `Specimen: ${data.specimen_id} · image base ${hex(data.image_base)}`, `PE SHA-256: ${data.bcf_pe_sha256}`, '',
        'GENUINE ALTERNATIVES / SEPARATE STATIC FRAGMENTS'];
    for (const id of [section.stores['0'], section.stores['1'], ...section.context]) {
        const f = data.fragments.find(f => f.id === id)!;
        lines.push('', '… OMITTED code / alternative; NOT a direct CFG edge', `${f.id} · ${f.role} · ${f.block_id}`,
            `RVA [${hex(f.start_rva)}, ${hex(f.end_rva_exclusive)})`);
        for (const i of f.instructions) lines.push(`${hex(i.address)}  RVA ${hex(i.rva)}  ${i.bytes.padEnd(24)} ${i.mnemonic} ${i.op_str}  [${i.size} bytes]`);
        if (f.store) lines.push(`Write ${f.store.value} · ${f.output} · output buffer +${f.store.byte_offset} · ${f.store.observed_case_count} retained cases${selected?.id === id ? ' · ASSOCIATED WITH ACCEPTED RAW RESULT' : ''}`);
    }
    lines.push('', 'CONTEXT / LIMITS',
        'The comparison may read a direct input or a derived local Boolean. It is only part of the native condition.',
        'Gameplay comparisons spill a Boolean; intervening BCF code can clobber AL and flags. The later reload/TEST supplies branch flags.',
        'These selections exclude opaque-predicate guards. Real branch targets are preserved, including intervening blocks.',
        'Short-circuited checks are static context. No branch direction, registers, flags, PC or execution timing is inferred.',
        'Independent snapshots are independent evaluations, not a continuous trace through platform movement.',
        'The separate existing trace inspector retains its exact-match versus representative-sample distinction.',
        'Layout, colour and decoded strings are authored UI, not extracted PE strings or proof of bogus code.', '', 'SOURCE FILES / SHA-256',
        ...Object.entries(data.sources).map(([p, h]) => `${p}\n  ${h}`));
    return lines.join('\n');
}
