import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { buildRaceMachineryArtifact, serializeRaceMachineryArtifact, verifyRaceMachineryArtifact } from '../scripts/native/race-machinery-evidence.ts';
import { RACE_MACHINERY_BUDGET, RACE_MACHINERY_OUTPUTS, type RaceMachineryArtifact } from '../src/coop/race-machinery-types.ts';
import { machineryAccepted, parseRaceMachineryAsset, RaceMachineryEvidence, validateRaceMachineryArtifact } from '../src/coop/race-machinery-evidence.ts';
import { MachineryPresentation, machineryState, selectedMachineryStore } from '../src/slice/race-machinery-presentation.ts';
import { RACE_MACHINERY_BLOCKS, RaceMachineryRenderer } from '../src/slice/race-machinery-render.ts';
import { machineryEvidenceDetails } from '../src/coop/race-machinery-inspector.ts';
import type { SharedRoom } from '../src/coop/protocol.ts';

const content = readFileSync('public/evidence/coop/race-condition.machinery.json', 'utf8');
const asset = (): RaceMachineryArtifact => JSON.parse(content);
function room(): SharedRoom<'race-condition'> {
    return { code: 'MACHINERY', level: 'race-condition', levelInstance: 1, revision: 1, exitUnlocked: false,
        levelState: { outputs: Object.fromEntries(RACE_MACHINERY_OUTPUTS.map(o => [o, false])), physical: { phaseA: false, phaseB: false, returnBridge: false } },
    } as unknown as SharedRoom<'race-condition'>;
}
const accepted = () => machineryAccepted(room(), true)!;
const settle = async () => { for (let i = 0; i < 8; i++) await new Promise(r => setTimeout(r, 5)); };
afterEach(() => vi.unstubAllGlobals());
describe('RACE machinery evidence', () => {
    it('is deterministic, separately bounded, byte verified and contains no trace payload', async () => {
        expect(content).toBe(serializeRaceMachineryArtifact(buildRaceMachineryArtifact()));
        expect(Buffer.byteLength(content)).toBeLessThan(RACE_MACHINERY_BUDGET);
        expect(await parseRaceMachineryAsset(content)).toEqual(asset());
        expect(content).not.toMatch(/step_indices|register_values|raw_occurrence/);
        verifyRaceMachineryArtifact(asset());
    });
    it('recovers all ten alternatives from independently acquired store observations', () => {
        const integration = JSON.parse(readFileSync('experiments/coop-controllers/race-condition/integration.json', 'utf8'));
        const a = asset();
        for (const section of a.sections) for (const bit of [0, 1]) {
            const f = selectedMachineryStore(a, section.name, !!bit)!;
            const output = integration.outputs.find((o: { name: string }) => o.name === section.name);
            const site = output.verified_bcf_store_sites.find((s: { observed_values: number[] }) => s.observed_values.includes(bit));
            expect(f.store).toEqual({ value: bit, rva: site.instruction_rva, byte_offset: output.offset });
            expect(f.block_id).toBe(site.raw_block_id); expect(site.case_ids.length).toBeGreaterThan(0);
            expect(f.instructions.at(-1)).toMatchObject({ address: site.instruction_address, bytes: site.instruction.bytes, op_str: site.instruction.op_str });
        }
    });
    it.each(['bytes', 'address', 'rva', 'block_id', 'size', 'mnemonic', 'op_str'])('rejects altered %s in build verification and runtime loading', async field => {
        const a = asset(), i = a.fragments[0].instructions[0];
        Object.assign(i, { [field]: typeof i[field as keyof typeof i] === 'number' ? Number(i[field as keyof typeof i]) + 1 : `${i[field as keyof typeof i]}0` });
        expect(() => verifyRaceMachineryArtifact(a)).toThrow();
        await expect(parseRaceMachineryAsset(JSON.stringify(a))).rejects.toThrow();
    });
    it('rejects fabricated associations, ranges, specimen, fragments and cross-block joins', async () => {
        const mutations = [
            (a: RaceMachineryArtifact) => { a.bcf_pe_sha256 = '0'.repeat(64); },
            (a: RaceMachineryArtifact) => { a.image_base++; },
            (a: RaceMachineryArtifact) => { a.specimen_id = 'wrong' as never; },
            (a: RaceMachineryArtifact) => { a.sections[0].stores['0'] = a.sections[1].stores['0']; },
            (a: RaceMachineryArtifact) => { a.sections[1].bindings[0].physical_output = 'physicalPhaseB'; },
            (a: RaceMachineryArtifact) => { a.fragments[2].store!.value = 1; },
            (a: RaceMachineryArtifact) => { a.fragments[0].end_rva_exclusive++; },
            (a: RaceMachineryArtifact) => { a.fragments[0].instructions[1] = a.fragments[1].instructions[1]; },
            (a: RaceMachineryArtifact) => { a.fragments.pop(); },
            (a: RaceMachineryArtifact) => { a.separation = 'direct-edge' as never; },
        ];
        for (const change of mutations) {
            const a = asset(); change(a); expect(() => verifyRaceMachineryArtifact(a)).toThrow();
            await expect(parseRaceMachineryAsset(JSON.stringify(a))).rejects.toThrow();
        }
        for (const malformed of [null, {}, { ...asset(), fragments: [null] }]) expect(() => validateRaceMachineryArtifact(malformed)).toThrow();
    });
    it('keeps complete alternatives and static context in Evidence without claiming a live trace', () => {
        for (const section of asset().sections) {
            const text = machineryEvidenceDetails({ data: asset(), state: accepted(), status: 'ready' }, section.name);
            for (const f of asset().fragments.filter(f => f.output === section.name)) {
                expect(text).toContain(f.id); expect(text).toContain(f.block_id);
                for (const i of f.instructions) expect(text).toContain(i.bytes);
            }
            expect(text).toContain(asset().bcf_pe_sha256); expect(text).toContain('NO MATCHING LIVE TRACE');
            expect(text).toContain('not PE strings'); expect(text).toContain('NOT a direct CFG edge');
        }
    });
});
describe('accepted binding semantics and lifecycle (semantic fixtures, not playthroughs)', () => {
    it('uses grace-inclusive power and the exit latch while selecting raw stores', () => {
        const s = accepted(), a = asset();
        s.physical = { physicalPhaseA: true, physicalPhaseB: true, physicalReturnBridge: true }; s.exitUnlocked = true;
        for (const section of a.sections) {
            const v = machineryState(s, section);
            expect(v.raw).toBe(false); expect(selectedMachineryStore(a, section.name, v.raw)?.store?.value).toBe(0);
            expect(v.physical).toBe(section.name === 'spanMaster' ? null : true);
            expect(v.powered).toBe(section.name !== 'spanMaster');
        }
        const model = new MachineryPresentation().update(s, a, .1, true);
        expect(model.get('phaseA')?.message).toBe('PHASE A ACTIVE'); expect(model.get('returnBridge')?.message).toBe('RETURN BRIDGE ACTIVE');
        expect(model.get('exitDoor')?.message).toBe('EXIT UNLOCKED');
        expect(model.get('spanMaster')?.message).toBe('SPAN CONTROL IDLE');
    });
    it('reveals only meaningful changes; revisions/countdown do not restart, grace ending updates independently', () => {
        const p = new MachineryPresentation(), a = asset(), s = accepted();
        p.update(s, a, .1, true);
        const on = { ...s, outputs: { ...s.outputs, phaseA: true }, physical: { ...s.physical, physicalPhaseA: true } };
        expect(p.update(on, a, .1, true).get('phaseA')?.pulse).toBe(1);
        const next = p.update({ ...on, revision: 99 }, a, .1, true).get('phaseA')!;
        expect(next.revealed).not.toBe(next.message); expect(next.pulse).toBeLessThan(1);
        for (let i = 0; i < 8; i++) p.update(on, a, .1, true);
        expect(p.update(on, a, .1, true).get('phaseA')?.pulse).toBe(0);
        const grace = { ...on, outputs: s.outputs };
        expect(p.update(grace, a, .1, true).get('phaseA')?.revealed).toBe('PHASE A ACTIVE');
        const off = p.update(s, a, .1, true).get('phaseA')!;
        expect(off.message).toBe('PHASE A INACTIVE'); expect(off.revealed).not.toBe(off.message);
    });
    it('stops effects on pause/disconnect/reduced motion and baselines reconnect/new instances', () => {
        const p = new MachineryPresentation(), a = asset(), s = accepted(); p.update(s, a, .1, true);
        const on = { ...s, outputs: { ...s.outputs, spanMaster: true } };
        expect(p.update(on, a, .1, true).get('spanMaster')?.pulse).toBe(1);
        const offline = p.update({ ...on, connected: false }, a, .1, true).get('spanMaster')!;
        expect(offline.message).toBe('SPAN CONTROL OFFLINE'); expect(offline.revealed).toBe(offline.message); expect(offline.pulse).toBe(0);
        for (const v of [s, { ...on, key: 'new-party:1' }, { ...s, key: 'new-party:2' }]) expect(p.update(v, a, .1, true).get('spanMaster')?.pulse).toBe(0);
        const reduced = p.update(on, a, .1, false).get('spanMaster')!;
        expect(reduced.pulse).toBe(0); expect(reduced.revealed).toBe(reduced.message);
        expect(p.update(s, a, .1, true).get('spanMaster')?.pulse).toBe(0);
        p.update(null, null, .1, true); expect(p.update(on, a, .1, true).get('spanMaster')?.pulse).toBe(0);
    });
    it('does not coerce missing values, infer grace or leak into draft/custom/other rooms', () => {
        const r = room(); Object.assign(r.levelState, { outputs: { spanMaster: 0 }, physical: undefined });
        const s = machineryAccepted(r, true)!;
        for (const v of new MachineryPresentation().update(s, asset(), .1, true).values()) {
            expect(v.raw).toBeNull(); expect(v.message).toContain('UNKNOWN'); expect(v.pulse).toBe(0);
        }
        expect(selectedMachineryStore(asset(), 'spanMaster', null)).toBeNull();
        for (const r of [null, { ...room(), draft: {} }, { ...room(), level: 'workbench' }, { ...room(), level: 'handshake' }])
            expect(machineryAccepted(r as SharedRoom, true)).toBeNull();
    });
    it('caches with stale-response/failure isolation and waits for a fresh receipt after reconnect', async () => {
        const fetch = vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue({ ok: true, text: async () => content }); vi.stubGlobal('fetch', fetch);
        const e = new RaceMachineryEvidence(); e.update(room(), true, 1); await settle(); expect(e.status).toBe('unavailable');
        for (let i = 0; i < 10; i++) e.update(room(), true, i); expect(fetch).toHaveBeenCalledTimes(1);
        e.update(null, false, 1); e.update(room(), true, 2); await settle(); expect(e.status).toBe('ready');
        e.update(null, true, 2); e.update(room(), true, 3); expect(fetch).toHaveBeenCalledTimes(2);
        const r = room(); e.update(r, false, 3); e.update(r, true, 3); expect(e.state?.connected).toBe(false);
        e.update(r, true, 4); expect(e.state?.connected).toBe(true);
        let done!: (v: unknown) => void; vi.stubGlobal('fetch', vi.fn(() => new Promise(r => { done = r; })));
        const late = new RaceMachineryEvidence(); late.update(room(), true, 1); await settle(); late.update(null, true, 1);
        done({ ok: true, text: async () => content }); await settle(); expect(late.data).toBeNull(); expect(late.status).toBe('idle');
    });
});
describe('fixed environmental Canvas blocks', () => {
    it('paints authentic varied snippets at stable bounds, culls naturally and keeps bookkeeping in diagnostics', () => {
        const e = new RaceMachineryEvidence(); e.data = asset(); e.state = accepted(); e.status = 'ready';
        const d = new RaceMachineryRenderer(), painted: string[] = [];
        const c = { save() {}, restore() {}, fillRect() {}, fillText(t: string) { painted.push(t); } } as unknown as CanvasRenderingContext2D;
        const all = { x: 0, y: 0, w: 4200, h: 1400 };
        const dis = JSON.parse(gunzipSync(readFileSync('experiments/coop-controllers/race-condition/evidence/disassembly-bcf.json.gz')).toString());
        for (const view of [all, { x: 800, y: 340, w: 1200, h: 600 }, { x: 2600, y: 780, w: 5, h: 5 }, { x: 9000, y: 9000, w: 300, h: 200 }]) {
            painted.length = 0; d.draw(c, e, 'race-condition', view, .1, true);
            for (const [n, s] of d.diagnostic.sections.entries()) {
                const { output, ...bounds } = RACE_MACHINERY_BLOCKS[n]; expect(s.bounds).toEqual(bounds);
                expect(s.visible).toBe(bounds.x < view.x + view.w && bounds.x + bounds.w > view.x && bounds.y < view.y + view.h && bounds.y + bounds.h > view.y);
                expect(s.fragments.flatMap(f => f.instructions).length).toBeGreaterThanOrEqual(3);
                for (const f of s.fragments) {
                    expect(f.omittedBefore).toContain('not a CFG edge');
                    for (const [k, i] of f.instructions.entries()) {
                        expect(dis.instructions.find((v: { address: number }) => v.address === i.address)).toMatchObject(i);
                        if (k) expect(i.address).toBe(f.instructions[k - 1].address + f.instructions[k - 1].size);
                        if (s.visible) expect(painted).toContain(`${i.mnemonic} ${i.op_str}`);
                    }
                }
            }
            expect(painted.join('\n')).not.toMatch(/STATIC|WRITE 1|RAW |POWER|SERVER |STATE-LINKED|RVA|bb_|omitted|Evidence/);
            if (view.x === 9000) expect(painted).toEqual([]);
        }
        e.state = { ...accepted(), outputs: Object.fromEntries(RACE_MACHINERY_OUTPUTS.map(o => [o, true])), physical: { physicalPhaseA: true, physicalPhaseB: true, physicalReturnBridge: true }, exitUnlocked: true };
        d.draw(c, e, 'race-condition', all, .1, true);
        expect(d.diagnostic.sections.every(s => s.storeId?.endsWith('write-1') && s.colour === '#77ba9e')).toBe(true);
        e.state.connected = false; d.draw(c, e, 'race-condition', all, .1, true);
        expect(d.diagnostic.sections.every(s => s.colour === '#627985' && s.pulse === 0 && s.message.endsWith('OFFLINE'))).toBe(true);
        e.data = null; e.status = 'unavailable'; painted.length = 0; d.draw(c, e, 'race-condition', all, .1, true);
        expect(d.diagnostic.sections.every(s => !s.fragments.length && !s.storeId)).toBe(true);
        expect(painted.every(t => t === '"ASSEMBLY UNAVAILABLE"')).toBe(true);
        d.draw(c, e, 'handshake', all, .1, true); expect(d.diagnostic.sections).toEqual([]);
    });
});
