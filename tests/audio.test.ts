import { expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { GameAudio, SOUNDS, SOUND_ASSET_COUNT, MACHINERY_CUES, AUDIO_STORAGE_KEY, COMPLETION_DUCK_MS } from '../src/audio/game-audio.ts';
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
    await audio.unlock(); expect(audio.snapshot().loaded).toBe(SOUND_ASSET_COUNT);
    audio.play('teleport'); expect(audio.snapshot().played).toEqual({});
    audio.setActive(true); expect(audio.snapshot().played).toEqual({});
    audio.play('teleport'); expect(audio.snapshot().played.teleport).toBe(1);
    await audio.unlock(); expect(fetcher).toHaveBeenCalledTimes(SOUND_ASSET_COUNT);
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
    expect(new GameAudio({ storage }).getPreferences()).toEqual({ volume: .3, musicVolume: .35, muted: true });
    audio.setPreferences({ muted: false, volume: 0 }); audio.setLoop('liftHum', 1); expect(audio.snapshot().loops).toEqual([]);
    expect(JSON.parse(storage.getItem()!)).toEqual({ muted: false, volume: 0, musicVolume: .35 });
    expect(AUDIO_STORAGE_KEY).toContain('audio');
});
it('invalid preferences, unavailable storage, failed downloads and blocked audio never break gameplay', async () => {
    expect(engine('oops').audio.getPreferences().volume).toBe(.65);
    expect(engine('{"volume":99,"muted":"yes"}').audio.getPreferences()).toEqual({ volume: 1, musicVolume: .35, muted: false });
    const audio = new GameAudio({ context: () => { throw new Error('Unsupported'); }, storage: {
        getItem: () => { throw new Error('Unavailable'); }, setItem: () => { throw new Error('Unavailable'); } } });
    await expect(audio.unlock()).resolves.toBeUndefined(); expect(() => audio.setPreferences({ volume: .5 })).not.toThrow();
    expect(audio.snapshot().failed).toEqual(['audio-context']);
    const { context } = engine();
    const missing = new GameAudio({ context: () => context as unknown as AudioContext, fetch: async () => new Response('', { status: 404 }), storage: null });
    await missing.unlock(); missing.setActive(true); missing.play('teleport');
    expect(missing.snapshot().failed).toHaveLength(SOUND_ASSET_COUNT); expect(missing.snapshot().voices).toBe(0);
});

it('migrates legacy effect preferences and independently persists finite music and effects levels', () => {
    expect(engine('{"volume":0,"muted":false}').audio.getPreferences()).toEqual({ volume: 0, musicVolume: 0, muted: false });
    expect(engine('{"volume":0,"musicVolume":0.4,"muted":false}').audio.getPreferences()).toEqual({ volume: 0, musicVolume: .4, muted: false });
    const { audio, storage } = engine('{"volume":0.23,"muted":true}');
    expect(audio.getPreferences()).toEqual({ volume: .23, musicVolume: .35, muted: true });
    audio.setPreferences({ musicVolume: .18 });
    expect(audio.getPreferences()).toEqual({ volume: .23, musicVolume: .18, muted: true });
    audio.setPreferences({ volume: .7 });
    expect(new GameAudio({ storage }).getPreferences()).toEqual({ volume: .7, musicVolume: .18, muted: true });
    audio.setPreferences({ muted: false });
    expect(audio.getPreferences()).toEqual({ volume: .7, musicVolume: .18, muted: false });
    audio.setPreferences({ musicVolume: Infinity }); expect(audio.getPreferences().musicVolume).toBe(0);
    audio.setPreferences({ musicVolume: -1, volume: NaN });
    expect(audio.getPreferences()).toEqual({ volume: 0, musicVolume: 0, muted: false });
    expect(engine('{"volume":0.2,"musicVolume":12,"muted":false}').audio.getPreferences()).toEqual({ volume: .2, musicVolume: 1, muted: false });
});

