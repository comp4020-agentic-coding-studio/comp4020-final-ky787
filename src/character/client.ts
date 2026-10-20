import { parseCharacterProfile, type PublicCharacterProfile } from './profile.ts';

interface ProfileRecord {
    profile: PublicCharacterProfile | null;
    revision: number;
}

function readRecord(value: unknown): ProfileRecord | null {
    if (!value || typeof value !== 'object') return null;
    const record = value as Record<string, unknown>;
    if (!Number.isSafeInteger(record.revision) || (record.revision as number) < 0) return null;
    const profile = record.profile === null ? null : parseCharacterProfile(record.profile);
    if (record.profile !== null && !profile) return null;
    return { profile, revision: record.revision as number };
}

/** Cosmetic profiles use the existing HTTP-only visitor cookie, independently of progress. */
export class CharacterProfileClient {
    profile: PublicCharacterProfile | null = null;
    revision = 0;
    ready = false;
    persisted = false;

    async load(): Promise<PublicCharacterProfile | null> {
        try {
            const response = await fetch('/api/profile', { credentials: 'same-origin', signal: AbortSignal.timeout(5000) });
            const record = response.ok ? readRecord(await response.json()) : null;
            if (!record) throw new Error();
            this.profile = record.profile;
            this.revision = record.revision;
            this.ready = true;
            this.persisted = record.profile !== null;
            return this.profile;
        } catch {
            this.ready = false;
            throw new Error('Character service unavailable. Retry, or play with a character saved only for this visit.');
        }
    }

    async save(profile: PublicCharacterProfile): Promise<PublicCharacterProfile> {
        const clean = parseCharacterProfile(profile);
        if (!clean) throw new Error('Enter a valid operative name and choose one of the available colours.');
        // A guest session can retry saving after the service recovers. Establish the
        // current revision first without replacing its unsaved selected character.
        if (!this.ready) {
            const previous = this.profile;
            await this.load();
            this.profile = previous;
            this.persisted = false;
        }
        try {
            const response = await fetch('/api/profile', {
                method: 'PUT', credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile: clean, revision: this.revision }),
                signal: AbortSignal.timeout(5000),
            });
            if (response.status === 409) {
                const record = readRecord((await response.json()).record);
                if (record) {
                    this.profile = record.profile;
                    this.revision = record.revision;
                    this.persisted = record.profile !== null;
                }
                throw new Error('Your character changed in another tab. Review your choices, then save again to replace that version.');
            }
            const record = response.ok ? readRecord(await response.json()) : null;
            if (!record?.profile) throw new Error('Character could not be saved. Retry when the connection is available.');
            this.profile = record.profile;
            this.revision = record.revision;
            this.persisted = true;
            this.ready = true;
            return record.profile;
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('Your character changed')) throw error;
            throw new Error('Character could not be saved. Retry when the connection is available.');
        }
    }

    useGuest(profile: PublicCharacterProfile): void {
        const clean = parseCharacterProfile(profile);
        if (!clean) throw new Error('Invalid guest character.');
        this.profile = clean;
        this.persisted = false;
    }
}
