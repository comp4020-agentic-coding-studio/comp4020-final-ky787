import { it, expect } from 'vitest';
import { request } from 'node:http';
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

// Node fetch overwrites Sec-Fetch-Mode, so send browser metadata exactly here.
function requestStatus(url: string, headers: Record<string, string>, method = 'GET'): Promise<number> {
    return new Promise((resolve, reject) => {
        const req = request(url, { method, headers }, response => { response.resume(); response.once('end', () => resolve(response.statusCode!)); });
        req.once('error', reject); req.end();
    });
}

it('allows clicked or trusted-game top-level editor navigation and keeps APIs and embeds isolated', async () => {
    const root = await mkdtemp(join(tmpdir(), 'bn-workbench-navigation-'));
    let gameUrl: string | undefined;
    const app = await startWorkbench({ port: 0, draftRoot: join(root, 'drafts'), dataDir: join(root, 'wb'), frontend: false, gameUrl: () => gameUrl });
    const navigation = { 'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document', 'Sec-Fetch-User': '?1' };
    try {
        for (const path of ['/', '/workbench.html']) {
            // Security accepts the document request; this test deliberately has no frontend.
            expect(await requestStatus(app.origin + path, navigation)).toBe(404);
            for (const headers of [
                { ...navigation, 'Sec-Fetch-User': '?0' },
                { ...navigation, 'Sec-Fetch-Mode': 'cors' },
                { ...navigation, 'Sec-Fetch-Dest': 'iframe' },
                { ...navigation, Origin: 'http://localhost:5173' },
                { ...navigation, Host: 'localhost:' + new URL(app.origin).port },
            ]) expect(await requestStatus(app.origin + path, headers)).toBe(403);
            expect(await requestStatus(app.origin + path, navigation, 'POST')).toBe(403);
            expect(await requestStatus(app.origin + path, navigation, 'HEAD')).toBe(403);
        }
        for (const path of ['/api/workbench/bootstrap', '/api/workbench/drafts?name=a.json', '/api/identity', '/workbench-runner.html'])
            expect(await requestStatus(app.origin + path, navigation)).toBe(403);
        const missingUser = { 'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document' };
        expect(await requestStatus(app.origin + '/', missingUser)).toBe(403);
        expect((await (await fetch(app.origin + '/api/workbench/bootstrap')).json()).gameUrl).toBeUndefined();
        gameUrl = 'http://localhost:5299/';
        expect((await (await fetch(app.origin + '/api/workbench/bootstrap')).json()).gameUrl).toBe(gameUrl);
        const delayedGameNavigation = { ...missingUser, Referer: gameUrl };
        for (const path of ['/', '/workbench.html']) {
            expect(await requestStatus(app.origin + path, delayedGameNavigation)).toBe(404);
            expect(await requestStatus(app.origin + path, { ...missingUser, Referer: gameUrl + '?saved=1' })).toBe(404);
            for (const referer of ['http://localhost:5298/', 'http://127.0.0.1:5299/', 'https://localhost:5299/', 'https://unrelated.test/',
                'http://localhost:5299.unrelated.test/', 'not a URL', '//localhost:5299/', ''])
                expect(await requestStatus(app.origin + path, { ...missingUser, Referer: referer })).toBe(403);
            expect(await requestStatus(app.origin + path, { ...delayedGameNavigation, Origin: gameUrl.slice(0, -1) })).toBe(403);
            expect(await requestStatus(app.origin + path, { ...delayedGameNavigation, 'Sec-Fetch-Dest': 'iframe' })).toBe(403);
            expect(await requestStatus(app.origin + path, { ...delayedGameNavigation, 'Sec-Fetch-Mode': 'cors' })).toBe(403);
            expect(await requestStatus(app.origin + path, delayedGameNavigation, 'POST')).toBe(403);
        }
        for (const path of ['/api/workbench/bootstrap', '/api/workbench/drafts?name=a.json', '/api/identity', '/workbench-runner.html'])
            expect(await requestStatus(app.origin + path, delayedGameNavigation)).toBe(403);
        for (const configured of ['https://localhost:5299/', 'http://unrelated.test:5299/', 'malformed']) {
            gameUrl = configured;
            expect(await requestStatus(app.origin + '/', { ...missingUser, Referer: configured })).toBe(403);
        }

        expect(await requestStatus(app.origin + '/api/workbench/recovery', { ...navigation, Origin: app.origin, 'X-Workbench-Token': app.token }, 'DELETE')).toBe(403);
    } finally { await app.close(); await rm(root, { recursive: true, force: true }); }
});
