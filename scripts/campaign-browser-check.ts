#!/usr/bin/env node
/** One persistent party, two real-input chamber solves, reconnect and crash recovery. */
import { writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { join } from 'node:path';
import { coopBrowser, type Cdp } from './coop-browser.ts';
import { crossfeedRoute } from './crossfeed-browser-check.ts';
import { raceRoute } from './race-browser-check.ts';

const h = await coopBrowser({ shots: process.env.BN_SHOTS ?? '/tmp/bn-campaign-shots', internalLabs: false });
const { check, click, snapshot, wait, sleep, shot, tap } = h;
const visible = (p: Cdp, selector: string) => p.read<boolean>(`!!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).closest('[hidden]')`);
try {
    const url = await h.startServer(), debug = await h.launch();
    const a = await h.page(url, debug), b = await h.page(url, debug);
    check('public menu keeps four tutorial rooms and hides internal labs', await a.read("document.querySelectorAll('[data-room]').length === 4 && !document.querySelector('[data-create-lab]') && !!document.querySelector('#create-party')"));
    await click(a, '#create-party'); const first = await wait(a, 'party lobby', s => s.multiplayer?.shared?.party?.phase === 'lobby');
    const code = first.multiplayer!.code!;
    await click(b, '#join-code'); await b.send('Input.insertText', { text: code }); await click(b, '#join-room');
    await wait(b, 'guest joins lobby', s => s.multiplayer?.shared?.connected.every(Boolean) === true);
    check('creator is host; lobby guest waits with no start controls', (await snapshot(a)).multiplayer?.host === true
        && (await snapshot(b)).multiplayer?.host === false && !(await visible(b, '[data-select-level]')));
    check('guest selection is refused locally', await b.read("binaryNinja.coop.selectLevel('race-condition') === false"));
    // Exercise the wire permission boundary, without changing world/controller state.
    await b.read("(()=>{const c=binaryNinja.coop;c.socket.send(JSON.stringify({type:'select-level',seq:++c.actionSeq,levelInstance:c.room.levelInstance,level:'race-condition'}));})()");
    await sleep(150); check('forged guest request leaves both in lobby', (await snapshot(a)).multiplayer?.shared?.party?.phase === 'lobby');
    await shot(a, 'host-lobby'); await shot(b, 'guest-lobby');
    await click(a, '[data-select-level="crossfeed-vault"]');
    for (const p of [a, b]) {
        const s = await wait(p, 'same-party Crossfeed overview', s => s.room === 'crossfeed-vault' && s.multiplayer?.shared?.party?.phase === 'playing' && s.overviewVisible);
        check('fresh two-cube world on the existing socket', s.multiplayer!.code === code && s.multiplayer!.levelInstance === 2 && Object.keys(s.cubes).length === 2 && !s.multiplayer!.pendingCubeAction);
    }
    // Guest on pause/overview while host selects another chamber, then restarts.
    await click(b, '#pause'); await click(a, '#pause'); await click(a, '#choose-chamber'); await click(a, '[data-select-level="race-condition"]');
    for (const p of [a, b]) await wait(p, 'paused guest transitions automatically', s => s.room === 'race-condition' && s.overviewVisible && s.multiplayer?.levelInstance === 3);
    await click(a, '#pause'); await click(a, '#choose-chamber'); await click(a, '[data-select-level="crossfeed-vault"]');
    for (const p of [a, b]) await wait(p, 'return to fresh Crossfeed', s => s.room === 'crossfeed-vault' && s.overviewVisible && s.multiplayer?.levelInstance === 4);
    await crossfeedRoute(h, url, debug, false, [a, b]);
    for (const p of [a, b]) {
        await wait(p, 'shared victory pauses gameplay', s => s.multiplayer?.shared?.party?.phase === 'victory' && !s.started);
        check('victory overlay visible', await visible(p, '#party-victory'));
    }
    check('host gets NEXT, guest waits', await visible(a, '#next-chamber') && !(await visible(b, '#next-chamber'))
        && await b.read("document.querySelector('#party-status').textContent.includes('WAITING FOR HOST')"));
    await shot(a, 'crossfeed-victory-host'); await shot(b, 'crossfeed-victory-guest');
    const oldInstance = (await snapshot(a)).multiplayer!.levelInstance!;
    await click(a, '#next-chamber');
    for (const p of [a, b]) await wait(p, 'NEXT synchronizes Race under same code', s => s.room === 'race-condition' && s.overviewVisible && s.multiplayer?.code === code && s.multiplayer.levelInstance === oldInstance + 1);
    await a.read(`(()=>{const c=binaryNinja.coop;c.socket.send(JSON.stringify({type:'occupancy',seq:++c.actionSeq,levelInstance:${oldInstance},plate:'dropA'}));c.socket.send(JSON.stringify({type:'cube',cubeId:'cubeA',seq:99999,epoch:c.room.cubes.cubeA.epoch,levelInstance:${oldInstance},transform:{x:99,y:99,vx:0,vy:0,grounded:true}}));})()`);
    await sleep(150);
    check('old chamber traffic cannot alter new machinery/cubes', await a.read("!binaryNinja.coop.room.levelState.inputs.dropA && binaryNinja.coop.room.cubes.cubeA.seq < 99999 && binaryNinja.world.cubes.cubeA.x === 205 && binaryNinja.world.cubes.cubeA.y === 478"));
    await raceRoute(h, url, debug, false, [a, b]);
    check('last chamber shows campaign complete without a fictitious next level', await a.read("document.querySelector('#party-victory').textContent.includes('CAMPAIGN COMPLETE') && !document.querySelector('#next-chamber')"));
    for (const p of [a, b]) check('both badges saved on same party', (await snapshot(p)).multiplayer!.shared!.party!.completedLevels.length === 2);
    await shot(a, 'campaign-complete');

    async function restart(label: string) {
        const child = h.app!, exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
        await h.startServer(Number(new URL(url).port));
        for (const p of [a, b]) await wait(p, label, s => s.multiplayer?.websocket === 'CONNECTED' && s.multiplayer.shared?.connected.every(Boolean) === true, 15000);
    }
    await restart('SIGKILL victory reconnect');
    for (const p of [a, b]) check('restart restores victory and badges', await visible(p, '#party-victory') && (await snapshot(p)).multiplayer!.shared!.party!.completedLevels.length === 2);
    await a.read('binaryNinja.coop.leave(false)');
    await wait(b, 'guest retains party while host disconnected', s => s.multiplayer?.shared?.connected[0] === false);
    check('guest has host-disconnected message and no selection', await b.read("document.querySelector('#party-status').textContent.includes('HOST DISCONNECTED') && !document.querySelector('[data-select-level]')"));
    await a.send('Page.reload'); await wait(a, 'same visitor returns as host', s => s.multiplayer?.host === true && s.multiplayer.websocket === 'CONNECTED');
    await click(a, '#choose-chamber');
    check('completed badges remain in selector', await a.read("[...document.querySelectorAll('.campaign-chamber small')].every(e => e.textContent.includes('COMPLETE'))"));
    await click(a, '[data-select-level="crossfeed-vault"]');
    for (const p of [a, b]) await wait(p, 'replay starts fresh and keeps badges', s => s.room === 'crossfeed-vault' && s.overviewVisible && !s.multiplayer!.shared!.completed && s.multiplayer!.shared!.party!.completedLevels.length === 2);
    await b.read('binaryNinja.coop.leave(false)'); await wait(a, 'guest disconnect', s => s.multiplayer?.shared?.connected[1] === false);
    await b.send('Page.reload'); await wait(b, 'same visitor returns as guest', s => s.multiplayer?.slot === 2 && s.multiplayer.websocket === 'CONNECTED');
    await restart('SIGKILL playing reconnect');
    for (const p of [a, b]) check('playing restart keeps chamber/code/progress', (await snapshot(p)).multiplayer!.code === code
        && (await snapshot(p)).multiplayer!.shared!.party!.phase === 'playing' && (await snapshot(p)).multiplayer!.shared!.party!.completedLevels.length === 2);
    // Resuming from a pause preserves the first-entry overview.
    await click(b, '#pause'); await click(b, '#continue'); await tap(b, 'Space');
    await wait(b, 'guest resumes after overview', s => s.started);
    for (const p of [a, b]) check('no browser runtime errors', p.errors.length === 0, p.errors.join('\n'));
    await writeFile(join(h.shots, 'checks.txt'), h.checks.join('\n') + '\n');
} catch (e) {
    for (const [i, p] of h.clients.entries()) { await shot(p, `failure-${i}`).catch(() => {}); await writeFile(join(h.shots, `failure-${i}.json`), JSON.stringify(await snapshot(p).catch(() => null), null, 2)); }
    console.error(String(e).split(': {')[0]); process.exitCode = 1;
} finally { await h.cleanup(); }
