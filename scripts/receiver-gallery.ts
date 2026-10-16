/** Assemble a browser gallery from actual input-driven browser captures. */
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { coopBrowser } from './coop-browser.ts';

const source = resolve(process.env.BN_SHOTS ?? '.workbench/reports/2026-10-16-payload-interface');
const target = resolve('docs/playtest/2026-10-16-payload-interface');
const cards = [
    ['01-empty-detail', '01 / AWAITING PAYLOAD', 'A grounded player leaves the receiver amber.'],
    ['02-approaching-detail', '02 / CUBE APPROACHING', 'Carried cargo has not activated the receiver.'],
    ['03-detection-detail', '03 / ACCEPTED DETECTION', 'Circuit traces connect to the centred payload frame.'],
    ['04-docked-closeup-detail', '04 / DOCKED ENERGY CORE', 'Steady cyan circuitry; the cube stays visible and removable.'],
    ['05-removed-detail', '05 / PAYLOAD REMOVED', 'Release begins immediately; status returns to amber.'],
    ['07-receiver-versus-plate-detail', '06 / DISTINCT SENSOR TYPES', 'The low pressure plate accepts the standing player.'],
    ['06-deadlock-three-detail', '07 / DEADLOCK — THREE DELIVERIES', 'Actual authored-start solve. Three independent centred payloads.'],
    ['08-compact-follow', '08 / COMPACT VIEWPORT', '800 × 600 client; readable anchored status.'],
    ['deadlock-three-compact', '09 / SHAFT OVERVIEW', 'Individual status badges use separate lanes at low zoom.'],
    ['10-builder', '10 / LEVEL BUILDER', 'The same Canvas renderer draws editable socket objects.'],
];
await mkdir(target, { recursive: true });
for (const [file] of cards) await copyFile(join(source, `${file}.png`), join(target, `${file}.png`));
const html = `<!doctype html><meta charset="utf-8"><title>Binary Ninja — Payload Receiver</title>
<style>*{box-sizing:border-box}body{margin:0;padding:30px;background:#0c131a;color:#e2edf1;font:13px ui-monospace,monospace}
h1{margin:0 0 9px;font-size:25px;letter-spacing:2px}header p{color:#9bb0ba;line-height:1.6;margin:0 0 24px}
main{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px}figure{grid-column:span 2;margin:0;background:#101c25;border:1px solid #344954}
figure:nth-child(7){grid-column:span 6}figure:nth-child(n+8){grid-column:span 3}figure:last-child{grid-column:span 6}
img{display:block;width:100%;height:240px;object-fit:contain;background:#0c131a}figure:nth-child(7) img{height:240px}figure:nth-child(n+8) img{height:390px}figure:last-child img{height:490px}
figcaption{padding:12px 14px;border-top:1px solid #344954;line-height:1.5}strong{font-size:11px;letter-spacing:.5px;color:#8cece5}p{margin:5px 0 0;color:#9bb0ba;font-size:11px}
a{color:inherit;text-decoration:none}footer{margin-top:20px;color:#9bb0ba;font-size:11px}</style>
<header><h1>PAYLOAD RECEIVER</h1><p>BINARY NINJA / COMPACT PAYLOAD INTERFACE + ENERGY CUBE · 16 OCTOBER 2026<br>Actual production-mode browser captures. Public custom multiplayer + full DEADLOCK physical solve. No gameplay-state injection.</p></header>
<main>${cards.map(([file, title, description]) => `<figure><a href="${file}.png"><img src="${file}.png" alt="${title}"></a><figcaption><strong>${title}</strong><p>${description}</p></figcaption></figure>`).join('')}</main>
<footer>Amber = awaiting cargo · Cyan = accepted cube occupancy · Open guides are cosmetic · The 44-unit body centres with its art; sensor footprint and controller timing are unchanged.</footer>`;
await writeFile(join(target, 'index.html'), html);
const h = await coopBrowser({ shots: target });
try {
    const origin = await h.startServer(), debug = await h.launch(), p = await h.page(origin, debug);
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 600, deviceScaleFactor: 1, mobile: false });
    await p.send('Page.navigate', { url: pathToFileURL(join(target, 'index.html')).href });
    for (let i = 0; i < 100 && !await p.read('document.images.length===10 && [...document.images].every(i=>i.complete&&i.naturalWidth>0)'); i++) await h.sleep(30);
    const height = await p.read<number>('Math.ceil(document.body.getBoundingClientRect().height)');
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1400, height, deviceScaleFactor: 1, mobile: false });
    await h.shot(p, 'gallery');
    h.check('gallery uses all ten actual browser captures', await p.read('document.images.length===10 && [...document.images].every(i=>i.complete&&i.naturalWidth>0)'));
} finally { await h.cleanup(); }
