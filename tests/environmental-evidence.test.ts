import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { buildEnvironmentalArtifact, serializeEnvironmentalArtifact, verifyEnvironmentalArtifact } from '../scripts/native/environmental-evidence.ts';
import { ENVIRONMENTAL_BUDGETS, ENVIRONMENTAL_CHAMBERS, ENVIRONMENTAL_OUTPUTS, type EnvironmentalArtifact, type EnvironmentalChamber } from '../src/coop/environmental-types.ts';
import { environmentalAccepted, EnvironmentalEvidence, parseEnvironmentalAsset, validateEnvironmentalArtifact } from '../src/coop/environmental-evidence.ts';
import { nativeWorldBindingState } from '../src/coop/native-world-evidence.ts';
import { WORLD_ASSEMBLY_PLACEMENTS } from '../src/slice/native-world-presentation.ts';
import type { SharedRoom } from '../src/coop/protocol.ts';

const content = (chamber: EnvironmentalChamber) => readFileSync(`public/evidence/coop/${chamber}.environment.json`, 'utf8');
const asset = (chamber: EnvironmentalChamber): EnvironmentalArtifact => JSON.parse(content(chamber));
function room(chamber: EnvironmentalChamber = 'handshake'): SharedRoom {
    return { code: 'ENVR', level: chamber, levelInstance: 1, revision: 1, exitUnlocked: false,
        levelState: { outputs: Object.fromEntries(ENVIRONMENTAL_OUTPUTS[chamber].map(o => [o, false])), physical: { leftRoute: false, rightRoute: false } },
    } as unknown as SharedRoom;
}
const settle = async () => { for (let i = 0; i < 8; i++) await new Promise(r => setTimeout(r, 5)); };
afterEach(() => vi.unstubAllGlobals());

