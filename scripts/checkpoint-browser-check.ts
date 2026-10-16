#!/usr/bin/env node
/** Real-input automatic-checkpoint acceptance. No body, controller, or transport state injection. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { join, resolve } from 'node:path';
import { Cdp, coopBrowser } from './coop-browser.ts';
import { crossfeedRoute } from './crossfeed-browser-check.ts';
import { startWorkbench } from './level-tools/service.ts';
import { draftHash, serializeDraft, type DraftDocument } from '../src/workbench/model.ts';
import { requirePlayable } from '../src/workbench/validation.ts';

const supported = ['campaign', 'public', 'local', 'editor'];
const requested = process.argv.slice(2);
if (requested.some(mode => !supported.includes(mode))) throw new Error(`Choose modes: ${supported.join(', ')}`);
const modes = requested.length ? [...new Set(requested)] : supported;
const reports = resolve(process.env.BN_SHOTS ?? '.workbench/reports/automatic-checkpoints');
await mkdir(reports, { recursive: true });
const h = await coopBrowser({ shots: reports, internalLabs: false, readyExpression:
    '!!(globalThis.binaryNinja?.store.ready || globalThis.workbench?.ready || globalThis.customLevel?.observe().ready || globalThis.draftRunner?.observe().ready)' });
const measured: unknown[] = [], attached: Cdp[] = [];
let root: Cdp | undefined, debug = '', origin = '', local: Awaited<ReturnType<typeof startWorkbench>> | undefined;

const fixture: DraftDocument = {
    version: 1, id: 'automatic-checkpoint-fixture', title: 'AUTOMATIC CHECKPOINT TEST', instruction: 'WALK THROUGH BOTH BREAKPOINTS. CONTROLS STAY SEPARATE.',
    geometry: { width: 1400, height: 760, objects: [
        { type: 'spawn', id: 'player1', slot: 1, x: 100, y: 583 }, { type: 'spawn', id: 'player2', slot: 2, x: 180, y: 583 },
        { type: 'platform', id: 'floor', kind: 'static', x: 0, y: 600, w: 1400, h: 160 },
        { type: 'checkpoint', id: 'relay1', slot: 1, checkpoint: 'relay', x: 480, y: 583 },
        { type: 'checkpoint', id: 'relay2', slot: 2, checkpoint: 'relay', x: 560, y: 583 },
        { type: 'checkpoint', id: 'upper1', slot: 1, checkpoint: 'upper', x: 880, y: 583 },
        { type: 'checkpoint', id: 'upper2', slot: 2, checkpoint: 'upper', x: 960, y: 583 },
        // Retain a v1 legacy association: contact must not operate this terminal.
        { type: 'breakpoint', id: 'relayStation', checkpoint: 'relay', activationControl: 'legacyTerminal', x: 500, y: 600, label: 'RELAY' },
        { type: 'device', id: 'legacyTerminal', kind: 'terminal', checkpoint: 'relay', x: 620, y: 600, label: 'SEPARATE CONTROL' },
        { type: 'breakpoint', id: 'upperStation', checkpoint: 'upper', x: 900, y: 600, label: 'UPPER' },
        { type: 'exit', id: 'exit', x: 1260, y: 460, w: 90, h: 140, latch: true, arrivals: 2 },
    ] },
    controller: { kind: 'declarative', outputs: { exitReady: { op: 'ref', id: 'legacyTerminal.value' } } },
    bindings: [{ id: 'exitBinding', output: 'exitReady', target: 'exit', property: 'unlock' }],
    presentation: { wires: [], labels: [], cameraReveals: [], display: { x: 1080, y: 360 } },
    previewStates: { idle: {} }, editor: { hidden: [], locked: [], grid: 20, snap: true },
};
requirePlayable(fixture);
const fixtureHash = await draftHash(fixture), fixtureName = `${fixture.id}.json`, fixturePath = join(reports, fixtureName);
await writeFile(fixturePath, serializeDraft(fixture));

async function until(p: Cdp, label: string, expression: string, timeout = 15000) {
    const end = Date.now() + timeout;
    do {
        if (p.errors.length) throw new Error(p.errors.join('\n'));
        if (await p.read<boolean>(expression)) return;
        await h.sleep(30);
    } while (Date.now() < end);
    throw new Error(`Timeout ${label}: ${expression}`);
}
async function select(p: Cdp, selector: string, value: string) {
    await p.read(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
}
function checkpointTraffic(p: Cdp) {
    const messages: { breakpoint: string; levelInstance: number; seq: number }[] = [];
    const listener = (event: MessageEvent) => {
        const message = JSON.parse(String(event.data));
        if (message.method !== 'Network.webSocketFrameSent' || message.params.response.opcode !== 1) return;
        try { const action = JSON.parse(message.params.response.payloadData); if (action.type === 'checkpoint') messages.push(action); } catch { /* Non-JSON CDP traffic is irrelevant. */ }
    };
    p.socket.addEventListener('message', listener);
    return { messages, stop: () => p.socket.removeEventListener('message', listener) };
}
async function attach(targetId: string) {
    const p = await new Cdp(`${new URL(debug).origin}/devtools/page/${targetId}`).open(); attached.push(p);
    await p.send('Runtime.enable'); await p.send('Page.enable'); await p.send('Network.enable');
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
    await p.send('Emulation.setFocusEmulationEnabled', { enabled: true }); return p;
}
async function close(pages: Cdp[]) {
    for (const p of pages) { h.check('browser has no runtime errors', p.errors.length === 0, p.errors.join('\n')); await p.send('Page.close'); }
}
async function campaign() {
    const a = await h.page(origin, debug), b = await h.page(origin, debug), pages = [a, b];
    for (const p of pages) await p.send('Network.enable');
    const traffic = pages.map(checkpointTraffic);
    await h.click(a, '#create-party'); const created = await h.wait(a, 'created party', s => !!s.multiplayer?.code);
    await h.click(b, '#join-code'); await b.send('Input.insertText', { text: created.multiplayer!.code }); await h.click(b, '#join-room');
    await h.wait(a, 'partner joins', s => !!s.multiplayer?.shared?.connected.every(Boolean));
    await h.click(a, '[data-select-level="crossfeed-vault"]');
    process.env.BN_HERO_REVIEW = '1'; process.env.BN_HERO_CHECKPOINT_ONLY = '1';
    for (const reverse of [false, true]) {
        if (reverse) {
            await h.click(a, '#pause'); await h.click(a, '#choose-chamber'); await h.click(a, '[data-select-level="crossfeed-vault"]');
            for (const p of pages) await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
        }
        for (const p of pages) await h.wait(p, 'fresh Crossfeed overview', s => s.room === 'crossfeed-vault' && s.overviewVisible && s.checkpoint === 'entry');
        const generation = (await h.snapshot(a)).multiplayer!.levelInstance;
        await crossfeedRoute(h, origin, debug, reverse, [a, b]);
        h.scenario = `[campaign Player ${reverse ? 2 : 1}] `;
        const actions = traffic.map(t => t.messages.filter(m => m.levelInstance === generation));
        h.check('only the contacting player sends one automatic checkpoint action', actions[reverse ? 1 : 0].length === 1
            && actions[reverse ? 0 : 1].length === 0 && actions.flat()[0].breakpoint === 'system-online');
        const disk = JSON.parse(await readFile(join(h.temporary, 'data', 'rooms', `${created.multiplayer!.code}.json`), 'utf8'));
        h.check('durable checkpoint remains separate from SYSTEM ONLINE', disk.checkpoint === 'upper' && !disk.levelState.switchC);
        measured.push({ mode: 'campaign', actor: reverse ? 2 : 1, generation, actions, record: disk, snapshots: await Promise.all(pages.map(h.snapshot)) });
    }
    const stopped = once(h.app!, 'exit'); h.app!.kill('SIGKILL'); await stopped;
    await h.startServer(Number(new URL(origin).port));
    for (const p of pages) {
        await h.wait(p, 'process restart restores automatic checkpoint', s => s.multiplayer?.websocket === 'CONNECTED'
            && !!s.multiplayer.shared?.connected.every(Boolean) && s.checkpoint === 'upper', 20000);
        const s = await h.snapshot(p);
        h.check('process restart baselines checkpoint flag and slot position', s.heroAssets.breakpoints[0].flag === 1
            && s.heroAssets.breakpoints[0].age === null && Math.abs(s.player.x - (s.multiplayer!.slot === 1 ? 1120 : 1220)) < 1
            && Math.abs(s.player.y - 733) < 1);
    }
    for (const t of traffic) t.stop();
    delete process.env.BN_HERO_REVIEW; delete process.env.BN_HERO_CHECKPOINT_ONLY;
    await close(pages);
}

