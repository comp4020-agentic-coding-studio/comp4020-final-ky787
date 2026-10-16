/** Draft import/storage and public-session smoke checks; route evidence lives in level:playtest reports. */
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Cdp, coopBrowser } from '../coop-browser.ts';
import { draftHash, serializeDraft, type DraftDocument } from '../../src/workbench/model.ts';
const supported = ['handshake', 'deadlock', 'use-after-free'] as const;
const requested = process.argv.slice(2);
if (requested.some(name => !supported.includes(name as typeof supported[number]))) throw new Error('Usage: chambers-browser-check.ts [handshake] [deadlock] [use-after-free]');
const names = requested.length ? [...new Set(requested)] : [...supported];
const hashes: Record<string, string> = {};
const externalOrigin = process.env.PUBLIC_CUSTOM_URL?.trim() || undefined;
const mode = externalOrigin ? 'external' : 'local';
const reports = resolve(process.env.CHAMBERS_REPORT_DIR ?? `.workbench/reports/2026-10-16-chambers/integration${externalOrigin ? '-live' : ''}`);
const reportFile = requested.length ? `report-${names.join('-')}.json` : 'report.json';
await mkdir(reports, { recursive: true });
const h = await coopBrowser({ shots: reports, internalLabs: false, readyExpression: '!!globalThis.customLevel?.observe().ready' });
const checks: string[] = [], pages: Cdp[] = [];
let root: Cdp | undefined, origin = '';
const check = (label: string, condition: unknown) => { if (!condition) throw new Error(label); checks.push(label); console.log(`PASS ${label}`); };
async function until(p: Cdp, expression: string, timeout = 15000) {
    const deadline = Date.now() + timeout;
    while (!await p.read<boolean>(expression)) { if (p.errors.length) throw new Error(p.errors.join('\n')); if (Date.now() > deadline) throw new Error(`Timeout ${expression}`); await h.sleep(30); }
}
try {
    origin = externalOrigin ?? await h.startServer();
    if (!origin.endsWith('/')) origin += '/';
    const debuggerUrl = await h.launch(); root = await new Cdp(debuggerUrl).open();
    const downloads = join(h.temporary, 'exports'); await mkdir(downloads);
    await root.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
    async function attach(targetId: string) {
        const p = await new Cdp(`${new URL(debuggerUrl).origin}/devtools/page/${targetId}`).open(); pages.push(p);
        await p.send('Runtime.enable'); await p.send('Page.enable');
        await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
        await p.send('Emulation.setFocusEmulationEnabled', { enabled: true }); return p;
    }
    for (const name of names) {
        const source = JSON.parse(await readFile(`levels/drafts/${name}.json`, 'utf8')) as DraftDocument, hash = await draftHash(source);
        hashes[name] = hash;
        const { targetId } = await root.send('Target.createTarget', { url: origin + 'workbench.html' }), editor = await attach(targetId);
        await until(editor, '!!globalThis.workbench?.ready');
        const { root: dom } = await editor.send('DOM.getDocument'), { nodeId } = await editor.send('DOM.querySelector', { nodeId: dom.nodeId, selector: '#json-file' });
        await editor.send('DOM.setFileInputFiles', { nodeId, files: [resolve(`levels/drafts/${name}.json`)] });
        await until(editor, `workbench.snapshot().document.id===${JSON.stringify(name)} && !!workbench.snapshot().draftId`);
        check(`${name}: graphical import is canonical and playable`, serializeDraft(await editor.read('workbench.snapshot().document')) === serializeDraft(source) && await editor.read('workbench.snapshot().playable && !workbench.snapshot().runtimeError'));
        await h.click(editor, '#fit'); await h.shot(editor, `${name}-editor`);
        await h.click(editor, '#preview-mode');
        for (const state of Object.keys(source.previewStates)) {
            await editor.read(`(()=>{const e=document.querySelector('#preview-state');e.value=${JSON.stringify(state)};e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
            if (!await editor.read('workbench.snapshot().mode === "preview" && !workbench.snapshot().runtimeError')) throw new Error(`${name}: saved state preview ${state} failed`);
        }
        check(`${name}: saved state previews evaluate`, await editor.read('workbench.snapshot().mode === "preview" && !workbench.snapshot().runtimeError'));
        await h.shot(editor, `${name}-state-preview`); await h.click(editor, '#edit-mode');
        await h.click(editor, '#play'); await until(editor, 'workbench.snapshot().mode === "play"'); await h.sleep(200); await h.click(editor, '#stop');
        check(`${name}: local physics preserves authored document`, serializeDraft(await editor.read('workbench.snapshot().document')) === serializeDraft(source));
        await h.click(editor, '#export');
        const deadline = Date.now() + 5000; let exported: string | undefined;
        do { exported = (await readdir(downloads)).find(f => f.startsWith(name) && f.endsWith('.json')); if (!exported) await h.sleep(30); } while (!exported && Date.now() < deadline);
        check(`${name}: export retains the canonical JSON`, exported && serializeDraft(JSON.parse(await readFile(join(downloads, exported), 'utf8'))) === serializeDraft(source));
        const savedId = await editor.read<string>('workbench.snapshot().draftId'); await editor.send('Page.reload'); await h.sleep(100); await until(editor, '!!globalThis.workbench?.ready');
        await editor.read(`(()=>{const e=document.querySelector('#files');e.value=${JSON.stringify(savedId)};e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
        await until(editor, `workbench.snapshot().draftId===${JSON.stringify(savedId)}`);
        check(`${name}: IndexedDB reload preserves draft`, serializeDraft(await editor.read('workbench.snapshot().document')) === serializeDraft(source));
        const before = new Set((await root.send('Target.getTargets')).targetInfos.map((t: { targetId: string }) => t.targetId)); await h.click(editor, '#coop');
        let hostId: string | undefined; const hostDeadline = Date.now() + 15000;
        while (!hostId && Date.now() < hostDeadline) { hostId = (await root.send('Target.getTargets')).targetInfos.find((t: { targetId: string; url: string }) => !before.has(t.targetId) && t.url.includes('/custom-level.html'))?.targetId; if (!hostId) await h.sleep(30); }
        if (!hostId) throw new Error(`${name}: TEST WITH FRIEND did not open`);
        const host = await attach(hostId); await until(host, '!!globalThis.customLevel?.observe().ready');
        const invite = await host.read<string>('document.querySelector("#invite").value'), guest = await h.page(invite, debuggerUrl); pages.push(guest);
        await until(host, 'customLevel.observe().session.peers[1]');
        const [a, b] = await Promise.all([host.read<any>('customLevel.observe()'), guest.read<any>('customLevel.observe()')]);
        check(`${name}: public-compatible two-player frozen snapshot`, a.hash === hash && b.hash === hash && a.session.visitor !== b.session.visitor && a.session.slot === 1 && b.session.slot === 2);
        check(`${name}: both authored spawns are valid`, [a, b].every((s, i) => { const spawn = source.geometry.objects.find(o => o.type === 'spawn' && o.slot === i + 1)!; return Math.abs(s.player.x - spawn.x) < 1 && Math.abs(s.player.y - spawn.y) < 2 && s.player.deaths === 0; }));
        check(`${name}: public gameplay exposes no editor`, await guest.read('!globalThis.workbench'));
        await h.shot(host, `${name}-public-host`); await h.shot(guest, `${name}-public-guest`);
        await root.send('Target.closeTarget', { targetId: hostId }); await root.send('Target.closeTarget', { targetId });
    }
    check('no browser exceptions', pages.every(p => p.errors.length === 0));
    await writeFile(join(reports, reportFile), JSON.stringify({ pass: true, mode, origin, drafts: names, hashes, scope: 'import/storage/preview/public-session smoke; full physical solves are separate CLI reports', checks }, null, 2) + '\n');
} catch (error) {
    await writeFile(join(reports, reportFile), JSON.stringify({ pass: false, mode, origin, drafts: names, hashes, checks, error: String(error) }, null, 2) + '\n'); throw error;
} finally { root?.socket.close(); for (const p of pages) p.socket.close(); await h.cleanup(); }
