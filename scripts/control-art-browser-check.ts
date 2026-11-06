#!/usr/bin/env node
/** Focused presentation/interaction review, using the existing production browser harness.
 * PRESSURE/SWITCH use real walking. Other controls use explicitly labelled isolated
 * section setups (body placement and solo room selection), followed by actual E input.
 * These fixtures verify interaction/rendering; they are NOT physical room solves.
 * No controller values, outputs, device reach or geometry are changed.
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coopBrowser, type Cdp } from './coop-browser.ts';

const h = await coopBrowser({ shots: process.env.BN_SHOTS ?? '.workbench/reports/control-art', internalLabs: false });
const observations: unknown[] = [];
type Control = { id: string; label: string; at: { x: number; y: number }; latch: boolean };
const inventory = (p: Cdp) => p.read<Control[]>(`(()=>{const r=binaryNinja.world.room;return [
    ...(r.lever?[{id:'lever',label:r.id==='relay'?'BRIDGE':r.id==='uplink'?'RELAY POWER':'SWITCH',at:r.lever,latch:r.id==='relay'}]:[]),
    ...(r.upperLever?[{id:'upperLever',label:'LIFT LATCH',at:r.upperLever,latch:true}]:[]),
    ...(r.controls??[]).filter(c=>!c.floating && !(r.id==='handshake'&&c.id==='draft:maintenance')
        && !(r.id==='race-condition'&&c.id==='commit')).map(c=>({id:c.id,label:c.label,at:c.at,latch:c.kind!=='toggle'}))
    ].filter(c=>!(r.breakpoints??[]).some(b=>b.activationControl===c.id));})()`);
const state = (p: Cdp, id: string) => p.read<boolean>(`(()=>{const w=binaryNinja.world;return !!(${JSON.stringify(id)}==='lever'?w.inputs.switchB:
    ${JSON.stringify(id)}==='upperLever'?w.inputs.switchC:w.frame.controls?.[${JSON.stringify(id)}]
    ??(${JSON.stringify(id)}==='phase'?w.inputs.switchB:false));})()`);
async function until(label: string, predicate: () => Promise<boolean>) {
    const deadline = Date.now() + 5000;
    while (!await predicate()) { if (Date.now() > deadline) throw new Error(label); await h.sleep(30); }
}
async function bodyFixture(p: Cdp, x: number, y: number) {
    await p.read(`(()=>{const g=binaryNinja,p=g.world.player;g.input.releaseAll();
        Object.assign(p,{x:${x},y:${y},vx:0,vy:0,grounded:false,groundId:null});
        g.renderer.cameraReveals.reset(g.world);g.renderer.camera.snapTo(p.x,p.y-100);})()`);
    await h.wait(p, 'isolated section body settles on existing ground', s => s.player.grounded);
    await h.sleep(1000);
}
async function textInk(p: Cdp, labels: string[]) {
    return p.read<{ text: string; left: number; right: number; top: number; bottom: number; width: number; height: number }[]>(`new Promise(resolve=>{
        const proto=CanvasRenderingContext2D.prototype,original=proto.fillText,seen=[],labels=${JSON.stringify(labels)};
        proto.fillText=function(label,x,y,...rest){if(labels.includes(label)||(labels.includes('__YOU__')&&label.includes('YOU'))
            ||(labels.includes('__NAMES__')&&(label.includes(' / P1')||label.includes(' / P2')||label.includes(' / YOU')))){
            const m=this.getTransform(),w=this.measureText(label).width,align=this.textAlign;
            const left=x-(align==='center'?w/2:align==='right'?w:0),size=parseFloat(this.font.match(/[0-9.]+px/)[0]);
            seen.push({text:label,left:left*m.a+m.e,right:(left+w)*m.a+m.e,top:(y-size)*m.d+m.f,
                bottom:y*m.d+m.f,width:this.canvas.width,height:this.canvas.height});
        } return original.call(this,label,x,y,...rest);};
        requestAnimationFrame(()=>requestAnimationFrame(()=>{proto.fillText=original;resolve(seen)}));
    })`);
}
async function visibleText(p: Cdp, labels: string[], fixture: boolean) {
    const ink = await textInk(p, labels);
    h.check(`${fixture ? '[isolated fixture] ' : ''}${labels.join(' / ')} fits the normal gameplay canvas`,
        labels.every(label => ink.some(t => t.text === label && t.left >= 0 && t.right <= t.width && t.top >= 0 && t.bottom <= t.height)));
    h.check('review uses the normal game camera', await p.read('!binaryNinja.renderer.editorCamera'));
    observations.push({ fixture, labels, ink, camera: (await h.snapshot(p)).camera });
}
async function clearPrompt(p: Cdp) {
    const hint = await p.read<string>('binaryNinja.world.interactionHint()');
    const ink = await textInk(p, [hint, '__YOU__']), prompts = ink.filter(t => t.text === hint), names = ink.filter(t => t.text.includes('YOU'));
    h.check('device interaction hint clears the local player label', prompts.length > 0 && names.length > 0
        && prompts.every(a => names.every(b => a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom)));
}
async function compactHint(p: Cdp, labels: string[]) {
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
    await h.sleep(1200); await visibleText(p, labels, false);
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
    await h.sleep(800);
}
async function namesClearHousing(p: Cdp, at: { x: number; y: number }) {
    const names = await textInk(p, ['__NAMES__']);
    const box = await p.read<{ left: number; right: number; top: number; bottom: number }>(`(()=>{const c=binaryNinja.renderer.camera,d=Math.min(devicePixelRatio||1,2);
        return {left:(${at.x}-28-c.originX())*c.zoom*d,right:(${at.x}+28-c.originX())*c.zoom*d,
            top:(${at.y}-94-c.originY())*c.zoom*d,bottom:(${at.y}-24-c.originY())*c.zoom*d};})()`);
    h.check('both P1/P2 labels clear the PHASE housing', names.some(n=>n.text.includes('P1')) && names.some(n=>n.text.includes('P2'))
        && names.every(n=>n.right <= box.left || n.left >= box.right || n.bottom <= box.top || n.top >= box.bottom));
    observations.push({ names, housing: box });
}
async function exercise(p: Cdp, control: Control, peer?: Cdp, capture?: string) {
    // 50 units to the right keeps the avatar off the 56-unit artwork, within the
    // existing 72-unit interaction radius. ROUTE SELECT's deck ends at x=1440.
    await bodyFixture(p, control.at.x + 50, control.at.y - 17);
    const before = await state(p, control.id);
    const hint = await p.read<string>('binaryNinja.world.interactionHint()');
    h.check(`[isolated fixture] ${control.label} exposes its existing E interaction`, hint.startsWith('E · '), hint);
    await h.tap(p, 'KeyE');
    await until(`${control.label} did not accept E`, async () => await state(p, control.id) !== before);
    h.check(`[isolated fixture] ${control.label} changes through real E input`, await state(p, control.id) !== before);
    if (peer) {
        await until(`${control.label} not replicated`, async () => await state(peer, control.id) === await state(p, control.id));
        h.check(`[isolated fixture] both clients agree on ${control.label}`, await state(peer, control.id) === await state(p, control.id));
    }
    // Wait out the existing control camera reveal before a normal-camera capture.
    await h.sleep(2600); await clearPrompt(p);
    if (capture) await h.shot(p, capture);
    await h.tap(p, 'KeyE'); await h.sleep(300);
    h.check(`[isolated fixture] ${control.label} ${control.latch ? 'stays latched' : 'still toggles back'}`,
        await state(p, control.id) === (control.latch ? !before : before));
    observations.push({ fixture: true, room: (await h.snapshot(p)).room, control, initial: before,
        afterTwoPresses: await state(p, control.id), hint, camera: (await h.snapshot(p)).camera });
}
async function choose(a: Cdp, b: Cdp, room: string) {
    if (await a.read<boolean>("document.querySelector('#menu').hidden")) await h.click(a, '#pause');
    const selector = `[data-select-level="${room}"]`;
    if (!await a.read<boolean>(`!!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).closest('[hidden]')`)) await h.click(a, '#choose-chamber');
    await h.click(a, selector);
    for (const p of [a, b]) {
        await h.wait(p, 'selected room overview', s => s.room === room && s.overviewVisible);
        await h.tap(p, 'Space'); await h.wait(p, 'selected room running', s => s.started && !s.overviewVisible);
    }
}
async function switchPixels(p: Cdp, at: { x: number; y: number }) {
    return p.read<number[]>(`(()=>{const g=binaryNinja,c=g.renderer.camera,d=Math.min(devicePixelRatio||1,2),
        x=Math.round((${at.x}-18-c.originX())*c.zoom*d),y=Math.round((${at.y}-82-c.originY())*c.zoom*d),
        w=Math.round(36*c.zoom*d),hh=Math.round(40*c.zoom*d);
        return Array.from(g.canvas.getContext('2d').getImageData(x,y,w,hh).data);})()`);
}
try {
    const url = await h.startServer(), debug = await h.launch(), solo = await h.page(url, debug);
    await h.click(solo, '#tutorial'); await h.wait(solo, 'PRESSURE starts', s => s.room === 'pressure' && s.started);
    await h.walk(solo, 250); await h.sleep(400);
    await visibleText(solo, ['PRESS E TO PICK UP CUBE'], false);
    await compactHint(solo, ['PRESS E TO PICK UP CUBE']); await h.shot(solo, '01-pressure-hint');
    await h.tap(solo, 'KeyE'); h.check('PRESSURE hint corresponds to an actual cube pickup', (await h.snapshot(solo)).cube?.carried === true);
    await h.walk(solo, 560); await h.tap(solo, 'KeyE');
    await h.wait(solo, 'PRESSURE cube powers exit', s => s.inputs.cubeOnPlate);
    await h.key(solo, 'KeyD', true); await h.tap(solo, 'Space');
    try { await h.wait(solo, 'natural SWITCH progression', s => s.room === 'switch'); }
    finally { await h.key(solo, 'KeyD', false); }
    await h.walk(solo, 265); await h.sleep(800);
    await visibleText(solo, ['PRESS SPACE TO JUMP', 'PRESS AND HOLD SPACE AGAIN TO SWING'], false);
    await compactHint(solo, ['PRESS SPACE TO JUMP', 'PRESS AND HOLD SPACE AGAIN TO SWING']);
    await h.shot(solo, '02-switch-hint');
    await h.tap(solo, 'KeyE'); h.check('new SWITCH lever activates with real E input', await state(solo, 'lever'));
    await h.tap(solo, 'KeyE'); h.check('new SWITCH lever stays reversible', !await state(solo, 'lever'));
    for (const room of ['relay', 'uplink']) {
        // Explicit room-selection fixture only: retain each room's untouched initial memory.
        await solo.read(`(()=>{const g=binaryNinja;g.store.progress.currentRoom=${JSON.stringify(room)};g.ended=false;g.loadRoom();g.overviewPending=false;g.resumeRoom();})()`);
        for (const c of await inventory(solo)) await exercise(solo, c, undefined,
            room === 'relay' ? '03-relay-latched-fixture' : c.id === 'lever' ? '04-control-spine-active-fixture' : undefined);
    }
    const a = await h.page(url, debug), b = await h.page(url, debug);
    await h.click(a, '#create-party'); const party = await h.wait(a, 'party created', s => !!s.multiplayer?.code);
    await h.click(b, '#join-code'); await b.send('Input.insertText', { text: party.multiplayer!.code! }); await h.click(b, '#join-room');
    await h.wait(a, 'partner connected', s => !!s.multiplayer?.shared?.connected.every(Boolean));
    for (const room of ['handshake', 'bypass', 'crossfeed-vault', 'race-condition', 'deadlock', 'use-after-free']) {
        await choose(a, b, room);
        const controls = await inventory(a);
        observations.push({ room, legacyControlInventory: controls });
        for (const c of controls) await exercise(a, c, b, undefined);
        if (room === 'handshake') {
            await bodyFixture(a, 1770, 533);
            await visibleText(a, ['BOOST YOUR PARTNER'], true);
        }
        if (room === 'race-condition') {
            const phase = controls.find(c => c.id === 'phase')!;
            // A real second avatar beside the switch exercises the remote-name clearance too.
            await bodyFixture(b, phase.at.x - 50, phase.at.y - 17);
            await namesClearHousing(a, phase.at); await h.shot(a, '05-race-phase-fixture');
            const geometry = await a.read<{ gap: number; x: number; y: number }>(`(()=>{const r=binaryNinja.world.room,p=r.controls.find(c=>c.id==='phase').at,
                pad=r.plates.find(c=>c.id==='trace').at;return {gap:(pad.y-6)-(p.y-24),x:p.x,y:p.y}})()`);
            h.check('PHASE housing has 18 units of vertical clearance above TRACE tread without moving controls', geometry.gap === 18 && geometry.x === 655 && geometry.y === 720);
            await h.wait(a, 'PHASE reveal finishes before stillness review', s => s.camera.kind === 'follow');
            await a.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
            await h.sleep(3000); await clearPrompt(a); await namesClearHousing(a, phase.at); await h.shot(a, '06-race-compact-fixture');
            h.check('compact RACE view has no horizontal page overflow', await a.read('document.documentElement.scrollWidth<=innerWidth'));
            await a.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
            await h.sleep(1000); const still = await switchPixels(a, phase.at); await h.sleep(240);
            const reducedLater = await switchPixels(a, phase.at);
            const reducedDelta = still.length === reducedLater.length ? Math.max(...still.map((v, i) => Math.abs(v - reducedLater[i]))) : 255;
            observations.push({ reducedDelta, camera: (await h.snapshot(a)).camera });
            // Two channel values allow Chromium subpixel raster dithering; a moving signal packet changes tens of values.
            h.check('reduced motion keeps switch housing pixels still (2-channel raster tolerance)', reducedDelta <= 2, String(reducedDelta));
            await a.send('Emulation.setEmulatedMedia', { features: [] });
            await h.click(a, '#pause'); await h.sleep(1000); const paused = await switchPixels(a, phase.at); await h.sleep(240);
            const pausedLater = await switchPixels(a, phase.at);
            const pausedDelta = paused.length === pausedLater.length ? Math.max(...paused.map((v, i) => Math.abs(v - pausedLater[i]))) : 255;
            observations.push({ pausedDelta });
            h.check('paused switch housing pixels remain still (2-channel raster tolerance)', pausedDelta <= 2, String(pausedDelta));
            await h.click(a, '#continue');
            await a.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
        }
    }
    for (const p of h.clients) h.check('focused review has no browser runtime errors', p.errors.length === 0, p.errors.join('\n'));
} catch (error) {
    for (const [i, p] of h.clients.entries()) await h.shot(p, `failure-${i}`).catch(() => {});
    console.error(String(error)); process.exitCode = 1;
} finally {
    await writeFile(join(h.shots, 'checks.txt'), h.checks.join('\n') + '\n');
    await writeFile(join(h.shots, 'observations.json'), JSON.stringify({
        scope: 'Presentation and isolated interaction fixtures, not a campaign solve. Body/solo-room setups are explicitly labelled; all activation uses E input. No output/device forcing.', observations,
    }, null, 2) + '\n');
    await h.cleanup();
}
