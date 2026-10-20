#!/usr/bin/env node
/** Observe a real DEADLOCK solve and a second independent party using authenticated SSE. */
import { randomBytes } from 'node:crypto';
import { writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { coopBrowser, type Cdp } from './coop-browser.ts';
import { onboardNinja } from './character-onboarding.ts';
import { campaignDraftRoute } from './campaign-draft-route.ts';
import type { TelemetrySnapshot } from '../server/telemetry.ts';

const external = process.env.BN_BASE_URL;
const token = external ? process.env.OBSERVABILITY_TOKEN : randomBytes(32).toString('base64url');
if (!token) throw new Error('OBSERVABILITY_TOKEN must be supplied privately for production verification.');
if (!external) process.env.OBSERVABILITY_TOKEN = token;
const h = await coopBrowser({ shots: process.env.BN_SHOTS ?? '/tmp/bn-observability-shots', internalLabs: false, onboarding: false,
    readyExpression: "!!globalThis.binaryNinja?.snapshot().persistence.visitor || !!document.querySelector('#ops-login')" });
const { check, click, wait, snapshot, sleep, shot } = h;
async function until(p: Cdp, label: string, expression: string, timeout = 15000) {
    const deadline = Date.now() + timeout;
    while (!await p.read<boolean>(expression)) {
        if (Date.now() > deadline) throw new Error(label);
        await sleep(40);
    }
}
const data = (p: Cdp) => p.read<TelemetrySnapshot>("fetch('/api/ops/snapshot',{cache:'no-store'}).then(r=>r.json())");
try {
    const url = external ?? await h.startServer(), debug = await h.launch();
    for (const route of ['snapshot', 'events']) check(`anonymous ${route} is denied`, (await fetch(new URL(`/api/ops/${route}`, url))).status === 401);
    const ops = await h.page(new URL('/ops', url).href, debug);
    await shot(ops, '01-locked');
    await click(ops, '#ops-token'); await ops.send('Input.insertText', { text: 'incorrect-local-test-value' }); await click(ops, '#ops-login-button');
    await until(ops, 'invalid login rejected', "document.querySelector('#ops-auth-error').textContent.length > 0");
    check('invalid credential cannot unlock dashboard', await ops.read("document.querySelector('#ops-dashboard').hidden"));
    await click(ops, '#ops-token'); await ops.send('Input.insertText', { text: token }); await click(ops, '#ops-login-button');
    await until(ops, 'authenticated initial SSE snapshot', "document.querySelector('#ops-status').textContent==='LIVE' && !document.querySelector('#ops-dashboard').hidden");
    check('credential cleared from DOM and absent from URL', await ops.read("document.querySelector('#ops-token').value==='' && !location.search && !location.hash"));
    const baseline = await data(ops);
    const a = await h.page(url, debug), b = await h.page(url, debug), c = await h.page(url, debug), d = await h.page(url, debug);
    for (const [page, name, colour] of [[a,'ShadowByte','purple'],[b,'ZeroDay','orange'],[c,'ShadowByte','cyan'],[d,'TraceLoop','lime']] as const)
        await onboardNinja(page, name, colour);
    async function party(host: Cdp, guest: Cdp) {
        await click(host, '#create-party');
        const room = await wait(host, 'party lobby', s => s.multiplayer?.shared?.party?.phase === 'lobby');
        await click(guest, '#join-code'); await guest.send('Input.insertText', { text: room.multiplayer!.code! }); await click(guest, '#join-room');
        await wait(guest, 'guest connected', s => s.multiplayer?.shared?.connected.every(Boolean) === true);
        return room.multiplayer!.code!;
    }
    const codeA = await party(a, b), codeB = await party(c, d);
    await until(ops, 'two parties appear through live SSE', `Number(document.querySelector('[data-metric="connectedPlayers"]').textContent)>=${baseline.metrics.connectedPlayers + 4} && document.querySelectorAll('#ops-sessions article').length>=${baseline.sessions.length + 2}`);
    const lobby = await data(ops);
    const matching = lobby.sessions.filter(s => s.players.some(p => p.name === 'ZeroDay' || p.name === 'TraceLoop'));
    check('two same-name players distinguished by opaque session and slot', matching.length >= 2 && new Set(matching.map(s=>s.sessionRef)).size>=2);
    check('public telemetry has no room-join codes', !JSON.stringify(lobby).includes(codeA) && !JSON.stringify(lobby).includes(codeB));
    await shot(ops, '02-two-parties');
    await click(c, '[data-select-level="handshake"]');
    await wait(c, 'second party playing', s=>s.room==='handshake' && s.overviewVisible);
    await click(a, '[data-select-level="deadlock"]');
    for (const p of [a,b]) await wait(p,'DEADLOCK overview',s=>s.room==='deadlock' && s.overviewVisible);
    await until(ops, 'chamber selection visible live', "document.querySelector('#ops-sessions').textContent.includes('DEADLOCK') && document.querySelector('#ops-sessions').textContent.includes('HANDSHAKE')");
    await shot(ops, '03-active-chambers');
    const originalShot = h.shot;
    // Observe snapshots only: the canonical route drives keyboard/mouse and never injects game state.
    h.shot = async (_page, name) => {
        if (name.endsWith('-operator')) {
            if (name.includes('stage-06')) {
                await until(ops,'payloads visible on dashboard',"document.querySelectorAll('#ops-events [data-event=payload_docked]').length>=3");
                await originalShot(ops,'04-payload-deliveries');
            }
            if (name.includes('stage-08')) await originalShot(ops,'05-completed');
        }
    };
    await campaignDraftRoute(h, 'deadlock', [a,b]);
    h.shot = originalShot;
    await until(ops, 'completion visible without refresh', `Number(document.querySelector('[data-metric="completedChambers"]').textContent)>=${baseline.metrics.completedChambers+1} && !!document.querySelector('#ops-events [data-event=chamber_completed]')`);
    const solved = await data(ops);
    await writeFile(join(h.shots,'dashboard-snapshot.json'),JSON.stringify(solved,null,2)+'\n');
    const events = solved.events.filter(e=>e.chamber==='deadlock');
    check('real receiver transitions recorded with three distinct payloads', new Set(events.filter(e=>e.event==='payload_docked').map(e=>e.cubeId)).size===3);
    check('HATCH toggle, plates, lift, exit unlock and both arrivals visible', ['control_toggled','pressure_plate_activated','lift_power_changed','exit_unlocked'].every(kind=>events.some(e=>e.event===kind)) && new Set(events.filter(e=>e.event==='player_reached_exit').map(e=>e.playerSlot)).size===2);
    check('both names attached to their correct slots', events.some(e=>e.player==='ShadowByte' && e.playerSlot===1) && events.some(e=>e.player==='ZeroDay' && e.playerSlot===2));
    check('history bounded and no transform events', solved.events.length<=250 && !solved.events.some(e=>['avatar','cube_transform','heartbeat'].includes(e.event)));
    await shot(ops,'05-completed');
    const expected = solved.metrics.connectedPlayers;
    await b.read('binaryNinja.coop.leave(false)');
    await until(ops,'disconnect updates current player gauge',`Number(document.querySelector('[data-metric="connectedPlayers"]').textContent)===${expected-1}`);
    await b.send('Page.reload'); await wait(b,'same identity reconnected',s=>s.multiplayer?.websocket==='CONNECTED' && s.multiplayer.slot===2);
    await until(ops,'reconnect live event',"!!document.querySelector('#ops-events [data-event=player_reconnected]')");
    check('reconnection does not duplicate completion', (await data(ops)).metrics.completedChambers === solved.metrics.completedChambers);
    // Browser network loss tests EventSource retry using the same authenticated session.
    await ops.send('Network.enable'); await ops.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    await sleep(500);
    await ops.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    await until(ops,'SSE reconnects after network interruption',"document.querySelector('#ops-status').textContent==='LIVE'",20000);
    await ops.send('Page.reload'); await until(ops,'cookie restores administrator after reload',"document.querySelector('#ops-status').textContent==='LIVE' && !document.querySelector('#ops-dashboard').hidden");
    check('names rendered as text without injected elements', await ops.read("[...document.querySelectorAll('.player-name')].every(e=>e.children.length===0)"));
    await shot(ops,'06-reconnected');
    for (const p of [a,b,c,d]) check('game has no browser runtime errors',p.errors.length===0,p.errors.join('\n'));
    await click(ops,'#ops-logout');
    check('logout revokes data access', await ops.read("fetch('/api/ops/snapshot').then(r=>r.status===401)"));
    await writeFile(join(h.shots,'checks.txt'),h.checks.join('\n')+'\n');
    // The reused physical-route report contains test identities; retain only private-safe dashboard evidence.
    await rm(join(h.shots,'deadlock-report.json'),{force:true});
} catch (error) {
    for(const [index,page] of h.clients.entries()) await shot(page,`failure-${index}`).catch(()=>{});
    console.error(String(error).split(': {')[0]);process.exitCode=1;
} finally { await h.cleanup(); }
