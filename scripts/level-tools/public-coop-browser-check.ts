import { onboardNinja } from '../character-onboarding.ts';
/** Production-only UI + real-input acceptance. No player/cube/controller state injection. */
import { mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import { Cdp, coopBrowser } from '../coop-browser.ts';
import { draftHash, objectBounds, serializeDraft, type DraftDocument } from '../../src/workbench/model.ts';
import { conditionMatches, parseScenario, type ScenarioCondition } from './scenario.ts';

const reports = resolve('.workbench/reports/public-coop'); await mkdir(reports, { recursive: true });
const h = await coopBrowser({ shots: reports, internalLabs: false, readyExpression: '!!globalThis.customLevel?.observe().ready' });
const checks: string[] = [], pages: Cdp[] = [], measured: unknown[] = [];
let origin = '', debuggerUrl = '', root: Cdp, editor: Cdp, host: Cdp, guest: Cdp, authored: DraftDocument;
const check = (label: string, ok: unknown) => { if (!ok) throw new Error(label); checks.push(label); console.log(`PASS ${label}`); };
async function until(p: Cdp, expression: string, timeout = 15000) {
    const end = Date.now() + timeout;
    while (!await p.read<boolean>(expression)) { if (p.errors.length) throw new Error(p.errors.join('\n')); if (Date.now() > end) throw new Error(`Timeout ${expression}: ${JSON.stringify(await p.read('globalThis.customLevel?.observe()'))}`); await h.sleep(25); }
}
async function attach(id: string) {
    const p = await new Cdp(`${new URL(debuggerUrl).origin}/devtools/page/${id}`).open(); pages.push(p);
    await p.send('Runtime.enable'); await p.send('Page.enable'); await p.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
    return p;
}
async function page(path: string) { const { targetId } = await root.send('Target.createTarget', { url: origin + path }); return attach(targetId); }
async function field(p: Cdp, label: string, value: string) {
    await p.read(`(()=>{const l=[...document.querySelectorAll('#inspector label')].find(l=>l.firstChild.textContent.trim()===${JSON.stringify(label)});const e=l.querySelector('input,select');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
}
async function worldClick(p: Cdp, x: number, y: number) {
    const at = await p.read<{ x: number; y: number }>(`(()=>{const r=document.querySelector('#world').getBoundingClientRect(),c=workbench.snapshot().camera;return{x:r.x+r.width/2+(${x}-c.x)*c.zoom,y:r.y+r.height/2+(${y}-c.y)*c.zoom}})()`);
    for (const type of ['mousePressed', 'mouseReleased']) await p.send('Input.dispatchMouseEvent', { type, ...at, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
}
async function openHost(p: Cdp, selector: string) {
    const before = new Set((await root.send('Target.getTargets')).targetInfos.map((t: { targetId: string }) => t.targetId));
    await h.click(p, selector);
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
        const target = (await root.send('Target.getTargets')).targetInfos.find((t: { targetId: string; url: string }) => !before.has(t.targetId) && t.url.includes('/custom-level.html'));
        if (target) { const result = await attach(target.targetId); await until(result, '!!globalThis.customLevel?.observe().ready'); return result; }
        await h.sleep(40);
    }
    throw new Error(`Host did not open: ${await p.read("document.querySelector('#status').textContent")}`);
}
const observation = (p: Cdp) => p.read<any>('customLevel.observe()');
async function wait(p: Cdp, condition: ScenarioCondition, timeout = 6000) {
    const end = Date.now() + timeout; let last: unknown;
    do { last = await observation(p); if (conditionMatches(last, condition)) return; await h.sleep(25); } while (Date.now() < end);
    throw new Error(`Condition ${JSON.stringify(condition)} failed: ${JSON.stringify(last)}`);
}
async function route(mode: string) {
    const actors = { host, partner: guest }, scenario = parseScenario(JSON.parse(await readFile('levels/scenarios/cooperative-test.json', 'utf8')));
    for (const [index, step] of scenario.steps.entries()) {
        for (const a of step.actions ?? []) {
            const p = actors[a.actor as keyof typeof actors];
            if (a.type === 'key') await h.key(p, a.code, a.down);
            else if (a.type === 'tap') await h.tap(p, a.code);
            else if (a.type === 'walk') {
                const right = (await observation(p)).player.x < a.x, key = right ? 'KeyD' : 'KeyA';
                await h.key(p, key, true);
                // Public victory freezes characters at first physical overlap, before the exit centre.
                try { await wait(p, index === scenario.steps.length - 1 ? { path: 'completed', equals: true } : { path: 'player.x', ...(right ? { min: a.x } : { max: a.x }) }, a.timeoutMs ?? 12000); }
                finally { await h.key(p, key, false); }
            } else {
                let at = { x: 400, y: 400 };
                if (a.down) {
                    const o = authored.geometry.objects.find(o => o.id === a.target)!; const b = objectBounds(o);
                    at = await p.read(`(()=>{const c=customLevel.observe().camera,r=document.querySelector('#stage').getBoundingClientRect();return{x:(${b.x + b.w / 2}-c.x)*c.zoom+r.x,y:(${b.y + 12}-c.y)*c.zoom+r.y}})()`);
                }
                await p.send('Input.dispatchMouseEvent', { type: a.down ? 'mousePressed' : 'mouseReleased', ...at, button: 'left', buttons: a.down ? 1 : 0, clickCount: 1 });
            }
        }
        if (step.waitMs) await h.sleep(step.waitMs);
        if (step.wait) await wait(actors[step.wait.actor as keyof typeof actors], step.wait.condition, step.wait.timeoutMs);
        const snapshots = { host: await observation(host), partner: await observation(guest) };
        for (const assertion of step.assert ?? []) {
            // This public extension deliberately presses R once per player after step 20.
            const condition = index > 20 && assertion.condition.path === 'player.deaths' ? { ...assertion.condition, equals: 1 } : assertion.condition;
            check(`${mode}: ${step.label} / ${condition.path}`, conditionMatches(snapshots[assertion.actor as keyof typeof snapshots], condition));
        }
        measured.push({ mode, step: step.label, snapshots });
        if (index === 8) await h.shot(guest, `${mode}-powered-route`);
        if (index === 17) {
            await wait(host, { path: 'checkpoint', equals: 'relay' }); await wait(guest, { path: 'checkpoint', equals: 'relay' });
            check(`${mode}: walking activates the shared checkpoint before E while the puzzle terminal stays off`, !snapshots.host.exitUnlocked && !snapshots.partner.exitUnlocked
                && snapshots.host.heroAssets.breakpoints.some((b: { active: boolean }) => b.active));
        }
        if (index === 20) {
            for (const [slot, p] of [[1, host], [2, guest]] as const) {
                const marker = authored.geometry.objects.find(o => o.type === 'checkpoint' && o.slot === slot)!;
                await h.tap(p, 'KeyR'); await wait(p, { path: 'player.x', min: marker.x - 1, max: marker.x + 1 });
                await wait(p, { path: 'player.y', min: marker.y - 1, max: marker.y + 1 });
                check(`${mode}: Player ${slot} respawns at its accepted marker`, true);
            }
            await h.shot(host, `${mode}-checkpoint`);
        }
    }
    await until(host, '!document.querySelector("#victory").hidden'); await until(guest, '!document.querySelector("#victory").hidden');
    check(`${mode}: both players complete with real movement, controls, cube handoff and grapple`, (await observation(host)).completed && (await observation(guest)).completed);
    check(`${mode}: guest waits for host replay`, await guest.read("document.querySelector('#replay').hidden && !document.querySelector('#guest-wait').hidden"));
    await h.shot(host, `${mode}-victory`);
}
try {
    origin = process.env.PUBLIC_CUSTOM_URL ?? await h.startServer(); if (!origin.endsWith('/')) origin += '/';
    debuggerUrl = await h.launch(); root = await new Cdp(debuggerUrl).open();
    editor = await page('workbench.html'); await until(editor, '!!globalThis.workbench?.ready');
    const progress = await editor.read("fetch('/api/progress').then(r=>r.json())");
    const { root: dom } = await editor.send('DOM.getDocument'), { nodeId } = await editor.send('DOM.querySelector', { nodeId: dom.nodeId, selector: '#json-file' });
    await editor.send('DOM.setFileInputFiles', { nodeId, files: [resolve('levels/drafts/cooperative-test.json')] });
    await until(editor, '!!workbench.snapshot().draftId');
    await h.click(editor, '[data-palette="breakpoint"]'); await worldClick(editor, 1180, 680);
    await until(editor, 'workbench.snapshot().document.geometry.objects.filter(o=>o.type==="checkpoint").length===2');
    const pedestal = await editor.read<string>('workbench.snapshot().selection[0]');
    check('breakpoint placement creates both slot markers and inspector frame controls', await editor.read('document.querySelectorAll("[data-frame-marker]").length===2'));
    await h.click(editor, '#undo'); check('one undo removes pedestal and both markers', await editor.read('!workbench.snapshot().document.geometry.objects.some(o=>o.type==="checkpoint")'));
    await h.click(editor, '#redo');
    check('new breakpoint needs no activation terminal', await editor.read(`!workbench.snapshot().document.geometry.objects.find(o=>o.id===${JSON.stringify(pedestal)}).activationControl`));
    await h.click(editor, '#save'); await until(editor, '!workbench.snapshot().dirty');
    const savedId = await editor.read<string>('workbench.snapshot().draftId');
    await editor.read('document.querySelector("#world").focus()'); await editor.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
    await field(editor, 'Title', 'UNSAVED PUBLIC TEST'); authored = await editor.read('workbench.snapshot().document');
    const unsaved = serializeDraft(authored), testHash = await draftHash(authored);
    host = await openHost(editor, '#coop');
    const invite = await host.read<string>('document.querySelector("#invite").value');
    guest = await h.page(invite, debuggerUrl); pages.push(guest);
    await wait(host, { path: 'session.peers.1', equals: true });
    check('two independent visitor identities load the same frozen hash', (await observation(host)).hash === testHash && (await observation(guest)).hash === testHash && (await observation(host)).session.visitor !== (await observation(guest)).session.visitor);
    check('invited friend gets gameplay with no editing API', await guest.read("!globalThis.workbench && !document.querySelector('#inspector')"));
    await h.click(host, '#diagnostics-toggle'); check('test information is explicitly read-only', await host.read("document.querySelector('#diagnostics').textContent.includes('READ ONLY')")); await h.click(host, '#diagnostics-toggle');
    await field(editor, 'Title', 'REVISED SAVED LEVEL');
    check('editing the browser document cannot replace the running snapshot', (await observation(host)).hash === testHash && (await observation(guest)).hash === testHash);
    await route('test');
    await h.click(guest, '#victory-return'); await h.click(host, '#victory-return');
    check('returning to editor preserves unsaved work and undo history', await editor.read('workbench.snapshot().dirty && workbench.snapshot().document.title==="REVISED SAVED LEVEL"'));
    await h.click(editor, '#undo'); check('unsaved test document is still undoable', serializeDraft(await editor.read('workbench.snapshot().document')) === unsaved); await h.click(editor, '#redo');
    await h.click(editor, '#save'); await until(editor, '!workbench.snapshot().dirty'); authored = await editor.read('workbench.snapshot().document'); const savedHash = await draftHash(authored);
    await root.send('Browser.close').catch(() => {}); root.socket.close(); for (const p of pages) p.socket.close();
    await h.sleep(400); await rm(join(h.temporary, 'chrome', 'DevToolsActivePort'), { force: true }); debuggerUrl = await h.launch(); root = await new Cdp(debuggerUrl).open();
    const collection = await page('my-levels.html'); await until(collection, 'document.querySelectorAll(".level-card").length===1');
    check('MY LEVELS survives closing and reopening the browser with the same saved ID', await collection.read(`document.querySelector('.level-card').dataset.id===${JSON.stringify(savedId)}`));
    await h.shot(collection, 'my-levels');
    host = await openHost(collection, '.level-card button');
    guest = await h.page(await host.read('document.querySelector("#invite").value'), debuggerUrl); pages.push(guest);
    await wait(host, { path: 'session.peers.1', equals: true });
    check('saved normal play loads the saved canonical map without opening the editor', (await observation(host)).hash === savedHash && await host.read("document.querySelector('#diagnostics-toggle').hidden && document.querySelector('#diagnostics').hidden"));
    const code = (await observation(host)).session.code;
    await guest.send('Page.reload'); await until(guest, '!!globalThis.customLevel?.observe().ready'); await wait(host, { path: 'session.peers.1', equals: true });
    check('guest reconnect resumes its original slot and snapshot', (await observation(guest)).session.slot === 2 && (await observation(guest)).hash === savedHash);
    await route('play');
    await h.click(host, '#replay'); await wait(host, { path: 'session.generation', equals: 2 }); await wait(guest, { path: 'session.generation', equals: 2 });
    await wait(host, { path: 'checkpoint', equals: 'entry' }); await wait(host, { path: 'player.x', equals: 120 });
    check('host replay resets puzzle, cubes and completion with unchanged snapshot and new generation', !(await observation(host)).completed && (await observation(host)).hash === savedHash && (await observation(guest)).hash === savedHash && (await observation(host)).session.sharedCubes['draft:payload'].holder === null);
    await h.click(host, '#return'); await until(host, '!!globalThis.binaryNinja?.store.ready'); await onboardNinja(host);
    check('custom play leaves official progress unchanged', JSON.stringify(await host.read("fetch('/api/progress').then(r=>r.json())")) === JSON.stringify(progress));
    await h.click(host, '#my-levels'); await until(host, 'document.querySelectorAll(".level-card").length===1');
    check('returning to MY LEVELS retains the authored map', true);
    if (!process.env.PUBLIC_CUSTOM_URL) {
        check('production custom sessions write no room records', (await readdir(join(h.temporary, 'data', 'rooms'))).length === 0);
        const stopped = once(h.app!, 'exit'); h.app!.kill('SIGTERM'); await stopped;
        origin = await h.startServer(Number(new URL(origin).port));
        await guest.send('Page.navigate', { url: `${origin}custom-level.html?code=${code}` });
        await until(guest, '!!document.querySelector("#status")?.textContent.includes("server restart")');
        check('server restart terminates temporary sessions with an understandable message', true);
    }
    for (const p of pages) if (p.errors.length) throw new Error(p.errors.join('\n'));
    await writeFile(join(reports, 'checks.json'), JSON.stringify({ pass: true, origin, checks, savedHash, testHash, measured }, null, 2) + '\n');
} catch (error) {
    console.error(error); process.exitCode = 1;
    for (const [label, p] of [['host', host!], ['guest', guest!], ['editor', editor!]] as const) if (p) await h.shot(p, `failure-${label}`).catch(() => {});
    await writeFile(join(reports, 'checks.json'), JSON.stringify({ pass: false, checks, error: String(error), measured }, null, 2) + '\n');
} finally { for (const p of pages) p.socket.close(); root!?.socket.close(); await h.cleanup(); }