it('completion, checkpoint, switch, latch and breakpoint stages have distinct sourced assets', () => {
    const cues = ['complete', 'checkpoint', 'switch', 'latch', 'breakpointDeploy', 'breakpointConfirm'] as const;
    expect(new Set(cues.map(cue => SOUNDS[cue].file)).size).toBe(cues.length);
    expect(Object.values(SOUNDS).some(sound => String(sound.file) === 'confirm.ogg')).toBe(false);
    expect(SOUNDS.codePower.file).not.toBe(SOUNDS.firewallZap.file);
});

it('bounds overlapping machinery and gives completion a single audible foreground voice', async () => {
    const { audio, context } = engine(); await audio.unlock(); audio.setActive(true);
    audio.play('codePower'); audio.play('relayPower'); audio.play('liftPower');
    expect(audio.snapshot().voices).toBe(2); expect(audio.snapshot().played.liftPower).toBeUndefined();
    audio.play('door'); expect(audio.snapshot().played.door).toBe(1); expect(audio.snapshot().voices).toBe(2);
    audio.setLoop('reel', 1); audio.play('plate'); audio.play('complete');
    expect(audio.snapshot().voices).toBe(1); expect(audio.snapshot().loops).toEqual([]);
    expect(audio.snapshot().played.complete).toBe(1);
    context.currentTime = .6; audio.play('complete');
    expect(audio.snapshot().played.complete).toBe(1);
    context.currentTime = 5.5; audio.play('complete'); // Past cooldown, still within Victory's tail.
    expect(audio.snapshot().played.complete).toBe(1); expect(audio.snapshot().voices).toBe(1);
});

it('uses the complete human-selected Victory recording with minimal processing and a duration-matched duck', async () => {
    const credits = JSON.parse(await readFile('public/audio/credits.json', 'utf8'));
    const victory = credits.assets.find((a: { file: string }) => a.file === SOUNDS.complete.file);
    expect(victory.author).toBe('SRG774'); expect(victory.original).toBe('Victory.mp3');
    expect(victory.source).toBe('https://opengameart.org/content/dark-sci-fi-audio-pack');
    expect(victory.download).toBe('https://opengameart.org/sites/default/files/victory_4.mp3');
    expect(victory.sourceSha256).toBe('208916af7b2b26ee70171a964595ace1ccaf4534abfbfa816d340179e13fe289');
    expect(victory.license).toBe('CC0-1.0');
    expect(victory.fullOriginalRecording).toBe(true); expect(victory.channels).toBe(2);
    expect(victory.sourceDecodedSamplesPerChannel).toBe(259200);
    expect(victory.decodedSamplesPerChannel).toBe(victory.sourceDecodedSamplesPerChannel);
    expect(victory.durationSeconds).toBeCloseTo(259200 / 44100, 6);
    expect(victory.arrangement).toBeUndefined(); expect(victory.dynamicCompression).toBe(false);
    expect(victory.processing).toMatch(/^anull,volume=[0-9.]+dB;/);
    expect(victory.truePeakDbtp).toBeLessThan(-7);
    expect(victory.integratedLufs).toBeGreaterThan(-22); expect(victory.integratedLufs).toBeLessThan(-20);
    expect(COMPLETION_DUCK_MS).toBe(Math.ceil(victory.durationSeconds * 1000));
});

