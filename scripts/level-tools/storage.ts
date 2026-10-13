import { constants } from 'node:fs';
import { mkdir, lstat, realpath, open, rename, unlink, readdir } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { serializeDraft, draftHash, DRAFT_LIMITS } from '../../src/workbench/model.ts';
import { parseDraft, validateDraft } from '../../src/workbench/validation.ts';
import type { DraftDocument } from '../../src/workbench/model.ts';

export const MAX_DOCUMENT_BYTES = DRAFT_LIMITS.bytes;
export class StorageError extends Error {
    readonly status: number; readonly record?: DraftRecord;
    constructor(message: string, status: number, record?: DraftRecord) { super(message); this.status = status; this.record = record; }
}
export interface DraftRecord { document: DraftDocument; hash: string; diagnostics: ReturnType<typeof validateDraft>['diagnostics'] }
export async function draftRecord(value: unknown): Promise<DraftRecord> {
    const document = parseDraft(value);
    if (Buffer.byteLength(serializeDraft(document)) > MAX_DOCUMENT_BYTES) throw new StorageError('Draft exceeds 1,000,000 bytes', 413);
    return { document, hash: await draftHash(document), diagnostics: validateDraft(document).diagnostics };
}
/** Flat filenames deliberately avoid directory traversal and intermediate symlink races. */
export function draftName(value: string): string {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}\.json$/.test(value))
        throw new StorageError('Use a draft filename such as room-copy.json (letters, digits, _ and - only)', 400);
    return value;
}
export class DraftStorage {
    readonly root: string;
    private queue: Promise<unknown> = Promise.resolve();
    constructor(root = resolve('levels/drafts')) { this.root = resolve(root); }
    async ready(): Promise<void> {
        await mkdir(this.root, { recursive: true });
        if ((await lstat(this.root)).isSymbolicLink() || await realpath(this.root) !== this.root)
            throw new StorageError('Draft root must be a real directory without symlink parents', 403);
    }
    private path(name: string) { return join(this.root, draftName(name)); }
    async list(): Promise<string[]> {
        await this.ready();
        const entries = await readdir(this.root, { withFileTypes: true });
        return entries.filter(entry => entry.isFile() && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}\.json$/.test(entry.name)).map(entry => entry.name).sort();
    }
    async read(name: string): Promise<DraftRecord> {
        await this.ready();
        const path = this.path(name);
        let file;
        try { file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW); }
        catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new StorageError(`Draft not found: ${name}`, 404);
            if ((error as NodeJS.ErrnoException).code === 'ELOOP') throw new StorageError('Symlink draft files are not allowed', 403);
            throw error;
        }
        try {
            const info = await file.stat();
            if (!info.isFile()) throw new StorageError('Draft must be a regular file', 400);
            if (info.size > MAX_DOCUMENT_BYTES) throw new StorageError('Draft exceeds 1,000,000 bytes', 413);
            return await draftRecord(JSON.parse(await file.readFile('utf8')));
        } finally { await file.close(); }
    }
    async write(name: string, value: unknown, expectedHash: string | null): Promise<DraftRecord> {
        if (expectedHash !== null && !/^[a-f0-9]{64}$/.test(expectedHash)) throw new StorageError('expectedHash must be the last loaded SHA-256, or null for a new file', 400);
        const record = await draftRecord(value);
        const work = this.queue.catch(() => {}).then(async () => {
            await this.ready();
            const path = this.path(name);
            const current = async () => { try { return await this.read(name); } catch (error) { if (error instanceof StorageError && error.status === 404) return null; throw error; } };
            const check = async () => { const previous = await current(); if ((previous?.hash ?? null) !== expectedHash) throw new StorageError('Draft changed on disk. Reload or save a copy; the newer file was not overwritten.', 409, previous ?? undefined); };
            await check();
            const temporary = join(this.root, `.${basename(path)}.${randomUUID()}.tmp`);
            const file = await open(temporary, 'wx', 0o600);
            try {
                await file.writeFile(serializeDraft(record.document)); await file.sync(); await file.close();
                await check();
                await rename(temporary, path);
                const directory = await open(this.root, 'r'); try { await directory.sync(); } finally { await directory.close(); }
            } finally { await file.close().catch(() => {}); await unlink(temporary).catch(() => {}); }
            return record;
        });
        this.queue = work;
        return work;
    }
}
