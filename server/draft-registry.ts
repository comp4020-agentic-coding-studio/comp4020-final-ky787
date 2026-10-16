import { declarativeDefinition } from './declarative-state.ts';
export { declarativeDefinition } from './declarative-state.ts';
import { draftHash, serializeDraft, type DraftDocument } from '../src/workbench/model.ts';
import { requirePlayable } from '../src/workbench/validation.ts';
import type { FrozenDraftRegistry, FrozenDraftSession } from './multiplayer.ts';

/** Bounded immutable snapshots shared by local and public registries. No generated source or executable imports. */
export class DraftSessionRegistry implements FrozenDraftRegistry {
    protected snapshots = new Map<string, { document: DraftDocument; session: FrozenDraftSession }>();
    async register(value: unknown) {
        const document = structuredClone(requirePlayable(value)), hash = await draftHash(document);
        const existing = this.snapshots.get(hash);
        if (existing) return { hash, metadata: structuredClone(existing.session.metadata) };
        if (this.snapshots.size >= 32) throw new Error('Frozen snapshot limit (32) reached. Restart the workbench service to release sessions.');
        const copy: DraftDocument = JSON.parse(serializeDraft(document));
        const metadata = { hash, controller: { id: copy.controller.kind === 'builtin' ? copy.controller.id : 'declarative', version: 1 } };
        const exit = copy.geometry.objects.find(o => o.type === 'exit');
        const coopError = exit?.type === 'exit' && exit.latch && exit.arrivals === 2 ? undefined : 'Local co-op requires a latched exit with two distinct arrivals. Change the exit configuration before starting co-op.';
        const breakpoints = copy.geometry.objects.filter(o => o.type === 'breakpoint').map(o => copy.controller.kind === 'declarative' ? `draft:${o.id}` : o.id);
        const session: FrozenDraftSession = copy.controller.kind === 'builtin'
            ? { metadata, coopError, breakpoints, level: copy.controller.id }
            : { metadata, coopError, breakpoints, level: 'workbench', definition: declarativeDefinition(copy) };
        this.snapshots.set(hash, { document: copy, session });
        return { hash, metadata: structuredClone(metadata) };
    }
    remove(hash: string) { this.snapshots.delete(hash); }
    get(hash: string): FrozenDraftSession | undefined { return this.snapshots.get(hash)?.session; }
    document(hash: string): DraftDocument | undefined {
        const doc = this.snapshots.get(hash)?.document;
        return doc ? structuredClone(doc) : undefined;
    }
}
