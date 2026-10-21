import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { NATIVE_CHAMBERS, type NativeChamberId } from '../server/native/contracts.ts';
import type { SharedRoom } from '../src/coop/protocol.ts';
import { CrossfeedAuthority } from '../src/coop/crossfeed-authority.ts';
import { RaceAuthority } from '../src/coop/race-authority.ts';
import type { CoopClient } from '../src/coop/client.ts';
import { NativeWorldEvidence, nativeWorldBindingState, nativeWorldState, validateNativeWorldArtifact, type NativeWorldArtifact } from '../src/coop/native-world-evidence.ts';

const artifact = (chamber: NativeChamberId): NativeWorldArtifact => JSON.parse(readFileSync(`public/evidence/coop/${chamber}.world.json`, 'utf8'));
function room(chamber: NativeChamberId, outputs: Record<string, boolean> = {}, physical: Record<string, boolean> = {}): SharedRoom {
    return { code: 'LOCAL', level: chamber, levelInstance: 1, revision: 1, exitUnlocked: false, party: null,
        levelState: { outputs, physical, inputs: {}, devices: {}, handoverMs: 200 } } as unknown as SharedRoom;
}
const response = (value: unknown) => ({ ok: true, json: async () => value });
const settle = () => new Promise<void>(resolve => setImmediate(resolve));
afterEach(() => vi.unstubAllGlobals());

function bindingState(chamber: NativeChamberId, name: string, id: string, r: SharedRoom) {
    const output = artifact(chamber).outputs.find(o => o.name === name)!;
    return nativeWorldBindingState(nativeWorldState(r)!, output, output.bindings.find(b => b.id === id)!);
}

describe('accepted native world state', () => {
    it('keeps CROSSFEED accepted raw and physical values separate from pending visual routing', () => {
        const r = room('crossfeed-vault', { leftRoute: false, rightRoute: true, bridge: false, grappleAnchor: false, relayGates: false }, { leftRoute: true, rightRoute: true }) as SharedRoom<'crossfeed-vault'>;
        r.levelState.inputs = { ...r.levelState.inputs, switchB: false, routeMode: true, switchC: true, routePowerOccupied: true };
        const client = { prediction: {}, pendingRouting: new Map([['routeMode', { value: false }], ['switchB', { value: true }]]), roomReceivedAt: performance.now() } as unknown as CoopClient;
        const prediction = new CrossfeedAuthority(r, client).frame;
        expect(prediction.signals?.leftRoute).toBe(true);
        expect(prediction.signals?.bridge).toBe(true);
        const accepted = nativeWorldState(r)!;
        expect(accepted.outputs.leftRoute).toBe(false);
        expect(accepted.outputs.bridge).toBe(false);
        expect(accepted.physical.physicalLeftRoute).toBe(true);
        const resolved = bindingState('crossfeed-vault', 'leftRoute', 'platforms:left1:signal', r);
        expect(resolved).toMatchObject({ raw: false, physical: true, grace: true, explanation: 'grace' });
        expect(resolved.statusLabel).toContain('SERVER GRACE');
    });
    it('does not present a pending RACE phase as an accepted native output', () => {
        const r = room('race-condition', { spanMaster: true, phaseA: true, phaseB: false }, { phaseA: true, phaseB: false, returnBridge: false }) as SharedRoom<'race-condition'>;
        r.levelState.inputs.phase = false;
        r.levelState.buffer = { phase: 'idle', remainingMs: 0, durationMs: 1000 };
        const client = { prediction: {}, pendingPhase: { value: true }, roomReceivedAt: performance.now() } as unknown as CoopClient;
        expect(new RaceAuthority(r, client).frame.signals?.phaseB).toBe(true);
        expect(nativeWorldState(r)?.outputs.phaseB).toBe(false);
        expect(bindingState('race-condition', 'phaseB', 'platforms:crumbleA:signal', r)).toMatchObject({ raw: false, physical: false, grace: false });
    });
    it('keeps USE AFTER FREE raw assistBlocked distinct from inverted physical lift power', () => {
        const r = room('use-after-free', { assistBlocked: false });
        expect(bindingState('use-after-free', 'assistBlocked', 'assistBinding', r)).toMatchObject({ raw: false, physical: true, inverted: true, explanation: 'inverted' });
        const on = bindingState('use-after-free', 'assistBlocked', 'assistBinding', room('use-after-free', { assistBlocked: true }));
        expect(on).toMatchObject({ raw: true, physical: false });
        expect(on.statusLabel).toContain('RAW 1 · POWER OFF · INVERTED');
    });
    it('reports open machinery accurately and keeps the exit server latch separate from the raw candidate', () => {
        const r = room('deadlock', { hatchOpen: true, payloadReady: false });
        r.exitUnlocked = true;
        expect(bindingState('deadlock', 'hatchOpen', 'hatchOpening', r).statusLabel).toBe('RAW 1 · GATE OPEN');
        expect(bindingState('deadlock', 'payloadReady', 'exitUnlock', r)).toMatchObject({ raw: false, physical: true, latched: true });
        expect(bindingState('deadlock', 'payloadReady', 'exitUnlock', r).statusLabel).toContain('SERVER LATCH');
    });
    it('keeps unknown accepted values unknown and never calculates missing unlock candidates', () => {
        const state = nativeWorldState(room('race-condition'))!;
        const output = artifact('race-condition').outputs.find(o => o.name === 'exitUnlockCandidate')!;
        expect(nativeWorldBindingState(state, output)).toMatchObject({ raw: null, physical: null });
        expect(bindingState('use-after-free', 'assistBlocked', 'assistBinding', room('use-after-free'))).toMatchObject({ raw: null, physical: null });
    });
    it('does not mutate accepted room state or include private room identity in diagnostic snapshots', async () => {
        const r = room('handshake', { crossingPower: true });
        const original = structuredClone(r);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(artifact('handshake'))));
        const loader = new NativeWorldEvidence(); loader.update(r); await settle();
        expect(loader.resolve('crossingPower', 'nearPower')).toMatchObject({ raw: true, physical: true });
        expect(loader.resolve('crossingPower', 'farPower')).toMatchObject({ raw: true, physical: true });
        expect(loader.resolve('crossingPower', 'unmapped')).toBeNull();
        expect(loader.snapshot().presentation).toBe('static-output-store');
        expect(JSON.stringify(loader.snapshot())).not.toContain(r.code);
        expect(r).toEqual(original);
    });
});

