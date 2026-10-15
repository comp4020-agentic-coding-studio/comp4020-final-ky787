import { DraftSessionRegistry } from './draft-registry.ts';
import { serializeDraft } from '../src/workbench/model.ts';
import { requirePlayable } from '../src/workbench/validation.ts';

export const PUBLIC_DRAFT_LIMITS = {
    rooms: 8, bytes: 256_000, memory: 2_000_000, snapshotsPerVisitor: 3,
    lifetimeMs: 2 * 60 * 60_000, abandonedMs: 5 * 60_000, stagingMs: 2 * 60_000,
    windowMs: 60_000, visitorCreates: 3, globalCreates: 12,
    visitorReads: 12, globalReads: 64,
} as const;
export class PublicDraftError extends Error {
    readonly status: number;
    constructor(message: string, status = 400) { super(message); this.status = status; }
}
/** Grants belong to uploaders; only room membership permits downloading a snapshot. */
export class PublicDraftRegistry extends DraftSessionRegistry {
    readonly temporary = true;
    private grants = new Map<string, { owner: string; hash: string; expires: number }>();
    private references = new Map<string, { owner: string; hash: string }>();
    private sizes = new Map<string, number>();
    private attempts: { owner: string; at: number }[] = [];
    private reads: { owner: string; at: number }[] = [];
    private registering = false;
    private now: () => number;
    constructor(now = Date.now) { super(); this.now = now; }
    stats() { return { snapshots: this.sizes.size, bytes: [...this.sizes.values()].reduce((a, b) => a + b, 0), rooms: this.references.size, grants: this.grants.size }; }
    sweep() {
        const now = this.now();
        this.attempts = this.attempts.filter(a => now - a.at < PUBLIC_DRAFT_LIMITS.windowMs);
        this.reads = this.reads.filter(a => now - a.at < PUBLIC_DRAFT_LIMITS.windowMs);
        for (const [key, grant] of this.grants) if (grant.expires <= now) this.grants.delete(key);
        const retained = new Set([...this.grants.values(), ...this.references.values()].map(r => r.hash));
        for (const hash of this.sizes.keys()) if (!retained.has(hash)) { this.sizes.delete(hash); this.remove(hash); }
    }
    async registerFor(owner: string, value: unknown) {
        this.sweep();
        const l = PUBLIC_DRAFT_LIMITS;
        if (this.registering || this.attempts.length >= l.globalCreates || this.attempts.filter(a => a.owner === owner).length >= l.visitorCreates)
            throw new PublicDraftError('Custom level creation is busy. Please wait a minute and retry.', 429);
        this.attempts.push({ owner, at: this.now() });
        if (this.references.size >= l.rooms) throw new PublicDraftError('All custom rooms are in use. Try again later.', 503);
        const owned = [...this.grants.values(), ...this.references.values()].filter(r => r.owner === owner);
        if (owned.length >= l.snapshotsPerVisitor) throw new PublicDraftError('Your temporary session limit is reached. Leave old sessions and wait five minutes.', 429);
        this.registering = true;
        try {
            const document = requirePlayable(value);
            const bytes = Buffer.byteLength(serializeDraft(document));
            if (bytes > l.bytes) throw new PublicDraftError('Custom multiplayer drafts must be at most 256 KB.', 413);
            if (bytes + this.stats().bytes > l.memory) throw new PublicDraftError('Custom snapshot memory is full. Try again later.', 503);
            const exit = document.geometry.objects.find(o => o.type === 'exit');
            if (exit?.type !== 'exit' || !exit.latch || exit.arrivals !== 2)
                throw new PublicDraftError('Set the exit to Latch unlock and Physical arrivals: 2 before playing with a friend.');
            const result = await this.register(document);
            this.sizes.set(result.hash, bytes);
            this.grants.set(`${owner}:${result.hash}`, { owner, hash: result.hash, expires: this.now() + l.stagingMs });
            return result;
        } finally { this.registering = false; }
    }
    canCreate(hash: string, owner: string) {
        this.sweep();
        return this.references.size < PUBLIC_DRAFT_LIMITS.rooms && this.grants.has(`${owner}:${hash}`);
    }
    allowRead(owner: string) {
        this.sweep();
        if (this.reads.length >= PUBLIC_DRAFT_LIMITS.globalReads || this.reads.filter(a => a.owner === owner).length >= PUBLIC_DRAFT_LIMITS.visitorReads) return false;
        this.reads.push({ owner, at: this.now() }); return true;
    }
    retain(hash: string, owner: string, code: string) {
        this.grants.delete(`${owner}:${hash}`);
        this.references.set(code, { hash, owner });
    }
    release(code: string) { this.references.delete(code); this.sweep(); }
}
