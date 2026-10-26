/** Local game -> builder -> game navigation; no canonical draft writes. */
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { coopBrowser, type Cdp } from '../coop-browser.ts';

const reports = resolve('.workbench/reports/menu-builder');
await mkdir(reports, { recursive: true });
const harness = await coopBrowser({ shots: reports, internalLabs: false, readyExpression: '!!globalThis.binaryNinja?.store.ready || !!globalThis.workbench?.ready' });
const checks: string[] = [];
let launcher: ChildProcess | undefined, page: Cdp | undefined;
function check(label: string, value: unknown) { if (!value) throw new Error(label); checks.push(label); }
async function until(expression: string) {
    const deadline = Date.now() + 15000;
    while (!await page!.read<boolean>(expression)) {
        if (page!.errors.length) throw new Error(page!.errors.join('\n'));
        if (Date.now() > deadline) throw new Error(`Timed out: ${expression}`);
        await harness.sleep(30);
    }
}
try {
    launcher = spawn(process.execPath, ['scripts/dev.ts', '--host', 'localhost', '--port', '0'], {
        env: { ...process.env, DATA_DIR: join(harness.temporary, 'game'), WORKBENCH_DATA_DIR: join(harness.temporary, 'builder'), DEV_API_PORT: '0', DEV_WORKBENCH_PORT: '0', NO_COLOR: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    launcher.stdout!.on('data', chunk => { output += chunk; }); launcher.stderr!.on('data', chunk => { output += chunk; });
    const deadline = Date.now() + 15000;
    while (!/Local:\s+http:\/\/localhost:\d+\//.test(output)) {
        if (Date.now() > deadline || launcher.exitCode !== null) throw new Error(`Development startup failed: ${output}`);
        await harness.sleep(30);
    }
    const frontend = output.match(/Local:\s+(http:\/\/localhost:\d+)\//)![1];
    const builder = output.match(/Level Builder ready: (http:\/\/(?:localhost|127\.0\.0\.1):\d+)\//)![1];
    const browser = await harness.launch();
    page = await harness.page(frontend, browser);
    check('local main menu exposes Level Builder', await page.read("!!document.querySelector('#level-builder')"));
    const progressBefore = await page.read("fetch('/api/progress').then(r=>r.json())");
    await harness.shot(page, '01-game-menu');
    await harness.click(page, '#open-workbench');
    await until(`location.origin===${JSON.stringify(builder)} && !!globalThis.workbench?.ready && !document.querySelector('#back-to-game').hidden`);
    check('real localhost to loopback menu navigation loads builder', true);
    check('builder offers correct game return URL', await page.read(`document.querySelector('#back-to-game').href===${JSON.stringify(frontend + '/')}`));
    const documentBefore = await page.read('JSON.stringify(workbench.snapshot().document)');
    await harness.shot(page, '02-builder-entry');
    // Type a real temporary inspector edit to exercise the browser's dirty-navigation prompt.
    await harness.click(page, '#inspector input');
    for (const type of ['rawKeyDown', 'keyUp']) await page.send('Input.dispatchKeyEvent', { type, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
    await page.send('Input.insertText', { text: 'UNSAVED NAVIGATION CHECK' });
    await harness.key(page, 'Tab', true); await harness.key(page, 'Tab', false);
    await until('workbench.snapshot().dirty');
    const leaving = harness.click(page, '#back-to-game');
    await harness.sleep(100); await page.send('Page.handleJavaScriptDialog', { accept: false }); await leaving;
    check('cancelled dirty return keeps editor and unsaved document', await page.read(`location.origin===${JSON.stringify(builder)} && workbench.snapshot().dirty`));
    await harness.click(page, '#undo');
    await until('!workbench.snapshot().dirty');
    check('undo restores authored draft before leaving', await page.read('JSON.stringify(workbench.snapshot().document)') === documentBefore);
    await harness.click(page, '#back-to-game');
    await until(`location.origin===${JSON.stringify(frontend)} && !!globalThis.binaryNinja?.snapshot().character.ready`);
    check('Back to game returns to the real menu', await page.read("!!document.querySelector('#level-builder')"));
    check('builder visit preserves game saves and identity', JSON.stringify(await page.read("fetch('/api/progress').then(r=>r.json())")) === JSON.stringify(progressBefore));
    // Both writes reach the real temporary save server. Delay each request to
    // check queued saves and navigation after the click's transient activation.
    await page.read(`(() => {
        const original = window.fetch.bind(window);
        window.fetch = (url, options) => options?.method === 'PUT' && url === '/api/progress'
            ? new Promise(resolve => setTimeout(resolve, 3000)).then(() => original(url, options)) : original(url, options);
        const store = binaryNinja.store;
        store.save(structuredClone(store.progress));
        const newer = structuredClone(store.progress); newer.currentRoom = 'switch'; store.save(newer);
    })()`);
    await harness.click(page, '#open-workbench');
    await harness.sleep(100);
    check('builder navigation waits with the button disabled during queued saves', await page.read(`location.origin===${JSON.stringify(frontend)} && document.querySelector('#open-workbench').getAttribute('aria-disabled')==='true'`));
    await until(`location.origin===${JSON.stringify(builder)} && !!globalThis.workbench?.ready`);
    await harness.click(page, '#back-to-game');
    await until(`location.origin===${JSON.stringify(frontend)} && !!globalThis.binaryNinja?.snapshot().character.ready`);
    check('both queued saves finish before leaving the game', await page.read("binaryNinja.store.progress.currentRoom === 'switch' && binaryNinja.store.revision === 2"));
    if (page.errors.length) throw new Error(page.errors.join('\n'));
    const production = await harness.startServer();
    const published = await harness.page(production, browser);
    check('production menu exposes public Level Builder', await published.read("!!document.querySelector('#level-builder')"));
    check('production public builder exists', (await fetch(production + 'workbench.html')).status === 200);
    for (const path of ['workbench-runner.html', 'api/workbench/bootstrap']) check(`production ${path} unavailable`, (await fetch(production + path)).status === 404);
    if (published.errors.length) throw new Error(published.errors.join('\n'));
    await writeFile(join(reports, 'checks.json'), JSON.stringify({ pass: true, checks }, null, 2) + '\n');
    console.log(checks.map(label => `PASS ${label}`).join('\n'));
} catch (error) {
    if (page) await harness.shot(page, 'failure').catch(() => {});
    await writeFile(join(reports, 'checks.json'), JSON.stringify({ pass: false, checks, error: String(error) }, null, 2) + '\n');
    console.error(error); process.exitCode = 1;
} finally {
    await harness.cleanup();
    if (launcher && launcher.exitCode === null && launcher.signalCode === null) {
        const exited = once(launcher, 'exit', { signal: AbortSignal.timeout(10000) }); launcher.kill('SIGTERM');
        try { await exited; } catch { launcher.kill('SIGKILL'); throw new Error('Development launcher did not close its servers'); }
    }
}
