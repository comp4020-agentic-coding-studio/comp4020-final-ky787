import { cubeEntries, type CubeId } from '../coop/protocol.ts';
import { boxesOverlap, type Vec2 } from '../engine/geometry.ts';
import { PLAYER } from '../engine/constants.ts';
import { payloadReceivers } from './receiver-presentation.ts';
import { CUBE_SIZE } from './tuning.ts';
import type { PuzzleWorld } from './world.ts';

export interface PayloadDock { receiver: string; cube: CubeId; at: Vec2 }
const contact = (p: Vec2, at: Vec2) => Math.abs(p.x - at.x) < 45 + CUBE_SIZE / 2 - 8 && Math.abs(p.y + CUBE_SIZE / 2 - at.y) < 5;
const box = (p: Vec2) => ({ x: p.x - CUBE_SIZE / 2, y: p.y - CUBE_SIZE / 2, w: CUBE_SIZE, h: CUBE_SIZE });

/** Accepted, resting cargo centres on the interface. This is alignment, not a
 * constraint: carry/pull, motion, loss of support or occupancy releases it.
 * Move the actual body so rendering, E reach, hooks and support cannot disagree.
 * The physics owner publishes through the existing cube stream; no new protocol state,
 * force, sensor, timer, network action or persistence latch is introduced. */
export function alignPayloads(w: PuzzleWorld): PayloadDock[] {
    const docks: PayloadDock[] = [], used = new Set<CubeId>();
    const sensors = [...(w.room.plates ?? []).filter(p => p.kind !== 'scanner').map(p => p.at),
        ...(w.room.cubePads ?? []).map(p => p.at),
        ...[w.room.plate, w.room.plateB, w.room.plateC, w.room.cargoPlate].filter((p): p is Vec2 => !!p)];
    for (const r of payloadReceivers(w).filter(r => r.active).sort((a, b) => a.id.localeCompare(b.id))) {
        const candidates = cubeEntries(w.cubes).filter(([id, c]) => !used.has(id) && !c.carried && c.grounded
            && !w.cubeIsResetting(id) && w.pullingCubeId !== id && Math.abs(c.vx) < .01 && Math.abs(c.vy) < .01 && contact(c, r.at)
            && (!w.cubeAuthority(id) || w.cubeAuthority(id)!.acceptedPlacement === r.id))
            .sort(([a], [b]) => a.localeCompare(b));
        for (const [id, c] of candidates) {
            const at = { x: r.at.x, y: r.at.y - CUBE_SIZE / 2 }, target = box(at);
            // A just-dropped cube can overlap the future bay while its carrier
            // still stands there. Wait for clearance; never shove either avatar.
            const partner = w.cubeAuthority(id)?.dockingObstacle;
            if (Math.hypot(c.x - at.x, c.y - at.y) > .01 && [w.player, ...(partner ? [partner] : [])].some(p => boxesOverlap(target,
                { x: p.x - PLAYER.width / 2, y: p.y - PLAYER.height / 2, w: PLAYER.width, h: PLAYER.height }))) continue;
            // Imported/custom layouts may obstruct the canonical bay, bridge two
            // sensors, or place the receiver off a ledge. Preserve those contacts
            // and ordinary physics rather than snapping through architecture.
            const sweep = { x: Math.min(target.x, c.x - CUBE_SIZE / 2), y: Math.min(target.y, c.y - CUBE_SIZE / 2),
                w: CUBE_SIZE + Math.abs(c.x - at.x), h: CUBE_SIZE + Math.abs(c.y - at.y) };
            if (sensors.some(s => contact(c, s) !== contact(at, s))
                || w.solids.some(s => s.enabled && !s.oneWay && boxesOverlap(sweep, s))
                || !w.solids.some(s => s.enabled && Math.abs(s.y - r.at.y) < .01 && target.x < s.x + s.w && target.x + target.w > s.x)
                || w.room.hazards.some(s => boxesOverlap(sweep, s))
                || w.firewalls.some(s => s.enabled && boxesOverlap(sweep, s.box))
                || cubeEntries(w.cubes).some(([other, body]) => other !== id && !body.carried && !w.cubeIsResetting(other) && boxesOverlap(target, box(body)))) continue;
            c.x = at.x; c.y = at.y;
            used.add(id); docks.push({ receiver: r.id, cube: id, at }); break;
        }
    }
    return docks;
}
