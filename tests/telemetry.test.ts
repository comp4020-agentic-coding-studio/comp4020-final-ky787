import { EventEmitter } from 'node:events';
import { afterEach, expect, it } from 'vitest';
import { Telemetry, type TelemetrySink, type TelemetrySnapshot } from '../server/telemetry.ts';

const visitor = '12345678-1234-4123-8123-123456789abc';
const stores: Telemetry[] = [];
afterEach(() => { for (const store of stores.splice(0)) store.close(); });
function fixture(sink?: TelemetrySink) {
    let now = Date.parse('2026-10-20T17:30:00.000Z');
    const lines: string[] = [];
    const telemetry = new Telemetry({ now: () => now, salt: 'private-test-salt', sink: sink ?? { write: line => { lines.push(line); } } });
    stores.push(telemetry);
    return { telemetry, lines, advance: (ms: number) => { now += ms; } };
}
async function flush() { for (let i = 0; i < 12; i++) await new Promise<void>(resolve => setImmediate(resolve)); }

it('writes newline-delimited JSON with accurate time, cosmetic identity and stable boot-local pseudonyms', async () => {
    const { telemetry, lines, advance } = fixture();
    telemetry.emit('cube_docked', { visitor, session: '7K3M', chamber: 'deadlock', player: 'ShadowByte', playerSlot: 1 }, { cubeId: 'draft:cubeA', receiverId: 'draft:payloadOne' });
    advance(1234);
    telemetry.emit('player_reached_exit', { visitor, session: '7K3M', chamber: 'deadlock', player: 'ShadowByte', playerSlot: 1 });
    expect(lines).toEqual([]); // Stdout does not run inside the semantic action.
    await flush();
    expect(lines).toHaveLength(2);
    expect(lines.every(line => line.endsWith('\n') && line.trim().split('\n').length === 1)).toBe(true);
    const event = JSON.parse(lines[0]);
    expect(event).toEqual({ id: 1, timestamp: '2026-10-20T17:30:00.000Z', level: 'info', event: 'cube_docked', visitorRef: telemetry.ref('visitor', visitor), sessionRef: telemetry.ref('session', '7K3M'), chamber: 'deadlock', player: 'ShadowByte', playerSlot: 1, cubeId: 'draft:cubeA', receiverId: 'draft:payloadOne' });
    expect(JSON.parse(lines[1])).toMatchObject({ timestamp: '2026-10-20T17:30:01.234Z', visitorRef: event.visitorRef, sessionRef: event.sessionRef });
    expect(lines.join('')).not.toContain(visitor);
    expect(lines.join('')).not.toContain('7K3M');
    expect(telemetry.ref('visitor', visitor)).not.toBe(telemetry.ref('session', visitor));
    const differentBoot = new Telemetry({ sink: { write() {} }, salt: 'different-salt' });
    stores.push(differentBoot);
    expect(differentBoot.ref('visitor', visitor)).not.toBe(event.visitorRef);
});

it('retains only bounded approved scalar metadata and rejects sensitive or malformed fields', () => {
    const { telemetry } = fixture();
    telemetry.emit('control_activated', {
        visitor, session: 'PRIVATE_CODE', chamber: '<script>steal()</script>', player: '<script>', playerSlot: 3,
        cookie: 'bn_visitor=secret', authorization: 'Bearer secret',
    } as never, {
        cookie: 'bn_visitor=secret', authorization: 'Bearer secret', body: { secret: true }, ip: '127.0.0.1', raw: 'message',
        cubeId: visitor, receiverId: 'x'.repeat(1000), reason: 'bad\nline', value: Infinity,
        controlName: 'SAFE', enabled: true, actorSlot: 2, count: 3, source: 'server',
        event: 'forged', timestamp: 'forged', visitorRef: visitor, sessionRef: 'PRIVATE_CODE',
    });
    expect(telemetry.snapshot().events[0]).toEqual({ id: 1, timestamp: '2026-10-20T17:30:00.000Z', level: 'info', event: 'control_activated', visitorRef: telemetry.ref('visitor', visitor), sessionRef: telemetry.ref('session', 'PRIVATE_CODE'), controlName: 'SAFE', enabled: true, actorSlot: 2, count: 3, source: 'server' });
    telemetry.emit('invalid\nmessage');
    telemetry.emit('fine', {}, {}, 'debug' as never);
    expect(telemetry.snapshot().events).toHaveLength(1);
    expect(() => telemetry.emit('control_activated', { get visitor(): string { throw new Error('bad getter'); } })).not.toThrow();
});

