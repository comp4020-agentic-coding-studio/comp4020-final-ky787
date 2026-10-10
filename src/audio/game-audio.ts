/** Named cues, bounded voices and quiet loops adapted from Crit 5's audio manager.
 * Web Audio buffers give short rope/plate cues low latency. No gameplay depends on audio.
 */
export const SOUNDS = {
    hookFire: { file: 'grapple-fire.ogg', gain: .38, cooldown: .075 },
    hookAttach: { file: 'grapple-attach.ogg', gain: .55, cooldown: .07 },
    ropeJump: { file: 'grapple-fire.ogg', gain: .32, cooldown: .12, rate: 1.3 },
    jump: { file: 'grapple-fire.ogg', gain: .16, cooldown: .12, rate: 1.5 },
    landing: { file: 'landing.ogg', gain: .40, cooldown: .12 },
    crumbleWarn: { file: 'crumble-start.ogg', gain: .55, cooldown: .25 },
    crumbleBreak: { file: 'crumble-break.ogg', gain: .48, cooldown: .2 },
    death: { file: 'crumble-break.ogg', gain: .42, cooldown: .4, rate: .72 },
    firewallZap: { file: 'firewall-open.ogg', gain: .42, cooldown: .18, rate: 1.3 },
    plate: { file: 'metal-touch.ogg', gain: .65, cooldown: .1 },
    pickup: { file: 'metal-touch.ogg', gain: .45, cooldown: .12, rate: 1.2 },
    drop: { file: 'metal-touch.ogg', gain: .55, cooldown: .12, rate: .85 },
    switch: { file: 'confirm.ogg', gain: .32, cooldown: .12, rate: 1.15 },
    codePower: { file: 'firewall-open.ogg', gain: .32, cooldown: .2 },
    relayPower: { file: 'relay-on.ogg', gain: .60, cooldown: .25 },
    teleport: { file: 'teleport.ogg', gain: .65, cooldown: .2 },
    liftPower: { file: 'lift-on.ogg', gain: .55, cooldown: .25 },
    latch: { file: 'confirm.ogg', gain: .45, cooldown: .25, rate: .9 },
    door: { file: 'door-open.ogg', gain: .55, cooldown: .25 },
    complete: { file: 'confirm.ogg', gain: .5, cooldown: .4 },
    reel: { file: 'grapple-reel.ogg', gain: .085, cooldown: 0, loop: true },
    liftHum: { file: 'lift-hum.ogg', gain: .22, cooldown: 0, loop: true },
} as const;
export type SoundCue = keyof typeof SOUNDS;
export interface AudioPreferences { volume: number; muted: boolean }
export const AUDIO_STORAGE_KEY = 'binary-ninja/c8-audio/v1';
const DEFAULTS: AudioPreferences = { volume: .65, muted: false };
const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
interface Voice { cue: SoundCue; source: AudioBufferSourceNode; gain: GainNode; loop: boolean }
interface Options {
    context?: () => AudioContext;
    fetch?: typeof fetch;
    storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
}
function storage(): Storage | null { try { return globalThis.localStorage ?? null; } catch { return null; } }

