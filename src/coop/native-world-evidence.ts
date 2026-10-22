/** Cosmetic static evidence and accepted room outputs. Never feeds physics or the controller. */
import { CHAMBER_CONTRACTS, isNativeChamber, type NativeChamberId } from '../../server/native/contracts.ts';
import type { SharedRoom } from './protocol.ts';
import type { NativeWorldArtifact, NativeWorldBinding, NativeWorldOutput } from './native-world-types.ts';
export type { NativeWorldArtifact, NativeWorldBinding, NativeWorldOutput } from './native-world-types.ts';

export interface NativeWorldState {
    chamber: NativeChamberId;
    levelInstance: number;
    revision: number;
    connected: boolean;
    /** Raw accepted native values, never local pending-control predictions. */
    outputs: Readonly<Record<string, boolean>>;
    /** Native physical projections serialized by the existing server snapshot. */
    physical: Readonly<Record<string, boolean>>;
    exitUnlocked: boolean | null;
}
export interface NativeWorldBindingState {
    raw: boolean | null;
    /** Resolved binding power/open state, not collision or authored crumble state. */
    physical: boolean | null;
    explanation: 'direct' | 'inverted' | 'grace' | 'latched';
    grace: boolean;
    inverted: boolean;
    latched: boolean;
    statusLabel: string;
}
const booleanValue = (value: unknown): boolean | null => typeof value === 'boolean' ? value : null;

/** Public/custom drafts never inherit a campaign specimen, even when based on a built-in chamber. */
export function nativeWorldState(room: SharedRoom | null, connected = true): NativeWorldState | null {
    if (!room || room.draft || !isNativeChamber(room.level)) return null;
    const outputs: Record<string, boolean> = {}, physical: Record<string, boolean> = {};
    const reported = (room.levelState as { outputs?: Record<string, boolean> })?.outputs;
    for (const name of CHAMBER_CONTRACTS[room.level].outputs) {
        if (typeof reported?.[name] === 'boolean') outputs[name] = reported[name];
    }
    const assign = (name: string, value: unknown) => { if (typeof value === 'boolean') physical[name] = value; };
    if (room.level === 'crossfeed-vault') {
        assign('physicalLeftRoute', room.levelState.physical.leftRoute);
        assign('physicalRightRoute', room.levelState.physical.rightRoute);
    } else if (room.level === 'race-condition') {
        assign('physicalPhaseA', room.levelState?.physical?.phaseA);
        assign('physicalPhaseB', room.levelState?.physical?.phaseB);
        assign('physicalReturnBridge', room.levelState?.physical?.returnBridge);
    }
    return { chamber: room.level, levelInstance: room.levelInstance, revision: room.revision, connected,
        outputs, physical, exitUnlocked: booleanValue(room.exitUnlocked) };
}

/** Apply only the acquired binding's existing presentation semantics, never a new puzzle decision. */
export function nativeWorldBindingState(state: NativeWorldState, output: Pick<NativeWorldOutput, 'name' | 'kind'>, binding?: NativeWorldBinding): NativeWorldBindingState {
    const raw = booleanValue(output.kind === 'physical_projection' ? state.physical[output.name] : state.outputs[output.name]);
    const latched = output.kind === 'persisted_latch_projection' || binding?.property === 'unlock' || binding?.property === 'unlocked';
    const inverted = !!binding?.invert;
    let physical = raw === null ? null : raw !== inverted;
    let explanation: NativeWorldBindingState['explanation'] = inverted ? 'inverted' : 'direct';
    if (binding?.physical_output) { physical = booleanValue(state.physical[binding.physical_output]); explanation = 'grace'; }
    if (latched) { physical = state.exitUnlocked; explanation = 'latched'; }
    const grace = explanation === 'grace' && raw === false && physical === true;
    const bit = raw === null ? '?' : Number(raw);
    const open = latched || binding?.property === 'open' || binding?.property === 'openWhen';
    const value = physical === null ? '?' : physical ? open ? 'OPEN' : 'ON' : open ? 'CLOSED' : 'OFF';
    const suffix = explanation === 'latched' ? ' · SERVER LATCH' : explanation === 'inverted' ? ' · INVERTED' : grace ? ' · SERVER GRACE' : '';
    return { raw, physical, explanation, grace, inverted, latched, statusLabel: `RAW ${bit} · ${open ? 'GATE' : 'POWER'} ${value}${suffix}` };
}

