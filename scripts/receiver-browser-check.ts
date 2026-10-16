#!/usr/bin/env node
/** Production-rendered receiver review. Inputs move real bodies; only labelled editor
 * State Preview uses diagnostic values. No multiplayer occupancy/state injection. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Cdp, coopBrowser } from './coop-browser.ts';
import { campaignDraftRoute } from './campaign-draft-route.ts';
import { receiverReview } from './fixtures/receiver-review.ts';
import { serializeDraft } from '../src/workbench/model.ts';
import { requirePlayable } from '../src/workbench/validation.ts';

const modes = process.argv.slice(2).length ? process.argv.slice(2) : ['public', 'editor', 'campaign'];
if (modes.some(m => !['public', 'editor', 'campaign'].includes(m))) throw new Error('Modes: public editor campaign');
const reports = resolve(process.env.BN_SHOTS ?? '.workbench/reports/2026-10-16-payload-interface');
await mkdir(reports, { recursive: true });
const h = await coopBrowser({ shots: reports, internalLabs: false, readyExpression:
    '!!(globalThis.binaryNinja?.store.ready || globalThis.workbench?.ready || globalThis.customLevel?.observe().ready)' });
const fixture = requirePlayable(receiverReview()), fixturePath = join(reports, 'receiver-review.json');
await writeFile(fixturePath, serializeDraft(fixture));
const captured: { name: string; state: unknown }[] = [];
let root: Cdp | undefined, host: Cdp | undefined, pass = false, error: string | null = null;
const observe = (p: Cdp) => p.read<any>('customLevel.observe()');
async function until(p: Cdp, label: string, expression: string, timeout = 12000) {
    const end = Date.now() + timeout;
    do {
        if (p.errors.length) throw new Error(p.errors.join('\n'));
        if (await p.read<boolean>(expression)) return;
        await h.sleep(15);
    } while (Date.now() < end);
    throw new Error(`Timeout ${label}: ${expression}`);
}
async function walk(p: Cdp, x: number, editor = false) {
    const state = editor ? 'workbench.observe()' : 'customLevel.observe()', start = await p.read<any>(state);
    const right = start.player.x < x, code = right ? 'KeyD' : 'KeyA';
    await h.key(p, code, true);
    try { await until(p, `walk to ${x}`, `${state}.player.x ${right ? '>=' : '<='} ${x}`); }
    finally { await h.key(p, code, false); }
    await h.sleep(220);
}
const active = (id: number) => `customLevel.observe().heroAssets.receivers.find(r=>r.id==='draft:receiver${id}')`;
async function ink(p: Cdp) {
    return p.read<any[]>(`new Promise(resolve=>{const proto=CanvasRenderingContext2D.prototype,old=proto.fillText,seen=[];
        proto.fillText=function(s,x,y,...rest){if(/PAYLOAD|PRESSURE/.test(s)){const m=this.getTransform(),w=this.measureText(s).width*m.a;
          const anchor=x*m.a+m.e,left=this.textAlign==='center'?anchor-w/2:anchor;seen.push({text:s,colour:this.fillStyle,left,right:left+w,width:this.canvas.width});}
          return old.call(this,s,x,y,...rest)};
        requestAnimationFrame(()=>requestAnimationFrame(()=>{proto.fillText=old;resolve(seen)}));})`);
}
async function capture(p: Cdp, name: string, centre = { x: 800, y: 620 }, width = 420, height = 270, scale = 1) {
    const s = await observe(p); captured.push({ name, state: s });
    await h.shot(p, name);
    const clip = await p.read(`(()=>{const r=document.querySelector('canvas').getBoundingClientRect(),c=customLevel.observe().camera;
        const x=(${centre.x}-c.x)*c.zoom+r.x,y=(${centre.y}-c.y)*c.zoom+r.y;
        return {x:Math.max(0,Math.min(innerWidth-${width},x-${width}/2)),y:Math.max(0,Math.min(innerHeight-${height},y-${height}*.6)),width:${width},height:${height},scale:${scale}};})()`);
    const shot = await p.send('Page.captureScreenshot', { format: 'png', clip });
    await writeFile(join(reports, `${name}-detail.png`), Buffer.from(shot.data, 'base64'));
}
async function loadEditor(origin: string, debug: string) {
    const editor = await h.page(`${origin}workbench.html`, debug);
    const { root: dom } = await editor.send('DOM.getDocument'), { nodeId } = await editor.send('DOM.querySelector', { nodeId: dom.nodeId, selector: '#json-file' });
    await editor.send('DOM.setFileInputFiles', { nodeId, files: [fixturePath] });
    await until(editor, 'import receiver fixture', `workbench.snapshot().document.id===${JSON.stringify(fixture.id)} && workbench.snapshot().playable && !!workbench.snapshot().draftId`);
    return editor;
}
try {
    const origin = await h.startServer(), debug = await h.launch(); root = await new Cdp(debug).open();
    const editor = modes.includes('public') || modes.includes('editor') ? await loadEditor(origin, debug) : undefined;
    if (modes.includes('public')) {
        const before = new Set((await root.send('Target.getTargets')).targetInfos.map((t: any) => t.targetId));
        await h.click(editor!, '#coop');
        let target: any;
        for (let n = 0; n < 200 && !target; n++) { target = (await root.send('Target.getTargets')).targetInfos.find((t: any) => !before.has(t.targetId) && t.url.includes('custom-level.html')); if (!target) await h.sleep(30); }
        if (!target) throw new Error('Custom receiver session did not open');
        host = await new Cdp(`${new URL(debug).origin}/devtools/page/${target.targetId}`).open();
        await host.send('Runtime.enable'); await host.send('Page.enable');
        await host.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
        await host.send('Emulation.setFocusEmulationEnabled', { enabled: true });
        await until(host, 'host receiver session', '!!globalThis.customLevel?.observe().ready');
        const code = (await observe(host)).session.code;
        const guest = await h.page(`${origin}custom-level.html?code=${code}&mode=test`, debug), pages = [host, guest];
        await until(host, 'two visitors connected', 'customLevel.observe().session.peers.every(Boolean)');
        // Real gestures unlock each audio context; a muted browser still counts bounded voices.
        await h.tap(guest, 'KeyA'); await h.tap(host, 'KeyD'); await h.sleep(350);
        for (const p of pages) await until(p, 'audio samples loaded', 'customLevel.observe().audio.loaded===14');
        const counts = () => Promise.all(pages.map(async p => (await observe(p)).audio.played.payloadConfirm ?? 0));
        const baseline = await counts();
        await walk(host, 800);
        for (const p of pages) h.check('a player on the dock cannot visually activate either receiver', (await observe(p)).heroAssets.receivers.every((r: any) => !r.active));
        await capture(host, '01-empty');
        await walk(host, 1080);
        h.check('ordinary pressure plate still accepts the player and stays visually distinct', (await observe(host)).plates['draft:pressure'] && !(await observe(host)).plates['draft:receiver1']);
        await capture(host, '07-receiver-versus-plate', { x: 940, y: 620 }, 650, 300);
        await walk(host, 1210); await h.tap(host, 'KeyE');
        await until(host, 'cube pickup accepted', 'customLevel.observe().session.sharedCubes["draft:cargoA"].holder===1');
        await walk(host, 1000); await capture(host, '02-approaching', { x: 900, y: 600 }, 500, 300);
        await walk(host, 920); await h.tap(host, 'KeyE');
        for (const p of pages) await until(p, 'accepted payload detection', `${active(1)}.active`);
        await h.sleep(180); await capture(host, '03-detection');
        h.check('accepted placement emits exactly one distinct confirmation on each client', (await counts()).every((n, i) => n === baseline[i] + 1));
        await h.sleep(1100); await capture(host, '04-powered');
        for (const p of pages) {
            const s = await observe(p), dock = s.heroAssets.receivers[0].dock;
            h.check('an off-centre accepted delivery snaps body and art to the same canonical pose', dock?.cube === 'draft:cargoA' && dock.x === 800 && dock.y === 598
                && s.cubes['draft:cargoA'].x === 800 && s.cubes['draft:cargoA'].y === 598);
        }
        await capture(host, '04-docked-closeup', { x: 800, y: 600 }, 240, 190, 2);
        const stable = await counts(), age = (await observe(host)).heroAssets.receivers[0].age;
        await h.sleep(800);
        h.check('repeated shared snapshots do not restart the animation or sound', (await counts()).every((n, i) => n === stable[i]) && (await observe(host)).heroAssets.receivers[0].age > age);
        await walk(host, 855); await h.tap(host, 'KeyE');
        for (const p of pages) await until(p, 'pickup releases receiver', `!${active(1)}.active`);
        await capture(host, '05-removed');
        h.check('removal immediately clears the dock identity', (await observe(host)).heroAssets.receivers[0].dock === null);
        h.check('release immediately reports awaiting payload without another confirmation', (await counts()).every((n, i) => n === stable[i]));
        await h.sleep(450); await h.tap(host, 'KeyE');
        for (const p of pages) await until(p, 'same cube can be delivered again', `${active(1)}.active`);
        h.check('a later genuine delivery gets one new confirmation', (await counts()).every((n, i) => n === stable[i] + 1));
        // Partner crosses the empty side of the fixture; the first receiver remains untouched.
        await walk(guest, 700); await h.key(guest, 'KeyD', true); await h.tap(guest, 'Space');
        await until(guest, 'jump over delivered cube', 'customLevel.observe().player.x>880'); await h.key(guest, 'KeyD', false);
        await walk(guest, 1150); await h.key(guest, 'KeyD', true); await h.tap(guest, 'Space');
        await until(guest, 'pass staging cube location', 'customLevel.observe().player.x>1300'); await h.key(guest, 'KeyD', false);
        await walk(guest, 1760); await h.tap(guest, 'KeyE');
        await until(guest, 'partner carries B', 'customLevel.observe().session.sharedCubes["draft:cargoB"].holder===2');
        await walk(guest, 1615); await h.tap(guest, 'KeyE');
        for (const p of pages) await until(p, 'second receiver accepts its own payload', `${active(2)}.active`);
        const secondAge = (await observe(host)).heroAssets.receivers[1].age;
        h.check('receivers keep independent transition clocks', (await observe(host)).heroAssets.receivers[0].age > secondAge + 1);
        await h.tap(host, 'KeyE');
        for (const p of pages) await until(p, 'only receiver one releases', `!${active(1)}.active && ${active(2)}.active`);
        h.check('live release does not latch receiver occupancy or reset its neighbour; exit latch stays separate', (await observe(host)).exitUnlocked && (await observe(host)).heroAssets.receivers[1].age >= secondAge);
        await h.tap(host, 'KeyE'); for (const p of pages) await until(p, 'both receivers restored', `${active(1)}.active && ${active(2)}.active`);
        await guest.send('Page.reload');
        await until(guest, 'reconnected occupied receiver baseline', '!!globalThis.customLevel?.observe().ready && customLevel.observe().session.peers.every(Boolean)');
        await h.sleep(600);
        const restored = await observe(guest);
        h.check('reconnect displays powered idle with no detection replay', restored.heroAssets.receivers.every((r: any) => r.active && r.age === null && r.connection === 1)
            && restored.heroAssets.receivers.every((r: any) => r.dock) && !(restored.audio.played.payloadConfirm ?? 0));
        await host.send('Emulation.setDeviceMetricsOverride', { width: 800, height: 600, deviceScaleFactor: 1, mobile: false });
        await h.sleep(500); await h.shot(host, '08-compact-follow');
        await h.key(host, 'Tab', true); await h.sleep(1100); await h.shot(host, '09-low-zoom');
        const labels = await ink(host);
        h.check('overview retains readable, in-bounds receiver status badges', labels.some(t => t.text === 'PAYLOAD DETECTED') && labels.filter(t => t.text === 'PAYLOAD DETECTED').every(t => t.left >= 0 && t.right <= t.width));
        await h.key(host, 'Tab', false);
        for (const p of pages) { h.check('custom receiver client has no runtime errors', p.errors.length === 0); await p.send('Page.close'); }
    }
    if (modes.includes('editor')) {
        await h.shot(editor!, '10-builder');
        h.check('Level Builder uses the shared awaiting-receiver display', (await ink(editor!)).some(t => t.text === 'AWAITING PAYLOAD'));
        // Explicit diagnostic preview, separate from the physical acceptance route above.
        await editor!.read('workbench.preview("detected")'); await h.sleep(100); await h.shot(editor!, '11-builder-state-preview');
        h.check('stopped State Preview renders the steady detected state', (await ink(editor!)).some(t => t.text === 'PAYLOAD DETECTED'));
        await h.click(editor!, '#play'); await h.click(editor!, '#world');
        await walk(editor!, 800, true);
        h.check('local physics preview also excludes the player from socket occupancy', !(await editor!.read<any>('workbench.observe()')).deviceValues['receiver1.occupied']);
        await h.shot(editor!, '12-builder-physics');
        await h.click(editor!, '#stop');
        h.check('editor has no runtime errors', editor!.errors.length === 0);
    }
    if (modes.includes('campaign')) {
        const a = await h.page(origin, debug), b = await h.page(origin, debug);
        await h.click(a, '#create-party'); const lobby = await h.wait(a, 'campaign party', s => !!s.multiplayer?.code);
        await h.click(b, '#join-code'); await b.send('Input.insertText', { text: lobby.multiplayer!.code }); await h.click(b, '#join-room');
        await h.wait(a, 'campaign partner', s => !!s.multiplayer?.shared?.connected.every(Boolean));
        await h.click(a, '[data-select-level="deadlock"]');
        for (const p of [a, b]) await h.wait(p, 'DEADLOCK overview', s => s.room === 'deadlock' && s.overviewVisible);
        const shot = h.shot;
        h.shot = async (p, name) => {
            await shot(p, name);
            if (name === 'deadlock-stage-06-three-payloads-operator') {
                const s = await h.snapshot(p); captured.push({ name: 'deadlock-three', state: s });
                h.check('DEADLOCK shows three independently occupied receivers', s.heroAssets.receivers.length === 3 && s.heroAssets.receivers.every(r => r.active));
                h.check('all three DEADLOCK payloads have distinct fixed dock poses', s.heroAssets.receivers.every(r => !!r.dock) && new Set(s.heroAssets.receivers.map(r => r.dock!.cube)).size === 3);
                const clip = await p.read(`(()=>{const c=binaryNinja.renderer.camera,r=binaryNinja.canvas.getBoundingClientRect();return {x:(930-c.originX())*c.zoom+r.x,y:(915-c.originY())*c.zoom+r.y,width:640*c.zoom,height:190*c.zoom,scale:1}})()`);
                const image = await p.send('Page.captureScreenshot', { format: 'png', clip });
                await writeFile(join(reports, '06-deadlock-three-detail.png'), Buffer.from(image.data, 'base64'));
                await h.key(p, 'Tab', true); await h.sleep(900); await shot(p, 'deadlock-three-overview');
                await p.send('Emulation.setDeviceMetricsOverride', { width: 800, height: 600, deviceScaleFactor: 1, mobile: false });
                await h.sleep(900); await shot(p, 'deadlock-three-compact');
                await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
                await h.key(p, 'Tab', false); await h.sleep(900);
            }
        };
        await campaignDraftRoute(h, 'deadlock', [a, b]); h.shot = shot;
        for (const p of [a, b]) h.check('DEADLOCK still finishes with all receivers live and both players arrived', (await h.snapshot(p)).heroAssets.receivers.every(r => r.active) && !!(await h.snapshot(p)).multiplayer!.completed);
    }
    pass = true;
} catch (e) { error = String(e); throw e; }
finally {
    await writeFile(join(reports, `report-${modes.join('-')}.json`), JSON.stringify({ pass, modes, checks: h.checks, captured, error }, null, 2));
    host?.socket.close(); root?.socket.close(); await h.cleanup();
}
