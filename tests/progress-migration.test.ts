import { expect, it } from 'vitest';
import { freshProgress, readProgress, validProgress } from '../src/slice/progress.ts';
it('upgrades version-1 saves without resetting rooms, completion or Plate A', () => {
    const legacy = structuredClone(freshProgress()) as unknown as Record<string, any>;
    legacy.version = 1;
    delete legacy.rooms.uplink;
    legacy.currentRoom = 'relay';
    legacy.completedRooms = ['pressure', 'switch'];
    legacy.rooms.relay.switchB = true;
    legacy.rooms.relay.cubeOnPlate = true;
    legacy.rooms.relay.checkpoint = 'relay';
    for (const m of Object.values(legacy.rooms)) delete (m as Record<string, unknown>).cubeOnPlateB;
    const migrated = readProgress(legacy)!;
    expect(migrated.version).toBe(3);
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
it('migrates real three-room version-2 finishers into UPLINK without losing their completed route', () => {
    const old = structuredClone(freshProgress()) as unknown as Record<string, any>;
    old.version = 2; delete old.rooms.uplink;
    old.currentRoom = 'relay'; old.completedRooms = ['pressure', 'switch', 'relay'];
    old.rooms.relay = { switchB: true, cubeOnPlate: false, cubeOnPlateB: true, checkpoint: 'relay' };
    old.mechanics = ['carry', 'grapple'];
    const migrated = readProgress(old)!;
    expect(migrated.version).toBe(3); expect(migrated.currentRoom).toBe('uplink');
    expect(migrated.completedRooms).toEqual(old.completedRooms);
    expect(migrated.rooms.relay).toEqual(old.rooms.relay);
    expect(migrated.rooms.uplink).toEqual(freshProgress().rooms.uplink);
    expect(migrated.mechanics).toEqual(old.mechanics); expect(old.rooms.uplink).toBeUndefined();
    expect(validProgress(migrated)).toBe(true);
});
it('rejects impossible UPLINK cargo placements and upper checkpoints without a latch', () => {
    const p = freshProgress();
    p.rooms.uplink.checkpoint = 'upper'; expect(validProgress(p)).toBe(false);
    p.rooms.uplink.switchC = true; expect(validProgress(p)).toBe(true);
    p.rooms.uplink.cubeOnPlateC = true; expect(validProgress(p)).toBe(false);
    p.rooms.uplink.cubeTransferred = true; expect(validProgress(p)).toBe(true);
    p.rooms.uplink.cubeOnPlateB = true; expect(validProgress(p)).toBe(false);
});
