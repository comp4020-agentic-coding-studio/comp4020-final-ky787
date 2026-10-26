import { afterEach, describe, expect, it, vi } from 'vitest';
import { MUSIC_TRACKS, musicSceneForRoom } from '../src/audio/music-catalogue.ts';
import { MusicPlayer } from '../src/audio/music-player.ts';

class Media extends EventTarget {
    src = ''; currentSrc = ''; currentTime = 0; duration = 120; readyState = 4;
    volume = 0; paused = true; loop = false; preload = '';
    error: { code: number } | null = null;
    failure: Error | null = null;
    pending: Promise<void> | null = null;
    play = vi.fn((): Promise<void> => {
        if (this.failure) return Promise.reject(this.failure);
        this.paused = false;
        return this.pending ?? Promise.resolve();
    });
    pause = vi.fn(() => { this.paused = true; });
    load = vi.fn();
    removeAttribute(name: string): void { if (name === 'src') this.src = ''; }
}
class Page extends EventTarget { hidden = false; hasFocus = () => true; }
const instances: MusicPlayer[] = [];
afterEach(() => { for (const player of instances.splice(0)) player.dispose(); });
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
function setup() {
    const elements: Media[] = [], page = new Page(), window = new EventTarget();
    let time = 0, id = 0;
    const frames = new Map<number, FrameRequestCallback>();
    const player = new MusicPlayer({
        createAudio: () => { const media = new Media(); elements.push(media); return media as unknown as HTMLAudioElement; },
        now: () => time, requestFrame: callback => { frames.set(++id, callback); return id; },
        cancelFrame: handle => { frames.delete(handle); }, document: page, window, baseUrl: '/',
        crossfadeSeconds: 2,
    });
    instances.push(player);
    const advance = (ms: number) => { time += ms; const callbacks = [...frames.values()]; frames.clear(); for (const callback of callbacks) callback(time); };
    const audible = () => elements.filter(element => !element.paused && element.volume > 0);
    return { player, elements, page, window, frames, advance, audible };
}

