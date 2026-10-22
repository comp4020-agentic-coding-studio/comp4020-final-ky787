import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { SharedRoom } from '../src/coop/protocol.ts';
import { buildCargoArtifact, serializeCargoArtifact, verifyCargoArtifact } from '../scripts/native/race-cargo-evidence.ts';
import { CARGO_ASSET_BUDGET, CARGO_OUTPUTS, CARGO_STUDY, type CargoArtifact } from '../src/coop/race-cargo-types.ts';
import { cargoAccepted, cargoBufferDisplay, parseCargoAsset, RaceCargoEvidence, validateCargoArtifact } from '../src/coop/race-cargo-evidence.ts';
import { CargoPresentation, cargoBlockMessage, cargoFeedback, selectedCargoStore } from '../src/slice/race-cargo-presentation.ts';
import { CARGO_BLOCKS, CARGO_CODE_SIZE, RaceCargoRenderer } from '../src/slice/race-cargo-render.ts';
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
        expect(window.messages.bufferBridge.fraction).toBe(0);
        expect(window.messages.topBridge.fraction).toBe(1);
        expect(window.messages.safetyFirewall.fraction).toBe(1);
        const next = p.update({ ...accepted(5), revision: 5, remainingMs: 2600 }, 1200, .1, true, true)!;
        expect(next.phasePulse).toBeLessThan(1);
        expect(next.messages.bufferBridge.fraction).toBeGreaterThan(0);
        for (let n = 0; n < 10; n++) p.update(accepted(5), 1200, .1, true, true);
        const same = p.update(accepted(5), 1200, .1, true, true)!;
        expect(same.phasePulse).toBe(0); expect(same.messages.bufferBridge.revealed).toBe('BUFFER HOLDING');
        expect(p.update(accepted(1), 1200, .1, true, true)!.pulses.topBridge).toBe(1);
    });
    it('uses short independent mechanism strings for phase, expiry, release and reset', () => {
        for (const c of cases) {
            const s = accepted(c.id), message = cargoBlockMessage(s, 'bufferBridge');
            if (s.phase === 'expired') expect(message).toBe('WINDOW EXPIRED');
            else if (!s.outputs.bufferBridge) expect(message).toBe('BUFFER RELEASED');
            else expect(message).toBe(s.phase === 'window' ? 'BUFFER HOLDING' : 'BUFFER READY');
            expect(cargoBlockMessage(s, 'raceFirewall')).toBe(s.outputs.raceFirewall ? 'INTERLOCK ACTIVE' : 'INTERLOCK CLEAR');
        }
    });
    it('resets transitions across party/instance/loading, disconnect/reconnect, pause and reduced motion', () => {
        const p = new CargoPresentation(); p.update(accepted(), 1000, .1, true, true);
        expect(p.update(accepted(4), 1100, .1, true, true)!.pulses.topBridge).toBe(1);
        const off = p.update({ ...accepted(4), connected: false }, 1200, .1, true, true)!;
        expect(off.pulses.topBridge).toBe(0); expect(off.lastKnown).toBe(true);
        expect(p.update(accepted(), 1300, .1, true, true)!.pulses.topBridge).toBe(0);
        expect(p.update({ ...accepted(4), key: 'OTHER:2' }, 1300, .1, true, true)!.pulses.topBridge).toBe(0);
        const reduced = p.update(accepted(5), 1300, .1, false, true)!;
        expect(reduced.phasePulse).toBe(0); expect(Object.values(reduced.messages).every(m => m.revealed === m.text)).toBe(true);
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
    function fixture(id = 10) {
        const evidence = new RaceCargoEvidence(); evidence.data = asset(); evidence.state = accepted(id); evidence.status = 'ready';
        const painted: { text: string; x: number; y: number; font: string; colour: string }[] = [];
        // No transform methods: decoration must use the existing world transform without modifying it.
        const context = { font: '', fillStyle: '', save() {}, restore() {}, fillRect() {},
            fillText(this: { font: string; fillStyle: string }, text: string, x: number, y: number) { painted.push({ text, x, y, font: this.font, colour: this.fillStyle }); } } as unknown as CanvasRenderingContext2D;
        const renderer = new RaceCargoRenderer();
        const draw = (view = { x: 0, y: 0, w: 4200, h: 1420 }, animate = false) => {
            painted.length = 0;
            renderer.draw(context, evidence, 'race-condition', view, .1, animate, true, 1000);
            return renderer.diagnostic;
        };
        return { evidence, painted, context, renderer, draw };
    }
    it('keeps native identities and separate excerpts while hiding evidence bookkeeping and tutorial prose', () => {
        for (const id of [0, 4, 10, 14, 15]) {
            const f = fixture(id), d = f.draw();
            expect(d.detail).toBe('environmental'); expect(d.sections).toHaveLength(4);
            for (const section of d.sections) {
                const instructions = section.fragments.flatMap(f => f.instructions);
                expect(instructions.length).toBeGreaterThanOrEqual(3); expect(instructions.length).toBeLessThanOrEqual(5);
                for (const part of section.fragments) {
                    const original = asset().fragments.find(a => a.id === part.id)!;
                    expect(part.block).toBe(original.source_block_id); expect(part.omittedBefore).toContain('omitted');
                    for (const [n, i] of part.instructions.entries()) {
                        expect(original.instructions).toContainEqual(i);
                        expect(f.painted.some(p => p.text === `${i.mnemonic} ${i.op_str}`)).toBe(true);
                        if (n) expect(i.address).toBe(part.instructions[n - 1].address + part.instructions[n - 1].size);
                    }
                }
                const store = selectedCargoStore(asset(), section.output, section.raw)!;
                expect(section.storeId).toBe(store.id);
                const instruction = store.instructions.find(i => i.rva === section.storeRva)!;
                expect(f.painted).toContainEqual(expect.objectContaining({ text: `${instruction.mnemonic} ${instruction.op_str}`, colour: section.colour }));
            }
            const text = f.painted.map(p => p.text).join('\n');
            expect(text).toContain('...');
            expect(text).not.toMatch(/CARGO TRANSFER CONTROLLER|ACCEPTED A|STATE-LINKED|RVA|RAW [01]|bb_|omitted|BCF|Evidence|Hold A|Release A|delivery|STATIC/);
            expect(f.painted.filter(p => p.text.startsWith('"'))).toHaveLength(4);
        }
    });
    it('keeps fixed bounds and world text coordinates across pans, zoom, overview and viewport sizes', () => {
        const f = fixture(), first = f.draw();
        const positions = first.sections.map(s => s.bounds);
        const instructions = f.painted.filter(p => !p.text.startsWith('"'));
        expect(positions).toEqual(CARGO_BLOCKS.map(({ x, y, w, h }) => ({ x, y, w, h })));
        for (const camera of [
            { x: 1500, y: 1050, zoom: 1.05, width: 1600, height: 900 }, // nearby
            { x: 2100, y: 1050, zoom: 1.05, width: 1600, height: 900 }, // pan, no chute in view
            { x: 1020, y: 840, zoom: .78, width: 1600, height: 900 }, // DROP A/B reveal
            { x: 1020, y: 840, zoom: .52, width: 1024, height: 768 }, // small desktop
            { x: 2090, y: 710, zoom: .3, width: 1280, height: 720 }, // overview
        ]) {
            const view = { x: camera.x - camera.width / camera.zoom / 2, y: camera.y - camera.height / camera.zoom / 2,
                w: camera.width / camera.zoom, h: camera.height / camera.zoom };
            const d = f.draw(view);
            expect(d.bounds).toEqual(first.bounds); expect(d.sections.map(s => s.bounds)).toEqual(positions);
            expect(d.detail).toBe('environmental');
            for (const paint of f.painted.filter(p => !p.text.startsWith('"'))) {
                expect(instructions).toContainEqual(paint); expect(paint.font).toBe(`${CARGO_CODE_SIZE}px ui-monospace, monospace`);
            }
            for (const s of d.sections) expect(s.visible).toBe(s.bounds.x < view.x + view.w && s.bounds.x + s.bounds.w > view.x
                && s.bounds.y < view.y + view.h && s.bounds.y + s.bounds.h > view.y);
        }
        expect(f.draw({ x: 800, y: 950, w: 50, h: 150 }).sections.filter(s => s.visible).map(s => s.output)).toEqual(['topBridge']);
        expect(f.draw({ x: 2400, y: 950, w: 50, h: 150 }).visible).toBe(false); expect(f.painted).toEqual([]);
        // Old chute gate is outside this view, but the last two fixed blocks are inside it.
        expect(f.draw({ x: 1500, y: 950, w: 800, h: 150 }).sections.filter(s => s.visible).map(s => s.output)).toEqual(['safetyFirewall', 'raceFirewall']);
    });
    it('uses mechanism colours, mutes disconnected/unknown state, and never moves during reveals or failure', () => {
        const f = fixture(0), baseline = f.draw(undefined, true), positions = baseline.sections.map(s => s.bounds);
        const section = (output: string) => f.renderer.diagnostic.sections.find(s => s.output === output)!;
        expect(section('topBridge').colour).toBe(section('raceFirewall').colour);
        expect(section('safetyFirewall').colour).not.toBe(section('raceFirewall').colour);
        f.evidence.state = accepted(4); f.draw(undefined, true);
        expect(section('topBridge').colour).toBe(section('safetyFirewall').colour);
        expect(section('topBridge').revealed).not.toBe(section('topBridge').message);
        expect(f.renderer.diagnostic.sections.map(s => s.bounds)).toEqual(positions);
        f.evidence.state = { ...accepted(4), connected: false }; f.draw(undefined, true);
        expect(new Set(f.renderer.diagnostic.sections.map(s => s.colour)).size).toBe(1);
        expect(f.renderer.diagnostic.sections.every(s => s.message.endsWith('OFFLINE') && s.revealed === s.message && s.pulse === 0)).toBe(true);
        f.evidence.state = { ...accepted(0), outputs: { ...accepted(0).outputs, topBridge: null } }; f.draw();
        expect(section('topBridge').storeId).toBeNull(); expect(section('topBridge').message).toBe('UPPER SUPPORT UNKNOWN');
        f.evidence.data = null; f.evidence.status = 'unavailable'; const unavailable = f.draw();
        expect(unavailable.sections.every(s => s.storeId === null && s.fragments.length === 0 && s.message === 'ASSEMBLY UNAVAILABLE')).toBe(true);
        expect(unavailable.sections.map(s => s.bounds)).toEqual(positions);
        f.renderer.draw(f.context, f.evidence, 'workbench', { x: 0, y: 0, w: 4200, h: 1420 }, .1, true, true, 1000);
        expect(f.renderer.diagnostic.visible).toBe(false); expect(f.renderer.diagnostic.sections).toEqual([]);
    });
});
