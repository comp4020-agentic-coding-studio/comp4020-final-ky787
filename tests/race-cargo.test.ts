import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { SharedRoom } from '../src/coop/protocol.ts';
import { buildCargoArtifact, serializeCargoArtifact, verifyCargoArtifact } from '../scripts/native/race-cargo-evidence.ts';
import { CARGO_ASSET_BUDGET, CARGO_OUTPUTS, CARGO_STUDY, type CargoArtifact } from '../src/coop/race-cargo-types.ts';
import { cargoAccepted, cargoBufferDisplay, parseCargoAsset, RaceCargoEvidence, validateCargoArtifact } from '../src/coop/race-cargo-evidence.ts';
import { CargoPresentation, cargoFeedback, selectedCargoStore } from '../src/slice/race-cargo-presentation.ts';
import { RaceCargoRenderer } from '../src/slice/race-cargo-render.ts';
import { cargoEvidenceDetails } from '../src/coop/race-cargo-inspector.ts';

const content = readFileSync('public/evidence/coop/race-condition.cargo.json', 'utf8');
const asset = (): CargoArtifact => JSON.parse(content);
const study = (file: string) => JSON.parse(readFileSync(`${CARGO_STUDY}/${file}`, 'utf8'));
const cases = study('cases.json').cases as { id: number; inputs: Record<string, number>; expected_outputs: Record<string, number> }[];
function room(id = 0): SharedRoom<'race-condition'> {
    const c = cases[id];
    return { code: 'TEST', level: 'race-condition', levelInstance: 1, revision: 1, levelState: {
        inputs: Object.fromEntries(Object.entries(c.inputs).map(([k, v]) => [k, !!v])),
        outputs: Object.fromEntries(Object.entries(c.expected_outputs).map(([k, v]) => [k, !!v])),
        buffer: { phase: ['idle', 'window', 'released', 'expired'][c.inputs.bufferPhase], remainingMs: c.inputs.bufferPhase === 1 ? 2800 : 0, durationMs: 2800 },
    } } as unknown as SharedRoom<'race-condition'>;
}
const accepted = (id = 0) => cargoAccepted(room(id), true, 1000)!;
const settle = async () => { for (let n = 0; n < 10; n++) await new Promise(r => setTimeout(r, 5)); };
afterEach(() => vi.unstubAllGlobals());

