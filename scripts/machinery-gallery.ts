/** Publish selected real production-browser captures; no alternative art renderer. */
import { copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { coopBrowser } from './coop-browser.ts';

const source = resolve(process.env.BN_SHOTS ?? '.workbench/reports/2026-10-17-pressure-lift');
const target = resolve('docs/playtest/2026-10-17-pressure-lift');
const cards = [
    ['01-pad-empty-detail', 'AMBER / RAISED', 'Recessed base, beveled tread and exposed suspension.'],
    ['02-pad-activation-detail', 'CONTACT / COMPRESSING', 'Accepted contact starts 140 ms of cosmetic travel.'],
    ['03-pad-held-detail', 'PLAYER / HELD', 'Depressed top and illuminated cyan-blue traces.'],
    ['04-cube-held-pad-detail', 'CUBE / STILL PURPLE', 'A resting cube supplies weight without becoming a green docked payload.'],
    ['06-pad-release-detail', 'RELEASE / LIVE POWER', 'The tread rises and amber returns as contact ends.'],
    ['07-pad-versus-receiver-detail', 'TWO DISTINCT INPUTS', 'Flat weight-sensitive button beside the upright cube-only cargo interface.'],
    ['19-unstable-pad-held-detail', 'UNSTABLE / INTACT', 'Real player contact powers the route while the footing crumbles.'],
    ['21-unstable-pad-collapsed-detail', 'UNSTABLE / COLLAPSED', 'Accepted power releases; the unsupported pad becomes a faint outline.'],
    ['08-lift-inactive-detail', 'LIFT / SIGNAL OFF', 'A compact emitter and faint guide circuitry remain visible.'],
    ['09-lift-startup-detail', 'LIFT / STARTUP', 'A blue pulse climbs the column. Physical power is already active.'],
    ['10-lift-powered-detail', 'LIFT / POWERED', 'Transparent ribbons, upward flecks and a clear central transport area.'],
    ['11-player-in-lift-detail', 'PLAYER / TRANSPORT', 'The character remains legible inside the flowing field.'],
    ['12-purple-cargo-in-lift-detail', 'CARGO / TRANSPORT', 'Actual loose cube transport with its purple energy intact.'],
    ['13-upper-stabilization-detail', 'UPPER / HOVER', 'An open convergence arc marks the existing soft hover region.'],
    ['15-cargo-power-loss-detail', 'POWER LOSS / FALL', 'The field fades; physics loses power immediately.'],
    ['20-wide-lift-detail', 'WIDE / SHORT COLUMN', 'The same bounded asset scales to a broad transport field.'],
    ['16-low-zoom', 'LOW ZOOM / OVERVIEW', 'Sparse detail retains distinct controls, cargo and transport.'],
    ['17-compact-overview', 'COMPACT / 800 × 600', 'Overview on a smaller client viewport.'],
    ['22-builder-state-preview', 'BUILDER / STATE PREVIEW', 'Explicit diagnostic preview using the shared production renderer.'],
    ['23-builder-physics', 'BUILDER / REAL CONTACT', 'Single-player keyboard walking powers the same machinery.'],
    ['machinery-deadlock-tall', 'DEADLOCK / FULL HEIGHT', 'The unchanged authored-start route before the final operator handoff.'],
    ['machinery-deadlock-compact', 'DEADLOCK / COMPACT OVERVIEW', 'Tall shaft, two operators and the staged final payload.'],
];
await mkdir(target, { recursive: true });
const campaignFiles = await readdir(join(source, 'campaign'));
for (const [file] of cards) {
    const campaign = file.startsWith('machinery-deadlock');
    const sourceFile = campaign ? campaignFiles.find(f => f === `${file}.png` || f === `full-${file}.png`) : `${file}.png`;
    if (!sourceFile) throw new Error(`Missing real campaign capture: ${file}`);
    await copyFile(join(source, campaign ? 'campaign' : '', sourceFile), join(target, `${file}.png`));
}
for (const file of ['before-pad-empty-detail', 'before-pad-held-detail', 'before-lift-powered']) await copyFile(join(source, `${file}.png`), join(target, `${file}.png`));
// Normal-speed crops/resizes of actual canvas recordings, retaining their time axis.
const recordings = [
    ['pad-cycle', 'crop=620:233:470:480', 'PRESS / HOLD / RELEASE', 'A complete pad cycle and sustained powered animation, from actual walking contact.', '03-pad-held-detail'],
    ['lift-cycle', 'crop=360:700:1000:0', 'STARTUP / FLOW / SHUTDOWN', 'A complete lift power cycle from the same accepted pressure-pad contact.', '10-lift-powered-detail'],
    ['lift-player-cycle', 'scale=960:-2', 'LIFT / PLAYER ASCENT', 'Real transport from entry through the upper hover region.', '11-player-in-lift-detail'],
    ['lift-shutdown-cycle', 'scale=960:-2', 'LIFT / POWER LOSS', 'Removing both weights ends lift power and the free cargo falls.', '15-cargo-power-loss-detail'],
    ['machinery-deadlock-handoff', 'scale=960:-2', 'DEADLOCK / MANUAL CATCH', 'Full-room solution: FEED release, personnel relay travel, manual HATCH catch.', 'machinery-deadlock-tall'],
];
for (const [name, filter] of recordings) execFileSync('ffmpeg', ['-y', '-i', join(source, name.startsWith('machinery-deadlock') ? 'campaign' : '', `${name === 'lift-cycle' ? 'pad-cycle' : name}.webm`),
    '-vf', filter, '-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0', '-deadline', 'good', '-cpu-used', '4', '-an', join(target, `${name}.webm`)], { stdio: 'ignore' });
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Binary Ninja — Pressure + Gravity</title>
<style>*{box-sizing:border-box}body{margin:0;padding:28px;background:#0c131a;color:#e2edf1;font:13px ui-monospace,monospace}h1{font-size:26px;letter-spacing:2px;margin:0 0 12px}header p,footer{color:#9bb0ba;line-height:1.7}
main,.videos,.compare{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:22px 0}figure{margin:0;border:1px solid #344954;background:#101c25}img{width:100%;height:300px;object-fit:contain;display:block;background:#0c131a}main figure:nth-child(n+9):nth-child(-n+16) img{height:420px}main figure:nth-child(n+17) img{height:350px}video{width:100%;height:300px;background:#0c131a;display:block}figcaption{border-top:1px solid #344954;padding:12px 14px;line-height:1.6}strong{font-size:12px;color:#77e8ff}p{margin:4px 0 0;font-size:12px;color:#9bb0ba}a{color:inherit}footer{font-size:11px;margin-top:20px}@media(max-width:700px){body{padding:12px}main,.videos,.compare{display:block}figure{margin-bottom:16px}h1{font-size:20px}}</style>
<header><h1>LIVE CONTACT / UPWARD ENERGY</h1><p>BINARY NINJA · PRESSURE PAD + GRAVITY LIFT · 17 OCTOBER 2026<br>Production browser captures: real public custom multiplayer input, editor physics and the full DEADLOCK solution.<br>Compact electronic machinery. Existing physics, controller logic, payload art and level geometry preserved.</p></header>
<section class="videos" aria-label="Opt-in animation recordings">${recordings.map(([name, , title, detail, poster]) => `<figure><video controls muted playsinline preload="metadata" poster="${poster}.png" src="${name}.webm"></video><figcaption><strong>${title}</strong><p>${detail} Normal speed; playback is opt-in.</p></figcaption></figure>`).join('')}</section>
<section class="compare" aria-label="Before and after"><figure><img src="before-pad-held-detail.png" alt="Previous flat pressure strip"><figcaption><strong>BEFORE / PRESSURE STRIP</strong><p>Production baseline c6dcb35.</p></figcaption></figure><figure><img src="03-pad-held-detail.png" alt="New depressed pressure pad"><figcaption><strong>AFTER / PRESSURE PAD</strong><p>A layered, compressible button with sequenced circuitry.</p></figcaption></figure><figure><img src="before-lift-powered.png" alt="Previous dashed lift field"><figcaption><strong>BEFORE / TRANSPORT FIELD</strong><p>Rectangular dashed boundary and repeated line/glyph pattern.</p></figcaption></figure><figure><img src="10-lift-powered-detail.png" alt="New blue energy column"><figcaption><strong>AFTER / ENERGY COLUMN</strong><p>Transparent flowing ribbons, guide nodes and upper convergence.</p></figcaption></figure></section>
<main>${cards.map(([file, title, detail]) => `<figure><a href="${file}.png"><img src="${file}.png" alt="${title}"></a><figcaption><strong>${title}</strong><p>${detail}</p></figcaption></figure>`).join('')}</main>
<footer>Amber = unpressed · Cyan-blue = live contact · Blue = upward transport · Purple cube = movable energy · Green cube = connected receiver<br>Reduced motion settles these states and freezes nonessential flow. Clocks are local, not synchronized or persisted. Reconnect opens in stable powered idle.<br>At distant overview scale, silhouettes and lighting carry the meaning; detail and small text are intended for the local camera.<br>Automated browser review is not human playtesting. <a href="../../pressure-and-gravity.md">Implementation and validation notes</a>.</footer>`;
await writeFile(join(target, 'index.html'), html);
const h = await coopBrowser({ shots: target });
try {
    const origin = await h.startServer(), debug = await h.launch(), p = await h.page(origin, debug);
    await p.send('Page.navigate', { url: pathToFileURL(join(target, 'index.html')).href });
    const loaded = `document.images.length===${cards.length + 4} && [...document.images].every(i=>i.complete&&i.naturalWidth>0)`;
    for (let i = 0; i < 100 && !await p.read(loaded); i++) await h.sleep(30);
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
    // Decode the first frames for the review screenshot without starting playback.
    await p.read('[...document.querySelectorAll("video")].forEach(v=>{v.preload="auto";v.load()})');
    for (let i = 0; i < 100 && !await p.read('[...document.querySelectorAll("video")].every(v=>v.readyState>=2)'); i++) await h.sleep(30);
    h.check('browser gallery loads all real captures and before/after comparisons', await p.read(loaded));
    h.check('all five animation recordings load without autoplay', await p.read('document.querySelectorAll("video").length===5 && [...document.querySelectorAll("video")].every(v=>v.readyState>=1&&!v.autoplay)'));
    await h.click(p, 'video');
    const playback = await p.read<boolean>(`(async()=>{for(const v of document.querySelectorAll('video')){v.currentTime=0;await v.play();
        await new Promise(r=>setTimeout(r,350));const advanced=v.currentTime>.15;v.pause();if(!advanced)return false;}return true})()`);
    h.check('all five recordings actually advance after explicit playback', playback);
    // The gallery thumbnail shows the before/after assets, not browser-specific
    // native video controls. The interactive page keeps the recordings at its top.
    await p.read('document.querySelector(".compare").scrollIntoView()');
    await h.sleep(300); await h.shot(p, 'gallery');
} finally { await h.cleanup(); }
