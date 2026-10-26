import { MUSIC_TRACKS, type MusicScene } from './music-catalogue.ts';

export interface MusicPreferences { musicVolume: number; muted: boolean }
export type MusicDuck = 'none' | 'tutorial' | 'pause' | 'complete';
export interface MusicPlayerOptions {
    createAudio?: () => HTMLAudioElement;
    requestFrame?: (callback: FrameRequestCallback) => number;
    cancelFrame?: (handle: number) => void;
    now?: () => number;
    document?: Pick<Document, 'hidden' | 'hasFocus' | 'addEventListener' | 'removeEventListener'> | null;
    window?: Pick<Window, 'addEventListener' | 'removeEventListener'> | null;
    baseUrl?: string;
    crossfadeSeconds?: number;
}
interface Deck {
    audio: HTMLAudioElement; scene: MusicScene | null; gain: number; epoch: number;
    starting: boolean; priming: boolean; primed: boolean; starts: number; loads: number; lastTime: number;
}
interface Fade { from: number | null; to: number; fromGain: number; toGain: number; elapsed: number; duration: number }
const DUCK: Record<MusicDuck, number> = { none: 1, tutorial: .38, pause: .28, complete: .18 };
const clamp = (n: number): number => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
function unavailableMedia(): HTMLAudioElement {
    // Missing/disabled media support must not prevent the game from constructing.
    return Object.assign(new EventTarget(), { src: '', currentSrc: '', currentTime: 0, duration: NaN, readyState: 0,
        volume: 0, paused: true, loop: false, preload: '', error: null,
        play: () => Promise.reject(new DOMException('Music playback is unavailable', 'NotSupportedError')),
        pause() {}, load() {}, removeAttribute() {},
    }) as unknown as HTMLAudioElement;
}

/** Two streaming media decks. Music is never fetched/decoded into the SFX buffer pool. */
export class MusicPlayer {
    private readonly decks: [Deck, Deck];
    private readonly doc: MusicPlayerOptions['document'];
    private readonly win: MusicPlayerOptions['window'];
    private readonly now: () => number;
    private readonly request: (callback: FrameRequestCallback) => number;
    private readonly cancel: (handle: number) => void;
    private readonly cleanups: (() => void)[] = [];
    private preferences: MusicPreferences = { musicVolume: .35, muted: false };
    private scene: MusicScene | null = null;
    private target: number | null = null;
    private fade: Fade | null = null;
    private duck: MusicDuck = 'none';
    private duckGain = 1;
    private duckFade: { from: number; elapsed: number } | null = null;
    private frame = 0;
    private lastFrame = 0;
    private unlocked = false;
    private active = true;
    private focused = true;
    private disposed = false;
    private blocked = false;
    private crossfades = 0;
    private loops = 0;
    private failures = new Map<MusicScene, string>();

    constructor(private readonly options: MusicPlayerOptions = {}) {
        this.doc = options.document === undefined ? globalThis.document ?? null : options.document;
        this.win = options.window === undefined ? globalThis.window ?? null : options.window;
        this.now = options.now ?? (() => performance.now());
        this.request = options.requestFrame ?? (callback => requestAnimationFrame(callback));
        this.cancel = options.cancelFrame ?? (handle => cancelAnimationFrame(handle));
        this.focused = this.doc?.hasFocus() ?? true;
        const create = (): Deck => {
            let audio: HTMLAudioElement;
            try { audio = (options.createAudio ?? (() => new Audio()))(); audio.preload = 'metadata'; audio.loop = true; audio.volume = 0; }
            catch { audio = unavailableMedia(); }
            return { audio, scene: null, gain: 0, epoch: 0, starting: false, priming: false, primed: false, starts: 0, loads: 0, lastTime: 0 };
        };
        this.decks = [create(), create()];
        this.decks.forEach((deck, index) => {
            const update = () => this.observeLoop(index);
            const ended = () => this.restartEnded(index);
            const error = () => { if (deck.scene) this.failed(index, `media-${deck.audio.error?.code ?? 'unavailable'}`); };
            for (const [event, handler] of [['timeupdate', update], ['ended', ended], ['error', error]] as const) {
                deck.audio.addEventListener(event, handler);
                this.cleanups.push(() => deck.audio.removeEventListener(event, handler));
            }
        });
        const visibility = () => { if (!this.doc?.hidden) this.focused = this.doc?.hasFocus() ?? true; this.reconcile(); };
        const focus = () => { this.focused = true; this.reconcile(); };
        const blur = () => { this.focused = false; this.reconcile(); };
        this.doc?.addEventListener('visibilitychange', visibility);
        this.win?.addEventListener('focus', focus); this.win?.addEventListener('blur', blur);
        this.cleanups.push(() => {
            this.doc?.removeEventListener('visibilitychange', visibility);
            this.win?.removeEventListener('focus', focus); this.win?.removeEventListener('blur', blur);
        });
    }

