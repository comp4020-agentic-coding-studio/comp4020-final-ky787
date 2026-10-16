import { createServer } from 'node:http';
import { once } from 'node:events';
import { describe, expect, it } from 'vitest';
import { attachMultiplayer } from '../server/multiplayer.ts';
import { emptyInput } from '../src/engine/physics.ts';
import { newDraft, type DraftDocument } from '../src/workbench/model.ts';
import { createRuntime } from '../src/workbench/runtime.ts';
import { cleanups, connect, directory } from './helpers/coop-server.ts';

function socketFixture(playerX: number, cubeY = 578): DraftDocument {
    const d = newDraft('socket-contact-fixture');
    d.geometry = { width: 1000, height: 700, objects: [
        { type: 'spawn', id: 'p1', slot: 1, x: playerX, y: 583 },
        { type: 'spawn', id: 'p2', slot: 2, x: 100, y: 583 },
        { type: 'platform', id: 'floor', kind: 'static', x: 0, y: 600, w: 1000, h: 100 },
        { type: 'device', id: 'plate', kind: 'plate', x: 400, y: 600 },
        { type: 'device', id: 'socket', kind: 'socket', x: 400, y: 600 },
        { type: 'cube', id: 'payload', x: 400, y: cubeY, mark: 'A' },
        { type: 'exit', id: 'exit', x: 900, y: 460, w: 80, h: 140, latch: true, arrivals: 2 },
    ] };
    d.controller = { kind: 'declarative', outputs: { ready: { op: 'ref', id: 'socket.occupied' } } };
    d.bindings = [{ id: 'exitPower', output: 'ready', target: 'exit', property: 'unlock' }];
    d.presentation = { display: { x: 650, y: 200 }, labels: [], wires: [], cameraReveals: [] };
    d.previewStates = { empty: {} };
    return d;
}

describe('payload sockets use live physical cube contact', () => {
    it('a grounded player powers an ordinary plate but cannot fill an overlapping socket', () => {
        const d = socketFixture(400);
        d.geometry.objects.find(o => o.id === 'payload')!.x = 650;
        const r = createRuntime(d);
        for (let n = 0; n < 6; n++) r.step();
        expect(r.world.player.grounded).toBe(true);
        expect(r.authority.values).toMatchObject({ 'plate.occupied': true, 'socket.occupied': false });
        expect(r.world.frame.outputs.exitDoor).toBe(false);
    });

    it('accepts a landed cube, clears on pickup, refills on a real drop, and clears after removal while the exit stays latched', () => {
        const r = createRuntime(socketFixture(360, 500));
        r.step();
        expect(r.world.cubes['draft:payload']!.grounded).toBe(false);
        expect(r.authority.values['socket.occupied']).toBe(false);
        for (let n = 0; n < 120 && !r.world.cubes['draft:payload']!.grounded; n++) r.step();
        expect(r.world.cubes['draft:payload']!.grounded).toBe(true);
        expect(r.authority.values['socket.occupied']).toBe(true);
        expect(r.authority.outputs.ready).toBe(true);

        r.step(emptyInput(), true);
        expect(r.world.cubes['draft:payload']!.carried).toBe(true);
        expect(r.authority.values['socket.occupied']).toBe(false);
        expect(r.authority.values['plate.occupied']).toBe(true); // The nearby player remains a valid plate weight.
        expect(r.authority.outputs.ready).toBe(false);
        expect(r.world.frame.outputs.exitDoor).toBe(true);

        r.step(emptyInput(), true);
        for (let n = 0; n < 30; n++) r.step();
        expect(r.world.cubes['draft:payload']!.grounded).toBe(true);
        expect(r.authority.values['socket.occupied']).toBe(true);

        r.step(emptyInput(), true);
        for (let n = 0; n < 60; n++) r.step({ ...emptyInput(), right: true });
        r.step(emptyInput(), true);
        for (let n = 0; n < 30; n++) r.step();
        expect(r.world.cubes['draft:payload']!.grounded).toBe(true);
        expect(r.world.cubes['draft:payload']!.x).toBeGreaterThan(459);
        expect(r.authority.values['socket.occupied']).toBe(false);
        expect(r.authority.outputs.ready).toBe(false);
        expect(r.world.frame.outputs.exitDoor).toBe(true);
    });

    it('releases a socket when its resting cube is hooked for pulling', () => {
        const r = createRuntime(socketFixture(300));
        for (let n = 0; n < 6; n++) r.step();
        expect(r.authority.values['socket.occupied']).toBe(true);
        r.step({ ...emptyInput(), grapplePressed: true, grappleHeld: true, aim: { x: 400, y: 578 } });
        expect(r.world.pullingCubeId).toBe('draft:payload');
        expect(r.authority.values['socket.occupied']).toBe(false);
    });
});

