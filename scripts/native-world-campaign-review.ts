/** Observe existing real-input route captures without changing camera, timing rules or gameplay state. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { coopBrowser } from './coop-browser.ts';

export function reviewNativeWorldCampaign(h: Awaited<ReturnType<typeof coopBrowser>>) {
    const originalShot = h.shot;
    const observations: unknown[] = [], seen = new Set<string>();
    h.shot = async (page, name) => {
        await originalShot(page, name);
        const state = await h.snapshot(page), view = state.nativeWorld;
        if (!view || view.status !== 'ready' || view.chamber !== state.room || !view.panels.length) return;
        seen.add(view.chamber);
        h.check(`${name}: in-world assembly uses the accepted room's native values`, view.panels.every(panel => panel.static
            && panel.raw === (view.outputs[panel.output] ?? view.physical[panel.output] ?? null)));
        observations.push({ name, chamber: view.chamber, started: state.started, overview: state.overviewVisible,
            connected: state.multiplayer?.shared?.connected, completed: state.multiplayer?.shared?.completed,
            camera: state.camera, panels: view.panels, confirmedOutputs: view.outputs, confirmedPhysical: view.physical });
    };
    return async () => {
        h.check('full physical campaign route rendered each chamber’s own native assembly',
            ['handshake', 'crossfeed-vault', 'race-condition', 'deadlock', 'use-after-free'].every(chamber => seen.has(chamber)));
        await writeFile(join(h.shots, 'native-world-physical-route.json'), JSON.stringify({
            scope: 'Existing five-chamber real-input solve; snapshots at existing screenshot points; no camera or gameplay writes',
            chambers: [...seen], observations,
        }, null, 2) + '\n');
    };
}
