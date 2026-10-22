// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { NativeInspectorView } from '../src/coop/native-inspector.ts';
import type { EnvironmentalEvidence } from '../src/coop/environmental-evidence.ts';

const json = (name: string) => JSON.parse(readFileSync(`public/evidence/coop/${name}`, 'utf8'));
beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<aside id="evidence" hidden><button>Close</button><label><select></select></label><label>Bogus</label><pre></pre></aside>';
});
afterEach(() => vi.unstubAllGlobals());
const view: NativeInspectorView = { chamber: 'handshake', devices: {}, outputs: { crossingPower: false } };

it('repaints default current evidence when lazy data arrives without a new accepted snapshot', async () => {
    const pending = new Map<string, (value: unknown) => void>();
    vi.stubGlobal('fetch', vi.fn((url: string) => new Promise(resolve => pending.set(url, resolve))));
    const { NativeEvidenceInspector } = await import('../src/coop/native-inspector.ts');
    const inspector = new NativeEvidenceInspector(() => {}), opening = inspector.open(view);
    expect(document.querySelector('select')?.value).toBe('current');
    expect(document.querySelector('pre')?.textContent).toContain('Loading');
    inspector.update(view); // same render key, still waiting for on-demand data
    for (const [url, resolve] of pending) resolve({ ok: true, json: async () => json(url.split('/').at(-1)!) });
    await opening;
    expect(document.querySelector('pre')?.textContent).toContain('NATIVE-VERIFIED OUTPUTS');
    expect(document.querySelector('pre')?.textContent).toContain(json('handshake.evidence.json').bcf_pe_sha256);
});

it('keeps compact alternatives available when the separate on-demand trace package fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(Error('large package unavailable')));
    const { NativeEvidenceInspector } = await import('../src/coop/native-inspector.ts');
    const environmental = { data: json('handshake.environment.json'), status: 'ready', state: {
        chamber: 'handshake', key: 'ROOM:1:handshake', levelInstance: 1, revision: 1, connected: true,
        outputs: { crossingPower: false }, physical: {}, exitUnlocked: false,
    } } as Pick<EnvironmentalEvidence, 'data' | 'state' | 'status'>;
    const close = vi.fn(), inspector = new NativeEvidenceInspector(close);
    const opening = inspector.open({ ...view, environmental });
    const select = document.querySelector('select')!;
    select.value = 'environmental:crossingPower'; select.dispatchEvent(new Event('change'));
    await opening;
    const text = document.querySelector('pre')!.textContent!;
    expect(text).toContain('crossingPower.write-0'); expect(text).toContain('crossingPower.write-1');
    expect(text).toContain('NOT a direct CFG edge');
    environmental.state = { ...environmental.state!, connected: false };
    inspector.update({ ...view, environmental });
    expect(document.querySelector('pre')?.textContent).toContain('CROSSING OFFLINE');
    document.querySelector('button')!.click(); expect(close).toHaveBeenCalledOnce();
});