    setScene(scene: MusicScene | null): void {
        if (this.disposed || this.scene === scene) return;
        this.scene = scene; this.reconcile(true);
    }
    setPreferences(patch: Partial<MusicPreferences>): void {
        this.preferences = { musicVolume: patch.musicVolume === undefined ? this.preferences.musicVolume : clamp(patch.musicVolume), muted: patch.muted ?? this.preferences.muted };
        this.reconcile();
    }
    setActive(active: boolean): void { if (this.active !== active) { this.active = active; this.reconcile(); } }
    setDucked(duck: MusicDuck): void {
        if (this.disposed || this.duck === duck) return;
        this.duck = duck; this.duckFade = { from: this.duckGain, elapsed: 0 };
        if (this.allowed()) this.schedule();
    }
    /** Invoke directly within a real gesture. Failed autoplay remains retryable and nonblocking. */
    async unlock(): Promise<void> {
        if (this.disposed) return;
        this.focused = this.doc?.hasFocus() ?? this.focused;
        this.unlocked = true; this.blocked = false;
        this.reconcile();
        // Give both reusable elements a gesture-authorized play; silent priming never
        // advances the selected deck and avoids per-element autoplay restrictions.
        if (this.allowed() && this.scene) for (const [index, deck] of this.decks.entries()) {
            if (deck.primed || deck.starting || deck.priming || index === this.target || !deck.audio.paused) continue;
            if (!this.prepare(index, this.scene)) continue;
            deck.priming = true;
            const epoch = deck.epoch;
            try {
                await deck.audio.play();
                if (this.disposed || epoch !== deck.epoch) continue;
                deck.primed = true; deck.priming = false;
                if (index !== this.target) { deck.audio.pause(); deck.audio.currentTime = 0; }
            } catch { if (epoch === deck.epoch) deck.priming = false; }
        }
    }

