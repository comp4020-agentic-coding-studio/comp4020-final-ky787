import { expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { GameAudio, SOUNDS, AUDIO_STORAGE_KEY } from '../src/audio/game-audio.ts';
import { AudioPresentation, liftProximity } from '../src/slice/audio-presentation.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { roomById } from '../src/slice/rooms.ts';
import { freshProgress } from '../src/slice/progress.ts';
import { createApp } from '../server/app.ts';
import { emptyInput } from '../src/engine/physics.ts';
import { FIXED_DT } from '../src/engine/constants.ts';

class Param {
    value = 0;
    setTargetAtTime(n: number) { this.value = n; }
    cancelScheduledValues() {}
}
class Node {
    gain = new Param(); playbackRate = new Param(); threshold = new Param(); knee = new Param(); ratio = new Param();
    connect = vi.fn(); disconnect = vi.fn(); start = vi.fn(); stop = vi.fn();
    onended: (() => void) | null = null;
    getFloatTimeDomainData(samples: Float32Array) { samples.fill(0); }
}
function engine(raw?: string) {
    let saved = raw ?? null;
    const storage = { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } };
    const context = { state: 'suspended', currentTime: 0, destination: new Node(),
        createGain: () => new Node(), createDynamicsCompressor: () => new Node(), createAnalyser: () => new Node(),
        createBufferSource: () => new Node(), decodeAudioData: vi.fn(async () => ({})),
        resume: vi.fn(async () => { context.state = 'running'; }) };
    const fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const audio = new GameAudio({ context: () => context as unknown as AudioContext, fetch: fetcher, storage });
    return { audio, context, fetcher, storage };
}
it('loads distinct assets on a gesture; paused/locked events are discarded rather than replayed later', async () => {
    const { audio, fetcher } = engine(); audio.play('teleport');
    expect(fetcher).not.toHaveBeenCalled(); expect(audio.snapshot().state).toBe('locked');
    await audio.unlock(); expect(audio.snapshot().loaded).toBe(14);
    audio.play('teleport'); expect(audio.snapshot().played).toEqual({});
    audio.setActive(true); expect(audio.snapshot().played).toEqual({});
    audio.play('teleport'); expect(audio.snapshot().played.teleport).toBe(1);
    await audio.unlock(); expect(fetcher).toHaveBeenCalledTimes(14);
});
it('limits repeated cues/voices and owns just one loop per kind', async () => {
    const { audio, context } = engine(); await audio.unlock(); audio.setActive(true);
    for (let n = 0; n < 30; n++) audio.play('plate');
    expect(audio.snapshot().played.plate).toBe(1);
    context.currentTime = 1; audio.play('plate'); context.currentTime = 2; audio.play('plate');
    expect(audio.snapshot().played.plate).toBe(2);
    for (let n = 0; n < 240; n++) audio.setLoop('liftHum', .6);
    expect(audio.snapshot().played.liftHum).toBe(1); expect(audio.snapshot().loops).toEqual(['liftHum']);
    for (const cue of Object.keys(SOUNDS) as (keyof typeof SOUNDS)[]) audio.play(cue);
    expect(audio.snapshot().voices).toBeLessThanOrEqual(12);
    audio.setActive(false); expect(audio.snapshot().voices).toBe(0); expect(audio.snapshot().loops).toEqual([]);
    audio.setActive(true); expect(audio.snapshot().voices).toBe(0); // No stale one-shots.
});
it('mute/zero volume stop voices immediately and browser preferences survive a new audio manager', async () => {
    const { audio, storage } = engine(); await audio.unlock(); audio.setActive(true); audio.setLoop('liftHum', 1);
    audio.setPreferences({ muted: true, volume: .3 });
    expect(audio.snapshot().voices).toBe(0); audio.play('hookFire'); expect(audio.snapshot().played.hookFire).toBeUndefined();
    expect(new GameAudio({ storage }).getPreferences()).toEqual({ volume: .3, muted: true });
    audio.setPreferences({ muted: false, volume: 0 }); audio.setLoop('liftHum', 1); expect(audio.snapshot().loops).toEqual([]);
    expect(JSON.parse(storage.getItem()!)).toEqual({ muted: false, volume: 0 });
    expect(AUDIO_STORAGE_KEY).toContain('audio');
});
it('invalid preferences, unavailable storage, failed downloads and blocked audio never break gameplay', async () => {
    expect(engine('oops').audio.getPreferences().volume).toBe(.65);
    expect(engine('{"volume":99,"muted":"yes"}').audio.getPreferences()).toEqual({ volume: 1, muted: false });
    const audio = new GameAudio({ context: () => { throw new Error('Unsupported'); }, storage: {
        getItem: () => { throw new Error('Unavailable'); }, setItem: () => { throw new Error('Unavailable'); } } });
    await expect(audio.unlock()).resolves.toBeUndefined(); expect(() => audio.setPreferences({ volume: .5 })).not.toThrow();
    expect(audio.snapshot().failed).toEqual(['audio-context']);
    const { context } = engine();
    const missing = new GameAudio({ context: () => context as unknown as AudioContext, fetch: async () => new Response('', { status: 404 }), storage: null });
    await missing.unlock(); missing.setActive(true); missing.play('teleport');
    expect(missing.snapshot().failed).toHaveLength(14); expect(missing.snapshot().voices).toBe(0);
});

