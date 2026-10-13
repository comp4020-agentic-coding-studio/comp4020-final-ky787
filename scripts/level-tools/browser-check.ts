/** Human workflow acceptance: actual pointer placement/drags and native form controls. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { coopBrowser, type Cdp } from '../coop-browser.ts';
import { startWorkbench } from './service.ts';
import { newDraft, serializeDraft, draftHash, type DraftDocument } from '../../src/workbench/model.ts';
import { validateDraft } from '../../src/workbench/validation.ts';
import { evaluateDraft } from '../../src/workbench/evaluate.ts';

const reports = resolve('.workbench/reports/editor');
const h = await coopBrowser({ shots: reports, internalLabs: false, readyExpression: "!!window.workbench?.ready && window.workbench.snapshot().file==='blank-gui.json'" });
const app = await startWorkbench({ port: 0, draftRoot: join(h.temporary, 'drafts'), dataDir: join(h.temporary, 'data') });
await app.storage.write('blank-gui.json', { ...newDraft('gui-fixture'), title: 'GUI ACCEPTANCE / JSON CREATED' }, null);
let p: Cdp | undefined;
const checks: string[] = [];
function check(label: string, condition: unknown) { if (!condition) throw new Error(`FAIL ${label}`); checks.push(label); console.log(`PASS ${label}`); }
async function until(expression: string, label: string, timeout = 6000) { const end = Date.now() + timeout; while (Date.now() < end) { if (p!.errors.length) throw new Error(p!.errors.join('\n')); if (await p!.read<boolean>(expression)) return; await h.sleep(25); } throw new Error(`Timed out: ${label}`); }
const doc = () => p!.read<DraftDocument>('workbench.snapshot().document');
async function point(x: number, y: number) { return p!.read<{ x: number; y: number }>(`(()=>{const c=workbench.snapshot().camera,r=document.querySelector('#world').getBoundingClientRect();return{x:r.x+r.width/2+(${x}-c.x)*c.zoom,y:r.y+r.height/2+(${y}-c.y)*c.zoom}})()`); }
async function mouse(type: string, at: { x: number; y: number }, buttons: number, button = 'left', modifiers = 0) { await p!.send('Input.dispatchMouseEvent', { type, ...at, button, buttons, clickCount: 1, modifiers }); }
async function clickWorld(x: number, y: number) { const at = await point(x, y); await mouse('mousePressed', at, 1); await mouse('mouseReleased', at, 0); await h.sleep(60); }
async function drag(x: number, y: number, endX: number, endY: number) { const from = await point(x, y), to = await point(endX, endY); await mouse('mousePressed', from, 1); for (let i = 1; i <= 8; i++) { await mouse('mouseMoved', { x: from.x + (to.x - from.x) * i / 8, y: from.y + (to.y - from.y) * i / 8 }, 1); await h.sleep(12); } await mouse('mouseReleased', to, 0); await h.sleep(100); }
async function value(selector: string, value: string) { await p!.read(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing form control');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`); await h.sleep(70); }
async function inputText(selector: string, text: string) { await h.click(p!, selector); await p!.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 }); await p!.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 }); await p!.send('Input.insertText', { text }); await p!.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }); await p!.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }); await h.sleep(80); }
async function property(label: string, text: string) { const selector = await p!.read<string>(`(()=>{const l=[...document.querySelectorAll('#inspector label')].find(l=>l.firstChild?.textContent===${JSON.stringify(label)});if(!l)throw Error('Missing property '+${JSON.stringify(label)});return '#'+l.querySelector('input,select').id;})()`); await inputText(selector, text); }
async function screenshot(name: string) { await h.shot(p!, name); }
async function modifiedClick(selector: string, modifiers: number) {
    const at = await p!.read<{ x: number; y: number }>(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await mouse('mousePressed', at, 1, 'left', modifiers); await mouse('mouseReleased', at, 0, 'left', modifiers); await h.sleep(80);
}
async function dialogClick(selector: string, accept: boolean) { const clicked = h.click(p!, selector); await h.sleep(80); await p!.send('Page.handleJavaScriptDialog', { accept }); await clicked; }

try {
    const browser = await h.launch(); p = await h.page(app.origin, browser);
    check('CLI/JSON-created draft opens from canonical file', (await doc()).id === 'gui-fixture');
    check('actual engine preview built without errors', await p.read('!workbench.snapshot().runtimeError && workbench.snapshot().playable'));
    await screenshot('01-overview');
    await h.click(p, '[data-palette="code"]'); await clickWorld(700, 520);
    let current = await doc(), added = current.geometry.objects.find(o => !newDraft().geometry.objects.some(base => base.id === o.id));
    if (!added || added.type !== 'platform') throw new Error('Palette did not create platform');
    const addedId = added.id;
    check('palette places snapped object', added.x === 700 && added.y === 520);
    await drag(added.x + 50, added.y + 14, added.x + 90, added.y - 26);
    current = await doc(); added = current.geometry.objects.find(o => o.id === addedId)!;
    check('canvas drag moves object on grid', added.x === 740 && added.y === 480);
    await h.click(p, '#undo'); check('one undo reverses whole drag', (await doc()).geometry.objects.find(o => o.id === addedId)?.x === 700);
    await h.click(p, '#redo'); check('redo restores drag', (await doc()).geometry.objects.find(o => o.id === addedId)?.x === 740);
    const platform = (await doc()).geometry.objects.find(o => o.id === addedId)!;
    if (!('w' in platform)) throw new Error('Not rectangular');
    await drag(platform.x + platform.w, platform.y + platform.h, platform.x + platform.w + 60, platform.y + platform.h + 20);
    check('resize handle updates dimensions', ((await doc()).geometry.objects.find(o => o.id === addedId) as typeof platform).w === platform.w + 60);
    await property('Label', 'GUI route'); check('inspector text edit does not move/delete selected object', (await doc()).geometry.objects.find(o => o.id === addedId)?.label === 'GUI route');
    await h.click(p, '#connect'); await clickWorld(440, 625); await screenshot('02-connection-ports'); await clickWorld(870, 480); await h.click(p, '#connect');
    current = await doc(); const connectedBinding = current.bindings.find(b => b.target === addedId);
    check('functional connection creates binding and wire', connectedBinding && current.presentation.wires.some(w => w.binding === connectedBinding.id));
    // Bind the added route to an expression authored with the ordinary GUI form.
    await inputText('[aria-label="New output ID"]', 'rightRoute'); await h.click(p, '.wb-logic-form button');
    const outputSelector = await p.read<string>(`(()=>{const blocks=[...document.querySelectorAll('.wb-output')];return '.wb-output:nth-of-type('+(blocks.findIndex(b=>b.querySelector('header').textContent.startsWith('rightRoute'))+1)+')'})()`);
    // Stable attribute for this existing output section, used only as a DOM locator.
    await p.read(`(()=>{[...document.querySelectorAll('.wb-output')].find(b=>b.querySelector('header').textContent.startsWith('rightRoute')).id='test-right-output'})()`);
    await value('#test-right-output > .wb-expression > .row select', 'and');
    const locateRight = async () => { await p!.read(`(()=>{[...document.querySelectorAll('.wb-output')].find(b=>b.querySelector('header').textContent.startsWith('rightRoute')).id='test-right-output'})()`); };
    await locateRight(); await value('#test-right-output > .wb-expression > .wb-expression:nth-of-type(2) > .row select', 'ref');
    await locateRight(); await value('#test-right-output [aria-label="Device port or output reference"]', 'powerPlate.occupied');
    await locateRight(); await value('#test-right-output > .wb-expression > .wb-expression:nth-of-type(3) > .row select', 'ref');
    await locateRight(); await p.read(`(()=>{const e=[...document.querySelectorAll('#test-right-output [aria-label="Device port or output reference"]')][1];e.value='routeLever.value';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await value('#binding-output', 'rightRoute'); await h.click(p, '#bind');
    current = await doc(); check('GUI expression equals JSON AND routes', current.controller.kind === 'declarative' && JSON.stringify(current.controller.outputs.rightRoute) === JSON.stringify({ op: 'and', args: [{ op: 'ref', id: 'powerPlate.occupied' }, { op: 'ref', id: 'routeLever.value' }] }));
    check('shared evaluator resolves opposite routes', evaluateDraft(current, { 'powerPlate.occupied': true, 'routeLever.value': false }).routePower && !evaluateDraft(current, { 'powerPlate.occupied': true, 'routeLever.value': false }).rightRoute);
    await h.click(p, '#duplicate'); const duplicateId = await p.read<string>('workbench.snapshot().selection[0]');
    check('duplicate creates new stable ID', duplicateId !== addedId && (await doc()).geometry.objects.some(o => o.id === duplicateId));
    // Confirm the expected destructive dialog through CDP, not by overriding browser confirm.
    const deletion = h.click(p, '#delete'); await h.sleep(80); await p.send('Page.handleJavaScriptDialog', { accept: true }); await deletion;
    check('delete removes duplicate', !(await doc()).geometry.objects.some(o => o.id === duplicateId));
    await h.click(p, '#undo'); check('undo restores deleted object', (await doc()).geometry.objects.some(o => o.id === duplicateId));
    await h.click(p, '#redo');
    // A selected control and its target are copied through native Shift selection.
    await h.click(p, '[data-id="powerPlate"] .select-object');
    await modifiedClick(`[data-id="${addedId}"] .select-object`, 8);
    check('hierarchy Shift selection includes both control and machinery', await p.read(`workbench.snapshot().selection.includes('powerPlate') && workbench.snapshot().selection.includes(${JSON.stringify(addedId)}) && workbench.snapshot().selection.length===2`));
    const beforeGroup = serializeDraft(await doc()); await h.click(p, '#duplicate');
    current = await doc(); const groupIds = await p.read<string[]>('workbench.snapshot().selection');
    const copiedPlate = current.geometry.objects.find(o => groupIds.includes(o.id) && o.type === 'device');
    const copiedPlatform = current.geometry.objects.find(o => groupIds.includes(o.id) && o.type === 'platform');
    const copiedBinding = current.bindings.find(b => b.target === copiedPlatform?.id);
    check('GUI group duplicate remaps selected input and preserves external lever reference', current.controller.kind === 'declarative' && !!copiedPlate && !!copiedBinding && JSON.stringify(current.controller.outputs[copiedBinding.output]) === JSON.stringify({ op: 'and', args: [{ op: 'ref', id: `${copiedPlate.id}.occupied` }, { op: 'ref', id: 'routeLever.value' }] }));
    await h.click(p, '#undo'); check('group duplicate is one undoable change', serializeDraft(await doc()) === beforeGroup);
    // Configurable grid operates on authored points rather than canvas pixels.
    await value('#grid-size', '24'); await h.click(p, '[data-palette="cube"]'); await clickWorld(347, 310);
    const snappedCube = (await doc()).geometry.objects.find(o => o.id === 'cube');
    check('configured 24-unit grid snaps placement', snappedCube?.x === 336 && snappedCube.y === 312);
    await h.click(p, '#undo'); await h.click(p, '#undo');
    await h.click(p, `[data-id="${addedId}"] .select-object`);
    const beforeInvalid = serializeDraft(await doc()); await property('X', '10001');
    check('invalid inspector coordinate preserves last valid document', serializeDraft(await doc()) === beforeInvalid);
    await h.click(p, `[data-id="${addedId}"] [data-hide]`);
    check('visibility control hides the object from canvas selection', (await doc()).editor.hidden.includes(addedId));
    await clickWorld(800, 500); check('hidden object cannot be selected on canvas', !(await p.read<string[]>('workbench.snapshot().selection')).includes(addedId));
    await h.click(p, `[data-id="${addedId}"] [data-hide]`); await h.click(p, `[data-id="${addedId}"] .select-object`); await h.click(p, `[data-id="${addedId}"] [data-lock]`);
    const beforeLocked = (await doc()).geometry.objects.find(o => o.id === addedId)!;
    await drag(800, 500, 880, 520); const afterLocked = (await doc()).geometry.objects.find(o => o.id === addedId)!;
    check('locked object ignores canvas move gesture', beforeLocked.x === afterLocked.x && beforeLocked.y === afterLocked.y);
    await h.click(p, `[data-id="${addedId}"] [data-lock]`);
    // Pan and wheel zoom are dispatched as physical pointer input.
    const stage = await p.read<{ x: number; y: number }>(`(()=>{const r=document.querySelector('#world').getBoundingClientRect();return{x:Math.round(r.x+r.width*.6),y:Math.round(r.y+r.height*.4)}})()`);
    const panBefore = await p.read<{x:number;y:number;zoom:number}>('workbench.snapshot().camera');
    await mouse('mousePressed', stage, 4, 'middle'); await mouse('mouseMoved', { x: stage.x + 70, y: stage.y + 20 }, 4, 'middle'); await mouse('mouseReleased', { x: stage.x + 70, y: stage.y + 20 }, 0, 'middle');
    const panAfter = await p.read<{x:number;y:number;zoom:number}>('workbench.snapshot().camera');
    check('middle-pointer pan preserves world scale', Math.abs(panAfter.x - panBefore.x + 70 / panBefore.zoom) < .001 && panAfter.zoom === panBefore.zoom);
    const worldAtPointer = () => p!.read<{x:number;y:number;zoom:number}>(`(()=>{const c=workbench.snapshot().camera,r=document.querySelector('#world').getBoundingClientRect();return{x:c.x+(${stage.x}-r.x-r.width/2)/c.zoom,y:c.y+(${stage.y}-r.y-r.height/2)/c.zoom,zoom:c.zoom}})()`);
    const wheelBefore = await worldAtPointer(); await p.send('Input.dispatchMouseEvent', { type: 'mouseWheel', ...stage, deltaX: 0, deltaY: -180 }); await until(`workbench.snapshot().camera.zoom>${wheelBefore.zoom}`, 'wheel zoom input'); const wheelAfter = await worldAtPointer();
    check('wheel zoom keeps cursor world point anchored', wheelAfter.zoom > wheelBefore.zoom && Math.hypot(wheelAfter.x - wheelBefore.x, wheelAfter.y - wheelBefore.y) < .01);
    await h.click(p, '#fit');
    const dirtyBefore = serializeDraft(await doc()); await dialogClick('#new', false);
    check('declining dirty replacement preserves document', serializeDraft(await doc()) === dirtyBefore);
    await h.sleep(750); const recovery = await p.read<{document:DraftDocument}|null>("fetch('/api/workbench/recovery').then(r=>r.json())");
    check('unsaved recovery stores the same structured draft separately', recovery && serializeDraft(recovery.document) === serializeDraft(await doc()));
    await screenshot('07-editor-tools');
    await h.click(p, '#save'); await until('!workbench.snapshot().dirty', 'GUI save');
    await until("fetch('/api/workbench/recovery').then(r=>r.json()).then(v=>v===null)", 'saved recovery removed');
    check('successful Save clears only the saved recovery snapshot', true);
    const saved = await app.storage.read('blank-gui.json'); check('GUI save is the same canonical file/hash CLI validates', saved.hash === await draftHash(await doc()) && validateDraft(saved.document).playable);
    const guiSavedPath = join(reports, 'gui-saved-draft.json'); await writeFile(guiSavedPath, serializeDraft(saved.document));
    const cli = await promisify(execFile)(process.execPath, ['scripts/level-tools/cli.ts', 'validate', guiSavedPath, '--json']);
    check('CLI process validates the exact GUI-saved file', JSON.parse(cli.stdout).playable === true);
    await h.click(p, '#preview-mode'); await value('#preview-state', 'left-powered');
    check('State Preview actual evaluator powers left route', await p.read('workbench.observe().outputs.routePower===true && workbench.observe().outputs.rightRoute===false'));
    await screenshot('02-left-powered');
    await h.click(p, '[data-preview-input="routeLever.value"]'); check('GUI input toggle swaps actual outputs', await p.read('workbench.observe().outputs.routePower===false && workbench.observe().outputs.rightRoute===true'));
    await screenshot('03-right-powered');
    await h.click(p, '#forced-mode'); check('forced preview is clearly labelled', await p.read("document.querySelector('#mode-banner').textContent.includes('FORCED OUTPUT DIAGNOSTIC')"));
    await h.click(p, '#edit-mode');
    const beforeTest = serializeDraft(await doc()), beforeCamera = await p.read('workbench.snapshot().camera');
    await h.click(p, '#play'); await until("workbench.snapshot().mode==='play'", 'play mode'); await h.key(p, 'KeyD', true); await h.sleep(280); await h.key(p, 'KeyD', false);
    check('physical movement precedes reset', await p.read('workbench.observe().player.x>120'));
    await h.key(p, 'KeyR', true); await h.key(p, 'KeyR', false);
    await until('workbench.observe().deaths===1 && Math.abs(workbench.observe().player.x-120)<.1', 'R respawn at authored entry');
    check('R resets through engine and records the actual death event', await p.read("workbench.exportRecording().events.some(e=>e.kind==='death' && e.detail.cause==='reset')"));
    await h.click(p, '#stop');
    check('real physics stop preserves authored document', serializeDraft(await doc()) === beforeTest);
    check('stop restores editor camera', JSON.stringify(await p.read('workbench.snapshot().camera')) === JSON.stringify(beforeCamera));
    check('actual measured trajectory recorded', await p.read('workbench.exportRecording().samples.length>3 && workbench.exportRecording().samples.some(s=>s.player.x>120)'));
    await screenshot('04-measured-path');
    await h.click(p, `[data-id="${addedId}"] .select-object`); await h.click(p, '#frame'); await screenshot('05-frame-selection');
    const zoom100 = await p.read<{x:number;y:number;zoom:number}>("(()=>{const r=document.querySelector('#world').getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),zoom:workbench.snapshot().camera.zoom}})()");
    await p.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: zoom100.x, y: zoom100.y, deltaX: 0, deltaY: Math.log(zoom100.zoom) / .0015 });
    await until('Math.abs(workbench.snapshot().camera.zoom-1)<.001', '100 percent editor view');
    check('normal zoom is actual 100 percent scale', await p.read('Math.abs(workbench.snapshot().camera.zoom-1)<.001'));
    await screenshot('05-normal-zoom'); await h.click(p, '#fit');
    await property('Label', 'GUI unsaved conflict edit');
    const external = (await app.storage.read('blank-gui.json')).document; external.title = 'EXTERNAL AGENT EDIT'; await writeFile(join(app.storage.root, 'blank-gui.json'), serializeDraft(external));
    await h.click(p, '#save'); await until("!!document.querySelector('#reload-conflict')", 'external conflict');
    check('external edit conflict preserves newer file and dirty GUI', (await app.storage.read('blank-gui.json')).document.title === 'EXTERNAL AGENT EDIT' && await p.read('workbench.snapshot().dirty'));
    await screenshot('06-file-conflict');
    if (p.errors.length) throw new Error(p.errors.join('\n'));
    await writeFile(join(reports, 'checks.json'), JSON.stringify({ pass: true, checks, engineRevision: app.engineRevision }, null, 2) + '\n');
} catch (error) {
    if (p) await screenshot('failure').catch(() => {});
    await mkdir(reports, { recursive: true }); await writeFile(join(reports, 'checks.json'), JSON.stringify({ pass: false, checks, error: String(error) }, null, 2) + '\n');
    console.error(error); process.exitCode = 1;
} finally { await h.cleanup(); await app.close(); }