    private allowed(): boolean {
        return !this.disposed && this.unlocked && this.active && !this.doc?.hidden && this.focused && !this.preferences.muted && this.preferences.musicVolume > 0;
    }
    private reconcile(changed = false): void {
        if (this.disposed) return;
        if (!this.allowed() || !this.scene) {
            this.stopFrame();
            for (const deck of this.decks) {
                if (deck.starting || deck.priming) { deck.epoch++; deck.starting = false; deck.priming = false; }
                deck.audio.pause(); deck.audio.volume = 0;
            }
            if (!this.scene) { this.fade = null; this.target = null; for (const deck of this.decks) deck.gain = 0; }
            return;
        }
        if (changed || this.target === null || this.decks[this.target].scene !== this.scene) this.change(this.scene);
        else {
            if (this.fade?.from !== null && this.fade?.from !== undefined) this.start(this.fade.from);
            this.start(this.target);
            this.applyVolume();
            if (this.fade || this.duckFade) this.schedule();
        }
    }
    private dominant(): number | null {
        const [a, b] = this.decks;
        if (a.gain <= 0 && b.gain <= 0) return null;
        return a.gain >= b.gain ? 0 : 1;
    }
    private prepare(index: number, scene: MusicScene): boolean {
        const deck = this.decks[index];
        try {
            deck.epoch++; deck.starting = false; deck.priming = false; deck.audio.pause(); deck.gain = 0; deck.audio.volume = 0;
            if (deck.scene !== scene) {
                deck.scene = scene; deck.loads++;
                deck.audio.src = `${this.options.baseUrl ?? import.meta.env.BASE_URL}audio/music/${MUSIC_TRACKS[scene].file}`;
            }
            // These assets are authored cycles. Preserve their complete bar lengths;
            // overlap is reserved for changing scenes, never a same-track repeat.
            deck.audio.loop = true; deck.lastTime = 0;
            try { deck.audio.currentTime = 0; } catch { /* Metadata can be pending. Playback starts at zero. */ }
            return true;
        } catch (error) {
            this.failed(index, error instanceof Error ? error.name : 'media-setup-failed');
            return false;
        }
    }
    private change(scene: MusicScene): void {
        const from = this.dominant();
        const existing = this.decks.findIndex(deck => deck.scene === scene && deck.gain > 0);
        const to = existing >= 0 ? existing : from === 0 ? 1 : 0;
        this.fade = null;
        if (existing < 0 && !this.prepare(to, scene)) return;
        this.target = to;
        // A scene request during a fade reuses the quieter deck; never add a third.
        const other = 1 - to;
        if (this.decks[other].gain <= 0) {
            const discarded = this.decks[other];
            discarded.epoch++; discarded.starting = false; discarded.priming = false;
            discarded.audio.pause();
        }
        this.start(to);
        if (!this.decks[to].audio.paused && !this.decks[to].starting) this.beginFade(to);
    }
    private start(index: number): void {
        const deck = this.decks[index];
        if (!this.allowed() || !deck.scene || deck.starting || deck.priming) return;
        if (!deck.audio.paused) return;
        deck.starting = true;
        const epoch = deck.epoch;
        this.applyVolume();
        try {
            void Promise.resolve(deck.audio.play()).then(() => {
                if (this.disposed || epoch !== deck.epoch) return;
                deck.starting = false; deck.primed = true;
                if (!this.allowed()) { deck.audio.pause(); return; }
                deck.starts++; this.blocked = false; this.failures.delete(deck.scene!);
                if (this.target === index && !this.fade) this.beginFade(index);
            }).catch(error => {
                if (this.disposed || epoch !== deck.epoch) return;
                this.failed(index, error instanceof Error ? error.name : 'play-failed');
            });
        } catch (error) { this.failed(index, error instanceof Error ? error.name : 'play-failed'); }
    }
    private beginFade(to: number): void {
        const incoming = this.decks[to], other = 1 - to;
        if (incoming.gain >= 1 && this.decks[other].gain <= 0) { this.applyVolume(); return; }
        const from = this.decks[other].gain > 0 ? other : null;
        if (from !== null && this.decks[from].audio.paused) this.start(from);
        const duration = Math.max(.05, this.options.crossfadeSeconds ?? 1.8);
        this.fade = { from, to, fromGain: from === null ? 0 : this.decks[from].gain, toGain: incoming.gain, elapsed: 0, duration };
        this.crossfades++; this.schedule();
    }
    private failed(index: number, message: string): void {
        const deck = this.decks[index];
        deck.epoch++; deck.starting = false; deck.priming = false; deck.audio.pause(); deck.gain = 0; deck.audio.volume = 0;
        if (deck.scene) this.failures.set(deck.scene, message);
        if (message === 'NotAllowedError') this.blocked = true;
        if (this.fade?.to === index) this.fade = null;
        const other = this.decks[1 - index];
        if (this.target === index && other.gain > 0) other.gain = 1;
        this.applyVolume();
    }
    /** Diagnostic only: native looping owns the actual boundary and complete duration. */
    private observeLoop(index: number): void {
        const deck = this.decks[index], duration = deck.audio.duration, time = deck.audio.currentTime;
        const boundaryWindow = Math.min(2, duration * .1);
        if (this.allowed() && index === this.target && !deck.audio.paused && Number.isFinite(duration) && duration > 0
            && deck.lastTime >= duration - boundaryWindow && time <= boundaryWindow && time < deck.lastTime) this.loops++;
        deck.lastTime = time;
    }
    private restartEnded(index: number): void {
        const deck = this.decks[index];
        // loop=true normally suppresses ended. Recover only the selected deck on
        // browsers that still stop, keeping the same source and avoiding overlap.
        if (!this.allowed() || index !== this.target || deck.scene !== this.scene || deck.starting) return;
        try { deck.audio.currentTime = 0; deck.lastTime = 0; this.loops++; this.start(index); }
        catch (error) { this.failed(index, error instanceof Error ? error.name : 'loop-resume-failed'); }
    }
    private applyVolume(): void {
        for (const deck of this.decks) deck.audio.volume = this.allowed() && deck.scene
            ? clamp(this.preferences.musicVolume * MUSIC_TRACKS[deck.scene].gain * deck.gain * this.duckGain) : 0;
    }
    private schedule(): void {
        if (this.frame || !this.allowed()) return;
        this.lastFrame = this.now(); this.frame = this.request(this.tick);
    }
    private readonly tick = (now: number): void => {
        this.frame = 0;
        if (!this.allowed()) return;
        const elapsed = Math.max(0, (now - this.lastFrame) / 1000); this.lastFrame = now;
        if (this.fade) {
            const fade = this.fade; fade.elapsed += elapsed;
            const progress = Math.min(1, fade.elapsed / fade.duration), eased = progress * progress * (3 - 2 * progress);
            this.decks[fade.to].gain = fade.toGain + (1 - fade.toGain) * eased;
            if (fade.from !== null) this.decks[fade.from].gain = fade.fromGain * (1 - eased);
            if (progress === 1) { if (fade.from !== null) this.decks[fade.from].audio.pause(); this.fade = null; }
        }
        if (this.duckFade) {
            this.duckFade.elapsed += elapsed;
            const progress = Math.min(1, this.duckFade.elapsed / .45);
            this.duckGain = this.duckFade.from + (DUCK[this.duck] - this.duckFade.from) * progress;
            if (progress === 1) this.duckFade = null;
        }
        this.applyVolume();
        if (this.fade || this.duckFade) this.frame = this.request(this.tick);
    };
    private stopFrame(): void { if (this.frame) this.cancel(this.frame); this.frame = 0; }

