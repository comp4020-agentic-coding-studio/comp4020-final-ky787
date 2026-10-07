#!/usr/bin/env node
/** Focused two-context mechanics routes. All gameplay uses keyboard/mouse; diagnostics are read-only. */
import { once } from 'node:events';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coopBrowser, type Cdp, type GameSnapshot } from './coop-browser.ts';
import { isCoopLevel } from '../src/coop/protocol.ts';
const level = process.argv[2];
if (!isCoopLevel(level) || level === 'pairing-bay') throw new Error('Choose relay-lab, lift-lab or crumble-lab');
const h = await coopBrowser({ shots: process.argv[4] });
const { key, tap, walk, wait, snapshot, check, click, mouse, shot, sleep } = h;
const labState = (s: GameSnapshot) => s.multiplayer?.shared;
const crumble = (s: GameSnapshot, id: string) => s.platforms.find(p => p.id === id)!;
async function hop(p: Cdp, x: number) {
    await key(p, 'Space', true);
    try { await walk(p, x); } finally { await key(p, 'Space', false); }
    await wait(p, 'hop lands', s => s.player.grounded);
}
async function pickup(p: Cdp) {
    const at = (await snapshot(p)).cube!;
    await walk(p, at.x - 48); await tap(p, 'KeyE');
    await wait(p, 'pickup accepted', s => !s.multiplayer?.pendingCubeAction && s.multiplayer?.cubeHolder === s.multiplayer?.slot);
}
async function transit(p: Cdp, forward: boolean) {
    await sleep(700);
    const direction = forward ? 'KeyD' : 'KeyA';
    if (!forward) await key(p, 'Space', true);
    await key(p, direction, true);
    try { await wait(p, 'relay transit', s => forward ? s.player.x > 1036 : s.player.x < 450); }
    finally { await key(p, direction, false); if (!forward) await key(p, 'Space', false); }
    await sleep(100);
}
async function finish(a: Cdp, b: Cdp, x: number) {
    await walk(a, x);
    await wait(b, 'first arrival', s => !!s.multiplayer?.shared?.reachedExit[0]);
    check('one physical arrival cannot complete', !labState(await snapshot(b))?.completed);
    await walk(b, x + 55);
    await wait(a, 'two physical arrivals', s => !!s.multiplayer?.shared?.completed);
    await wait(b, 'both clients complete', s => !!s.multiplayer?.shared?.completed);
    check('two distinct physical arrivals complete on both clients', true);
}
async function relay(a: Cdp, b: Cdp, actorSlot: 1 | 2) {
    const actor = actorSlot === 1 ? a : b, partner = actorSlot === 1 ? b : a;
    await hop(partner, 375); await tap(partner, 'KeyE');
    await wait(actor, 'shared relay power', s => s.outputs.relayGates);
    check('either operator powers both local gate pairs', (await snapshot(partner)).gates.every(g => g.enabled));
    await pickup(actor); await walk(actor, 407); await tap(actor, 'KeyE');
    await wait(actor, 'loose cargo accepted', s => !s.multiplayer?.pendingCubeAction && s.multiplayer?.cubeHolder === null);
    const epoch = (await snapshot(actor)).multiplayer!.cubeEpoch;
    const loose = await wait(partner, 'remote loose cube relay snap', s => s.multiplayer?.lastCubeDiscontinuity?.kind === 'relay' && !!s.cube && s.cube.x > 1036);
    check('one loose cube snaps and keeps its simulator/epoch', loose.multiplayer?.cubePhysicsAuthority === actorSlot && loose.multiplayer?.cubeEpoch === epoch && !loose.cube?.carried);
    await transit(actor, true);
    const remote = await wait(partner, 'remote avatar relay snap', s => s.multiplayer?.lastRemoteDiscontinuity?.kind === 'relay' && (s.multiplayer.remote?.x ?? 0) > 1036);
    check('remote avatar appears at destination with an explicit marker', remote.multiplayer!.lastRemoteDiscontinuity!.x > 1036);
    await shot(partner, 'relay-loose-and-player');
    // Pick up at the destination, then transport the carried body in both directions.
    await wait(actor, 'destination landing', s => s.player.grounded);
    await tap(actor, 'KeyE'); await wait(actor, 'destination pickup', s => s.multiplayer?.cubeHolder === actorSlot && !s.multiplayer.pendingCubeAction);
    const carryEpoch = (await snapshot(actor)).multiplayer!.cubeEpoch;
    await transit(actor, false);
    await wait(partner, 'carried return arrives together', s => (s.multiplayer?.remote?.x ?? 9999) < 450 && !!s.cube?.carried && Math.abs(s.cube.x - s.multiplayer!.remote!.x) < 2);
    await transit(actor, true);
    const carried = await wait(partner, 'carried forward arrives together', s => (s.multiplayer?.remote?.x ?? 0) > 1036 && !!s.cube?.carried && Math.abs(s.cube.x - s.multiplayer!.remote!.x) < 2);
    check('carried cube follows snapped holder without ownership transfer', carried.multiplayer?.cubeHolder === actorSlot && carried.multiplayer.cubePhysicsAuthority === actorSlot && carried.multiplayer.cubeEpoch === carryEpoch);
    await walk(actor, 1190);
    await transit(partner, true); await walk(partner, 1150);
    await shot(actor, 'relay-carried');
    await finish(a, b, 1340);
}
async function lift(a: Cdp, b: Cdp, riderSlot: 1 | 2) {
    const rider = riderSlot === 1 ? a : b, operator = riderSlot === 1 ? b : a;
    await walk(operator, 245);
    await hop(operator, 440);
    await walk(operator, 440);
    await wait(rider, 'lower control powers shared lift', s => s.outputs.liftField);
    check('either player holds the lower control', true);
    await pickup(rider); await walk(rider, 510); await tap(rider, 'KeyE');
    await wait(rider, 'loose cube lifts', s => !s.multiplayer?.pendingCubeAction && !s.cube?.carried && s.cube!.y < 690);
    const cube = await wait(operator, 'replicated loose ascent', s => !!s.cube && s.cube.y < 650);
    check('loose cube rises with one physics authority', cube.multiplayer?.cubePhysicsAuthority === riderSlot);
    await walk(rider, 640); await wait(rider, 'first player reaches lift top', s => s.player.y < 360);
    const remote = await wait(operator, 'partner sees vertical ascent', s => (s.multiplayer?.remote?.y ?? 1000) < 390);
    check('partner sees lift motion', remote.multiplayer!.remote!.y < 390);
    // Retrieve the hovering cube, then step onto the upper deck and drop before latching.
    await walk(rider, 570); await tap(rider, 'KeyE');
    await wait(rider, 'upper cube pickup', s => s.multiplayer?.cubeHolder === riderSlot);
    await walk(rider, 790); await wait(rider, 'upper landing', s => s.player.grounded && s.player.groundId === 'upper');
    await walk(rider, 945); await tap(rider, 'KeyE');
    await wait(rider, 'upper drop accepted', s => !s.multiplayer?.pendingCubeAction && s.multiplayer?.cubeHolder === null);
    await walk(rider, 800); await tap(rider, 'KeyE');
    const checkpoint = await wait(operator, 'shared upper checkpoint', s => s.multiplayer?.checkpoint === 'upper');
    check('checkpoint update leaves lower partner in place', checkpoint.player.y > 800 && checkpoint.outputs.liftField);
    const riderAt = (await snapshot(rider)).player;
    await tap(operator, 'KeyR'); const reset = await wait(operator, 'local reset uses upper checkpoint', s => s.deaths === 1 && s.player.y < 400);
    check('reset moves only the resetting player to their upper slot', Math.abs(reset.player.x - (riderSlot === 1 ? 885 : 790)) < 2 && Math.abs((await snapshot(rider)).player.x - riderAt.x) < 2);
    // The operator still rides physically: walk left off the upper ledge, fall outside the shaft, then enter it.
    await walk(operator, 760); await key(operator, 'KeyA', true);
    try { await wait(operator, 'leave shaft to descend', s => s.player.x < 490); } finally { await key(operator, 'KeyA', false); }
    await wait(operator, 'lower landing', s => s.player.y > 800 && s.player.grounded);
    await walk(operator, 640); await wait(operator, 'second player rides latched lift', s => s.player.y < 360);
    check('second player rides after lower control releases', (await snapshot(rider)).outputs.liftField);
    await walk(operator, 800); await wait(operator, 'second upper landing', s => s.player.grounded);
    // Carry the cube down outside the field, then ride up: it gets no separate force.
    await pickup(rider); await walk(rider, 490); await wait(rider, 'carried descent lands', s => s.player.grounded && s.player.y > 800);
    await walk(rider, 640); const carried = await wait(rider, 'carried lift ascent', s => s.player.y < 600);
    check('carried cube keeps its offset and holder', carried.cube!.carried && Math.abs(carried.cube!.y - (carried.player.y - 43)) < 1 && carried.multiplayer?.cubeHolder === riderSlot);
    await wait(rider, 'carried lift top', s => s.player.y < 360); await walk(rider, 850);
    await shot(operator, 'lift-upper-checkpoint');
    // Fall through the lower reset field while carrying; the partner stays on the upper deck.
    const partnerAt = (await snapshot(operator)).player, deaths = (await snapshot(rider)).deaths;
    await walk(rider, 490); await wait(rider, 'lower descent before death', s => s.player.grounded && s.player.y > 800);
    await key(rider, 'KeyD', true);
    try { await wait(rider, 'ordinary death returns upper', s => s.deaths > deaths); } finally { await key(rider, 'KeyD', false); }
    await wait(rider, 'death releases cube', s => s.multiplayer?.cubeHolder === null && !s.multiplayer.pendingCubeAction);
    check('ordinary death releases carry and respawns upper without resetting partner', (await snapshot(rider)).player.y < 400 && Math.abs((await snapshot(operator)).player.x - partnerAt.x) < 2);
    await finish(a, b, 1090);
}
async function crumbleRoute(a: Cdp, b: Cdp, triggerSlot: 1 | 2, backend: string) {
    const source = triggerSlot === 1 ? a : b, partner = triggerSlot === 1 ? b : a;
    const startDeaths = (await snapshot(partner)).deaths;
    await walk(source, 505);
    const warned = await wait(partner, 'shared foot warning', s => crumble(s, 'crumbleA').fuse >= 0);
    check('partner sees one shared foot warning', crumble(warned, 'crumbleA').enabled);
    const broken = await wait(partner, 'server collapse', s => !crumble(s, 'crumbleA').enabled);
    await wait(source, 'initiator shares collapse', s => !crumble(s, 'crumbleA').enabled);
    check('authoritative collapse disables collision and hooks on both', !crumble(broken, 'crumbleA').grappleable);
    await wait(source, 'local fall/death', s => s.deaths === 1);
    check('one falling player does not reset partner', (await snapshot(partner)).deaths === startDeaths);
    await wait(partner, 'shared platform respawns', s => crumble(s, 'crumbleA').enabled);
    await walk(source, 400); await hop(source, 780);
    const hookStart = Date.now(); await mouse(source, 925, 320, true);
    await wait(partner, 'shared hook warning', s => crumble(s, 'crumbleB').fuse > .6);
    check('hook warning uses the longer authored delay', true);
    await shot(partner, 'crumble-hook-warning');
    // A refresh during the long warning receives the live phase, never a fresh local fuse.
    await partner.send('Page.reload');
    const rejoined = await wait(partner, 'reconnect receives active phase', s => s.multiplayer?.websocket === 'CONNECTED' && crumble(s, 'crumbleB').fuse >= 0);
    check('reconnect receives remaining shared warning', crumble(rejoined, 'crumbleB').fuse < 1.65);
    await wait(source, 'hook block breaks', s => !crumble(s, 'crumbleB').enabled);
    check('hook collapse waits longer than foot collapse', Date.now() - hookStart >= 1500);
    check('attached local rope cancels at shared collapse', (await snapshot(source)).player.rope.phase !== 'attached');
    await mouse(source, 925, 320, false);
    await wait(partner, 'partner shares hook break', s => !crumble(s, 'crumbleB').enabled);
    if (!process.argv[3]) {
        const old = h.app!, exited = once(old, 'exit'); old.kill('SIGKILL'); await exited;
        await wait(source, 'server loss reconnects', s => s.multiplayer?.websocket === 'RECONNECTING');
        await h.startServer(Number(new URL(backend).port));
        await wait(source, 'restart rejoin', s => s.multiplayer?.websocket === 'CONNECTED');
        const stable = await wait(partner, 'restart partner rejoin', s => s.multiplayer?.websocket === 'CONNECTED');
        check('actual server restart restores ephemeral platforms stable', crumble(stable, 'crumbleA').enabled && crumble(stable, 'crumbleB').enabled && stable.multiplayer?.shared?.exitUnlocked === true);
        await walk(source, 400); await hop(source, 780);
    }
    await walk(partner, 400); await hop(partner, 780);
    await shot(source, 'crumble-restored'); await finish(a, b, 1300);
}
try {
    const backend = process.argv[3] ?? await h.startServer(), base = process.env.BN_TEST_TLS ? await h.tlsOrigin(backend) : backend;
    const debug = await h.launch();
    for (const slot of [1, 2] as const) {
        h.scenario = `[${level} / P${slot} acts] `; h.shotPrefix = `${level}-p${slot}-`;
        const a = await h.page(base, debug), b = await h.page(base, debug);
        const progress = [(await snapshot(a)).progress, (await snapshot(b)).progress];
        await shot(a, 'selector');
        await click(a, `[data-create-lab="${level}"]`);
        const created = await wait(a, 'creator chooses lab', s => s.multiplayer?.websocket === 'CONNECTED' && s.room === level);
        await click(b, '#join-code'); await b.send('Input.insertText', { text: created.multiplayer!.code! }); await click(b, '#join-room');
        const joined = await wait(b, 'join code discovers lab', s => s.multiplayer?.websocket === 'CONNECTED' && s.room === level);
        await wait(a, 'partner connects', s => !!s.multiplayer?.shared?.connected.every(Boolean));
        check('joining by code discovers the selected lab', joined.multiplayer?.level === level && joined.source === 'mock-multiplayer' && !joined.evidence);
        await shot(a, 'entry');
        if (level === 'relay-lab') await relay(a, b, slot);
        if (level === 'lift-lab') await lift(a, b, slot);
        if (level === 'crumble-lab') await crumbleRoute(a, b, slot, backend);
        check('C8 visitor progress remains independent', JSON.stringify([(await snapshot(a)).progress, (await snapshot(b)).progress]) === JSON.stringify(progress));
        await shot(a, 'complete'); await a.send('Page.navigate', { url: 'about:blank' }); await b.send('Page.navigate', { url: 'about:blank' });
    }
    check('no browser exceptions or console errors', h.clients.every(c => !c.errors.length), h.clients.flatMap(c => c.errors).join('\n'));
} catch (e) {
    for (let i = 0; i < h.clients.length; i++) await shot(h.clients[i], `failure-${i}`).catch(() => {});
    process.stderr.write(String(e) + '\n'); process.exitCode = 1;
} finally {
    await writeFile(join(h.shots, level + '-browser.txt'), h.checks.join('\n') + '\n');
    await h.cleanup();
}
