/** Extra art captures on stable points of the real-input five-chamber route. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Cdp, coopBrowser } from './coop-browser.ts';

export function reviewCampaignPolish(h: Awaited<ReturnType<typeof coopBrowser>>) {
    const shot = h.shot, tap = h.tap, walk = h.walk;
    const observations: unknown[] = [];
    let ready = false, completed = false, dormant = false, latchBaseline = 0;
    const commit = (p: Cdp) => p.read<{
        accepted: boolean; displayed: boolean; hint: string; groundId: string; latchSounds: number;
    }>(`(()=>{const g=binaryNinja;return {accepted:g.coop.room.levelState.inputs.finalControl,
        displayed:g.world.inputs.switchC,hint:g.world.interactionHint(),groundId:g.world.player.groundId,
        latchSounds:g.audio.snapshot().played.latch??0}})()`);
    async function capture(p: Cdp, name: string) {
        const state = await h.snapshot(p);
        observations.push({ name, room: state.room, camera: state.camera, player: state.player,
            outputs: state.outputs, commit: state.room === 'race-condition' ? await commit(p) : undefined });
        await shot(p, name);
    }
    async function sizes(p: Cdp, name: string) {
        await capture(p, `${name}-1600`);
        await p.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
        try { await h.sleep(850); await capture(p, `${name}-1024`); }
        finally {
            await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
            await h.sleep(850);
        }
    }
    h.tap = async (p, code) => {
        if (!ready && code === 'KeyE' && (await h.snapshot(p)).room === 'race-condition') {
            const before = await commit(p);
            if (before.hint === 'E · COMMIT') {
                ready = true; latchBaseline = before.latchSounds;
                h.check('RACE cyan ready uses the existing grounded ledge interaction hint', !before.accepted
                    && !before.displayed && before.groundId === 'commit-ledge');
                await sizes(p, 'polish-race-ready');
            }
        }
        await tap(p, code);
    };
    h.shot = async (p, name) => {
        await shot(p, name);
        const room = (await h.snapshot(p)).room;
        if (room === 'race-condition' && name === 'right-deck') {
            dormant = true;
            h.check('RACE stays muted until its existing interaction hint is available', !(await commit(p)).accepted
                && (await commit(p)).hint !== 'E · COMMIT');
            await sizes(p, 'polish-race-dormant');
        }
        if (room === 'race-condition' && name === 'commit') {
            completed = true; await h.sleep(300);
            const before = await commit(p);
            h.check('RACE green latched display follows the accepted one-time terminal', before.accepted && before.displayed
                && before.hint === 'COMMITTED' && before.latchSounds === latchBaseline + 1);
            await sizes(p, 'polish-race-completed');
            await tap(p, 'KeyE'); await h.sleep(200);
            const after = await commit(p);
            h.check('repeating COMMIT cannot release the latch or replay its cue', after.accepted && after.displayed && after.latchSounds === before.latchSounds);
            for (const peer of h.clients) h.check('both visitors see the accepted COMMIT state', (await commit(peer)).displayed);
        }
        // These are stable holds/refuges, never timed crumble jumps or swings.
        if (['handshake-maintenance-complete-partner', 'upper-right-routing',
            'deadlock-stage-06-three-payloads-operator', 'use-after-free-near-complete-host'].includes(name)) {
            for (const [index, peer] of h.clients.entries()) await sizes(peer, `polish-${room}-powered-player-${index + 1}`);
        }
    };
    h.walk = async (p, x) => {
        await walk(p, x);
        if (completed && x === 3780 && (await h.snapshot(p)).room === 'race-condition') {
            await h.wait(p, 'COMMIT departure lands on original right deck', s => s.player.groundId === 'right-deck');
            for (const [index, peer] of h.clients.entries()) await sizes(peer, `polish-race-departure-player-${index + 1}`);
        }
    };
    return async () => {
        h.check('RACE dormant, cyan ready and green committed were reached by real controls', dormant && ready && completed);
        await writeFile(join(h.shots, 'polish-observations.json'), JSON.stringify(observations, null, 2) + '\n');
    };
}
