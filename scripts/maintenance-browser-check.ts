#!/usr/bin/env node
/** Focused art review on the canonical HANDSHAKE solve. No world-state injection. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coopBrowser, type Cdp } from './coop-browser.ts';
import { campaignDraftRoute } from './campaign-draft-route.ts';

const h = await coopBrowser({ shots: process.env.BN_SHOTS ?? '/tmp/bn-maintenance-shots', internalLabs: false });
const { check, click, wait, sleep, snapshot, shot, tap } = h;
const observations: { name: string; state: unknown }[] = [];
let readyCaptured = false, dormantCaptured = false, completedCaptured = false;
const control = (p: Cdp) => p.read<{
    completed: boolean; hint: string; grounded: boolean; groundId: string; exit: boolean;
    player: { x: number; y: number }; camera: { zoom: number; x: number; y: number };
    visible: boolean; clearOfHud: boolean; latchSounds: number; reducedMotion: boolean;
}>(`(()=>{const g=binaryNinja,w=g.world,c=g.renderer.camera,at=w.room.controls.find(c=>c.id==='draft:maintenance').at;
    const canvas=g.canvas.getBoundingClientRect(),hud=document.querySelector('#coop-hud').getBoundingClientRect();
    const art={left:canvas.left+(at.x-64-c.originX())*c.zoom,right:canvas.left+(at.x+64-c.originX())*c.zoom,
        top:canvas.top+(at.y-64-c.originY())*c.zoom,bottom:canvas.top+(at.y-12-c.originY())*c.zoom};
    return {completed:!!w.frame.controls['draft:maintenance'],hint:w.interactionHint(),grounded:w.player.grounded,
        groundId:w.player.groundId,exit:w.frame.outputs.exitDoor,player:{x:w.player.x,y:w.player.y},
        camera:{zoom:c.zoom,x:c.x,y:c.y},
        visible:(at.x-112-c.originX())*c.zoom>=0&&(at.x+112-c.originX())*c.zoom<c.viewW
            &&(at.y-91-c.originY())*c.zoom>=0&&(at.y+60-c.originY())*c.zoom<c.viewH,
        clearOfHud:art.right<=hud.left||art.left>=hud.right||art.bottom<=hud.top||art.top>=hud.bottom,
        latchSounds:g.audio.snapshot().played.latch??0,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};})()`);
async function capture(p: Cdp, name: string) {
    const state = await control(p);
    check(`${name}: control, bounded filaments and caption fit the normal gameplay camera`, state.visible);
    check(`${name}: housing and filaments clear the session panel`, state.clearOfHud);
    observations.push({ name, state }); await shot(p, name);
}
async function compact(p: Cdp, state: string) {
    for (const [width, height] of [[1024, 768], [800, 600]]) {
        await p.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
        await sleep(850); await capture(p, `${state}-${width}`);
        check(`${width} desktop has no horizontal page overflow`, await p.read('document.documentElement.scrollWidth <= innerWidth'));
    }
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(850);
}
// Capture immediately before the route's actual E press, when the existing
// authority offers this control. No independent distance/eligibility predicate.
h.tap = async (p, code) => {
    if (code === 'KeyE' && !readyCaptured && (await control(p)).hint === 'E · MAINTENANCE COMPLETE') {
        readyCaptured = true;
        const before = await control(p);
        check('ready still requires a real landing on the authored maintenance ledge', before.grounded && before.groundId === 'maintenanceLedge' && !before.completed);
        await capture(p, '02-ready-approach'); await compact(p, '02-ready');
    }
    await tap(p, code);
};
h.shot = async (p, name) => {
    if (name === 'handshake-partner-held-boost-partner') {
        dormantCaptured = true;
        check('before the upper jump, the maintenance latch is unconfirmed and unavailable', !(await control(p)).completed && (await control(p)).hint !== 'E · MAINTENANCE COMPLETE');
        await capture(p, '01-dormant-approach');
    }
    if (name === 'handshake-maintenance-complete-partner') {
        completedCaptured = true;
        await sleep(400);
        const before = await control(p);
        check('real E commits maintenance once while the exit still requires the payload', before.completed && !before.exit && before.hint === 'COMMITTED' && before.latchSounds === 1);
        await capture(p, '03-completed-green');
        await tap(p, 'KeyE'); await sleep(250);
        const after = await control(p);
        check('a second E cannot release the latch or replay its confirmation sound', after.completed && after.latchSounds === before.latchSounds);
        for (const peer of h.clients) check('both players observe the same accepted maintenance latch', (await control(peer)).completed);
        await compact(p, '03-completed-green');
        await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
        await sleep(100); check('reduced motion retains the completed state', (await control(p)).reducedMotion && (await control(p)).completed);
        await capture(p, '04-completed-reduced-motion');
        await p.send('Emulation.setEmulatedMedia', { features: [] });
        // Real movement away also shows the latched face without the avatar in
        // front of it; the canonical descent continues from the same ledge.
        await h.walk(p, 1920); await sleep(700); await capture(p, '05-completed-departure');
        check('the completed green latch persists after leaving interaction range', (await control(p)).completed && !(await control(p)).hint);
    }
};
try {
    const url = await h.startServer(), debug = await h.launch();
    const a = await h.page(url, debug), b = await h.page(url, debug);
    await click(a, '#create-party'); const lobby = await wait(a, 'party lobby', s => s.multiplayer?.shared?.party?.phase === 'lobby');
    await click(b, '#join-code'); await b.send('Input.insertText', { text: lobby.multiplayer!.code! }); await click(b, '#join-room');
    await wait(a, 'guest joins', s => s.multiplayer?.shared?.connected.every(Boolean) === true);
    await click(a, '[data-select-level="handshake"]');
    for (const p of [a, b]) await wait(p, 'Handshake overview', s => s.room === 'handshake' && s.overviewVisible);
    await campaignDraftRoute(h, 'handshake', [a, b]);
    check('all three maintenance visual states were reached through real controls', dormantCaptured && readyCaptured && completedCaptured);
    for (const p of [a, b]) {
        const s = await snapshot(p);
        check('ordinary two-arrival completion and zero-death route are preserved', s.multiplayer?.shared?.completed === true && s.deaths === 0);
        check('no browser runtime errors', p.errors.length === 0, p.errors.join('\n'));
    }
} catch (e) {
    for (const [i, p] of h.clients.entries()) await shot(p, `failure-${i}`).catch(() => {});
    console.error(String(e).split(': {')[0]); process.exitCode = 1;
} finally {
    await writeFile(join(h.shots, 'checks.txt'), h.checks.join('\n') + '\n');
    await writeFile(join(h.shots, 'maintenance-observations.json'), JSON.stringify(observations, null, 2) + '\n');
    await h.cleanup();
}