const world = () => new PuzzleWorld(roomById('uplink'), freshProgress().rooms.uplink);
const sink = () => ({ play: vi.fn(), setLoop: vi.fn(), stopAll: vi.fn() });
it('physical transitions sound once, repeated trace frames stay quiet, and carrying through a relay makes one transit cue', () => {
    const w = world(), audio = sink(), sound = new AudioPresentation(audio); sound.reset(w);
    w.inputs.switchB = true; w.step(FIXED_DT, emptyInput()); sound.observe(w, w.events.splice(0));
    expect(audio.play.mock.calls.filter(c => c[0] === 'relayPower')).toHaveLength(1);
    for (let n = 0; n < 120; n++) { w.step(FIXED_DT, emptyInput()); sound.observe(w, w.events.splice(0)); }
    expect(audio.play.mock.calls.filter(c => c[0] === 'relayPower')).toHaveLength(1);
    sound.observe(w, [{ kind: 'teleport', at: w.player }, { kind: 'relay-cargo', at: w.player }]);
    expect(audio.play.mock.calls.filter(c => c[0] === 'teleport')).toHaveLength(1);
    sound.observe(w, [{ kind: 'relay-cargo', at: w.player }]);
    expect(audio.play.mock.calls.filter(c => c[0] === 'teleport')).toHaveLength(2);
    audio.play.mockClear(); sound.reset(w); sound.observe(w, []); expect(audio.play).not.toHaveBeenCalled();
});
it('lift ambience is local, needs power, stops on pause, and returns after resuming', () => {
    const w = world(), audio = sink(), sound = new AudioPresentation(audio), b = w.lifts[0].def;
    Object.assign(w.player, { x: b.x + 100, y: b.y + 100 });
    expect(liftProximity(w.player, b)).toBe(1);
    sound.ambience(w, true); expect(audio.setLoop).toHaveBeenLastCalledWith('liftHum', 0);
    w.lifts[0].power(true); sound.ambience(w, true); expect(audio.setLoop).toHaveBeenLastCalledWith('liftHum', 1);
    sound.ambience(w, false); expect(audio.setLoop).toHaveBeenLastCalledWith('liftHum', 0);
    sound.ambience(w, true); expect(audio.setLoop).toHaveBeenLastCalledWith('liftHum', 1);
    w.player.x = b.x - 500; sound.ambience(w, true); expect(audio.setLoop).toHaveBeenLastCalledWith('liftHum', 0);
});
it('rope jump, cube, powered route, warning and collapse cues observe world changes without changing the controller', () => {
    const w = world(), audio = sink(), sound = new AudioPresentation(audio); sound.reset(w);
    w.player.rope.phase = 'attached'; sound.observe(w, []);
    w.player.rope.phase = 'retracting'; w.player.ropeJumpAnchors.push('anchor'); sound.observe(w, []);
    w.cube!.carried = true; sound.observe(w, []); w.cube!.carried = false; sound.observe(w, []);
    const p = w.platforms.find(p => p.def.id === 'proven-clone')!;
    p.fuse = 1.5; sound.observe(w, []); sound.observe(w, []);
    sound.observe(w, [{ kind: 'crumble', at: w.player }]);
    expect(audio.play.mock.calls.map(c => c[0])).toEqual(['hookAttach', 'ropeJump', 'pickup', 'drop', 'crumbleWarn', 'crumbleBreak']);
    expect(w.frame.source).toBe('validated-trace');
});
it('ships every credited audio file with exact hashes, real Ogg bytes and an audio MIME type', async () => {
    const credits = JSON.parse(await readFile('public/audio/credits.json', 'utf8'));
    expect(new Set(credits.assets.map((a: { file: string }) => a.file))).toEqual(new Set(Object.values(SOUNDS).map(s => s.file)));
    const dir = await mkdtemp(join(tmpdir(), 'bn-audio-http-')), app = await createApp(dir, resolve('public'));
    try {
        await new Promise<void>(r => app.listen(0, '127.0.0.1', r));
        const port = (app.address() as { port: number }).port;
        for (const asset of credits.assets) {
            const bytes = await readFile(`public/audio/${asset.file}`);
            expect(bytes.subarray(0, 4).toString()).toBe('OggS');
            expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);
            expect(asset.license).toBe('CC0-1.0'); expect(asset.source).toMatch(/^https:\/\//);
            const response = await fetch(`http://127.0.0.1:${port}/audio/${asset.file}`);
            expect(response.status).toBe(200); expect(response.headers.get('content-type')).toBe('audio/ogg');
            expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
        }
    } finally { await new Promise<void>(r => app.close(() => r())); await rm(dir, { recursive: true, force: true }); }
});
