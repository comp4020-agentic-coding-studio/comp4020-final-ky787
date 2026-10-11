#!/usr/bin/env node
/** Real-input two-browser chamber route. Reads snapshots; never writes world/controller state. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coopBrowser, type Cdp, type GameSnapshot } from './coop-browser.ts';
import type { CubeId, SharedRoom } from '../src/coop/protocol.ts';
type Snapshot = Omit<GameSnapshot, 'multiplayer'> & { multiplayer: (Omit<NonNullable<GameSnapshot['multiplayer']>, 'shared'> & { shared: SharedRoom<'race-condition'> | null }) | null };
const h = await coopBrowser<Snapshot>({ shots: process.env.BN_SHOTS ?? '/tmp/bn-race-shots' });
const { snapshot, wait, check, click, key, tap, walk, mouse, sleep, shot } = h;
const state = (s: Snapshot) => s.multiplayer!.shared!;
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
async function launchDeck(p: Cdp) {
    await align(p, 260);
    for (const [x, ground] of [[332,'launch-step-0'],[397,'launch-step-1'],[462,'launch-step-2'],[527,'launch-step-3'],[600,'launch']] as const) await hop(p, x, ground);
}
async function route(url: string, debug: string, reverse: boolean) {
    h.scenario = reverse ? '[reverse] ' : '[full] '; h.shotPrefix = reverse ? 'reverse-' : 'full-';
    const a = await h.page(url, debug), b = await h.page(url, debug), operator = reverse ? b : a, runner = reverse ? a : b;
    await click(a, '[data-create-lab="race-condition"]');
    const created = await wait(a, 'created RACE', s => s.room === 'race-condition' && !!s.multiplayer?.code);
    await click(b, '#join-code'); await b.send('Input.insertText', { text: created.multiplayer!.code }); await click(b, '#join-room');
    await wait(b, 'join discovers RACE', s => s.room === 'race-condition' && state(s).connected.every(Boolean));
    await sleep(800); await shot(a, 'overview');
    for (const p of [a,b]) { await tap(p, 'Space'); await wait(p, 'dismiss overview', s => s.started && !s.overviewVisible); }
    check('named payloads and honest mock controller', Object.keys(created.cubes).length === 2 && created.source === 'mock-multiplayer' && !created.evidence);
    await align(runner, 1760);
    if (reverse) {
        // P1 crosses A en route to B: a genuine solo attempt misses the window.
        await wait(runner, 'solo cargo attempt times out', s => !!state(s).cubes.cubeA?.lastReset);
        const failed = await snapshot(runner);
        check('solo travel times out A without resetting B or either body',
            state(failed).cubes.cubeA!.lastReset!.cause === 'firewall'
            && state(failed).cubes.cubeB!.epoch === state(created).cubes.cubeB!.epoch
            && failed.deaths === 0 && (await snapshot(operator)).deaths === 0);
    }
    await align(operator, 180);
    await wait(operator, 'cube lands on buffer', s => state(s).levelState.buffer.phase === 'window');
    await align(operator, 80); await align(runner, 1880);
    await wait(operator, 'accepted receiver delivery', s => state(s).levelState.inputs.payloadDelivered);
    for (const p of [operator, runner]) await wait(p, 'receiver cube settles visibly', s => !!s.cubes.cubeA?.grounded && Math.abs(s.cubes.cubeA.y - 1018) < 1);
    check('cargo delivered by timed A release / B press', state(await snapshot(operator)).cubePlacements.cubeA === 'receiver' && state(await snapshot(runner)).cubePlacements.cubeA === 'receiver');
    await launchDeck(operator); await align(operator, 615);
    await launchDeck(runner); await align(runner, 705);
    await wait(runner, 'trace powers phase A', s => state(s).levelState.outputs.phaseA);
    await key(runner, 'KeyD', true); await mouse(runner, 1005, 365, true);
    await wait(runner, 'hook 1', s => s.player.rope.anchorId === 'span1');
    check('first substantial grapple attached', true);
    const anchors = [{id:'crumbleA', x:1505, y:305}, {id:'span3',x:2005,y:365}, {id:'crumbleB',x:2505,y:305}, {id:'span5',x:3005,y:365}];
    for (const [i, target] of anchors.entries()) {
        await wait(runner, 'forward swing for transfer', s => s.player.x > s.player.rope.anchor.x + 90 && s.player.vx > 450 && s.player.vy < 0, 3500);
        await tap(operator, 'KeyE');
        await wait(runner, 'accepted next phase', s => state(s).levelState.inputs.phase === (i % 2 === 0));
        await tap(runner, 'Space'); await mouse(runner, target.x, target.y, false);
        await mouse(runner, target.x, target.y, true);
        await wait(runner, `catch ${target.id}`, s => s.player.rope.anchorId === target.id, 3000);
        if (target.id === 'crumbleA' || target.id === 'crumbleB') {
            await wait(operator, 'shared unstable fuse', s => state(s).levelState.platforms[target.id as 'crumbleA' | 'crumbleB'].phase === 'warning');
            check(`${target.id} fuse shared at 1.55 seconds`, state(await snapshot(operator)).levelState.platforms[target.id as 'crumbleA' | 'crumbleB'].durationMs === 1550);
        }
        check(`real swing catches ${target.id}`, !(await snapshot(runner)).player.grounded);
    }
    check('all four deliberate transfers retain the airborne chain', (await snapshot(runner)).player.ropeJumpAnchors.join(',') === 'span1,crumbleA,span3,crumbleB');
    await wait(runner, 'last arc', s => s.player.x > s.player.rope.anchor.x + 90 && s.player.vx > 450 && s.player.vy < 0, 3500);
    await tap(runner, 'Space'); await mouse(runner, 3005,365,false);
    await wait(runner, 'right deck landing', s => s.player.groundId === 'right-deck', 4000);
    await key(runner,'KeyD',false); await sleep(160); await shot(runner,'right-deck');
    check('runner crossed all five blocks, no floor or death shortcut', (await snapshot(runner)).deaths === 0);
    await pickup(runner,'cubeB'); await place(runner,'cubeB',3470,'return');
    await hop(runner,3580); await wait(operator,'cube holds return', s => state(s).levelState.inputs.returnOccupied);
    await walk(operator,3360); await wait(runner,'trace ghosts after operator leaves', s => !state(s).levelState.outputs.spanMaster);
    check('Cube B substitutes for a body on RETURN', state(await snapshot(runner)).cubePlacements.cubeB === 'return' && state(await snapshot(runner)).levelState.outputs.returnBridge);
    await pickup(runner,'cubeB'); await align(runner,3750);
    await wait(operator,'bridge reverses when cube removed', s => !state(s).levelState.physical.returnBridge);
    await align(operator,3750); await wait(operator,'partner cube support', s => !!s.multiplayer?.partnerCubeSupportActive);
    await key(operator,'Space',true); await wait(operator,'real landing on held B', s => !!s.multiplayer?.groundedOnPartnerCube);
    await key(operator,'Space',false); await sleep(100); await hop(operator,3870,'commit-ledge');
    await align(operator,4000); await tap(operator,'KeyE'); await wait(runner,'commit plus receiver unlocks',s=>s.outputs.exitDoor);
    await shot(operator,'commit');
    // Drop back to the same right deck. Both must independently enter the door.
    await walk(operator,3780); await wait(operator,'back on right deck',s=>s.player.groundId==='right-deck');
    await walk(operator,4050); await wait(runner,'one arrival only',s=>state(s).reachedExit.filter(Boolean).length===1);
    check('one arrival cannot complete',!state(await snapshot(runner)).completed);
    await walk(runner,4070); await wait(operator,'two arrivals complete',s=>state(s).completed);
    check('RACE complete using real controls', state(await snapshot(runner)).completed);
    await shot(operator,'complete');
}
try {
    const url = process.argv[2] ?? await h.startServer(), debug = await h.launch();
    if (!process.env.BN_RACE_REVERSE_ONLY) await route(url, debug, false);
    if (!process.env.BN_RACE_FORWARD_ONLY) await route(url, debug, true);
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
