import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { AUTHORED_CAMPAIGN_LEVELS, type AuthoredCampaignLevel } from '../src/coop/campaign.ts';
import { CAMPAIGN_DOCUMENTS } from '../src/coop/authored-campaign.ts';
import { COOP_LABS } from '../src/coop/labs.ts';
import { importDraft } from '../src/workbench/imports.ts';
import { requirePlayable } from '../src/workbench/validation.ts';
import { createCoopAuthority } from '../src/coop/lab-authority.ts';
import { CoopClient } from '../src/coop/client.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { newRecord, sharedRoom, readRoomRecord } from '../server/coop-state.ts';
import { directory, launch, kill, identity, connect } from './helpers/coop-server.ts';

it.each(AUTHORED_CAMPAIGN_LEVELS)('%s reuses validated JSON, both spawn/checkpoint markers and the declarative authority', level => {
    const document = requirePlayable(CAMPAIGN_DOCUMENTS[level]);
    expect(importDraft(level)).toEqual(document);
    for (const slot of [1, 2] as const) {
        const room = COOP_LABS[level].room(slot), spawn = document.geometry.objects.find(o => o.type === 'spawn' && o.slot === slot)!;
        expect(room.id).toBe(level); expect(room.spawn).toEqual({ x: spawn.x, y: spawn.y });
        const client = new CoopClient(() => {}, () => {}); client.slot = slot;
        client.room = sharedRoom(newRecord('ABCD', '11111111-1111-4111-8111-111111111111', level), [true, true], [null, null]);
        const authority = createCoopAuthority(client.room, client);
        const w = new PuzzleWorld(room, { checkpoint: 'entry', switchB: false, cubeOnPlate: false, cubeOnPlateB: false }, undefined, authority);
        expect(w.frame.outputs.exitDoor).toBe(false);
        expect(Object.keys(w.cubes)).toEqual(document.geometry.objects.filter(o => o.type === 'cube').map(o => `draft:${o.id}`));
    }
});

async function party() {
    const dir = await directory(), app = await launch(dir), host = await identity(app.url), guest = await identity(app.url);
    const a = await connect<AuthoredCampaignLevel>(app.url, host.cookie), b = await connect<AuthoredCampaignLevel>(app.url, guest.cookie);
    a.send({ type: 'create-party' }); const first = (await a.wait('snapshot')).room;
    expect(first.level).toBe('handshake'); expect(first.draft).toBeUndefined(); expect(first.party?.phase).toBe('lobby');
    b.send({ type: 'join', code: first.code }); await b.wait('snapshot');
    const seq = [0, 0];
    const act = async (slot: 1 | 2, value: object) => { const peer = slot === 1 ? a : b, n = ++seq[slot - 1]; peer.send({ ...value, seq: n }); return peer.wait('action-result', m => m.seq === n); };
    return { app, dir, host, guest, a, b, first, act };
}

it.each(AUTHORED_CAMPAIGN_LEVELS)('%s persists semantic controls/checkpoint and restores the same party without live body or crumble state', async level => {
    const f = await party(), started = (await f.act(1, { type: 'select-level', level })).room;
    const document = CAMPAIGN_DOCUMENTS[level], save = document.geometry.objects.find(o => o.type === 'device' && o.checkpoint)!;
    const r = (await f.act(1, { type: 'control', control: `draft:${save.id}` })).room;
    expect(r.checkpoint).toBe('reunion');
    expect((await f.act(2, { type: 'control', control: 'draft:notInThisChamber' })).accepted).toBe(false);
    const sensor = document.geometry.objects.find(o => o.type === 'device' && o.kind === 'plate')!;
    expect((await f.act(2, { type: 'draft-occupancy', devices: [`draft:${sensor.id}`] })).accepted).toBe(true);
    const socket = document.geometry.objects.find(o => o.type === 'device' && o.kind === 'socket');
    const cubeId = Object.keys(r.cubes)[0] as `draft:${string}` | undefined;
    if (socket && cubeId) expect((await f.act(1, { type: 'draft-cube-occupancy', cubeId, epoch: r.cubes[cubeId].epoch, devices: [`draft:${socket.id}`] })).accepted).toBe(true);
    await kill(f.app.child); const app = await launch(f.dir), guest = await connect<AuthoredCampaignLevel>(app.url, f.guest.cookie);
    guest.send({ type: 'join', code: r.code }); const back = await guest.wait('snapshot');
    expect(back.slot).toBe(2); expect(back.room).toMatchObject({ level, checkpoint: 'reunion', levelInstance: started.levelInstance, party: { phase: 'playing', completedLevels: [] } });
    expect(back.room.levelState.devices[`${save.id}.value`]).toBe(true);
    expect(back.room.levelState.devices[`${sensor.id}.occupied`]).toBe(false);
    expect(Object.values(back.room.cubes).every(c => !c.holder && !c.transform)).toBe(true);
    expect(Object.values(back.room.levelState.platforms).every(p => p.phase === 'stable')).toBe(true);
    // Resume constructs real slot markers and cube positions from saved semantics, never stored transforms.
    for (const slot of [1, 2] as const) {
        const client = new CoopClient(() => {}, () => {}); client.slot = slot; client.room = back.room; client.status = 'CONNECTED';
        const authority = createCoopAuthority(back.room, client), room = COOP_LABS[level].room(slot);
        const w = new PuzzleWorld(room, { checkpoint: authority.checkpoint, switchB: false, cubeOnPlate: false, cubeOnPlateB: false }, undefined, authority);
        expect({ x: w.player.x, y: w.player.y }).toEqual(room.checkpoint);
        if (socket && cubeId) {
            expect(back.room.cubePlacements[cubeId]).toBe(`draft:${socket.id}`);
            expect(back.room.levelState.devices[`${socket.id}.occupied`]).toBe(true);
            authority.cubes![cubeId]!.sync(w);
            expect(w.cubes[cubeId]).toMatchObject({ x: socket.x, y: socket.y - 22, carried: false });
        }
    }
    const disk = JSON.parse(await readFile(join(f.dir, 'rooms', r.code + '.json'), 'utf8'));
    expect(readRoomRecord(disk, r.code)).not.toBeNull();
    for (const key of ['draft', 'draftHeld', 'draftCubeContacts', 'crumble', 'cubes', 'transform']) expect(disk).not.toHaveProperty(key);
    expect(readRoomRecord({ ...disk, levelState: { devices: { injected: true } } }, r.code)).toBeNull();
});

