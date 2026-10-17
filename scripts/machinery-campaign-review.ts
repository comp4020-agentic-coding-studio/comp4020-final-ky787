/** Optional art captures during the unchanged full campaign input route. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { coopBrowser } from './coop-browser.ts';
import { startEnergyRecording as startRecording, stopEnergyRecording as stopRecording } from './energy-browser-review.ts';

export function reviewCampaignMachinery(h: Awaited<ReturnType<typeof coopBrowser>>) {
    const shot = h.shot;
    h.shot = async (p, name) => {
        await shot(p, name);
        if (name === 'deadlock-stage-04-final-hover-operator') {
            const state = await h.snapshot(p);
            h.check('DEADLOCK cargo column and both real pressure pads are powered before handoff', state.heroAssets.lifts.some(l => l.enabled)
                && state.heroAssets.pads.filter(p => p.active).length === 2);
            await h.key(p, 'Tab', true); await h.sleep(800); await shot(p, 'machinery-deadlock-tall');
            const times = await p.read<number[]>(`new Promise(resolve=>{const times=[];let last=performance.now();
                function sample(now){times.push(now-last);last=now;if(times.length<130)requestAnimationFrame(sample);else resolve(times.slice(10).sort((a,b)=>a-b))}requestAnimationFrame(sample)})`);
            await writeFile(join(h.shots, 'machinery-deadlock-performance.json'), JSON.stringify({
                frames: times.length, median: times[60], p95: times[114], note: 'Full-height overview; two independent production clients; local headless measurement.' }, null, 2));
            h.check('tall cargo shaft overview keeps bounded rendering', times[114] < 50);
            await p.send('Emulation.setDeviceMetricsOverride', { width: 800, height: 600, deviceScaleFactor: 1, mobile: false });
            await h.sleep(800); await shot(p, 'machinery-deadlock-compact');
            await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
            await h.key(p, 'Tab', false); await h.sleep(800);
            await startRecording(p);
        }
        if (name === 'deadlock-stage-05-hatch-catch-operator') {
            await stopRecording(p, join(h.shots, 'machinery-deadlock-handoff.webm'));
            h.check('manual hatch catch is still physically required after the operator releases lift power', !(await h.snapshot(p)).heroAssets.lifts.some(l => l.enabled));
        }
    };
}