it('covers the actual browser-decoded Victory duration, including resampling padding, with a safe unloaded fallback', async () => {
    const { audio, context } = engine();
    expect(audio.completionDurationMs()).toBe(COMPLETION_DUCK_MS);
    context.decodeAudioData.mockResolvedValue({ duration: 282610 / 48000 });
    await audio.unlock();
    expect(audio.completionDurationMs()).toBe(5888);
    expect(audio.completionDurationMs()).toBeGreaterThan(282610 / 48000 * 1000);
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
    Object.assign(w.player, { x: p.def.x + p.def.w / 2, y: p.def.y });
    p.fuse = 1.5; sound.observe(w, []); sound.observe(w, []);
    sound.observe(w, [{ kind: 'crumble', at: w.player }]);
    expect(audio.play.mock.calls.map(c => c[0])).toEqual(['hookAttach', 'ropeJump', 'pickup', 'drop', 'crumbleWarn', 'crumbleBreak']);
    expect(w.frame.source).toBe('validated-trace');
});
it('events beyond the local sound radius remain silent rather than consuming voices', () => {
    const w = world(), audio = sink(), sound = new AudioPresentation(audio); sound.reset(w);
    const distant = { x: w.player.x + 1200, y: w.player.y };
    sound.observe(w, [{ kind: 'crumble', at: distant }, { kind: 'teleport', at: distant }]);
    expect(audio.play).not.toHaveBeenCalled();
    sound.observe(w, [{ kind: 'crumble', at: w.player }]);
    expect(audio.play.mock.calls).toEqual([['crumbleBreak', 1, 1]]);
});
it('several outputs changing together produce one machinery cue while duplicate event feedback stays bounded', () => {
    const w = world(), audio = sink(), sound = new AudioPresentation(audio); sound.reset(w);
    w.frame = { ...w.frame, outputs: { ...w.frame.outputs, grappleAnchor: true, bridge: true, codePlatformA: true, relayGates: true, exitDoor: true } };
    sound.observe(w, [{ kind: 'switch', at: w.player }, { kind: 'switch', at: w.player }]);
    expect(audio.play.mock.calls.filter(c => MACHINERY_CUES.includes(c[0]))).toEqual([['door', 1, 1]]);
    expect(audio.play.mock.calls.filter(c => c[0] === 'switch')).toHaveLength(1);
    audio.play.mockClear(); sound.observe(w, []); expect(audio.play).not.toHaveBeenCalled();
    sound.observe(w, [{ kind: 'checkpoint', at: w.player }, { kind: 'checkpoint', at: w.player }]);
    expect(audio.play.mock.calls).toEqual([['checkpoint', 1, 1]]);
});
it('ships every credited audio file with exact hashes, real Ogg bytes and an audio MIME type', async () => {
    const credits = JSON.parse(await readFile('public/audio/credits.json', 'utf8'));
    expect(new Set(credits.assets.filter((a: { runtime?: boolean }) => a.runtime !== false).map((a: { file: string }) => a.file))).toEqual(new Set(Object.values(SOUNDS).map(s => s.file)));
    const dir = await mkdtemp(join(tmpdir(), 'bn-audio-http-')), app = await createApp(dir, resolve('public'));
    try {
        await new Promise<void>(r => app.listen(0, '127.0.0.1', r));
        const port = (app.address() as { port: number }).port;
        for (const asset of credits.assets) {
            const bytes = await readFile(`public/audio/${asset.file}`);
            expect(bytes.subarray(0, 4).toString()).toBe('OggS');
            expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);
            expect(bytes.length).toBe(asset.bytes);
            expect(asset.license).toBe('CC0-1.0'); expect(asset.source).toMatch(/^https:\/\//);
            if (asset.retrieved === '2026-10-26') {
                expect(asset.download).toMatch(/^https:\/\/kenney\.nl\/media\/pages\/assets\//);
                expect(asset.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
                expect(asset.sourceArchiveSha256).toBe(credits.sourcePacks[asset.pack].archiveSha256);
                expect(asset.processing).toContain('lowpass=');
                expect(asset.decodedPeakDbfs).toBeLessThan(-5.5);
                expect(asset.durationSeconds).toBeLessThan(1.2);
            }
            const response = await fetch(`http://127.0.0.1:${port}/audio/${asset.file}`);
            expect(response.status).toBe(200); expect(response.headers.get('content-type')).toBe('audio/ogg');
            expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
        }
    } finally { await new Promise<void>(r => app.close(() => r())); await rm(dir, { recursive: true, force: true }); }
});
