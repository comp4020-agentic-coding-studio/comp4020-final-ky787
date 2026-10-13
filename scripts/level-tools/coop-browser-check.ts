/** Browser integration diagnostic: frozen geometry/restart/stale traffic, not a solved route. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { coopBrowser, type Cdp } from '../coop-browser.ts';
import { startWorkbench } from './service.ts';
import { requirePlayable } from '../../src/workbench/validation.ts';
import type { DraftDocument } from '../../src/workbench/model.ts';
const reports = resolve('.workbench/reports/frozen-session');
await mkdir(reports, { recursive: true });
const h = await coopBrowser({ shots: reports, internalLabs: false, readyExpression: '!!globalThis.draftRunner?.ready' });
const app = await startWorkbench({ port: 0, draftRoot: join(h.temporary, 'drafts'), dataDir: join(h.temporary, 'workbench') });
const checks: string[] = [];
async function wait(page: Cdp, label: string, expression: string) {
    for (let i = 0; i < 200; i++) { if (page.errors.length) throw new Error(page.errors.join('\n')); if (await page.read<boolean>(expression)) { checks.push(label); return; } await h.sleep(30); }
    throw new Error(`${label}: ${JSON.stringify(await page.read('draftRunner.observe()'))}`);
}
try {
    const document: DraftDocument = requirePlayable(JSON.parse(await readFile('levels/drafts/cooperative-test.json', 'utf8')));
    const saved = await app.storage.write('frozen-copy.json', document, null), first = await app.registry.register(saved.document), browser = await h.launch();
    const a = await h.page(`${app.origin}/workbench-runner.html?coopHash=${first.hash}`, browser);
    await wait(a, 'host restart requires an explicit saved-draft choice', "document.querySelector('#latest').value===''&&document.querySelector('#restart').disabled===true");
    const code = await a.read<string>('draftRunner.observe().session.code');
    const b = await h.page(`${app.origin}/workbench-runner.html?code=${code}`, browser);
    await wait(a, 'two actual identities join one frozen hash', `draftRunner.observe().session.peers.every(Boolean)&&draftRunner.observe().hash===${JSON.stringify(first.hash)}`);
    const identities = await Promise.all([a, b].map(p => p.read('draftRunner.observe().session.visitor')));
    if (identities[0] === identities[1]) throw new Error('Browser identities were not isolated');
    const changed = structuredClone(document), platform = changed.geometry.objects.find(o => o.id === 'swingAnchor')!;
    platform.x += 40;
    const updated = await app.storage.write('frozen-copy.json', changed, saved.hash), next = await app.registry.register(updated.document);
    for (const p of [a, b]) await wait(p, 'saved edit leaves live collision geometry frozen', `draftRunner.observe().hash===${JSON.stringify(first.hash)}&&draftRunner.observe().platforms.find(p=>p.id==='swingAnchor')?.x===780`);
    await h.shot(a, 'before-explicit-restart');
    await a.read("(()=>{const select=document.querySelector('#latest');select.value='frozen-copy.json';select.dispatchEvent(new Event('change',{bubbles:true}));return select.value;})()");
    await wait(a, 'choosing the saved draft enables host restart', "document.querySelector('#restart').disabled===false");
    await h.click(a, '#restart');
    for (const p of [a, b]) await wait(p, 'explicit host restart loads new hash and generation on both clients', `draftRunner.observe().session.generation===2&&draftRunner.observe().hash===${JSON.stringify(next.hash)}&&draftRunner.observe().platforms.find(p=>p.id==='swingAnchor')?.x===820`);
    // Deliberately stale protocol traffic is rejection diagnostics; no successful route uses injected state.
    await a.read(`(()=>{const c=draftRunner.session().client;const seq=++c.actionSeq;c.socket.send(JSON.stringify({type:'control',control:'draft:routeLever',seq,levelInstance:1}));c.socket.send(JSON.stringify({type:'cube',cubeId:'draft:payload',epoch:c.room.cubes['draft:payload'].epoch,seq:999999,levelInstance:1,transform:{x:999,y:1,vx:0,vy:0,grounded:true}}));c.socket.send(JSON.stringify({type:'avatar',seq:999999,levelInstance:1,avatar:{x:999,y:1,vx:0,vy:0,facing:1,grounded:true,rope:null}}));return true;})()`);
    await h.sleep(400);
    for (const p of [a, b]) await wait(p, 'previous-instance control and cube transforms remain rejected', "draftRunner.observe().exitUnlocked===false&&draftRunner.observe().cubes['draft:payload'].x<400");
    await wait(b, 'previous-instance avatar does not replace remote stream', "draftRunner.session().client.remote.latest()?.x<400");
    await h.shot(a, 'after-explicit-restart');
    const result = { pass: true, scope: 'session-isolation-diagnostic', engineRevision: app.engineRevision, checks, oldHash: first.hash, newHash: next.hash, identitiesDistinct: true,
        note: 'Physical completion is checked separately by levels/scenarios/cooperative-test.json.' };
    await writeFile(join(reports, 'report.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
} catch (error) {
    for (let i = 0; i < h.clients.length; i++) await h.shot(h.clients[i], `failure-${i}`).catch(() => {});
    await writeFile(join(reports, 'report.json'), JSON.stringify({ pass: false, scope: 'session-isolation-diagnostic', checks, error: String(error) }, null, 2) + '\n');
    throw error;
} finally { await h.cleanup(); await app.close(); }