describe('compact cargo provenance', () => {
    it('retains the exact deterministic study subset and a separately bounded asset', async () => {
        expect(content).toBe(serializeCargoArtifact(buildCargoArtifact()));
        verifyCargoArtifact(asset()); expect(Buffer.byteLength(content)).toBeLessThan(CARGO_ASSET_BUDGET);
        expect(await parseCargoAsset(content)).toEqual(asset());
        expect(content).not.toMatch(/step_indices|raw_occurrence|supporting_traces|case_compositions/);
    });
    it.each(cases)('case $id selects each genuine zero/one store from independent study expectations', c => {
        const a = asset(), s = accepted(c.id);
        const expectedRVAs = [[0x1279, 0x120e], [0x14b6, 0x144a], [0x167a, 0x160e], [0x1840, 0x17d4]];
        for (const [n, o] of CARGO_OUTPUTS.entries()) {
            const f = selectedCargoStore(a, o, s.outputs[o])!;
            expect(f.id).toBe(`${a.sections[n].id}.write-${c.expected_outputs[o]}`);
            expect(f.verified_output_store).toMatchObject({ output: o, value: c.expected_outputs[o], byte_offset: n * 4,
                instruction_rva: expectedRVAs[n][c.expected_outputs[o]] });
        }
    });
    it.each(['bytes', 'address', 'rva', 'block_id', 'size', 'mnemonic', 'op_str'])('rejects altered instruction %s at build AND runtime', async field => {
        const a = asset(), i = a.fragments[1].instructions[0];
        Object.assign(i, { [field]: typeof i[field as keyof typeof i] === 'number' ? Number(i[field as keyof typeof i]) + 1 : `${i[field as keyof typeof i]}0` });
        expect(() => verifyCargoArtifact(a)).toThrow();
        await expect(parseCargoAsset(JSON.stringify(a) + '\n')).rejects.toThrow();
    });
    it('rejects swapped stores/outputs, missing fragments, fake edges, wrong identities and noncontiguous joins', async () => {
        const mutations = [
            (a: CargoArtifact) => { a.bcf_pe_sha256 = '0'.repeat(64); },
            (a: CargoArtifact) => { a.specimen_id = 'wrong' as never; },
            (a: CargoArtifact) => { a.image_base++; },
            (a: CargoArtifact) => { a.sections[0].store_alternatives['0'] = a.sections[1].store_alternatives['0']; },
            (a: CargoArtifact) => { a.sections[0].output = 'bufferBridge'; },
            (a: CargoArtifact) => { a.fragments.pop(); },
            (a: CargoArtifact) => { a.fragments[1].instructions[1] = a.fragments[2].instructions[1]; },
            (a: CargoArtifact) => { a.separation = 'direct-edge' as never; },
        ];
        for (const mutate of mutations) {
            const a = asset(); mutate(a);
            expect(() => validateCargoArtifact(a)).toThrow(); expect(() => verifyCargoArtifact(a)).toThrow();
            await expect(parseCargoAsset(JSON.stringify(a))).rejects.toThrow();
        }
    });
    it('keeps pointer setup and genuine obfuscator context separate with complete inspector provenance', () => {
        const e = { data: asset(), state: accepted(10), status: 'ready' as const };
        const text = cargoEvidenceDetails(e, 'upper-support');
        expect(text).toContain('0x1183'); expect(text).toContain('0x1196'); expect(text).toContain('OMITTED master-local code');
        expect(text).toContain('ALTERNATIVE WRITE 0'); expect(text).toContain('ALTERNATIVE WRITE 1');
        expect(text).toContain('0x1279'); expect(text).toContain('0x120E'); expect(text).toContain(asset().bcf_pe_sha256);
        expect(text).toContain('NO MATCHING LIVE TRACE');
        expect(cargoEvidenceDetails(e, 'guard')).toContain('global x/y comparisons are NOT DROP A');
        for (const s of asset().sections) for (const id of s.condition_fragments) expect(cargoEvidenceDetails(e, s.id)).toContain(id);
    });
});

