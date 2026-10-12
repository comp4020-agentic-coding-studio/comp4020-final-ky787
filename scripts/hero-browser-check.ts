/** Browser raster review of the actual Canvas helpers. No game state is injected.
 * pnpm build && pnpm check:heroes; use BN_HERO_REVIEW=1 with check:crossfeed for live transition captures. */
import { createServer } from 'vite';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coopBrowser, type Cdp } from './coop-browser.ts';
async function captions(p: Cdp) {
    return p.read<{ text: string; left: number; right: number; width: number }[]>(`new Promise(resolve => {
        const proto = CanvasRenderingContext2D.prototype, original = proto.fillText, seen = [];
        proto.fillText = function(label, x, y, ...rest) {
            if (this.font.includes('9px') && /^(ENTRY POINT|BREAKPOINT|TRAVEL)/.test(label)) {
                const m = this.getTransform(), centre = x*m.a + m.e, half = this.measureText(label).width*m.a/2;
                seen.push({text:label, left:centre-half, right:centre+half, width:this.canvas.width});
            }
            return original.call(this, label, x, y, ...rest);
        };
        requestAnimationFrame(() => requestAnimationFrame(() => { proto.fillText=original; resolve(seen); }));
    })`);
}
const h = await coopBrowser({ shots: process.env.BN_SHOTS ?? '/tmp/bn-hero-shots' });
const vite = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
try {
    await vite.listen();
    const url = await h.startServer(), debug = await h.launch();
    const p = await h.page(url, debug);
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1100, deviceScaleFactor: 1, mobile: false });
    await p.send('Page.navigate', { url: `${vite.resolvedUrls!.local[0]}scripts/hero-gallery.html` });
    for (let i = 0; i < 100 && !await p.read('!!window.heroGalleryReady'); i++) await h.sleep(50);
    h.check('gallery loaded actual Canvas modules', await p.read('!!window.heroGalleryReady'));
    const ink = await p.read<{ text: string; colour: string }[]>('window.heroInk');
    for (const [label, colour] of [['ENTRY POINT', '#8cece5'], ['BREAKPOINT OFFLINE', '#b8a076'],
        ['BREAKPOINT ACTIVE', '#ff556b'], ['TRAVEL INCOMPLETE', '#8d9a9f'], ['TRAVEL COMPLETE', '#8af0ac']])
        h.check(`${label} uses its semantic status colour`, ink.some(t => t.text === label && t.colour === colour));
    h.check('ready gate still shows zero physical arrivals', ink.some(t => t.text === '0 / 2 ARRIVED'));
    await h.shot(p, 'hero-gallery');
    for (const id of ['entry', 'offline', 'active', 'locked', 'unlocked', 'sequence']) {
        const clip = await p.read(`(()=>{const r=document.getElementById('${id}').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
        const shot = await p.send('Page.captureScreenshot', { format: 'png', clip });
        await writeFile(join(h.shots, `${id}.png`), Buffer.from(shot.data, 'base64'));
    }
    h.check('Canvas rendering has no browser errors', p.errors.length === 0, p.errors.join('\n'));
    // RACE's receiver sits immediately above its entrance; check the actual room at both sizes.
    const a = await h.page(url, debug), b = await h.page(url, debug);
    await h.click(a, '#create-party');
    const party = await h.wait(a, 'created review party', s => !!s.multiplayer?.code);
    await h.click(b, '#join-code'); await b.send('Input.insertText', { text: party.multiplayer!.code }); await h.click(b, '#join-room');
    await h.wait(a, 'partner connected', s => !!s.multiplayer?.shared?.connected.every(Boolean));
    await h.click(a, '[data-select-level="race-condition"]');
    await h.wait(a, 'race overview loaded', s => s.room === 'race-condition' && s.overviewVisible);
    await h.sleep(1200); await h.shot(a, 'race-overview');
    await a.send('Emulation.setDeviceMetricsOverride', { width: 800, height: 600, deviceScaleFactor: 1, mobile: false });
    await h.sleep(1200); await h.shot(a, 'race-overview-compact');
    h.check('race entry waits through initial overview', (await h.snapshot(a)).heroAssets.entryAge === null);
    const overview = await captions(a);
    h.check('compact edge captions fit inside the canvas', overview.some(t => t.text === 'TRAVEL INCOMPLETE')
        && overview.every(t => t.left >= 0 && t.right <= t.width));
    await h.tap(a, 'Space'); await h.wait(a, 'race starts for entrance review', s => s.started);
    await h.sleep(1200); await h.shot(a, 'race-entry-compact');
    const follow = await captions(a);
    h.check('caption clamping does not bring an offscreen exit into view', follow.some(t => t.text === 'ENTRY POINT')
        && follow.every(t => !t.text.startsWith('TRAVEL')));
    for (const client of [a, b]) h.check('live room rendering has no browser errors', client.errors.length === 0, client.errors.join('\n'));
    await writeFile(join(h.shots, 'gallery-checks.txt'), h.checks.join('\n') + '\n');
} finally { await vite.close(); await h.cleanup(); }