describe('four compact environmental evidence assets', () => {
    it.each(ENVIRONMENTAL_CHAMBERS)('%s is deterministic, separately bounded and accounts for every existing placement', async chamber => {
        const a = asset(chamber), text = content(chamber);
        expect(text).toBe(serializeEnvironmentalArtifact(buildEnvironmentalArtifact(chamber)));
        expect(Buffer.byteLength(text)).toBeLessThan(ENVIRONMENTAL_BUDGETS[chamber]);
        expect(await parseEnvironmentalAsset(text, chamber)).toEqual(a);
        expect(a.sections.map(s => ({ output: s.name, target: s.target }))).toEqual(WORLD_ASSEMBLY_PLACEMENTS[chamber]!.map(p => ({ output: p.output, target: p.target })));
        expect(a.fragments).toHaveLength(a.sections.length * 4);
        expect(Object.keys(a.sources)).toHaveLength(7);
        expect(text).not.toMatch(/step_indices|register_values|raw_occurrence|machine_model|final_outputs/);
    });
    it.each(ENVIRONMENTAL_CHAMBERS)('%s retains authentic separate blocks and both independently recorded stores', chamber => {
        const a = asset(chamber);
        const integration = JSON.parse(readFileSync(`experiments/coop-controllers/${chamber}/integration.json`, 'utf8'));
        const dis = JSON.parse(gunzipSync(readFileSync(`experiments/coop-controllers/${chamber}/evidence/disassembly-bcf.json.gz`)).toString());
        for (const f of a.fragments) {
            expect(f.instructions).toHaveLength(3);
            for (const [n, i] of f.instructions.entries()) {
                expect(dis.instructions.find((v: { address: number }) => v.address === i.address)).toMatchObject(i);
                expect(i.block_id).toBe(f.block_id);
                if (n) expect(i.address).toBe(f.instructions[n - 1].address + f.instructions[n - 1].size);
            }
        }
        for (const section of a.sections) {
            const contexts = section.context.map(id => a.fragments.find(f => f.id === id)!);
            expect(contexts[0].block_id).not.toBe(contexts[1].block_id);
            expect(contexts[0].instructions[2].op_str.replace(/, al$/, '')).toBe(contexts[1].instructions[0].op_str.replace(/^al, /, ''));
            for (const bit of [0, 1] as const) {
                const f = a.fragments.find(f => f.id === section.stores[bit])!;
                const output = integration.outputs.find((o: { name: string }) => o.name === section.name);
                const site = output.verified_bcf_store_sites.find((s: { observed_values: number[] }) => s.observed_values.length === 1 && s.observed_values[0] === bit);
                expect(f.store).toEqual({ value: bit, rva: site.instruction_rva, byte_offset: output.offset, observed_case_count: site.case_ids.length });
                expect(f.block_id).toBe(site.raw_block_id);
                expect(f.instructions.at(-1)).toMatchObject({ address: site.instruction_address, bytes: site.instruction.bytes, op_str: site.instruction.op_str });
            }
            const zero = a.fragments.find(f => f.id === section.stores[0])!, one = a.fragments.find(f => f.id === section.stores[1])!;
            expect(zero.store!.rva).not.toBe(one.store!.rva);
            expect(zero.block_id).not.toBe(one.block_id);
        }
    });
    it.each(['bytes', 'address', 'rva', 'block_id', 'size', 'mnemonic', 'op_str'])('rejects altered instruction %s in canonical verification and runtime loading', async field => {
        const a = asset('handshake'), i = a.fragments[0].instructions[0];
        Object.assign(i, { [field]: typeof i[field as keyof typeof i] === 'number' ? Number(i[field as keyof typeof i]) + 1 : `${i[field as keyof typeof i]}0` });
        expect(() => verifyEnvironmentalArtifact(a, 'handshake')).toThrow();
        await expect(parseEnvironmentalAsset(JSON.stringify(a), 'handshake')).rejects.toThrow();
    });
    it.each(ENVIRONMENTAL_CHAMBERS)('%s rejects malformed ranges, specimen and output/binding/store associations', async chamber => {
        const mutations = [
            (a: EnvironmentalArtifact) => { a.bcf_pe_sha256 = '0'.repeat(64); },
            (a: EnvironmentalArtifact) => { a.image_base++; },
            (a: EnvironmentalArtifact) => { a.specimen_id = 'borrowed-race'; },
            (a: EnvironmentalArtifact) => { a.sections[0].stores['0'] = a.sections[1].stores['0']; },
            (a: EnvironmentalArtifact) => { a.sections[0].bindings[0].invert = !a.sections[0].bindings[0].invert; },
            (a: EnvironmentalArtifact) => { a.sections[0].target = 'wrong-platform'; },
            (a: EnvironmentalArtifact) => { a.fragments[2].store!.value = 1; },
            (a: EnvironmentalArtifact) => { a.fragments[2].store!.byte_offset += 4; },
            (a: EnvironmentalArtifact) => { a.fragments[2].store!.observed_case_count = 0; },
            (a: EnvironmentalArtifact) => { a.fragments[0].end_rva_exclusive++; },
            (a: EnvironmentalArtifact) => { a.fragments[0].instructions[1] = a.fragments[1].instructions[1]; },
            (a: EnvironmentalArtifact) => { a.fragments.pop(); },
            (a: EnvironmentalArtifact) => { a.separation = 'direct-edge' as never; },
        ];
        for (const change of mutations) {
            const a = asset(chamber); change(a);
            expect(() => verifyEnvironmentalArtifact(a, chamber)).toThrow();
            await expect(parseEnvironmentalAsset(JSON.stringify(a), chamber)).rejects.toThrow();
        }
        for (const malformed of [null, {}, { ...asset(chamber), fragments: [null] }, { ...asset(chamber), sections: [null] }])
            expect(() => validateEnvironmentalArtifact(malformed, chamber)).toThrow();
        const other = chamber === 'handshake' ? 'deadlock' : 'handshake';
        await expect(parseEnvironmentalAsset(content(other), chamber)).rejects.toThrow();
    });
});