    snapshot() {
        return { scene: this.scene, currentScene: this.target === null ? null : this.decks[this.target].scene,
            unlocked: this.unlocked, active: this.active, suspended: !this.allowed(), disposed: this.disposed,
            blocked: this.blocked, duck: this.duck, duckGain: this.duckGain, crossfading: this.fade !== null,
            crossfades: this.crossfades, loops: this.loops, preferences: { ...this.preferences },
            failures: [...this.failures].map(([scene, error]) => ({ scene, error })),
            decks: this.decks.map(deck => ({ scene: deck.scene, src: deck.audio.currentSrc || deck.audio.src,
                readyState: deck.audio.readyState, paused: deck.audio.paused, currentTime: deck.audio.currentTime,
                duration: Number.isFinite(deck.audio.duration) ? deck.audio.duration : null, loop: deck.audio.loop,
                gain: deck.gain, volume: deck.audio.volume, starting: deck.starting, starts: deck.starts, loads: deck.loads })) };
    }
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true; this.stopFrame(); this.fade = null;
        for (const cleanup of this.cleanups) cleanup();
        for (const deck of this.decks) {
            deck.epoch++; deck.audio.pause(); deck.audio.volume = 0; deck.gain = 0;
            try { deck.audio.removeAttribute('src'); deck.audio.load(); } catch { /* Disposed media is optional. */ }
        }
    }
}
