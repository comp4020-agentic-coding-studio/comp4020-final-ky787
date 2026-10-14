/** Loaded exclusively by the actual loopback workbench's Vite configuration. */
import { DraftConflict, type DraftStorageBackend, type RecoveryDraft, type StoredDraft } from './storage.ts';
import type { DraftDocument, DraftDiagnostic } from './model.ts';
type FileRecord = { document: DraftDocument; hash: string; diagnostics: DraftDiagnostic[] };
export class LocalDraftStorage implements DraftStorageBackend {
    readonly kind = 'filesystem' as const;
    readonly capabilities = { manage: false, coop: true, trustedImports: true };
    private token = '';
    private record(name: string, r: FileRecord): StoredDraft { return { ...r, id: name, name, revision: r.hash }; }
    private async request<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
        const response = await fetch(`/api/workbench/${path}`, body === undefined ? undefined : { method, headers: { 'Content-Type': 'application/json', 'X-Workbench-Token': this.token }, body: JSON.stringify(body) });
        const value = await response.json();
        if (!response.ok) {
            if (response.status === 409) throw new DraftConflict(value.error, value.record ? this.record(new URLSearchParams(path.split('?')[1]).get('name') ?? '', value.record) : undefined);
            throw new Error(value.error ?? `Request failed (${response.status})`);
        }
        return value;
    }
    async initialize() {
        const boot = await this.request<{ token: string; draftRoot: string; engineRevision: string; gameUrl?: string }>('bootstrap');
        this.token = boot.token;
        let gameUrl: string | undefined;
        try { const url = new URL(boot.gameUrl ?? ''); if (url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && !url.username && !url.password) gameUrl = url.href; } catch { /* standalone */ }
        return { engineRevision: boot.engineRevision, location: boot.draftRoot, gameUrl };
    }
    async list() { return (await this.request<{ files: string[] }>('files')).files.map(name => ({ id: name, name })); }
    async load(id: string) { return this.record(id, await this.request<FileRecord>(`drafts?name=${encodeURIComponent(id)}`)); }
    async save(input: Parameters<DraftStorageBackend['save']>[0]) {
        return this.record(input.name, await this.request<FileRecord>(`drafts?name=${encodeURIComponent(input.name)}`, { document: input.document, expectedHash: input.id ? input.expectedHash : null }, 'PUT'));
    }
    async rename(): Promise<StoredDraft> { throw new Error('Rename project files with your filesystem tools.'); }
    async delete(): Promise<void> { throw new Error('Delete project files with your filesystem tools.'); }
    async importJSON(): Promise<null> { return null; }
    async recoveries(): Promise<RecoveryDraft[]> {
        const r = await this.request<{ document: DraftDocument; name: string; expectedHash: string | null } | null>('recovery');
        return r ? [{ ...r, id: 'local', draftId: r.expectedHash ? r.name : null, revision: r.expectedHash, updatedAt: 0 }] : [];
    }
    async recover(record: RecoveryDraft) { await this.request('recovery', record, 'PUT'); }
    async clearRecovery() { await this.request('recovery', {}, 'DELETE'); }
    async importRoom(factory: string) { return (await this.request<FileRecord>('import', { controller: factory })).document; }
    async freeze(document: DraftDocument) { return (await this.request<{ hash: string }>('snapshots', { document })).hash; }
}
