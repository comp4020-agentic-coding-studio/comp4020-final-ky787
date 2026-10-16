import { expect, it } from 'vitest';
import { ENERGY_CONNECT, ENERGY_CYCLE, PAYLOAD_COLOURS, energyPhase, payloadEnergy } from '../src/slice/payload-energy.ts';
import { ReceiverPresentation } from '../src/slice/receiver-presentation.ts';

it('keeps free and carried payloads purple through a layered, bounded full heartbeat', () => {
    const frames = Array.from({ length: 157 }, (_, i) => payloadEnergy('draft:cargoA', i / 60, null));
    expect(frames.every(e => e.primary === PAYLOAD_COLOURS.free.primary && !e.connected && e.green === 0 && e.surge === 0)).toBe(true);
    expect(Math.min(...frames.map(e => e.breath))).toBeGreaterThan(.43);
    expect(Math.max(...frames.map(e => e.breath))).toBeLessThan(.89);
    expect(new Set(frames.map(e => e.perimeter)).size).toBeGreaterThan(150);
    const corePeak = frames.reduce((best, e, i) => e.breath > frames[best].breath ? i : best, 0);
    expect(frames[corePeak].contour).toBeLessThan(.4); // Different layers do not peak together.
    expect(frames.every(e => Math.abs(e.electric) <= 1.4)).toBe(true);
    expect(payloadEnergy('draft:cargoA', 0, null).breath).toBeCloseTo(payloadEnergy('draft:cargoA', ENERGY_CYCLE, null).breath);
});
it('smoothly connects purple to green in 680 ms; restored active cargo is already green', () => {
    const frames = Array.from({ length: 69 }, (_, i) => payloadEnergy('cubeA', 3, i / 100));
    expect(frames[0].primary).toBe(PAYLOAD_COLOURS.free.primary);
    expect(frames.at(-1)!.primary).toBe(PAYLOAD_COLOURS.connected.primary);
    for (let i = 1; i < frames.length; i++) expect(frames[i].green).toBeGreaterThanOrEqual(frames[i - 1].green);
    expect(frames[34].surge).toBeCloseTo(1);
    expect(payloadEnergy('cubeA', 3, ENERGY_CONNECT).surge).toBe(0);
    expect(payloadEnergy('cubeA', 3, Infinity)).toMatchObject({ primary: '#59ff86', green: 1, surge: 0 });
    expect(payloadEnergy('cubeA', 3, null)).toMatchObject({ primary: '#b65cff', green: 0, surge: 0 });
});
it('separates adjacent payload phases reproducibly without random state', () => {
    const phases = ['draft:cubeA', 'draft:cubeB', 'draft:cubeC'].map(energyPhase);
    expect(new Set(phases).size).toBe(3);
    expect(Math.max(...phases) - Math.min(...phases)).toBeGreaterThan(.25);
    expect(energyPhase('draft:cubeA')).toBe(phases[0]);
});
it.each([null, 0, .3, Infinity])('reduced motion is static, with an unambiguous settled palette (age %s)', age => {
    const first = payloadEnergy('cubeB', 0, age, false);
    for (const time of [.2, 1.4, 3.7, 45]) expect(payloadEnergy('cubeB', time, age, false)).toEqual(first);
    expect(first).toMatchObject({ surge: 0, electric: 0, primary: age === null ? '#b65cff' : '#59ff86' });
});
it('accepted occupancy waits for physical centring to colour the cube, without a second sound', () => {
    const p = new ReceiverPresentation(), r = { id: 'socket', at: { x: 800, y: 620 }, label: 'PAYLOAD', active: false };
    const occupied = { ...r, active: true }, connected = { ...occupied, dock: { receiver: 'socket', cube: 'draft:cubeA' as const, at: { x: 800, y: 598 } } };
    p.reset([r]); expect(p.update([occupied], .1, true)).toHaveLength(1);
    p.update([occupied], 3, true); expect(p.payloadAge('draft:cubeA')).toBeNull();
    expect(p.update([connected], .1, true)).toEqual([]); expect(p.payloadAge('draft:cubeA')).toBe(0);
    p.update([structuredClone(connected)], .2, true); expect(p.payloadAge('draft:cubeA')).toBe(.2);
    p.update([r], .1, true); expect(p.payloadAge('draft:cubeA')).toBeNull();
    p.reset([occupied]); p.update([connected], .1, true); expect(p.payloadAge('draft:cubeA')).toBe(Infinity);
});
