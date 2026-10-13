import { describe, it, expect } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DraftStorage, draftName } from '../scripts/level-tools/storage.ts';
import { newDraft, serializeDraft, draftHash } from '../src/workbench/model.ts';

describe('workbench canonical storage', () => {
    it('preserves array order, normalizes formatting and detects external edits without overwriting either copy', async () => {
        const directory = await mkdtemp(join(tmpdir(), 'bn-drafts-'));
        try {
            const storage = new DraftStorage(directory), doc = newDraft('storage');
            const first = await storage.write('storage.json', doc, null);
            expect(first.hash).toBe(await draftHash(doc));
            const original = serializeDraft(doc);
            expect(await readFile(join(directory, 'storage.json'), 'utf8')).toBe(original);
            const external = structuredClone(doc); external.title = 'AGENT EDIT';
            await writeFile(join(directory, 'storage.json'), JSON.stringify(external));
            const human = structuredClone(doc); human.title = 'GUI EDIT';
            await expect(storage.write('storage.json', human, first.hash)).rejects.toMatchObject({ status: 409 });
            expect((await storage.read('storage.json')).document.title).toBe('AGENT EDIT');
            await storage.write('human-copy.json', human, null);
            expect((await storage.read('human-copy.json')).document.title).toBe('GUI EDIT');
            expect((await storage.read('storage.json')).document.geometry.objects.map(o => o.id)).toEqual(doc.geometry.objects.map(o => o.id));
            expect(serializeDraft(doc)).toBe(original);
        } finally { await rm(directory, { recursive: true, force: true }); }
    });
    it('confines names and rejects symlink reads and writes', async () => {
        for (const name of ['../outside.json', '/tmp/out.json', 'a/b.json', 'a%2fb.json', '..json', 'room.ts']) expect(() => draftName(name)).toThrow();
        const directory = await mkdtemp(join(tmpdir(), 'bn-drafts-'));
        try {
            const storage = new DraftStorage(join(directory, 'drafts')); await storage.ready();
            const outside = join(directory, 'outside.json'); await writeFile(outside, serializeDraft(newDraft('outside')));
            await symlink(outside, join(storage.root, 'escape.json'));
            await expect(storage.read('escape.json')).rejects.toMatchObject({ status: 403 });
            await expect(storage.write('escape.json', newDraft('escape'), null)).rejects.toMatchObject({ status: 403 });
            expect((JSON.parse(await readFile(outside, 'utf8')) as { id: string }).id).toBe('outside');
        } finally { await rm(directory, { recursive: true, force: true }); }
    });
    it('serializes concurrent expected-hash writes and saves incomplete drafts without defaulting their logic', async () => {
        const directory = await mkdtemp(join(tmpdir(), 'bn-drafts-'));
        try {
            const storage = new DraftStorage(directory), doc = newDraft('incomplete');
            doc.bindings[0].output = 'missing';
            const a = await storage.write('incomplete.json', doc, null);
            expect(a.diagnostics.some(d => d.severity === 'error')).toBe(true);
            const results = await Promise.allSettled([storage.write('incomplete.json', { ...doc, title: 'A' }, a.hash), storage.write('incomplete.json', { ...doc, title: 'B' }, a.hash)]);
            expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
            expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
        } finally { await rm(directory, { recursive: true, force: true }); }
    });
});
