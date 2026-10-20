import { DEFAULT_CHARACTER_PROFILE, colourHex } from '../character/profile.ts';
import './custom.css';
import { DraftSession } from './coop-session.ts';
import { InputManager } from '../ui/input.ts';
import { PuzzleRenderer } from '../slice/render.ts';
import { FIXED_DT, MAX_FRAME_TIME } from '../engine/constants.ts';
import { GameAudio } from '../audio/game-audio.ts';
import { AudioPresentation } from '../slice/audio-presentation.ts';
import { cubeEntries } from '../coop/protocol.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const query = new URL(location.href).searchParams, testing = query.get('mode') === 'test';
const canvas = $<HTMLCanvasElement>('stage'), renderer = new PuzzleRenderer(canvas), input = new InputManager(true);
const audio = new GameAudio(), sound = new AudioPresentation(audio);
let completed = false, diagnostics = false, lastWorld: DraftSession['world'] = null, last = 0, accumulated = 0;
const session = new DraftSession(update, error => { $('status').textContent = error; }, room => `/api/custom/rooms/${room.code}/snapshot`, true);
const participants = document.createElement('div'); participants.id = 'custom-players'; participants.setAttribute('aria-label', 'Players'); $('invitation').after(participants);
function update() {
    const c = session.client, room = c.room;
    $('status').textContent = session.error || (c.connected ? `${room?.connected.every(Boolean) ? 'PARTNER JOINED' : 'WAITING FOR PARTNER'} · PLAYER ${c.slot}` : c.status);
    if (room) {
        participants.replaceChildren(...room.connected.map((connected, i) => {
            const profile = room.profiles?.[i] ?? DEFAULT_CHARACTER_PROFILE, badge = document.createElement('span');
            badge.style.borderColor = colourHex(profile.colour);
            badge.textContent = `${profile.name} / P${i + 1}${i === 0 ? ' · HOST' : ' · GUEST'} · ${connected ? 'CONNECTED' : room.assigned[i] ? 'DISCONNECTED' : 'WAITING'}`;
            return badge;
        }));
        $<HTMLInputElement>('code').value = room.code;
        const invite = new URL('/custom-level.html', location.origin); invite.searchParams.set('code', room.code);
        if (testing) invite.searchParams.set('mode', 'test');
        $<HTMLInputElement>('invite').value = invite.href;
        const current = new URL(location.href); current.searchParams.delete('host'); current.searchParams.set('code', room.code); history.replaceState(null, '', current);
    }
    $('title').textContent = `${testing ? 'TEST · ' : ''}${session.document?.title ?? 'CUSTOM CHAMBER'}`;
    $('victory').hidden = !room?.completed;
    $('replay').hidden = !c.isHost; $('guest-wait').hidden = c.isHost;
    $('replay-current').hidden = !c.isHost;
    $<HTMLButtonElement>('replay-current').disabled = !c.connected;
    $<HTMLButtonElement>('replay').disabled = !c.connected;
    if (room?.completed && !completed) { audio.play('complete'); input.releaseAll(); }
    completed = !!room?.completed;
}
function leave() {
    session.stop(); audio.stopAll(); input.dispose();
    if (query.get('return') === 'editor') {
        try { if (window.opener && !window.opener.closed && window.opener.location.origin === location.origin) { window.opener.focus(); window.close(); return; } } catch { /* Use recovery on the builder if the original tab closed. */ }
        location.assign('/workbench.html');
    } else location.assign('/');
}
input.attach(canvas, document.body);
for (const id of ['return', 'victory-return']) { $(id).onclick = leave; if (query.get('return') === 'editor') $(id).textContent = 'RETURN TO EDITOR'; }
$('join').onclick = () => { session.join($<HTMLInputElement>('code').value.trim()); canvas.focus(); };
$<HTMLInputElement>('code').addEventListener('keydown', event => { if (event.key === 'Enter') $('join').click(); });
$('replay').onclick = () => { if (session.client.room?.draft) session.restart(session.client.room.draft.hash); canvas.focus(); };
$('replay-current').onclick = $('replay').onclick;
$('copy').onclick = () => { void navigator.clipboard.writeText($<HTMLInputElement>('invite').value).then(() => { $('status').textContent = 'Invitation copied. Your friend needs a separate browser identity.'; }).catch(() => { $<HTMLInputElement>('invite').select(); $('status').textContent = 'Select and copy the invitation link.'; }); };
function soundLabel() { $('sound').textContent = audio.getPreferences().muted ? 'Sound off' : 'Sound on'; }
$('sound').onclick = () => { audio.setPreferences({ muted: !audio.getPreferences().muted }); soundLabel(); };
soundLabel();
$('diagnostics-toggle').hidden = !testing;
$('diagnostics-toggle').onclick = () => { diagnostics = !diagnostics; $('diagnostics').hidden = !diagnostics; canvas.focus(); };
window.addEventListener('pointerdown', () => { void audio.unlock(); });
window.addEventListener('keydown', () => { void audio.unlock(); });
window.addEventListener('pagehide', () => { session.stop(); input.dispose(); audio.stopAll(); });
window.addEventListener('blur', () => { input.releaseAll(); audio.setActive(false); });
function observe() {
    const w = session.world, c = session.client;
    return structuredClone({ ready: !!w, error: session.error, status: c.status, hash: c.room?.draft?.hash,
        player: w ? { x: w.player.x, y: w.player.y, grounded: w.player.grounded, groundId: w.player.groundId, deaths: w.deaths, rope: w.player.rope } : null,
        cubes: w?.cubes, signals: w?.frame.signals, inputs: c.room?.levelState, checkpoint: w?.checkpoint,
        plates: w?.frame.plates, exitUnlocked: c.room?.exitUnlocked,
        heroAssets: renderer.heroes.snapshot(), audio: audio.snapshot(),
        completed: c.room?.completed, session: { code: c.room?.code, visitor: c.visitor, slot: c.slot, generation: c.room?.levelInstance, peers: c.room?.connected, reachedExit: c.room?.reachedExit, sharedCubes: c.room?.cubes, room: c.room },
        platforms: w?.platforms.map(p => ({ id: p.def.id, enabled: p.solid.enabled })), camera: { x: renderer.camera.originX(), y: renderer.camera.originY(), zoom: renderer.camera.zoom },
    });
}
// Observations are detached data. No world, controller, transport or editor mutation API.
Object.defineProperty(window, 'customLevel', { value: Object.freeze({ observe }) });
function frame(now: number) {
    const dt = Math.min(MAX_FRAME_TIME, Math.max(0, (now - (last || now)) / 1000)); last = now;
    const w = session.world, c = session.client;
    if (w) {
        if (w !== lastWorld) { lastWorld = w; renderer.room(w); sound.reset(w); accumulated = 0; input.releaseAll(); canvas.focus(); }
        const active = c.playing && !completed;
        audio.setActive(active && !document.hidden && document.hasFocus());
        input.sync(renderer.camera.screenToWorld(input.screenAim.x, input.screenAim.y));
        if (active && input.takeAction('reset')) w.respawn();
        accumulated = active ? accumulated + dt : 0;
        while (accumulated >= FIXED_DT) {
            const edges = input.takeEdges(); input.state.jumpPressed = edges.jump; input.state.grapplePressed = edges.grapple; input.state.airGrapplePressed = edges.airGrapple;
            session.step(FIXED_DT, input.state, edges.interact); accumulated -= FIXED_DT;
            const events = w.events.splice(0); sound.observe(w, events);
            for (const event of events) {
                if (event.kind === 'crumble') renderer.particles.shatter(event.at.x, event.at.y, 140, 32, '#f9ba68');
                else renderer.particles.burst(event.at.x, event.at.y, 10, event.cause === 'firewall' ? '#ff943e' : '#64e6d5', 120);
            }
        }
        sound.observe(w, c.takeMachineryEvents()); sound.ambience(w, active && !document.hidden);
        const cues = renderer.draw(w, dt, input.state.aim, input.overviewHeld, c.slot ? { localSlot: c.slot, profiles: c.room?.profiles, connected: c.connected, remote: c.remote.sample(now), reachedExit: c.room?.reachedExit ?? [false, false], completed,
            remotePullingCubes: cubeEntries(c.room?.cubes ?? {}).filter(([id, cube]) => cube.pulling && !c.ownsCubeFor(id)).map(([id]) => id) } : undefined, active);
        for (const { cue, at } of cues) audio.play(cue, Math.max(0, 1 - Math.hypot(at.x - w.player.x, at.y - w.player.y) / 1100));
        if (testing && diagnostics) $('diagnostics').textContent = 'TEST INFORMATION · READ ONLY\n' + JSON.stringify(observe(), null, 2);
    }
    requestAnimationFrame(frame);
}
if (query.has('code')) session.join(query.get('code')!);
else if (query.has('host')) session.start(query.get('host')!);
else $('status').textContent = 'Enter a custom room code or open an invitation link.';
requestAnimationFrame(frame);
