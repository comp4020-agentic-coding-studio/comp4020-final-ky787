/** Accepted snapshot + isolated compact evidence loader. This never writes gameplay state. */
import type { SharedRoom } from './protocol.ts';
import { CARGO_ASSET_SHA256 } from './race-cargo-integrity.ts';
import { CARGO_ASSET_BUDGET, CARGO_ASSET_URL, CARGO_IMAGE_BASE, CARGO_OUTPUTS, CARGO_PE_SHA256, CARGO_SECTIONS, CARGO_STUDY, type CargoArtifact, type CargoOutput } from './race-cargo-types.ts';
export type CargoPhase = 'idle' | 'window' | 'released' | 'expired';
export const CARGO_PHASES: readonly CargoPhase[] = ['idle', 'window', 'released', 'expired'];
export interface CargoAccepted {
    /** Private identity for transition reset; omitted from diagnostics. */
    key: string;
    revision: number;
    connected: boolean;
    dropA: boolean | null;
    dropB: boolean | null;
    outputs: Record<CargoOutput, boolean | null>;
    phase: CargoPhase | null;
    remainingMs: number | null;
    durationMs: number | null;
    receivedAt: number;
}
const bool = (v: unknown) => typeof v === 'boolean' ? v : null;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
export function cargoAccepted(room: SharedRoom | null, connected: boolean, receivedAt: number): CargoAccepted | null {
    if (!room || room.draft || room.level !== 'race-condition' || typeof room.code !== 'string' || !room.code
        || !Number.isSafeInteger(room.levelInstance) || room.levelInstance < 0 || !Number.isSafeInteger(room.revision) || room.revision < 0) return null;
    const s = room.levelState, b = s?.buffer;
    return { key: `${room.code}:${room.levelInstance}`, revision: room.revision, connected,
        dropA: bool(s?.inputs?.dropA), dropB: bool(s?.inputs?.dropB),
        outputs: Object.fromEntries(CARGO_OUTPUTS.map(o => [o, bool(s?.outputs?.[o])])) as CargoAccepted['outputs'],
        phase: CARGO_PHASES.includes(b?.phase) ? b.phase : null,
        remainingMs: finite(b?.remainingMs) ? b.remainingMs : null,
        durationMs: finite(b?.durationMs) && b.durationMs > 0 ? b.durationMs : null, receivedAt };
}
/** Same receipt-based semantics as RaceAuthority.bufferDisplay; zero NEVER changes phase. */
export function cargoBufferDisplay(s: CargoAccepted, now: number) {
    const seconds = s.remainingMs === null || !finite(s.receivedAt) ? null
        : Math.max(0, s.remainingMs - Math.max(0, now - s.receivedAt)) / 1000;
    return { phase: s.phase, seconds, fraction: s.phase === 'idle' ? 1 : seconds === null || s.durationMs === null ? 0
        : Math.min(1, seconds * 1000 / s.durationMs) };
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown): v is number => finite(v) && Number.isSafeInteger(v);
const targets = ['cargo-top', 'cargo-buffer', 'safety-beam', 'race-beam'];
const storeRVAs = [[0x1279, 0x120e], [0x14b6, 0x144a], [0x167a, 0x160e], [0x1840, 0x17d4]];
/** Bounded structural guard; the loader additionally checks the build-verified content digest. */
export function validateCargoArtifact(v: unknown): CargoArtifact {
    const bad = (): never => { throw Error('Cargo evidence does not match the validated study'); };
    if (!object(v) || v.schema !== 'race-cargo-presentation/v1' || v.chamber_id !== 'race-condition'
        || v.specimen_id !== 'race-condition_ollvm_bcf' || v.bcf_pe_sha256 !== CARGO_PE_SHA256 || v.image_base !== CARGO_IMAGE_BASE
        || v.study !== CARGO_STUDY || v.separation !== 'omitted-code-not-cfg-edges' || !object(v.sources)
        || Object.keys(v.sources).length !== 8 || Object.values(v.sources).some(s => typeof s !== 'string' || !/^[a-f0-9]{64}$/.test(s))
        || !Array.isArray(v.sections) || v.sections.length !== 4 || !Array.isArray(v.fragments) || v.fragments.length !== 26) return bad();
    const ids = new Set<string>();
    for (const f of v.fragments) {
        if (!object(f) || typeof f.id !== 'string' || ids.has(f.id) || !CARGO_SECTIONS.includes(f.section as never)
            || !CARGO_OUTPUTS.includes(f.output as never) || CARGO_OUTPUTS[CARGO_SECTIONS.indexOf(f.section as never)] !== f.output
            || !['pointer_context', 'input_check', 'puzzle_branch', 'output_store', 'obfuscator_guard'].includes(String(f.role))
            || typeof f.source_block_id !== 'string' || !/^bb_[0-9A-F]{8}$/.test(f.source_block_id)
            || !object(f.address_range) || !Array.isArray(f.instructions) || !f.instructions.length || f.instructions.length > 13) return bad();
        ids.add(f.id);
        let next = f.address_range.start_va;
        if (!integer(next) || f.address_range.start_rva !== next - CARGO_IMAGE_BASE) return bad();
        for (const i of f.instructions) {
            if (!object(i) || !integer(i.address) || !integer(i.rva) || i.address !== CARGO_IMAGE_BASE + i.rva
                || i.address !== next || i.block_id !== f.source_block_id || !integer(i.size) || i.size < 1 || i.size > 15
                || typeof i.bytes !== 'string' || !/^[a-f0-9]{2}(?: [a-f0-9]{2})*$/.test(i.bytes) || i.bytes.split(' ').length !== i.size
                || typeof i.mnemonic !== 'string' || typeof i.op_str !== 'string') return bad();
            next = i.address + i.size;
        }
        if (next !== f.address_range.end_va_exclusive || f.address_range.end_rva_exclusive !== (next as number) - CARGO_IMAGE_BASE) return bad();
        if (f.role === 'output_store') {
            const s = f.verified_output_store, n = CARGO_OUTPUTS.indexOf(f.output as never);
            if (!object(s) || (s.value !== 0 && s.value !== 1) || s.output !== f.output || s.byte_offset !== n * 4
                || s.instruction_rva !== storeRVAs[n][s.value] || s.instruction_address !== CARGO_IMAGE_BASE + (s.instruction_rva as number)
                || s.source_block_id !== f.source_block_id || f.id !== `${f.section}.write-${s.value}`
                || !f.instructions.some(i => i.address === s.instruction_address)) return bad();
        } else if (f.verified_output_store !== null) return bad();
    }
    const fragments = v.fragments;
    for (const [n, s] of v.sections.entries()) {
        if (!object(s) || s.id !== CARGO_SECTIONS[n] || s.output !== CARGO_OUTPUTS[n] || s.machinery !== targets[n]
            || !Array.isArray(s.condition_fragments) || s.condition_fragments.length !== [2, 6, 4, 4][n]
            || !s.condition_fragments.every((id, i) => fragments.some((f: Record<string, unknown>) => f.id === id && f.section === s.id && f.role === (i % 2 ? 'puzzle_branch' : 'input_check')))
            || !object(s.store_alternatives) || s.store_alternatives['0'] !== `${s.id}.write-0` || s.store_alternatives['1'] !== `${s.id}.write-1`) return bad();
    }
    return v as unknown as CargoArtifact;
}
export async function parseCargoAsset(text: string): Promise<CargoArtifact> {
    const bytes = new TextEncoder().encode(text);
    if (bytes.length > CARGO_ASSET_BUDGET) throw Error('Cargo evidence exceeds its size budget');
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
    if (hash !== CARGO_ASSET_SHA256) throw Error('Cargo evidence integrity mismatch');
    return validateCargoArtifact(JSON.parse(text));
}
export class RaceCargoEvidence {
    data: CargoArtifact | null = null;
    state: CargoAccepted | null = null;
    status: 'idle' | 'loading' | 'ready' | 'unavailable' = 'idle';
    private cache: CargoArtifact | null = null;
    private pending: Promise<CargoArtifact> | null = null;
    private key = '';
    private generation = 0;
    private connected = false;
    private previousRoom: SharedRoom | null = null;
    private disconnectedReceipt: number | null = null;
    update(room: SharedRoom | null, connected: boolean, receivedAt: number): void {
        const reconnect = connected && !this.connected;
        if (!connected && this.connected) this.disconnectedReceipt = receivedAt;
        // Reconnecting transport alone does not certify the old snapshot as fresh.
        const trusted = connected && (this.disconnectedReceipt === null || receivedAt !== this.disconnectedReceipt);
        if (trusted) this.disconnectedReceipt = null;
        if (room !== this.previousRoom || connected !== this.connected || this.state?.connected !== trusted)
            this.state = cargoAccepted(room, trusted, receivedAt);
        this.previousRoom = room; this.connected = connected;
        const key = this.state?.key ?? '';
        if (key === this.key && !(reconnect && this.status === 'unavailable')) return;
        this.key = key; const generation = ++this.generation;
        this.data = null; this.status = 'idle';
        if (!this.state) return;
        if (this.cache) { this.data = this.cache; this.status = 'ready'; return; }
        this.status = 'loading';
        this.load().then(data => {
            if (generation === this.generation) { this.data = data; this.status = 'ready'; }
        }).catch(() => { if (generation === this.generation) { this.data = null; this.status = 'unavailable'; } });
    }
    private load(): Promise<CargoArtifact> {
        if (this.pending) return this.pending;
        const request = Promise.resolve().then(() => fetch(CARGO_ASSET_URL)).then(async r => {
            if (!r.ok) throw Error('Cargo evidence unavailable');
            const value = await parseCargoAsset(await r.text()); this.cache = value; return value;
        });
        this.pending = request;
        void request.then(() => { this.pending = null; }, () => { this.pending = null; });
        return request;
    }
}