describe('accepted semantic states, independent of physical reachability', () => {
    const scenarios = study('evidence/scenario-sequences.json').scenarios as { id: string; steps: { event: string; actual_projection: SharedRoom<'race-condition'>['levelState']; expected_outputs: Record<string, number> }[] }[];
    it('covers all 25 ordered frames including expiry, receiver arrival and a second attempt', () => {
        let frames = 0;
        for (const scenario of scenarios) for (const step of scenario.steps) {
            const s = cargoAccepted({ ...room(), levelState: step.actual_projection }, true, 1000)!;
            for (const o of CARGO_OUTPUTS) expect(Number(s.outputs[o]), `${scenario.id}/${step.event}/${o}`).toBe(step.expected_outputs[o]);
            const message = cargoFeedback(s).title;
            if (s.phase === 'expired') expect(message).toBe('BUFFER WINDOW EXPIRED');
            if (s.phase === 'released' && !s.dropA && s.dropB) expect(message).toBe('TRANSFER CLEAR');
            if (s.phase === 'released' && !s.dropB && s.dropA === false) expect(message).toBe('BUFFER RELEASED');
            if (s.phase === 'idle' && s.dropB && !s.dropA) expect(message).toBe('LOWER SUPPORT RELEASED');
            frames++;
        }
        expect(frames).toBe(25);
    });
    it('expiry outranks overlap; raw results never claim movement or delivery', () => {
        expect(cargoFeedback(accepted(15)).title).toBe('BUFFER WINDOW EXPIRED');
        expect(cargoFeedback(accepted(14)).title).toBe('INTERLOCK ACTIVE');
        expect(cargoFeedback(accepted(4)).title).toBe('UPPER SUPPORT RELEASED');
        expect(cargoFeedback(accepted(5)).title).toBe('BUFFER HOLDING');
        expect(cargoFeedback(accepted(10)).detail).toContain('delivery is not yet implied');
    });
    it('updates phase-only transitions, but identical snapshots/revisions/countdown do not restart effects', () => {
        const p = new CargoPresentation();
        expect(p.update(accepted(4), 1000, .1, true, true)!.pulses.topBridge).toBe(0);
        const window = p.update(accepted(5), 1000, .1, true, true)!;
        expect(window.feedback.title).toBe('BUFFER HOLDING'); expect(window.phasePulse).toBe(1);
        expect(Object.values(window.pulses).every(v => v === 0)).toBe(true);
        const next = p.update({ ...accepted(5), revision: 5, remainingMs: 2600 }, 1200, .1, true, true)!;
        expect(next.phasePulse).toBeLessThan(1);
        for (let n = 0; n < 10; n++) p.update(accepted(5), 1200, .1, true, true);
        const same = p.update(accepted(5), 1200, .1, true, true)!;
        expect(same.phasePulse).toBe(0); expect(same.revealed).toBe('BUFFER HOLDING');
        expect(p.update(accepted(1), 1200, .1, true, true)!.pulses.topBridge).toBe(1);
    });
    it('resets transitions across party/instance/loading, disconnect/reconnect, pause and reduced motion', () => {
        const p = new CargoPresentation(); p.update(accepted(), 1000, .1, true, true);
        expect(p.update(accepted(4), 1100, .1, true, true)!.pulses.topBridge).toBe(1);
        const off = p.update({ ...accepted(4), connected: false }, 1200, .1, true, true)!;
        expect(off.pulses.topBridge).toBe(0); expect(off.lastKnown).toBe(true);
        expect(p.update(accepted(), 1300, .1, true, true)!.pulses.topBridge).toBe(0);
        expect(p.update({ ...accepted(4), key: 'OTHER:2' }, 1300, .1, true, true)!.pulses.topBridge).toBe(0);
        const reduced = p.update(accepted(5), 1300, .1, false, true)!;
        expect(reduced.phasePulse).toBe(0); expect(reduced.revealed).toBe(reduced.feedback.title);
        p.update(null, 1400, .1, true, true);
        expect(p.update(accepted(10), 1400, .1, true, true)!.pulses.bufferBridge).toBe(0);
    });
    it('uses receipt/duration and reaches zero without inventing expiry; pause/disconnect freeze display', () => {
        const s = { ...accepted(1), durationMs: 3500, remainingMs: 1750 };
        expect(cargoBufferDisplay(s, 1000)).toEqual({ phase: 'window', seconds: 1.75, fraction: .5 });
        expect(cargoBufferDisplay(s, 9000)).toEqual({ phase: 'window', seconds: 0, fraction: 0 });
        const p = new CargoPresentation(); p.update(s, 1500, .1, true, true);
        expect(p.update(s, 8000, .1, false, false)!.timer.seconds).toBe(1.25);
        expect(p.update({ ...s, connected: false }, 9000, .1, false, true)!.timer.seconds).toBe(1.25);
        const resumed = p.update(s, 9000, .1, true, true)!;
        expect(resumed.timer.seconds).toBe(0); expect(resumed.timer.phase).toBe('window'); expect(resumed.feedback.title).toBe('BUFFER HOLDING');
    });
    it('keeps absent/invalid state unknown, selects no store, and excludes drafts', () => {
        const r = room(); delete (r.levelState.outputs as Partial<typeof r.levelState.outputs>).topBridge;
        Object.assign(r.levelState.inputs, { dropA: 0 }); Object.assign(r.levelState.buffer, { phase: true, remainingMs: NaN });
        const s = cargoAccepted(r, true, 1000)!;
        expect(s.dropA).toBeNull(); expect(s.phase).toBeNull(); expect(s.remainingMs).toBeNull();
        expect(selectedCargoStore(asset(), 'topBridge', s.outputs.topBridge)).toBeNull(); expect(cargoFeedback(s).title).toBe('STATE UNKNOWN');
        expect(cargoAccepted({ ...r, draft: {} } as SharedRoom, true, 0)).toBeNull();
        expect(cargoAccepted({ ...r, level: 'workbench' } as unknown as SharedRoom, true, 0)).toBeNull();
    });
});