describe('streaming music scenes', () => {
    it('contains seven local tracks and keeps solo tutorial music separate from co-op', () => {
        expect(Object.keys(MUSIC_TRACKS)).toHaveLength(7);
        expect(musicSceneForRoom('pressure')).toBe('menu');
        expect(musicSceneForRoom('switch')).toBe('menu');
        expect(musicSceneForRoom('relay')).toBe('tutorial-relay');
        expect(musicSceneForRoom('uplink')).toBe('tutorial-relay');
        expect(musicSceneForRoom('handshake')).toBe('handshake');
        expect(musicSceneForRoom('crossfeed-vault')).toBe('crossfeed-vault');
        expect(musicSceneForRoom('race-condition')).toBe('race-condition');
        expect(musicSceneForRoom('__proto__')).toBe('menu');
    });

    it('waits for a gesture, streams only the requested track, and never restarts an unchanged scene', async () => {
        const { player, elements, advance, audible } = setup();
        player.setScene('menu');
        expect(elements).toHaveLength(2);
        expect(elements.every(element => element.src === '' && element.play.mock.calls.length === 0)).toBe(true);
        await player.unlock(); await flush(); advance(2000);
        expect(audible()).toHaveLength(1);
        expect(audible()[0].src).toBe('/audio/music/menu.ogg');
        audible()[0].currentTime = 23;
        const calls = elements.map(element => element.play.mock.calls.length);
        for (let frame = 0; frame < 100; frame++) { player.setScene('menu'); player.setDucked('none'); player.setActive(true); }
        expect(elements.map(element => element.play.mock.calls.length)).toEqual(calls);
        expect(audible()[0].currentTime).toBe(23);
        expect(player.snapshot().decks.reduce((sum, deck) => sum + deck.starts, 0)).toBe(1);
    });

    it('gently crossfades scenes with a fixed two-deck pool, then retires the outgoing deck', async () => {
        const { player, elements, advance, audible } = setup();
        player.setScene('menu'); await player.unlock(); await flush(); advance(2000);
        const outgoing = audible()[0]; outgoing.currentTime = 34;
        player.setScene('handshake'); await flush(); advance(1000);
        expect(audible()).toHaveLength(2);
        expect(outgoing.volume).toBeCloseTo(.21);
        expect(audible().find(element => element !== outgoing)?.volume).toBeCloseTo(.175);
        expect(outgoing.currentTime).toBe(34);
        advance(1000);
        expect(audible()).toHaveLength(1);
        expect(audible()[0].src).toBe('/audio/music/handshake.ogg');
        expect(outgoing.paused).toBe(true);
        for (const scene of ['deadlock', 'race-condition', 'menu', 'use-after-free'] as const) { player.setScene(scene); await flush(); advance(2000); }
        expect(elements).toHaveLength(2);
        expect(audible()).toHaveLength(1);
        expect(player.snapshot().scene).toBe('use-after-free');
    });

    it('lets native looping preserve the complete authored cycle without another play, load or overlapping deck', async () => {
        const { player, elements, advance, audible } = setup();
        player.setScene('menu'); await player.unlock(); await flush(); advance(2000);
        const current = audible()[0], before = player.snapshot();
        const calls = elements.map(element => element.play.mock.calls.length);
        for (let cycle = 0; cycle < 3; cycle++) {
            // Simulate media playback reaching the true end, followed by its native wrap.
            current.currentTime = 119.1; current.dispatchEvent(new Event('timeupdate'));
            current.currentTime = 119.99; current.dispatchEvent(new Event('timeupdate'));
            expect(current.currentTime).toBe(119.99);
            expect(audible()).toEqual([current]);
            expect(player.snapshot().crossfading).toBe(false);
            current.currentTime = .1; current.dispatchEvent(new Event('timeupdate'));
        }
        expect(current.loop).toBe(true);
        expect(current.duration).toBe(120);
        expect(audible()).toEqual([current]);
        expect(player.snapshot().loops).toBe(3);
        expect(player.snapshot().crossfades).toBe(before.crossfades);
        expect(player.snapshot().decks.map(deck => deck.loads)).toEqual(before.decks.map(deck => deck.loads));
        expect(elements.map(element => element.play.mock.calls.length)).toEqual(calls);
        expect(elements.every(element => element.load.mock.calls.length === 0)).toBe(true);
    });

    it('recovers a browser ended event on the same deck without reloading its source or starting a scene fade', async () => {
        const { player, advance, audible } = setup();
        player.setScene('menu'); await player.unlock(); await flush(); advance(2000);
        const current = audible()[0], before = player.snapshot(), calls = current.play.mock.calls.length;
        current.currentTime = 120; current.paused = true; current.dispatchEvent(new Event('ended')); await flush();
        expect(audible()).toEqual([current]);
        expect(current.currentTime).toBe(0);
        expect(current.play).toHaveBeenCalledTimes(calls + 1);
        expect(player.snapshot().decks.map(deck => deck.loads)).toEqual(before.decks.map(deck => deck.loads));
        expect(player.snapshot().crossfades).toBe(before.crossfades);
        expect(player.snapshot().loops).toBe(1);
    });

    it('does not treat an ordinary developer seek within a track as a native loop', async () => {
        const { player, advance, audible } = setup();
        player.setScene('menu'); await player.unlock(); await flush(); advance(2000);
        const current = audible()[0];
        current.currentTime = 60; current.dispatchEvent(new Event('timeupdate'));
        current.currentTime = 20; current.dispatchEvent(new Event('timeupdate'));
        expect(player.snapshot().loops).toBe(0);
        expect(audible()).toEqual([current]);
    });

    it('keeps the outgoing scene natively looping when a new scene is slow or fails to start', async () => {
        const { player, elements, advance, audible } = setup();
        player.setScene('menu'); await player.unlock(); await flush(); advance(2000);
        const outgoing = audible()[0];
        let reject!: (error: Error) => void;
        elements[1].pending = new Promise<void>((_resolve, fail) => { reject = fail; });
        player.setScene('handshake');
        outgoing.currentTime = 119.99; outgoing.dispatchEvent(new Event('timeupdate'));
        expect(outgoing.loop).toBe(true); expect(audible()).toEqual([outgoing]);
        outgoing.currentTime = .1; outgoing.dispatchEvent(new Event('timeupdate'));
        reject(new Error('Unavailable')); await flush();
        expect(audible()).toEqual([outgoing]);
        expect(outgoing.loop).toBe(true);
        expect(player.snapshot().failures).toContainEqual({ scene: 'handshake', error: 'Error' });
    });

    it('retains positions across tab hiding, window blur, mute and application suspension', async () => {
        const { player, page, window, advance, audible } = setup();
        player.setScene('handshake'); await player.unlock(); await flush(); advance(2000);
        const current = audible()[0]; current.currentTime = 42;
        page.hidden = true; page.dispatchEvent(new Event('visibilitychange'));
        expect(audible()).toHaveLength(0);
        expect(player.snapshot().suspended).toBe(true);
        advance(300000);
        page.hidden = false; page.dispatchEvent(new Event('visibilitychange')); await flush();
        expect(audible()).toHaveLength(1); expect(current.currentTime).toBe(42);
        window.dispatchEvent(new Event('blur')); expect(audible()).toHaveLength(0);
        window.dispatchEvent(new Event('focus')); await flush(); expect(audible()).toHaveLength(1);
        player.setPreferences({ muted: true }); expect(audible()).toHaveLength(0);
        player.setPreferences({ muted: false }); await flush(); expect(current.currentTime).toBe(42);
        player.setActive(false); expect(audible()).toHaveLength(0);
        player.setActive(true); await flush(); expect(current.currentTime).toBe(42);
    });

    it('smoothly ducks tutorials, pause and completion while independent music gain remains adjustable', async () => {
        const { player, advance, audible } = setup();
        player.setPreferences({ musicVolume: .5 });
        player.setScene('menu'); await player.unlock(); await flush(); advance(2000);
        expect(audible()[0].volume).toBe(.6);
        player.setDucked('pause'); advance(225);
        expect(audible()[0].volume).toBeCloseTo(.384);
        advance(225); expect(audible()[0].volume).toBeCloseTo(.168);
        player.setDucked('tutorial'); advance(450); expect(audible()[0].volume).toBeCloseTo(.228);
        player.setDucked('complete'); advance(450); expect(audible()[0].volume).toBeCloseTo(.108);
        player.setDucked('none'); advance(450); expect(audible()[0].volume).toBe(.6);
        player.setPreferences({ musicVolume: 0 }); expect(audible()).toHaveLength(0);
        player.setPreferences({ musicVolume: 4 }); await flush(); expect(player.snapshot().preferences.musicVolume).toBe(1);
    });

    it('isolates autoplay rejection and missing files without retrying on every frame', async () => {
        const { player, elements, advance, audible } = setup();
        elements[0].failure = new DOMException('Gesture required', 'NotAllowedError');
        player.setScene('menu'); await player.unlock(); await flush();
        expect(player.snapshot().blocked).toBe(true); expect(audible()).toHaveLength(0);
        const calls = elements[0].play.mock.calls.length;
        for (let frame = 0; frame < 100; frame++) { player.setScene('menu'); player.setDucked('none'); player.setActive(true); advance(16); }
        expect(elements[0].play).toHaveBeenCalledTimes(calls);
        elements[0].failure = null; await player.unlock(); await flush(); advance(2000);
        expect(audible()).toHaveLength(1); expect(player.snapshot().blocked).toBe(false);
        player.setScene('deadlock'); elements[1].error = { code: 4 }; elements[1].dispatchEvent(new Event('error')); await flush();
        expect(player.snapshot().failures).toContainEqual({ scene: 'deadlock', error: 'media-4' });
        expect(audible()).toHaveLength(1); expect(audible()[0].src).toBe('/audio/music/menu.ogg');
    });

    it('cancels stale scene playback and preserves a suspended transition without late promises reviving it', async () => {
        const { player, elements, page, advance, audible } = setup();
        player.setScene('menu'); await player.unlock(); await flush(); advance(2000);
        let resolve!: () => void;
        elements[1].pending = new Promise<void>(done => { resolve = done; });
        player.setScene('handshake');
        elements[1].pending = null; player.setScene('deadlock'); await flush(); advance(1000);
        page.hidden = true; page.dispatchEvent(new Event('visibilitychange'));
        resolve(); await flush(); advance(10000);
        expect(audible()).toHaveLength(0);
        expect(player.snapshot().scene).toBe('deadlock');
        page.hidden = false; page.dispatchEvent(new Event('visibilitychange')); await flush(); advance(1000);
        expect(audible()).toHaveLength(1); expect(audible()[0].src).toBe('/audio/music/deadlock.ogg');
    });

    it('recovers focus on visibility restoration and invalidates a play promise interrupted by hiding', async () => {
        const { player, elements, page, window, advance, audible } = setup();
        player.setScene('menu'); await player.unlock(); await flush(); advance(2000);
        let resolve!: () => void;
        elements[1].pending = new Promise<void>(done => { resolve = done; });
        player.setScene('handshake');
        window.dispatchEvent(new Event('blur'));
        page.hidden = true; page.dispatchEvent(new Event('visibilitychange'));
        elements[1].pending = null;
        page.hidden = false; page.dispatchEvent(new Event('visibilitychange'));
        await flush(); advance(2000);
        resolve(); await flush();
        expect(audible()).toHaveLength(1);
        expect(audible()[0].src).toBe('/audio/music/handshake.ogg');
        expect(player.snapshot().failures).toEqual([]);
    });

    it('cancels a pending transition when navigation returns to the still-playing scene', async () => {
        const { player, elements, advance, audible } = setup();
        player.setScene('menu'); await player.unlock(); await flush(); advance(2000);
        const original = audible()[0]; original.currentTime = 18;
        let reject!: (error: Error) => void;
        elements[1].pending = new Promise<void>((_resolve, fail) => { reject = fail; });
        player.setScene('handshake');
        player.setScene('menu');
        reject(new DOMException('Playback aborted', 'AbortError')); await flush();
        expect(audible()).toEqual([original]);
        expect(original.currentTime).toBe(18);
        expect(player.snapshot().failures).toEqual([]);
        expect(player.snapshot().scene).toBe('menu');
    });

    it('does not block construction or gameplay if browser media support is unavailable', async () => {
        const player = new MusicPlayer({ createAudio: () => { throw new Error('Media disabled'); }, document: null, window: null,
            requestFrame: () => 1, cancelFrame: () => {}, baseUrl: '/' });
        instances.push(player);
        player.setScene('menu');
        await expect(player.unlock()).resolves.toBeUndefined(); await flush();
        expect(player.snapshot().failures).toContainEqual({ scene: 'menu', error: 'NotSupportedError' });
        expect(player.snapshot().decks.every(deck => deck.paused && deck.volume === 0)).toBe(true);
    });

    it('disposes both media sources, pending fades and document listeners', async () => {
        const { player, elements, page, window, frames, advance } = setup();
        player.setScene('menu'); await player.unlock(); await flush(); advance(500);
        player.dispose();
        expect(frames.size).toBe(0);
        expect(elements.every(element => element.paused && element.volume === 0 && element.src === '')).toBe(true);
        const calls = elements.map(element => element.play.mock.calls.length);
        page.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus'));
        player.setScene('handshake'); await player.unlock(); advance(3000);
        expect(elements.map(element => element.play.mock.calls.length)).toEqual(calls);
        expect(player.snapshot().disposed).toBe(true);
    });
});
