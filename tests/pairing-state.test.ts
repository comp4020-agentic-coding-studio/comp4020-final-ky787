import { expect, it } from 'vitest';
import { readRoomRecord, sharedRoom, validRecord, type RoomRecord } from '../server/coop-state.ts';

const record = (): RoomRecord<'pairing-bay'> => ({ version: 5, cubePlacements: { cube: 'spawn' }, code: 'ABCD', level: 'pairing-bay', revision: 20,
    visitors: ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'],
    levelState: { switchB: true }, checkpoint: 'reunion', exitUnlocked: true, reachedExit: [true, false], completed: false,
    createdAt: '2026-10-06T00:00:00Z', updatedAt: '2026-10-06T01:00:00Z' });
const legacy = () => { const { levelState, cubePlacements, ...r } = record(); return { ...r, version: 3, cubePlacement: cubePlacements.cube, switchB: levelState.switchB }; };
it('validates durable semantic arrivals and refuses corrupt/inconsistent progression instead of resetting it', () => {
    const r = record(); expect(validRecord(r, r.code)).toBe(true); expect(readRoomRecord(r, r.code)).toEqual(r);
    for (const bad of [null, { ...r, version: 6 }, { ...r, cubePlacements: { cube: 'arbitrary' } }, { ...r, reachedExit: [true] }, { ...r, reachedExit: ['yes', false] },
        { ...r, reachedExit: [true, true] }, { ...r, completed: true }, { ...r, exitUnlocked: false },
        { ...r, levelState: { switchB: false }, checkpoint: 'entry' }, { ...r, visitors: [r.visitors[0], null] },
        { ...r, visitors: [r.visitors[0], r.visitors[0]] }]) expect(readRoomRecord(bad, r.code)).toBeNull();
    r.reachedExit = [true, true]; r.completed = true; expect(validRecord(r, r.code)).toBe(true);
    const view = sharedRoom(r, [false, false], ['finalLeft', 'finalRight']);
    expect(view.levelState.inputs.finalPlateLeftOccupied || view.levelState.inputs.finalPlateRightOccupied).toBe(false);
    expect(view.exitUnlocked && view.levelState.outputs.exitDoor && view.completed).toBe(true);
    expect(view.reachedExit).toEqual([true, true]);
});
it('migrates an untouched version-1 room without awarding any progress', () => {
    const { exitUnlocked: _unlock, reachedExit: _arrivals, cubePlacement: _cube, ...base } = legacy();
    const old = { ...base, version: 1, switchB: false, checkpoint: 'entry', completed: false };
    expect(readRoomRecord(old, old.code)).toEqual({ ...record(), levelState: { switchB: false }, checkpoint: 'entry', exitUnlocked: false, reachedExit: [false, false] });
});
it('migrates version 2 while preserving existing unlock and arrivals, starting its new cube safely', () => {
    const { cubePlacement: _cube, ...r } = legacy();
    expect(readRoomRecord({ ...r, version: 2 }, r.code)).toEqual(record());
});
it.each(['spawn', 'cargoPlate'] as const)('migrates version 3 with %s, preserving every accepted durable field including completion', cubePlacement => {
    const r = { ...legacy(), cubePlacement, reachedExit: [true, true], completed: true };
    expect(readRoomRecord(r, r.code)).toEqual({ ...record(), cubePlacements: { cube: cubePlacement }, reachedExit: [true, true], completed: true });
});