it('keeps history bounded independently of stdout and expires recent rather than cumulative counters', async () => {
    const { telemetry, advance, lines } = fixture();
    for (let i = 0; i < 400; i++) {
        advance(10);
        telemetry.emit('control_toggled', {}, { active: i % 2 === 0 });
        telemetry.observeAction({ accepted: i % 4 !== 0, queueMs: 1, persistMs: 2, totalMs: 4, durable: true });
    }
    telemetry.emit('chamber_completed');
    telemetry.emit('persistence_failed', {}, { operation: 'save' }, 'error');
    const snapshot = telemetry.snapshot();
    expect(snapshot.events).toHaveLength(250);
    expect(snapshot.events[0].id).toBe(153);
    expect(snapshot.metrics).toMatchObject({ acceptedActions: 300, failedActions: 100, recentAcceptedActions: 300, recentFailedActions: 100, completedChambers: 1, recentErrors: 1, errors: 1, droppedLogs: 146 });
    expect(snapshot.metrics.actionLatencyMs).toEqual({ count: 128, average: 4, p95: 4 });
    expect(snapshot.metrics.persistenceLatencyMs).toEqual({ count: 128, average: 2, p95: 2 });
    await flush();
    expect(lines).toHaveLength(256);
    advance(60_000);
    expect(telemetry.snapshot().metrics).toMatchObject({ recentAcceptedActions: 0, recentFailedActions: 0, recentErrors: 0, acceptedActions: 300, failedActions: 100, errors: 1, completedChambers: 1 });
});

it('bounds rejected-action warning floods even when every visitor and operation differs', () => {
    const { telemetry, advance } = fixture();
    for (let i = 0; i < 1000; i++) {
        telemetry.observeAction({ accepted: false, queueMs: 0, persistMs: 0, totalMs: .1 });
        telemetry.emit('room_operation_rejected', { visitor: `visitor-${i}`, session: `party-${i}` }, { code: 'NOT_HOST', operation: `op-${i}` }, 'warn');
    }
    expect(telemetry.snapshot().events).toHaveLength(12);
    expect(telemetry.snapshot().metrics).toMatchObject({ acceptedActions: 0, failedActions: 1000, suppressedWarnings: 238, suppressedEvents: 750 });
    advance(10_000);
    telemetry.emit('room_operation_rejected', { visitor: 'visitor-0' }, { code: 'NOT_HOST' }, 'warn');
    expect(telemetry.snapshot().events).toHaveLength(13);
});

it('deduplicates repetitive warnings and bounds malicious streams of valid events without losing aggregate counters', () => {
    const { telemetry, advance } = fixture();
    for (let i = 0; i < 20; i++) telemetry.emit('room_operation_rejected', { visitor }, { code: 'BAD_OPERATION' }, 'warn');
    expect(telemetry.snapshot().events).toHaveLength(1);
    expect(telemetry.snapshot().metrics.suppressedWarnings).toBe(19);
    advance(10_000);
    for (let i = 0; i < 1000; i++) {
        telemetry.emit('control_toggled', { visitor }, { active: i % 2 === 0 });
        telemetry.observeAction({ accepted: true, queueMs: 0, persistMs: 0, totalMs: 1 });
    }
    expect(telemetry.snapshot().metrics).toMatchObject({ acceptedActions: 1000, suppressedEvents: 750 });
    expect(telemetry.snapshot().events).toHaveLength(250);
});

