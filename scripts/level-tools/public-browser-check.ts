/** Stage 1 acceptance against generated dist served by the production Node app. */
import { mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { coopBrowser, Cdp } from '../coop-browser.ts';
import { serializeDraft, type DraftDocument } from '../../src/workbench/model.ts';
import { publicTemplate } from '../../src/workbench/templates.ts';
import { validateDraft } from '../../src/workbench/validation.ts';

const reports = resolve('.workbench/reports/public-builder');
await mkdir(reports, { recursive: true });
const h = await coopBrowser({ shots: reports, internalLabs: false });
const checks: string[] = [], pages: Cdp[] = [], network: { path: string; method: string }[] = [];
let root: Cdp, debuggerUrl: string, origin: string, p: Cdp;
function check(label: string, value: unknown) { if (!value) throw new Error(label); checks.push(label); console.log(`PASS ${label}`); }
async function until(page: Cdp, expression: string, timeout = 12000) {
    const deadline = Date.now() + timeout;
    while (!await page.read<boolean>(expression)) { if (page.errors.length) throw new Error(page.errors.join('\n')); if (Date.now() > deadline) throw new Error(`Timeout: ${expression}`); await h.sleep(30); }
}
async function page(path: string, context?: string, script?: string) {
    const { targetId } = await root.send('Target.createTarget', { url: 'about:blank', ...(context ? { browserContextId: context } : {}) });
    const client = await new Cdp(`${new URL(debuggerUrl).origin}/devtools/page/${targetId}`).open(); pages.push(client);
    await client.send('Runtime.enable'); await client.send('Page.enable'); await client.send('Network.enable');
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
    await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    client.socket.addEventListener('message', event => { const m = JSON.parse(String(event.data)); if (m.method === 'Network.requestWillBeSent') { const r = m.params.request; network.push({ path: new URL(r.url).pathname, method: r.method }); } });
    if (script) await client.send('Page.addScriptToEvaluateOnNewDocument', { source: script });
    await client.send('Page.navigate', { url: origin + path });
    await until(client, path.startsWith('workbench') ? '!!globalThis.workbench?.ready' : '!!globalThis.binaryNinja?.store.ready');
    return client;
}
async function dialog(page: Cdp, action: () => Promise<unknown>, accept: boolean, promptText?: string) {
    const heard = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => { page.socket.removeEventListener('message', listener); reject(new Error('Expected a native dialog')); }, 8000);
        const listener = (event: MessageEvent) => { const m = JSON.parse(String(event.data)); if (m.method !== 'Page.javascriptDialogOpening') return; clearTimeout(timeout); page.socket.removeEventListener('message', listener); void page.send('Page.handleJavaScriptDialog', { accept, ...(promptText !== undefined ? { promptText } : {}) }).then(() => resolve(), reject); };
        page.socket.addEventListener('message', listener);
    });
    await Promise.all([heard, action()]);
}
async function field(page: Cdp, label: string, value: string) {
    const selector = await page.read<string>(`(()=>{const label=[...document.querySelectorAll('#inspector label')].find(l=>l.firstChild.textContent.trim()===${JSON.stringify(label)});return '#'+label.querySelector('input,select').id})()`);
    await setValue(page, selector, value);
}
async function setValue(page: Cdp, selector: string, value: string) { await page.read(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}))})()`); }
async function worldPoint(page: Cdp, x: number, y: number) { return page.read<{ x: number; y: number }>(`(()=>{const r=document.querySelector('#world').getBoundingClientRect(),s=workbench.snapshot(),c=s.mode==='play'?s.renderCamera:s.camera;return{x:r.x+r.width/2+(${x}-c.x)*c.zoom,y:r.y+r.height/2+(${y}-c.y)*c.zoom}})()`); }
async function mouseWorld(page: Cdp, x: number, y: number, type = 'mousePressed', button = 'left') { await page.send('Input.dispatchMouseEvent', { type, ...await worldPoint(page, x, y), button, buttons: type === 'mouseReleased' ? 0 : button === 'middle' ? 4 : 1, clickCount: 1 }); }
async function clickWorld(page: Cdp, x: number, y: number) { await mouseWorld(page, x, y); await mouseWorld(page, x, y, 'mouseReleased'); await h.sleep(50); }
async function save(page: Cdp, name?: string) { if (name) await dialog(page, () => h.click(page, '#save'), true, name); else await h.click(page, '#save'); await until(page, '!workbench.snapshot().dirty && !!workbench.snapshot().draftId'); }
async function importFile(page: Cdp, path: string) { const { root } = await page.send('DOM.getDocument'); const { nodeId } = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#json-file' }); await page.send('DOM.setFileInputFiles', { nodeId, files: [path] }); }
const doc = (page: Cdp) => page.read<DraftDocument>('workbench.snapshot().document');
async function reload(page: Cdp) { await page.send('Page.reload'); await h.sleep(100); await until(page, '!!globalThis.workbench?.ready'); }

try {
    origin = process.env.PUBLIC_BUILDER_URL ?? await h.startServer(); if (!origin.endsWith('/')) origin += '/';
    debuggerUrl = await h.launch(); root = await new Cdp(debuggerUrl).open();
    const downloads = join(h.temporary, 'downloads'); await mkdir(downloads);
    await root.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
    p = await page('');
    check('production main menu displays LEVEL BUILDER', await p.read("document.querySelector('#level-builder')?.textContent==='LEVEL BUILDER'"));
    const progress = await p.read("fetch('/api/progress').then(r=>r.json())");
    await h.shot(p, '01-production-menu'); await h.click(p, '#level-builder'); await until(p, '!!globalThis.workbench?.ready');
    check('menu opens same-origin PUBLIC LEVEL BUILDER with browser storage', await p.read("location.pathname==='/workbench.html' && workbench.snapshot().storage==='browser' && document.querySelector('.badge').textContent==='PUBLIC LEVEL BUILDER'"));
    check('public co-op and trusted room service controls hidden', await p.read("document.querySelector('#coop').hidden && document.querySelector('#import-room').hidden"));
    check('storage warning and game return are visible', await p.read("document.querySelector('.wb-storage-notice').textContent.includes('private browsing') && !document.querySelector('#back-to-game').hidden"));
    network.length = 0;
    // Actual palette, pointer gesture, inspector, history and camera controls in compiled production JS.
    await h.click(p, '[data-palette="code"]'); await clickWorld(p, 600, 420);
    const id = await p.read<string>('workbench.snapshot().selection[0]');
    check('new code platform defaults to Always Powered and permits Playtest', await p.read(`workbench.snapshot().document.geometry.objects.find(o=>o.id===${JSON.stringify(id)}).activation==='always-powered' && !document.querySelector('#play').disabled`));
    await mouseWorld(p, 650, 435); await mouseWorld(p, 710, 395, 'mouseMoved'); await mouseWorld(p, 710, 395, 'mouseReleased');
    check('production drag updates grid coordinates', (await doc(p)).geometry.objects.find(o => o.id === id)?.x === 660);
    await h.click(p, '#undo'); check('undo restores placement', (await doc(p)).geometry.objects.find(o => o.id === id)?.x === 600);
    await h.click(p, '#redo');
    await mouseWorld(p, 860, 410); await mouseWorld(p, 920, 430, 'mouseMoved'); await mouseWorld(p, 920, 430, 'mouseReleased');
    check('production resize updates authored dimensions', (await doc(p)).geometry.objects.some(o => o.id === id && 'w' in o && o.w === 260));
    await field(p, 'Label', '<img src=x onerror="window.injected=true">');
    check('importable user text does not inject markup', await p.read("!window.injected && !document.querySelector('#inspector img')"));
    await h.click(p, '#duplicate'); check('duplicate creates an independent object', await p.read(`workbench.snapshot().selection[0]!==${JSON.stringify(id)}`)); await h.click(p, '#undo');
    await h.click(p, `[data-id="${id}"] .select-object`); await field(p, 'Activation', 'Always Inactive');
    check('Always Inactive needs no binding and remains playable', await p.read("!document.querySelector('#play').disabled"));
    await field(p, 'Activation', 'Controlled by Signal'); check('controlled platform missing its binding blocks Playtest', await p.read("document.querySelector('#play').disabled"));
    await field(p, 'Activation', 'Always Powered');
    await h.click(p, '#connect'); await clickWorld(p, 440, 635); await clickWorld(p, 750, 390); await h.click(p, '#connect');
    check('functional connect selects signal mode and adds a real binding', (await doc(p)).bindings.some(b => b.target === id) && (await doc(p)).geometry.objects.some(o => o.id === id && o.type === 'platform' && o.activation === 'signal'));
    await h.click(p, '#preview-mode'); await setValue(p, '#preview-state', 'powered');
    check('State Preview evaluates controller outputs', await p.read('workbench.observe().outputs.exitReady===true'));
    await h.click(p, '#edit-mode'); await h.click(p, `[data-id="${id}"] .select-object`); await field(p, 'Activation', 'Always Powered');
    await p.read("document.querySelector('#world').focus()"); const cameraBefore = await p.read<{ x: number; y: number; zoom: number }>('workbench.snapshot().camera');
    await h.key(p, 'KeyD', true); await h.sleep(260); await h.key(p, 'KeyD', false);
    check('WASD pans the production editor camera', await p.read(`workbench.snapshot().camera.x>${cameraBefore.x + 20}`));
    const center = await worldPoint(p, 750, 425);
    await p.send('Input.dispatchMouseEvent', { type: 'mouseWheel', ...center, deltaX: 0, deltaY: -100 }); await h.sleep(80);
    check('wheel zoom changes production editor camera', await p.read(`workbench.snapshot().camera.zoom>${cameraBefore.zoom}`));
    const beforePan = await p.read<number>('workbench.snapshot().camera.x');
    await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...center, button: 'middle', buttons: 4, clickCount: 1 });
    await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: center.x + 50, y: center.y, button: 'middle', buttons: 4 });
    await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: center.x + 50, y: center.y, button: 'middle', buttons: 0 });
    check('middle drag pans', await p.read(`workbench.snapshot().camera.x<${beforePan}`));
    await h.click(p, '#range'); await h.click(p, '#fit');
    await save(p, 'public-room.json'); const savedDoc = serializeDraft(await doc(p)), savedId = await p.read<string>('workbench.snapshot().draftId');
    await h.shot(p, '02-public-editor');
    await reload(p); check('saved draft survives reload with full canonical data and stable ID', serializeDraft(await doc(p)) === savedDoc && await p.read(`workbench.snapshot().draftId===${JSON.stringify(savedId)}`));
    await field(p, 'Title', 'PUBLIC REVISED'); await save(p); await reload(p); check('editing and saving again survives reload', (await doc(p)).title === 'PUBLIC REVISED');
    // The same origin/profile in a second tab sees the stable draft; stale writes lose neither copy.
    const second = await page('workbench.html?storage=filesystem&dev=1');
    check('query parameters cannot switch the public backend', await second.read("workbench.snapshot().storage==='browser'"));
    await field(p, 'Title', 'TAB ONE'); await field(second, 'Title', 'TAB TWO'); await save(p);
    await h.click(second, '#save'); await until(second, "!!document.querySelector('#copy-conflict')");
    check('stale tab write rejected, dirty document preserved', await second.read("workbench.snapshot().dirty && workbench.snapshot().document.title==='TAB TWO'"));
    await dialog(second, () => h.click(second, '#rename-draft'), true, 'stale-rename.json');
    check('stale rename is rejected', await second.read("workbench.snapshot().file==='public-room.json'"));
    await dialog(second, () => h.click(second, '#delete-draft'), true);
    check('stale delete is rejected', await second.read('!!workbench.snapshot().draftId'));
    await h.shot(second, '03-tab-conflict');
    await dialog(second, () => h.click(second, '#save-copy'), true, 'public-room.json'); await until(second, '!workbench.snapshot().dirty');
    check('Save copy handles duplicate filenames with a fresh storage ID', await second.read(`workbench.snapshot().draftId!==${JSON.stringify(savedId)} && workbench.snapshot().file==='public-room-2.json'`));
    await dialog(second, () => h.click(second, '#rename-draft'), true, 'renamed-room.json'); await until(second, "workbench.snapshot().file==='renamed-room.json'");
    const secondId = await second.read<string>('workbench.snapshot().draftId');
    await field(second, 'Title', 'UNSAVED RECOVERY'); await h.sleep(900);
    await dialog(second, () => setValue(second, '#files', savedId), true);
    await until(second, `workbench.snapshot().draftId===${JSON.stringify(savedId)}`);
    await h.click(second, '#recover');
    await second.read("(()=>{const b=[...document.querySelectorAll('[data-recover]')].find(b=>b.textContent==='renamed-room.json');b.id='restore-test'})()");
    await h.click(second, '#restore-test');
    check('opening another draft retains a recoverable unsaved document', (await doc(second)).title === 'UNSAVED RECOVERY'); await save(second);
    await field(second, 'Title', 'RELOAD RECOVERY'); await h.sleep(900);
    const acceptReloadDialogs = (event: MessageEvent) => { const m = JSON.parse(String(event.data)); if (m.method === 'Page.javascriptDialogOpening') void second.send('Page.handleJavaScriptDialog', { accept: true }); };
    second.socket.addEventListener('message', acceptReloadDialogs);
    try { await second.send('Page.reload'); await h.sleep(200); await until(second, '!!globalThis.workbench?.ready'); }
    finally { second.socket.removeEventListener('message', acceptReloadDialogs); }
    check('unsaved recovery survives reload', (await doc(second)).title === 'RELOAD RECOVERY'); await save(second);
    await h.click(second, '#export');
    let exported: string | undefined;
    for (let i = 0; i < 100; i++) { exported = (await readdir(downloads)).find(n => n.endsWith('.json')); if (exported) break; await h.sleep(30); }
    if (!exported) throw new Error('JSON download missing');
    const exportPath = join(downloads, exported), exportedDoc = JSON.parse(await readFile(exportPath, 'utf8'));
    await writeFile(join(reports, 'shared-export.json'), serializeDraft(exportedDoc));
    check('Export JSON downloads complete canonical validated document', validateDraft(exportedDoc).playable && serializeDraft(exportedDoc) === serializeDraft(await doc(second)));
    await importFile(second, exportPath); await until(second, `!workbench.snapshot().dirty && workbench.snapshot().draftId!==${JSON.stringify(secondId)}`);
    check('JSON import creates a fresh saved draft without overwriting duplicate document ID', serializeDraft(await doc(second)) === serializeDraft(exportedDoc));
    const { browserContextId } = await root.send('Target.createBrowserContext'); const isolated = await page('workbench.html', browserContextId);
    check('isolated browser profile starts without other profiles drafts', await isolated.read("document.querySelector('#files').options.length===1"));
    await importFile(isolated, exportPath); await until(isolated, '!!workbench.snapshot().draftId');
    check('shared JSON imports in an isolated profile with the same canonical semantics', serializeDraft(await doc(isolated)) === serializeDraft(exportedDoc));
    await dialog(isolated, () => h.click(isolated, '#delete-draft'), false); check('cancelled deletion preserves saved draft', await isolated.read('!!workbench.snapshot().draftId'));
    await dialog(isolated, () => h.click(isolated, '#delete-draft'), true); await until(isolated, '!workbench.snapshot().draftId');
    check('confirmed delete removes stored draft but leaves current work exportable', await isolated.read("document.querySelector('#files').options.length===1 && workbench.snapshot().dirty"));
    // Production engine physics, grapple and restoration. A small explicitly diagnostic setup
    // is loaded through the existing harness, then driven with actual browser controls.
    const physics = publicTemplate();
    const floor = physics.geometry.objects.find(o => o.id === 'floor')!; Object.assign(floor, { w: 300 });
    physics.geometry.objects.push({ type: 'platform', kind: 'static', id: 'farFloor', x: 480, y: 680, w: 1020, h: 170 });
    const slab = physics.geometry.objects.find(o => o.id === 'route')!; Object.assign(slab, { x: 260, y: 360, w: 300 });
    await p.read(`workbench.loadDocument(${JSON.stringify(physics)})`); await save(p, 'grapple-test.json');
    const authored = serializeDraft(await doc(p)), editCamera = await p.read('workbench.snapshot().camera');
    await h.click(p, '#play'); await until(p, "workbench.snapshot().mode==='play'");
    await h.key(p, 'KeyD', true); await h.sleep(250); await h.key(p, 'KeyD', false);
    check('real player physics moves with keyboard input', await p.read('workbench.observe().player.x>150'));
    await h.key(p, 'Space', true); await h.sleep(100); await h.key(p, 'Space', false);
    check('real player jump leaves the floor', await p.read('workbench.observe().player.y<645'));
    await mouseWorld(p, 390, 368);
    await until(p, "workbench.observe().player.rope==='attached' && workbench.observe().player.target==='route'");
    check('powered code accepts an actual pointer grapple across its address bar', true);
    await h.key(p, 'KeyD', true); await until(p, 'workbench.observe().player.x>490'); await h.key(p, 'KeyD', false);
    check('real grapple swing crosses the authored gap', true);
    await mouseWorld(p, 390, 368, 'mouseReleased');
    await h.shot(p, '04-public-physics'); await h.click(p, '#stop');
    check('Stop restores authored geometry and camera, without saving physics positions', serializeDraft(await doc(p)) === authored && JSON.stringify(await p.read('workbench.snapshot().camera')) === JSON.stringify(editCamera));
    await h.click(p, '[data-id="route"] .select-object'); await field(p, 'X', '320'); await h.click(p, '#play'); await until(p, "workbench.snapshot().mode==='play'"); await h.click(p, '#stop');
    check('move the platform and repeat Playtest', (await doc(p)).geometry.objects.find(o=>o.id==='route')?.x===320); await save(p);
    // Invalid imports are rejected before replacement and do not execute any imported content.
    const bad = join(h.temporary, 'bad.json');
    for (const [label, value] of [
        ['fabricated binary evidence', { ...exportedDoc, evidence: { validated: true } }],
        ['executable expression', { ...exportedDoc, controller: { kind: 'declarative', outputs: { attack: { op: 'eval', code: 'window.injected=true' } } } }],
        ['invalid activation', { ...exportedDoc, geometry: { ...exportedDoc.geometry, objects: [...exportedDoc.geometry.objects, { type: 'platform', id: 'bad', kind: 'code', x: 1, y: 1, w: 2, h: 2, activation: 'malicious' }] } }],
    ] as const) { await writeFile(bad, JSON.stringify(value)); const before = serializeDraft(await doc(p)); await importFile(p, bad); await until(p, "document.querySelector('#status').textContent.startsWith('JSON rejected')"); check(`${label} rejected without replacing current draft`, serializeDraft(await doc(p)) === before); }
    await writeFile(bad, ' '.repeat(1_000_001)); await importFile(p, bad); await until(p, "document.querySelector('#status').textContent.includes('1 MB')"); check('oversized file rejected before JSON parsing', true);
    check('editor storage/import/playtest sends no API requests or uploads', network.every(r => !r.path.startsWith('/api/') && r.method === 'GET'));
    // Failures are injected at browser storage boundaries, never in application branches.
    await p.read("window.originalPut=IDBObjectStore.prototype.put; IDBObjectStore.prototype.put=function(){throw new DOMException('quota test','QuotaExceededError')}");
    await p.read("document.querySelector('#world').focus()"); await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await field(p, 'Title', 'QUOTA UNSAVED'); await h.click(p, '#save'); await until(p, "document.querySelector('#storage-error')?.textContent.includes('storage is full')");
    check('quota error leaves edits dirty and Export JSON available', await p.read("workbench.snapshot().dirty && !document.querySelector('#export').disabled"));
    await h.shot(p, '05-storage-error'); await p.read('IDBObjectStore.prototype.put=window.originalPut'); await save(p);
    const { browserContextId: unavailableContext } = await root.send('Target.createBrowserContext');
    const unavailable = await page('workbench.html', unavailableContext, "Object.defineProperty(window,'indexedDB',{get(){throw new DOMException('blocked test','SecurityError')}})");
    check('unavailable IndexedDB explains failure and permits playtest/export', await unavailable.read("!!document.querySelector('#storage-error') && !document.querySelector('#export').disabled && !document.querySelector('#play').disabled"));
    const { browserContextId: blockedContext } = await root.send('Target.createBrowserContext');
    const blocked = await page('workbench.html', blockedContext, "indexedDB.open=function(){const r={};setTimeout(()=>r.onblocked?.(),0);return r}");
    check('blocked database upgrade reports a clear recovery action', await blocked.read("document.querySelector('#storage-error').textContent.includes('blocked by another tab')"));
    // A future upgrade closes current handles and keeps draft records; the old app must
    // fail visibly instead of deleting/recreating a newer database.
    const upgrade = await isolated.read<number>(`new Promise((resolve,reject)=>{const r=indexedDB.open('binary-ninja-level-builder',2);r.onsuccess=()=>{const db=r.result,t=db.transaction('recovery');const q=t.objectStore('recovery').count();q.onsuccess=()=>{db.close();resolve(q.result)}};r.onerror=()=>reject(r.error)})`);
    check('database upgrade preserves existing recovery records', upgrade > 0);
    await dialog(isolated, () => isolated.send('Page.reload'), true); await h.sleep(100); await until(isolated, '!!globalThis.workbench?.ready');
    check('older app refuses newer schema without deleting stored work', await isolated.read("!!document.querySelector('#storage-error')"));
    // Unchanged production boundary: no workbench service, runner or files.
    for (const path of ['api/workbench/bootstrap', 'api/workbench/drafts', 'api/workbench/recovery', 'api/workbench/snapshots', 'workbench-runner.html', 'levels/drafts/blank-room.json', 'scripts/level-tools/service.ts', 'Workspace/binary_binja_redesign/']) {
        check(`production excludes ${path}`, (await fetch(origin + path)).status === 404);
    }
    check('production rejects draft PUT', (await fetch(origin + 'api/workbench/drafts?name=attack.json', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(exportedDoc) })).status >= 400);
    const assets = await readdir('dist/assets'); const js = (await Promise.all(assets.filter(n => n.endsWith('.js')).map(n => readFile(join('dist/assets', n), 'utf8')))).join('\n');
    for (const marker of ['/api/workbench/', 'X-Workbench-Token', 'LocalDraftStorage', 'node:fs', 'node:child_process', 'DEV_WORKBENCH_PORT']) check(`production bundle excludes ${marker}`, !js.includes(marker));
    const reopenId = await p.read<string>('workbench.snapshot().draftId'), reopenDocument = serializeDraft(await doc(p));
    await root.send('Browser.close').catch(() => {}); root.socket.close(); for (const page of pages) page.socket.close();
    await h.sleep(300); await rm(join(h.temporary, 'chrome', 'DevToolsActivePort'), { force: true });
    debuggerUrl = await h.launch(); root = await new Cdp(debuggerUrl).open(); p = await page('workbench.html');
    check('saved drafts survive closing and reopening the browser profile', await p.read(`workbench.snapshot().draftId===${JSON.stringify(reopenId)}`) && serializeDraft(await doc(p)) === reopenDocument);
    await h.click(p, '#back-to-game'); await until(p, '!!globalThis.binaryNinja?.store.ready');
    check('Back to Game preserves visitor identity and campaign progress', JSON.stringify(await p.read("fetch('/api/progress').then(r=>r.json())")) === JSON.stringify(progress));
    await h.click(p, '#create-party'); await until(p, '!!binaryNinja.snapshot().multiplayer?.code');
    const party = await p.read<{code:string;slot:number;visitor:string}>('({code:binaryNinja.snapshot().multiplayer.code,slot:binaryNinja.snapshot().multiplayer.slot,visitor:binaryNinja.snapshot().persistence.visitor})');
    await p.send('Page.navigate', { url: origin + 'workbench.html' }); await until(p, '!!globalThis.workbench?.ready');
    await h.click(p, '#examples'); await h.click(p, '[data-template="signals"]');
    check('multi-signal example opens as an independent playable draft', await p.read("!workbench.snapshot().draftId && workbench.snapshot().playable && workbench.snapshot().document.bindings.length===3"));
    await h.shot(p, '06-signal-example'); await save(p, 'signal-example.json');
    await h.click(p, '#back-to-game'); await until(p, '!!globalThis.binaryNinja?.snapshot().multiplayer?.shared?.party');
    check('builder visit preserves persistent campaign party membership and identity', await p.read(`binaryNinja.snapshot().multiplayer.code===${JSON.stringify(party.code)} && binaryNinja.snapshot().multiplayer.slot===${party.slot} && binaryNinja.snapshot().persistence.visitor===${JSON.stringify(party.visitor)}`));
    for (const page of pages) if (page.errors.length) throw new Error(page.errors.join('\n'));
    await writeFile(join(reports, 'checks.json'), JSON.stringify({ pass: true, origin, checks, network }, null, 2) + '\n');
} catch (error) {
    if (p!) { await h.shot(p, 'failure').catch(() => {}); await p.read("({status:document.querySelector('#status')?.textContent,snapshot:globalThis.workbench?.snapshot()})").then(value => writeFile(join(reports, 'failure.json'), JSON.stringify(value, null, 2))).catch(() => {}); }
    await writeFile(join(reports, 'checks.json'), JSON.stringify({ pass: false, checks, error: String(error), network }, null, 2) + '\n');
    console.error(error); process.exitCode = 1;
} finally { for (const page of pages) page.socket.close(); root!?.socket.close(); await h.cleanup(); }
