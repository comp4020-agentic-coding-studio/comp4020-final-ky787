#!/usr/bin/env node
/** Matched normal-game captures for chamber spacing reviews.
 * Real menu, walking and pressure-plate input only. Fixed review cameras use the
 * renderer's existing presentation-only editorCamera; no world/party state is set.
 * BN_SPACING_VIEWS (JSON) overrides the HANDSHAKE fixed cameras so a before/after
 * pair shares exactly the same world framing and zoom. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coopBrowser, type Cdp } from './coop-browser.ts';

type View = { x: number; y: number; zoom: number };
const DEFAULT_VIEWS: Record<string, View> = {
    start: { x: 1500, y: 820, zoom: .95 },
    cluster: { x: 1340, y: 820, zoom: 1.15 },
    crossing: { x: 760, y: 870, zoom: .8 },
};
const views: Record<string, View> = { ...DEFAULT_VIEWS, ...JSON.parse(process.env.BN_SPACING_VIEWS ?? '{}') };
const liftPlateX = Number(process.env.BN_SPACING_LIFT_PLATE ?? 1450);
const h = await coopBrowser({ shots: process.env.BN_SHOTS ?? '/tmp/bn-spacing-shots', internalLabs: false });
const { click, wait, sleep, snapshot, check } = h;
const observations: unknown[] = [];
const SIZES = [[1920, 1080], [1024, 768]] as const;

async function size(p: Cdp, width: number, height: number) {
    await p.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
}
async function fixed(p: Cdp, name: string, camera: View) {
    for (const [width, height] of SIZES) {
        await size(p, width, height);
        await p.read(`binaryNinja.renderer.editorCamera=${JSON.stringify(camera)}`);
        await sleep(500);
        observations.push({ name: `${name}-${width}`, camera, state: await brief(p) });
        await h.shot(p, `${name}-${width}`);
    }
    await p.read('binaryNinja.renderer.editorCamera=undefined');
    await size(p, 1600, 900); await sleep(300);
}
async function follow(p: Cdp, name: string) {
    for (const [width, height] of SIZES) {
        await size(p, width, height); await sleep(1100);
        const s = await snapshot(p);
        check(`${name}-${width} is an ordinary following camera`, s.camera.kind === 'follow' && !s.overviewVisible);
        observations.push({ name: `${name}-${width}`, state: await brief(p) });
        await h.shot(p, `${name}-${width}`);
    }
    await size(p, 1600, 900); await sleep(300);
}
async function overview(p: Cdp, name: string) {
    for (const [width, height] of SIZES) {
        await size(p, width, height);
        await h.key(p, 'Tab', true); await sleep(1300);
        check(`${name}-${width} is the explicit overview`, (await snapshot(p)).camera.kind === 'overview');
        await h.shot(p, `${name}-${width}`);
        await h.key(p, 'Tab', false); await sleep(700);
    }
    await size(p, 1600, 900); await sleep(300);
}
const brief = (p: Cdp) => p.read(`(()=>{const w=binaryNinja.world,c=binaryNinja.renderer.camera;
    return {room:w.room.id,player:{x:w.player.x,y:w.player.y,groundId:w.player.groundId},deaths:w.deaths,
        signals:{...w.frame.outputs,...w.frame.signals},camera:{x:c.x,y:c.y,zoom:c.zoom}}})()`);
async function choose(host: Cdp, guest: Cdp, chamber: string) {
    if (await host.read<boolean>("document.querySelector('#menu').hidden")) await click(host, '#pause');
    const selector = `[data-select-level="${chamber}"]`;
    if (!await host.read<boolean>(`!!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).closest('[hidden]')`)) await click(host, '#choose-chamber');
    await click(host, selector);
    for (const p of [host, guest]) await wait(p, `${chamber} overview`, s => s.room === chamber && s.overviewVisible);
    for (const p of [host, guest]) { await h.tap(p, 'Space'); await wait(p, `${chamber} started`, s => s.started && !s.overviewVisible); }
}
try {
    const url = await h.startServer(), debug = await h.launch();
    const a = await h.page(url, debug), b = await h.page(url, debug);
    await click(a, '#create-party'); const lobby = await wait(a, 'party lobby', s => s.multiplayer?.shared?.party?.phase === 'lobby');
    await click(b, '#join-code'); await b.send('Input.insertText', { text: lobby.multiplayer!.code! }); await click(b, '#join-room');
    await wait(a, 'partner joined', s => s.multiplayer?.shared?.connected.every(Boolean) === true);
    await choose(a, b, 'handshake');
    await sleep(600);
    await fixed(a, 'handshake-01-start-both-players', views.start);
    await follow(a, 'handshake-01b-follow-player-1');
    await fixed(a, 'handshake-02-breakpoint-lift-pads', views.cluster);
    await overview(a, 'handshake-05-overview');
    // Real input: Player 2 walks onto LIFT; the accepted output powers the lift.
    await h.walk(b, liftPlateX);
    await wait(a, 'LIFT contact accepted', s => !!s.signals?.['draft:liftPower'], 6000);
    await sleep(1400);
    await fixed(a, 'handshake-03-lift-powered', views.cluster);
    check('lift powered through real plate contact', !!(await snapshot(a)).signals?.['draft:liftPower']);
    await fixed(a, 'handshake-04-crossing', views.crossing);
    for (const chamber of ['crossfeed-vault', 'race-condition', 'deadlock', 'use-after-free']) {
        await choose(a, b, chamber); await sleep(600);
        for (const [i, p] of [a, b].entries()) await follow(p, `${chamber}-player-${i + 1}`);
        await overview(a, `${chamber}-overview`);
    }
    for (const p of [a, b]) check('no browser runtime errors', p.errors.length === 0, p.errors.join('\n'));
} catch (e) {
    for (const [i, p] of h.clients.entries()) await h.shot(p, `failure-${i}`).catch(() => {});
    console.error(String(e).slice(0, 2000)); process.exitCode = 1;
} finally {
    await writeFile(join(h.shots, 'observations.json'), JSON.stringify(observations, null, 2) + '\n');
    await writeFile(join(h.shots, 'checks.txt'), h.checks.join('\n') + '\n');
    await h.cleanup();
}