describe('compact asset loading and failure isolation', () => {
    for (const chamber of NATIVE_CHAMBERS) it(`${chamber} loads its own static specimen and no dynamic trace`, async () => {
        const fetch = vi.fn().mockResolvedValue(response(artifact(chamber))); vi.stubGlobal('fetch', fetch);
        const loader = new NativeWorldEvidence(); loader.update(room(chamber)); await settle();
        expect(loader.status).toBe('ready');
        expect(loader.data?.chamber_id).toBe(chamber);
        expect(loader.snapshot().presentation).toBe('static-output-store');
        expect(fetch).toHaveBeenCalledExactlyOnceWith(`/evidence/coop/${chamber}.world.json`);
        expect(JSON.stringify(loader.data)).not.toMatch(/PROVEN BOGUS|step_addresses|trace_id/);
    });
    it('caches successful assets across snapshots, chamber changes and reconnects', async () => {
        const fetch = vi.fn().mockImplementation((url: string) => Promise.resolve(response(artifact(url.includes('deadlock') ? 'deadlock' : 'handshake'))));
        vi.stubGlobal('fetch', fetch);
        const loader = new NativeWorldEvidence(), r = room('handshake');
        loader.update(r); await settle();
        loader.update({ ...r, revision: 2 }); loader.update(r, false); loader.update(r, true);
        loader.update(room('deadlock')); await settle();
        loader.update(r); await settle();
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(loader.data?.chamber_id).toBe('handshake');
    });
    it('clears stale evidence immediately and ignores a late previous-chamber response', async () => {
        let resolveHandshake!: (value: ReturnType<typeof response>) => void;
        vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => url.includes('handshake')
            ? new Promise(resolve => { resolveHandshake = resolve; }) : Promise.resolve(response(artifact('deadlock')))));
        const loader = new NativeWorldEvidence(); loader.update(room('handshake')); await settle();
        loader.update(room('deadlock')); expect(loader.data).toBeNull(); await settle();
        expect(loader.data?.chamber_id).toBe('deadlock');
        resolveHandshake(response(artifact('handshake'))); await settle();
        expect(loader.data?.chamber_id).toBe('deadlock');
        loader.update(null); expect(loader.data).toBeNull(); expect(loader.state).toBeNull();
    });
    it('contains fetch failures without a per-frame retry flood, and retries on reconnect or re-entry', async () => {
        const fetch = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(response(artifact('handshake')));
        vi.stubGlobal('fetch', fetch);
        const loader = new NativeWorldEvidence(), r = room('handshake'); loader.update(r); await settle();
        expect(loader.status).toBe('unavailable'); expect(loader.data).toBeNull();
        for (let i = 0; i < 120; i++) loader.update({ ...r, revision: i });
        expect(fetch).toHaveBeenCalledTimes(1);
        loader.update(r, false); loader.update(r, true); await settle();
        expect(loader.status).toBe('ready'); expect(fetch).toHaveBeenCalledTimes(2);
    });
    it('retries a failed asset after leaving and entering the same chamber', async () => {
        const fetch = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValue(response(artifact('handshake')));
        vi.stubGlobal('fetch', fetch);
        const loader = new NativeWorldEvidence(), r = room('handshake'); loader.update(r); await settle();
        loader.update(null); loader.update(r); await settle();
        expect(loader.status).toBe('ready'); expect(fetch).toHaveBeenCalledTimes(2);
    });
    it('rejects cross-chamber assets and malformed instruction sequences', async () => {
        const malformed = artifact('handshake'); malformed.outputs[0].excerpt.instructions[1].address += 1;
        expect(() => validateNativeWorldArtifact(malformed, 'handshake')).toThrow();
        const wrongBytes = artifact('handshake'); wrongBytes.outputs[0].excerpt.instructions[0].bytes = 'not bytes';
        expect(() => validateNativeWorldArtifact(wrongBytes, 'handshake')).toThrow();
        expect(() => validateNativeWorldArtifact(artifact('deadlock'), 'handshake')).toThrow();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(artifact('deadlock'))));
        const loader = new NativeWorldEvidence(); loader.update(room('handshake')); await settle();
        expect(loader.status).toBe('unavailable'); expect(loader.data).toBeNull();
    });
    it('never loads campaign evidence for custom drafts, unrelated labs or CONTROL SPINE', () => {
        const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
        const loader = new NativeWorldEvidence();
        for (const candidate of [null, { ...room('handshake'), draft: { hash: 'test' } }, { ...room('handshake'), level: 'workbench' }, { ...room('handshake'), level: 'uplink' }, { ...room('handshake'), level: 'relay-lab' }]) {
            loader.update(candidate as SharedRoom | null);
            expect(loader.data).toBeNull(); expect(loader.state).toBeNull();
        }
        expect(fetch).not.toHaveBeenCalled();
    });
});
