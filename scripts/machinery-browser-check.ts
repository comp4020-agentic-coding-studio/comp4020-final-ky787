/** Real-input production-browser visual review; no occupancy or transform injection. */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Cdp, coopBrowser } from './coop-browser.ts';
import { machineryReview } from './fixtures/machinery-review.ts';
import { serializeDraft } from '../src/workbench/model.ts';
import { requirePlayable } from '../src/workbench/validation.ts';
import { startEnergyRecording as startRecording, stopEnergyRecording as stopRecording, sampleEnergyCycle } from './energy-browser-review.ts';

const baseline = process.argv.includes('baseline');
const reports = resolve(process.env.BN_SHOTS ?? '.workbench/reports/2026-10-17-pressure-lift');
await mkdir(reports, { recursive: true });
const path = join(reports, 'machinery-review.json'); await writeFile(path, serializeDraft(requirePlayable(machineryReview())));
const h = await coopBrowser({ shots: reports, internalLabs: false, readyExpression: '!!(globalThis.workbench?.ready || globalThis.customLevel?.observe().ready)' });
let root: Cdp | undefined, host: Cdp | undefined, guest: Cdp | undefined;
let pass = false, error: string | undefined;
const captured: { name: string; state: unknown }[] = [];
const observe = (p: Cdp) => p.read<any>('customLevel.observe()');
async function until(p: Cdp, label: string, expression: string, timeout = 12000) {
    const end = Date.now() + timeout;
    do { if (p.errors.length) throw new Error(p.errors.join('\n')); if (await p.read<boolean>(expression)) return; await h.sleep(15); } while (Date.now() < end);
    throw new Error(`Timeout ${label}: ${expression}`);
}
async function walk(p: Cdp, x: number) {
    const right = (await observe(p)).player.x < x, code = right ? 'KeyD' : 'KeyA'; await h.key(p, code, true);
    try { await until(p, `walk to ${x}`, `customLevel.observe().player.x ${right ? '>=' : '<='} ${x}`); }
    finally { await h.key(p, code, false); } await h.sleep(160);
}
async function capture(p: Cdp, name: string, x: number, y: number, width = 500, height = 300, scale = 1) {
    captured.push({ name, state: await observe(p) });
    await h.shot(p, name);
    const clip = await p.read(`(()=>{const r=document.querySelector('canvas').getBoundingClientRect(),c=customLevel.observe().camera;
        return {x:Math.max(0,Math.min(innerWidth-${width},(${x}-c.x)*c.zoom+r.x-${width}/2)),
            y:Math.max(0,Math.min(innerHeight-${height},(${y}-c.y)*c.zoom+r.y-${height}*.65)),width:${width},height:${height},scale:${scale}}})()`);
    const image = await p.send('Page.captureScreenshot', { format: 'png', clip });
    await writeFile(join(reports, `${name}-detail.png`), Buffer.from(image.data, 'base64'));
}
const pad = (id = 'feed') => `customLevel.observe().heroAssets.pads.find(p=>p.id==='draft:${id}')`;
const lift = (id = 'lift') => `customLevel.observe().heroAssets.lifts.find(p=>p.id==='${id}')`;
async function leavePad(p: Cdp) {
    await h.key(p, 'KeyA', true);
    try { await until(p, 'contact released by walking', `!${pad()}.active`); } finally { await h.key(p, 'KeyA', false); }
}
async function jumpTo(p: Cdp, x: number, ground: string) {
    await h.key(p, 'KeyD', true); await h.key(p, 'Space', true);
    try { await until(p, 'jump across to footing', `customLevel.observe().player.x>=${x}`); }
    finally { await h.key(p, 'KeyD', false); await h.key(p, 'Space', false); }
    await until(p, `landing on ${ground}`, `customLevel.observe().player.groundId==='${ground}'`);
}
async function frameTimes(p: Cdp) {
    return p.read<number[]>(`new Promise(resolve=>{const times=[];let last=performance.now();
        function sample(now){times.push(now-last);last=now;if(times.length<180)requestAnimationFrame(sample);else resolve(times.slice(10).sort((a,b)=>a-b))}requestAnimationFrame(sample)})`);
}
async function pixels(p: Cdp, x: number, y: number, w: number, h: number) {
    return p.read<number>(`(()=>{const s=customLevel.observe(),c=document.querySelector('canvas'),ratio=c.width/c.getBoundingClientRect().width,
        data=c.getContext('2d').getImageData((${x}-s.camera.x)*s.camera.zoom*ratio,(${y}-s.camera.y)*s.camera.zoom*ratio,${w}*s.camera.zoom*ratio,${h}*s.camera.zoom*ratio).data;
        let hash=2166136261;for(let i=0;i<data.length;i++)hash=Math.imul(hash^data[i],16777619);return hash>>>0})()`);
}
try {
    const origin = await h.startServer(), debug = await h.launch(); root = await new Cdp(debug).open();
    const editor = await h.page(`${origin}workbench.html`, debug);
    const { root: dom } = await editor.send('DOM.getDocument'), { nodeId } = await editor.send('DOM.querySelector', { nodeId: dom.nodeId, selector: '#json-file' });
    await editor.send('DOM.setFileInputFiles', { nodeId, files: [path] });
    await until(editor, 'import', 'workbench.snapshot().document.id==="pressure-lift-art-review" && workbench.snapshot().playable && !!workbench.snapshot().draftId');
    const before = new Set((await root.send('Target.getTargets')).targetInfos.map((t: any) => t.targetId));
    await h.click(editor, '#coop'); let target: any;
    for (let n = 0; n < 200 && !target; n++) { target = (await root.send('Target.getTargets')).targetInfos.find((t: any) => !before.has(t.targetId) && t.url.includes('custom-level.html')); if (!target) await h.sleep(30); }
    if (!target) throw new Error('Missing public custom host');
    host = await new Cdp(`${new URL(debug).origin}/devtools/page/${target.targetId}`).open();
    await host.send('Runtime.enable'); await host.send('Page.enable');
    await host.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
    await host.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await until(host, 'host', '!!globalThis.customLevel?.observe().ready');
    const code = (await observe(host)).session.code;
    guest = await h.page(`${origin}custom-level.html?code=${code}&mode=test`, debug);
    const pages = [host, guest];
    await until(host, 'partner', 'customLevel.observe().session.peers.every(Boolean)');
    await walk(host, 550); await capture(host, baseline ? 'before-pad-empty' : '01-pad-empty', 650, 700, 340, 220, 2);
    if (!baseline) {
        await capture(host, '08-lift-inactive', 1200, 510, 580, 660);
        await startRecording(host);
        await h.sleep(700);
        await h.key(host, 'KeyD', true);
        try { await until(host, 'accepted pad edge', `${pad()}.active`); } finally { await h.key(host, 'KeyD', false); }
        await capture(host, '02-pad-activation', 650, 700, 340, 220, 2);
        await capture(host, '09-lift-startup', 1200, 510, 580, 660);
    }
    await walk(host, 650); await h.sleep(1000);
    await capture(host, baseline ? 'before-pad-held' : '03-pad-held', 650, 700, 340, 220, 2);
    await capture(host, baseline ? 'before-lift-powered' : '10-lift-powered', 1200, 510, 580, 660);
    h.check('player contact powers the accepted lift output on both clients', (await observe(host)).signals['draft:feedPower'] && (await observe(guest)).signals['draft:feedPower']);
    if (!baseline) {
        const heldAge = (await observe(host)).heroAssets.pads[0].age;
        const beforeAudio = (await observe(host)).audio.played;
        await h.sleep(2700);
        h.check('accepted held snapshots do not replay compression or power sounds', (await observe(host)).heroAssets.pads[0].age > heldAge + 2
            && (await observe(host)).audio.played.plate === beforeAudio.plate && (await observe(host)).audio.played.liftPower === beforeAudio.liftPower);
        await leavePad(host); await capture(host, '06-pad-release', 650, 700, 340, 220, 2);
        await capture(host, '14-lift-shutdown', 1200, 510, 580, 660);
        await h.sleep(500); await stopRecording(host, join(reports, 'pad-cycle.webm'));
        for (const p of pages) h.check('release clears pad and lift power without a latch', !(await observe(p)).plates['draft:feed'] && !(await observe(p)).signals['draft:feedPower']);
        await walk(host, 890); await h.tap(host, 'KeyE');
        await until(host, 'payload pickup', 'customLevel.observe().session.sharedCubes["draft:cargoA"].holder===1');
        await walk(host, 725); await h.tap(host, 'KeyE');
        for (const p of pages) await until(p, 'resting cube powers ordinary pad', `${pad()}.active && !customLevel.observe().cubes['draft:cargoA'].carried`);
        await h.sleep(450); await capture(host, '04-cube-held-pad', 740, 700, 530, 270, 2);
        await capture(host, '07-pad-versus-receiver', 750, 700, 530, 270, 2);
        const purple = await sampleEnergyCycle(host);
        h.check('normal pad holds a continuously purple cube, with no receiver dock or green activation', purple.every(s => s.purple > 50 && !s.green)
            && (await observe(host)).heroAssets.receivers.every((r: any) => !r.active && !r.dock));
        captured.push({ name: 'purple-on-pad-cycle', state: purple });
        // A fresh client must baseline accepted powered machinery, not replay startup.
        await host.send('Page.reload'); await until(host, 'restored custom session and first render', '!!globalThis.customLevel?.observe().ready && customLevel.observe().session.peers.every(Boolean) && customLevel.observe().heroAssets.pads.length===2');
        const restored = await observe(host);
        h.check('reconnect restores depressed pad and powered lift without startup or sound', restored.heroAssets.pads[0].age === null
            && restored.heroAssets.pads[0].depression === 1 && restored.heroAssets.lifts[0].illumination === 1 && restored.heroAssets.lifts[0].age === null
            && !(restored.audio.played.plate ?? 0) && !(restored.audio.played.liftPower ?? 0));
        await walk(host, 550); await jumpTo(host, 780, 'floor');
        await walk(host, 1020); await startRecording(host); await walk(host, 1200);
        await until(host, 'real upward player transport', 'customLevel.observe().player.y<480');
        await capture(host, '11-player-in-lift', 1200, 510, 580, 660);
        await until(host, 'existing upper hover', 'customLevel.observe().player.y<145'); await h.sleep(500);
        await capture(host, '13-upper-stabilization', 1200, 160, 500, 300, 1.5);
        await walk(host, 1410); await until(host, 'upper refuge landing', 'customLevel.observe().player.groundId==="upper"');
        await stopRecording(host, join(reports, 'lift-player-cycle.webm'));
        // Guest carries the second cube into the live field; no cube transform injection.
        await walk(guest, 550); await jumpTo(guest, 780, 'floor');
        await walk(guest, 1000); await h.key(guest, 'KeyD', true);
        try { await until(guest, 'exit live shaft to right', 'customLevel.observe().player.x>1400'); } finally { await h.key(guest, 'KeyD', false); }
        await until(guest, 'lower floor', 'customLevel.observe().player.groundId==="floor"');
        await walk(guest, 1460); await h.tap(guest, 'KeyE');
        await until(guest, 'second cargo pickup', 'customLevel.observe().session.sharedCubes["draft:cargoB"].holder===2');
        await walk(guest, 1275); await h.tap(guest, 'KeyE');
        await until(guest, 'loose cargo rising', '!customLevel.observe().cubes["draft:cargoB"].carried && customLevel.observe().cubes["draft:cargoB"].y<550');
        await capture(guest, '12-purple-cargo-in-lift', 1200, 510, 580, 660);
        await until(guest, 'cargo hover', 'customLevel.observe().cubes["draft:cargoB"].y<150');
        await h.key(guest, 'Tab', true); await h.sleep(900); await h.shot(guest, '16-low-zoom');
        const times = await frameTimes(guest); captured.push({ name: 'overview-frame-ms', state: { median: times[Math.floor(times.length * .5)], p95: times[Math.floor(times.length * .95)] } });
        h.check('two active clients maintain bounded overview rendering', times[Math.floor(times.length * .95)] < 50);
        await guest.send('Emulation.setDeviceMetricsOverride', { width: 800, height: 600, deviceScaleFactor: 1, mobile: false });
        await h.sleep(900); await h.shot(guest, '17-compact-overview');
        await guest.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
        await h.key(guest, 'Tab', false); await h.sleep(900);
        // Return the guest to a stationary view of the column for actual pixel checks.
        await walk(guest, 1000); await until(guest, 'floor outside shaft', 'customLevel.observe().player.groundId==="floor"');
        await guest.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
        // The follow camera's velocity lead settles more slowly than the body.
        // Pixel equality must not mistake subpixel camera drift for energy motion.
        await h.sleep(5500); const still = await pixels(guest, 1100, 260, 150, 140), cameraBefore = (await observe(guest)).camera; await h.sleep(700);
        const stillAfter = await pixels(guest, 1100, 260, 150, 140);
        captured.push({ name: 'reduced-motion-pixels', state: { before: still, after: stillAfter, cameraBefore, cameraAfter: (await observe(guest)).camera,
            reducedMotion: await guest.read('matchMedia("(prefers-reduced-motion: reduce)").matches') } });
        h.check('OS reduced motion freezes lift energy while leaving physical power active', still === stillAfter
            && (await observe(guest)).signals['draft:feedPower']);
        await h.shot(guest, '18-reduced-motion');
        await guest.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
        await h.sleep(250); const moving = await pixels(guest, 1100, 260, 150, 140); await h.sleep(700);
        h.check('normal motion resumes flowing energy in actual rendered pixels', moving !== await pixels(guest, 1100, 260, 150, 140));
        // Approach the measured body, not a guessed drop coordinate. This is an
        // ordinary pad: picking up its cube while standing on it still supplies weight.
        await walk(guest, (await observe(guest)).cubes['draft:cargoA'].x + 65);
        await startRecording(guest); await h.tap(guest, 'KeyE');
        captured.push({ name: 'removal-pickup', state: await observe(guest) });
        await until(guest, 'removal pickup accepted', 'customLevel.observe().session.sharedCubes["draft:cargoA"].holder===2');
        h.check('a player replacing the picked-up cube keeps ordinary pressure active', (await observe(guest)).heroAssets.pads[0].active);
        await leavePad(guest);
        await until(guest, 'cube removal releases contact', `!${pad()}.active`);
        await capture(guest, '15-cargo-power-loss', 1200, 510, 580, 660);
        await until(guest, 'cargo falls back safely after immediate power loss', 'customLevel.observe().cubes["draft:cargoB"].grounded && customLevel.observe().cubes["draft:cargoB"].y>650');
        h.check('removing both weights releases the pad and cargo falls with no visual grace period', !(await observe(guest)).signals['draft:feedPower']);
        await h.sleep(450); await stopRecording(guest, join(reports, 'lift-shutdown-cycle.webm'));
        // Drop from the upper refuge onto real unstable footing and let its fuse expire.
        await walk(host, 1870); await until(host, 'landing on unstable footing', 'customLevel.observe().player.groundId==="operator"');
        for (const p of pages) await until(p, 'unstable pad contact accepted', `${pad('unstable')}.active`);
        await capture(host, '19-unstable-pad-held', 1870, 520, 580, 330, 1.5);
        await capture(host, '20-wide-lift', 2190, 530, 560, 500);
        await until(host, 'physical platform collapse', '!customLevel.observe().platforms.find(p=>p.id==="operator").enabled', 10000);
        for (const p of pages) await until(p, 'collapse releases accepted circuit', `!${pad('unstable')}.active && !${pad('unstable')}.supported && !${lift('wide')}.enabled`);
        await capture(host, '21-unstable-pad-collapsed', 1870, 520, 580, 330, 1.5);
        h.check('collapse ghosts unsupported pad and removes route power on both clients', (await observe(host)).heroAssets.pads[1].supported === false);
        await until(host, 'footing respawns without relatching', 'customLevel.observe().platforms.find(p=>p.id==="operator").enabled', 5000);
        h.check('respawn restores inactive pad without fake contact', !(await observe(host)).heroAssets.pads[1].active);
        // Explicit State Preview diagnostic plus real one-player walking in the editor.
        await editor.read('workbench.preview("powered")'); await h.sleep(150); await h.shot(editor, '22-builder-state-preview');
        h.check('editor preview shares the declarative lift outputs', await editor.read('workbench.observe().outputs.feedPower && workbench.observe().outputs.temporaryPower'));
        await h.click(editor, '#play'); await h.click(editor, '#world'); await h.key(editor, 'KeyD', true);
        try { await until(editor, 'local walking contact', 'workbench.observe().deviceValues["feed.occupied"]'); } finally { await h.key(editor, 'KeyD', false); }
        await h.sleep(500); await h.shot(editor, '23-builder-physics');
        h.check('single-player editor physics shares live pad and lift power', await editor.read('workbench.observe().outputs.feedPower'));
        await h.click(editor, '#stop');
        for (const p of [...pages, editor]) h.check('no browser runtime errors', p.errors.length === 0);
    }
    pass = true;
} catch (e) {
    error = String(e); for (const [slot, p] of [host, guest].entries()) if (p) { await h.shot(p, `failure-${slot + 1}`).catch(() => {}); captured.push({ name: `failure-${slot + 1}`, state: await observe(p).catch(() => null) }); } throw e;
} finally {
    await writeFile(join(reports, baseline ? 'baseline.json' : 'report.json'), JSON.stringify({ pass, checks: h.checks, captured, error }, null, 2));
    host?.socket.close(); root?.socket.close(); await h.cleanup();
}
