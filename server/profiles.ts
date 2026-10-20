import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { atomicJson } from './atomic-json.ts';
import { UUID } from './identity.ts';
import { parseCharacterProfile, type ProfileRecord, type PublicCharacterProfile } from '../src/character/profile.ts';

interface LoadedProfile { record: ProfileRecord; malformed?: string }
type ProfileListener = (visitor: string, profile: PublicCharacterProfile) => void;

/** Profiles have their own revision and files; resetting progress never touches them. */
export class ProfileStore {
    private readonly directory: string;
    private readonly queues = new Map<string, Promise<unknown>>();
    private readonly listeners = new Set<ProfileListener>();
    constructor(dataDir: string) { this.directory = join(dataDir, 'profiles'); }
    private path(visitor: string): string {
        if (!UUID.test(visitor)) throw new Error('Invalid visitor identity');
        return join(this.directory, `${visitor}.json`);
    }
    private async serial<T>(visitor: string, work: () => Promise<T>): Promise<T> {
        const previous = this.queues.get(visitor) ?? Promise.resolve();
        const next = previous.catch(() => {}).then(work);
        this.queues.set(visitor, next);
        try { return await next; }
        finally { if (this.queues.get(visitor) === next) this.queues.delete(visitor); }
    }
    private async read(visitor: string): Promise<LoadedProfile> {
        let raw: string;
        try { raw = await readFile(this.path(visitor), 'utf8'); }
        catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
            return { record: { profile: null, revision: 0 } };
        }
        try {
            const stored = JSON.parse(raw) as Record<string, unknown>;
            const profile = parseCharacterProfile(stored?.profile);
            if (stored?.version === 1 && Number.isSafeInteger(stored.revision) && (stored.revision as number) >= 1 && profile)
                return { record: { profile, revision: stored.revision as number } };
        } catch { /* A malformed profile must not make the game or its progress unusable. */ }
        return { record: { profile: null, revision: 0 }, malformed: raw };
    }
    load(visitor: string): Promise<ProfileRecord> {
        return this.serial(visitor, async () => (await this.read(visitor)).record);
    }
    async save(visitor: string, profile: PublicCharacterProfile, revision: number): Promise<{ ok: boolean; record: ProfileRecord }> {
        const validated = parseCharacterProfile(profile);
        if (!validated || !Number.isSafeInteger(revision) || revision < 0) throw new Error('Invalid character profile');
        return this.serial(visitor, async () => {
            const current = await this.read(visitor);
            if (current.record.revision !== revision) return { ok: false, record: current.record };
            const next = { profile: validated, revision: revision + 1 };
            if (!Number.isSafeInteger(next.revision)) throw new Error('Character revision limit reached');
            await mkdir(this.directory, { recursive: true });
            // Read-only recovery never mutates files. Explicit replacement keeps the old bytes.
            if (current.malformed !== undefined)
                await atomicJson(join(this.directory, `${visitor}.recovery.json`), { recoveredAt: new Date().toISOString(), raw: current.malformed });
            await atomicJson(this.path(visitor), { version: 1, ...next, updatedAt: new Date().toISOString() });
            for (const listener of this.listeners) {
                try { listener(visitor, { ...validated }); }
                catch { /* Presentation subscribers must not turn a durable save into a failure. */ }
            }
            return { ok: true, record: next };
        });
    }
    subscribe(listener: ProfileListener): () => void {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
}
