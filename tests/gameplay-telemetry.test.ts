import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { attachMultiplayer, type MultiplayerOptions } from '../server/multiplayer.ts';
import { Telemetry } from '../server/telemetry.ts';
import { CAMPAIGN_DOCUMENTS } from '../src/coop/authored-campaign.ts';
import { declarativeDefinition } from '../server/declarative-state.ts';
import type { SessionLevelId } from '../src/coop/protocol.ts';
import { avatar, cleanups, connect, directory } from './helpers/coop-server.ts';

async function fixture(options: MultiplayerOptions = {}, telemetry = new Telemetry({ sink: { write() {} } })) {
    const dir = await directory(), server = createServer((_request, response) => response.end('ready'));
    const identities: string[] = Array.from({ length: 16 }, () => randomUUID());
    const profiles = identities.map((_id, i) => ({ name: ['ShadowByte', 'ZeroDay'][i % 2], colour: i % 2 ? 'orange' as const : 'purple' as const }));
    const multiplayer = await attachMultiplayer(server, dir, { telemetry, loadProfile: async id => profiles[identities.indexOf(id)] ?? null, ...options });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    cleanups.push(async () => { multiplayer.shutdown(); await multiplayer.drained(); await new Promise<void>(resolve => server.close(() => resolve())); telemetry.close(); });
    const peer = (i: number) => connect<SessionLevelId>(url, `bn_visitor=${identities[i]}`);
    return { url, dir, identities, profiles, telemetry, multiplayer, peer, events: () => telemetry.snapshot().events };
}
async function party(f: Awaited<ReturnType<typeof fixture>>, first = 0, second = 1) {
    const a = await f.peer(first), b = await f.peer(second);
    a.send({ type: 'create-party' }); let room = (await a.wait('snapshot')).room;
    b.send({ type: 'join', code: room.code }); await b.wait('snapshot');
    const sequences = [0, 0];
    const act = async (slot: 1 | 2, action: object) => {
        const peer = slot === 1 ? a : b, seq = ++sequences[slot - 1];
        peer.send({ ...action, seq });
        const result = await peer.wait('action-result', result => result.seq === seq); room = result.room;
        return result;
    };
    const select = async (level: string) => {
        const result = await act(1, { type: 'select-level', level });
        await b.wait('room', value => value.room.levelInstance === result.room.levelInstance);
        return result.room;
    };
    return { a, b, act, select, room: () => room };
}

it('records accepted DEADLOCK puzzle story, deduplicates held sensors and snapshots, and completes only after two arrivals', async () => {
    const f = await fixture(), p = await party(f);
    await p.select('deadlock');
    expect((await p.act(2, { type: 'select-level', level: 'handshake' })).accepted).toBe(false);
    expect((await p.act(1, { type: 'exit' })).accepted).toBe(false);
    await p.act(1, { type: 'draft-occupancy', devices: ['draft:feed'] });
    await p.act(1, { type: 'draft-occupancy', devices: ['draft:feed'] });
    await p.act(2, { type: 'draft-occupancy', devices: ['draft:safe'] });
    expect(f.events().filter(event => event.event === 'pressure_plate_activated')).toMatchObject([
        { player: 'ShadowByte', playerSlot: 1, chamber: 'deadlock', controlId: 'draft:feed', controlName: 'FEED' },
        { player: 'ZeroDay', playerSlot: 2, chamber: 'deadlock', controlId: 'draft:safe', controlName: 'SAFE' },
    ]);
    expect(f.events().find(event => event.event === 'lift_power_changed')).toMatchObject({ outputId: 'cargoLift', enabled: true });
    await p.act(1, { type: 'draft-occupancy', devices: [] });
    for (const [cube, receiver] of [['cubeA', 'payloadOne'], ['cubeB', 'payloadTwo'], ['cubeC', 'payloadThree']]) {
        const cubeId = `draft:${cube}` as const, action = { type: 'draft-cube-occupancy', cubeId, epoch: p.room().cubes[cubeId]!.epoch, devices: [`draft:${receiver}`] };
        expect((await p.act(1, action)).accepted).toBe(true);
        expect((await p.act(1, action)).accepted).toBe(true);
    }
    expect(f.events().filter(event => event.event === 'payload_docked')).toHaveLength(3);
    expect(f.events().find(event => event.event === 'payload_docked')).toMatchObject({ cubeId: 'draft:cubeA', cubeName: 'Cube A', receiverId: 'draft:payloadOne', receiverName: 'PAYLOAD 1', player: 'ShadowByte', source: 'accepted_controller_input' });
    expect(f.events().filter(event => event.event === 'exit_unlocked')).toHaveLength(1);
    expect((await p.act(1, { type: 'exit' })).room.completed).toBe(false);
    expect(f.events().some(event => event.event === 'chamber_completed')).toBe(false);
    expect((await p.act(2, { type: 'exit' })).room.completed).toBe(true);
    expect(f.events().filter(event => event.event === 'player_reached_exit')).toHaveLength(2);
    expect(f.events().filter(event => event.event === 'chamber_completed')).toHaveLength(1);
    expect(f.telemetry.snapshot().metrics.completedChambers).toBe(1);
    const reconnect = await f.peer(0); reconnect.send({ type: 'join', code: p.room().code }); await reconnect.wait('snapshot');
    expect(f.events().filter(event => event.event === 'chamber_completed')).toHaveLength(1);
    expect(f.events().filter(event => event.event === 'player_joined_party')).toHaveLength(2);
    expect(f.events().filter(event => event.event === 'player_reconnected')).toHaveLength(1);
    expect(f.telemetry.snapshot().sessions[0]).toMatchObject({ status: 'completed', players: [{ name: 'ShadowByte', slot: 1, colour: 'purple' }, { name: 'ZeroDay', slot: 2, colour: 'orange' }] });
});

