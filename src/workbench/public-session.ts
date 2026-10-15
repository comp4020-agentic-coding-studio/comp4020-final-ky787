import { draftHash, serializeDraft, type DraftDocument } from './model.ts';
import { requirePlayable } from './validation.ts';

export async function freezePublicDraft(value: DraftDocument): Promise<string> {
    const document = requirePlayable(value), hash = await draftHash(document);
    const response = await fetch('/api/custom/snapshots', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: `{"document":${serializeDraft(document)}}`, signal: AbortSignal.timeout(15_000) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? 'Could not start a custom room. Please retry.');
    if (body.hash !== hash) throw new Error('Frozen snapshot hash mismatch. Please retry.');
    return hash;
}
