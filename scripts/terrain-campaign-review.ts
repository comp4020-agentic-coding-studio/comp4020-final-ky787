/** Optional scenery captures at stable holds on the existing real-input route. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { coopBrowser } from './coop-browser.ts';

export function reviewCampaignTerrain(h: Awaited<ReturnType<typeof coopBrowser>>, expectedRooms = 5) {
    const shot = h.shot, observations: unknown[] = [], rooms = new Set<string>();
    h.shot = async (p, name) => {
        await shot(p, name);
        if (!['handshake-maintenance-complete-partner', 'upper-right-routing', 'right-deck',
            'deadlock-stage-06-three-payloads-operator', 'use-after-free-summit-assist-host'].includes(name)) return;
        const room = (await h.snapshot(p)).room;
        rooms.add(room);
        for (const [index, peer] of h.clients.entries()) {
            const before = await h.snapshot(peer);
            try {
                for (const [width, height] of [[1920, 1080], [1024, 768]]) {
                    await peer.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
                    await h.sleep(900);
                    const label = `terrain-${room}-powered-player-${index + 1}-${width}`, state = await h.snapshot(peer);
                    h.check(`${label}: gameplay remains visible`, state.started && !state.overviewVisible);
                    observations.push({ label, player: state.player, camera: state.camera, outputs: state.outputs });
                    await shot(peer, label);
                }
            } finally {
                await peer.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
                await h.sleep(900);
            }
            h.check(`${room}: scenery review preserves the stable hold`, (await h.snapshot(peer)).deaths === before.deaths);
        }
    };
    return async () => {
        h.check(`terrain captured during ${expectedRooms} real-input chamber solves`, rooms.size === expectedRooms);
        await writeFile(join(h.shots, 'terrain-observations.json'), JSON.stringify(observations, null, 2) + '\n');
    };
}