it('keeps stdout bounded under backpressure, resumes on drain, and drops rather than blocks', async () => {
    class SlowSink extends EventEmitter {
        lines: string[] = [];
        blocked = true;
        write(line: string) { this.lines.push(line); return !this.blocked; }
    }
    const sink = new SlowSink(), { telemetry, advance } = fixture(sink);
    telemetry.emit('server_started');
    await flush();
    expect(sink.lines).toHaveLength(1);
    expect(sink.listenerCount('drain')).toBe(1);
    for (let i = 0; i < 400; i++) { advance(10); telemetry.emit('cube_dropped', {}, { cubeId: 'draft:cubeA' }); }
    await flush();
    expect(sink.lines).toHaveLength(1);
    expect(telemetry.snapshot().events).toHaveLength(250);
    expect(telemetry.snapshot().metrics.droppedLogs).toBe(144);
    sink.blocked = false; sink.emit('drain');
    await flush();
    expect(sink.lines).toHaveLength(257);
    expect(sink.listenerCount('drain')).toBe(0);
});

it('isolates throwing stdout sinks and subscribers from gameplay and from other dashboard clients', async () => {
    const { telemetry } = fixture({ write() { throw new Error('disk or pipe unavailable'); } });
    const received: TelemetrySnapshot[] = [];
    telemetry.subscribe(() => { throw new Error('dashboard unavailable'); });
    telemetry.subscribe(snapshot => { snapshot.events[0].event = 'tampered'; });
    telemetry.subscribe(snapshot => received.push(snapshot));
    expect(() => telemetry.emit('cube_picked_up', {}, { cubeId: 'draft:cubeA' })).not.toThrow();
    expect(received).toEqual([]);
    await flush();
    await new Promise(resolve => setTimeout(resolve, 125));
    expect(received).toHaveLength(1);
    expect(received[0].events[0].event).toBe('cube_picked_up');
    expect(telemetry.snapshot().events[0].event).toBe('cube_picked_up');
    expect(telemetry.snapshot().metrics.droppedLogs).toBe(1);
});

it('summarizes independent parties using pseudonyms, cosmetics, slots and current connection gauges', () => {
    const { telemetry } = fixture();
    const first = { id: 'PARTY_ONE', chamber: 'deadlock', status: 'playing' as const, players: [
        { visitor, name: 'SameName', colour: 'purple', slot: 1 as const, connected: true },
        { visitor: 'other-visitor', name: 'SameName', colour: 'orange', slot: 2 as const, connected: true },
    ], progress: ['PAYLOAD ONE accepted', 'Exit locked'] };
    const second = { id: 'PARTY_TWO', chamber: 'handshake', status: 'lobby' as const, players: [
        { visitor: 'third-visitor', name: 'SameName', colour: 'cyan', slot: 1 as const, connected: true },
    ] };
    telemetry.upsertSession(first); telemetry.upsertSession(second);
    for (let i = 0; i < 100; i++) telemetry.upsertSession(first);
    const snapshot = telemetry.snapshot();
    expect(snapshot.events).toEqual([]); // Snapshots never fabricate joins or interactions.
    expect(snapshot.metrics).toMatchObject({ connectedPlayers: 3, activeParties: 2, activeChambers: 1, completedChambers: 0 });
    expect(snapshot.sessions.map(value => value.sessionRef)).toEqual([telemetry.ref('session', 'PARTY_TWO'), telemetry.ref('session', 'PARTY_ONE')]);
    expect(snapshot.sessions[1].players[0]).toEqual({ visitorRef: telemetry.ref('visitor', visitor), name: 'SameName', colour: 'purple', slot: 1, connected: true });
    expect(JSON.stringify(snapshot)).not.toContain(visitor);
    expect(JSON.stringify(snapshot)).not.toContain('PARTY_ONE');
    telemetry.upsertSession({ ...first, players: first.players.map(value => ({ ...value, connected: false })) });
    expect(telemetry.snapshot().metrics).toMatchObject({ connectedPlayers: 1, activeParties: 1, activeChambers: 0 });
    telemetry.removeSession(second.id);
    expect(telemetry.snapshot().metrics.connectedPlayers).toBe(0);
});

