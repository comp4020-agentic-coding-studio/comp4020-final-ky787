/** Dedicated local diagnostic page; excluded from the production Vite input. */
import { InputManager } from '../ui/input.ts';
import { PuzzleRenderer } from '../slice/render.ts';
import { FIXED_DT, MAX_FRAME_TIME } from '../engine/constants.ts';
import { type Vec2, type Box } from '../engine/geometry.ts';
import type { PuzzleWorld } from '../slice/world.ts';
import { createRuntime, type DraftRuntime } from './runtime.ts';
import { DraftSession } from './coop-session.ts';
import { draftHash, objectBounds, type DraftDocument } from './model.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const status = document.querySelector<HTMLElement>('#status')!;
const errorPanel = document.querySelector<HTMLElement>('#error')!;
const query = new URL(location.href).searchParams;
const input = new InputManager(true), renderer = new PuzzleRenderer(canvas);
const bootstrap = await fetch('/api/workbench/bootstrap').then(r => r.json()) as { token: string; engineRevision: string; files: string[] };
const latest = document.querySelector<HTMLSelectElement>('#latest')!;
const restartButton = document.querySelector<HTMLButtonElement>('#restart')!;
latest.add(new Option('Choose saved draft', ''));
for (const file of bootstrap.files) latest.add(new Option(file, file));
restartButton.disabled = true;
latest.addEventListener('change', () => { restartButton.disabled = !latest.value || !session?.client.isHost; });
latest.addEventListener('focus', () => { void (async () => {
    const response = await fetch('/api/workbench/files');
    if (!response.ok) throw new Error('Could not refresh saved drafts');
    const { files } = await response.json() as { files: string[] }, selected = latest.value;
    latest.replaceChildren(new Option('Choose saved draft', ''));
    for (const file of files) latest.add(new Option(file, file));
    latest.value = files.includes(selected) ? selected : '';
    restartButton.disabled = !latest.value || !session?.client.isHost;
})().catch(showError); });
let runtime: DraftRuntime | null = null, session: DraftSession | null = null, draftDoc: DraftDocument | null = null;
let hash = '', scenario = query.get('scenario') ?? 'manual', running = false, ready = false, failed = '', lastWorld: PuzzleWorld | null = null, overview = false;
let elapsed = 0, frames = 0, last = 0, accumulated = 0;
const trajectory: { time: number; player: Vec2; grounded: boolean; groundId: string | null; rope: string; cubes: unknown; signals: unknown }[] = [];
const events: { time: number; kind: string; value: unknown }[] = [];
let previousRope = '', previousDeaths = 0, previousSignals = '';
const world = () => session?.world ?? runtime?.world ?? null;
function showError(error: unknown) { failed = error instanceof Error ? error.message : String(error); errorPanel.hidden = false; errorPanel.textContent = failed; console.error(error); }
function observe() {
    const w = world(), client = session?.client;
    return { ready: !!w && ready, running, error: failed, hash: client?.room?.draft?.hash ?? hash, engineRevision: bootstrap.engineRevision,
        scope: session ? 'two-player' : 'single-player-physics-preview', time: elapsed,
        player: w ? { x: w.player.x, y: w.player.y, vx: w.player.vx, vy: w.player.vy, grounded: w.player.grounded, groundId: w.player.groundId, rope: structuredClone(w.player.rope), deaths: w.deaths } : null,
        cubes: w ? structuredClone(w.cubes) : {}, signals: w ? { ...w.frame.outputs, ...w.frame.signals } : {},
        controls: w?.frame.controls ?? {}, plates: w?.frame.plates ?? {}, exitUnlocked: w?.frame.outputs.exitDoor ?? false,
        completed: client?.room?.completed ?? w?.exited ?? false, platforms: w?.platforms.map(p => ({ id: p.def.id, enabled: p.solid.enabled, x: p.def.x, y: p.def.y, w: p.def.w, h: p.def.h })) ?? [],
        session: client ? { code: client.room?.code, slot: client.slot, visitor: client.visitor, connected: client.connected, peers: client.room?.connected,
            generation: client.room?.levelInstance, reachedExit: client.room?.reachedExit, sharedCubes: client.room?.cubes, room: client.room } : null };
}
function resetRecording() { elapsed = 0; frames = 0; trajectory.length = 0; events.length = 0; previousRope = ''; previousDeaths = 0; previousSignals = ''; }
function record(w: PuzzleWorld) {
    const rope = `${w.player.rope.phase}:${w.player.rope.anchorId ?? ''}`, signals = JSON.stringify({ ...w.frame.outputs, ...w.frame.signals });
    if (rope !== previousRope) { events.push({ time: elapsed, kind: 'grapple', value: structuredClone(w.player.rope) }); previousRope = rope; }
    if (w.deaths !== previousDeaths) { events.push({ time: elapsed, kind: 'death', value: w.lastDeath }); previousDeaths = w.deaths; }
    if (signals !== previousSignals) { events.push({ time: elapsed, kind: 'signals', value: JSON.parse(signals) }); previousSignals = signals; }
    if (++frames % 6 === 0 && trajectory.length < 72000) trajectory.push({ time: elapsed, player: { x: w.player.x, y: w.player.y }, grounded: w.player.grounded, groundId: w.player.groundId,
        rope, cubes: structuredClone(w.cubes), signals: { ...w.frame.outputs, ...w.frame.signals } });
}
function download(value: unknown, filename: string) { const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }); const a = window.document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
function recording() { return { version: 1, draftHash: session?.client.room?.draft?.hash ?? hash, engineRevision: bootstrap.engineRevision, scenario, scope: session ? 'two-player' : 'single-player-physics-preview', trajectory, events }; }
async function load(value: DraftDocument, options: { state?: string; start?: Vec2; scenario?: string; slot?: 1 | 2 } = {}) {
    session?.stop(); session = null; running = false;
    draftDoc = structuredClone(value); hash = await draftHash(draftDoc); scenario = options.scenario ?? 'manual';
    runtime = createRuntime(draftDoc, options.slot ?? 1, options.start ? { start: options.start } : undefined);
    if (options.state) { const state = draftDoc.previewStates[options.state]; if (!state) throw new Error(`Unknown preview state '${options.state}'`); runtime.preview(state); }
    resetRecording(); lastWorld = runtime.world; renderer.room(runtime.world); ready = true;
    status.textContent = 'PHYSICS PREVIEW · single player · no campaign progress';
}
function connect(hashToStart?: string, code?: string) {
    running = true; runtime = null; ready = false;
    session?.stop();
    session = new DraftSession(() => {
        if (!session) return;
        if (session.world) { draftDoc = session.document; ready = true; }
        const c = session.client; restartButton.disabled = !latest.value || !c.isHost; status.textContent = `${c.status} · CODE ${c.room?.code ?? '…'} · PLAYER ${c.slot ?? '?'} · ${c.room?.completed ? 'COMPLETE' : c.room?.exitUnlocked ? 'EXIT READY' : 'DRAFT CO-OP'} · ${c.room?.draft?.hash.slice(0, 10) ?? ''} / generation ${c.room?.levelInstance ?? '?'}`;
    }, showError, room => `/api/workbench/snapshots/${room.draft!.hash}`);
    if (code) session.join(code); else if (hashToStart) session.start(hashToStart);
    input.releaseAll(); canvas.focus();
}
async function render(options: { state?: string; region?: Box; wholeRoom?: boolean } = {}) {
    if (!runtime || !draftDoc) throw new Error('Render requires a loaded local draft');
    if (options.state) { const values = draftDoc.previewStates[options.state]; if (!values) throw new Error(`Unknown state '${options.state}'`); runtime.preview(values); }
    const region = options.region ?? { x: 0, y: 0, w: draftDoc.geometry.width, h: draftDoc.geometry.height };
    renderer.resize(); renderer.editorCamera = { x: region.x + region.w / 2, y: region.y + region.h / 2, zoom: Math.min(renderer.camera.viewW / region.w, renderer.camera.viewH / region.h) };
    renderer.draw(runtime.world, 0, runtime.world.player, false, undefined, false);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    return observe();
}
function start(options: { marker?: string; at?: Vec2; scenario?: string } = {}) {
    if (!runtime || !draftDoc) throw new Error('No local draft loaded');
    const marker = options.marker ? draftDoc.geometry.objects.find(o => o.id === options.marker) : undefined;
    if (options.marker && (!marker || !['spawn', 'checkpoint'].includes(marker.type))) throw new Error('Test start must reference a spawn/checkpoint marker');
    runtime.restart(options.at ?? (marker ? { x: marker.x, y: marker.y } : undefined));
    scenario = options.scenario ?? scenario; renderer.editorCamera = undefined; renderer.room(runtime.world); resetRecording(); running = true; input.releaseAll(); canvas.focus();
}
const api = { load, observe, render, start, stop: () => { running = false; input.releaseAll(); return recording(); }, recording,
    aimPoint: (id: string) => { const o = draftDoc?.geometry.objects.find(o => o.id === id); if (!o) throw new Error(`Unknown aim target '${id}'`); const b = objectBounds(o); const x = b.x + b.w / 2, y = b.y + Math.min(12, b.h / 2), rect = canvas.getBoundingClientRect(); return { x: (x - renderer.camera.originX()) * renderer.camera.zoom + rect.left, y: (y - renderer.camera.originY()) * renderer.camera.zoom + rect.top }; },
    session: () => session, renderer, get ready() { return ready; } };