export class GameAudio {
    private context: AudioContext | null = null;
    private master: GainNode | null = null;
    private analyser: AnalyserNode | null = null;
    private samples = new Float32Array(256);
    private buffers = new Map<string, AudioBuffer>();
    private voices = new Set<Voice>();
    private loops = new Map<SoundCue, Voice>();
    private cooldown = new Map<SoundCue, number>();
    private preferences: AudioPreferences = { ...DEFAULTS };
    private store: Options['storage'];
    private active = false;
    private loading: Promise<void> | null = null;
    private failures: string[] = [];
    private played: Partial<Record<SoundCue, number>> = {};
    private peak = 0;
    constructor(private options: Options = {}) {
        this.store = options.storage === undefined ? storage() : options.storage;
        try {
            const saved = JSON.parse(this.store?.getItem(AUDIO_STORAGE_KEY) ?? 'null');
            if (saved && typeof saved === 'object') this.preferences = {
                volume: typeof saved.volume === 'number' ? clamp(saved.volume) : DEFAULTS.volume,
                muted: typeof saved.muted === 'boolean' ? saved.muted : DEFAULTS.muted,
            };
        } catch { /* Private browsing or malformed preferences: use defaults. */ }
    }
    /** Call from a real pointer/key gesture. Never queue old effects for later playback. */
    async unlock(): Promise<void> {
        try {
            if (!this.context) {
                this.context = this.options.context ? this.options.context() : new AudioContext();
                this.master = this.context.createGain();
                const limiter = this.context.createDynamicsCompressor();
                limiter.threshold.value = -6; limiter.knee.value = 6; limiter.ratio.value = 8;
                this.analyser = this.context.createAnalyser(); this.analyser.fftSize = 256;
                this.master.connect(limiter); limiter.connect(this.analyser); this.analyser.connect(this.context.destination);
                this.applyVolume();
            }
            // Retry on subsequent gestures if the browser interrupted the context.
            if (this.context.state !== 'running') await this.context.resume();
            if (!this.loading) this.loading = this.load();
            await this.loading;
        } catch { if (!this.failures.includes('audio-context')) this.failures.push('audio-context'); }
    }
    private async load(): Promise<void> {
        await Promise.all([...new Set(Object.values(SOUNDS).map(s => s.file))].map(async file => {
            try {
                const response = await (this.options.fetch ?? fetch)(`${import.meta.env.BASE_URL}audio/${file}`);
                if (!response.ok) throw new Error('Audio unavailable');
                const buffer = await this.context!.decodeAudioData(await response.arrayBuffer());
                this.buffers.set(file, buffer);
            } catch { this.failures.push(file); }
        }));
    }
    getPreferences(): AudioPreferences { return { ...this.preferences }; }
    setPreferences(patch: Partial<AudioPreferences>): void {
        this.preferences = { volume: patch.volume === undefined ? this.preferences.volume : clamp(patch.volume),
            muted: patch.muted ?? this.preferences.muted };
        try { this.store?.setItem(AUDIO_STORAGE_KEY, JSON.stringify(this.preferences)); } catch { /* Optional browser preference. */ }
        if (this.preferences.muted || this.preferences.volume === 0) this.stopAll();
        this.applyVolume();
    }
    private applyVolume(): void {
        if (this.master && this.context) this.master.gain.setTargetAtTime(this.preferences.muted ? 0 : this.preferences.volume, this.context.currentTime, .02);
    }
    setActive(active: boolean): void {
        if (this.active === active) return;
        this.active = active;
        if (!active) this.stopAll();
    }
    private audible(): boolean {
        return this.context?.state === 'running' && !this.preferences.muted && this.preferences.volume > 0;
    }
    play(cue: SoundCue, level = 1, rate = 1): void {
        // Completion may ring after the final menu opens; ordinary cues are gameplay-only.
        if ((!this.active && cue !== 'complete') || !this.audible()) return;
        const spec = SOUNDS[cue], now = this.context!.currentTime;
        if (now < (this.cooldown.get(cue) ?? 0) || level <= 0) return;
        if (this.startVoice(cue, level, rate, false)) this.cooldown.set(cue, now + spec.cooldown);
    }
    setLoop(cue: 'reel' | 'liftHum', level: number): void {
        const target = this.active && this.audible() ? clamp(level) : 0;
        let voice = this.loops.get(cue);
        if (target < .01) { if (voice) this.stop(voice); return; }
        if (!voice) {
            voice = this.startVoice(cue, 0, 1, true);
            if (voice) this.loops.set(cue, voice);
        }
        if (voice) voice.gain.gain.setTargetAtTime(SOUNDS[cue].gain * target, this.context!.currentTime, .08);
    }
    private startVoice(cue: SoundCue, level: number, rate: number, loop: boolean): Voice | undefined {
        const buffer = this.buffers.get(SOUNDS[cue].file);
        if (!buffer || !this.context || !this.master) return;
        // Old manager's bounded pool policy: no loud stacks on repeated controls.
        if ([...this.voices].filter(v => v.cue === cue).length >= 2 || this.voices.size >= 12) return;
        const source = this.context.createBufferSource(), gain = this.context.createGain();
        source.buffer = buffer; source.loop = loop;
        const spec = SOUNDS[cue]; source.playbackRate.value = Math.max(.65, Math.min(1.6, rate * ('rate' in spec ? spec.rate : 1)));
        gain.gain.value = spec.gain * clamp(level);
        source.connect(gain); gain.connect(this.master);
        const voice = { cue, source, gain, loop }; this.voices.add(voice);
        source.onended = () => this.clean(voice);
        source.start(); this.played[cue] = (this.played[cue] ?? 0) + 1;
        return voice;
    }
    private clean(voice: Voice): void {
        this.voices.delete(voice);
        if (this.loops.get(voice.cue) === voice) this.loops.delete(voice.cue);
        voice.source.disconnect(); voice.gain.disconnect();
    }
    private stop(voice: Voice): void {
        voice.gain.gain.cancelScheduledValues(this.context!.currentTime);
        voice.gain.gain.setTargetAtTime(0, this.context!.currentTime, .012);
        try { voice.source.stop(this.context!.currentTime + .05); } catch { /* Already ended. */ }
        // Keep the fading voice connected until onended; stop tracking it now.
        this.voices.delete(voice);
        if (this.loops.get(voice.cue) === voice) this.loops.delete(voice.cue);
    }
    stopAll(): void { for (const voice of this.voices) this.stop(voice); this.cooldown.clear(); }
    meter(): void {
        if (!this.analyser) return;
        this.analyser.getFloatTimeDomainData(this.samples);
        for (const n of this.samples) this.peak = Math.max(this.peak, Math.abs(n));
    }
    snapshot() {
        return { state: this.context?.state ?? 'locked', active: this.active, loaded: this.buffers.size,
            failed: [...this.failures], voices: this.voices.size, loops: [...this.loops.keys()], played: { ...this.played },
            peak: this.peak, preferences: this.getPreferences() };
    }
}
