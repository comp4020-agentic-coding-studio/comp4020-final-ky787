#!/usr/bin/env node
/**
 * Production Canvas and two independent visitors. Camera overrides below only
 * frame art: no player, cube, controller, input or completion state is injected.
 * Run --handshake first as the visual acceptance gate before other layouts.
 * --handshake-route / --uaf-route replay existing canonical two-visitor solves.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { coopBrowser, type Cdp, type GameSnapshot } from './coop-browser.ts';
import { campaignDraftRoute } from './campaign-draft-route.ts';
import { onboardNinja } from './character-onboarding.ts';
import { CARGO_BLOCKS } from '../src/slice/race-cargo-render.ts';
import { RACE_MACHINERY_BLOCKS } from '../src/slice/race-machinery-render.ts';
import { ENVIRONMENTAL_BLOCKS } from '../src/slice/environmental-layout.ts';
import { nativeWorldBindingState, type NativeWorldArtifact } from '../src/coop/native-world-evidence.ts';
import type { NativeDisasm, NativeEvidence } from '../src/coop/native-evidence.ts';
import type { EnvironmentalArtifact } from '../src/coop/environmental-types.ts';

const handshakeRoute = process.argv.includes('--handshake-route');
const uafRoute = process.argv.includes('--uaf-route');
const handshakeOnly = process.argv.includes('--handshake') || handshakeRoute && !uafRoute;
const h = await coopBrowser({ shots: process.env.BN_SHOTS ?? resolve('docs/playtest/2026-10-20-coop-world-assembly'), internalLabs: false, onboarding: false });
const { check, click, sleep, wait, snapshot } = h;
const report: unknown[] = [];
interface Instruction { address: number; rva: number; size: number; block_id: string; bytes: string; mnemonic: string; op_str: string }
interface Panel {
    objectId: string; output: string; address: number | string; raw: boolean | null; physical: boolean | null;
    expanded: boolean; bounds: { x: number; y: number; w: number; h: number };
    instructions: Instruction[]; storeAddress: number; static: boolean;
}
interface NativeView { chamber: string | null; status: string; panels: Panel[]; outputs: Record<string, boolean>; physical: Record<string, boolean>; exitUnlocked: boolean | null; [key: string]: unknown }
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
    if (chamber in ENVIRONMENTAL_BLOCKS) await until(p, `binaryNinja.snapshot().environmentalAssembly?.availability==='ready'&&binaryNinja.snapshot().environmentalAssembly?.chamber===${JSON.stringify(chamber)}`);
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
const sources = new Map<string, { disasm: NativeDisasm; evidence: NativeEvidence; world: NativeWorldArtifact }>();
const reviewedOutputs = new Map<string, Set<string>>();
async function verify(p: Cdp, chamber: string, label: string, requireExpanded = true) {
    let source = sources.get(chamber);
    if (!source) {
        source = { disasm: JSON.parse(await readFile(`public/evidence/coop/${chamber}.disasm.json`, 'utf8')),
            evidence: JSON.parse(await readFile(`public/evidence/coop/${chamber}.evidence.json`, 'utf8')),
            world: JSON.parse(await readFile(`public/evidence/coop/${chamber}.world.json`, 'utf8')) };
        sources.set(chamber, source);
    }
    const view = await native(p), paints = await painted(p), expanded = view.panels.filter(panel => panel.expanded);
    const cargo = chamber === 'race-condition' ? await p.read<GameSnapshot['raceCargo']>('binaryNinja.snapshot().raceCargo') : null;
    const machinery = chamber === 'race-condition' ? await p.read<GameSnapshot['raceMachinery']>('binaryNinja.snapshot().raceMachinery') : null;
    // Read visibility and its camera in one browser turn. Separate CDP reads
    // can straddle the transition from overview or a desktop viewport resize.
    const environmentFrame = chamber in ENVIRONMENTAL_BLOCKS ? await p.read<{
        assembly: GameSnapshot['environmentalAssembly']; visible: { x: number; y: number; w: number; h: number; zoom: number };
    }>(`(()=>{const c=binaryNinja.renderer.camera;return {assembly:binaryNinja.snapshot().environmentalAssembly,
        visible:{x:c.originX(),y:c.originY(),w:c.viewW/c.zoom,h:c.viewH/c.zoom,zoom:c.zoom}}})()`) : null;
    const environment = environmentFrame?.assembly ?? null;
    check(`${label}: own specimen loaded`, view.chamber === chamber && view.status === 'ready' && view.specimen === source.evidence.specimen_id);
    check(`${label}: retained world provenance matches acquired instructions and recorded output stores`, (view.panels.length > 0 || !!environment?.sections.length || cargo?.visible === true && cargo.sections.length === 4 || machinery?.sections.some(s => s.visible) === true) && view.panels.every(panel => {
        const output = source.evidence.outputs.find(output => output.name === panel.output);
        return panel.static && !!output?.store_sites.some(site => site.instruction_address === panel.storeAddress)
            && panel.instructions.every((instruction, index) => source.disasm.instructions.some(known => known.address === instruction.address
                && known.bytes === instruction.bytes && known.mnemonic === instruction.mnemonic && known.op_str === instruction.op_str
                && known.block_id === instruction.block_id && known.rva === instruction.rva && known.size === instruction.size)
                && (!index || instruction.address === panel.instructions[index - 1].address + panel.instructions[index - 1].size));
    }));
    check(`${label}: native status reads only accepted server values`, view.panels.every(panel => panel.raw === (view.outputs[panel.output] ?? view.physical[panel.output] ?? null)));
    if (environment) {
        const places = ENVIRONMENTAL_BLOCKS[chamber as keyof typeof ENVIRONMENTAL_BLOCKS];
        check(`${label}: every replacement is retained and old diagnostics stay suppressed`, environment.availability === 'ready'
            && environment.mode === 'STATE-LINKED' && environment.sections.length === places.length && view.panels.length === 0);
        check(`${label}: authentic fragments and selected stores match the chamber acquisition`, environment.sections.every(section => {
            const output = source.evidence.outputs.find(o => o.name === section.output);
            return section.raw === (view.outputs[section.output] ?? null)
                && !!output?.store_sites.some(site => site.instruction_rva === section.storeRva && site.observed_values.includes(Number(section.raw)))
                && section.fragments.flatMap(f => f.instructions).length >= 3 && section.fragments.flatMap(f => f.instructions).length <= 5
                && section.fragments.every(fragment => fragment.omittedBefore.includes('not a CFG edge')
                    && fragment.instructions.every((instruction, index) => instruction.block_id === fragment.block
                        && source.disasm.instructions.some(known => known.address === instruction.address && known.rva === instruction.rva
                            && known.bytes === instruction.bytes && known.size === instruction.size && known.block_id === instruction.block_id
                            && known.mnemonic === instruction.mnemonic && known.op_str === instruction.op_str)
                        && (!index || instruction.address === fragment.instructions[index - 1].address + fragment.instructions[index - 1].size)));
        }));
        check(`${label}: fixed world rectangles and accepted binding semantics survive framing`, environment.sections.every((section, index) => {
            const place = places[index], output = source.world.outputs.find(o => o.name === section.output)!;
            const binding = output.bindings.find(binding => binding.target === section.target);
            const expected = nativeWorldBindingState({ chamber: source.evidence.chamber_id, connected: true, levelInstance: 0, revision: 0,
                outputs: view.outputs, physical: view.physical, exitUnlocked: view.exitUnlocked }, output, binding);
            return section.output === place.output && section.target === place.target && section.bounds.x === place.x && section.bounds.y === place.y
                && section.bounds.w === place.w && section.bounds.h === place.h && section.physical === expected.physical
                && section.powered === expected.physical && section.grace === expected.grace && section.inverted === expected.inverted && section.latched === expected.latched
                && section.message === `${place.label} ${expected.physical ? place.on : place.off}`
                && section.colour === ((place.hazard ? !expected.physical : expected.physical) ? '#77ba9e' : '#ca817e');
        }));
        const visible = environmentFrame!.visible;
        check(`${label}: culling uses each fixed rectangle without moving it`, environment.sections.every(section => {
            const b = section.bounds;
            return section.visible === (b.x < visible.x + visible.w && b.x + b.w > visible.x && b.y < visible.y + visible.h && b.y + b.h > visible.y);
        }));
        const seen = reviewedOutputs.get(chamber) ?? new Set<string>();
        for (const section of environment.sections.filter(section => section.visible)) {
            // Repeated MOVs elsewhere cannot satisfy this member's pixel coverage.
            if (section.fragments.some(fragment => fragment.instructions.some((i, row) => paints.some(paint =>
                paint.text === `${i.mnemonic} ${i.op_str}` && paint.pixels > 4
                && Math.abs(paint.x - (section.bounds.x + 12 - visible.x) * visible.zoom) < 3
                && Math.abs(paint.y - (section.bounds.y + fragment.firstLineY + row * 16 - visible.y) * visible.zoom) < 3)))) seen.add(section.output);
        }
        reviewedOutputs.set(chamber, seen);
        check(`${label}: retired diagnostic and tutorial labels are absent from gameplay`, !paints.some(paint =>
            /STATIC \/ WRITE 1|RAW [01?]|SERVER GRACE|SERVER LATCH|STATE-LINKED|RVA \/ x64|BCF clobbers|ptr omitted|save\/BCF omitted/.test(paint.text)
            || places.some(place => paint.text === place.output)));
        report.push({ label, environment });
    }
    if (chamber === 'race-condition') {
        check(`${label}: grouped RACE asset available`, cargo?.availability === 'ready' && cargo.mode === 'STATE-LINKED');
        check(`${label}: all nine superseded RACE listings suppressed`, view.panels.length === 0);
        check(`${label}: five distributed machinery blocks ready`, machinery?.availability === 'ready' && machinery.sections.length === 5);
        check(`${label}: machinery fragments preserve exact acquisition records and raw store associations`, !!machinery && machinery.sections.every(s => {
            const output = source.evidence.outputs.find(o => o.name === s.output);
            return s.raw === view.outputs[s.output] && output?.store_sites.some(site => site.instruction_rva === s.storeRva && site.observed_values.includes(Number(s.raw)))
                && s.fragments.every(f => f.omittedBefore.includes('not a CFG edge') && f.instructions.every((i, n) =>
                    i.block_id === f.block && source.disasm.instructions.some(k => k.address === i.address && k.rva === i.rva && k.bytes === i.bytes && k.size === i.size && k.block_id === i.block_id && k.mnemonic === i.mnemonic && k.op_str === i.op_str)
                    && (!n || i.address === f.instructions[n - 1].address + f.instructions[n - 1].size)));
        }));
        check(`${label}: machinery remains at fixed world bounds with accepted physical/latch semantics`, !!machinery && machinery.sections.every((s, n) => {
            const p = RACE_MACHINERY_BLOCKS[n];
            const physical = s.output === 'spanMaster' ? null : s.output === 'exitDoor' ? view.exitUnlocked : view.physical[s.output === 'returnBridge' ? 'physicalReturnBridge' : s.output === 'phaseA' ? 'physicalPhaseA' : 'physicalPhaseB'];
            return s.bounds.x === p.x && s.bounds.y === p.y && s.bounds.w === p.w && s.bounds.h === p.h && s.physical === physical;
        }));
        if (cargo?.visible) {
            check(`${label}: grouped excerpts preserve separate blocks, exact native bytes and within-fragment contiguity`, cargo.sections.length === 4 && cargo.sections.every(section => {
                const output = source.evidence.outputs.find(o => o.name === section.output);
                return section.raw === view.outputs[section.output] && output?.store_sites.some(site => site.instruction_rva === section.storeRva && site.observed_values.includes(Number(section.raw)))
                    && section.fragments.flatMap(f => f.instructions).length >= 3 && section.fragments.flatMap(f => f.instructions).length <= 5
                    && section.fragments.every(fragment => fragment.omittedBefore.includes('omitted') && fragment.instructions.every((i, n) =>
                        i.block_id === fragment.block && source.disasm.instructions.some(known => known.address === i.address && known.bytes === i.bytes
                            && known.rva === i.rva && known.size === i.size && known.block_id === i.block_id && known.mnemonic === i.mnemonic && known.op_str === i.op_str)
                        && (!n || i.address === fragment.instructions[n - 1].address + fragment.instructions[n - 1].size)));
            }));
            check(`${label}: cargo decoration retains its authored world bounds`, cargo.sections.every((s, n) => {
                const p = CARGO_BLOCKS[n]; return s.bounds.x === p.x && s.bounds.y === p.y && s.bounds.w === p.w && s.bounds.h === p.h;
            }));
            if (requireExpanded) check(`${label}: visible cargo code has painted pixels`, cargo.sections.filter(s => s.visible).some(s =>
                s.fragments.some(f => f.instructions.some(i => paints.some(paint => paint.text === `${i.mnemonic} ${i.op_str}` && paint.pixels > 4)))));
        }
        report.push({ label, cargo, machinery });
    }
    const inverted = view.panels.find(panel => panel.output === 'assistBlocked');
    if (inverted) check(`${label}: assistBlocked retains raw value and inverted lift power`, inverted.raw !== null && inverted.physical === !inverted.raw);
    const wireSignal = view.panels.find(panel => panel.output === 'spanMaster');
    if (wireSignal) check(`${label}: wire-only spanMaster reports a signal without inventing physical machinery`,
        wireSignal.physical === null && (!wireSignal.expanded || paints.some(paint => paint.text.includes(`RAW ${Number(wireSignal.raw)} · SIGNAL `))));
    if (requireExpanded) {
        const flatPaint = expanded.some(panel => panel.instructions.some(instruction => paints.some(paint => paint.text.includes(`${instruction.mnemonic} ${instruction.op_str}`) && paint.pixels > 4)));
        const groupedPaint = cargo?.visible === true && cargo.sections.some(s => s.visible && s.fragments.some(f => f.instructions.some(i => paints.some(paint => paint.text === `${i.mnemonic} ${i.op_str}` && paint.pixels > 4))));
        const machineryPaint = machinery?.sections.some(s => s.visible && s.fragments.some(f => f.instructions.some(i => paints.some(p => p.text === `${i.mnemonic} ${i.op_str}` && p.pixels > 4))));
        const environmentPaint = environment?.sections.some(s => s.visible && s.fragments.some(f => f.instructions.some(i => paints.some(p => p.text === `${i.mnemonic} ${i.op_str}` && p.pixels > 4))));
        check(`${label}: normal zoom renders actual native instruction text to Canvas`, flatPaint || groupedPaint || machineryPaint === true || environmentPaint === true);
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
async function narrow(p: Cdp, chamber: string, name: string, camera?: { x: number; y: number; zoom: number }) {
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
    try { await sleep(350); await capture(p, chamber, `${name}-1024`, camera, !!camera); }
    finally {
        await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
        await sleep(350);
    }
}
async function inspectEnvironment(p: Cdp) {
    const data = JSON.parse(await readFile('public/evidence/coop/handshake.environment.json', 'utf8')) as EnvironmentalArtifact;
    const section = data.sections.find(section => section.name === 'crossingPower')!;
    const alternatives = Object.values(section.stores).map(id => data.fragments.find(fragment => fragment.id === id)!);
    await click(p, '#evidence-toggle');
    await until(p, "[...document.querySelectorAll('#evidence select option')].some(o=>o.value==='environmental:crossingPower')");
    await p.read("(()=>{const s=document.querySelector('#evidence select');s.value='environmental:crossingPower';s.dispatchEvent(new Event('change'));})()");
    await sleep(100);
    const detail = await p.read<string>("document.querySelector('#evidence pre').textContent");
    check('Evidence keeps genuine alternatives, bytes, blocks, specimen and authored-text distinction', alternatives.every(fragment =>
        detail.includes(fragment.id) && detail.includes(fragment.block_id) && fragment.instructions.every(instruction =>
            detail.includes(`0x${instruction.rva.toString(16).toUpperCase()}`) && detail.includes(instruction.bytes)))
        && detail.includes(data.bcf_pe_sha256) && detail.includes('STATE-LINKED') && detail.includes('AUTHORED STATUS')
        && detail.includes('NOT a direct CFG edge') && detail.includes('representative-sample distinction'));
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
    await sleep(120); await h.shot(p, 'handshake-evidence-alternatives');
    await writeFile(join(h.shots, 'handshake-evidence-detail.txt'), detail + '\n');
    await click(p, '#evidence-toggle');
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
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
    const selector = `[data-select-level="${chamber}"]`;
    // Victory's NEXT button also has data-select-level; it is not the selector.
    if (!await host.read<boolean>(`!!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).closest('[hidden]')`)) await click(host, '#choose-chamber');
    await click(host, selector);
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
    await narrow(a, 'handshake', 'handshake-overview');
    check('overview retains fixed environmental code without replacement name tags', (await native(a)).panels.length === 0
        && (await a.read<GameSnapshot['environmentalAssembly']>('binaryNinja.snapshot().environmentalAssembly')).detail === 'environmental');
    await start(a, b);
    for (const [index, p] of [a, b].entries()) {
        await capture(p, 'handshake', `handshake-ordinary-player-${index + 1}`, undefined, false);
        await narrow(p, 'handshake', `handshake-ordinary-player-${index + 1}`);
    }
    await capture(a, 'handshake', 'handshake-crossing-inactive', { x: 930, y: 770, zoom: .95 });
    check('initial crossing has a confirmed inactive native output', (await a.read<GameSnapshot['environmentalAssembly']>('binaryNinja.snapshot().environmentalAssembly')).sections.some(panel => panel.output === 'crossingPower' && panel.raw === false));
    await h.walk(b, 1150);
    await wait(a, 'CROSSING contact accepted', s => !!s.signals?.['draft:crossingPower']);
    await capture(a, 'handshake', 'handshake-crossing-active', { x: 930, y: 770, zoom: .95 });
    check('real pressure contact changes the confirmed native display', (await a.read<GameSnapshot['environmentalAssembly']>('binaryNinja.snapshot().environmentalAssembly')).sections.some(panel => panel.output === 'crossingPower' && panel.raw === true));
    await capture(b, 'handshake', 'handshake-both-players', { x: 1460, y: 780, zoom: .95 });
    check('both named players retain readable Canvas labels', (await painted(b)).some(paint => paint.text.includes('ShadowByte / P1'))
        && (await painted(b)).some(paint => paint.text.includes('ZeroDay / P2')));
    await capture(a, 'handshake', 'handshake-gallery-lift', { x: 1240, y: 400, zoom: .95 });
    await capture(a, 'handshake', 'handshake-relay-exit', { x: 2030, y: 720, zoom: .95 });
    await capture(a, 'handshake', 'handshake-exit', { x: 2060, y: 770, zoom: .95 });
    await capture(a, 'handshake', 'handshake-pan-zoom', { x: 1740, y: 800, zoom: .65 }, false);
    await narrow(a, 'handshake', 'handshake-lift', { x: 1240, y: 400, zoom: .95 });
    await narrow(a, 'handshake', 'handshake-relay-exit', { x: 2030, y: 720, zoom: .95 });
    await a.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await capture(a, 'handshake', 'handshake-reduced-motion', { x: 1600, y: 720, zoom: .95 });
    check('reduced motion completes authored strings and removes store pulses', (await snapshot(a)).environmentalAssembly.sections.every(section => section.revealed === section.message && section.pulse === 0));
    await a.send('Emulation.setEmulatedMedia', { features: [] });
    await measure(a, 'HANDSHAKE accepted active crossing frame intervals');
    if (!handshakeOnly) {
        // Other chamber camera regions are authored review views, not geometry changes.
        const reviews = [
            { chamber: 'crossfeed-vault', views: [['crossfeed-left-route', 1800, 520, .95], ['crossfeed-right-route-gallery', 3900, 470, .95], ['crossfeed-cargo-machinery', 2200, 1330, .95], ['crossfeed-service-relay', 650, 1220, .95], ['crossfeed-vault-return', 2440, 850, .95]] },
            { chamber: 'race-condition', views: [['race-phase-a-b', 1250, 430, .95], ['race-cargo-firewalls', 761, 1050, 1.05], ['race-exit', 3500, 550, .95]] },
            { chamber: 'deadlock', views: [['deadlock-lower-lift', 900, 2780, .95], ['deadlock-shaft-firewall', 800, 2350, .95], ['deadlock-upper-payload', 1000, 900, .95]] },
            { chamber: 'use-after-free', views: [['use-after-free-launch', 1300, 2160, .95], ['use-after-free-route-a', 900, 1850, .95], ['use-after-free-route-b', 1400, 1760, .95], ['use-after-free-route-c', 1000, 1450, .95], ['use-after-free-final-lift-exit', 1350, 990, .9], ['use-after-free-assist-inversion', 1500, 1500, 1]] },
        ] as const;
        for (const { chamber, views } of reviews) {
            await choose(a, b, chamber); await sleep(900);
            await capture(a, chamber, `${chamber}-overview`, undefined, false);
            await narrow(a, chamber, `${chamber}-overview`); await start(a, b);
            for (const [index, p] of [a, b].entries()) {
                await capture(p, chamber, `${chamber}-ordinary-player-${index + 1}`, undefined, false);
                await narrow(p, chamber, `${chamber}-ordinary-player-${index + 1}`);
            }
            for (const [name, x, y, zoom] of views) await capture(a, chamber, name, { x, y, zoom });
            if (chamber in ENVIRONMENTAL_BLOCKS) {
                const [name, x, y, zoom] = views[0];
                await capture(a, chamber, `${name}-pan-zoom`, { x: x + 140, y: y + 70, zoom: .65 }, false);
                await narrow(a, chamber, name, { x, y, zoom });
            }
        }
    }
    for (const [chamber, places] of Object.entries(ENVIRONMENTAL_BLOCKS)) if (!handshakeOnly || chamber === 'handshake') {
        check(`${chamber}: every baseline placement has visible native Canvas pixels in its local review`, places.every(place => reviewedOutputs.get(chamber)?.has(place.output)));
    }
    if (!handshakeOnly) {
        const count = await a.read<number>("performance.getEntriesByType('resource').filter(r=>r.name.endsWith('/handshake.environment.json')).length");
        await choose(a, b, 'handshake');
        check('returning to an already loaded chamber reuses cached evidence', await a.read<number>("performance.getEntriesByType('resource').filter(r=>r.name.endsWith('/handshake.environment.json')).length") === count);
    }
    const routes = [...(handshakeRoute ? ['handshake'] as const : []), ...(uafRoute ? ['use-after-free'] as const : [])];
    for (const level of routes) {
        await choose(a, b, level);
        const originalShot = h.shot;
        h.shot = async (page, name) => {
            await originalShot(page, name);
            if (name === 'handshake-relay-linked-host') {
                const current = await snapshot(page);
                check(`${name}: canonical route reaches accepted machinery state`, current.environmentalAssembly.sections.some(section =>
                    section.output === 'relayPower' && section.physical === true));
                await capture(page, 'handshake', 'handshake-lift-linked-detail', { x: 1240, y: 400, zoom: .95 });
                await narrow(page, 'handshake', 'handshake-lift-linked', { x: 1240, y: 400, zoom: .95 });
                await capture(page, 'handshake', 'handshake-relay-linked-detail', { x: 1950, y: 720, zoom: .95 });
            } else if (name === 'use-after-free-first-handover-host') {
                check(`${name}: real handover powers route B`, (await snapshot(page)).environmentalAssembly.sections.some(section =>
                    section.output === 'routeB' && section.physical === true));
                await capture(page, 'use-after-free', 'use-after-free-route-b-powered-detail', { x: 1180, y: 1490, zoom: .95 });
                await narrow(page, 'use-after-free', 'use-after-free-route-b-powered', { x: 1180, y: 1490, zoom: .95 });
            } else if (name === 'use-after-free-near-complete-host') {
                check(`${name}: actual assist lift uses accepted zero with inverted active binding`, (await snapshot(page)).environmentalAssembly.sections.some(section =>
                    section.output === 'assistBlocked' && section.raw === false && section.physical === true));
                await capture(page, 'use-after-free', 'use-after-free-assist-active-detail', { x: 1500, y: 1490, zoom: .95 });
            }
        };
        try { await campaignDraftRoute(h, level, [a, b]); }
        finally { h.shot = originalShot; }
    }
    if (routes.length) await choose(a, b, 'handshake');
    await b.send('Page.reload'); await wait(b, 'guest reconnects', s => s.multiplayer?.slot === 2 && s.multiplayer.websocket === 'CONNECTED');
    await ready(b, 'handshake');
    check('reconnection restores own specimen and both character profiles', (await snapshot(b)).multiplayer?.shared?.profiles?.map(p => p?.name).join(',') === 'ShadowByte,ZeroDay');
    check('reconnection baselines fresh accepted state without replaying old changes', !(await snapshot(b)).environmentalAssembly.lastKnown
        && (await snapshot(b)).environmentalAssembly.sections.every(section => section.revealed === section.message && section.pulse === 0));
    check('ordinary gameplay does not load full native traces or disassembly', await b.read<boolean>("!performance.getEntriesByType('resource').some(r=>/\\.(traces|disasm|evidence)\\.json/.test(r.name))"));
    await inspectEnvironment(a);
    if (!handshakeOnly) {
        // A published custom room uses its own authored snapshot, never campaign evidence.
        const document = JSON.parse(await readFile('levels/drafts/cooperative-test.json', 'utf8'));
        const uploaded = await a.read<{ hash: string }>(`fetch('/api/custom/snapshots',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({document:${JSON.stringify(document)}})}).then(async r=>{const value=await r.json();if(!r.ok)throw Error(value.error);return value})`);
        await a.send('Page.navigate', { url: `${url}custom-level.html?host=${uploaded.hash}` });
        await until(a, '!!globalThis.customLevel?.observe().ready');
        await b.send('Page.navigate', { url: await a.read<string>("document.querySelector('#invite').value") });
        await until(b, '!!globalThis.customLevel?.observe().ready && customLevel.observe().session.peers.every(Boolean)');
        await sleep(200);
        for (const p of [a, b]) check('public custom room does not load campaign assembly', await p.read<boolean>("!performance.getEntriesByType('resource').some(r=>r.name.includes('.world.json') || r.name.includes('.cargo.json') || r.name.includes('.machinery.json') || r.name.includes('.environment.json'))")
            && !(await painted(p)).some(paint => /0x140[0-9a-f]+/i.test(paint.text)));
        await h.shot(a, 'public-custom-no-native-overlay');

        const soloUrl = new URL(url); soloUrl.searchParams.set('debug', '1');
        const solo = await h.page(soloUrl.href, debug); await instrument(solo); await onboardNinja(solo, 'TraceReader', 'cyan');
        await click(solo, '[data-room="uplink"]'); await wait(solo, 'CONTROL SPINE enters', s => s.room === 'uplink');
        if ((await snapshot(solo)).overviewVisible) await click(solo, '#start-room');
        await solo.read('binaryNinja.renderer.editorCamera={x:2450,y:760,zoom:.95}'); await sleep(200);
        await h.shot(solo, 'control-spine-existing-service-assembly');
        check('CONTROL SPINE retains its original evidence renderer without co-op overlays', !(await native(solo)).panels.length
            && await solo.read<boolean>("!performance.getEntriesByType('resource').some(r=>r.name.includes('.world.json') || r.name.includes('.cargo.json') || r.name.includes('.machinery.json') || r.name.includes('.environment.json'))")
            && (await painted(solo)).some(paint => /^0x140/i.test(paint.text)));
        await solo.read('binaryNinja.renderer.editorCamera=undefined');

        // Browser-enforced network failure, with real onboarding and normal movement.
        const offline = await h.page(url, debug); await instrument(offline); await onboardNinja(offline, 'FallbackNinja', 'lime');
        await offline.send('Network.enable'); await offline.send('Network.setBlockedURLs', { urls: ['*.world.json', '*.environment.json'] });
        await click(offline, '#create-party'); await wait(offline, 'fallback party lobby', s => s.multiplayer?.shared?.party?.phase === 'lobby');
        await click(offline, '[data-select-level="handshake"]'); await wait(offline, 'fallback starts overview', s => s.room === 'handshake' && s.overviewVisible);
        await until(offline, "binaryNinja.snapshot().nativeWorld.status==='unavailable'");
        await until(offline, "binaryNinja.snapshot().environmentalAssembly.availability==='unavailable'");
        await click(offline, '#start-room'); await wait(offline, 'fallback gameplay starts', s => s.started);
        const before = (await snapshot(offline)).player.x;
        await h.key(offline, 'KeyA', true); await sleep(250); await h.key(offline, 'KeyA', false);
        check('missing assembly asset leaves normal movement and controller session functional', (await snapshot(offline)).player.x < before - 20
            && (await snapshot(offline)).multiplayer?.websocket === 'CONNECTED' && (await native(offline)).panels.length === 0
            && (await snapshot(offline)).environmentalAssembly.sections.every(section => !section.fragments.length && section.storeId === null));
        await h.shot(offline, 'missing-asset-gameplay-fallback');
        await measure(offline, 'HANDSHAKE unavailable world-assembly frame intervals');
        // Expected blocked-resource console errors are not runtime exceptions.
        check('missing asset does not leak a JavaScript exception', !offline.errors.some(error => /Uncaught|TypeError|ReferenceError/.test(error)));
    }
    for (const p of [a, b]) check('no browser runtime errors', p.errors.length === 0, p.errors.join('\n'));
    await writeFile(join(h.shots, handshakeOnly ? 'handshake-gate.json' : 'browser-review.json'), JSON.stringify({ pass: true,
        scope: routes.length ? `Production browser; canonical ${routes.join(' + ')} real-input solves; labelled camera-only detail captures`
            : 'Production browser; real onboarding and accepted pressure contact; fixed presentation camera only', checks: h.checks, report }, null, 2) + '\n');
} catch (error) {
    process.exitCode = 1; console.error(String(error).split(': {')[0]);
    for (const [i, p] of h.clients.entries()) await h.shot(p, `failure-native-world-${i}`).catch(() => {});
    await writeFile(join(h.shots, 'failure.json'), JSON.stringify({ pass: false, error: String(error).split(': {')[0], checks: h.checks, report }, null, 2) + '\n');
} finally { await h.cleanup(); }