it('campaign plate/cube arbitration, reversible machinery, two arrivals and generation resets use the shared declarative implementation', async () => {
    const f = await party(); let r = (await f.act(1, { type: 'select-level', level: 'handshake' })).room;
    expect((await f.act(2, { type: 'select-level', level: 'deadlock' })).accepted).toBe(false);
    expect((await f.act(1, { type: 'exit' })).accepted).toBe(false);
    await f.act(1, { type: 'control', control: 'draft:maintenance' });
    expect((await f.act(2, { type: 'draft-cube-occupancy', cubeId: 'draft:payload', epoch: r.cubes['draft:payload'].epoch, devices: ['draft:exitSocket'] })).accepted).toBe(false);
    r = (await f.act(1, { type: 'draft-cube-occupancy', cubeId: 'draft:payload', epoch: r.cubes['draft:payload'].epoch, devices: ['draft:exitSocket'] })).room;
    expect(r.exitUnlocked).toBe(true);
    r = (await f.act(1, { type: 'exit' })).room; expect(r.completed).toBe(false);
    r = (await f.act(2, { type: 'exit' })).room; expect(r.party?.completedLevels).toEqual(['handshake']);
    const oldGeneration = r.levelInstance;
    r = (await f.act(1, { type: 'select-level', level: 'deadlock' })).room;
    expect(r.party?.completedLevels).toEqual(['handshake']); expect(Object.keys(r.cubes)).toHaveLength(3);
    expect((await f.act(1, { type: 'control', control: 'draft:hatchToggle', levelInstance: oldGeneration })).accepted).toBe(false);
    await f.act(1, { type: 'draft-occupancy', devices: ['draft:feed'] });
    r = (await f.act(2, { type: 'draft-occupancy', devices: ['draft:safe'] })).room;
    expect(r.levelState.outputs).toMatchObject({ cargoLift: true, shaftFirewall: false, serviceRelay: false });
    r = (await f.act(1, { type: 'draft-occupancy', devices: [] })).room;
    expect(r.levelState.outputs).toMatchObject({ cargoLift: false, shaftFirewall: false, serviceRelay: true });
    for (const [cube, socket] of [['cubeA', 'payloadOne'], ['cubeB', 'payloadTwo'], ['cubeC', 'payloadThree']])
        r = (await f.act(1, { type: 'draft-cube-occupancy', cubeId: `draft:${cube}`, epoch: r.cubes[`draft:${cube}`].epoch, devices: [`draft:${socket}`] })).room;
    expect(r.exitUnlocked).toBe(true);
    r = (await f.act(1, { type: 'select-level', level: 'deadlock' })).room;
    expect(r.exitUnlocked).toBe(false); expect(r.levelState.outputs).toMatchObject({ cargoLift: false, shaftFirewall: true, serviceRelay: false });
    expect(Object.values(r.cubePlacements)).toEqual(['spawn', 'spawn', 'spawn']);
    r = (await f.act(1, { type: 'select-level', level: 'use-after-free' })).room;
    await f.act(1, { type: 'draft-occupancy', devices: ['draft:plateA'] });
    r = (await f.act(2, { type: 'crumble-trigger', platform: 'draft:a1', trigger: 'hook' })).room;
    expect(r.levelState.platforms['draft:a1'].phase).toBe('warning');
    r = (await f.act(1, { type: 'select-level', level: 'use-after-free' })).room;
    expect(r.levelState.outputs.routeA).toBe(false); expect(r.levelState.platforms['draft:a1'].phase).toBe('stable');
    expect(r.party?.completedLevels).toEqual(['handshake']);
});
