#!/usr/bin/env node
/** Reuses the actual two-visitor RACE route. Extra camera framing is labelled;
 * no player/controller/world values are injected. Phase changes use the lever. */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { coopBrowser, type Cdp, type GameSnapshot } from './coop-browser.ts';
import { raceRoute } from './race-browser-check.ts';
import { RACE_MACHINERY_BLOCKS } from '../src/slice/race-machinery-render.ts';
import type { RaceMachineryArtifact } from '../src/coop/race-machinery-types.ts';
import type { SharedRoom } from '../src/coop/protocol.ts';

const h = await coopBrowser({ shots: process.env.BN_SHOTS ?? resolve('docs/playtest/2026-10-22-race-machinery') });
const { snapshot, wait, check, sleep, key, tap } = h, saveShot = h.shot;
const asset = JSON.parse(await readFile('public/evidence/coop/race-condition.machinery.json', 'utf8')) as RaceMachineryArtifact;
const report: unknown[] = [];
const accepted = (s: GameSnapshot) => s.multiplayer!.shared! as SharedRoom<'race-condition'>;
const instrumentation = `(()=>{
    const records=[];globalThis.__machineryPaint=records;const original=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(t,x,y,...rest){
        const m=this.getTransform(),scale=Math.hypot(m.a,m.b);
        if(this.canvas.id==='stage'){records.push({text:String(t),font:this.font,pixels:parseFloat(this.font)*scale,worldX:x,worldY:y,colour:String(this.fillStyle),x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f,width:this.measureText(String(t)).width*scale,at:performance.now()});if(records.length>3000)records.splice(0,1500);}
        return original.call(this,t,x,y,...rest);
    };
})()`;
async function capture(p: Cdp, name: string, camera?: { x: number; y: number; zoom: number }) {
    if (camera) { await p.read(`binaryNinja.renderer.editorCamera=${JSON.stringify(camera)}`); await sleep(180); }
    try {
        const s = await wait(p, 'accepted machinery presentation', s => s.raceMachinery.availability === 'ready' && s.raceMachinery.sections.every(v => v.raw === accepted(s).levelState.outputs[v.output]));
        const view = s.raceMachinery;
        check(`${name}: all five native stores follow accepted raw outputs`, view.sections.length === 5 && view.sections.every(v => {
            const f = asset.fragments.find(f => f.id === v.storeId);
            return f?.store?.value === Number(v.raw) && f.store.rva === v.storeRva && v.fragments.every(part => part.instructions.every((i, n) =>
                asset.fragments.find(f => f.id === part.id)?.instructions.some(original => JSON.stringify(original) === JSON.stringify(i))
                && i.block_id === part.block && (!n || i.address === part.instructions[n - 1].address + part.instructions[n - 1].size)));
        }));
        check(`${name}: strings and colours follow physical power/latch, not just raw`, view.sections.every(v => {
            const r = accepted(s), expected = v.output === 'spanMaster' ? r.levelState.outputs.spanMaster : v.output === 'exitDoor' ? r.exitUnlocked : r.levelState.physical[v.output];
            return v.powered === expected && v.colour === (expected ? '#77ba9e' : '#ca817e') && (v.output !== 'spanMaster' || v.physical === null);
        }));
        check(`${name}: fixed world dimensions and order`, view.sections.every((v, n) => { const b = RACE_MACHINERY_BLOCKS[n]; return v.bounds.x === b.x && v.bounds.y === b.y && v.bounds.w === b.w && v.bounds.h === b.h; }));
        const paint = await p.read<{ text: string; font: string; worldX: number; worldY: number; pixels: number; colour: string }[]>(`(()=>{
            const seen=new Map(),bounds=${JSON.stringify(RACE_MACHINERY_BLOCKS)};
            for(const r of globalThis.__machineryPaint??[])if(performance.now()-r.at<100&&bounds.some(b=>r.worldX>=b.x&&r.worldX<b.x+b.w&&r.worldY>=b.y&&r.worldY<b.y+b.h))seen.set(r.text+'@'+r.worldX+','+r.worldY,r);
            return [...seen.values()].map(({at,...r})=>r);
        })()`);
        check(`${name}: environmental typography without debug metadata`, paint.every(p => p.font === '12px ui-monospace, monospace'
            && !/STATIC|WRITE 1|RAW |POWER|SERVER |STATE-LINKED|RVA|bb_|omitted|Evidence/.test(p.text)));
        if (camera?.zoom === 1) check(`${name}: nearby native text is painted at readable world size`, paint.some(p => /^(mov|cmp|test|setne)/.test(p.text) && p.pixels >= 11.9));
        await saveShot(p, name);
        report.push({ name, scope: camera ? 'real accepted gameplay state; camera-only art framing' : 'ordinary gameplay camera; real inputs', camera: s.camera, viewport: await p.read('[innerWidth,innerHeight]'), view, cargo: s.raceCargo, paint });
    } finally { if (camera) await p.read('binaryNinja.renderer.editorCamera=undefined'); }
}
// The route takes screenshots only at safe pauses, outside the timed grapple transfers.
h.shot = async (p, name) => {
    await saveShot(p, name);
    if (name === 'drop-b-camera') {
        await capture(p, 'cargo-comparison-drop-b');
        await capture(p, 'span-phase-inactive-nearby', { x: 1220, y: 540, zoom: 1 });
        await capture(p, 'return-inactive-nearby', { x: 2720, y: 770, zoom: 1 });
        await capture(p, 'exit-locked-nearby', { x: 3750, y: 650, zoom: 1 });
    } else if (name === 'trace-camera') {
        await capture(p, 'trace-operator-active');
        await capture(p, 'span-phase-a-active-nearby', { x: 1220, y: 540, zoom: 1 });
        await p.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
        await capture(p, 'phase-small-1024', { x: 1220, y: 540, zoom: 1 });
        await capture(p, 'phase-zoomed-out-small', { x: 1430, y: 540, zoom: .6 });
        await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
    } else if (name === 'right-deck') {
        const operator = h.clients[0];
        await tap(operator, 'KeyE');
        const grace = await wait(operator, 'accepted phase B and grace-inclusive A', s => accepted(s).levelState.inputs.phase && s.raceMachinery.sections.some(v => v.output === 'phaseA' && v.raw === false && v.physical === true));
        check('live phase handover keeps A active while selecting its zero store', grace.raceMachinery.sections.some(v => v.output === 'phaseA' && v.message === 'PHASE A ACTIVE' && v.storeId === 'phaseA.write-0'));
        report.push({ name: 'live-phase-grace', view: grace.raceMachinery, accepted: accepted(grace).levelState });
        await wait(operator, 'server ends phase A grace', s => s.raceMachinery.sections.some(v => v.output === 'phaseA' && v.physical === false));
        await sleep(500); await capture(operator, 'phase-b-active-nearby', { x: 1220, y: 540, zoom: 1 });
        await operator.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
        await tap(operator, 'KeyE'); await sleep(550);
        const reduced = await snapshot(operator);
        check('reduced motion has final strings and no pulses', reduced.raceMachinery.sections.every(v => v.message === v.revealed && v.pulse === 0));
        await capture(operator, 'phase-reduced-motion', { x: 1220, y: 540, zoom: 1 });
        await operator.send('Emulation.setEmulatedMedia', { features: [] });
    } else if (name === 'return-camera') {
        await capture(p, 'return-operator-active');
        await capture(p, 'return-active-nearby', { x: 2720, y: 770, zoom: 1 });
    } else if (name === 'commit') {
        await sleep(500); await capture(p, 'exit-operator-unlocked');
        await capture(p, 'exit-unlocked-nearby', { x: 3750, y: 650, zoom: 1 });
        // Open the existing paused inspector. No new evidence UI or pause behaviour.
        await h.click(p, '#evidence-toggle'); await sleep(200);
        await p.read(`(()=>{const s=document.querySelector('#evidence select');s.value='machinery:phaseA';s.dispatchEvent(new Event('change'));})()`);
        const detail = await p.read<string>("document.querySelector('#evidence pre').textContent");
        check('optional Evidence retains both stores, saved Boolean context and specimen', detail.includes('0x1AE1') && detail.includes('0x1B4D') && detail.includes('bb_00001AA3') && detail.includes(asset.bcf_pe_sha256) && detail.includes('NO MATCHING LIVE TRACE'));
        await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
        await sleep(100); await saveShot(p, 'machinery-evidence'); await h.click(p, '#evidence-toggle');
        await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
    }
};
try {
    const url = await h.startServer(), debug = await h.launch();
    const a = await h.page(url, debug), b = await h.page(url, debug);
    for (const p of [a, b]) await p.read(instrumentation);
    await h.click(a, '[data-create-lab="race-condition"]');
    const created = await wait(a, 'RACE created', s => !!s.multiplayer?.code && s.room === 'race-condition');
    await h.click(b, '#join-code'); await b.send('Input.insertText', { text: created.multiplayer!.code! }); await h.click(b, '#join-room');
    await wait(b, 'two independent visitors', s => s.room === 'race-condition' && !!s.multiplayer?.shared?.connected.every(Boolean));
    await raceRoute(h, url, debug, false, [a, b]);
    for (const p of [a, b]) check('no browser errors', p.errors.length === 0, p.errors.join('\n'));
    check('all five blocks use the new renderer without old duplicates', (await snapshot(a)).nativeWorld.panels.length === 0 && (await snapshot(a)).raceMachinery.sections.length === 5);
    check('normal runner never fetches large evidence/trace/disassembly', await b.read<boolean>("!performance.getEntriesByType('resource').some(r=>/\\.(traces|disasm|evidence)\\.json/.test(r.name))"));
} catch (error) {
    process.exitCode = 1; console.error(String(error).split(': {')[0]);
    for (const [n, p] of h.clients.entries()) { await saveShot(p, `failure-${n}`).catch(() => {}); await writeFile(join(h.shots, `failure-${n}.json`), JSON.stringify(await snapshot(p).catch(() => null), null, 2)); }
    await writeFile(join(h.shots, 'error.txt'), String(error));
} finally {
    await writeFile(join(h.shots, 'machinery-review.json'), JSON.stringify({ pass: !process.exitCode, checks: h.checks, report }, null, 2));
    await writeFile(join(h.shots, 'checks.txt'), h.checks.join('\n') + '\n');
    await h.cleanup();
}
