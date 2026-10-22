/** Accepted presentation snapshots and independently failing compact evidence loads. */
import { CHAMBER_CONTRACTS } from '../../server/native/contracts.ts';
import type { SharedRoom } from './protocol.ts';
import { nativeWorldState, type NativeWorldState } from './native-world-evidence.ts';
import { ENVIRONMENTAL_SHA256 } from './environmental-integrity.ts';
import { ENVIRONMENTAL_BASE, ENVIRONMENTAL_BUDGETS, ENVIRONMENTAL_OUTPUTS, ENVIRONMENTAL_PE,
    isEnvironmentalChamber, type EnvironmentalArtifact, type EnvironmentalChamber } from './environmental-types.ts';

export interface EnvironmentalAccepted extends NativeWorldState { chamber: EnvironmentalChamber; key: string }
export function environmentalAccepted(room: SharedRoom | null, connected: boolean): EnvironmentalAccepted | null {
    if (!room || room.draft || !isEnvironmentalChamber(room.level) || typeof room.code !== 'string' || !room.code
        || !Number.isSafeInteger(room.levelInstance) || room.levelInstance < 0 || !Number.isSafeInteger(room.revision) || room.revision < 0) return null;
    return { ...nativeWorldState(room, connected)!, chamber: room.level, key: `${room.code}:${room.levelInstance}:${room.level}` };
}

/** Bounded shape/association guard; the content digest pins exact acquired bytes and bindings. */
export function validateEnvironmentalArtifact(value: unknown, chamber: EnvironmentalChamber): EnvironmentalArtifact {
    function fact(ok: unknown): asserts ok { if (!ok) throw Error('Environmental evidence mismatch'); }
    const a = value as EnvironmentalArtifact;
    fact(isEnvironmentalChamber(chamber) && a?.schema === 'coop-environmental-presentation/v1' && a.chamber_id === chamber
        && a.specimen_id === `${chamber}_ollvm_bcf` && a.bcf_pe_sha256 === ENVIRONMENTAL_PE[chamber]
        && a.image_base === ENVIRONMENTAL_BASE && a.separation === 'omitted-code-not-cfg-edges');
    const names = ENVIRONMENTAL_OUTPUTS[chamber];
    fact(a.sources && Object.keys(a.sources).length === 7 && Object.entries(a.sources).every(([p, s]) =>
        p.startsWith(`experiments/coop-controllers/${chamber}/`) && /^[a-f0-9]{64}$/.test(s)));
    fact(Array.isArray(a.sections) && a.sections.length === names.length && Array.isArray(a.fragments) && a.fragments.length === names.length * 4);
    const ids = new Set<string>();
    for (const f of a.fragments) {
        fact(f && typeof f.id === 'string' && !ids.has(f.id) && names.includes(f.output) && /^bb_[0-9A-F]{8}$/.test(f.block_id));
        ids.add(f.id);
        fact(['gameplay_check', 'saved_boolean_branch', 'output_store'].includes(f.role) && Array.isArray(f.instructions) && f.instructions.length === 3);
        let next = f.start_rva;
        fact(Number.isSafeInteger(next) && next >= 0);
        for (const i of f.instructions) {
            fact(i && i.rva === next && i.address === ENVIRONMENTAL_BASE + i.rva && i.block_id === f.block_id
                && Number.isSafeInteger(i.size) && i.size >= 1 && i.size <= 15 && /^[a-f0-9]{2}(?: [a-f0-9]{2})*$/.test(i.bytes)
                && i.bytes.split(' ').length === i.size && typeof i.mnemonic === 'string' && typeof i.op_str === 'string');
            next += i.size;
        }
        fact(next === f.end_rva_exclusive);
        if (f.role === 'output_store') {
            const s = f.store, offset = CHAMBER_CONTRACTS[chamber].outputs.indexOf(f.output) * 4;
            fact(s && (s.value === 0 || s.value === 1) && s.rva === f.instructions.at(-1)?.rva && s.byte_offset === offset
                && f.id === `${f.output}.write-${s.value}` && Number.isSafeInteger(s.observed_case_count) && s.observed_case_count > 0 && s.observed_case_count <= 32);
            fact(f.instructions.every(i => i.mnemonic === 'mov') && f.instructions[2].op_str === `dword ptr [rax${offset ? ` + ${offset < 10 ? offset : `0x${offset.toString(16)}`}` : ''}], ${s.value}`);
        } else {
            fact(f.store === null);
            if (f.role === 'gameplay_check') fact(f.id === `${f.output}.read` && f.instructions.map(i => i.mnemonic).join(',') === 'cmp,setne,mov');
            else fact(f.id === `${f.output}.branch` && f.instructions.map(i => i.mnemonic).join(',') === 'mov,test,jne' && f.instructions[1].op_str === 'al, 1');
        }
    }
    for (const [n, s] of a.sections.entries()) {
        fact(s && s.name === names[n] && s.byte_offset === CHAMBER_CONTRACTS[chamber].outputs.indexOf(s.name) * 4 && s.kind === 'raw_combinational'
            && (s.game_signal === null || typeof s.game_signal === 'string') && typeof s.target === 'string'
            && Array.isArray(s.context) && s.context.length === 2 && Array.isArray(s.bindings) && s.bindings.length > 0 && s.bindings.length <= 32);
        for (const [k, role] of ['gameplay_check', 'saved_boolean_branch'].entries()) fact(a.fragments.some(f => f.id === s.context[k] && f.output === s.name && f.role === role));
        for (const bit of [0, 1] as const) fact(s.stores?.[bit] === `${s.name}.write-${bit}` && ids.has(s.stores[bit]));
        for (const b of s.bindings) fact(b && b.output === s.name && typeof b.id === 'string' && typeof b.target === 'string'
            && typeof b.property === 'string' && typeof b.invert === 'boolean' && (b.physical_output === undefined || CHAMBER_CONTRACTS[chamber].outputs.includes(b.physical_output)));
        fact(s.bindings.some(b => b.target === s.target));
    }
    return a;
}
export async function parseEnvironmentalAsset(text: string, chamber: EnvironmentalChamber): Promise<EnvironmentalArtifact> {
    const bytes = new TextEncoder().encode(text);
    if (bytes.length > ENVIRONMENTAL_BUDGETS[chamber]) throw Error('Environmental asset exceeds budget');
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
    if (hash !== ENVIRONMENTAL_SHA256[chamber]) throw Error('Environmental integrity mismatch');
    return validateEnvironmentalArtifact(JSON.parse(text), chamber);
}

