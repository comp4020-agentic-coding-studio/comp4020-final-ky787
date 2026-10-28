/** Read-only samples of the actual CROSSFEED canvas at its ordinary entry camera. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Cdp, coopBrowser } from './coop-browser.ts';
import { startEnergyRecording, stopEnergyRecording } from './energy-browser-review.ts';

// Exposed death field below its top edge, quiet floor interior, an undecorated
// stretch of the floor's top contact band left of the lift, and the exposed
// lethal top band, in world units.
const REGIONS = [[2050, 1712, 250, 55], [1720, 1570, 150, 80], [900, 1499, 520, 8], [2005, 1709, 410, 14]];
type Region = { w: number; h: number; data: number[] };
type Sample = { time: number; camera: number[]; regions: Region[] };
async function sample(p: Cdp): Promise<Sample> {
    return p.read(`(()=>{
        const game=binaryNinja,cam=game.renderer.camera,canvas=game.canvas,
            ratio=canvas.width/canvas.getBoundingClientRect().width;
        return {time:game.renderer.heroes.time,camera:[cam.originX(),cam.originY(),cam.zoom],
            regions:${JSON.stringify(REGIONS)}.map(([x,y,w,h])=>{
                const box=[Math.round((x-cam.originX())*cam.zoom*ratio),Math.round((y-cam.originY())*cam.zoom*ratio),
                    Math.round(w*cam.zoom*ratio),Math.round(h*cam.zoom*ratio)];
                return {w:box[2],h:box[3],data:Array.from(canvas.getContext('2d').getImageData(...box).data)};
            })};
    })()`);
}
function delta(a: Sample, b: Sample, region: number) {
    return a.regions[region].data.reduce((max, v, i) => Math.max(max, Math.abs(v - b.regions[region].data[i])), 0);
}
/** Perceptual motion along a band: share of screen columns with a clear RGB change,
 * and the number of separate runs of such columns (travelling segments). */
function bandMotion(a: Sample, b: Sample, region: number) {
    const { w, h, data } = a.regions[region], next = b.regions[region].data;
    let moving = 0, runs = 0, previous = false;
    for (let x = 0; x < w; x++) {
        let change = 0;
        for (let y = 0; y < h; y++) {
            const i = (y * w + x) * 4;
            change = Math.max(change, Math.abs(data[i] - next[i]) + Math.abs(data[i + 1] - next[i + 1]) + Math.abs(data[i + 2] - next[i + 2]));
        }
        const now = change > 90;
        if (now) moving++;
        if (now && !previous) runs++;
        previous = now;
    }
    return { columns: w, moving: +(moving / w).toFixed(3), runs };
}
export async function reviewTerrainMotion(h: Awaited<ReturnType<typeof coopBrowser>>, p: Cdp) {
    const observations: unknown[] = [];
    await h.sleep(1500);
    // Quarter-second pairs measure what a viewer sees within the first second.
    const quick = [await sample(p)];
    for (let n = 0; n < 3; n++) { await h.sleep(250); quick.push(await sample(p)); }
    const flow = quick.slice(1).map((s, n) => ({ dt: +(s.time - quick[n].time).toFixed(3),
        floorEdge: bandMotion(quick[n], s, 2), lethalEdge: bandMotion(quick[n], s, 3) }));
    observations.push({ name: 'quarter-second contact flow', camera: quick[0].camera, flow });
    // Paired samples are 0.25s apart; a missed frame could make one interval longer.
    h.check('ordinary-camera floor contact edge visibly flows within the first second',
        flow.every(f => f.floorEdge.moving > .25 && f.floorEdge.runs >= 2), JSON.stringify(flow.map(f => f.floorEdge)));
    h.check('ordinary-camera lethal top edge visibly flows within the first second',
        flow.every(f => f.lethalEdge.moving > .25 && f.lethalEdge.runs >= 2), JSON.stringify(flow.map(f => f.lethalEdge)));
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
    const changes = frames.slice(1).map(f => [0, 1, 2, 3].map(region => delta(frames[0], f, region)));
    h.check('ordinary-camera death signals visibly travel', changes.some(d => d[0] > 8), JSON.stringify(changes));
    h.check('ordinary-camera floor interior stays fixed', changes.every(d => d[1] <= 2));
    for (const mode of ['reduced-motion', 'paused']) {
        if (mode === 'reduced-motion') await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
        else await h.click(p, '#pause');
        try {
            await h.sleep(500);
            const first = await sample(p); await h.shot(p, 'crossfeed-' + mode + '-1920');
            await h.sleep(1300); const later = await sample(p);
            const still = [0, 1, 2, 3].map(region => delta(first, later, region));
            h.check(mode + ' freezes both terrain renderers in actual gameplay', still.every(d => d <= 2), JSON.stringify(still));
            // The still frame keeps a legible illuminated edge and lethal boundary.
            const lit = (region: number) => {
                const { w, h: rows, data } = first.regions[region]; let columns = 0;
                for (let x = 0; x < w; x++) for (let y = 0; y < rows; y++) {
                    const i = (y * w + x) * 4;
                    if (data[i] + data[i + 1] + data[i + 2] > 240) { columns++; break; }
                }
                return columns / w;
            };
            const legible = { floorEdge: +lit(2).toFixed(3), lethalEdge: +lit(3).toFixed(3) };
            h.check(mode + ' keeps a legible illuminated surface and hazard boundary', legible.floorEdge > .9 && legible.lethalEdge > .6, JSON.stringify(legible));
            observations.push({ mode, time: first.time, later: later.time, camera: first.camera, deltas: still, legible });
        } finally {
            if (mode === 'reduced-motion') await p.send('Emulation.setEmulatedMedia', { features: [] });
            else await h.click(p, '#continue');
        }
    }
    await writeFile(join(h.shots, 'motion-observations.json'), JSON.stringify(observations, null, 2) + '\n');
}