describe('accepted environmental state and failure boundaries', () => {
    it('retains raw values independently of CROSSFEED grace, UAF inversion and all three exit latches', () => {
        const cross = environmentalAccepted(room('crossfeed-vault'), true)!;
        cross.physical = { physicalLeftRoute: true, physicalRightRoute: true };
        for (const name of ['leftRoute', 'rightRoute']) {
            const section = asset('crossfeed-vault').sections.find(s => s.name === name)!;
            expect(nativeWorldBindingState(cross, section, section.bindings.find(b => b.target === section.target))).toMatchObject({ raw: false, physical: true, grace: true });
        }
        const uaf = environmentalAccepted(room('use-after-free'), true)!, assist = asset('use-after-free').sections.find(s => s.name === 'assistBlocked')!;
        expect(nativeWorldBindingState(uaf, assist, assist.bindings[0])).toMatchObject({ raw: false, physical: true, inverted: true });
        for (const chamber of ['handshake', 'deadlock', 'use-after-free'] as const) {
            const s = environmentalAccepted(room(chamber), true)!; s.exitUnlocked = true;
            const exit = asset(chamber).sections.find(section => section.target === 'exit')!;
            expect(nativeWorldBindingState(s, exit, exit.bindings[0])).toMatchObject({ raw: false, physical: true, latched: true });
        }
        const r = room('deadlock'); Object.assign(r.levelState, { outputs: { serviceRelay: true }, devices: { 'feed.value': true, 'safe.value': false } });
        expect(environmentalAccepted(r, true)?.outputs.serviceRelay).toBe(true); // completion output wins over any UI input interpretation
    });
    it('does not coerce missing state, accept invalid identity or leak campaign evidence into custom/lab/RACE/solo rooms', () => {
        for (const chamber of ENVIRONMENTAL_CHAMBERS) {
            const r = room(chamber); Object.assign(r.levelState, { outputs: { [ENVIRONMENTAL_OUTPUTS[chamber][0]]: 0 } });
            expect(environmentalAccepted(r, true)?.outputs).toEqual({});
            for (const altered of [null, { ...r, draft: {} }, { ...r, level: 'workbench' }, { ...r, level: 'relay-lab' }, { ...r, level: 'race-condition' }, { ...r, level: 'uplink' }, { ...r, code: '' }, { ...r, revision: -1 }, { ...r, levelInstance: NaN }])
                expect(environmentalAccepted(altered as SharedRoom, true)).toBeNull();
        }
    });
    it('loads only the active chamber, caches success and requires a new receipt after reconnect', async () => {
        const fetch = vi.fn(async (url: string) => ({ ok: true, text: async () => content(url.split('/').at(-1)!.split('.')[0] as EnvironmentalChamber) })); vi.stubGlobal('fetch', fetch);
        const e = new EnvironmentalEvidence();
        for (const chamber of ENVIRONMENTAL_CHAMBERS) {
            e.update(room(chamber), true, 1); await settle(); expect(e.status).toBe('ready'); expect(e.data?.chamber_id).toBe(chamber);
        }
        expect(fetch.mock.calls.map(([url]) => url)).toEqual(ENVIRONMENTAL_CHAMBERS.map(chamber => `/evidence/coop/${chamber}.environment.json`));
        const r = room(); e.update(r, true, 2); expect(e.status).toBe('ready'); expect(fetch).toHaveBeenCalledTimes(4);
        e.update(r, false, 2); expect(e.state?.connected).toBe(false);
        e.update(r, true, 2); expect(e.state?.connected).toBe(false);
        e.update(r, true, 3); expect(e.state?.connected).toBe(true);
        e.update({ ...r, levelInstance: 2 }, true, 4); expect(e.state?.key).toBe('ENVR:2:handshake');
        e.update({ ...r, code: 'NEXT' }, true, 5); expect(e.state?.key).toBe('NEXT:1:handshake');
        expect(fetch).toHaveBeenCalledTimes(4);
        const mountedOffline = new EnvironmentalEvidence(); mountedOffline.update(r, false, 6);
        mountedOffline.update(r, true, 6); expect(mountedOffline.state?.connected).toBe(false);
        mountedOffline.update(r, true, 7); expect(mountedOffline.state?.connected).toBe(true);
    });
    it('rejects stale cross-chamber responses, isolates malformed assets and retries failure only on deliberate re-entry/reconnect', async () => {
        const pending = new Map<string, (response: unknown) => void>();
        const fetch = vi.fn((url: string) => new Promise(resolve => pending.set(url, resolve))); vi.stubGlobal('fetch', fetch);
        const e = new EnvironmentalEvidence(); e.update(room(), true, 1); await settle(); e.update(room('deadlock'), true, 2); await settle();
        pending.get('/evidence/coop/handshake.environment.json')!({ ok: true, text: async () => content('handshake') }); await settle();
        expect(e.data).toBeNull(); expect(e.status).toBe('loading');
        pending.get('/evidence/coop/deadlock.environment.json')!({ ok: true, text: async () => content('handshake') }); await settle();
        expect(e.status).toBe('unavailable'); expect(e.data).toBeNull();
        for (let revision = 3; revision < 10; revision++) e.update({ ...room('deadlock'), revision }, true, revision);
        expect(fetch).toHaveBeenCalledTimes(2);
        const r = room('deadlock'); e.update(r, false, 9); e.update(r, true, 10); await settle(); expect(fetch).toHaveBeenCalledTimes(3);
        pending.get('/evidence/coop/deadlock.environment.json')!({ ok: true, text: async () => content('deadlock') }); await settle(); expect(e.status).toBe('ready');
        e.update(room(), true, 11); expect(e.status).toBe('ready'); expect(e.data?.chamber_id).toBe('handshake'); expect(fetch).toHaveBeenCalledTimes(3);
        e.update({ ...room(), draft: {} } as SharedRoom, true, 12); expect(e.data).toBeNull(); expect(e.state).toBeNull(); expect(e.status).toBe('idle');
    });
});
