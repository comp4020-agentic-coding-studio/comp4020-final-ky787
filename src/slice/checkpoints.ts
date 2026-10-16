import { PLAYER } from '../engine/constants.ts';
import { raycastBoxes } from '../engine/geometry.ts';
import type { BreakpointDef } from './rooms.ts';
import type { PuzzleWorld } from './world.ts';
import type { RoomMemory } from './progress.ts';

export const checkpointReached = (current: RoomMemory['checkpoint'], target: BreakpointDef['checkpoint']) =>
    current === target || current === 'upper' && target === 'relay';

/** Floor-level walking contact, with solid architecture blocking the short sightline. */
export function touchesBreakpoint(world: Pick<PuzzleWorld, 'player' | 'solids'>, station: BreakpointDef): boolean {
    const p = world.player, dx = station.at.x - p.x;
    if (!p.grounded || Math.abs(dx) > 54 || Math.abs(p.y + PLAYER.height / 2 - station.at.y) > 6) return false;
    return Math.abs(dx) < .01 || !raycastBoxes(p, { x: Math.sign(dx), y: 0 }, Math.abs(dx),
        world.solids.filter(s => s.enabled && !s.oneWay));
}