it('distinguishes concurrent parties and duplicate names, updates profiles and disconnect gauges, and excludes secret identifiers', async () => {
    const logs: string[] = [], telemetry = new Telemetry({ sink: { write(line) { logs.push(line); } } }), f = await fixture({}, telemetry);
    const one = await party(f), two = await party(f, 2, 3);
    await one.select('handshake'); await two.select('deadlock');
    const snapshot = telemetry.snapshot();
    expect(snapshot.metrics).toMatchObject({ connectedPlayers: 4, activeParties: 2, activeChambers: 2 });
    expect(new Set(snapshot.sessions.map(session => session.sessionRef)).size).toBe(2);
    expect(new Set(snapshot.sessions.flatMap(session => session.players.map(player => player.visitorRef))).size).toBe(4);
    f.profiles[0] = { name: 'NewName', colour: 'orange' }; await f.multiplayer.profileUpdated(f.identities[0], f.profiles[0]);
    expect(telemetry.snapshot().sessions.find(session => session.chamber === 'handshake')!.players[0].name).toBe('NewName');
    await one.a.close(); await f.multiplayer.drained();
    expect(telemetry.snapshot().metrics.connectedPlayers).toBe(3);
    await one.b.close(); await f.multiplayer.drained();
    expect(telemetry.snapshot().metrics).toMatchObject({ connectedPlayers: 2, activeParties: 1 });
    await new Promise(resolve => setImmediate(resolve));
    expect(logs.length).toBeGreaterThan(4);
    for (const line of logs) { const event = JSON.parse(line); expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp); expect(event.event).toMatch(/^[a-z_]+$/); }
    const all = JSON.stringify({ snapshot: telemetry.snapshot(), logs });
    for (const secret of [...f.identities, one.room().code, two.room().code]) expect(all).not.toContain(secret);
});

