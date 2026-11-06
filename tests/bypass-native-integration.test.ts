/** Labelled accepted-state/lifecycle fixtures; physical routes live in the browser scenario. */
import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { nativeController } from '../server/native/adapter.ts';
import { CHAMBER_CONTRACTS } from '../server/native/contracts.ts';
import { EnvironmentalEvidence, environmentalAccepted } from '../src/coop/environmental-evidence.ts';
import type { EnvironmentalArtifact } from '../src/coop/environmental-types.ts';
import { EnvironmentalPresentation, selectedEnvironmentalStore } from '../src/slice/environmental-presentation.ts';
import { EnvironmentalRenderer } from '../src/slice/environmental-render.ts';
import type { SharedRoom } from '../src/coop/protocol.ts';

const text = readFileSync('public/evidence/coop/bypass.environment.json', 'utf8');
const asset = (): EnvironmentalArtifact => JSON.parse(text);
const room = (id: number): SharedRoom<'bypass'> => {
    const inputs = Object.fromEntries(CHAMBER_CONTRACTS.bypass.inputs.map((name, bit) => [name, !!(id & (1 << bit))]));
    return { code: 'BYPASS', level: 'bypass', levelInstance: 1, revision: id + 1, exitUnlocked: true,
        levelState: { outputs: nativeController('bypass').evaluate(inputs) } } as SharedRoom<'bypass'>;
};
const settle = async () => { for (let i = 0; i < 8; i++) await new Promise(r => setTimeout(r, 5)); };
afterEach(() => vi.unstubAllGlobals());

it('all 16 accepted frames choose the real dynamic stores; constant exit is Evidence-only', () => {
    const data = asset();
    expect(data.sections.map(s => s.name)).toEqual(['anchorPower', 'bridgePower', 'firewallActive']);
    expect(data.fragments.some(f => f.output === 'exitReady')).toBe(false);
    expect(data.sections[2].bindings.map(b => b.target)).toEqual(['firewallA', 'firewallB']);
    const inspector = JSON.parse(readFileSync('public/evidence/coop/bypass.evidence.json', 'utf8'));
    expect(inspector.outputs.find((o: { name: string }) => o.name === 'exitReady').store_sites).toMatchObject([
        { instruction_rva: 0x154f, byte_offset: 12, observed_values: [1], observed_case_count: 16 },
    ]);
    for (let id = 0; id < 16; id++) {
        const state = environmentalAccepted(room(id), true)!;
        expect(state.outputs.exitReady).toBe(true); expect(state.exitUnlocked).toBe(true);
        const display = new EnvironmentalPresentation().update(state, data, .016, false);
        for (const section of data.sections) {
            const value = state.outputs[section.name];
            expect(selectedEnvironmentalStore(data, section.name, value)?.store?.value).toBe(Number(value));
            expect(display.get(section.name)).toMatchObject({ raw: value, physical: value, pulse: 0 });
        }
    }
});

it('BYPASS loading failure and disconnect mute assembly, preserve outputs and require a fresh receipt', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(Error('asset unavailable')).mockResolvedValue({ ok: true, text: async () => text });
    vi.stubGlobal('fetch', fetch);
    const evidence = new EnvironmentalEvidence(), r = room(0), before = structuredClone(r);
    evidence.update(r, true, 1); await settle();
    expect(evidence.status).toBe('unavailable'); expect(evidence.data).toBeNull();
    const renderer = new EnvironmentalRenderer();
    const c = { save() {}, restore() {}, fillRect() {}, fillText() {} } as unknown as CanvasRenderingContext2D;
    renderer.draw(c, evidence, 'bypass', { x: 0, y: 0, w: 3840, h: 880 }, .1, true);
    expect(renderer.diagnostic.sections).toHaveLength(3);
    expect(renderer.diagnostic.sections.every(s => s.message === 'ASSEMBLY UNAVAILABLE' && s.fragments.length === 0 && s.storeId === null)).toBe(true);
    evidence.update(r, true, 2); await settle(); expect(fetch).toHaveBeenCalledTimes(1);
    evidence.update(r, false, 2); evidence.update(r, true, 2); await settle();
    expect(evidence.status).toBe('ready'); expect(evidence.state?.connected).toBe(false);
    evidence.update(r, true, 3); expect(evidence.state?.connected).toBe(true);
    const presentation = new EnvironmentalPresentation();
    presentation.update(evidence.state, evidence.data, .1, true);
    const on = environmentalAccepted(room(3), true)!;
    expect(presentation.update(on, evidence.data, .1, true).get('anchorPower')?.pulse).toBe(1);
    const offline = presentation.update({ ...on, connected: false }, evidence.data, .1, true);
    expect([...offline.values()].every(v => v.message.endsWith('OFFLINE') && v.pulse === 0)).toBe(true);
    const reduced = presentation.update(on, evidence.data, .1, false);
    expect([...reduced.values()].every(v => v.revealed === v.message && v.pulse === 0)).toBe(true);
    expect(r).toEqual(before); // Presentation failures never write gameplay state.
});
