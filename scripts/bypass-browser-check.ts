#!/usr/bin/env node
/** Focused official BYPASS routes: two visitors, normal and swapped actor slots.
 * Reuses the canonical scenario runner. No body, output or progress injection. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coopBrowser } from './coop-browser.ts';
import { campaignDraftRoute } from './campaign-draft-route.ts';

const h = await coopBrowser({ shots: process.env.BN_SHOTS ?? '.workbench/reports/bypass-native', internalLabs: false });
const observations: unknown[] = [];
const shot = h.shot;
h.shot = async (p, name) => {
    if (name === 'bypass-initial-open-p1' || name === 'bypass-anchor-held-p1') {
        const state = await p.read<any>(`(()=>{const g=binaryNinja,w=g.world;return {exit:w.frame.outputs.exitDoor,
            devices:w.frame.plates,controls:w.frame.controls,pads:g.renderer.heroes.machinery.snapshot().pads,
            media:matchMedia('(prefers-reduced-motion: reduce)').matches,source:document.querySelector('#controller-source')?.textContent}})()`);
        h.check(`${name}: exactly two accepted scanner states use modern pad presentation`, state.pads.length === 2
            && state.pads.every((pad: any) => pad.active === state.devices[pad.id]));
        h.check(`${name}: initial portal is physically unlocked`, state.exit);
        observations.push({ name, state });
        if (name === 'bypass-initial-open-p1') {
            await p.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
            await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
            await h.sleep(600); await shot(p, 'bypass-scanner-idle-1024-reduced');
            await h.click(p, '#pause'); await h.sleep(150);
            h.check('pausing preserves open portal and inactive scanner state', await p.read(`binaryNinja.world.frame.outputs.exitDoor
                && binaryNinja.renderer.heroes.machinery.snapshot().pads.every(p=>!p.active)`));
            await h.click(p, '#continue');
            await p.send('Emulation.setEmulatedMedia', { features: [] });
            await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
        }
    }
    await shot(p, name);
};
try {
    const url = await h.startServer(), debug = await h.launch();
    const a = await h.page(url, debug), b = await h.page(url, debug);
    await h.click(a, '#create-party'); const lobby = await h.wait(a, 'party lobby', s => s.multiplayer?.shared?.party?.phase === 'lobby');
    await h.click(b, '#join-code'); await b.send('Input.insertText', { text: lobby.multiplayer!.code! }); await h.click(b, '#join-room');
    await h.wait(a, 'second visitor joined', s => !!s.multiplayer?.shared?.connected.every(Boolean));
    for (const scenario of ['bypass', 'bypass-swapped-roles']) {
        if (scenario !== 'bypass') await h.click(a, '#choose-chamber');
        await h.click(a, '[data-select-level="bypass"]');
        for (const p of [a, b]) {
            await h.wait(p, 'BYPASS accepted overview', s => s.room === 'bypass' && s.overviewVisible);
            h.check(`${scenario}: first accepted state already opens exit with no commitments`, await p.read(`(()=>{const r=binaryNinja.coop.room;
                return r.exitUnlocked && r.levelState.outputs.exitReady && !r.levelState.devices['link.value'] && !r.levelState.devices['override.value']
                    && !r.completed && r.reachedExit.every(v=>!v)})()`));
        }
        await campaignDraftRoute(h, 'bypass', [a, b], scenario);
        for (const p of [a, b]) h.check(`${scenario}: both physical arrivals complete the authored room`,
            await p.read('binaryNinja.coop.room.completed && binaryNinja.coop.room.reachedExit.every(Boolean)'));
    }
    for (const p of [a, b]) h.check('no browser runtime errors', p.errors.length === 0, p.errors.join('\n'));
} catch (e) {
    for (const [i, p] of h.clients.entries()) await shot(p, `failure-${i}`).catch(() => {});
    console.error(String(e).slice(0, 1600)); process.exitCode = 1;
} finally {
    await writeFile(join(h.shots, 'checks.txt'), h.checks.join('\n') + '\n');
    await writeFile(join(h.shots, 'presentation.json'), JSON.stringify(observations, null, 2) + '\n');
    await h.cleanup();
}
