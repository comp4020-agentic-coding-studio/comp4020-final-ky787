#!/usr/bin/env node
/** Isolated presentation/interaction fixtures using the production browser harness.
 * Body placement reaches the two controls; actual Space/E input and accepted server
 * state exercise their signals. This is not a physical CROSSFEED solve.
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coopBrowser, type Cdp } from './coop-browser.ts';
import type { SharedRoom } from '../src/coop/protocol.ts';

const h = await coopBrowser({ shots: process.env.BN_SHOTS ?? '.workbench/reports/inverted-signals', internalLabs: false });
const observations: unknown[] = [];
const accepted = async (p: Cdp) => (await h.snapshot(p)).multiplayer!.shared! as SharedRoom<'crossfeed-vault'>;
async function fixture(p: Cdp, x: number, y: number) {
    await p.read(`(()=>{const g=binaryNinja,p=g.world.player;g.input.releaseAll();
        Object.assign(p,{x:${x},y:${y},vx:0,vy:0,grounded:false,groundId:null});
        g.renderer.cameraReveals.reset(g.world);g.renderer.camera.snapTo(p.x,p.y-100);})()`);
    await h.wait(p, '[isolated fixture] body settles on existing ground', s => s.player.grounded);
    await h.sleep(900);
}
type Ink = { text: string; x: number; y: number; alpha: number; colour: string; font: string;
    left: number; right: number; top: number; bottom: number; width: number; height: number };
async function review(p: Cdp, label: string, sourceX: number, state: string) {
    const hint = await p.read<string>('binaryNinja.world.interactionHint()');
    const ink = await p.read<Ink[]>(`new Promise(resolve=>{
        const proto=CanvasRenderingContext2D.prototype,original=proto.fillText,seen=[];
        proto.fillText=function(text,x,y,...rest){
            const m=this.getTransform(),metrics=this.measureText(text),w=metrics.width,align=this.textAlign;
            const left=x-(align==='center'?w/2:align==='right'?w:0),not=text==='NOT';
            seen.push({text,x,y,alpha:this.globalAlpha,colour:this.fillStyle,font:this.font,
                left:(left-(not?4:0))*m.a+m.e,right:(left+w+(not?4:0))*m.a+m.e,
                top:(y-(not?16:metrics.actualBoundingBoxAscent))*m.d+m.f,
                bottom:(y+(not?4:metrics.actualBoundingBoxDescent))*m.d+m.f,
                width:this.canvas.width,height:this.canvas.height});
        return original.call(this,text,x,y,...rest);};
        requestAnimationFrame(()=>requestAnimationFrame(()=>{proto.fillText=original;resolve(seen)}));
    })`);
    const tags = ink.filter(t => t.text === 'NOT' && t.x < sourceX && t.x > sourceX - 50), other = ink.filter(t => t.text !== 'NOT');
    h.check(`${label} ${state}: amber 14-unit NOT is fully opaque`, tags.length > 0
        && tags.every(t => t.alpha === 1 && t.colour === '#ffd76a' && t.font.includes('14px')));
    h.check(`${label} ${state}: NOT backing fits the normal camera`, tags.every(t =>
        t.left >= 0 && t.right <= t.width && t.top >= 0 && t.bottom <= t.height));
    h.check(`${label} ${state}: NOT backing clears captions, E prompt, player names and evidence text`, other.length > 0 && tags.every(a =>
        other.every(b => a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom)));
    h.check(`${label} ${state}: normal gameplay camera`, await p.read('!binaryNinja.renderer.editorCamera'));
    observations.push({ label, state, hint, ink, accepted: (await accepted(p)).levelState, camera: (await h.snapshot(p)).camera });
}
async function toggle(a: Cdp, b: Cdp, id: 'switchB' | 'routeMode', value: boolean) {
    await h.tap(a, 'KeyE');
    for (const p of [a, b]) await h.wait(p, `both clients accept ${id}=${value}`, s =>
        (s.multiplayer!.shared! as SharedRoom<'crossfeed-vault'>).levelState.inputs[id] === value);
    await h.sleep(2800); // Existing camera reveal finishes before local captures.
}
try {
    const url = await h.startServer(), debug = await h.launch(), a = await h.page(url, debug), b = await h.page(url, debug);
    await h.click(a, '#create-party'); const party = await h.wait(a, 'party created', s => !!s.multiplayer?.code);
    await h.click(b, '#join-code'); await b.send('Input.insertText', { text: party.multiplayer!.code! }); await h.click(b, '#join-room');
    await h.wait(a, 'partner connected', s => !!s.multiplayer?.shared?.connected.every(Boolean));
    if (await a.read<boolean>("document.querySelector('#menu').hidden")) await h.click(a, '#pause');
    const selector = '[data-select-level="crossfeed-vault"]';
    if (!await a.read<boolean>(`!!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).closest('[hidden]')`)) await h.click(a, '#choose-chamber');
    await h.click(a, selector);
    for (const p of [a, b]) {
        await h.wait(p, 'CROSSFEED overview', s => s.room === 'crossfeed-vault' && s.overviewVisible);
        await h.tap(p, 'Space'); await h.wait(p, 'CROSSFEED running', s => s.started && !s.overviewVisible);
    }
    // Activate SYSTEM ONLINE through its real jump-and-E interaction so the
    // reversible controls have genuinely powered/unpowered destinations.
    await fixture(b, 1255, 733);
    await h.key(b, 'Space', true);
    try {
        await h.wait(b, 'SYSTEM ONLINE mid-jump reach', s => !s.player.grounded && s.player.vy > -260, 2000);
        await h.tap(b, 'KeyE');
    } finally { await h.key(b, 'Space', false); }
    await h.wait(a, 'accepted SYSTEM ONLINE', s => (s.multiplayer!.shared! as SharedRoom<'crossfeed-vault'>).levelState.inputs.switchC);
    await h.wait(b, 'returns to catwalk', s => s.player.grounded);
    await fixture(a, 2870, 1483);
    h.check('TRANSFER initially powers inverted relay output', (await accepted(a)).levelState.outputs.relayGates);
    await review(a, 'TRANSFER MODE', 2820, 'relay on'); await h.shot(a, '01-transfer-relay-on-fixture');
    await toggle(a, b, 'switchB', true);
    h.check('TRANSFER switches relay off and bridge on', !(await accepted(a)).levelState.outputs.relayGates && (await accepted(b)).levelState.outputs.bridge);
    await review(a, 'TRANSFER MODE', 2820, 'relay off'); await h.shot(a, '02-transfer-relay-off-fixture');
    await toggle(a, b, 'switchB', false);
    h.check('TRANSFER reverses back to powered relay', (await accepted(b)).levelState.outputs.relayGates && !(await accepted(a)).levelState.outputs.bridge);
    await fixture(b, 1330, 733); await fixture(a, 1435, 733);
    await h.wait(a, 'accepted body-held route power', s => (s.multiplayer!.shared! as SharedRoom<'crossfeed-vault'>).levelState.inputs.routePowerOccupied);
    h.check('ROUTE initially selects inverted left route', (await accepted(a)).levelState.outputs.leftRoute && !(await accepted(b)).levelState.outputs.rightRoute);
    await review(a, 'ROUTE SELECT', 1385, 'left on'); await h.shot(a, '03-route-left-on-fixture');
    await toggle(a, b, 'routeMode', true);
    h.check('ROUTE switches left off and right on', !(await accepted(a)).levelState.outputs.leftRoute && (await accepted(b)).levelState.outputs.rightRoute);
    await review(a, 'ROUTE SELECT', 1385, 'left off'); await h.shot(a, '04-route-left-off-fixture');
    await toggle(a, b, 'routeMode', false);
    h.check('ROUTE reverses back to powered left route', (await accepted(b)).levelState.outputs.leftRoute && !(await accepted(a)).levelState.outputs.rightRoute);
    await a.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
    await h.sleep(1100); await review(a, 'ROUTE SELECT', 1385, '1024×768');
    await a.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await h.sleep(400); await review(a, 'ROUTE SELECT', 1385, 'reduced motion');
    await h.click(a, '#pause'); await review(a, 'ROUTE SELECT', 1385, 'paused');
    for (const p of h.clients) h.check('no browser runtime errors', p.errors.length === 0, p.errors.join('\n'));
} catch (error) {
    console.error(String(error)); process.exitCode = 1;
} finally {
    await writeFile(join(h.shots, 'checks.txt'), h.checks.join('\n') + '\n');
    await writeFile(join(h.shots, 'observations.json'), JSON.stringify({ scope: 'Isolated body-placement fixtures; real E/Space and accepted signals. Not a full room solve.', observations }, null, 2) + '\n');
    await h.cleanup();
}
