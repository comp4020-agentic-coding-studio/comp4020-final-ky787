/** Explicit diagnostic at the authored resource limits, using the production editor renderer. */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { coopBrowser } from './coop-browser.ts';
import { DRAFT_LIMITS, newDraft, serializeDraft } from '../src/workbench/model.ts';
import { requirePlayable } from '../src/workbench/validation.ts';

const reports = resolve(process.env.BN_SHOTS ?? '.workbench/reports/2026-10-16-payload-energy');
await mkdir(reports, { recursive: true });
const d = newDraft('energy-capacity-review');
d.title = 'ENERGY CAPACITY / DIAGNOSTIC';
d.geometry = { width: 2400, height: 1820, objects: [
    { type: 'spawn', id: 'p1', slot: 1, x: 80, y: 1543 },
    { type: 'spawn', id: 'p2', slot: 2, x: 220, y: 1543 },
    { type: 'exit', id: 'exit', x: 2280, y: 1420, w: 80, h: 140, latch: true, arrivals: 2 },
] };
for (let row = 0; row < 6; row++) d.geometry.objects.push({ type: 'platform', kind: 'static', id: `floor${row}`, x: 0, y: 260 + row * 260, w: 2400, h: 32 });
for (let i = 0; i < DRAFT_LIMITS.devices; i++) {
    const x = 150 + i % 8 * 300, y = 260 + Math.floor(i / 8) * 260;
    d.geometry.objects.push({ type: 'device', kind: 'socket', id: `receiver${i}`, label: `PAYLOAD ${i + 1}`, x, y });
    if (i < DRAFT_LIMITS.cubes) d.geometry.objects.push({ type: 'cube', id: `cargo${i}`, mark: String(i + 1), x, y: y - 22 });
}
d.controller = { kind: 'declarative', outputs: { ready: { op: 'ref', id: 'receiver0.occupied' } } };
d.bindings = [{ id: 'readyExit', output: 'ready', target: 'exit', property: 'unlock' }];
d.presentation = { display: { x: 400, y: 80 }, wires: [], labels: [], cameraReveals: [] };
d.previewStates = { empty: {} };
const path = join(reports, 'energy-capacity.json'); await writeFile(path, serializeDraft(requirePlayable(d)));
const h = await coopBrowser({ shots: reports, internalLabs: false, readyExpression: '!!globalThis.workbench?.ready' });
try {
    const origin = await h.startServer(), debug = await h.launch(), p = await h.page(`${origin}workbench.html`, debug);
    const { root } = await p.send('DOM.getDocument'), { nodeId } = await p.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#json-file' });
    await p.send('DOM.setFileInputFiles', { nodeId, files: [path] });
    for (let n = 0; n < 100 && !await p.read('workbench.snapshot().document.id==="energy-capacity-review"'); n++) await h.sleep(30);
    await h.click(p, '#play'); await h.click(p, '#world'); await h.key(p, 'Tab', true); await h.sleep(1500);
    h.check('capacity fixture has eight real resting cubes and eight live occupied receivers', await p.read(`Object.keys(workbench.observe().cubes).length===8 && Object.values(workbench.observe().deviceValues).filter(Boolean).length===8`));
    const timing = await p.read<{ frames: number; median: number; p95: number; maximum: number }>(`new Promise(resolve=>{const durations=[];let previous;
        function frame(t){if(previous!==undefined)durations.push(t-previous);previous=t;
            if(durations.length<180)requestAnimationFrame(frame);else{durations.sort((a,b)=>a-b);resolve({frames:180,median:durations[90],p95:durations[171],maximum:durations[179]})}}
        requestAnimationFrame(frame)})`);
    h.check('bounded 48-receiver / 8-cube overview stays below 50 ms at the 95th percentile', timing.p95 < 50);
    h.check('capacity review has no browser errors', p.errors.length === 0);
    await h.shot(p, '14-capacity-overview');
    await writeFile(join(reports, 'capacity.json'), JSON.stringify({ diagnostic: true, receivers: DRAFT_LIMITS.devices, cubes: DRAFT_LIMITS.cubes, timing, checks: h.checks }, null, 2));
} finally { await h.cleanup(); }