describe('failure isolation and Canvas fragments', () => {
    it('caches, deduplicates, ignores stale room responses and retries failures on re-entry', async () => {
        const fetch = vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue({ ok: true, text: async () => content }); vi.stubGlobal('fetch', fetch);
        const e = new RaceCargoEvidence(); e.update(room(), true, 1000); await settle(); expect(e.status).toBe('unavailable');
        for (let i = 0; i < 10; i++) e.update({ ...room(), revision: i }, true, 1000);
        expect(fetch).toHaveBeenCalledTimes(1);
        e.update(null, false, 1000); e.update(room(), true, 1001); await settle(); expect(e.status).toBe('ready');
        e.update(null, true, 1001); e.update(room(), true, 1002); expect(e.status).toBe('ready'); expect(fetch).toHaveBeenCalledTimes(2);
        e.update(room(), false, 1002); e.update(room(), true, 1002); expect(e.state?.connected).toBe(false);
        e.update(room(), true, 1003); expect(e.state?.connected).toBe(true);
        let done!: (v: unknown) => void; vi.stubGlobal('fetch', vi.fn(() => new Promise(r => { done = r; })));
        const late = new RaceCargoEvidence(); late.update(room(), true, 1); await settle(); late.update(null, true, 1);
        done({ ok: true, text: async () => content }); await settle(); expect(late.data).toBeNull(); expect(late.status).toBe('idle');
    });
    it('renders distinct authentic fragments with visible omission dividers below the old 0.8 cutoff', () => {
        const e = new RaceCargoEvidence(); e.data = asset(); e.state = accepted(10); e.status = 'ready';
        const painted: string[] = [];
        const c = { save() {}, restore() {}, translate() {}, scale() {}, fillRect() {}, strokeRect() {}, fillText(t: string) { painted.push(t); } } as unknown as CanvasRenderingContext2D;
        const r = new RaceCargoRenderer(); r.draw(c, e, 'race-condition', { x: 0, y: 0, w: 2400, h: 1200 }, .65, .016, false, true, false, 1000);
        expect(r.diagnostic.detail).toBe('assembly'); expect(r.diagnostic.sections).toHaveLength(4);
        for (const s of r.diagnostic.sections) {
            expect(s.fragments).toHaveLength(3);
            for (const f of s.fragments) {
                expect(f.omittedBefore).toContain('omitted'); expect(painted).toContain(f.omittedBefore);
                expect(asset().fragments.some(a => a.id === f.id && a.source_block_id === f.block)).toBe(true);
                for (const [n, i] of f.instructions.entries()) {
                    expect(painted).toContain(`${i.mnemonic} ${i.op_str}`);
                    if (n) expect(i.address).toBe(f.instructions[n - 1].address + f.instructions[n - 1].size);
                }
            }
        }
        r.draw(c, e, 'race-condition', { x: 0, y: 0, w: 2000, h: 1200 }, .7, .016, false, true, false, 1000);
        expect(r.diagnostic.detail).toBe('compact');
        expect(r.diagnostic.bounds!.x + r.diagnostic.bounds!.w).toBeLessThanOrEqual(2000);
        r.draw(c, e, 'workbench', { x: 0, y: 0, w: 2400, h: 1200 }, 1, .016, true, true, false, 1000);
        expect(r.diagnostic.visible).toBe(false);
        e.data = null; e.status = 'unavailable'; r.draw(c, e, 'race-condition', { x: 0, y: 0, w: 2400, h: 1200 }, 1, .016, true, true, false, 1000);
        expect(painted).toContain('ASSEMBLY UNAVAILABLE'); expect(r.diagnostic.sections).toEqual([]);
    });
});
