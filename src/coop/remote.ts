import { createPlayer, type PlayerState } from '../engine/physics.ts';
import type { Avatar } from './protocol.ts';
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
