import { expect, it } from 'vitest';
import { freshProgress, readProgress, validProgress } from '../src/slice/progress.ts';
it('upgrades version-1 saves without resetting rooms, completion or Plate A', () => {
    const legacy = structuredClone(freshProgress()) as unknown as Record<string, any>;
    legacy.version = 1;
    legacy.currentRoom = 'relay';
    legacy.completedRooms = ['pressure', 'switch'];
    legacy.rooms.relay.switchB = true;
    legacy.rooms.relay.cubeOnPlate = true;
    legacy.rooms.relay.checkpoint = 'relay';
    for (const m of Object.values(legacy.rooms)) delete (m as Record<string, unknown>).cubeOnPlateB;
    const migrated = readProgress(legacy)!;
    expect(migrated.version).toBe(2);
    expect(migrated.currentRoom).toBe('relay');
    expect(migrated.completedRooms).toEqual(['pressure', 'switch']);
    expect(migrated.rooms.relay).toEqual({ switchB: true, cubeOnPlate: true, cubeOnPlateB: false, checkpoint: 'relay' });
    expect(legacy.version).toBe(1);
    expect(validProgress(migrated)).toBe(true);
});
it('rejects impossible double plate placement and malformed old saves', () => {
    const progress = freshProgress();
    Object.assign(progress.rooms.relay, { switchB: true, cubeOnPlate: true, cubeOnPlateB: true });
    expect(validProgress(progress)).toBe(false);
    expect(readProgress({ version: 1 })).toBeNull();
});
