#!/usr/bin/env node
/** Isolated presentation fixtures, not full-room solves. Body placement reaches
 * controls; real E/Space and accepted body occupancy drive every signal. No
 * controller, output, timer or cube state is injected. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coopBrowser, type Cdp } from './coop-browser.ts';
import type { SharedRoom } from '../src/coop/protocol.ts';
import type { CircuitInk } from '../src/slice/connection-gates.ts';

const h = await coopBrowser({ shots: process.env.BN_SHOTS ?? '.workbench/reports/inverted-signals', internalLabs: false });
const observations: unknown[] = [];
const crossfeed = async (p: Cdp) => (await h.snapshot(p)).multiplayer!.shared! as SharedRoom<'crossfeed-vault'>;
const race = async (p: Cdp) => (await h.snapshot(p)).multiplayer!.shared! as SharedRoom<'race-condition'>;
async function fixture(p: Cdp, x: number, y: number, settle = 400) {
    await p.read(`(()=>{const g=binaryNinja,p=g.world.player;g.input.releaseAll();
        Object.assign(p,{x:${x},y:${y},vx:0,vy:0,grounded:false,groundId:null});
        g.renderer.cameraReveals.reset(g.world);g.renderer.camera.snapTo(p.x,p.y-100);})()`);
    await h.wait(p, '[isolated fixture] body settles on existing ground', s => s.player.grounded);
    await h.sleep(settle);
}
async function choose(a: Cdp, b: Cdp, room: string) {
    if (await a.read<boolean>("document.querySelector('#menu').hidden")) await h.click(a, '#pause');
    const selector = `[data-select-level="${room}"]`;
    if (!await a.read<boolean>(`!!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).closest('[hidden]')`)) await h.click(a, '#choose-chamber');
    await h.click(a, selector);
    for (const p of [a, b]) {
        await h.wait(p, room + ' overview', s => s.room === room && s.overviewVisible);
        await h.tap(p, 'Space'); await h.wait(p, room + ' running', s => s.started && !s.overviewVisible);
    }
}
type Ink = { text: string; x: number; y: number; alpha: number; colour: string; font: string;
    left: number; right: number; top: number; bottom: number; width: number; height: number };
async function review(p: Cdp, label: string, sourceX: number, capture?: string) {
    const circuit = await p.read<CircuitInk>('binaryNinja.renderer.connectionLogic');
    h.check(label + ': every displayed circuit has known accepted ports and a matching final result', circuit.wires.length > 0 && !circuit.unavailable.length && circuit.wires.every(w => w.state?.coherent));
    h.check(label + ': every NOT reverses its incoming signal', circuit.gates.filter(g => g.op === 'NOT').every(g => g.input !== g.output && g.input !== null && g.output !== null));
    h.check(label + ': distinct module housings do not overlap', circuit.gates.every((a, i) => circuit.gates.slice(i + 1).every(b =>
        a.bounds.x + a.bounds.w <= b.bounds.x || b.bounds.x + b.bounds.w <= a.bounds.x || a.bounds.y + a.bounds.h <= b.bounds.y || b.bounds.y + b.bounds.h <= a.bounds.y)));
    const covered = await p.read<string[]>(`binaryNinja.renderer.connectionLogic.gates.flatMap(g=>binaryNinja.world.platforms.filter(p=>{
        const a=g.bounds,b=p.def;return a.x+a.w>b.x&&a.x<b.x+b.w&&a.y+a.h>b.y&&a.y<b.y+b.h;
    }).map(p=>g.op+' at '+g.at.x+','+g.at.y+' / '+p.def.id))`);
    h.check(label + ': modules clear terrain and code-platform footprints', covered.length === 0, covered.join(', '));
    const ink = await p.read<Ink[]>(`new Promise(resolve=>{
        const proto=CanvasRenderingContext2D.prototype,original=proto.fillText,seen=[];
        proto.fillText=function(text,x,y,...rest){
            const m=this.getTransform(),metrics=this.measureText(text),w=metrics.width,align=this.textAlign,gate=['NOT','AND','OR'].includes(text);
            const left=x-(align==='center'?w/2:align==='right'?w:0);
            seen.push({text,x,y,alpha:this.globalAlpha,colour:this.fillStyle,font:this.font,
                left:(gate?x-28:left)*m.a+m.e,right:(gate?x+28:left+w)*m.a+m.e,
                top:(gate?y-16:y-metrics.actualBoundingBoxAscent)*m.d+m.f,
                bottom:(gate?y+16:y+metrics.actualBoundingBoxDescent)*m.d+m.f,
                width:this.canvas.width,height:this.canvas.height});
            return original.call(this,text,x,y,...rest);};
        requestAnimationFrame(()=>requestAnimationFrame(()=>{proto.fillText=original;resolve(seen)}));})`);
    const tags = ink.filter(t => t.text === 'NOT' && Math.abs(t.x - sourceX) < 2);
    const modules = ink.filter(t => ['NOT','AND','OR'].includes(t.text) && Math.abs(t.x - sourceX) <= 180);
    const other = ink.filter(t => !['NOT','AND','OR'].includes(t.text));
    h.check(label + ': amber 14-unit NOT is opaque', tags.length > 0 && tags.every(t => t.alpha === 1 && t.colour === '#ffd76a' && t.font.includes('14px')));
    h.check(label + ': NOT module fits the normal camera', tags.every(t => t.left >= 0 && t.right <= t.width && t.top >= 0 && t.bottom <= t.height));
    const overlaps = modules.flatMap(a => other.filter(b => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom)).map(b => ({ gate: a.text, x: a.x, y: a.y, text: b.text })));
    h.check(label + ': modules clear captions and interaction feedback', overlaps.length === 0, overlaps.length ? JSON.stringify(overlaps) : '');
    h.check(label + ': normal gameplay camera', await p.read<boolean>('!binaryNinja.renderer.editorCamera') && !(await h.snapshot(p)).overviewVisible);
    observations.push({ label, circuit, camera: (await h.snapshot(p)).camera });
    if (capture) await h.shot(p, capture);
    return circuit;
}
async function wireInk(p: Cdp) {
    return p.read<{ scan: number[]; flow: number[]; backbone: number }>(`new Promise(resolve=>{
        const c=binaryNinja.canvas.getContext('2d'),stroke=c.stroke,seen={scan:[],flow:[],backbone:0};
        c.stroke=function(...args){const dash=this.getLineDash().join(',');
            if(dash==='12,228')seen.scan.push(this.lineDashOffset);
            if(dash==='9,28')seen.flow.push(this.lineDashOffset);
            if(this.strokeStyle==='#71849c'&&!dash)seen.backbone++;
            return stroke.apply(this,args);};
        requestAnimationFrame(()=>requestAnimationFrame(()=>{c.stroke=stroke;resolve(seen)}));})`);
}
async function still(p: Cdp, label: string) {
    await h.sleep(250); const a = await wireInk(p); await h.sleep(350); const b = await wireInk(p);
    h.check(label + ': backbones remain and no moving marks are drawn', a.backbone > 0 && b.backbone > 0 && !a.scan.length && !b.scan.length && !a.flow.length && !b.flow.length);
}
async function toggle(a: Cdp, b: Cdp, id: 'switchB' | 'routeMode', value: boolean) {
    await h.tap(a, 'KeyE');
    for (const p of [a, b]) await h.wait(p, `both clients accept ${id}=${value}`, s => (s.multiplayer!.shared! as SharedRoom<'crossfeed-vault'>).levelState.inputs[id] === value);
    await h.sleep(2800);
}
try {
    const url = await h.startServer(), debug = await h.launch(), a = await h.page(url, debug), b = await h.page(url, debug);
    await h.click(a, '#create-party'); const party = await h.wait(a, 'party created', s => !!s.multiplayer?.code);
    await h.click(b, '#join-code'); await b.send('Input.insertText', { text: party.multiplayer!.code! }); await h.click(b, '#join-room');
    await h.wait(a, 'partner connected', s => !!s.multiplayer?.shared?.connected.every(Boolean));
    if (process.env.BN_GATES_DECLARATIVE_ONLY) {
        for (const [room, x, y, gateX] of [['handshake', 2140, 533, 2140], ['deadlock', 460, 2983, 400], ['use-after-free', 1350, 933, 1277]] as const) {
            await choose(a, b, room); await fixture(a, x, y); await h.sleep(1000);
            if (room === 'deadlock') await fixture(b, 400, 2983);
            await review(a, room + ' existing inverted wires', gateX, room + '-fixture');
        }
    } else {
    if (!process.env.BN_GATES_RACE_ONLY) {
    await choose(a, b, 'crossfeed-vault');
    await fixture(a, 2870, 1483);
    const disabled = await review(a, 'TRANSFER / SYSTEM off', 2820);
    const relay = disabled.wires.find(w => w.id === 'transfer-R1')!.state!;
    h.check('SYSTEM off: inverter output true does not power the relay past AND', relay.source === false && relay.stages[0].output === true && relay.final === false);
    await toggle(a, b, 'switchB', true); await review(a, 'TRANSFER true / SYSTEM off', 2820);
    await toggle(a, b, 'switchB', false);
    await fixture(b, 1255, 733); await h.key(b, 'Space', true);
    try { await h.wait(b, 'SYSTEM ONLINE jump reach', s => !s.player.grounded && s.player.vy > -260, 2000); await h.tap(b, 'KeyE'); }
    finally { await h.key(b, 'Space', false); }
    await h.wait(a, 'accepted SYSTEM ONLINE', s => (s.multiplayer!.shared! as SharedRoom<'crossfeed-vault'>).levelState.inputs.switchC);
    await h.wait(b, 'returns to catwalk', s => s.player.grounded);
    await review(a, 'TRANSFER false / SYSTEM on', 2820, '01-transfer-false');
    await toggle(a, b, 'switchB', true); await review(a, 'TRANSFER true / SYSTEM on', 2820, '02-transfer-true');
    const ink1 = await wireInk(a); await h.sleep(350); const ink2 = await wireInk(a);
    h.check('actual gameplay advances idle and powered segments independently', ink1.scan.length > 0 && ink1.flow.length > 0 && ink1.scan[0] !== ink2.scan[0] && ink1.flow[0] !== ink2.flow[0]);
    await fixture(a, 1435, 733); await fixture(b, 1255, 733);
    await h.wait(a, 'route power unoccupied', s => !(s.multiplayer!.shared! as SharedRoom<'crossfeed-vault'>).levelState.inputs.routePowerOccupied);
    await review(a, 'ROUTE / POWER absent', 1385);
    h.check('SYSTEM alone does not power either route', !(await crossfeed(a)).levelState.outputs.leftRoute && !(await crossfeed(a)).levelState.outputs.rightRoute);
    await fixture(b, 1330, 733);
    await h.wait(a, 'accepted body-held route power', s => (s.multiplayer!.shared! as SharedRoom<'crossfeed-vault'>).levelState.inputs.routePowerOccupied);
    await review(a, 'ROUTE false / prerequisites on', 1385, '03-route-false');
    await toggle(a, b, 'routeMode', true); await review(a, 'ROUTE true / prerequisites on', 1385, '04-route-true');
    await a.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
    await h.sleep(1100); await review(a, 'ROUTE at 1024', 1385, '05-route-1024');
    await a.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await still(a, 'reduced motion'); await a.send('Emulation.setEmulatedMedia', { features: [] });
    await h.click(a, '#pause'); await still(a, 'paused'); await h.click(a, '#continue');
    await a.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
    }
    await choose(a, b, 'race-condition');
    await fixture(a, 80, 1223); await fixture(b, 260, 1223); await h.sleep(700);
    await review(b, 'DROP A false', 420, '06-drop-a-false');
    await fixture(a, 180, 1223);
    await h.wait(b, 'DROP A accepted', s => (s.multiplayer!.shared! as SharedRoom<'race-condition'>).levelState.inputs.dropA);
    await review(b, 'DROP A true', 420, '07-drop-a-true');
    await h.wait(b, 'real cube starts buffer window', s => (s.multiplayer!.shared! as SharedRoom<'race-condition'>).levelState.buffer.phase === 'window');
    await fixture(a, 80, 1223); await fixture(b, 1880, 1223);
    await h.wait(a, 'DROP B releases actual cube', s => (s.multiplayer!.shared! as SharedRoom<'race-condition'>).levelState.buffer.phase === 'released' || (s.multiplayer!.shared! as SharedRoom<'race-condition'>).levelState.inputs.payloadDelivered);
    await fixture(a, 1780, 1223); await h.sleep(700);
    const shared = await review(a, 'DROP B true', 1980, '08-drop-b-true');
    h.check('DROP B shares exactly one inverter before distinct AND/OR modules', shared.gates.filter(g => g.op === 'NOT' && g.at.x === 1980).length === 1);
    await fixture(b, 1980, 1223); await h.sleep(700);
    await review(a, 'DROP B false', 1980, '09-drop-b-false');
    // Accepted timeout without a fabricated timer. Drop a fresh cube by changing
    // chamber and returning; keep B unoccupied until the real window expires.
    await choose(a, b, 'crossfeed-vault'); await choose(a, b, 'race-condition');
    await fixture(a, 180, 1223); await fixture(b, 1780, 1223);
    await h.wait(b, 'accepted real buffer expiry', s => (s.multiplayer!.shared! as SharedRoom<'race-condition'>).levelState.buffer.phase === 'expired', 7000);
    await fixture(a, 1880, 1223, 0);
    await h.wait(b, 'expired plus DROP B accepted before cube recovery', s => { const r = (s.multiplayer!.shared! as SharedRoom<'race-condition'>).levelState; return r.inputs.dropB && r.buffer.phase === 'expired'; });
    const expired = await review(b, 'DROP B true / EXPIRED', 1980);
    const safety = expired.wires.find(w => w.id === 'safety')!.state!;
    h.check('expired OR keeps safety on despite inverted DROP B false', safety.source === true && safety.stages[0].output === false && safety.final === true);
    observations.push({ finalRace: (await race(b)).levelState });
    }
    h.app!.kill('SIGTERM'); await h.wait(a, 'actual server disconnected', s => s.multiplayer?.websocket !== 'CONNECTED'); await still(a, 'disconnected');
    for (const p of h.clients) h.check('no browser runtime errors', p.errors.length === 0, p.errors.join('\n'));
} catch (error) {
    for (const [i, p] of h.clients.entries()) { await h.shot(p, `failure-${i}`).catch(() => {}); }
    console.error(String(error)); process.exitCode = 1;
} finally {
    await writeFile(join(h.shots, 'checks.txt'), h.checks.join('\n') + '\n');
    await writeFile(join(h.shots, 'observations.json'), JSON.stringify({ scope: 'Isolated body-placement fixtures; real controls and accepted state, no full-room solve.', observations }, null, 2) + '\n');
    await h.cleanup();
}
