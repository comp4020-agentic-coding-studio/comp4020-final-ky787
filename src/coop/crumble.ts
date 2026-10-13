import type { CrumbleAuthority, PuzzleWorld } from '../slice/world.ts';
import type { CoopClient } from './client.ts';
import type { CrumbleId } from './protocol.ts';

/** Countdown is presentation only. Only a BROKEN snapshot can remove collision. */
export class SharedCrumbleAuthority implements CrumbleAuthority {
    private phases = new Map<string, string>();
    constructor(private client: CoopClient) {}
    sync(w: PuzzleWorld): void {
        const room = this.client.room;
        if (room?.level !== 'crumble-lab' && room?.level !== 'race-condition' && room?.level !== 'crossfeed-vault' && room?.level !== 'workbench') return;
        const now = performance.now(), age = Math.max(0, now - this.client.roomReceivedAt);
        for (const p of w.platforms) {
            if (room.level === 'workbench' ? p.def.kind !== 'crumble-prototype' : p.def.id !== 'crumbleA' && p.def.id !== 'crumbleB') continue;
            const id: CrumbleId = room.level === 'workbench' ? `draft:${p.def.id}` : p.def.id as 'crumbleA' | 'crumbleB';
            const state = room.levelState.platforms[id];
            if (!state) continue;
            const pending = this.client.pendingCrumble.get(id);
            const phase = state.phase, previous = this.phases.get(id);
            const remaining = Math.max(0, state.remainingMs - age) / 1000;
            p.fuseDuration = (state.durationMs || (room.level === 'race-condition' ? 1550 : room.level === 'crossfeed-vault' ? 1650 : pending?.trigger === 'hook' ? 1650 : 600)) / 1000;
            p.fuse = phase === 'warning' ? remaining : phase === 'stable' && pending ? Math.max(0, p.fuseDuration - (now - pending.at) / 1000) : -1;
            p.respawn = phase === 'broken' ? Math.max(.001, remaining) : 0;
            p.solid.enabled = phase !== 'broken' && (!p.def.signal || w.physicalPower(p.def.signal)); p.solid.grappleable = p.solid.enabled && p.def.hookable !== false;
            if (phase === 'broken') {
                if (w.player.rope.anchorId === p.def.id) w.cancelGrapple();
                if (previous !== undefined && previous !== 'broken') w.events.push({ kind: 'crumble', at: { x: p.def.x, y: p.def.y } });
            } else if (previous === 'broken' && phase === 'stable') {
                p.pulse = 1; w.events.push({ kind: 'crumble-respawn', at: { x: p.def.x, y: p.def.y } });
            }
            this.phases.set(id, phase);
        }
    }
    sample(w: PuzzleWorld): void {
        const room = this.client.room;
        if (room?.level !== 'crumble-lab' && room?.level !== 'race-condition' && room?.level !== 'crossfeed-vault' && room?.level !== 'workbench') return;
        for (const platform of w.platforms) {
            const nativeId = platform.def.id;
            const id: CrumbleId = room.level === 'workbench' ? `draft:${nativeId}` : nativeId as CrumbleId;
            if (room.levelState.platforms[id]?.phase !== 'stable') continue;
            if (w.player.grounded && w.player.groundId === nativeId) this.client.triggerCrumble(id, 'foot');
            else if (w.player.rope.phase === 'attached' && w.player.rope.anchorId === nativeId) this.client.triggerCrumble(id, 'hook');
        }
        this.sync(w);
    }
}
