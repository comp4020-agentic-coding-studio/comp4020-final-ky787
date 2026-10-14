import { canonicalRecord, DraftConflict, portableName, type DraftEntry, type DraftStorageBackend, type RecoveryDraft, type StoredDraft } from './storage.ts';
import type { DraftDocument } from './model.ts';

export const BROWSER_DATABASE = 'binary-ninja-level-builder';
export const BROWSER_DATABASE_VERSION = 1;
type Row = StoredDraft & { updatedAt: number };
const request = <T>(req: IDBRequest<T>) => new Promise<T>((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
const complete = (tx: IDBTransaction) => {
    const done = new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error ?? new Error('Browser storage transaction aborted. Nothing was saved.')); tx.onerror = () => {}; });
    // A failed request may throw before callers reach await done; still observe abort.
    void done.catch(() => {}); return done;
};
/** Only browser primitives; no network, visitor progress, filesystem or local-service fallback. */
export class BrowserDraftStorage implements DraftStorageBackend {
    readonly kind = 'browser' as const;
    readonly capabilities = { manage: true, coop: false, trustedImports: false };
    private db: IDBDatabase | null = null;
    async initialize() {
        if (!globalThis.indexedDB) throw new Error('IndexedDB is unavailable in this browser. You can still edit, playtest and Export JSON.');
        this.db = await new Promise<IDBDatabase>((resolve, reject) => {
            const opening = indexedDB.open(BROWSER_DATABASE, BROWSER_DATABASE_VERSION);
            let failed = false;
            const fail = (error: Error) => { failed = true; clearTimeout(timer); reject(error); };
            const timer = setTimeout(() => fail(new Error('Browser storage did not open. Close other builder tabs, reload, or Export JSON.')), 5000);
            opening.onblocked = () => fail(new Error('Browser storage upgrade is blocked by another tab. Close other builder tabs and reload. Editing and Export JSON remain available.'));
            opening.onerror = () => fail(opening.error ?? new Error('Unable to open browser storage.'));
            opening.onupgradeneeded = () => {
                // Additive, versioned migrations: never delete existing drafts during an upgrade.
                const db = opening.result;
                if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('recovery')) db.createObjectStore('recovery', { keyPath: 'id' });
            };
            opening.onsuccess = () => {
                clearTimeout(timer);
                if (failed) { opening.result.close(); return; }
                const db = opening.result;
                db.onversionchange = () => { db.close(); this.db = null; };
                db.onclose = () => { if (this.db === db) this.db = null; };
                resolve(db);
            };
        });
        return { engineRevision: `public:${new URL(import.meta.url).pathname}`, location: 'this browser', gameUrl: '/' };
    }
    private transaction(store: string, mode: IDBTransactionMode = 'readonly') {
        if (!this.db) throw new DOMException('Browser storage is closed. Export JSON and reload.', 'InvalidStateError');
        return this.db.transaction(store, mode);
    }
    async list(): Promise<DraftEntry[]> {
        const tx = this.transaction('drafts'), done = complete(tx);
        const rows: Row[] = await request(tx.objectStore('drafts').getAll()); await done;
        return rows.sort((a, b) => b.updatedAt - a.updatedAt).map(({ id, name }) => ({ id, name }));
    }
    async load(id: string): Promise<StoredDraft> {
        const tx = this.transaction('drafts'), done = complete(tx);
        const row: Row | undefined = await request(tx.objectStore('drafts').get(id)); await done;
        if (!row) throw new DraftConflict('This draft was deleted in another tab. Save a copy to keep your edits.');
        const canonical = await canonicalRecord(row.document);
        if (canonical.hash !== row.hash) throw new Error('Stored draft hash mismatch. The saved draft has not been replaced.');
        return { ...row, ...canonical };
    }
    async save(input: Parameters<DraftStorageBackend['save']>[0]): Promise<StoredDraft> {
        // Hash BEFORE opening the transaction: async crypto must not let IDB auto-commit.
        const canonical = await canonicalRecord(input.document);
        const tx = this.transaction('drafts', 'readwrite'), done = complete(tx), store = tx.objectStore('drafts');
        const rows: Row[] = await request(store.getAll());
        const old = input.id ? rows.find(r => r.id === input.id) : undefined;
        if (input.id && (!old || old.revision !== input.revision || old.hash !== input.expectedHash)) {
            tx.abort(); throw new DraftConflict('Draft changed in another tab. Reload or Save copy; newer work was not overwritten.', old);
        }
        const id = old?.id ?? crypto.randomUUID();
        let name = portableName(input.name);
        if (!old) { const base = name.replace(/\.json$/, ''); let suffix = 2; while (rows.some(r => r.name === name)) name = `${base}-${suffix++}.json`; }
        const row: Row = { ...canonical, id, name, revision: String(Number(old?.revision ?? 0) + 1), updatedAt: Date.now() };
        store.put(row); await done; return row;
    }
    async rename(id: string, name: string, revision: string): Promise<StoredDraft> {
        const tx = this.transaction('drafts', 'readwrite'), done = complete(tx), store = tx.objectStore('drafts');
        const rows: Row[] = await request(store.getAll()), old = rows.find(r => r.id === id);
        if (!old || old.revision !== revision) { tx.abort(); throw new DraftConflict('Draft changed in another tab. Reload before renaming.', old); }
        const nextName = portableName(name);
        if (rows.some(r => r.id !== id && r.name === nextName)) { tx.abort(); throw new Error('That name is already used. Choose another draft name.'); }
        const row = { ...old, name: nextName, revision: String(Number(old.revision) + 1), updatedAt: Date.now() };
        store.put(row); await done; return row;
    }
    async delete(id: string, revision: string) {
        const tx = this.transaction('drafts', 'readwrite'), done = complete(tx), store = tx.objectStore('drafts');
        const old: Row | undefined = await request(store.get(id));
        if (!old || old.revision !== revision) { tx.abort(); throw new DraftConflict('Draft changed in another tab. Reload before deleting.', old); }
        store.delete(id); await done;
    }
    importJSON(document: DraftDocument, name: string) { return this.save({ id: null, name, document, expectedHash: null, revision: null }); }
    async recoveries(): Promise<RecoveryDraft[]> {
        const tx = this.transaction('recovery'), done = complete(tx);
        const rows: RecoveryDraft[] = await request(tx.objectStore('recovery').getAll()); await done;
        return rows.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    async recover(record: RecoveryDraft) {
        const { document } = await canonicalRecord(record.document);
        const tx = this.transaction('recovery', 'readwrite'), done = complete(tx);
        // One bounded document per editing session/draft. Never store physics recordings.
        tx.objectStore('recovery').put({ ...record, document }); await done;
    }
    async clearRecovery(id: string, expectedUpdatedAt?: number) {
        const tx = this.transaction('recovery', 'readwrite'), done = complete(tx);
        const store = tx.objectStore('recovery');
        const old: RecoveryDraft | undefined = await request(store.get(id));
        if (old && (expectedUpdatedAt === undefined || old.updatedAt === expectedUpdatedAt)) store.delete(id);
        await done;
    }
}