Object.assign(globalThis, { draftRunner: api });
input.attach(canvas, window.document.body);
window.addEventListener('pagehide', () => { session?.stop(); input.dispose(); });
window.document.querySelector('#join')!.addEventListener('click', () => { connect(undefined, window.document.querySelector<HTMLInputElement>('#code')!.value.trim().toUpperCase()); });
window.document.querySelector('#overview')!.addEventListener('click', () => { overview = !overview; });
window.document.querySelector('#recording')!.addEventListener('click', () => download(recording(), `draft-recording-${hash.slice(0, 10)}.json`));
window.document.querySelector('#restart')!.addEventListener('click', () => { void (async () => {
    if (!session?.client.isHost) throw new Error('Only the draft host can restart');
    if (!latest.value) throw new Error('Choose the saved draft to restart');
    const savedResponse = await fetch(`/api/workbench/drafts?name=${encodeURIComponent(latest.value)}`);
    const saved = await savedResponse.json();
    if (!savedResponse.ok) throw new Error(saved.error ?? 'Could not load saved draft');
    const response = await fetch('/api/workbench/snapshots', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Workbench-Token': bootstrap.token }, body: JSON.stringify({ document: saved.document }) });
    const frozen = await response.json(); if (!response.ok) throw new Error(frozen.error);
    session.restart(frozen.hash);
})().catch(showError); });
function frame(now: number) {
    const dt = Math.min(MAX_FRAME_TIME, Math.max(0, (now - (last || now)) / 1000)); last = now;
    try {
        const w = world();
        if (w) {
            if (w !== lastWorld) { lastWorld = w; renderer.room(w); resetRecording(); }
            if (running) {
                input.sync(renderer.camera.screenToWorld(input.screenAim.x, input.screenAim.y));
                if (input.takeAction('reset')) w.respawn();
                accumulated += dt;
                while (accumulated >= FIXED_DT) {
                    const edges = input.takeEdges(); input.state.jumpPressed = edges.jump; input.state.grapplePressed = edges.grapple; input.state.airGrapplePressed = edges.airGrapple;
                    if (session) session.step(FIXED_DT, input.state, edges.interact); else runtime!.step(input.state, edges.interact, FIXED_DT);
                    elapsed += FIXED_DT; record(w); accumulated -= FIXED_DT;
                }
            } else accumulated = 0;
            const c = session?.client;
            renderer.draw(w, running ? dt : 0, input.state.aim, overview || input.overviewHeld, c?.slot ? { localSlot: c.slot, connected: c.connected, remote: c.remote.sample(performance.now()), reachedExit: c.room?.reachedExit ?? [false, false], completed: c.room?.completed ?? false } : undefined, running);
        }
    } catch (error) { running = false; showError(error); }
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
try {
    if (query.has('capture')) window.document.body.classList.add('capture');
    if (query.has('coopHash')) connect(query.get('coopHash')!);
    else if (query.has('code')) connect(undefined, query.get('code')!);
    else if (query.has('hash')) {
        const response = await fetch(`/api/workbench/snapshots/${query.get('hash')}`); const frozen = await response.json();
        if (!response.ok) throw new Error(frozen.error); await load(frozen.document, { state: query.get('state') ?? undefined, slot: query.get('slot') === '2' ? 2 : 1 });
        if (query.has('play')) start(); else await render();
    } else { ready = true; status.textContent = 'Enter a room code from a different browser profile/private window. Shared cookies are one identity.'; }
} catch (error) { showError(error); }
