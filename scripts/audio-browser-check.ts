#!/usr/bin/env node
/** Real gestures, streaming media, independent co-op visitors and a physical Handshake solve. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coopBrowser, type Cdp, type GameSnapshot } from './coop-browser.ts';
import { onboardNinja } from './character-onboarding.ts';
import { campaignDraftRoute } from './campaign-draft-route.ts';
import { AUDIO_STORAGE_KEY, COMPLETION_DUCK_MS, SOUND_ASSET_COUNT } from '../src/audio/game-audio.ts';

const h = await coopBrowser({ shots: process.env.BN_SHOTS ?? '/tmp/bn-audio-shots', internalLabs: false, onboarding: false });
const { check, click, snapshot, wait, sleep, shot } = h;
const audible = (s: GameSnapshot) => s.music.decks.some(d => !d.paused && d.readyState >= 2 && d.volume > 0 && d.currentTime > 0);
const totalLoads = (s: GameSnapshot) => s.music.decks.reduce((n, d) => n + d.loads, 0);
const current = (s: GameSnapshot) => s.music.decks.find(d => d.scene === s.music.scene && !d.paused)?.currentTime ?? 0;
async function slider(p: Cdp, id: string, percent: number) {
    // Keyboard interaction with the actual range control, including the user's unlock gesture.
    await click(p, id);
    await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 });
    await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 });
    for (let i = 0; i < percent; i++) {
        await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
        await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
    }
}
async function music(p: Cdp, scene: string) {
    return wait(p, `${scene} streams and fades in`, s => s.music.scene === scene && s.music.decks.some(d => d.scene === scene && !d.paused && d.readyState >= 2 && d.volume > 0 && d.currentTime > 0) && !s.music.crossfading, 20000);
}
const playingFile = (s: GameSnapshot, file: string) => s.music.decks.some(d => d.scene === s.music.scene && !d.paused
    && d.readyState >= 2 && d.volume > 0 && d.currentTime > 0 && new URL(d.src).pathname === `/audio/music/${file}`);
async function nativeLoop(p: Cdp, scene: string) {
    const before = await music(p, scene);
    // Seek media only; actual native playback must cross the authored file boundary.
    await p.read("(()=>{const m=binaryNinja.music,d=m.decks.find(d=>d.scene===m.scene&&!d.audio.paused);d.audio.currentTime=d.audio.duration-2;})()");
    const wrapped = await wait(p, `${scene} wraps at its authored duration`, s => s.music.loops > before.music.loops && audible(s) && !s.music.crossfading, 15000);
    check(`${scene} native loop preserves one deck without new loads, plays or crossfades`, current(wrapped) < 8
        && totalLoads(wrapped) === totalLoads(before) && wrapped.music.crossfades === before.music.crossfades
        && wrapped.music.decks.every((d, i) => d.starts === before.music.decks[i].starts)
        && wrapped.music.decks.filter(d => !d.paused).length === 1);
}
try {
    const url = await h.startServer(), debug = await h.launch();
    const a = await h.page(url, debug);
    check('before interaction neither music nor SFX start', !(await snapshot(a)).music.unlocked && (await snapshot(a)).music.decks.every(d => d.paused) && (await snapshot(a)).audio.state === 'locked');
    await a.read(`localStorage.setItem(${JSON.stringify(AUDIO_STORAGE_KEY)},JSON.stringify({volume:.27,muted:false}))`);
    await a.send('Page.reload'); await wait(a, 'legacy preference reload', s => s.audio.preferences.volume === .27);
    check('legacy Effects preference survives with quiet independent Music default', (await snapshot(a)).audio.preferences.musicVolume === .35);
    await onboardNinja(a, 'AudioHost', 'purple'); await music(a, 'menu');
    await wait(a, 'SFX pool decodes only short cues', s => s.audio.loaded === SOUND_ASSET_COUNT);
    check('music plays after real character setup without joining the SFX pool', (await snapshot(a)).audio.loaded === SOUND_ASSET_COUNT && (await snapshot(a)).music.decks.length === 2);
    await click(a, '#settings');
    await slider(a, '#audio-volume', 0); await music(a, 'menu');
    check('zero Effects volume keeps Music audible', (await snapshot(a)).audio.preferences.volume === 0 && audible(await snapshot(a)));
    await slider(a, '#music-volume', 0);
    check('zero Music volume suspends both streaming decks', (await snapshot(a)).music.decks.every(d => d.paused && d.volume === 0));
    await slider(a, '#audio-volume', 41); await slider(a, '#music-volume', 24); await music(a, 'menu');
    await click(a, '#audio-mute');
    check('global Sound off immediately silences both paths', (await snapshot(a)).audio.preferences.muted && (await snapshot(a)).audio.voices === 0 && (await snapshot(a)).music.decks.every(d => d.paused && d.volume === 0));
    await shot(a, '01-independent-settings');
    for (const [width, height] of [[1024, 768], [420, 800]]) {
        await a.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
        check(`sound controls fit ${width}×${height}`, await a.read("document.documentElement.scrollWidth<=innerWidth && [...document.querySelectorAll('.audio-settings input')].every(e=>{const r=e.getBoundingClientRect();return r.width>100&&r.left>=0&&r.right<=innerWidth})"));
        await shot(a, `01-settings-${width}`);
    }
    await a.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
    await click(a, '#audio-mute'); await music(a, 'menu');
    const beforeReload = (await snapshot(a)).audio.preferences;
    await a.send('Page.reload'); await wait(a, 'profile reload', s => s.view === 'home');
    check('reload retains independent levels and mute state', JSON.stringify((await snapshot(a)).audio.preferences) === JSON.stringify(beforeReload));
    check('reloaded page still waits for a new gesture', !(await snapshot(a)).music.unlocked);
    await click(a, '#tutorial'); if ((await snapshot(a)).overviewVisible) await click(a, '#start-room');
    await wait(a, 'quiet tutorial', s => s.started && audible(s) && s.music.duck === 'tutorial' && s.music.duckGain <= .39);
    check('PRESSURE retains the quiet menu recording', (await snapshot(a)).room === 'pressure' && playingFile(await snapshot(a), 'menu.ogg'));
    await click(a, '#pause'); await wait(a, 'tutorial pause ducks without game effects', s => s.music.duck === 'pause' && s.music.duckGain < .3 && !s.audio.active && s.audio.voices === 0);
    await a.read("document.querySelector('.pause-settings').open=true"); await shot(a, '02-solo-pause-mix');
    await click(a, '#main-menu'); await music(a, 'menu');

    const b = await h.page(url, debug); await onboardNinja(b, 'AudioGuest', 'orange');
    await click(a, '#create-party'); const hosted = await wait(a, 'party lobby', s => s.view === 'lobby');
    await click(b, '#join-code'); await b.send('Input.insertText', { text: hosted.multiplayer!.code! }); await click(b, '#join-room');
    await wait(a, 'independent guest joined', s => s.multiplayer?.shared?.connected.every(Boolean) === true);
    await music(a, 'menu'); check('lobby retains the menu theme', (await snapshot(b)).music.scene === 'menu');
    await click(a, '[data-select-level="handshake"]');
    for (const p of [a, b]) await wait(p, 'Handshake overview', s => s.room === 'handshake' && s.overviewVisible);
    for (const [role, p] of [['host', a], ['guest', b]] as const)
        check(`${role} streams the selected Handshake recording`, playingFile(await music(p, 'handshake'), 'handshake.ogg'));
    await nativeLoop(a, 'handshake');
    const beforeSolve = (await snapshot(a)).audio.played.complete ?? 0;
    const stinger = wait(a, 'completion stinger survives victory transition', s => s.view === 'victory' && (s.audio.played.complete ?? 0) === beforeSolve + 1, 90000);
    await campaignDraftRoute(h, 'handshake', [a, b]);
    const completed = await stinger;
    check('one completion stinger and quiet victory music after an actual two-player solve', completed.music.duck === 'complete' && completed.audio.voices > 0);
    await shot(a, '03-completion-mix');
    const victoryLoads = totalLoads(completed);
    await sleep(COMPLETION_DUCK_MS + 450);
    const settledVictory = await wait(a, 'completion duck ends while victory remains open', s => s.view === 'victory' && s.music.duck === 'pause' && s.music.duckGain >= .27 && s.music.duckGain <= .29);
    check('victory returns to its pause mix after the short stinger without reloading or replaying', totalLoads(settledVictory) === victoryLoads
        && settledVictory.audio.played.complete === beforeSolve + 1
        && settledVictory.music.decks.every((d, i) => d.starts === completed.music.decks[i].starts));
    await click(a, '#next-chamber');
    for (const scene of ['crossfeed-vault', 'race-condition', 'deadlock', 'use-after-free'] as const) {
        if (scene !== 'crossfeed-vault') {
            await click(a, '#pause'); await click(a, '#choose-chamber'); await click(a, `[data-select-level="${scene}"]`);
        }
        for (const p of [a, b]) { await wait(p, `${scene} overview`, s => s.room === scene && s.overviewVisible); await click(p, '#start-room'); }
        const playing = await music(a, scene), loads = totalLoads(playing), time = current(playing);
        await sleep(350);
        check(`${scene} has its own streamed track and ordinary replication never reloads it`, totalLoads(await snapshot(a)) === loads && current(await snapshot(a)) > time && (await snapshot(a)).music.decks.length === 2);
        if (scene === 'crossfeed-vault') {
            for (const [role, p] of [['host', a], ['guest', b]] as const)
                check(`${role} streams the selected Crossfeed Vault recording`, playingFile(await music(p, scene), 'crossfeed-vault.ogg'));
            await nativeLoop(a, scene);
        }
    }
    await click(a, '#pause'); await a.read("document.querySelector('.pause-settings').open=true");
    await wait(a, 'co-op pause duck', s => s.music.duck === 'pause' && s.music.duckGain < .3); await shot(a, '04-coop-pause-mix');
    const reconnect = await snapshot(b), reconnectLoads = totalLoads(reconnect), reconnectTime = current(reconnect);
    await b.read('binaryNinja.coop.socket.close()');
    await wait(b, 'transport interrupted', s => s.multiplayer?.websocket !== 'CONNECTED');
    await wait(b, 'transport reconnected', s => s.multiplayer?.websocket === 'CONNECTED'); await music(b, 'use-after-free');
    check('reconnect preserves stream identity and playback position', totalLoads(await snapshot(b)) === reconnectLoads && current(await snapshot(b)) >= reconnectTime);

    // Deterministic browser lifecycle events; no fake gameplay or media state.
    const foreground = await snapshot(a), position = current(foreground);
    await a.read("window.dispatchEvent(new Event('blur'))"); await sleep(150);
    check('window blur pauses every music deck and all effects', (await snapshot(a)).music.suspended && (await snapshot(a)).music.decks.every(d => d.paused && d.volume === 0) && (await snapshot(a)).audio.voices === 0);
    await a.read("window.dispatchEvent(new Event('focus'))"); await music(a, 'use-after-free');
    check('focus resumes the same track position', current(await snapshot(a)) >= position && totalLoads(await snapshot(a)) === totalLoads(foreground));
    await a.read("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))"); await sleep(100);
    check('hidden document suspends streaming and effects', (await snapshot(a)).music.suspended && (await snapshot(a)).music.decks.every(d => d.paused) && (await snapshot(a)).audio.voices === 0);
    await a.read("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))"); await music(a, 'use-after-free');
    await a.read("window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}))");
    check('persisted pagehide suspends rather than creating replacement players', (await snapshot(a)).music.suspended && !(await snapshot(a)).music.disposed);
    await a.read("window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))");
    await wait(a, 'BFCache handler reconnect', s => s.multiplayer?.websocket === 'CONNECTED'); await music(a, 'use-after-free');
    check('persisted page resume retains only the original two players', totalLoads(await snapshot(a)) === totalLoads(foreground) && (await snapshot(a)).music.decks.length === 2);
    await click(a, '#leave-coop'); await music(a, 'menu'); await shot(a, '05-return-menu');
    await nativeLoop(a, 'menu');

    const visitor = (await snapshot(a)).persistence.visitor, developer = new URL(url); developer.searchParams.set('labs', '1');
    await a.send('Page.navigate', { url: developer.href });
    await wait(a, 'same visitor returns to developer-enabled main menu', s => s.view === 'home' && s.character.ready && s.persistence.visitor === visitor);
    await click(a, '[data-room="switch"]');
    await wait(a, 'SWITCH starts with decoded effects', s => s.room === 'switch' && s.started && s.audio.loaded === SOUND_ASSET_COUNT);
    check('SWITCH retains the quiet menu recording', playingFile(await music(a, 'menu'), 'menu.ogg'));
    await h.walk(a, 275);
    const beforeLever = await snapshot(a), specialCues = ['latch', 'checkpoint', 'breakpointDeploy', 'breakpointConfirm'] as const;
    check('the real SWITCH lever begins off', !beforeLever.inputs.switchB);
    for (const [on, count] of [[true, 1], [false, 2]] as const) {
        await h.tap(a, 'KeyE');
        const toggled = await wait(a, `real E turns the anchor ${on ? 'on' : 'off'}`, s => s.inputs.switchB === on && (s.audio.played.switch ?? 0) === (beforeLever.audio.played.switch ?? 0) + count);
        check(`ordinary lever ${on ? 'on' : 'off'} plays the electronic switch without latch or checkpoint cues`, specialCues.every(cue => (toggled.audio.played[cue] ?? 0) === (beforeLever.audio.played[cue] ?? 0)));
        await sleep(200); // Respect the real effect cooldown between physical key presses.
    }
    await shot(a, '06-switch-lever-audio');
    for (let jump = 1; jump <= 3; jump++) {
        const before = (await snapshot(a)).audio.played.landing ?? 0;
        await h.tap(a, 'Space'); await wait(a, 'real jump leaves the floor', s => !s.player.grounded);
        const landed = await wait(a, 'real jump plays one landing', s => s.player.grounded && (s.audio.played.landing ?? 0) === before + 1);
        await sleep(180);
        check(`ordinary jump ${jump} has one bounded landing cue`, landed.player.landingSpeed > 120 && (await snapshot(a)).audio.played.landing === before + 1);
    }
    await click(a, '#pause'); await click(a, '[data-room="pressure"]');
    if ((await snapshot(a)).overviewVisible) await click(a, '#start-room');
    await h.walk(a, 235); await h.key(a, 'Space', true);
    try { await h.walk(a, 540); } finally { await h.key(a, 'Space', false); }
    await wait(a, 'clear the cube and land normally', s => s.player.grounded);
    await h.walk(a, 610); await wait(a, 'stand on pressure plate', s => s.inputs.plateA);
    const beforePlateJump = await snapshot(a);
    await h.tap(a, 'Space'); await wait(a, 'jump releases pressure plate', s => !s.player.grounded && !s.inputs.plateA);
    await wait(a, 'land back on pressure plate', s => s.player.grounded && s.inputs.plateA);
    await sleep(180);
    const onPlate = await snapshot(a);
    check('plate landing keeps the plate sound without a second landing impact',
        (onPlate.audio.played.landing ?? 0) === (beforePlateJump.audio.played.landing ?? 0)
        && (onPlate.audio.played.plate ?? 0) === (beforePlateJump.audio.played.plate ?? 0) + 2);

    for (const room of ['relay', 'uplink'] as const) {
        await click(a, '#pause'); await click(a, `[data-room="${room}"]`);
        if ((await snapshot(a)).overviewVisible) await click(a, '#start-room');
        await wait(a, `${room} starts normally`, s => s.room === room && s.started);
        check(`${room} retains the original quiet solo recording`, playingFile(await music(a, 'tutorial-relay'), 'tutorial-relay.ogg') && (await snapshot(a)).music.duck === 'tutorial');
    }
    await click(a, '#pause'); await click(a, '#main-menu'); await music(a, 'menu');
    const broken = await h.page(url, debug);
    await broken.send('Network.enable');
    await broken.send('Network.setBlockedURLs', { urls: ['*audio/*.ogg'] });
    await onboardNinja(broken, 'SilentNinja', 'cyan'); await click(broken, '#tutorial');
    if ((await snapshot(broken)).overviewVisible) await click(broken, '#start-room');
    await wait(broken, 'audio failures leave tutorial playable', s => s.started && s.audio.failed.length > 0 && s.music.failures.length > 0);
    const silentX = (await snapshot(broken)).player.x; await h.key(broken, 'KeyD', true); await sleep(180); await h.key(broken, 'KeyD', false);
    check('failed SFX and music downloads never block game input', (await snapshot(broken)).player.x > silentX && (await snapshot(broken)).started);

    for (const p of [a, b]) check('browser audio loads without runtime or media failures', p.errors.length === 0 && (await snapshot(p)).music.failures.length === 0 && (await snapshot(p)).audio.failed.length === 0, p.errors.join('\n'));
    await writeFile(join(h.shots, 'snapshots.json'), JSON.stringify({ host: await snapshot(a), guest: await snapshot(b) }, null, 2));
    await writeFile(join(h.shots, 'checks.txt'), h.checks.join('\n') + '\n');
} catch (e) {
    for (const [i, p] of h.clients.entries()) { await shot(p, `failure-${i}`).catch(() => {}); await writeFile(join(h.shots, `failure-${i}.json`), JSON.stringify(await snapshot(p).catch(() => null), null, 2)); }
    console.error(String(e).split(': {')[0]); process.exitCode = 1;
} finally { await h.cleanup(); }
