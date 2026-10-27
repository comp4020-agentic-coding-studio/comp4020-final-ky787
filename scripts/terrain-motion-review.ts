/** Read-only samples of the actual CROSSFEED canvas at its ordinary entry camera. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Cdp, coopBrowser } from './coop-browser.ts';
import { startEnergyRecording, stopEnergyRecording } from './energy-browser-review.ts';

type Sample = { time: number; camera: number[]; pixels: number[][] };
async function sample(p: Cdp): Promise<Sample> {
    return p.read(`(()=>{
        const game=binaryNinja,cam=game.renderer.camera,canvas=game.canvas,
            ratio=canvas.width/canvas.getBoundingClientRect().width;
        // Exposed death field, quiet floor interior, and an undecorated top edge.
        const boxes=[[2050,1712,250,55],[1720,1570,150,80],[1000,1501,300,7]];
        return {time:game.renderer.heroes.time,camera:[cam.originX(),cam.originY(),cam.zoom],
            pixels:boxes.map(([x,y,w,h])=>Array.from(canvas.getContext('2d').getImageData(
                Math.round((x-cam.originX())*cam.zoom*ratio),Math.round((y-cam.originY())*cam.zoom*ratio),
                Math.round(w*cam.zoom*ratio),Math.round(h*cam.zoom*ratio)).data))};
    })()`);
}
function delta(a: Sample, b: Sample, region: number) {
    return a.pixels[region].reduce((max, v, i) => Math.max(max, Math.abs(v - b.pixels[region][i])), 0);
}
export async function reviewTerrainMotion(h: Awaited<ReturnType<typeof coopBrowser>>, p: Cdp) {
    const observations: unknown[] = [];
    await h.sleep(1500);
    await startEnergyRecording(p);
    const frames: Sample[] = [];
    for (let n = 0; n < 3; n++) {
        if (n) await h.sleep(1600);
        const frame = await sample(p); frames.push(frame);
        const name = 'crossfeed-flow-frame-' + n;
        observations.push({ name, time: frame.time, camera: frame.camera });
        await h.shot(p, name);
    }
    await stopEnergyRecording(p, join(h.shots, 'crossfeed-flow.webm'));
    const changes = frames.slice(1).map(f => [0, 1, 2].map(region => delta(frames[0], f, region)));
    h.check('ordinary-camera death signals visibly travel', changes.some(d => d[0] > 8), JSON.stringify(changes));
    h.check('ordinary-camera floor interior stays fixed', changes.every(d => d[1] <= 2));
    h.check('ordinary-camera static edge packets travel', changes.some(d => d[2] > 8));
    for (const mode of ['reduced-motion', 'paused']) {
        if (mode === 'reduced-motion') await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
        else await h.click(p, '#pause');
        try {
            await h.sleep(500);
            const first = await sample(p); await h.shot(p, 'crossfeed-' + mode + '-1920');
            await h.sleep(1300); const later = await sample(p);
            const still = [0, 1, 2].map(region => delta(first, later, region));
            h.check(mode + ' freezes both terrain renderers in actual gameplay', still.every(d => d <= 2), JSON.stringify(still));
            observations.push({ mode, time: first.time, later: later.time, camera: first.camera, deltas: still });
        } finally {
            if (mode === 'reduced-motion') await p.send('Emulation.setEmulatedMedia', { features: [] });
            else await h.click(p, '#continue');
        }
    }
    await writeFile(join(h.shots, 'motion-observations.json'), JSON.stringify(observations, null, 2) + '\n');
}
