#!/usr/bin/env node
/**
 * Production Canvas and two independent visitors. Camera overrides below only
 * frame art: no player, cube, controller, input or completion state is injected.
 * Run --handshake first as the visual acceptance gate before other layouts.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { coopBrowser, type Cdp, type GameSnapshot } from './coop-browser.ts';
import { onboardNinja } from './character-onboarding.ts';
import type { NativeDisasm, NativeEvidence } from '../src/coop/native-evidence.ts';

const handshakeOnly = process.argv.includes('--handshake');
const h = await coopBrowser({ shots: process.env.BN_SHOTS ?? resolve('docs/playtest/2026-10-20-coop-world-assembly'), internalLabs: false, onboarding: false });
const { check, click, sleep, wait, snapshot } = h;
const report: unknown[] = [];
interface Instruction { address: number; rva: number; size: number; block_id: string; bytes: string; mnemonic: string; op_str: string }
interface Panel {
    objectId: string; output: string; address: number | string; raw: boolean | null; physical: boolean | null;
    expanded: boolean; bounds: { x: number; y: number; w: number; h: number };
    instructions: Instruction[]; storeAddress: number; static: boolean;
}
interface NativeView { chamber: string | null; status: string; panels: Panel[]; outputs: Record<string, boolean>; physical: Record<string, boolean>; [key: string]: unknown }
interface Paint { text: string; font: string; x: number; y: number; width: number; height: number; pixels: number; colour: string }
const instrumentation = `(() => {
    if (globalThis.__nativeWorldPaint) return;
    const records=[];Object.defineProperty(globalThis,'__nativeWorldPaint',{value:records});
    const original=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(value,x,y,maxWidth){
        const result=maxWidth===undefined?original.call(this,value,x,y):original.call(this,value,x,y,maxWidth);
        if(this.canvas.id==='stage'){
            const m=this.getTransform(),measure=this.measureText(String(value)),s=Math.hypot(m.a,m.b);
            records.push({text:String(value),font:this.font,x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f,
                width:measure.width*s,height:Math.max(8,(measure.actualBoundingBoxAscent+measure.actualBoundingBoxDescent)*s),
                colour:String(this.fillStyle),at:performance.now()});
            if(records.length>4000)records.splice(0,2000);
        }
        return result;
    };
})()`;
async function until(p: Cdp, expression: string, timeout = 15000) {
    const end = Date.now() + timeout;
    while (!await p.read<boolean>(expression)) {
        if (p.errors.length) throw new Error(p.errors.join('\n'));
        if (Date.now() > end) throw new Error(`Timed out: ${expression}`);
        await sleep(25);
    }
}
async function instrument(p: Cdp) {
    await p.send('Page.addScriptToEvaluateOnNewDocument', { source: instrumentation });
    await p.read(instrumentation);
}
async function native(p: Cdp) { return p.read<NativeView>('binaryNinja.snapshot().nativeWorld'); }
async function ready(p: Cdp, chamber: string) {
    await until(p, `binaryNinja.snapshot().nativeWorld?.chamber===${JSON.stringify(chamber)}&&binaryNinja.snapshot().nativeWorld?.status==='ready'`);
}
async function painted(p: Cdp): Promise<Paint[]> {
    return p.read<Paint[]>(`(()=>{
        const canvas=document.querySelector('#stage'),ctx=canvas.getContext('2d'),seen=new Map();
        for(const r of __nativeWorldPaint)if(performance.now()-r.at<200)seen.set(r.text+'@'+Math.round(r.x)+','+Math.round(r.y),r);
        return [...seen.values()].map(r=>{
            const x=Math.max(0,Math.floor(r.x)),y=Math.max(0,Math.floor(r.y-r.height));
            const w=Math.min(canvas.width-x,Math.ceil(r.width)),h=Math.min(canvas.height-y,Math.ceil(r.height+3));let pixels=0;
            if(w>0&&h>0){const data=ctx.getImageData(x,y,w,h).data;for(let i=0;i<data.length;i+=4)if(data[i]+data[i+1]+data[i+2]>270)pixels++;}
            return {...r,pixels};
        });
    })()`);
}
const sources = new Map<string, { disasm: NativeDisasm; evidence: NativeEvidence }>();
async function verify(p: Cdp, chamber: string, label: string, requireExpanded = true) {
    let source = sources.get(chamber);
    if (!source) {
        source = { disasm: JSON.parse(await readFile(`public/evidence/coop/${chamber}.disasm.json`, 'utf8')),
            evidence: JSON.parse(await readFile(`public/evidence/coop/${chamber}.evidence.json`, 'utf8')) };
        sources.set(chamber, source);
    }
    const view = await native(p), paints = await painted(p), expanded = view.panels.filter(panel => panel.expanded);
    const cargo = chamber === 'race-condition' ? await p.read<GameSnapshot['raceCargo']>('binaryNinja.snapshot().raceCargo') : null;
    check(`${label}: own specimen loaded`, view.chamber === chamber && view.status === 'ready' && view.specimen === source.evidence.specimen_id);
    check(`${label}: static panel provenance matches acquired instructions and recorded output stores`, (view.panels.length > 0 || cargo?.visible === true && cargo.sections.length === 4) && view.panels.every(panel => {
        const output = source.evidence.outputs.find(output => output.name === panel.output);
        return panel.static && !!output?.store_sites.some(site => site.instruction_address === panel.storeAddress)
            && panel.instructions.every((instruction, index) => source.disasm.instructions.some(known => known.address === instruction.address
                && known.bytes === instruction.bytes && known.mnemonic === instruction.mnemonic && known.op_str === instruction.op_str
                && known.block_id === instruction.block_id && known.rva === instruction.rva && known.size === instruction.size)
                && (!index || instruction.address === panel.instructions[index - 1].address + panel.instructions[index - 1].size));
    }));
    check(`${label}: native status reads only accepted server values`, view.panels.every(panel => panel.raw === (view.outputs[panel.output] ?? view.physical[panel.output] ?? null)));
    if (chamber === 'race-condition') {
        check(`${label}: grouped RACE asset available`, cargo?.availability === 'ready' && cargo.mode === 'STATE-LINKED');
        check(`${label}: only four superseded cargo listings suppressed`, !view.panels.some(panel => ['topBridge', 'bufferBridge', 'safetyFirewall', 'raceFirewall'].includes(panel.output)));
        if (cargo?.visible) {
            check(`${label}: grouped excerpts preserve separate blocks, exact native bytes and within-fragment contiguity`, cargo.sections.length === 4 && cargo.sections.every(section => {
                const output = source.evidence.outputs.find(o => o.name === section.output);
                return section.raw === view.outputs[section.output] && output?.store_sites.some(site => site.instruction_rva === section.storeRva && site.observed_values.includes(Number(section.raw)))
                    && (cargo.detail !== 'assembly' || section.fragments.length === 3)
                    && section.fragments.every(fragment => fragment.omittedBefore.includes('omitted') && fragment.instructions.every((i, n) =>
                        i.block_id === fragment.block && source.disasm.instructions.some(known => known.address === i.address && known.bytes === i.bytes
                            && known.rva === i.rva && known.size === i.size && known.block_id === i.block_id && known.mnemonic === i.mnemonic && known.op_str === i.op_str)
                        && (!n || i.address === fragment.instructions[n - 1].address + fragment.instructions[n - 1].size)));
            }));
            if (cargo.detail === 'assembly') check(`${label}: grouped native text is visibly painted`, cargo.sections.every(s => s.fragments.every(f => f.instructions.every(i => paints.some(paint => paint.text === `${i.mnemonic} ${i.op_str}` && paint.height >= 8 && paint.pixels > 4)))));
        }
        report.push({ label, cargo });
    }
    const inverted = view.panels.find(panel => panel.output === 'assistBlocked');
    if (inverted) check(`${label}: assistBlocked retains raw value and inverted lift power`, inverted.raw !== null && inverted.physical === !inverted.raw);
    const wireSignal = view.panels.find(panel => panel.output === 'spanMaster');
    if (wireSignal) check(`${label}: wire-only spanMaster reports a signal without inventing physical machinery`,
        wireSignal.physical === null && (!wireSignal.expanded || paints.some(paint => paint.text.includes(`RAW ${Number(wireSignal.raw)} · SIGNAL `))));
    if (requireExpanded) {
        const flatPaint = expanded.some(panel => panel.instructions.some(instruction => paints.some(paint => paint.text.includes(`${instruction.mnemonic} ${instruction.op_str}`) && paint.pixels > 4)));
        const groupedPaint = cargo?.detail === 'assembly' && cargo.sections.some(s => s.fragments.some(f => f.instructions.some(i => paints.some(paint => paint.text === `${i.mnemonic} ${i.op_str}` && paint.pixels > 4))));
        check(`${label}: normal zoom renders actual native instruction text to Canvas`, flatPaint || groupedPaint);
        check(`${label}: native listing text has visible screen pixels`, paints.some(paint => /\b(mov|test|cmp|lea|and|or|jmp|je|jne)\b/.test(paint.text) && paint.height >= 8 && paint.pixels > 4));
    }
    check(`${label}: no fabricated live execution or unstable/bogus claims`, !paints.some(paint => /executing live|proven bogus|AUTHORED MOCK|NO NATIVE EVIDENCE/i.test(paint.text)));
    report.push({ label, chamber, native: view, rendered: paints.filter(paint => /0x140|\b(mov|test|cmp|lea|and|jmp|jne)\b/.test(paint.text)) });
    return view;
}
async function capture(p: Cdp, chamber: string, name: string, camera?: { x: number; y: number; zoom: number }, expanded = true) {
    if (camera) await p.read(`binaryNinja.renderer.editorCamera=${JSON.stringify(camera)}`);
    await sleep(180);
    try { await verify(p, chamber, name, expanded); await h.shot(p, name); }
    finally { if (camera) await p.read('binaryNinja.renderer.editorCamera=undefined'); }
}
async function measure(p: Cdp, label: string) {
    if (process.env.BN_WORLD_SKIP_TIMING === '1') return;
    await p.read('binaryNinja.renderer.editorCamera={x:930,y:770,zoom:.95}');
    const timing = await p.read<{ frames: number; medianMs: number; p95Ms: number; maxMs: number; drawnPanels: number }>(`new Promise(resolve=>{
        const intervals=[];let last=performance.now();
        function sample(now){intervals.push(now-last);last=now;if(intervals.length<130)requestAnimationFrame(sample);else{
            const values=intervals.slice(10).sort((a,b)=>a-b);resolve({frames:values.length,medianMs:values[60],p95Ms:values[114],maxMs:values.at(-1),drawnPanels:binaryNinja.snapshot().nativeWorld.panels.length});
        }}requestAnimationFrame(sample);
    })`);
    await p.read('binaryNinja.renderer.editorCamera=undefined');
    report.push({ label, timing, note: 'Local headless observation with bounded Canvas text instrumentation; no pixel-readback while measuring; not an isolated renderer benchmark.' });
}
async function choose(host: Cdp, guest: Cdp, chamber: string) {
    if (await host.read<boolean>("document.querySelector('#menu').hidden")) await click(host, '#pause');
    if (!await host.read<boolean>("!!document.querySelector('[data-select-level]') && !document.querySelector('[data-select-level]').closest('[hidden]')")) await click(host, '#choose-chamber');
    await click(host, `[data-select-level="${chamber}"]`);
    for (const p of [host, guest]) { await wait(p, `${chamber} overview`, s => s.room === chamber && s.overviewVisible); await ready(p, chamber); }
}
async function start(host: Cdp, guest: Cdp) {
    for (const p of [host, guest]) { await click(p, '#start-room'); await wait(p, 'game started', s => s.started); }
}
try {
    const url = await h.startServer(), debug = await h.launch();
    const a = await h.page(url, debug), b = await h.page(url, debug);
    for (const p of [a, b]) await instrument(p);
    await onboardNinja(a, 'ShadowByte', 'purple'); await onboardNinja(b, 'ZeroDay', 'orange');
    await click(a, '#create-party'); const lobby = await wait(a, 'party created', s => s.multiplayer?.shared?.party?.phase === 'lobby');
    await click(b, '#join-code'); await b.send('Input.insertText', { text: lobby.multiplayer!.code! }); await click(b, '#join-room');
    await wait(b, 'guest connected', s => s.multiplayer?.shared?.connected.every(Boolean) === true);
    check('two independent named visitors keep their server-owned slots', (await snapshot(a)).persistence.visitor !== (await snapshot(b)).persistence.visitor
        && (await snapshot(b)).multiplayer?.shared?.profiles?.map(p => p?.name).join(',') === 'ShadowByte,ZeroDay');
    await choose(a, b, 'handshake');
    await sleep(900); await capture(a, 'handshake', 'handshake-overview', undefined, false);
    check('overview collapses listings to compact labels', (await native(a)).panels.every(panel => !panel.expanded));
    await start(a, b);
    await capture(a, 'handshake', 'handshake-crossing-inactive', { x: 930, y: 770, zoom: .95 });
    check('initial crossing has a confirmed inactive native output', (await native(a)).panels.some(panel => panel.output === 'crossingPower' && panel.raw === false));
    await h.walk(b, 1150);
    await wait(a, 'CROSSING contact accepted', s => !!s.signals?.['draft:crossingPower']);
    await capture(a, 'handshake', 'handshake-crossing-active', { x: 930, y: 770, zoom: .95 });
    check('real pressure contact changes the confirmed native display', (await native(a)).panels.some(panel => panel.output === 'crossingPower' && panel.raw === true));
    await capture(b, 'handshake', 'handshake-both-players', { x: 1280, y: 780, zoom: .95 });
    check('both named players retain readable Canvas labels', (await painted(b)).some(paint => paint.text.includes('ShadowByte / P1'))
        && (await painted(b)).some(paint => paint.text.includes('ZeroDay / P2')));
    await capture(a, 'handshake', 'handshake-lift-relay', { x: 1460, y: 700, zoom: .95 });
    await capture(a, 'handshake', 'handshake-exit', { x: 1900, y: 770, zoom: .95 });
    await measure(a, 'HANDSHAKE accepted active crossing frame intervals');
    if (!handshakeOnly) {
        // Other chamber camera regions are authored review views, not geometry changes.
        const reviews = [
            { chamber: 'crossfeed-vault', views: [['crossfeed-left-route', 1800, 520, .95], ['crossfeed-right-route-gallery', 3700, 470, .95], ['crossfeed-cargo-machinery', 2050, 1330, .95]] },
            { chamber: 'race-condition', views: [['race-phase-a-b', 1250, 430, .95], ['race-cargo-firewalls', 761, 1050, 1.05], ['race-exit', 3500, 550, .95]] },
            { chamber: 'deadlock', views: [['deadlock-lower-lift', 900, 2780, .95], ['deadlock-shaft-firewall', 800, 2350, .95], ['deadlock-upper-payload', 1000, 900, .95]] },
            { chamber: 'use-after-free', views: [['use-after-free-route-a', 900, 1850, .95], ['use-after-free-route-b', 1050, 1620, .95], ['use-after-free-route-c', 1000, 1320, .95], ['use-after-free-final-lift-exit', 1350, 990, .9], ['use-after-free-assist-inversion', 1500, 1500, 1]] },
        ] as const;
        for (const { chamber, views } of reviews) {
            await choose(a, b, chamber); await sleep(900);
            await capture(a, chamber, `${chamber}-overview`, undefined, false); await start(a, b);
            for (const [name, x, y, zoom] of views) await capture(a, chamber, name, { x, y, zoom });
        }
    }
    if (!handshakeOnly) {
        const count = await a.read<number>("performance.getEntriesByType('resource').filter(r=>r.name.endsWith('/handshake.world.json')).length");
        await choose(a, b, 'handshake');
        check('returning to an already loaded chamber reuses cached evidence', await a.read<number>("performance.getEntriesByType('resource').filter(r=>r.name.endsWith('/handshake.world.json')).length") === count);
    }
    await b.send('Page.reload'); await wait(b, 'guest reconnects', s => s.multiplayer?.slot === 2 && s.multiplayer.websocket === 'CONNECTED');
    await ready(b, 'handshake');
    check('reconnection restores own specimen and both character profiles', (await snapshot(b)).multiplayer?.shared?.profiles?.map(p => p?.name).join(',') === 'ShadowByte,ZeroDay');
    if (!handshakeOnly) {
        // A published custom room uses its own authored snapshot, never campaign evidence.
        const document = JSON.parse(await readFile('levels/drafts/cooperative-test.json', 'utf8'));
        const uploaded = await a.read<{ hash: string }>(`fetch('/api/custom/snapshots',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({document:${JSON.stringify(document)}})}).then(async r=>{const value=await r.json();if(!r.ok)throw Error(value.error);return value})`);
        await a.send('Page.navigate', { url: `${url}custom-level.html?host=${uploaded.hash}` });
        await until(a, '!!globalThis.customLevel?.observe().ready');
        await b.send('Page.navigate', { url: await a.read<string>("document.querySelector('#invite').value") });
        await until(b, '!!globalThis.customLevel?.observe().ready && customLevel.observe().session.peers.every(Boolean)');
        await sleep(200);
        for (const p of [a, b]) check('public custom room does not load campaign assembly', await p.read<boolean>("!performance.getEntriesByType('resource').some(r=>r.name.includes('.world.json') || r.name.includes('.cargo.json'))")
            && !(await painted(p)).some(paint => /0x140[0-9a-f]+/i.test(paint.text)));
        await h.shot(a, 'public-custom-no-native-overlay');

        const solo = await h.page(url, debug); await instrument(solo); await onboardNinja(solo, 'TraceReader', 'cyan');
        await click(solo, '[data-room="uplink"]'); await wait(solo, 'CONTROL SPINE enters', s => s.room === 'uplink');
        if ((await snapshot(solo)).overviewVisible) await click(solo, '#start-room');
        await solo.read('binaryNinja.renderer.editorCamera={x:2450,y:760,zoom:.95}'); await sleep(200);
        await h.shot(solo, 'control-spine-existing-service-assembly');
        check('CONTROL SPINE retains its original evidence renderer without co-op overlays', !(await native(solo)).panels.length
            && await solo.read<boolean>("!performance.getEntriesByType('resource').some(r=>r.name.includes('.world.json') || r.name.includes('.cargo.json'))")
            && (await painted(solo)).some(paint => /^0x140/i.test(paint.text)));
        await solo.read('binaryNinja.renderer.editorCamera=undefined');

        // Browser-enforced network failure, with real onboarding and normal movement.
        const offline = await h.page(url, debug); await instrument(offline); await onboardNinja(offline, 'FallbackNinja', 'lime');
        await offline.send('Network.enable'); await offline.send('Network.setBlockedURLs', { urls: ['*.world.json'] });
        await click(offline, '#create-party'); await wait(offline, 'fallback party lobby', s => s.multiplayer?.shared?.party?.phase === 'lobby');
        await click(offline, '[data-select-level="handshake"]'); await wait(offline, 'fallback starts overview', s => s.room === 'handshake' && s.overviewVisible);
        await until(offline, "binaryNinja.snapshot().nativeWorld.status==='unavailable'");
        await click(offline, '#start-room'); await wait(offline, 'fallback gameplay starts', s => s.started);
        const before = (await snapshot(offline)).player.x;
        await h.key(offline, 'KeyA', true); await sleep(250); await h.key(offline, 'KeyA', false);
        check('missing assembly asset leaves normal movement and controller session functional', (await snapshot(offline)).player.x < before - 20
            && (await snapshot(offline)).multiplayer?.websocket === 'CONNECTED' && (await native(offline)).panels.length === 0);
        await h.shot(offline, 'missing-asset-gameplay-fallback');
        await measure(offline, 'HANDSHAKE unavailable world-assembly frame intervals');
        // Expected blocked-resource console errors are not runtime exceptions.
        check('missing asset does not leak a JavaScript exception', !offline.errors.some(error => /Uncaught|TypeError|ReferenceError/.test(error)));
    }
    for (const p of [a, b]) check('no browser runtime errors', p.errors.length === 0, p.errors.join('\n'));
    await writeFile(join(h.shots, handshakeOnly ? 'handshake-gate.json' : 'browser-review.json'), JSON.stringify({ pass: true, scope: 'Production browser; real onboarding and accepted pressure contact; fixed presentation camera only', checks: h.checks, report }, null, 2) + '\n');
} catch (error) {
    process.exitCode = 1; console.error(String(error).split(': {')[0]);
    for (const [i, p] of h.clients.entries()) await h.shot(p, `failure-native-world-${i}`).catch(() => {});
    await writeFile(join(h.shots, 'failure.json'), JSON.stringify({ pass: false, error: String(error).split(': {')[0], checks: h.checks, report }, null, 2) + '\n');
} finally { await h.cleanup(); }
