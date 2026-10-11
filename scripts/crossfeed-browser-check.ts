#!/usr/bin/env node
/** Real-input two-browser chamber route. Reads snapshots; never writes world/controller state. */
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coopBrowser, type Cdp, type GameSnapshot } from './coop-browser.ts';
import type { CubeId, SharedRoom } from '../src/coop/protocol.ts';
type Snapshot = GameSnapshot;
export async function crossfeedRoute(h: Awaited<ReturnType<typeof coopBrowser<Snapshot>>>, url: string, debug: string, reverse = false, partyPlayers?: [Cdp, Cdp]) {
const { snapshot, wait, check, click, key, tap, walk, mouse, sleep, shot } = h;
const state = (s: Snapshot) => s.multiplayer!.shared! as SharedRoom<'crossfeed-vault'>;
async function align(p: Cdp, x: number) {
    let dx = x - (await snapshot(p)).player.x;
    if (Math.abs(dx) > 65) await walk(p, x - Math.sign(dx) * 35);
    for (let n = 0; n < 35; n++) {
        dx = x - (await snapshot(p)).player.x; if (Math.abs(dx) < 7) return;
        const direction = dx > 0 ? 'KeyD' : 'KeyA';
        await key(p, direction, true); await sleep(Math.abs(dx) > 30 ? 65 : 30); await key(p, direction, false); await sleep(100);
    }
    throw new Error(`Could not align at ${x}`);
}
async function pickup(p: Cdp, id: CubeId) {
    const x = (await snapshot(p)).cubes[id]!.x;
    const sign = (await snapshot(p)).player.x < x ? -1 : 1;
    await align(p, x + sign * 44); await tap(p, 'KeyE');
    await wait(p, `accepted ${id} pickup`, s => !s.multiplayer?.pendingCubeAction && state(s).cubes[id]!.holder === s.multiplayer?.slot);
}
async function place(p: Cdp, id: CubeId, x: number, placement?: string) {
    const start = await snapshot(p), direction = x > start.player.x ? 1 : -1;
    for (const [other, c] of Object.entries(start.cubes)) if (other !== id && !c.carried && c.grounded
        && (c.x - start.player.x) * direction > 0 && (x - 43 - c.x) * direction > 0 && Math.abs(c.y + 22 - (start.player.y + 17)) < 5)
        await hop(p, c.x + direction * 85);
    await align(p, x - 43); await key(p, 'KeyD', true); await sleep(12); await key(p, 'KeyD', false); await sleep(120);
    await tap(p, 'KeyE');
    await wait(p, `accepted ${id} drop`, s => !s.multiplayer?.pendingCubeAction && state(s).cubes[id]!.holder === null && !!s.cubes[id]?.grounded);
    if (placement) await wait(p, `${id} on ${placement}`, s => state(s).cubePlacements[id] === placement);
}
async function hop(p: Cdp, x: number, ground?: string) {
    await wait(p, 'grounded before jump', s => s.player.grounded);
    await key(p, 'Space', true);
    let held: 'KeyA' | 'KeyD' | null = null, airborne = false;
    try {
        for (let n = 0; n < 180; n++) {
            const s = await snapshot(p); airborne ||= !s.player.grounded;
            if (airborne && s.player.grounded) {
                if (ground && s.player.groundId !== ground) throw new Error(`Jump to ${ground} landed on ${s.player.groundId} at ${s.player.x}, ${s.player.y}`);
                return;
            }
            // Brake with ordinary air steering instead of relying on ground friction.
            const stoppingX = s.player.x + s.player.vx * Math.abs(s.player.vx) / (2 * 1900);
            const next = stoppingX < x - 4 ? 'KeyD' : stoppingX > x + 4 ? 'KeyA' : null;
            if (next !== held) { if (held) await key(p, held, false); if (next) await key(p, next, true); held = next; }
            await sleep(18);
        }
        throw new Error(`Jump to ${ground ?? x} did not land`);
    } finally { if (held) await key(p, held, false); await key(p, 'Space', false); await sleep(100); }
}
async function lift(p: Cdp) {
    await key(p, 'Space', true);
    try { await walk(p, 1550); } finally { await key(p, 'Space', false); }
    await wait(p, 'lift reaches control level', s => s.player.y < 733, 15000);
    await walk(p, 1370); await wait(p, 'upper catwalk landing', s => s.player.groundId === 'control-catwalk');
}
async function mount(p: Cdp, id: CubeId) {
    await wait(p, 'fresh partner support', s => !!s.multiplayer?.partnerCubeSupportActive);
    await align(p, (await snapshot(p)).cubes[id]!.x);
    await key(p, 'Space', true);
    try { await wait(p, 'landing on held payload', s => !!s.multiplayer?.groundedOnPartnerCube); }
    finally { await key(p, 'Space', false); await sleep(100); }
}
async function vault(p: Cdp) {
    await align(p, 1730); await hop(p, 1800, 'vault-rise-low'); await hop(p, 1980, 'vault-rise-high'); await hop(p, 2140, 'vault-cargo-deck');
}
    h.scenario = reverse ? '[reversed roles] ' : '[full chamber] '; h.shotPrefix = reverse ? 'reverse-' : 'full-';
    const [a, b] = partyPlayers ?? [await h.page(url, debug), await h.page(url, debug)];
    const holder = reverse ? b : a, runner = reverse ? a : b;
    if (!partyPlayers) {
    await click(a, '[data-create-lab="crossfeed-vault"]');
    const created = await wait(a, 'created CROSSFEED', s => s.room === 'crossfeed-vault' && !!s.multiplayer?.code);
    await click(b, '#join-code'); await b.send('Input.insertText', { text: created.multiplayer!.code }); await click(b, '#join-room');
    await wait(b, 'join discovers chamber', s => s.room === 'crossfeed-vault' && !!s.multiplayer?.shared?.connected.every(Boolean));
    }
    const created = await snapshot(a);
    await sleep(1500); await shot(a, 'overview');
    check('one large chamber, two named cubes, honest mock source', Object.keys(created.cubes).join(',') === 'cubeA,cubeB' && created.source === 'mock-multiplayer' && !created.evidence);
    for (const p of [a, b]) { await tap(p, 'Space'); await wait(p, 'overview dismissed', s => s.started && !s.overviewVisible); }
    await align(holder, 1870); await wait(runner, 'A powers partner anchor', s => s.outputs.grappleAnchor);
    await walk(runner, 1950);
    await key(runner, 'KeyD', true); await mouse(runner, 2300, 1166, true);
    try {
        await wait(runner, 'real grapple attaches', s => s.player.rope.phase === 'attached');
        await wait(runner, 'grapple crosses first gap', s => s.player.x > 2340 && s.player.y < 1450 && s.player.vx > 0);
        await mouse(runner, 2300, 1166, false);
        await wait(runner, 'right balcony landing', s => s.player.x > 2440 && s.player.groundId === 'access-balcony');
    } finally { await key(runner, 'KeyD', false); await mouse(runner, 2300, 1166, false); }
    await align(runner, 2560); await tap(runner, 'KeyE'); await wait(holder, 'B return bridge', s => s.outputs.bridge);
    await walk(holder, 1780); check('B releases the body holder permanently', !(await snapshot(holder)).outputs.grappleAnchor && (await snapshot(holder)).outputs.bridge);
    await pickup(runner, 'cubeA'); await place(runner, 'cubeA', 1750, 'liftCargo');
    await wait(holder, 'cargo powers lift', s => s.outputs.liftField); check('Cube A temporarily powers lift', !state(await snapshot(holder)).levelState.inputs.switchC);
    await lift(holder); await align(holder, 1210); await tap(holder, 'KeyE');
    await wait(runner, 'C powers relay, lift and checkpoint', s => s.checkpoint === 'upper' && s.outputs.relayGates);
    await pickup(runner, 'cubeA'); await place(runner, 'cubeA', 1840);
    check('C leaves lift on after cargo removal without moving partner', (await snapshot(runner)).outputs.liftField && (await snapshot(runner)).player.y > 1400);
    await walk(holder, 700); await wait(holder, 'service bay floor', s => s.player.groundId === 'central-floor');
    await pickup(holder, 'cubeB');
    const untouchedA = { ...((await snapshot(runner)).cubes.cubeA!) }, epochB = state(await snapshot(holder)).cubes.cubeB!.epoch;
    await walk(holder, 900);
    await wait(holder, 'service filter resets B', s => (state(s).cubes.cubeB!.lastReset?.epoch ?? 0) > epochB && Math.abs(s.cubes.cubeB!.x - 510) < 2);
    check('B firewall reset preserves A and walking carrier', Math.abs((await snapshot(runner)).cubes.cubeA!.x - untouchedA.x) < 1 && (await snapshot(holder)).deaths === 0);
    await pickup(holder, 'cubeB'); await walk(holder, 370);
    await key(holder, 'KeyA', true);
    try { await wait(holder, 'carried B emerges from R2', s => s.player.x > 3236 && s.cubes.cubeB!.carried && s.player.y < 950); }
    finally { await key(holder, 'KeyA', false); }
    await align(holder, 3390); await place(holder, 'cubeB', 3470);
    await walk(runner, 370); await key(runner, 'KeyA', true);
    try { await wait(runner, 'partner joins through relay', s => s.player.x > 3236 && s.player.y < 950); }
    finally { await key(runner, 'KeyA', false); }
    check('relay leaves one B in gallery and A below', Object.keys((await snapshot(runner)).cubes).length === 2 && (await snapshot(runner)).cubes.cubeA!.y > 1400);
    await pickup(runner, 'cubeB'); await align(runner, 3580);
    await mount(holder, 'cubeB'); await shot(holder, 'boost-support');
    await hop(holder, 3740, 'control-ledge'); await align(holder, 3900); await tap(holder, 'KeyE');
    await wait(runner, 'D opens permanent upper route', s => s.outputs.codePlatformA);
    check('real second jump reaches D with roles changed since A', (await snapshot(holder)).player.groundId === 'control-ledge' && state(await snapshot(runner)).cubes.cubeB!.holder === (reverse ? 1 : 2));
    if (reverse) { await shot(holder, 'D-latched'); return; }
    await walk(runner, 3380); await hop(runner, 3430, 'gallery-return-low'); await hop(runner, 3410, 'upper-crossfeed');
    await walk(holder, 1840); await key(holder, 'KeyS', true);
    try { await wait(holder, 'drop through permanent upper route', s => s.player.y > 900); } finally { await key(holder, 'KeyS', false); }
    await wait(holder, 'central recovery floor', s => s.player.grounded && s.player.y > 1400);
    await pickup(holder, 'cubeA'); await lift(holder);
    await vault(holder); await place(holder, 'cubeA', 2210, 'finalLeft');
    await vault(runner); await place(runner, 'cubeB', 2940, 'finalRight');
    await wait(holder, 'both final approaches appear', s => s.outputs.codePlatformB);
    check('two payloads dock without unlocking body puzzle', !(await snapshot(holder)).outputs.exitDoor);
    // Swap actual payloads using ordinary pickup/carry/drop; either assignment is valid.
    await pickup(holder, 'cubeA'); await pickup(runner, 'cubeB');
    await wait(holder, 'removing pads retracts approaches safely', s => !s.outputs.codePlatformB);
    await place(holder, 'cubeA', 2940, 'finalRight'); await place(runner, 'cubeB', 2210, 'finalLeft');
    await wait(runner, 'swapped pair restores approaches', s => s.outputs.codePlatformB);
    check('final pads accept B-left / A-right as well', state(await snapshot(holder)).cubePlacements.cubeA === 'finalRight' && state(await snapshot(holder)).cubePlacements.cubeB === 'finalLeft');
    // Bodies approach from opposite ends. Neither can press both plates.
    await walk(runner, 2090); await hop(runner, 1990, 'final-left-low'); await hop(runner, 1970, 'final-left-high'); await align(runner, 1970); await hop(runner, 2110, 'vault-crown'); await align(runner, 2160);
    await hop(holder, 3060); await walk(holder, 3120); await hop(holder, 3250, 'final-right-low'); await hop(holder, 3270, 'final-right-high'); await align(holder, 3270); await hop(holder, 3120, 'vault-crown'); await align(holder, 3040);
    await wait(holder, 'opposite bodies latch vault exit', s => s.outputs.exitDoor);
    await shot(holder, 'vault-unlocked');
    await walk(holder, 2850); await walk(runner, 2300);
    check('exit stays open after both players leave final plates', (await snapshot(runner)).outputs.exitDoor);
    await walk(runner, 2550); await wait(holder, 'one physical arrival', s => state(s).reachedExit.filter(Boolean).length === 1);
    check('one arrival does not complete room', !state(await snapshot(holder)).completed);
    await key(holder, 'KeyA', true);
    try { await wait(runner, 'two physical arrivals complete vault', s => state(s).completed); } finally { await key(holder, 'KeyA', false); }
    await shot(runner, 'complete');
    check('CROSSFEED completed through real controls', state(await snapshot(holder)).completed && (await snapshot(holder)).deaths === 0 && (await snapshot(runner)).deaths === 0);
}

async function main() {
const h = await coopBrowser<Snapshot>({ shots: process.env.BN_SHOTS ?? '/tmp/bn-crossfeed-shots' });
const { check, shot, snapshot } = h;

try {
    const url = process.argv[2] ?? await h.startServer(), debug = await h.launch();
    await crossfeedRoute(h, url, debug, false);
    if (!process.env.BN_CROSSFEED_FORWARD_ONLY) await crossfeedRoute(h, url, debug, true);
    for (const c of h.clients) check('browser has no runtime errors', c.errors.length === 0, c.errors.join('\n'));
    await writeFile(join(h.shots, 'checks.txt'), h.checks.join('\n') + '\n');
} catch (e) {
    for (let i = 0; i < h.clients.length; i++) {
        await shot(h.clients[i], `failure-${i}`).catch(() => {});
        await writeFile(join(h.shots, `failure-${i}.json`), JSON.stringify(await snapshot(h.clients[i]).catch(() => null), null, 2));
    }
    await writeFile(join(h.shots, 'error.txt'), String(e));
    console.error(String(e).split(': {')[0]); process.exitCode = 1;
} finally { await h.cleanup(); }

}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
