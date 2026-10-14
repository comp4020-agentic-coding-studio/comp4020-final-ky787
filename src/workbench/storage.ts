import { cloneDraft, draftHash, DRAFT_LIMITS, serializeDraft, type DraftDocument, type DraftDiagnostic } from './model.ts';
import { parseDraft, validateDraft } from './validation.ts';

export interface DraftEntry { id: string; name: string }
export interface StoredDraft extends DraftEntry { document: DraftDocument; hash: string; revision: string; diagnostics: DraftDiagnostic[] }
export interface RecoveryDraft { id: string; draftId: string | null; name: string; document: DraftDocument; expectedHash: string | null; revision: string | null; updatedAt: number }
export interface StorageBoot { engineRevision: string; location: string; gameUrl?: string }
export interface DraftStorageBackend {
    readonly kind: 'browser' | 'filesystem';
    readonly capabilities: { manage: boolean; coop: boolean; trustedImports: boolean };
    initialize(): Promise<StorageBoot>;
    list(): Promise<DraftEntry[]>;
    load(id: string): Promise<StoredDraft>;
    save(input: { id: string | null; name: string; document: DraftDocument; expectedHash: string | null; revision: string | null }): Promise<StoredDraft>;
    rename(id: string, name: string, revision: string): Promise<StoredDraft>;
    delete(id: string, revision: string): Promise<void>;
    /** Browser imports create a fresh saved ID. Filesystem imports remain unsaved until an explicit Save. */
    importJSON(document: DraftDocument, name: string): Promise<StoredDraft | null>;
    recoveries(): Promise<RecoveryDraft[]>;
    recover(record: RecoveryDraft): Promise<void>;
    clearRecovery(id: string, expectedUpdatedAt?: number): Promise<void>;
    importRoom?(factory: string): Promise<DraftDocument>;
    freeze?(document: DraftDocument): Promise<string>;
}
export class DraftConflict extends Error {
    constructor(message: string, readonly record?: StoredDraft) { super(message); }
}
export async function canonicalRecord(value: unknown) {
    const document = cloneDraft(parseDraft(value));
    if (new TextEncoder().encode(serializeDraft(document)).byteLength > DRAFT_LIMITS.bytes) throw new Error('Canonical draft exceeds the 1 MB limit.');
    return { document, hash: await draftHash(document), diagnostics: validateDraft(document).diagnostics };
}
export function portableName(name: string): string {
    return (name.replace(/\.json$/i, '').replace(/[^A-Za-z0-9_-]/g, '-').replace(/^[^A-Za-z0-9]+/, '').slice(0, 65) || 'draft') + '.json';
}
export function storageMessage(error: unknown): string {
    const name = error instanceof Error ? error.name : '';
    if (name === 'QuotaExceededError') return 'Browser storage is full. Your current edits remain open. Export JSON, then free browser storage or delete unneeded drafts.';
    if (name === 'SecurityError' || name === 'InvalidStateError' || name === 'VersionError') return 'Browser storage is unavailable or has changed version. Export JSON to keep your work, then close other builder tabs and reopen.';
    return error instanceof Error ? error.message : String(error);
}
