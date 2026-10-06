import { expect, it } from 'vitest';
import { roomConnections, connectionPowered, connectionPulse } from '../src/slice/connections.ts';
import { roomById, ROOMS } from '../src/slice/rooms.ts';
import { roomController } from '../src/slice/validated-controller.ts';
import type { ControllerInputs } from '../src/slice/controller.ts';
import { Camera } from '../src/render/camera.ts';

it('every physical wire has endpoints inside its chamber and a distinct identity', () => {
    for (const room of ROOMS) {
        const wires = roomConnections(room);
        expect(new Set(wires.map(w => w.id)).size).toBe(wires.length);
        for (const wire of wires) {
            expect(wire.points.length).toBeGreaterThanOrEqual(2);
            for (const p of wire.points) { expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(room.width); expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(room.height); }
        }
    }
});
it('UPLINK wiring shows each source across all 32 retained frames, including inputs awaiting another condition', () => {
    const wires = roomConnections(roomById('uplink'));
    for (let key = 0; key < 32; key++) {
        const inputs: ControllerInputs = { plateA: !!(key & 1), switchB: !!(key & 2), plateB: !!(key & 4), switchC: !!(key & 8), cubeOnPlateC: !!(key & 16), plateC: true, cubeOnPlate: false, cubeOnPlateB: false };
        const w = { inputs, frame: roomController.evaluate('uplink', inputs) };
        expect(connectionPowered(wires.find(w => w.id === 'anchor-feed')!, w)).toBe(inputs.plateA);
        expect(connectionPowered(wires.find(w => w.id === 'plate-lift')!, w)).toBe(inputs.plateB);
        expect(connectionPowered(wires.find(w => w.id === 'latch-lift')!, w)).toBe(inputs.switchC);
        expect(connectionPowered(wires.find(w => w.id === 'exit-feed')!, w)).toBe(inputs.cubeOnPlateC);
        for (const wire of wires.filter(w => w.id.startsWith('payload-'))) expect(connectionPowered(wire, w)).toBe(inputs.cubeOnPlateC);
        expect(w.frame.outputs.exitDoor).toBe(inputs.switchC && inputs.cubeOnPlateC);
        expect(w.frame.outputs.codePlatformB).toBe(inputs.switchC && inputs.cubeOnPlateC);
    }
});
it('powered pulses travel around a corner and loop without adding gameplay delay', () => {
    const path = [{ x: 0, y: 0 }, { x: 220, y: 0 }, { x: 220, y: 220 }];
    expect(connectionPulse(path, .5)).toEqual({ x: 110, y: 0 });
    expect(connectionPulse(path, 1.5)).toEqual({ x: 220, y: 110 });
    expect(connectionPulse(path, 2.5)).toEqual(connectionPulse(path, .5));
});
it.each([[1600, 744], [960, 500]])('the held overview fits the entire taller chamber at %s×%s', (width, height) => {
    const room = roomById('uplink'), c = new Camera(); c.setWorld(room.width, room.height, 740);
    for (let i = 0; i < 600; i++) c.update(1 / 120, room.spawn, { x: 0, y: 0 }, width, height, { x: 0, y: 0, w: room.width, h: room.height });
    expect(c.originX()).toBeLessThanOrEqual(0); expect(c.originY()).toBeLessThanOrEqual(0);
    expect(c.originX() + width / c.zoom).toBeGreaterThanOrEqual(room.width);
    expect(c.originY() + height / c.zoom).toBeGreaterThanOrEqual(room.height);
});