it('bounds session summaries and safely copies all public snapshots', () => {
    const { telemetry } = fixture();
    for (let i = 0; i < 300; i++) telemetry.upsertSession({ id: `session-${i}`, status: 'lobby', players: [{ name: '<script>', colour: 'malicious', slot: 1, connected: true }], progress: Array.from({ length: 40 }, () => 'Safe progress') });
    const snapshot = telemetry.snapshot();
    expect(snapshot.sessions).toHaveLength(256);
    expect(snapshot.sessions[0].progress).toHaveLength(8);
    expect(snapshot.sessions[0].players[0]).toEqual({ name: 'Ninja', slot: 1, connected: true });
    snapshot.sessions[0].players[0].name = 'Mutated';
    snapshot.sessions[0].progress[0] = 'Mutated';
    expect(telemetry.snapshot().sessions[0].players[0].name).toBe('Ninja');
    expect(telemetry.snapshot().sessions[0].progress[0]).toBe('Safe progress');
});

it('samples processing and durable persistence latency without logging every successful timing', () => {
    const { telemetry, advance } = fixture();
    for (let i = 1; i <= 100; i++) telemetry.observeAction({ accepted: true, queueMs: i, persistMs: i * 2, totalMs: i * 3, durable: i % 2 === 0 });
    expect(telemetry.snapshot().events).toEqual([]);
    expect(telemetry.snapshot().metrics.actionLatencyMs).toEqual({ count: 100, average: 151.5, p95: 285 });
    expect(telemetry.snapshot().metrics.persistenceLatencyMs).toEqual({ count: 50, average: 102, p95: 192 });
    telemetry.observeAction({ accepted: true, queueMs: 300, persistMs: 500, totalMs: 800, durable: true });
    telemetry.observeAction({ accepted: false, queueMs: 600, persistMs: 600, totalMs: 1200, durable: false });
    expect(telemetry.snapshot().events.map(event => event.event)).toEqual(['multiplayer_queue_slow', 'persistence_slow']);
    expect(telemetry.snapshot().metrics.suppressedWarnings).toBe(2);
    advance(1234);
    expect(telemetry.snapshot().uptimeSeconds).toBe(1);
});

it('coalesces subscribers, permits unsubscription, and stops emitting after close', async () => {
    const { telemetry } = fixture();
    const received: TelemetrySnapshot[] = [];
    const unsubscribe = telemetry.subscribe(snapshot => received.push(snapshot));
    for (let i = 0; i < 20; i++) telemetry.emit('cube_dropped', {}, { cubeId: 'draft:cubeA' });
    await new Promise(resolve => setTimeout(resolve, 125));
    expect(received).toHaveLength(1);
    expect(received[0].events).toHaveLength(20);
    unsubscribe();
    telemetry.emit('cube_picked_up');
    await new Promise(resolve => setTimeout(resolve, 125));
    expect(received).toHaveLength(1);
    telemetry.close();
    const count = telemetry.snapshot().events.length;
    telemetry.emit('chamber_completed');
    telemetry.observeAction({ accepted: true, queueMs: 1, persistMs: 1, totalMs: 2 });
    expect(telemetry.snapshot().events).toHaveLength(count);
    expect(telemetry.snapshot().metrics.acceptedActions).toBe(0);
});


it('handles asynchronous stdout errors without interrupting the game or retaining queued writes', async () => {
    class BrokenSink extends EventEmitter { write() { return false; } }
    const sink = new BrokenSink(), { telemetry } = fixture(sink);
    telemetry.emit('server_started');
    await flush();
    telemetry.emit('cube_dropped');
    expect(() => sink.emit('error', new Error('EPIPE secret details'))).not.toThrow();
    telemetry.emit('chamber_completed');
    expect(telemetry.snapshot().events.map(event => event.event)).toEqual(['server_started', 'cube_dropped', 'chamber_completed']);
    expect(telemetry.snapshot().metrics).toMatchObject({ completedChambers: 1, droppedLogs: 3 });
    expect(sink.listenerCount('drain')).toBe(0);
    expect(JSON.stringify(telemetry.snapshot())).not.toContain('secret');
    telemetry.close();
    expect(sink.listenerCount('error')).toBe(0);
});
