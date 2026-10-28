/** Optional scenery captures at stable holds on the existing real-input route. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { coopBrowser } from './coop-browser.ts';

/** Matched off/on views while the real route places Cube A in the lift socket. */
export function reviewCrossfeedLift(h: Awaited<ReturnType<typeof coopBrowser>>) {
    const walk = h.walk, wait = h.wait, observations: unknown[] = [], seen = new Set<string>();
    const cameras = new Map<number, { x: number; y: number; zoom: number }>();
    async function capture(p: Parameters<typeof h.snapshot>[0], powered: boolean) {
        const mode = powered ? 'on' : 'off';
        if (seen.has(mode)) return;
        seen.add(mode);
        const before = await h.snapshot(p);
        try {
            for (const [width, height] of [[1920, 1080], [1024, 768]]) {
                await p.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
                await h.sleep(1500);
                const state = await h.snapshot(p), name = `crossfeed-lift-${mode}-${width}`;
                h.check(name + ' uses the accepted lift state and ordinary camera', state.outputs.liftField === powered && state.camera.kind === 'follow' && !state.overviewVisible);
                if (!powered) cameras.set(width, state.camera);
                else {
                    const first = cameras.get(width)!;
                    // The real camera eases after a viewport resize; allow a
                    // subpixel settling difference, never overwrite its transform.
                    h.check(name + ' matches the unpowered camera', Math.abs(first.x - state.camera.x) < 1 && Math.abs(first.y - state.camera.y) < 1 && Math.abs(first.zoom - state.camera.zoom) < .0001,
                        JSON.stringify({ off: first, on: state.camera }));
                }
                observations.push({ name, player: state.player, camera: state.camera, outputs: state.outputs });
                await h.shot(p, name);
            }
        } finally {
            await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
            await h.sleep(1000);
        }
        h.check('lift art capture preserves the grounded hold', (await h.snapshot(p)).deaths === before.deaths);
    }
    h.walk = async (p, x) => {
        const reviewing = x === 1780 && (await h.snapshot(p)).room === 'crossfeed-vault';
        // Stop just left of the future cargo footprint, outside the lift shaft.
        // Otherwise the legitimate cube drop nudges the visitor and its camera.
        // This is ordinary walking input, never a position/camera injection.
        await walk(p, reviewing ? 1740 : x);
        if (reviewing) await capture(p, false);
    };
    h.wait = async (p, label, predicate, timeout) => {
        const result = await wait(p, label, predicate, timeout);
        if (label === 'cargo powers lift') await capture(p, true);
        return result;
    };
    return async () => {
        h.check('captured both accepted gravity-lift states', seen.size === 2);
        await writeFile(join(h.shots, 'lift-observations.json'), JSON.stringify(observations, null, 2) + '\n');
    };
}

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

/** Ordinary-camera close-ups of CROSSFEED's floating buttons around their real presses:
 * just before, at the mid-jump/ledge press and after commitment, at two viewport sizes. */
export function reviewCrossfeedControls(h: Awaited<ReturnType<typeof coopBrowser>>) {
    const wait = h.wait, observations: unknown[] = [], seen = new Set<string>();
    async function capture(p: Parameters<typeof h.snapshot>[0], name: string) {
        if (seen.has(name)) return;
        seen.add(name);
        const state = await h.snapshot(p);
        observations.push({ name, player: state.player, camera: state.camera, controls: state.multiplayer?.shared?.levelState });
        await h.shot(p, 'control-' + name);
    }
    h.wait = async (p, label, predicate, timeout) => {
        if (label === 'mid-jump reach of SYSTEM ONLINE') await capture(p, 'system-online-before');
        const result = await wait(p, label, predicate, timeout);
        if (label === 'mid-jump reach of SYSTEM ONLINE') await capture(p, 'system-online-mid-jump');
        if (label === 'lands back on the catwalk after the mid-jump press') {
            await capture(p, 'system-online-latched');
            await p.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
            try { await h.sleep(900); await capture(p, 'system-online-latched-1024'); }
            finally { await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false }); await h.sleep(600); }
        }
        if (label === 'D opens local gallery access') await capture(p, 'gallery-latched');
        return result;
    };
    return async () => {
        h.check('captured both floating CROSSFEED buttons', seen.has('system-online-mid-jump') && seen.has('gallery-latched'));
        await writeFile(join(h.shots, 'control-observations.json'), JSON.stringify(observations, null, 2) + '\n');
    };
}
