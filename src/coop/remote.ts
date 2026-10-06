import { createPlayer, type PlayerState } from '../engine/physics.ts';
import type { Avatar, CubeTransform, SharedCube } from './protocol.ts';
/** 100 ms presentation delay. No remote body enters local collision or sensor lists. */
export class RemoteAvatar {
    private samples: { at: number; avatar: Avatar }[] = [];
    private stream = -1;
    private sequence = -1;
    lastAt = 0;
    clear(): void { this.samples = []; this.sequence = -1; this.stream = -1; this.lastAt = 0; }
    push(avatar: Avatar, stream: number, seq: number, now: number): void {
        if (stream !== this.stream) { this.clear(); this.stream = stream; }
        if (seq <= this.sequence) return;
        this.sequence = seq; this.lastAt = now;
        const last = this.samples.at(-1);
        // Respawn is a discontinuity; do not draw a flight across the pit.
        if (last && Math.hypot(avatar.x - last.avatar.x, avatar.y - last.avatar.y) > 300) this.samples = [];
        this.samples.push({ at: now, avatar });
        this.samples = this.samples.slice(-12);
    }
    sample(now: number): PlayerState | null {
        if (!this.samples.length) return null;
        const at = now - 100;
        while (this.samples.length > 2 && this.samples[1].at < at) this.samples.shift();
        const a = this.samples[0], b = this.samples[1] ?? a;
        const t = Math.max(0, Math.min(1, (at - a.at) / Math.max(1, b.at - a.at)));
        const p = createPlayer(a.avatar.x + (b.avatar.x - a.avatar.x) * t, a.avatar.y + (b.avatar.y - a.avatar.y) * t);
        Object.assign(p, { vx: b.avatar.vx, vy: b.avatar.vy, grounded: b.avatar.grounded, facing: b.avatar.facing });
        if (b.avatar.rope) { p.rope.phase = 'attached'; p.rope.tip = { ...b.avatar.rope }; }
        return p;
    }
}

/** One replicated body, with no extrapolation or local force integration. */
export class RemoteCube {
    private samples: { at: number; transform: CubeTransform }[] = [];
    private epoch = -1;
    private sequence = -1;
    lastAt = 0;
    reset(cube: SharedCube, now: number): void {
        this.epoch = cube.epoch; this.sequence = cube.seq;
        this.samples = cube.transform ? [{ at: now, transform: { ...cube.transform } }] : [];
        this.lastAt = cube.transform ? now : 0;
    }
    push(transform: CubeTransform, epoch: number, seq: number, now: number): boolean {
        // Only an accepted room mutation may establish a new epoch.
        if (epoch !== this.epoch || seq <= this.sequence) return false;
        this.sequence = seq; this.lastAt = now;
        const last = this.samples.at(-1)?.transform;
        if (last && Math.hypot(transform.x - last.x, transform.y - last.y) > 300) this.samples = [];
        this.samples.push({ at: now, transform: { ...transform } });
        this.samples = this.samples.slice(-12);
        return true;
    }
    latest(): CubeTransform | null { return this.samples.at(-1)?.transform ?? null; }
    sample(now: number): CubeTransform | null {
        if (!this.samples.length) return null;
        const at = now - 100;
        while (this.samples.length > 2 && this.samples[1].at < at) this.samples.shift();
        const a = this.samples[0], b = this.samples[1] ?? a;
        const t = Math.max(0, Math.min(1, (at - a.at) / Math.max(1, b.at - a.at)));
        return { ...b.transform, grounded: b.transform.grounded && (a.transform.grounded || t === 1),
            x: a.transform.x + (b.transform.x - a.transform.x) * t,
            y: a.transform.y + (b.transform.y - a.transform.y) * t };
    }
}
