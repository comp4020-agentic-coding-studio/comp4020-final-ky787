/** Assemble an accessible gallery from actual input-driven browser captures. */
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { coopBrowser } from './coop-browser.ts';

const source = resolve(process.env.BN_SHOTS ?? '.workbench/reports/2026-10-16-payload-energy');
const target = resolve('docs/playtest/2026-10-16-payload-energy');
const cards = [
    ['00-free-purple-detail', '01 / FREE ENERGY PAYLOAD', 'Violet frame, lavender highlights and a continuous layered heartbeat.'],
    ['02-approaching-detail', '02 / CARRIED ENERGY', 'Purple energy follows the actual 44-unit body.'],
    ['01-empty-detail', '03 / AWAITING PAYLOAD', 'A grounded player leaves the compact receiver amber.'],
    ['03-detection-detail', '04 / CONNECTION SURGE', 'Accepted contact: the purple payload begins a 680 ms transition to green.'],
    ['04-docked-closeup-detail', '05 / GREEN POWERED IDLE', 'Branching traces connect to open terminals; cargo remains removable.'],
    ['05-removed-detail', '06 / LIVE RELEASE', 'Purple returns immediately. Receiver circuitry shuts down to amber.'],
    ['07-receiver-versus-plate-detail', '07 / DISTINCT SENSOR TYPES', 'The ordinary pressure plate continues accepting players.'],
    ['06-deadlock-three-detail', '08 / DEADLOCK — THREE GREEN PAYLOADS', 'Authored-start physical solve, including the final hatch catch.'],
    ['08-compact-follow', '09 / COMPACT VIEWPORT', '800 × 600 client. Colour, frame shape and status text work together.'],
    ['deadlock-three-compact', '10 / SHAFT OVERVIEW', 'Three green cargo interfaces remain distinct from static architecture.'],
    ['10-builder', '11 / LEVEL BUILDER', 'The same renderer is used in the editor and physics preview.'],
    ['13-reduced-motion-detail', '12 / REDUCED MOTION', 'A live OS preference change settles a clear, static green state.'],
];
await mkdir(target, { recursive: true });
for (const [file] of cards) await copyFile(join(source, `${file}.png`), join(target, `${file}.png`));
// Fixed crop of the actual canvas recording; no synthetic drawing or gameplay edits.
execFileSync('ffmpeg', ['-y', '-i', join(source, 'energy-cycle.webm'), '-vf', 'crop=640:260:560:400',
    '-c:v', 'libvpx-vp9', '-crf', '26', '-b:v', '0', '-deadline', 'good', '-cpu-used', '4', '-an', join(target, 'energy-cycle.webm')], { stdio: 'ignore' });
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Binary Ninja — Energy Payload</title>
<style>*{box-sizing:border-box}body{margin:0;padding:30px;background:#0c131a;color:#e2edf1;font:13px ui-monospace,monospace}
h1{margin:0 0 9px;font-size:25px;letter-spacing:2px}header p{color:#9bb0ba;line-height:1.6;margin:0 0 24px}
main,.comparison{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px}figure{grid-column:span 2;margin:0;background:#101c25;border:1px solid #344954}
main figure:nth-child(7),main figure:nth-child(8){grid-column:span 3}main figure:nth-child(n+9){grid-column:span 3}
img{display:block;width:100%;height:240px;object-fit:contain;background:#0c131a}main figure:nth-child(n+9) img{height:350px}
figcaption{padding:12px 14px;border-top:1px solid #344954;line-height:1.5}strong{font-size:11px;letter-spacing:.5px;color:#bcffb2}p{margin:5px 0 0;color:#9bb0ba;font-size:11px}
a{color:inherit}figure a{text-decoration:none}footer{margin-top:20px;color:#9bb0ba;font-size:11px;line-height:1.7}
.recording{margin:0 0 20px;max-width:820px}video{width:100%;aspect-ratio:32/13;object-fit:contain;display:block;background:#0c131a}.comparison{margin-top:20px}.comparison figure{grid-column:span 3}
@media(max-width:700px){body{padding:12px}main,.comparison{display:block}figure{margin-bottom:14px}h1{font-size:20px}}</style>
<header><h1>PURPLE RESOURCE / GREEN CONNECTION</h1><p>BINARY NINJA / ANIMATED ENERGY PAYLOAD · 16 OCTOBER 2026<br>Actual production-mode browser captures. Public custom multiplayer + full DEADLOCK physical solve. No gameplay-state injection.</p></header>
<figure class="recording"><video controls muted playsinline preload="metadata" poster="04-docked-closeup-detail.png" src="energy-cycle.webm"></video><figcaption><strong>17 SECOND CONTINUOUS BROWSER RECORDING</strong><p>Free heartbeat → carried purple → docking surge → green powered heartbeat → purple removal. Fixed crop of the game canvas, normal speed. Playback is opt-in; no autoplay.</p></figcaption></figure>
<main>${cards.map(([file, title, description]) => `<figure><a href="${file}.png"><img src="${file}.png" alt="${title}"></a><figcaption><strong>${title}</strong><p>${description}</p></figcaption></figure>`).join('')}</main>
<section class="comparison" aria-label="Previous and revised receiver comparison"><figure><img src="../2026-10-16-payload-interface/04-docked-closeup-detail.png" alt="Previous cyan receiver"><figcaption><strong>PREVIOUS / CYAN</strong><p>Committed 5f3e815 asset. The compact shape and canonical alignment are retained.</p></figcaption></figure><figure><img src="04-docked-closeup-detail.png" alt="Revised green receiver"><figcaption><strong>REVISED / ELECTRIC GREEN</strong><p>Stronger colour separation, layered energy contours and branching circuit traces.</p></figcaption></figure></section>
<footer>Purple = movable payload · Amber = awaiting cargo · Green = connected power source<br>Exact 44-unit body, 94-unit receiver and existing docking safety checks. Live occupancy controls power; animation never delays it. Local clocks do not need network synchronization. Reconnect opens silently in powered idle.<br>Reduced motion removes energy movement and settles colours immediately. These are automated visual captures, not human playtesting.</footer>`;
await writeFile(join(target, 'index.html'), html);
const h = await coopBrowser({ shots: target });
try {
    const origin = await h.startServer(), debug = await h.launch(), p = await h.page(origin, debug);
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 600, deviceScaleFactor: 1, mobile: false });
    await p.send('Page.navigate', { url: pathToFileURL(join(target, 'index.html')).href });
    const loaded = 'document.images.length===14 && [...document.images].every(i=>i.complete&&i.naturalWidth>0)';
    for (let i = 0; i < 100 && !await p.read(loaded); i++) await h.sleep(30);
    const height = await p.read<number>('Math.ceil(document.body.getBoundingClientRect().height)');
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1400, height, deviceScaleFactor: 1, mobile: false });
    await h.shot(p, 'gallery');
    h.check('gallery uses actual browser captures and preserves the cyan comparison', await p.read(loaded));
    h.check('recording loads and never autoplays', await p.read('document.querySelector("video").readyState>=1 && !document.querySelector("video").autoplay'));
} finally { await h.cleanup(); }
