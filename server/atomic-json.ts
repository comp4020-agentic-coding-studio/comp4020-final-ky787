import { randomUUID } from 'node:crypto';
import { open, rename, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
/** Single writer; acknowledgement follows file sync, rename and directory sync. */
export async function atomicJson(path: string, value: unknown): Promise<void> {
    const temp = `${path}.${randomUUID()}.tmp`;
    try {
        const file = await open(temp, 'wx', 0o600);
        try { await file.writeFile(JSON.stringify(value)); await file.sync(); }
        finally { await file.close(); }
        await rename(temp, path);
        const directory = await open(dirname(path), 'r');
        try { await directory.sync(); } finally { await directory.close(); }
    } finally { await unlink(temp).catch(() => {}); }
}