it('does not log avatar/cube streams or repeated pickup/receiver claims; rejects cannot invent accepted actions', async () => {
    const f = await fixture(), p = await party(f); await p.select('deadlock');
    const before = f.events().length, epoch = p.room().cubes['draft:cubeA'].epoch;
    for (let i = 0; i < 15; i++) {
        p.a.send({ type: 'avatar', seq: i, avatar });
        p.a.send({ type: 'cube', cubeId: 'draft:cubeA', epoch, seq: i, transform: { x: i, y: 10, vx: 0, vy: 0, grounded: true } });
    }
    p.a.send({ type: 'ping' }); await p.a.wait('pong');
    expect(f.events()).toHaveLength(before);
    const rejectedBefore = f.telemetry.snapshot().metrics.failedActions;
    expect((await p.act(2, { type: 'draft-cube-occupancy', cubeId: 'draft:cubeA', epoch, devices: ['draft:payloadOne'] })).accepted).toBe(false);
    expect(f.events().filter(event => event.event === 'payload_docked')).toHaveLength(0);
    expect((await p.act(1, { type: 'cube-pickup', cubeId: 'draft:cubeA', epoch })).accepted).toBe(true);
    const heldEpoch = p.room().cubes['draft:cubeA'].epoch;
    expect((await p.act(1, { type: 'cube-pickup', cubeId: 'draft:cubeA', epoch: heldEpoch })).accepted).toBe(false);
    expect(f.events().filter(event => event.event === 'cube_picked_up')).toHaveLength(1);
    expect((await p.act(1, { type: 'cube-drop', cubeId: 'draft:cubeA', epoch: heldEpoch, transform: { x: 10, y: 10, vx: 0, vy: 0, grounded: false } })).accepted).toBe(true);
    const droppedEpoch = p.room().cubes['draft:cubeA'].epoch;
    await p.act(1, { type: 'draft-cube-occupancy', cubeId: 'draft:cubeA', epoch: droppedEpoch, devices: ['draft:payloadOne'] });
    await p.act(1, { type: 'draft-cube-occupancy', cubeId: 'draft:cubeA', epoch: droppedEpoch, devices: [] });
    expect(f.events().filter(event => event.event === 'payload_removed')).toHaveLength(1);
    await p.act(1, { type: 'cube-reset', cubeId: 'draft:cubeA', epoch: droppedEpoch, cause: 'recovery' });
    await p.act(2, { type: 'local-reset' });
    expect(f.events().filter(event => event.event === 'cube_reset')).toMatchObject([{ reason: 'recovery', source: 'accepted_client_reset' }]);
    expect(f.events().filter(event => event.event === 'player_reset')).toMatchObject([{ player: 'ZeroDay', reason: 'local_reset' }]);
    expect(f.events().some(event => event.event.includes('death'))).toBe(false);
    for (let i = 0; i < 12; i++) await p.act(2, { type: 'exit' });
    expect(f.events().filter(event => event.event === 'room_operation_rejected')).toHaveLength(1);
    expect(f.telemetry.snapshot().metrics.failedActions - rejectedBefore).toBe(14);
    expect(f.telemetry.snapshot().metrics.suppressedWarnings).toBeGreaterThan(0);
});

it('observes real server timers once with no fabricated player attribution or countdown logs', async () => {
    const f = await fixture(), p = await party(f); await p.select('race-condition');
    await p.act(1, { type: 'occupancy', plate: 'return' });
    const released = (await p.act(1, { type: 'occupancy', plate: null })).room.revision;
    await p.a.wait('room', message => message.room.level === 'race-condition' && message.room.revision > released && message.room.levelState.physical.returnBridge === false);
    const falling = f.events().filter(event => event.event === 'controller_output_changed' && event.outputId === 'physical:returnBridge' && event.enabled === false);
    expect(falling).toHaveLength(1); expect(falling[0]).toMatchObject({ source: 'server_timer', chamber: 'race-condition' });
    expect(falling[0].player).toBeUndefined(); expect(falling[0].playerSlot).toBeUndefined();
    await p.act(1, { type: 'cube-contact', cubeId: 'cubeA', epoch: p.room().cubes.cubeA!.epoch, sensor: 'buffer' });
    await p.a.wait('room', message => message.room.level === 'race-condition' && message.room.levelState.buffer.phase === 'expired');
    expect(f.events().filter(event => event.event === 'buffer_phase_changed')).toMatchObject([{ phase: 'window', source: 'accepted_action' }, { phase: 'expired', source: 'server_timer' }]);
});

it('publishes no puzzle success after failed persistence and remains playable when the observer itself fails', async () => {
    const f = await fixture(), p = await party(f); await p.select('handshake');
    await rename(join(f.dir, 'rooms'), join(f.dir, 'old-rooms')); await writeFile(join(f.dir, 'rooms'), 'unavailable');
    p.a.send({ type: 'control', control: 'draft:maintenance', seq: 100 }); await p.a.wait('error', event => event.code === 'ROOM_UNAVAILABLE');
    await f.multiplayer.drained();
    expect(f.events().some(event => event.event === 'room_persistence_failed')).toBe(true);
    expect(f.events().some(event => event.event === 'control_activated' || event.event === 'control_toggled')).toBe(false);
    expect(f.telemetry.snapshot().metrics.connectedPlayers).toBe(0);
    const broken = new Telemetry({ sink: { write() {} } });
    broken.emit = () => { throw new Error('observer unavailable'); };
    broken.upsertSession = () => { throw new Error('observer unavailable'); };
    broken.observeAction = () => { throw new Error('observer unavailable'); };
    const healthy = await fixture({}, broken), q = await party(healthy); await q.select('handshake');
    expect((await q.act(1, { type: 'control', control: 'draft:maintenance' })).accepted).toBe(true);
    expect((await q.act(1, { type: 'draft-cube-occupancy', cubeId: 'draft:payload', epoch: q.room().cubes['draft:payload'].epoch, devices: ['draft:exitSocket'] })).room.exitUnlocked).toBe(true);
});