const sha256 = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Runtime shape/specimen guard; the build-time verifier proves exact PE bytes and mappings. */
export function validateNativeWorldArtifact(value: unknown, chamber: NativeChamberId): NativeWorldArtifact {
    const invalid = () => { throw new Error('Native world evidence does not match this chamber'); };
    if (!object(value) || value.schema !== 'coop-native-world/v1' || value.chamber_id !== chamber
        || value.specimen_id !== `${chamber}_ollvm_bcf` || value.presentation !== 'static-output-store'
        || !sha256(value.bcf_pe_sha256) || !sha256(value.contract_sha256) || !integer(value.image_base)
        || !object(value.sources) || !sha256(value.sources.integration_sha256) || !sha256(value.sources.disassembly_sha256)
        || !Array.isArray(value.outputs) || value.outputs.length > 14) return invalid();
    const names = new Set<string>();
    for (const output of value.outputs) {
        if (!object(output) || typeof output.name !== 'string' || names.has(output.name)
            || !CHAMBER_CONTRACTS[chamber].outputs.includes(output.name)
            || !['raw_combinational', 'physical_projection', 'persisted_latch_projection', 'unlock_candidate'].includes(String(output.kind))
            || !(output.game_signal === null || typeof output.game_signal === 'string') || !integer(output.byte_offset)
            || !Array.isArray(output.bindings) || output.bindings.length > 32 || !object(output.excerpt)) return invalid();
        names.add(output.name);
        for (const binding of output.bindings) {
            if (!object(binding) || typeof binding.id !== 'string' || typeof binding.target !== 'string' || typeof binding.property !== 'string'
                || typeof binding.output !== 'string' || !CHAMBER_CONTRACTS[chamber].outputs.includes(binding.output)
                || typeof binding.invert !== 'boolean' || binding.physical_output !== undefined && (typeof binding.physical_output !== 'string'
                    || !CHAMBER_CONTRACTS[chamber].outputs.includes(binding.physical_output))) return invalid();
        }
        const excerpt = output.excerpt;
        if (typeof excerpt.block_id !== 'string' || !integer(excerpt.store_address)
            || !Array.isArray(excerpt.observed_values) || !excerpt.observed_values.length || excerpt.observed_values.some(n => n !== 0 && n !== 1)
            || !Array.isArray(excerpt.instructions) || !excerpt.instructions.length || excerpt.instructions.length > 5) return invalid();
        let next: number | null = null, storeSeen = false;
        for (const instruction of excerpt.instructions) {
            if (!object(instruction) || instruction.block_id !== excerpt.block_id || !integer(instruction.address) || !integer(instruction.rva)
                || !integer(instruction.size) || instruction.size < 1 || instruction.size > 15 || instruction.address !== value.image_base + instruction.rva
                || typeof instruction.bytes !== 'string' || !/^[a-f0-9]{2}(?: [a-f0-9]{2})*$/.test(instruction.bytes)
                || instruction.bytes.split(' ').length !== instruction.size || typeof instruction.mnemonic !== 'string'
                || typeof instruction.op_str !== 'string' || next !== null && instruction.address !== next) return invalid();
            next = instruction.address + instruction.size;
            if (instruction.address === excerpt.store_address) storeSeen = true;
        }
        if (!storeSeen) return invalid();
    }
    if (!names.size) return invalid();
    return value as unknown as NativeWorldArtifact;
}

export type NativeWorldLoadStatus = 'idle' | 'loading' | 'ready' | 'unavailable';
export class NativeWorldEvidence {
    data: NativeWorldArtifact | null = null;
    state: NativeWorldState | null = null;
    status: NativeWorldLoadStatus = 'idle';
    private readonly cache = new Map<NativeChamberId, NativeWorldArtifact>();
    private readonly pending = new Map<NativeChamberId, Promise<NativeWorldArtifact>>();
    private key = '';
    private generation = 0;
    private previousRoom: SharedRoom | null = null;
    private connected = false;

    /** Repeated frames/snapshots do not refetch. A failed entry retries on re-entry or reconnect. */
    update(room: SharedRoom | null, connected = true): void {
        const eligible = room && !room.draft && isNativeChamber(room.level);
        const key = eligible ? `${room.code}:${room.levelInstance}:${room.level}` : '';
        const reconnect = connected && !this.connected;
        const changed = key !== this.key;
        if (room !== this.previousRoom || connected !== this.connected) this.state = nativeWorldState(room, connected);
        this.previousRoom = room; this.connected = connected;
        if (!changed && !(reconnect && this.status === 'unavailable')) return;
        this.key = key;
        const generation = ++this.generation;
        this.data = null; this.status = 'idle';
        if (!this.state) return;
        const chamber = this.state.chamber;
        const cached = this.cache.get(chamber);
        if (cached) { this.data = cached; this.status = 'ready'; return; }
        this.status = 'loading';
        this.load(chamber).then(data => {
            if (generation !== this.generation) return;
            this.data = data; this.status = 'ready';
        }).catch(() => {
            if (generation !== this.generation) return;
            this.data = null; this.status = 'unavailable';
        });
    }
    private load(chamber: NativeChamberId): Promise<NativeWorldArtifact> {
        const existing = this.pending.get(chamber);
        if (existing) return existing;
        // Promise boundary also catches a fetch implementation that throws synchronously.
        const request = Promise.resolve().then(() => fetch(`/evidence/coop/${chamber}.world.json`))
            .then(async response => {
                if (!response.ok) throw new Error('Native world evidence unavailable');
                return validateNativeWorldArtifact(await response.json(), chamber);
            }).then(data => { this.cache.set(chamber, data); return data; });
        this.pending.set(chamber, request);
        void request.then(() => this.pending.delete(chamber), () => this.pending.delete(chamber));
        return request;
    }
    resolve(outputName: string, bindingId?: string): NativeWorldBindingState | null {
        if (!this.data || !this.state || this.data.chamber_id !== this.state.chamber) return null;
        const output = this.data.outputs.find(o => o.name === outputName);
        if (!output) return null;
        const binding = bindingId === undefined ? undefined : output.bindings.find(b => b.id === bindingId);
        if (bindingId !== undefined && !binding) return null;
        return nativeWorldBindingState(this.state, output, binding);
    }
    snapshot() {
        return { status: this.status, chamber: this.state?.chamber ?? null, specimen: this.data?.specimen_id ?? null,
            presentation: this.data?.presentation ?? null, connected: this.state?.connected ?? false,
            outputs: this.state?.outputs ?? {}, physical: this.state?.physical ?? {}, exitUnlocked: this.state?.exitUnlocked ?? null,
            excerpts: this.data?.outputs.map(o => ({ output: o.name, block: o.excerpt.block_id, store: o.excerpt.store_address,
                addresses: o.excerpt.instructions.map(i => i.address) })) ?? [] };
    }
}
