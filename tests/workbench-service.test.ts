import { it, expect } from 'vitest';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startWorkbench } from '../scripts/level-tools/service.ts';
import { newDraft } from '../src/workbench/model.ts';
import { createApp } from '../server/app.ts';

it('requires origin + capability for writes and never opens normal saves', async () => {
    const root = await mkdtemp(join(tmpdir(), 'bn-workbench-api-'));
    const app = await startWorkbench({ port: 0, draftRoot: join(root, 'drafts'), dataDir: join(root, 'wb'), frontend: false });
    try {
        const url = `${app.origin}/api/workbench/drafts?name=api.json`;
        const payload = JSON.stringify({ document: newDraft('api'), expectedHash: null });
        expect((await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: payload })).status).toBe(403);
        expect((await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Workbench-Token': app.token, Origin: 'https://unrelated.test' }, body: payload })).status).toBe(403);
        expect((await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Workbench-Token': app.token, Origin: app.origin }, body: payload })).status).toBe(200);
        expect((await fetch(`${app.origin}/api/workbench/bootstrap`, { headers: { Origin: 'https://unrelated.test' } })).status).toBe(403);
        expect((await fetch(`${app.origin}/api/progress`)).status).toBe(404);
        expect((await readdir(join(root, 'wb'))).some(name => /[a-f0-9]{8}-/.test(name))).toBe(false);
    } finally { await app.close(); await rm(root, { recursive: true, force: true }); }
});

it('production server has no workbench write or snapshot API', async () => {
    const root = await mkdtemp(join(tmpdir(), 'bn-no-workbench-'));
    const app = await createApp(join(root, 'data'), join(root, 'site'));
    await new Promise<void>(resolve => app.listen(0, '127.0.0.1', resolve));
    const address = app.address(); if (!address || typeof address === 'string') throw new Error('No address');
    const origin = `http://127.0.0.1:${address.port}`;
    try {
        for (const path of ['/api/workbench/bootstrap', '/api/workbench/snapshots', '/workbench.html', '/src/workbench/editor.ts']) expect((await fetch(origin + path)).status).toBe(404);
        expect((await fetch(`${origin}/api/workbench/drafts?name=x.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status).toBe(405);
    } finally { app.emit('shutdown'); app.closeAllConnections(); await new Promise<void>(resolve => app.close(() => resolve())); await rm(root, { recursive: true, force: true }); }
});
