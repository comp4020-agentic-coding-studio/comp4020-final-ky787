import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, readdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { freshProgress } from '../src/slice/progress.ts';
const children: ChildProcess[] = [];
const dirs: string[] = [];
afterEach(async () => { for (const c of children)
    if (c.exitCode === null)
        c.kill('SIGKILL'); for (const dir of dirs)
    await rm(dir, { recursive: true, force: true }); });
async function start(dir: string): Promise<{
    child: ChildProcess;
    url: string;
}> {
    const child = spawn(process.execPath, ['server/app.ts'], { env: { ...process.env, PORT: '0', DATA_DIR: dir }, stdio: ['ignore', 'pipe', 'pipe'] });
    children.push(child);
    const url = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Server start timed out')), 5000);
        child.stdout!.on('data', b => { const match = String(b).match(/listening on (\d+)/); if (match) {
            clearTimeout(timeout);
            resolve(`http://127.0.0.1:${match[1]}`);
        } });
        child.once('error', reject);
        child.stderr!.on('data', () => { });
    });
    return { child, url };
}
async function stop(child: ChildProcess, signal: NodeJS.Signals = 'SIGTERM') { await new Promise<void>(r => { child.once('exit', () => r()); child.kill(signal); }); }
it('persists meaningful state and anonymous identity across actual process restart', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'bn-data-'));
    dirs.push(dir);
    let app = await start(dir);
    const response = await fetch(app.url + '/api/progress');
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    const initial = await response.json();
    expect(cookie).toContain('bn_visitor=');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    const progress = freshProgress();
    progress.currentRoom = 'relay';
    progress.completedRooms = ['pressure', 'switch'];
    progress.rooms.relay = { switchB: true, cubeOnPlate: true, checkpoint: 'relay' };
    progress.mechanics = ['carry', 'bridge'];
    progress.history = [{ room: 'relay', event: 'checkpoint', at: new Date().toISOString() }];
    const put = await fetch(app.url + '/api/progress', { method: 'PUT', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: 0, progress }) });
    expect(put.status).toBe(200);
    expect((await put.json()).revision).toBe(1);
    await stop(app.child, 'SIGKILL');
    app = await start(dir);
    const restored = await (await fetch(app.url + '/api/progress', { headers: { cookie } })).json();
    expect(restored.id).toBe(initial.id);
    expect(restored.progress).toEqual(progress);
    expect(restored.revision).toBe(1);
    expect((await readdir(dir)).filter(f => f.endsWith('.tmp'))).toEqual([]);
    const newVisitor = await (await fetch(app.url + '/api/progress')).json();
    expect(newVisitor.id).not.toBe(initial.id);
    expect(newVisitor.progress.currentRoom).toBe('pressure');
    const options = { method: 'PUT', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: 1, progress }) };
    const writes = await Promise.all([fetch(app.url + '/api/progress', options), fetch(app.url + '/api/progress', options)]);
    expect(writes.map(r => r.status).sort()).toEqual([200, 409]);
    const invalid = await fetch(app.url + '/api/progress', { ...options, body: JSON.stringify({ revision: 2, progress: { ...progress, currentRoom: '../../bad' } }) });
    expect(invalid.status).toBe(400);
    const large = await fetch(app.url + '/api/progress', { ...options, body: ' '.repeat(25000) });
    expect(large.status).toBe(413);
    const origin = await fetch(app.url + '/api/progress', { ...options, headers: { ...options.headers, origin: 'https://different.example' } });
    expect(origin.status).toBe(403);
    // Failed/corrupt reads must never silently reset and overwrite a previous save.
    const path = join(dir, `${initial.id}.json`);
    await writeFile(path, 'broken');
    const broken = await fetch(app.url + '/api/progress', { headers: { cookie } });
    expect(broken.status).toBe(503);
    expect(await readFile(path, 'utf8')).toBe('broken');
    await stop(app.child);
});
