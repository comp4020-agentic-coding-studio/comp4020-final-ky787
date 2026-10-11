#!/usr/bin/env node
/** Focused two-context mechanics routes. All gameplay uses keyboard/mouse; diagnostics are read-only. */
import { once } from 'node:events';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coopBrowser, type Cdp, type GameSnapshot } from './coop-browser.ts';
import { isCoopLevel } from '../src/coop/protocol.ts';
const level = process.argv[2];
if (!isCoopLevel(level) || level === 'pairing-bay' || level === 'crossfeed-vault' || level === 'race-condition') throw new Error('Choose relay-lab, lift-lab, crumble-lab, boost-lab or firewall-lab');
const h = await coopBrowser({ shots: process.argv[4] });
const { key, tap, walk, wait, snapshot, check, click, mouse, shot, sleep } = h;
const labState = (s: GameSnapshot) => s.multiplayer?.shared;
const crumble = (s: GameSnapshot, id: string) => s.platforms.find(p => p.id === id)!;
async function hop(p: Cdp, x: number) {
    await key(p, 'Space', true);
    try { await walk(p, x); } finally { await key(p, 'Space', false); }
    await wait(p, 'hop lands', s => s.player.grounded);
}
async function align(p: Cdp, x: number) {
    let dx = x - (await snapshot(p)).player.x;
    if (Math.abs(dx) > 65) await walk(p, x - Math.sign(dx) * 50);
    for (let n = 0; n < 35; n++) {
        dx = x - (await snapshot(p)).player.x; if (Math.abs(dx) < 4) return;
        const direction = dx > 0 ? 'KeyD' : 'KeyA';
        await key(p, direction, true); await sleep(25); await key(p, direction, false); await sleep(100);
    }
    throw new Error(`Could not align at ${x}`);
}
async function pickup(p: Cdp) {
    const at = (await snapshot(p)).cube!;
    await walk(p, at.x - 34); await tap(p, 'KeyE');
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
    // Stop outside the carried-width gate boundary. Run-speed braking drift
    // must not turn this loose-cargo regression into a carried player transit.
    await pickup(actor); await align(actor, 425);
    await key(actor, 'KeyD', true); await sleep(15); await key(actor, 'KeyD', false); await sleep(100);
    check('loose drop begins outside player relay contact', (await snapshot(actor)).player.x < 446);
    await tap(actor, 'KeyE');
    await wait(actor, 'loose cargo accepted', s => !s.multiplayer?.pendingCubeAction && s.multiplayer?.cubeHolder === null);
    const epoch = (await snapshot(actor)).multiplayer!.cubeEpoch;
    const loose = await wait(partner, 'remote loose cube relay snap', s => s.multiplayer?.lastCubeDiscontinuity?.kind === 'relay' && !!s.cube && s.cube.x > 1036);
    check('one loose cube snaps and keeps its simulator/epoch', loose.multiplayer?.cubePhysicsAuthority === actorSlot && loose.multiplayer?.cubeEpoch === epoch && !loose.cube?.carried);
    await transit(actor, true);
    const remote = await wait(partner, 'remote avatar relay snap', s => s.multiplayer?.lastRemoteDiscontinuity?.kind === 'relay' && (s.multiplayer.remote?.x ?? 0) > 1036);
    check('remote avatar appears at destination with an explicit marker', remote.multiplayer!.lastRemoteDiscontinuity!.x > 1036);
    await shot(partner, 'relay-loose-and-player');
    await wait(actor, 'loose cube settles untouched', s => !!s.cube?.grounded);
    const restingForward = (await snapshot(actor)).cube!;
    await transit(partner, true);
    check('both players transit A to B with untouched loose cargo', Math.abs((await snapshot(actor)).cube!.x - restingForward.x) < 1);
    await walk(partner, 1190);
    // Pick up at the destination, then transport the carried body in both directions.
    await wait(actor, 'destination landing', s => s.player.grounded);
    await tap(actor, 'KeyE'); await wait(actor, 'destination pickup', s => s.multiplayer?.cubeHolder === actorSlot && !s.multiplayer.pendingCubeAction);
    const carryEpoch = (await snapshot(actor)).multiplayer!.cubeEpoch;
    await transit(actor, false);
    await wait(partner, 'carried return arrives together', s => (s.multiplayer?.remote?.x ?? 9999) < 450 && !!s.cube?.carried && Math.abs(s.cube.x - s.multiplayer!.remote!.x) < 2);
    await transit(actor, true);
    const carried = await wait(partner, 'carried forward arrives together', s => (s.multiplayer?.remote?.x ?? 0) > 1036 && !!s.cube?.carried && Math.abs(s.cube.x - s.multiplayer!.remote!.x) < 2);
    check('carried cube follows snapped holder without ownership transfer', carried.multiplayer?.cubeHolder === actorSlot && carried.multiplayer.cubePhysicsAuthority === actorSlot && carried.multiplayer.cubeEpoch === carryEpoch);
    // Drop from a jump beside B so only loose cargo travels back to A.
    await wait(actor, 'carried arrival lands', s => s.player.grounded);
    await walk(actor, 1120);
    // walk() permits stopping drift. Align deliberately, then face the gate;
    // a second short walk can otherwise reverse facing and drop away from B.
    for (let n = 0; n < 25; n++) {
        const dx = 1084 - (await snapshot(actor)).player.x;
        if (Math.abs(dx) < 5) break;
        const direction = dx > 0 ? 'KeyD' : 'KeyA';
        await key(actor, direction, true); await sleep(25); await key(actor, direction, false); await sleep(120);
    }
    await key(actor, 'KeyA', true); await sleep(25); await key(actor, 'KeyA', false); await sleep(120);
    const dropper = (await snapshot(actor)).player;
    check('reverse drop is beside B and facing into its volume', dropper.x > 1068 && dropper.x < 1095 && dropper.facing === -1);
    await key(actor, 'Space', true);
    try {
        await wait(actor, 'jump beside B', s => s.player.y < 548);
        await tap(actor, 'KeyE');
    } finally { await key(actor, 'Space', false); }
    await wait(partner, 'reverse loose cube settles at A', s => !!s.cube?.grounded && s.cube.x < 450 && s.multiplayer?.cubeHolder === null);
    const restingReverse = (await snapshot(partner)).cube!;
    await wait(actor, 'dropper lands beside B', s => s.player.grounded);
    await transit(actor, false);
    await transit(partner, false);
    await sleep(800);
    const reverse = await snapshot(partner);
    check('both players transit B to A without moving cargo or bouncing back', (await snapshot(actor)).player.x < 450 && reverse.player.x < 450
        && Math.abs(reverse.cube!.x - restingReverse.x) < 1 && Math.abs(reverse.cube!.y - restingReverse.y) < 1);
    await tap(actor, 'KeyE'); await wait(actor, 'pick up reverse cargo', s => s.multiplayer?.cubeHolder === actorSlot && !s.multiplayer.pendingCubeAction);
    await transit(actor, true);
    await walk(actor, 1190);
    await transit(partner, true); await walk(partner, 1150);
    await shot(actor, 'relay-carried');
    await finish(a, b, 1340);
}
async function boost(a: Cdp, b: Cdp, holderSlot: 1 | 2) {
    const holder = holderSlot === 1 ? a : b, climber = holderSlot === 1 ? b : a;
    await pickup(holder); await walk(holder, 475);
    await hop(climber, 610);
    check('a normal floor jump cannot reach the high ledge', (await snapshot(climber)).player.groundId === 'floor');
    await walk(climber, 475);
    await wait(climber, 'fresh partner cube support', s => !!s.multiplayer?.partnerCubeSupportActive);
    check('carrier has no self support', !(await snapshot(holder)).multiplayer?.partnerCubeSupportActive);
    async function mount() {
        const x = (await snapshot(climber)).cube!.x;
        await walk(climber, x);
        // Brake and align using real short key presses; the shared walk helper
        // deliberately permits run-speed stopping drift, wider than this cube.
        for (let n = 0; n < 25; n++) {
            const dx = x - (await snapshot(climber)).player.x;
            if (Math.abs(dx) < 8) break;
            const direction = dx > 0 ? 'KeyD' : 'KeyA';
            await key(climber, direction, true); await sleep(35); await key(climber, direction, false); await sleep(100);
        }
        await key(climber, 'Space', true);
        try { await wait(climber, 'lands on partner cube', s => !!s.multiplayer?.groundedOnPartnerCube); }
        finally { await key(climber, 'Space', false); }
    }
    await mount();
    const held = (await snapshot(holder)).multiplayer!;
    await shot(climber, 'held-cube-landing');
    await key(holder, 'KeyD', true); await sleep(35); await key(holder, 'KeyD', false);
    await sleep(200);
    check('slight grounded holder motion keeps support without launching rider', (await snapshot(climber)).multiplayer?.groundedOnPartnerCube === true);
    await tap(holder, 'KeyE');
    const dropped = await wait(climber, 'drop removes support and rider falls', s => s.multiplayer?.cubeHolder === null && !s.multiplayer.partnerCubeSupportActive && s.player.y > 520);
    check('drop releases support without resetting climber', dropped.deaths === 0 && !dropped.cube?.carried);
    await wait(climber, 'climber lands after drop', s => s.player.groundId === 'floor');
    await pickup(holder); await walk(holder, 475); await mount();
    await tap(holder, 'KeyR');
    await wait(climber, 'holder reset releases support', s => s.multiplayer?.cubeHolder === null && !s.multiplayer.partnerCubeSupportActive && s.player.groundId === 'floor');
    check('holder reset preserves partner body', (await snapshot(climber)).deaths === 0);
    await pickup(holder); await walk(holder, 475); await mount();
    await holder.send('Page.navigate', { url: 'about:blank' });
    await wait(climber, 'disconnect releases support', s => s.multiplayer?.cubeHolder === null && !s.multiplayer.partnerCubeSupportActive && !s.multiplayer.shared?.connected[holderSlot - 1]);
    const history = await holder.send('Page.getNavigationHistory');
    await holder.send('Page.navigateToHistoryEntry', { entryId: history.entries[history.currentIndex - 1].id });
    await wait(holder, 'holder reconnects', s => s.multiplayer?.websocket === 'CONNECTED' && s.room === 'boost-lab');
    await wait(climber, 'climber lands after disconnect', s => s.player.groundId === 'floor');
    check('disconnect releases cube without resetting climber', (await snapshot(climber)).deaths === 0);
    await pickup(holder); await walk(holder, 475); await mount();
    // A normal second jump crosses the 190-unit ledge; no grapple or state mutation.
    await key(climber, 'Space', true);
    try { await walk(climber, 635); } finally { await key(climber, 'Space', false); }
    await wait(climber, 'second jump lands upper', s => s.player.groundId === 'upper');
    check('jumping away keeps accepted cube holder and simulator', (await snapshot(holder)).multiplayer?.cubeHolder === holderSlot
        && (await snapshot(holder)).multiplayer?.cubePhysicsAuthority === holderSlot && held.cubeHolder === holderSlot);
    await walk(climber, 720); await tap(climber, 'KeyE');
    await wait(holder, 'shared switch opens return steps', s => s.outputs.bridge && s.multiplayer?.shared?.exitUnlocked === true);
    check('upper switch leaves holder below and opens a permanent return route', (await snapshot(holder)).player.groundId === 'floor');
    await walk(holder, 330);
    // Give each step a full jump before walking toward the next ledge. The
    // short first hop otherwise cuts jump height as soon as its x target is met.
    for (const [x, top, ground] of [[345, 510, 'return-step-low'], [495, 430, 'return-step-high'], [650, 410, 'upper']] as const) {
        await key(holder, 'Space', true);
        try {
            await wait(holder, `return jump clears ${ground}`, s => !s.player.grounded && s.player.y + 17 < top - 4);
            await walk(holder, x);
        } finally { await key(holder, 'Space', false); }
        await wait(holder, `return landing on ${ground}`, s => s.player.grounded && s.player.groundId === ground);
    }
    await wait(holder, 'holder regroups on upper ledge', s => s.player.groundId === 'upper');
    await shot(climber, 'regroup');
    await finish(a, b, 985);
}
async function firewall(a: Cdp, b: Cdp, actorSlot: 1 | 2) {
    const actor = actorSlot === 1 ? a : b, partner = actorSlot === 1 ? b : a;
    async function reclaim(p: Cdp) {
        const s = await snapshot(p), at = s.cube!;
        await walk(p, at.x + (s.player.x > at.x ? 34 : -34)); await tap(p, 'KeyE');
        await wait(p, 'firewall cube pickup', s => !s.multiplayer?.pendingCubeAction && s.multiplayer?.cubeHolder === s.multiplayer?.slot);
    }
    async function perch(p: Cdp) {
        await walk(p, 240); await hop(p, 383);
        await wait(p, 'perch reached from clear jump approach', s => s.player.groundId === 'drop-perch');
    }
    async function faceDropEdge(p: Cdp) {
        // The generic walk helper permits run-speed braking drift. Use short
        // real inputs here so arrival from either side drops off the right edge.
        for (let n = 0; n < 35; n++) {
            const dx = 424 - (await snapshot(p)).player.x;
            if (Math.abs(dx) < 2) break;
            const keyCode = dx > 0 ? 'KeyD' : 'KeyA';
            await key(p, keyCode, true); await sleep(25); await key(p, keyCode, false); await sleep(100);
        }
        await key(p, 'KeyD', true); await sleep(15); await key(p, 'KeyD', false); await sleep(100);
    }
    await walk(actor, 110); await tap(actor, 'KeyE');
    await wait(partner, 'shared checkpoint accepted', s => s.multiplayer?.checkpoint === 'reunion');
    const beams = (await snapshot(actor)).firewalls;
    check('two authored beam orientations and lengths', beams.some(f => f.w === 150 && f.h === 12) && beams.some(f => f.w === 16 && f.h === 80));
    // Fall from the test perch into the horizontal beam; the loose cube stays at spawn.
    const partnerAt = (await snapshot(partner)).player;
    await walk(actor, 210); await hop(actor, 383); const deaths = (await snapshot(actor)).deaths;
    await key(actor, 'KeyD', true);
    try { await wait(actor, 'horizontal beam kills falling player', s => s.deaths === deaths + 1); }
    finally { await key(actor, 'KeyD', false); }
    const respawn = await snapshot(actor);
    check('horizontal death uses the shared checkpoint and firewall cause', respawn.lastDeath?.cause === 'firewall'
        && Math.abs(respawn.player.x - (actorSlot === 1 ? 130 : 220)) < 2);
    check('partner survives in place', (await snapshot(partner)).deaths === 0 && Math.abs((await snapshot(partner)).player.x - partnerAt.x) < 2);
    await walk(partner, 210); await hop(partner, 383); await hop(partner, 530); await walk(partner, 790);
    await key(partner, 'KeyD', true);
    try { await wait(partner, 'vertical beam kills walker', s => s.deaths === 1); }
    finally { await key(partner, 'KeyD', false); }
    check('second player dies independently at vertical beam', (await snapshot(partner)).lastDeath?.firewallId === 'vertical-test'
        && (await snapshot(actor)).deaths === deaths + 1);
    async function resetOnBoth(epoch: number) {
        for (const p of [a, b]) {
            const s = await wait(p, 'accepted cube reset to original spawn', s => !!s.multiplayer?.lastCubeReset
                && s.multiplayer.lastCubeReset.epoch > epoch && !s.multiplayer.pendingCubeAction && !s.cubeResetting
                && !!s.cube && Math.abs(s.cube.x - 280) < 2 && Math.abs(s.cube.y - 618) < 2);
            check('one shared cube restored with carry and pull cleared', s.multiplayer?.cubeHolder === null && !s.multiplayer.shared?.cube?.pulling && !s.cube!.carried);
        }
    }
    // A perch lets the loose body fall into the beam while its former holder stays safe.
    await reclaim(actor); await perch(actor);
    await wait(actor, 'drop perch landing', s => s.player.groundId === 'drop-perch');
    await faceDropEdge(actor);
    const dropEpoch = (await snapshot(actor)).multiplayer!.cubeEpoch!;
    await tap(actor, 'KeyE'); await resetOnBoth(dropEpoch);
    check('dropped loose cube is destroyed without harming its dropper', (await snapshot(actor)).deaths === deaths + 1);
    await shot(actor, 'loose-cube-reset');
    // Either slot can hold the cube into the beam while their own body fits below it.
    for (const holder of [actor, partner]) {
        await reclaim(holder);
        const before = await snapshot(holder), epoch = before.multiplayer!.cubeEpoch!;
        await walk(holder, 500); await resetOnBoth(epoch);
        check('held cube alone touches: holder lives and both see reset', (await snapshot(holder)).deaths === before.deaths);
    }
    // Pull from the far side of the vertical beam: body stays safe, cargo crosses it.
    await reclaim(actor); await perch(actor); await hop(actor, 530); await walk(actor, 700);
    check('safe overpass preserves carried cube', (await snapshot(actor)).multiplayer?.cubeHolder === actorSlot);
    await wait(actor, 'safe landing beyond horizontal beam', s => s.player.groundId === 'floor');
    await walk(actor, 700);
    await key(actor, 'KeyA', true); await sleep(15); await key(actor, 'KeyA', false); await sleep(100);
    await tap(actor, 'KeyE'); // Put cargo behind the player so it cannot block the approach jump.
    await wait(actor, 'loose drop before pull', s => !s.multiplayer?.pendingCubeAction && s.multiplayer?.cubeHolder === null);
    await align(actor, 790); await hop(actor, 970);
    const cargo = (await snapshot(actor)).cube!, pullEpoch = (await snapshot(actor)).multiplayer!.cubeEpoch!;
    await mouse(actor, cargo.x, cargo.y, true);
    try { await resetOnBoth(pullEpoch); } finally { await mouse(actor, cargo.x, cargo.y, false); }
    check('grapple-pulled destruction clears rope and pull feedback', !(await snapshot(actor)).pullingCube
        && (await snapshot(actor)).player.rope.phase !== 'attached');
    await shot(actor, 'pulled-cube-reset');
    // Both routes remain easy to traverse after repeated independent recovery.
    for (const p of [a, b]) if ((await snapshot(p)).player.x < 880) {
        await align(p, 790); await hop(p, 970);
    }
    await finish(a, b, 1290);
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
        if (level === 'boost-lab') await boost(a, b, slot);
        if (level === 'firewall-lab') await firewall(a, b, slot);
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
