import { describe, expect, it } from 'vitest';
import { freshProgress, restartRoomProgress, tutorialProgress, validProgress } from '../src/slice/progress.ts';

describe('tutorial navigation persistence', () => {
    it('starts PRESSURE with fresh puzzle memories while preserving historical accomplishments', () => {
        const previous = freshProgress(); previous.currentRoom = 'relay';
        previous.completedRooms = ['pressure', 'switch']; previous.mechanics = ['carry', 'grapple'];
        previous.history = [{ room: 'switch', event: 'grapple', at: '2026-10-26T00:00:00.000Z' }];
        previous.rooms.switch.switchB = true; previous.rooms.pressure.cubeOnPlate = true;
        const next = tutorialProgress(previous);
        expect(next.currentRoom).toBe('pressure'); expect(next.rooms).toEqual(freshProgress().rooms);
        expect(next.completedRooms).toEqual(previous.completedRooms); expect(next.mechanics).toEqual(previous.mechanics); expect(next.history).toEqual(previous.history);
        expect(previous.currentRoom).toBe('relay'); expect(previous.rooms.switch.switchB).toBe(true); expect(validProgress(next)).toBe(true);
    });
    it('restarts only the current room and retains checkpoint memories in other rooms', () => {
        const previous = freshProgress(); previous.currentRoom = 'switch'; previous.rooms.pressure.cubeOnPlate = true;
        previous.rooms.switch.switchB = true; previous.completedRooms = ['pressure', 'switch'];
        const next = restartRoomProgress(previous);
        expect(next.rooms.switch).toEqual(freshProgress().rooms.switch); expect(next.rooms.pressure.cubeOnPlate).toBe(true);
        expect(next.completedRooms).toEqual(previous.completedRooms); expect(previous.rooms.switch.switchB).toBe(true);
    });
});