type Mode = 'public' | 'local';
const observe = (p: Cdp, mode: Mode) => p.read<any>(mode === 'public' ? 'globalThis.customLevel?.observe() ?? null' : 'globalThis.draftRunner?.observe() ?? null');
async function waitDraft(p: Cdp, mode: Mode, label: string, predicate: (s: any) => boolean, timeout = 10000) {
    const end = Date.now() + timeout; let last: any;
    do { last = await observe(p, mode); if (last?.error || p.errors.length) throw new Error(last?.error || p.errors.join('\n')); if (last && predicate(last)) return last; await h.sleep(25); } while (Date.now() < end);
    throw new Error(`${mode} ${label}: ${JSON.stringify(last)}`);
}
async function walkDraft(p: Cdp, mode: Mode, x: number) {
    const right = (await observe(p, mode)).player.x < x, key = right ? 'KeyD' : 'KeyA';
    await h.key(p, key, true);
    try { await waitDraft(p, mode, `walk to ${x}`, s => right ? s.player.x >= x : s.player.x <= x); }
    finally { await h.key(p, key, false); await h.sleep(250); }
}
async function loadEditor(url: string, mode: Mode) {
    const editor = await h.page(`${url}/workbench.html`, debug);
    if (mode === 'public') {
        const { root: dom } = await editor.send('DOM.getDocument'), { nodeId } = await editor.send('DOM.querySelector', { nodeId: dom.nodeId, selector: '#json-file' });
        await editor.send('DOM.setFileInputFiles', { nodeId, files: [fixturePath] });
    } else await select(editor, '#files', fixtureName);
    await until(editor, 'fixture imported', `workbench.snapshot().document.id===${JSON.stringify(fixture.id)} && workbench.snapshot().playable && !!workbench.snapshot().draftId`);
    return editor;
}
async function openSession(editor: Cdp, url: string, mode: Mode) {
    const before = new Set((await root!.send('Target.getTargets')).targetInfos.map((t: { targetId: string }) => t.targetId));
    await h.click(editor, '#coop');
    const end = Date.now() + 15000; let targetId: string | undefined;
    do {
        targetId = (await root!.send('Target.getTargets')).targetInfos.find((t: { targetId: string; url: string }) => !before.has(t.targetId)
            && t.url.includes(mode === 'public' ? 'custom-level.html' : 'workbench-runner.html'))?.targetId;
        if (!targetId) await h.sleep(40);
    } while (!targetId && Date.now() < end);
    if (!targetId) throw new Error(`Could not open ${mode} host`);
    const host = await attach(targetId); await waitDraft(host, mode, 'host ready', s => s.ready);
    const code = (await observe(host, mode)).session.code;
    const guest = await h.page(`${url}/${mode === 'public' ? 'custom-level.html' : 'workbench-runner.html'}?code=${code}${mode === 'public' ? '&mode=test' : ''}`, debug);
    await guest.send('Network.enable'); await waitDraft(host, mode, 'guest joined', s => s.session.peers.every(Boolean));
    return [host, guest] as const;
}
async function draftSession(url: string, mode: Mode, editor: Cdp) {
    h.scenario = `[${mode}] `; h.shotPrefix = `${mode}-`;
    const [host, guest] = await openSession(editor, url, mode), pages = [host, guest], traffic = pages.map(checkpointTraffic);
    h.check('isolated visitors share the canonical fixture', (await observe(host, mode)).hash === fixtureHash
        && (await observe(guest, mode)).hash === fixtureHash && (await observe(host, mode)).session.visitor !== (await observe(guest, mode)).session.visitor);
    for (const actorIndex of [0, 1]) {
        h.scenario = `[${mode} Player ${actorIndex + 1}] `;
        if (actorIndex) {
            if (mode === 'public') await h.click(host, '#replay-current');
            else { await select(host, '#latest', fixtureName); await h.click(host, '#restart'); }
            for (const p of pages) await waitDraft(p, mode, 'replay clears checkpoints', s => s.session.generation === 2 && s.checkpoint === 'entry');
        }
        const actor = pages[actorIndex], partner = pages[1 - actorIndex], before = await observe(partner, mode), actorBefore = await observe(actor, mode);
        const generation = before.session.generation;
        await walkDraft(actor, mode, 500);
        for (const p of pages) await waitDraft(p, mode, 'automatic relay checkpoint shared', s => s.checkpoint === 'relay' && s.heroAssets.breakpoints[0].flag === 1);
        const reached = await observe(actor, mode), other = await observe(partner, mode);
        h.check('walking commits the checkpoint without using its legacy control or teleporting partner', !reached.session.room.levelState.devices['legacyTerminal.value']
            && Math.abs(other.player.x - before.player.x) < 1 && Math.abs(other.player.y - before.player.y) < 1 && !reached.exitUnlocked);
        if (mode === 'public') h.check('public player hears one deployment and confirmation', reached.audio.played.breakpointDeploy === (actorBefore.audio.played.breakpointDeploy ?? 0) + 1
            && reached.audio.played.breakpointConfirm === (actorBefore.audio.played.breakpointConfirm ?? 0) + 1,
        JSON.stringify({ before: actorBefore.audio.played, after: reached.audio.played }));
        await h.shot(actor, `player-${actorIndex + 1}-relay`);
        const revision = reached.session.room.revision, actionCount = traffic.reduce((n, t) => n + t.messages.length, 0), age = reached.heroAssets.breakpoints[0].age;
        await walkDraft(actor, mode, 400); await walkDraft(actor, mode, 550); await h.sleep(350);
        const repeated = await observe(actor, mode);
        h.check('repeat contact emits no further checkpoint action or revision', repeated.session.room.revision === revision
            && traffic.reduce((n, t) => n + t.messages.length, 0) === actionCount && repeated.heroAssets.breakpoints[0].age >= age);
        for (const [slotIndex, p] of pages.entries()) {
            const deaths = (await observe(p, mode)).player.deaths; await h.tap(p, 'KeyR');
            await waitDraft(p, mode, 'relay marker respawn', s => s.player.deaths === deaths + 1 && Math.abs(s.player.x - (slotIndex ? 560 : 480)) < 1 && Math.abs(s.player.y - 583) < 1);
        }
        await walkDraft(actor, mode, 900);
        for (const p of pages) await waitDraft(p, mode, 'automatic upper checkpoint shared', s => s.checkpoint === 'upper' && s.heroAssets.breakpoints[1].flag === 1);
        await walkDraft(actor, mode, 500);
        h.check('returning to lower breakpoint never downgrades upper recovery', (await observe(actor, mode)).checkpoint === 'upper');
        for (const [slotIndex, p] of pages.entries()) {
            const deaths = (await observe(p, mode)).player.deaths; await h.tap(p, 'KeyR');
            await waitDraft(p, mode, 'upper marker respawn', s => s.player.deaths === deaths + 1 && Math.abs(s.player.x - (slotIndex ? 960 : 880)) < 1 && Math.abs(s.player.y - 583) < 1);
        }
        const actions = traffic.map(t => t.messages.filter(m => m.levelInstance === generation));
        h.check('exactly one action per tier comes from the physical contacting player', actions[actorIndex].length === 2 && actions[1 - actorIndex].length === 0
            && actions[actorIndex][0].breakpoint === 'draft:relayStation' && actions[actorIndex][1].breakpoint === 'draft:upperStation');
        measured.push({ mode, actor: actorIndex + 1, generation, actions, snapshots: await Promise.all(pages.map(p => observe(p, mode))) });
        // Reload only after the second actor's replay, preserving the first run's cue counters.
        if (actorIndex) for (const [slotIndex, p] of pages.entries()) {
            if (mode === 'public') await p.send('Page.reload');
            else await p.send('Page.navigate', { url: `${url}/workbench-runner.html?code=${before.session.code}` });
            await waitDraft(p, mode, 'reconnect restores accepted upper checkpoint', s => s.ready && s.checkpoint === 'upper'
                && s.session.slot === slotIndex + 1 && Math.abs(s.player.x - (slotIndex ? 960 : 880)) < 1);
            const restored = await observe(p, mode);
            h.check('restored flag baselines without replaying deployment', restored.heroAssets.breakpoints.every((b: any) => b.flag === 1 && b.age === null));
        }
    }
    for (const t of traffic) t.stop(); await close(pages);
}
async function editorPreview(editor: Cdp) {
    h.scenario = '[local editor] '; h.shotPrefix = 'editor-';
    const original = serializeDraft(await editor.read('workbench.snapshot().document'));
    for (const slot of [1, 2]) {
        await select(editor, '#test-slot', String(slot)); await h.click(editor, '#play');
        await until(editor, 'physics preview started', 'workbench.snapshot().mode==="play"');
        const move = async (x: number) => {
            const right = await editor.read<boolean>(`workbench.observe().player.x < ${x}`), key = right ? 'KeyD' : 'KeyA';
            await h.key(editor, key, true);
            try { await until(editor, 'walk through editor breakpoint', `workbench.observe().player.x ${right ? '>=' : '<='} ${x}`); }
            finally { await h.key(editor, key, false); await h.sleep(200); }
        };
        await move(500); await h.tap(editor, 'KeyR');
        await until(editor, 'editor relay respawn', `Math.abs(workbench.observe().player.x-${slot === 1 ? 480 : 560})<1`);
        await move(900); await move(500); await h.tap(editor, 'KeyR');
        await until(editor, 'editor upper respawn remains monotonic', `Math.abs(workbench.observe().player.x-${slot === 1 ? 880 : 960})<1`);
        h.check(`Player ${slot} local preview activates both tiers through real walking`, await editor.read('!workbench.observe().deviceValues["legacyTerminal.value"] && workbench.observe().deaths===2'));
        await h.shot(editor, `player-${slot}-upper`); await h.click(editor, '#stop');
    }
    h.check('physics preview preserves authored JSON', serializeDraft(await editor.read('workbench.snapshot().document')) === original);
    await h.click(editor, '[data-id="relayStation"] .select-object');
    await h.click(editor, '#clear-breakpoint-control');
    h.check('legacy association can be removed without changing the separate puzzle terminal', await editor.read('!workbench.snapshot().document.geometry.objects.find(o=>o.id==="relayStation").activationControl && workbench.snapshot().document.geometry.objects.some(o=>o.id==="legacyTerminal")'));
    await h.click(editor, '#undo');
    h.check('legacy association cleanup is undoable', serializeDraft(await editor.read('workbench.snapshot().document')) === original);
}

