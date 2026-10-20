import { createHmac, randomBytes } from 'node:crypto';
import { isCharacterColour, type CharacterColour } from '../src/character/profile.ts';

export type TelemetryLevel = 'info' | 'warn' | 'error';
export type TelemetryValue = string | number | boolean;
export interface TelemetryContext {
    /** Raw identities are accepted only here and are never copied to public data. */
    visitor?: string;
    session?: string;
    chamber?: string;
    player?: string;
    playerSlot?: 1 | 2;
}
export interface TelemetryEvent {
    id: number;
    timestamp: string;
    level: TelemetryLevel;
    event: string;
    visitorRef?: string;
    sessionRef?: string;
    chamber?: string;
    player?: string;
    playerSlot?: 1 | 2;
    [key: string]: TelemetryValue | undefined;
}
export interface TelemetryPlayer {
    visitorRef?: string;
    name: string;
    colour?: CharacterColour;
    slot: 1 | 2;
    connected: boolean;
}
export interface TelemetrySession {
    sessionRef: string;
    chamber?: string;
    status: 'lobby' | 'playing' | 'completed';
    players: TelemetryPlayer[];
    progress: string[];
    updatedAt: string;
}
export interface TelemetrySessionInput {
    id: string;
    chamber?: string;
    status: TelemetrySession['status'];
    players: { visitor?: string; name: string; colour?: string; slot: 1 | 2; connected: boolean }[];
    progress?: string[];
}
export interface TelemetryActionTiming {
    accepted: boolean;
    queueMs: number;
    persistMs: number;
    totalMs: number;
    durable?: boolean;
}
export interface TelemetryLatency { count: number; average: number; p95: number }
export interface TelemetrySnapshot {
    timestamp: string;
    startedAt: string;
    uptimeSeconds: number;
    metrics: {
        connectedPlayers: number;
        activeParties: number;
        activeChambers: number;
        recentAcceptedActions: number;
        recentFailedActions: number;
        acceptedActions: number;
        failedActions: number;
        completedChambers: number;
        recentErrors: number;
        errors: number;
        droppedLogs: number;
        suppressedWarnings: number;
        suppressedEvents: number;
        actionLatencyMs: TelemetryLatency;
        persistenceLatencyMs: TelemetryLatency;
        queueLatencyMs: TelemetryLatency;
    };
    sessions: TelemetrySession[];
    /** Chronological, oldest first. Resets when the server process restarts. */
    events: TelemetryEvent[];
}
export interface TelemetrySink {
    write(line: string): boolean | void;
    once?(event: 'drain', listener: () => void): unknown;
    on?(event: 'error', listener: () => void): unknown;
    removeListener?(event: 'drain' | 'error', listener: () => void): unknown;
}
export interface TelemetryOptions {
    now?: () => number;
    sink?: TelemetrySink;
    /** Optional deterministic test salt. Production generates a new secret each boot. */
    salt?: string | Buffer;
}
type Subscriber = (snapshot: TelemetrySnapshot) => void;
interface MinuteBucket { second: number; accepted: number; failed: number; errors: number }
const HISTORY_LIMIT = 250, OUTPUT_LIMIT = 256, SESSION_LIMIT = 256, LATENCY_LIMIT = 128;
let stdoutGuardInstalled = false;
function protectStdout(): void {
    if (stdoutGuardInstalled) return;
    // A pipe error can arrive after shutdown removed this store's listeners.
    // One process-wide guard prevents that late logging error from crashing gameplay.
    process.stdout.on('error', () => {});
    stdoutGuardInstalled = true;
}
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const FIELD_NAMES = new Set([
    'cubeId', 'cubeName', 'receiverId', 'receiverName', 'controlId', 'controlName',
    'inputId', 'inputName', 'outputId', 'outputName', 'platformId', 'checkpointId',
    'enabled', 'active', 'on', 'reason', 'operation', 'code', 'queueMs', 'persistMs',
    'totalMs', 'durable', 'count', 'revision', 'colour', 'actor', 'source', 'elapsedMs',
    'previousValue', 'value', 'state', 'actorSlot', 'held', 'delivered', 'total',
    'phase', 'previousPhase', 'levelInstance', 'port', 'signal',
]);
function safeText(value: unknown, maximum = 96): string | undefined {
    if (typeof value !== 'string' || !value.length || value.length > maximum || UUID.test(value)) return undefined;
    // Deliberately excludes raw error messages, markup, headers, URLs and controls.
    return /^[A-Za-z0-9 _.:/\-]+$/.test(value) ? value : undefined;
}
function safeName(value: unknown): string | undefined {
    return typeof value === 'string' && /^[A-Za-z0-9 _-]{2,16}$/.test(value) ? value : undefined;
}
function finiteTime(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(value, 3_600_000)) : 0;
}
function latency(values: number[]): TelemetryLatency {
    if (!values.length) return { count: 0, average: 0, p95: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    return {
        count: values.length,
        average: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10,
        p95: Math.round(sorted[Math.ceil(sorted.length * .95) - 1] * 10) / 10,
    };
}

/** An observational, bounded store. No disk writes, awaits or subscribers on the gameplay queue. */
export class Telemetry {
    private readonly clock: () => number;
    private readonly sink: TelemetrySink;
    private readonly salt: string | Buffer;
    private readonly started: number;
    private readonly events: TelemetryEvent[] = [];
    private readonly sessions = new Map<string, TelemetrySession>();
    private readonly subscribers = new Set<Subscriber>();
    private readonly output: string[] = [];
    private readonly minute: MinuteBucket[] = [];
    private readonly actionTimes: number[] = [];
    private readonly persistenceTimes: number[] = [];
    private readonly queueTimes: number[] = [];
    private readonly warningKeys = new Map<string, number>();
    private nextId = 1;
    private accepted = 0;
    private failed = 0;
    private completions = 0;
    private errors = 0;
    private droppedLogs = 0;
    private suppressedWarnings = 0;
    private suppressedEvents = 0;
    private warningWindow = 0;
    private warningCount = 0;
    private eventWindow = 0;
    private eventCount = 0;
    private notifyTimer?: NodeJS.Timeout;
    private outputTask?: NodeJS.Immediate;
    private waitingDrain = false;
    private sinkBroken = false;
    private closed = false;
    private readonly drain = () => { this.waitingDrain = false; this.scheduleOutput(); };
    private readonly sinkError = () => {
        this.sinkBroken = true;
        this.droppedLogs += this.output.length + 1;
        this.output.length = 0;
        this.waitingDrain = false;
        try { this.sink.removeListener?.('drain', this.drain); } catch { /* Best effort. */ }
        this.notify();
    };

    constructor(options: TelemetryOptions = {}) {
        this.clock = options.now ?? Date.now;
        this.sink = options.sink ?? process.stdout;
        if (this.sink === process.stdout) protectStdout();
        this.salt = options.salt ?? randomBytes(32);
        this.started = this.now();
        try { this.sink.on?.('error', this.sinkError); } catch { /* Custom sinks may not support event handlers. */ }
    }
    private now(): number {
        try { const value = this.clock(); if (Number.isFinite(value) && value >= 0 && value <= 8.64e15) return value; } catch { /* Isolate injected clock failures. */ }
        return Date.now();
    }
    ref(kind: 'visitor' | 'session', raw: string): string {
        try {
            if (typeof raw !== 'string' || raw.length > 1024) return `${kind}-unavailable`;
            return `${kind}-${createHmac('sha256', this.salt).update(`${kind}\0${raw}`).digest('hex').slice(0, 12)}`;
        } catch { return `${kind}-unavailable`; }
    }
    private bucket(now: number): MinuteBucket {
        const second = Math.floor(now / 1000), index = second % 60;
        if (this.minute[index]?.second !== second) this.minute[index] = { second, accepted: 0, failed: 0, errors: 0 };
        return this.minute[index];
    }
    private notify(): void {
        if (this.closed || this.notifyTimer || !this.subscribers.size) return;
        this.notifyTimer = setTimeout(() => {
            this.notifyTimer = undefined;
            if (this.closed) return;
            for (const listener of this.subscribers) {
                // Each subscriber gets a private copy and cannot corrupt later readers.
                try { listener(this.snapshot()); } catch { /* A broken dashboard never breaks gameplay. */ }
            }
        }, 100);
        this.notifyTimer.unref();
    }
    private scheduleOutput(): void {
        if (this.sinkBroken || this.outputTask || this.waitingDrain || !this.output.length) return;
        this.outputTask = setImmediate(() => { this.outputTask = undefined; this.flushOutput(); });
    }
    private flushOutput(): void {
        for (let count = 0; count < 32 && this.output.length; count++) {
            const line = this.output.shift()!;
            try {
                if (this.sink.write(line) === false) {
                    if (this.sink.once && !this.closed) {
                        this.waitingDrain = true;
                        this.sink.once('drain', this.drain);
                    } else {
                        this.droppedLogs += this.output.length;
                        this.output.length = 0;
                    }
                    return;
                }
            } catch { this.waitingDrain = false; this.droppedLogs++; }
        }
        this.scheduleOutput();
        if (this.closed && !this.output.length) this.detachSink();
    }
    emit(event: string, context: TelemetryContext = {}, fields: Record<string, unknown> = {}, level: TelemetryLevel = 'info'): void {
        try {
            if (this.closed || !/^[a-z][a-z0-9_]{0,63}$/.test(event) || !['info', 'warn', 'error'].includes(level)) return;
            const now = this.now();
            if (level === 'error') { this.errors++; this.bucket(now).errors++; }
            if (event === 'chamber_completed') this.completions++;
            const window = Math.floor(now / 1000);
            if (window !== this.eventWindow) { this.eventWindow = window; this.eventCount = 0; }
            if (++this.eventCount > 250) { this.suppressedEvents++; this.notify(); return; }
            const visitorRef = context.visitor ? this.ref('visitor', context.visitor) : undefined;
            const sessionRef = context.session ? this.ref('session', context.session) : undefined;
            if (level !== 'info') {
                const warningWindow = Math.floor(now / 10_000);
                if (warningWindow !== this.warningWindow) { this.warningWindow = warningWindow; this.warningCount = 0; }
                const key = `${event}:${sessionRef ?? ''}:${visitorRef ?? ''}`;
                const last = this.warningKeys.get(key);
                if (this.warningCount >= 12 || last !== undefined && now - last < 10_000) {
                    this.suppressedWarnings++; this.notify(); return;
                }
                this.warningCount++;
                this.warningKeys.delete(key);
                this.warningKeys.set(key, now);
                if (this.warningKeys.size > 64) this.warningKeys.delete(this.warningKeys.keys().next().value!);
            }
            const entry: TelemetryEvent = { id: this.nextId++, timestamp: new Date(now).toISOString(), level, event };
            if (visitorRef) entry.visitorRef = visitorRef;
            if (sessionRef) entry.sessionRef = sessionRef;
            const chamber = safeText(context.chamber), player = safeName(context.player);
            if (chamber) entry.chamber = chamber;
            if (player) entry.player = player;
            if (context.playerSlot === 1 || context.playerSlot === 2) entry.playerSlot = context.playerSlot;
            for (const key of FIELD_NAMES) {
                if (!Object.hasOwn(fields, key)) continue;
                const value = fields[key];
                if (typeof value === 'boolean') entry[key] = value;
                else if (typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER) entry[key] = value;
                else if (typeof value === 'string') {
                    const text = safeText(value);
                    if (text !== undefined) entry[key] = text;
                }
            }
            this.events.push(entry);
            if (this.events.length > HISTORY_LIMIT) this.events.shift();
            if (!this.sinkBroken && this.output.length < OUTPUT_LIMIT) { this.output.push(`${JSON.stringify(entry)}\n`); this.scheduleOutput(); }
            else this.droppedLogs++;
            this.notify();
        } catch { /* Telemetry must never change the outcome of an accepted action. */ }
    }
    observeAction(timing: TelemetryActionTiming): void {
        try {
            if (this.closed) return;
            const now = this.now();
            if (timing.accepted) { this.accepted++; this.bucket(now).accepted++; }
            else { this.failed++; this.bucket(now).failed++; }
            this.actionTimes.push(finiteTime(timing.totalMs));
            this.queueTimes.push(finiteTime(timing.queueMs));
            if (this.actionTimes.length > LATENCY_LIMIT) this.actionTimes.shift();
            if (this.queueTimes.length > LATENCY_LIMIT) this.queueTimes.shift();
            if (timing.durable) {
                this.persistenceTimes.push(finiteTime(timing.persistMs));
                if (this.persistenceTimes.length > LATENCY_LIMIT) this.persistenceTimes.shift();
            }
            // Significant delays only, with the same bounded warning budget as rejections.
            if (timing.queueMs >= 250) this.emit('multiplayer_queue_slow', {}, { queueMs: finiteTime(timing.queueMs) }, 'warn');
            if (timing.persistMs >= 250) this.emit('persistence_slow', {}, { persistMs: finiteTime(timing.persistMs) }, 'warn');
            this.notify();
        } catch { /* No measurement failure may interrupt the semantic queue. */ }
    }
    upsertSession(input: TelemetrySessionInput): void {
        try {
            if (this.closed || typeof input.id !== 'string' || !['lobby', 'playing', 'completed'].includes(input.status)) return;
            const sessionRef = this.ref('session', input.id);
            const players: TelemetryPlayer[] = [];
            for (const player of input.players.slice(0, 2)) {
                if (player.slot !== 1 && player.slot !== 2 || players.some(value => value.slot === player.slot)) continue;
                const publicPlayer: TelemetryPlayer = { name: safeName(player.name) ?? 'Ninja', slot: player.slot, connected: player.connected === true };
                if (player.visitor) publicPlayer.visitorRef = this.ref('visitor', player.visitor);
                if (isCharacterColour(player.colour)) publicPlayer.colour = player.colour;
                players.push(publicPlayer);
            }
            const summary: TelemetrySession = {
                sessionRef, status: input.status, players,
                progress: (input.progress ?? []).slice(0, 8).map(value => safeText(value)).filter((value): value is string => value !== undefined),
                updatedAt: new Date(this.now()).toISOString(),
            };
            const chamber = safeText(input.chamber);
            if (chamber) summary.chamber = chamber;
            this.sessions.delete(sessionRef);
            this.sessions.set(sessionRef, summary);
            if (this.sessions.size > SESSION_LIMIT) this.sessions.delete(this.sessions.keys().next().value!);
            this.notify();
        } catch { /* Summary data never owns room state. */ }
    }
    removeSession(raw: string): void {
        try { this.sessions.delete(this.ref('session', raw)); this.notify(); } catch { /* Observation only. */ }
    }
    snapshot(): TelemetrySnapshot {
        const now = this.now(), second = Math.floor(now / 1000);
        const recent = this.minute.filter(bucket => bucket && bucket.second > second - 60 && bucket.second <= second);
        const sessions = [...this.sessions.values()].map(session => ({ ...session, players: session.players.map(player => ({ ...player })), progress: [...session.progress] }));
        const active = sessions.filter(session => session.players.some(player => player.connected));
        return {
            timestamp: new Date(now).toISOString(), startedAt: new Date(this.started).toISOString(), uptimeSeconds: Math.floor(Math.max(0, now - this.started) / 1000),
            metrics: {
                connectedPlayers: active.reduce((total, session) => total + session.players.filter(player => player.connected).length, 0),
                activeParties: active.length,
                activeChambers: active.filter(session => session.status === 'playing').length,
                recentAcceptedActions: recent.reduce((total, bucket) => total + bucket.accepted, 0),
                recentFailedActions: recent.reduce((total, bucket) => total + bucket.failed, 0),
                acceptedActions: this.accepted, failedActions: this.failed, completedChambers: this.completions,
                recentErrors: recent.reduce((total, bucket) => total + bucket.errors, 0), errors: this.errors,
                droppedLogs: this.droppedLogs, suppressedWarnings: this.suppressedWarnings, suppressedEvents: this.suppressedEvents,
                actionLatencyMs: latency(this.actionTimes), persistenceLatencyMs: latency(this.persistenceTimes), queueLatencyMs: latency(this.queueTimes),
            },
            sessions, events: this.events.map(event => ({ ...event })),
        };
    }
    subscribe(listener: Subscriber): () => void {
        if (this.closed || this.subscribers.size >= 16) return () => {};
        this.subscribers.add(listener);
        return () => { this.subscribers.delete(listener); };
    }
    private detachSink(): void {
        try { this.sink.removeListener?.('error', this.sinkError); } catch { /* Best effort. */ }
    }
    close(): void {
        this.closed = true;
        if (this.notifyTimer) clearTimeout(this.notifyTimer);
        this.subscribers.clear();
        // Already queued output drains asynchronously. A blocked sink cannot retain us at shutdown.
        if (this.waitingDrain) {
            try { this.sink.removeListener?.('drain', this.drain); } catch { /* Best effort. */ }
            this.waitingDrain = false;
            this.droppedLogs += this.output.length;
            this.output.length = 0;
        }
        if (!this.output.length) this.detachSink();
    }
}
