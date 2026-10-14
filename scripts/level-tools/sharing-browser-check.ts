/** Exchange the actual public JSON download through the local GUI and CLI, then back. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { coopBrowser } from '../coop-browser.ts';
import { startWorkbench } from './service.ts';
import { serializeDraft, type DraftDocument } from '../../src/workbench/model.ts';

const reports = resolve('.workbench/reports/stage1-sharing'); await mkdir(reports, { recursive: true });
const source = resolve('.workbench/reports/public-builder/shared-export.json');
const original: DraftDocument = JSON.parse(await readFile(source, 'utf8'));
const h = await coopBrowser({ shots: reports, internalLabs: false, readyExpression: '!!globalThis.workbench?.ready' });
const local = await startWorkbench({ port: 0, draftRoot: join(h.temporary, 'drafts'), dataDir: join(h.temporary, 'local-data') });
try {
    const debug = await h.launch(), page = await h.page(local.origin, debug);
    const input = async (path: string) => { const { root } = await page.send('DOM.getDocument'); const { nodeId } = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#json-file' }); await page.send('DOM.setFileInputFiles', { nodeId, files: [path] }); await h.sleep(200); };
    await input(source);
    h.check('public download opens unchanged in local filesystem editor', serializeDraft(await page.read<DraftDocument>('workbench.snapshot().document')) === serializeDraft(original));
    const saving = h.click(page, '#save'); await h.sleep(80); await page.send('Page.handleJavaScriptDialog', { accept: true, promptText: 'shared.json' }); await saving;
    for (let i = 0; i < 100 && await page.read('workbench.snapshot().dirty'); i++) await h.sleep(30);
    const stored = await local.storage.read('shared.json');
    h.check('local Save writes identical canonical project-format JSON', serializeDraft(stored.document) === serializeDraft(original));
    const cli = JSON.parse(execFileSync(process.execPath, ['scripts/level-tools/cli.ts', 'validate', join(local.storage.root, 'shared.json'), '--json'], { encoding: 'utf8' }));
    h.check('Codex CLI validates the public-authored document and exact hash', cli.pass && cli.hash === stored.hash);
    await page.read("(()=>{const e=[...document.querySelectorAll('#inspector label')].find(l=>l.firstChild.textContent.trim()==='Title').querySelector('input');e.value='LOCAL EDIT RETURNED';e.dispatchEvent(new Event('change',{bubbles:true}))})()");
    await h.click(page, '#save'); await h.sleep(150);
    const returned = (await local.storage.read('shared.json')).document;
    // The local export button uses the same canonical serializer as the public export.
    await page.read("window.exportedJSON=null;const original=URL.createObjectURL;URL.createObjectURL=function(blob){blob.text().then(t=>window.exportedJSON=t);return original.call(URL,blob)}");
    await h.click(page, '#export');
    const json = await page.read<string>('window.exportedJSON');
    h.check('local Export JSON includes the edited full draft', json === serializeDraft(returned));
    const exported = join(h.temporary, 'returned.json'); await writeFile(exported, json);
    const origin = await h.startServer(), publicPage = await h.page(origin + 'workbench.html', debug);
    const { root } = await publicPage.send('DOM.getDocument'); const { nodeId } = await publicPage.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#json-file' });
    await publicPage.send('DOM.setFileInputFiles', { nodeId, files: [exported] });
    for (let i = 0; i < 100 && !await publicPage.read('workbench.snapshot().draftId'); i++) await h.sleep(30);
    h.check('local export reimports to public IndexedDB with matching content', serializeDraft(await publicPage.read<DraftDocument>('workbench.snapshot().document')) === serializeDraft(returned));
    await h.click(publicPage, '#play'); await h.sleep(100);
    h.check('exchanged draft uses public real-engine Playtest', await publicPage.read("workbench.snapshot().mode==='play' && !workbench.snapshot().runtimeError"));
    await h.click(publicPage, '#stop'); await h.shot(publicPage, 'returned-draft');
    if (page.errors.length || publicPage.errors.length) throw new Error([...page.errors, ...publicPage.errors].join('\n'));
    await writeFile(join(reports, 'checks.json'), JSON.stringify({ pass: true, checks: h.checks }, null, 2) + '\n');
} finally { await h.cleanup(); await local.close(); }
