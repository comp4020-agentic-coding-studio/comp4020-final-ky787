import { bodyOnPlate } from '../coop/authority.ts';
import { playerBox } from '../engine/physics.ts';
import { clamp, type Box } from '../engine/geometry.ts';
import type { CameraFrame } from '../render/camera.ts';
import type { CameraReveal, RoomDef } from './rooms.ts';
import type { PuzzleWorld } from './world.ts';

type CameraWorld = Pick<PuzzleWorld, 'room' | 'player' | 'deaths' | 'localControl'>;
export interface CameraSelection {
    kind: 'overview' | 'plate' | 'control' | 'legacy' | 'follow';
    id: string | null;
    frame: CameraFrame | null;
}
const following = (): CameraSelection => ({ kind: 'follow', id: null, frame: null });

/** Resolve authored geometry, never the changing set of powered solids. */
export function revealFrame(room: RoomDef, reveal: CameraReveal, body: Box): CameraFrame | null {
    const targets: Box[] = room.platforms.filter(p => reveal.platformIds?.includes(p.id));
    if (reveal.bounds) targets.push(reveal.bounds);
    if (!targets.length) return null;
    targets.push(body);
    const x = clamp(Math.min(...targets.map(b => b.x)), 0, room.width);
    const y = clamp(Math.min(...targets.map(b => b.y)), 0, room.height);
    const right = clamp(Math.max(...targets.map(b => b.x + b.w)), x, room.width);
    const bottom = clamp(Math.max(...targets.map(b => b.y + b.h)), y, room.height);
    return { x, y, w: right - x, h: bottom - y, padding: Math.max(0, reveal.padding ?? 64) };
}

/** One browser's presentation state. No shared occupancy, outputs or remote avatar. */
export class ContextualCamera {
    selection: CameraSelection = following();
    private room?: RoomDef;
    private deaths = 0;
    private seenControl = 0;
    private temporary: { id: string; reveal: CameraReveal; remaining: number } | null = null;

    reset(w: CameraWorld): void {
        this.room = w.room; this.deaths = w.deaths; this.seenControl = w.localControl?.sequence ?? 0;
        this.temporary = null; this.selection = following();
    }

    update(w: CameraWorld, dt: number, overview: boolean, enabled = true, legacy: CameraFrame | null = null): CameraSelection {
        const interrupted = this.room !== w.room || this.deaths !== w.deaths || !enabled;
        if (interrupted) this.reset(w);
        if (this.temporary && (this.temporary.remaining -= dt) <= 0) this.temporary = null;
        const plate = enabled && w.room.plates?.find(p => p.cameraReveal && bodyOnPlate(w, p.at));
        const interaction = w.localControl;
        if (interaction && interaction.sequence !== this.seenControl) {
            this.seenControl = interaction.sequence;
            const control = w.room.controls?.find(c => c.id === interaction.id);
            if (enabled && !plate && control?.cameraReveal) this.temporary = {
                id: control.id, reveal: control.cameraReveal, remaining: control.cameraReveal.duration ?? 1.5,
            };
        }
        // A plate owns the view. Discard suppressed lever reveals instead of
        // unexpectedly resuming one when the operator steps off the plate.
        if (plate) this.temporary = null;
        let next = following();
        if (overview) next = { kind: 'overview', id: null, frame: { x: 0, y: 0, w: w.room.width, h: w.room.height } };
        else if (plate) {
            // Fixed contact envelope prevents sub-pixel motion/jitter from
            // moving a sustained operator view. It contains every valid body contact.
            const frame = revealFrame(w.room, plate.cameraReveal!, { x: plate.at.x - 60, y: plate.at.y - 60, w: 120, h: 80 });
            if (frame) next = { kind: 'plate', id: plate.id, frame };
        } else if (this.temporary) {
            const frame = revealFrame(w.room, this.temporary.reveal, playerBox(w.player));
            if (frame) next = { kind: 'control', id: this.temporary.id, frame };
        } else if (enabled && !interrupted && legacy) next = { kind: 'legacy', id: null, frame: legacy };
        return this.selection = next;
    }
}