export class EnvironmentalEvidence {
    data: EnvironmentalArtifact | null = null;
    state: EnvironmentalAccepted | null = null;
    status: 'idle' | 'loading' | 'ready' | 'unavailable' = 'idle';
    private readonly cache = new Map<EnvironmentalChamber, EnvironmentalArtifact>();
    private readonly pending = new Map<EnvironmentalChamber, Promise<EnvironmentalArtifact>>();
    private key = '';
    private generation = 0;
    private connected = false;
    private previousRoom: SharedRoom | null = null;
    private disconnectedReceipt: number | null = null;
    update(room: SharedRoom | null, connected: boolean, receivedAt: number): void {
        const reconnect = connected && !this.connected;
        // Also baseline a presenter first mounted while offline: reconnecting
        // transport alone cannot make that already-held receipt current.
        if (!connected) this.disconnectedReceipt = receivedAt;
        const trusted = connected && Number.isFinite(receivedAt) && (this.disconnectedReceipt === null || receivedAt !== this.disconnectedReceipt);
        if (trusted) this.disconnectedReceipt = null;
        if (room !== this.previousRoom || connected !== this.connected || this.state?.connected !== trusted) this.state = environmentalAccepted(room, trusted);
        this.previousRoom = room; this.connected = connected;
        const key = this.state?.key ?? '';
        if (key === this.key && !(reconnect && this.status === 'unavailable')) return;
        this.key = key; const generation = ++this.generation;
        this.data = null; this.status = 'idle';
        if (!this.state) return;
        const chamber = this.state.chamber, cached = this.cache.get(chamber);
        if (cached) { this.data = cached; this.status = 'ready'; return; }
        this.status = 'loading';
        this.load(chamber).then(data => { if (generation === this.generation) { this.data = data; this.status = 'ready'; } })
            .catch(() => { if (generation === this.generation) { this.data = null; this.status = 'unavailable'; } });
    }
    private load(chamber: EnvironmentalChamber): Promise<EnvironmentalArtifact> {
        const pending = this.pending.get(chamber); if (pending) return pending;
        const request = Promise.resolve().then(() => fetch(`/evidence/coop/${chamber}.environment.json`)).then(async r => {
            if (!r.ok) throw Error('Environmental evidence unavailable');
            const value = await parseEnvironmentalAsset(await r.text(), chamber); this.cache.set(chamber, value); return value;
        });
        this.pending.set(chamber, request);
        void request.then(() => this.pending.delete(chamber), () => this.pending.delete(chamber));
        return request;
    }
}