async function deadlockServer() {
    const dir = await directory(), server = createServer(), multiplayer = await attachMultiplayer(server, dir);
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    cleanups.push(async () => { multiplayer.shutdown(); await multiplayer.drained(); await new Promise<void>(resolve => server.close(() => resolve())); });
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const a = await connect<'deadlock'>(url, 'bn_visitor=11111111-1111-4111-8111-111111111111');
    const b = await connect<'deadlock'>(url, 'bn_visitor=22222222-2222-4222-8222-222222222222');
    a.send({ type: 'create-party' }); const first = (await a.wait('snapshot')).room;
    b.send({ type: 'join', code: first.code }); await b.wait('snapshot');
    const seq = [0, 0];
    const act = async (slot: 1 | 2, message: object) => {
        const peer = slot === 1 ? a : b, next = ++seq[slot - 1];
        peer.send({ ...message, seq: next });
        return peer.wait('action-result', m => m.seq === next);
    };
    const sharedAction = async (slot: 1 | 2, message: object) => {
        const result = await act(slot, message);
        expect(result.accepted).toBe(true);
        const other = await (slot === 1 ? b : a).wait('room', m => m.room.revision === result.room.revision);
        expect(other.room.levelState).toEqual(result.room.levelState);
        expect(other.room.exitUnlocked).toBe(result.room.exitUnlocked);
        return result.room;
    };
    return { act, sharedAction, room: await sharedAction(1, { type: 'select-level', level: 'deadlock' }) };
}

it('the server publishes live socket removal to both peers, using all payloads for DEADLOCK service while only the exit latches', async () => {
    // Semantic authority test, not physical delivery or full-room solve evidence.
    const f = await deadlockServer(); let r = f.room;
    for (const socket of ['payloadOne', 'payloadTwo', 'payloadThree']) {
        const rejected = await f.act(2, { type: 'draft-occupancy', devices: [`draft:${socket}`] });
        expect(rejected.accepted).toBe(false);
        expect(rejected.room.levelState.devices[`${socket}.occupied`]).toBe(false);
    }
    r = await f.sharedAction(2, { type: 'draft-occupancy', devices: ['draft:safe'] });
    for (const [cube, socket] of [['cubeA', 'payloadOne'], ['cubeB', 'payloadTwo'], ['cubeC', 'payloadThree']] as const) {
        const id = `draft:${cube}` as const;
        r = await f.sharedAction(1, { type: 'draft-cube-occupancy', cubeId: id, epoch: r.cubes[id].epoch, devices: [`draft:${socket}`] });
        expect(r.levelState.devices[`${socket}.occupied`]).toBe(true);
        expect(r.levelState.outputs.payloadReady).toBe(cube === 'cubeC');
        expect(r.exitUnlocked).toBe(cube === 'cubeC');
    }
    r = await f.sharedAction(2, { type: 'draft-occupancy', devices: [] });
    expect(r.levelState.outputs).toMatchObject({ payloadReady: true, serviceRelay: true, cargoLift: false, shaftFirewall: true });

    r = await f.sharedAction(1, { type: 'cube-pickup', cubeId: 'draft:cubeB', epoch: r.cubes['draft:cubeB'].epoch });
    expect(r.cubes['draft:cubeB'].holder).toBe(1);
    expect(r.levelState.devices['payloadTwo.occupied']).toBe(false);
    expect(r.levelState.outputs).toMatchObject({ payloadReady: false, serviceRelay: false });
    expect(r.exitUnlocked).toBe(true);
    const heldContact = await f.act(1, { type: 'draft-cube-occupancy', cubeId: 'draft:cubeB', epoch: r.cubes['draft:cubeB'].epoch, devices: ['draft:payloadTwo'] });
    expect(heldContact.accepted).toBe(false);

    r = await f.sharedAction(2, { type: 'draft-occupancy', devices: ['draft:safe'] });
    expect(r.levelState.outputs.serviceRelay).toBe(true); // The original SAFE-and-not-FEED clause remains available.
    r = await f.sharedAction(1, { type: 'draft-occupancy', devices: ['draft:feed'] });
    expect(r.levelState.outputs.serviceRelay).toBe(false);
    expect(r.exitUnlocked).toBe(true);

    r = await f.sharedAction(1, { type: 'cube-drop', cubeId: 'draft:cubeB', epoch: r.cubes['draft:cubeB'].epoch,
        transform: { x: 1250, y: 978, vx: 0, vy: 0, grounded: true } });
    r = await f.sharedAction(1, { type: 'draft-cube-occupancy', cubeId: 'draft:cubeB', epoch: r.cubes['draft:cubeB'].epoch, devices: ['draft:payloadTwo'] });
    expect(r.levelState.outputs).toMatchObject({ payloadReady: true, serviceRelay: true });
    r = await f.sharedAction(1, { type: 'draft-cube-occupancy', cubeId: 'draft:cubeB', epoch: r.cubes['draft:cubeB'].epoch, devices: [] });
    expect(r.levelState.devices['payloadTwo.occupied']).toBe(false);
    expect(r.levelState.outputs).toMatchObject({ payloadReady: false, serviceRelay: false });
    expect(r.exitUnlocked).toBe(true);
    expect(r.completed).toBe(false);
});
