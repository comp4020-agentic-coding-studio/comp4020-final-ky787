import type { SharedRoom } from './protocol.ts';
import { nativeWorldState, type NativeWorldState } from './native-world-evidence.ts';
import { RACE_MACHINERY_SHA256 } from './race-machinery-integrity.ts';
import { RACE_MACHINERY_BASE, RACE_MACHINERY_BUDGET, RACE_MACHINERY_OUTPUTS, RACE_MACHINERY_PE, RACE_MACHINERY_URL, type RaceMachineryArtifact } from './race-machinery-types.ts';

export interface MachineryAccepted extends NativeWorldState { key: string }
export function machineryAccepted(room: SharedRoom | null, connected: boolean): MachineryAccepted | null {
    if (!room || room.draft || room.level !== 'race-condition' || !room.code || typeof room.code !== 'string'
        || !Number.isSafeInteger(room.levelInstance) || room.levelInstance < 0 || !Number.isSafeInteger(room.revision) || room.revision < 0) return null;
    return { ...nativeWorldState(room, connected)!, key: `${room.code}:${room.levelInstance}` };
}
/** Bounded shape guard. The content digest additionally pins every instruction and binding. */
export function validateRaceMachineryArtifact(value: unknown): RaceMachineryArtifact {
    function fact(ok: unknown): asserts ok { if (!ok) throw Error('RACE machinery evidence mismatch'); }
    const a = value as RaceMachineryArtifact;
    fact(a?.schema === 'race-machinery-presentation/v1' && a.chamber_id === 'race-condition' && a.specimen_id === 'race-condition_ollvm_bcf'
        && a.bcf_pe_sha256 === RACE_MACHINERY_PE && a.image_base === RACE_MACHINERY_BASE && a.separation === 'omitted-code-not-cfg-edges');
    fact(a.sources && Object.keys(a.sources).length === 6 && Object.values(a.sources).every(s => /^[a-f0-9]{64}$/.test(s)));
    fact(Array.isArray(a.sections) && a.sections.length === 5 && Array.isArray(a.fragments) && a.fragments.length === 20);
    const ids = new Set<string>();
    for (const f of a.fragments) {
        fact(f && typeof f.id === 'string' && !ids.has(f.id) && RACE_MACHINERY_OUTPUTS.includes(f.output) && /^bb_[0-9A-F]{8}$/.test(f.block_id));
        ids.add(f.id);
        fact(['input_check', 'saved_boolean_branch', 'output_store'].includes(f.role) && Array.isArray(f.instructions) && f.instructions.length >= 3 && f.instructions.length <= 5);
        let next = f.start_rva;
        fact(Number.isSafeInteger(next) && next >= 0);
        for (const i of f.instructions) {
            fact(i && i.rva === next && i.address === RACE_MACHINERY_BASE + i.rva && i.block_id === f.block_id
                && Number.isSafeInteger(i.size) && i.size >= 1 && i.size <= 15 && /^[a-f0-9]{2}(?: [a-f0-9]{2})*$/.test(i.bytes)
                && i.bytes.split(' ').length === i.size && typeof i.mnemonic === 'string' && typeof i.op_str === 'string');
            next += i.size;
        }
        fact(next === f.end_rva_exclusive);
        if (f.role === 'output_store') {
            const s = f.store, n = RACE_MACHINERY_OUTPUTS.indexOf(f.output);
            const rvas = [[0x198a, 0x191e], [0x1b4d, 0x1ae1], [0x1d10, 0x1ca4], [0x1e5e, 0x1df2], [0x1fac, 0x1f40]];
            fact(s && (s.value === 0 || s.value === 1) && s.rva === rvas[n][s.value] && s.byte_offset === 16 + n * 4
                && f.id === `${f.output}.write-${s.value}` && f.instructions.at(-1)?.rva === s.rva);
        } else fact(f.store === null);
    }
    for (const [n, s] of a.sections.entries()) {
        fact(s.name === RACE_MACHINERY_OUTPUTS[n] && s.byte_offset === 16 + n * 4 && s.game_signal === s.name
            && s.kind === (s.name === 'exitDoor' ? 'persisted_latch_projection' : 'raw_combinational')
            && s.target === ['receiver-master', 'span1', 'crumbleA', 'return-bridge', 'exit'][n]
            && Array.isArray(s.context) && s.context.length === 2 && Array.isArray(s.bindings));
        for (const [k, role] of ['input_check', 'saved_boolean_branch'].entries()) fact(a.fragments.some(f => f.id === s.context[k] && f.output === s.name && f.role === role));
        for (const bit of [0, 1] as const) fact(s.stores[bit] === `${s.name}.write-${bit}` && ids.has(s.stores[bit]));
        for (const b of s.bindings) fact(b.output === s.name && typeof b.target === 'string' && typeof b.invert === 'boolean');
    }
    return a;
}
export async function parseRaceMachineryAsset(text: string): Promise<RaceMachineryArtifact> {
    const bytes = new TextEncoder().encode(text);
    if (bytes.length > RACE_MACHINERY_BUDGET) throw Error('RACE machinery asset exceeds budget');
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
    if (hash !== RACE_MACHINERY_SHA256) throw Error('RACE machinery integrity mismatch');
    return validateRaceMachineryArtifact(JSON.parse(text));
}
/** Independent failure boundary: this asset never gates the cargo blocks or gameplay. */
export class RaceMachineryEvidence {
    data: RaceMachineryArtifact | null = null;
    state: MachineryAccepted | null = null;
    status: 'idle' | 'loading' | 'ready' | 'unavailable' = 'idle';
    private cache: RaceMachineryArtifact | null = null;
    private pending: Promise<RaceMachineryArtifact> | null = null;
    private key = '';
    private generation = 0;
    private connected = false;
    private previousRoom: SharedRoom | null = null;
    private disconnectedReceipt: number | null = null;
    update(room: SharedRoom | null, connected: boolean, receivedAt: number): void {
        const reconnect = connected && !this.connected;
        if (!connected && this.connected) this.disconnectedReceipt = receivedAt;
        const trusted = connected && (this.disconnectedReceipt === null || receivedAt !== this.disconnectedReceipt);
        if (trusted) this.disconnectedReceipt = null;
        if (room !== this.previousRoom || connected !== this.connected || this.state?.connected !== trusted) this.state = machineryAccepted(room, trusted);
        this.previousRoom = room; this.connected = connected;
        const key = this.state?.key ?? '';
        if (key === this.key && !(reconnect && this.status === 'unavailable')) return;
        this.key = key; const generation = ++this.generation;
        this.data = null; this.status = 'idle';
        if (!this.state) return;
        if (this.cache) { this.data = this.cache; this.status = 'ready'; return; }
        this.status = 'loading';
        this.load().then(data => { if (generation === this.generation) { this.data = data; this.status = 'ready'; } })
            .catch(() => { if (generation === this.generation) { this.data = null; this.status = 'unavailable'; } });
    }
    private load(): Promise<RaceMachineryArtifact> {
        if (this.pending) return this.pending;
        const request = Promise.resolve().then(() => fetch(RACE_MACHINERY_URL)).then(async r => {
            if (!r.ok) throw Error('RACE machinery evidence unavailable');
            const value = await parseRaceMachineryAsset(await r.text()); this.cache = value; return value;
        });
        this.pending = request;
        void request.then(() => { this.pending = null; }, () => { this.pending = null; });
        return request;
    }
}