try {
    origin = await h.startServer(); debug = await h.launch(); root = await new Cdp(debug).open();
    if (modes.includes('campaign')) await campaign();
    if (modes.includes('public')) {
        const editor = await loadEditor(origin.replace(/\/$/, ''), 'public');
        await draftSession(origin.replace(/\/$/, ''), 'public', editor); await close([editor]);
    }
    if (modes.includes('local') || modes.includes('editor')) {
        const draftRoot = join(h.temporary, 'drafts'); await mkdir(draftRoot); await writeFile(join(draftRoot, fixtureName), serializeDraft(fixture));
        local = await startWorkbench({ port: 0, draftRoot, dataDir: join(h.temporary, 'workbench') });
        const editor = await loadEditor(local.origin, 'local');
        if (modes.includes('local')) await draftSession(local.origin, 'local', editor);
        if (modes.includes('editor')) await editorPreview(editor);
        await close([editor]);
    }
    h.scenario = ''; h.check('all automatic-checkpoint browser modes passed', true);
    await writeFile(join(reports, `report${requested.length ? '-' + modes.join('-') : ''}.json`), JSON.stringify({ pass: true, modes, fixtureHash,
        scope: 'Real walking contacts and UI replay; no body/controller writes; custom fixture is an isolated acceptance room.', checks: h.checks, measured }, null, 2) + '\n');
} catch (error) {
    for (const [index, p] of [...h.clients, ...attached].entries()) {
        await h.shot(p, `failure-${index}`).catch(() => {});
        const snapshot = await p.read('globalThis.customLevel?.observe() ?? globalThis.draftRunner?.observe() ?? globalThis.binaryNinja?.snapshot() ?? globalThis.workbench?.observe()').catch(() => null);
        if (snapshot) measured.push({ failurePage: index, snapshot });
    }
    await writeFile(join(reports, `report${requested.length ? '-' + modes.join('-') : ''}.json`), JSON.stringify({ pass: false, modes, fixtureHash, checks: h.checks, measured, error: String(error) }, null, 2) + '\n');
    throw error;
} finally {
    root?.socket.close(); for (const p of attached) p.socket.close(); await local?.close(); await h.cleanup();
}
