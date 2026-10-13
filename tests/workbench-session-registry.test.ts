import { expect, it } from 'vitest';
import { DraftSessionRegistry } from '../scripts/level-tools/session-registry.ts';
import { draftHash, newDraft, serializeDraft } from '../src/workbench/model.ts';

it('freezes validated snapshot before async hashing, independent of caller edits', async () => {
    const registry = new DraftSessionRegistry(), document = newDraft('freeze-at-entry');
    const original = serializeDraft(document), expectedHash = await draftHash(document);
    const pending = registry.register(document);
    document.title = 'CHANGED WHILE HASHING';
    document.geometry.objects[0].x += 40;
    const record = await pending, frozen = registry.document(record.hash)!;
    expect(record.hash).toBe(expectedHash);
    expect(await draftHash(frozen)).toBe(record.hash);
    expect(serializeDraft(frozen)).toBe(original);
    frozen.title = 'CHANGED RETURNED COPY';
    expect(serializeDraft(registry.document(record.hash)!)).toBe(original);
});