it('observes public/local frozen custom sessions using their accepted controller inputs without inferring binary evidence', async () => {
    const hash = 'a'.repeat(64), frozen = { metadata: { hash, controller: { id: 'declarative', version: 1 } }, level: 'workbench' as const, definition: declarativeDefinition(CAMPAIGN_DOCUMENTS.deadlock) };
    const f = await fixture({ drafts: { get: requested => requested === hash ? frozen : undefined, temporary: true } });
    const a = await f.peer(0), b = await f.peer(1);
    a.send({ type: 'create-draft', hash }); let room = (await a.wait('snapshot')).room;
    b.send({ type: 'join', code: room.code }); await b.wait('snapshot');
    a.send({ type: 'draft-cube-occupancy', cubeId: 'draft:cubeA', epoch: room.cubes['draft:cubeA'].epoch, devices: ['draft:payloadOne'], seq: 1 });
    room = (await a.wait('action-result')).room;
    expect(room.level).toBe('workbench');
    expect(f.events().find(event => event.event === 'cube_placed')).toMatchObject({ chamber: 'workbench', player: 'ShadowByte', cubeId: 'draft:cubeA', receiverId: 'draft:payloadOne', source: 'accepted_controller_input' });
    expect(f.telemetry.snapshot().metrics).toMatchObject({ connectedPlayers: 2, activeParties: 1 });
});


it('keeps sixteen simultaneous visitors in eight distinct parties responsive without recording their transform streams', async () => {
    const f = await fixture();
    const parties = await Promise.all(Array.from({ length: 8 }, (_value, i) => party(f, i * 2, i * 2 + 1)));
    await Promise.all(parties.map(party => party.select('deadlock')));
    const initial = f.telemetry.snapshot();
    expect(initial.metrics).toMatchObject({ connectedPlayers: 16, activeParties: 8, activeChambers: 8 });
    expect(new Set(initial.sessions.map(session => session.sessionRef)).size).toBe(8);
    expect(initial.sessions.every(session => session.players.length === 2)).toBe(true);
    const streamStart = performance.now();
    for (const party of parties) for (let seq = 0; seq < 20; seq++) {
        party.a.send({ type: 'avatar', seq, avatar: { ...avatar, x: seq } });
        party.b.send({ type: 'avatar', seq, avatar: { ...avatar, x: seq + 100 } });
        party.a.send({ type: 'cube', seq, cubeId: 'draft:cubeA', epoch: party.room().cubes['draft:cubeA'].epoch,
            transform: { x: seq, y: 100, vx: 0, vy: 0, grounded: true } });
    }
    await Promise.all(parties.flatMap(party => [party.a, party.b]).map(async peer => { peer.send({ type: 'ping' }); await peer.wait('pong'); }));
    expect(performance.now() - streamStart).toBeLessThan(3000);
    expect(f.events()).toHaveLength(initial.events.length);
    expect(f.telemetry.snapshot().metrics.acceptedActions).toBe(initial.metrics.acceptedActions);
    // Real semantic actions remain responsive after 480 disposable transform packets.
    await Promise.all(parties.map(party => party.act(1, { type: 'draft-occupancy', devices: ['draft:feed'] })));
    const heldEvents = f.events().length;
    await Promise.all(parties.map(party => party.act(1, { type: 'draft-occupancy', devices: ['draft:feed'] })));
    expect(f.events()).toHaveLength(heldEvents);
    expect(f.events().filter(event => event.event === 'pressure_plate_activated')).toHaveLength(8);
    expect(f.telemetry.snapshot().metrics).toMatchObject({ connectedPlayers: 16, activeParties: 8, failedActions: 0 });
});
