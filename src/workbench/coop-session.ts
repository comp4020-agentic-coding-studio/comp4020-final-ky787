import { CoopClient } from '../coop/client.ts';
import { cubeEntries, type SessionRoom } from '../coop/protocol.ts';
import type { InputState } from '../engine/physics.ts';
import { PuzzleWorld } from '../slice/world.ts';
import { draftHash, type DraftDocument } from './model.ts';
import { requirePlayable } from './validation.ts';
import { validateStart } from './runtime.ts';
import { draftRoom } from './room-adapter.ts';
import { createDraftAuthority, type DraftCoopAuthority } from './coop-authority.ts';

/** Frozen geometry + the existing transport, prediction, authoritative controller and physics. */
export class DraftSession {
    readonly client: CoopClient;
    world: PuzzleWorld | null = null;
    document: DraftDocument | null = null;
    authority: DraftCoopAuthority | null = null;
    error = '';
    private loading = '';
    private generation = 0;
    constructor(private onUpdate: () => void = () => {}, private onError: (message: string) => void = () => {}) {
        this.client = new CoopClient((room, initial) => { void this.accept(room, initial); }, onUpdate, 'bn_workbench_room');
    }
    start(hash: string) { this.error = ''; this.client.startDraft(hash); }
    join(code: string) { this.error = ''; this.client.start(code); }
    restart(hash: string) { return this.client.restartDraft(hash); }
    stop() { this.generation++; this.loading = ''; this.client.leave(); this.world = null; this.authority = null; this.document = null; this.onUpdate(); }
    private async accept(room: SessionRoom, initial: boolean) {
        try {
            if (!room.draft) throw new Error('This room is not an isolated draft session.');
            const key = `${room.draft.hash}:${room.levelInstance}`;
            if (!initial && this.loading === key) return;
            if (initial || !this.world || this.document === null || this.authority?.room.levelInstance !== room.levelInstance) {
                this.loading = key; const generation = ++this.generation;
                this.world = null; this.authority = null;
                const response = await fetch(`/api/workbench/snapshots/${room.draft.hash}`, { signal: AbortSignal.timeout(8000) });
                if (!response.ok) throw new Error('Frozen draft snapshot is unavailable.');
                const body: unknown = await response.json();
                if (!body || typeof body !== 'object' || !('document' in body)) throw new Error('Malformed frozen draft response.');
                const document = requirePlayable(body.document);
                if (await draftHash(document) !== room.draft.hash) throw new Error('Draft content hash mismatch.');
                const controller = document.controller.kind === 'builtin' ? document.controller.id : 'declarative';
                if (room.draft.controller.id !== controller || room.draft.controller.version !== 1
                    || room.level !== (document.controller.kind === 'builtin' ? document.controller.id : 'workbench')) throw new Error('Draft controller version mismatch.');
                if (generation !== this.generation || this.client.room?.levelInstance !== room.levelInstance || this.client.room?.draft?.hash !== room.draft.hash) return;
                const current = this.client.room;
                this.document = document;
                this.authority = createDraftAuthority(document, current, this.client);
                this.world = new PuzzleWorld(draftRoom(document, this.client.slot!), { switchB: false, cubeOnPlate: false, cubeOnPlateB: false,
                    checkpoint: this.authority.checkpoint }, undefined, this.authority);
                const issue = validateStart(this.world, this.world.player);
                if (issue) throw new Error(`Player ${this.client.slot} draft start is blocked: ${issue}`);
                this.loading = ''; this.onUpdate();
            } else if (this.authority) {
                this.authority.room = room; this.world.syncAuthority(); this.onUpdate();
            }
        } catch (error) {
            this.error = error instanceof Error ? error.message : String(error); this.loading = ''; this.client.leave(); this.world = null;
            this.onError(this.error); this.onUpdate();
        }
    }
    step(dt: number, input: InputState, interact = false) {
        if (!this.world || !this.client.playing) return;
        this.world.step(dt, input, interact);
        const now = performance.now();
        this.client.publish(this.world.player, now);
        for (const [id, cube] of cubeEntries(this.world.cubes)) if (!this.world.cubeIsResetting(id)) this.client.publishCube(cube, now, id);
    }
}
