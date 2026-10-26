#!/usr/bin/env node
/** Real independent visitors, clipboard sharing and WebSocket joins through the public menu. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coopBrowser, type Cdp } from './coop-browser.ts';
import { onboardNinja } from './character-onboarding.ts';

const h = await coopBrowser({ shots: process.env.BN_SHOTS ?? '/tmp/bn-menu-invitation-shots', internalLabs: false, onboarding: false });
const { check, click, shot, snapshot, wait, sleep } = h;
async function until(p: Cdp, expression: string, label = expression) {
    const deadline = Date.now() + 15000;
    while (!await p.read<boolean>(expression)) {
        if (p.errors.length) throw new Error(p.errors.join('\n'));
        if (Date.now() > deadline) throw new Error(`Timed out: ${label}`);
        await sleep(25);
    }
}
async function fill(p: Cdp, selector: string, value: string) {
    await click(p, selector);
    for (const type of ['rawKeyDown', 'keyUp']) await p.send('Input.dispatchKeyEvent', { type, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
    await p.send('Input.insertText', { text: value });
}
async function outside(p: Cdp) {
    const at = await p.read<{ x: number; y: number }>(`(() => {
        const menu=document.querySelector('#menu');
        for(const [x,y] of [[innerWidth-24,innerHeight/2],[24,innerHeight/2],[innerWidth-24,120],[24,120]])
            if(document.elementFromPoint(x,y)===menu)return{x,y};
        throw new Error('No outside-card menu target');
    })()`);
    for (const type of ['mousePressed', 'mouseReleased']) await p.send('Input.dispatchMouseEvent', { type, ...at, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
    await sleep(100);
}
try {
    const url = await h.startServer(), debug = await h.launch(), origin = new URL(url).origin;
    const host = await h.page(url, debug);
    await onboardNinja(host, 'LinkHost', 'purple');
    await click(host, '#play-coop'); await shot(host, '01-coop-start');
    await click(host, '#show-join'); await shot(host, '02-coop-join'); await click(host, '#back-main');
    await click(host, '#create-party');
    const hosted = await wait(host, 'host lobby', s => s.multiplayer?.shared?.party?.phase === 'lobby');
    const code = hosted.multiplayer!.code!, link = `${origin}/?join=${code}`;
    check('Start Co-op creates a lobby without selecting or starting a chamber', hosted.multiplayer!.host === true && !hosted.started && hosted.multiplayer!.levelInstance === 1);
    await outside(host); check('waiting lobby cannot be dismissed by outside click', (await snapshot(host)).view === 'lobby');
    await host.read("history.replaceState(null,'','/?debug=1&labs=1')");
    await click(host, '#party-copy');
    await until(host, "document.querySelector('#party-copy-status').textContent.includes('Invitation link copied')", 'actual clipboard write');
    const copied = await host.read<string>('navigator.clipboard.readText()');
    check('Copy Link shares the exact first-party root URL without debug or labs', copied === link, copied);
    await host.read("history.replaceState(null,'','/')");
    await shot(host, '03-host-link-copied');
    await host.read("Object.defineProperty(navigator.clipboard,'writeText',{configurable:true,value:()=>Promise.reject(new Error('Clipboard denied for test'))})");
    await click(host, '#party-copy');
    await until(host, "!document.querySelector('#party-invite-fallback').hidden", 'manual invitation fallback');
    check('clipboard failure exposes a selected usable link and does not claim success', await host.read(`(()=>{const f=document.querySelector('#party-invite-link');return f.value===${JSON.stringify(link)}&&document.activeElement===f&&f.selectionStart===0&&f.selectionEnd===f.value.length&&document.querySelector('#party-copy-status').textContent.includes('Clipboard unavailable')})()`));
    await shot(host, '04-manual-copy-fallback'); await host.read("delete navigator.clipboard.writeText");

    const guest = await h.page(copied, debug);
    await until(guest, "!!document.querySelector('#initialize-ninja')", 'invited first-time character setup');
    check('exact invitation remains intact during first-time ninja setup with no co-op connection', await guest.read(`location.href===${JSON.stringify(copied)}&&!binaryNinja.coop.active&&!binaryNinja.snapshot().character.ready`));
    await shot(guest, '05-invitation-character-setup');
    await onboardNinja(guest, 'LinkGuest', 'orange');
    const joined = await wait(guest, 'invitation guest joins correct lobby', s => s.multiplayer?.code === code && s.multiplayer?.shared?.connected.every(Boolean) === true);
    check('independent profile joins as guest and preserves server-owned host', joined.multiplayer!.slot === 2 && !joined.multiplayer!.host
        && joined.persistence.visitor !== hosted.persistence.visitor && (await snapshot(host)).multiplayer!.host === true);
    check('accepted join consumes only the invitation query', await guest.read("!new URL(location.href).searchParams.has('join') && sessionStorage.getItem('bn_coop_room') === binaryNinja.coop.room.code"));
    await shot(guest, '06-invitation-joined-lobby');
    await click(host, '[data-select-level="handshake"]');
    for (const p of [host, guest]) {
        await wait(p, 'selected chamber overview', s => s.room === 'handshake' && s.overviewVisible);
        await click(p, '#start-room'); await wait(p, 'invited party enters gameplay', s => s.room === 'handshake' && s.started);
    }
    check('both invited players reach actual co-op gameplay in the same party', (await snapshot(host)).multiplayer!.code === code && (await snapshot(guest)).multiplayer!.code === code);
    for (const [i, p] of [host, guest].entries()) {
        await wait(p, 'grounded before pause input check', s => s.started && s.player.grounded);
        await click(p, '#pause'); await shot(p, `07-coop-pause-${i === 0 ? 'host' : 'guest'}`);
        check('co-op pause retains invite and leave without customization', await p.read("!!document.querySelector('#party-copy') && !!document.querySelector('#leave-coop') && !document.querySelector('#customize-ninja')"));
        check('opening co-op pause focuses Resume', await p.read("document.activeElement?.id === 'continue'"));
        const pausedY = (await snapshot(p)).player.y;
        await h.tap(p, 'Space'); await wait(p, 'Space activates focused Resume', s => s.started && s.room === 'handshake');
        const resumed = await snapshot(p);
        check('Space resumes co-op without jumping or grappling', resumed.player.grounded && Math.abs(resumed.player.y - pausedY) < .5 && resumed.player.vy === 0 && resumed.player.rope.phase === 'idle');
        await click(p, '#pause');
        await outside(p); await wait(p, 'outside click resumes same co-op room', s => s.started && s.room === 'handshake' && s.multiplayer?.code === code);
    }
    await guest.read('binaryNinja.coop.socket.close()');
    await wait(guest, 'network interruption detected', s => s.multiplayer?.websocket !== 'CONNECTED');
    await wait(guest, 'invited guest reconnects', s => s.multiplayer?.websocket === 'CONNECTED' && s.multiplayer?.code === code);
    check('network reconnect preserves guest assignment and selected chamber', (await snapshot(guest)).multiplayer!.slot === 2 && (await snapshot(guest)).room === 'handshake');
    check('reconnecting an active chamber does not repeat its already-dismissed overview', (await snapshot(guest)).started && !(await snapshot(guest)).overviewVisible);
    await click(guest, '#pause'); await guest.read('binaryNinja.coop.socket.close()');
    await wait(guest, 'paused network interruption detected', s => s.multiplayer?.websocket !== 'CONNECTED');
    await wait(guest, 'paused guest reconnects', s => s.multiplayer?.websocket === 'CONNECTED');
    check('reconnecting the same chamber preserves an explicit co-op pause', (await snapshot(guest)).view === 'coop-pause' && !(await snapshot(guest)).started);
    await click(guest, '#continue'); await wait(guest, 'explicit resume after reconnect', s => s.started);
    await click(guest, '#pause');
    const beforeLifecycle = await snapshot(guest);
    // Deterministically exercise the registered persisted-page handlers. This
    // supplements real reload and socket tests; it is not a browser BFCache hit.
    await guest.read("window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}))");
    check('simulated persisted pagehide leaves transport and silences audio', await guest.read('!binaryNinja.coop.active && !binaryNinja.snapshot().audio.active'));
    await guest.read("window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))");
    const afterLifecycle = await wait(guest, 'simulated persisted pageshow reconnects accepted party', s => s.multiplayer?.websocket === 'CONNECTED' && s.multiplayer?.code === code);
    check('simulated BFCache lifecycle preserves same-chamber pause and dismissed overview', afterLifecycle.view === 'coop-pause' && !afterLifecycle.started && !afterLifecycle.overviewVisible
        && afterLifecycle.multiplayer!.levelInstance === beforeLifecycle.multiplayer!.levelInstance && afterLifecycle.multiplayer!.slot === 2 && !afterLifecycle.audio.active);
    await shot(guest, '07-persisted-lifecycle-pause');
    await click(guest, '#continue'); await wait(guest, 'Resume after simulated persisted lifecycle keeps overview dismissed', s => s.started && !s.overviewVisible);
    await guest.send('Page.reload');
    await wait(guest, 'consumed invitation reload uses remembered session', s => s.multiplayer?.websocket === 'CONNECTED' && s.multiplayer?.code === code && s.multiplayer?.slot === 2);

    const otherHost = await h.page(url, debug); await onboardNinja(otherHost, 'OtherHost', 'lime');
    await click(otherHost, '#play-coop'); await click(otherHost, '#create-party');
    const other = await wait(otherHost, 'second host lobby', s => s.multiplayer?.shared?.party?.phase === 'lobby');
    const otherCode = other.multiplayer!.code!, otherLink = `${origin}/?join=${otherCode}`;
    check('guest has conflicting remembered party before following another invitation', await guest.read(`sessionStorage.getItem('bn_coop_room')===${JSON.stringify(code)}`));
    await guest.send('Page.navigate', { url: otherLink });
    await wait(guest, 'explicit invitation wins over unrelated remembered party', s => s.multiplayer?.websocket === 'CONNECTED' && s.multiplayer?.code === otherCode);
    check('new invitation replaces remembered target only after acceptance', await guest.read(`sessionStorage.getItem('bn_coop_room')===${JSON.stringify(otherCode)} && !new URL(location.href).searchParams.has('join')`));
    await shot(guest, '08-invitation-over-remembered-session');
    await guest.read("history.pushState(null,'','/?join=0000');window.dispatchEvent(new PopStateEvent('popstate'))");
    await until(guest, "document.querySelector('#invite-conflict')?.textContent.includes('invalid')", 'invalid invitation while already in a party');
    check('invalid active-party invitation retains party without exposing manual join or leave-and-join', await guest.read<boolean>(`binaryNinja.coop.active && binaryNinja.coop.room.code===${JSON.stringify(otherCode)} && !document.querySelector('#join-room-form') && !document.querySelector('#join-code') && !document.querySelector('#accept-other-invite')`)
        && (await snapshot(otherHost)).multiplayer!.shared!.connected[1]);
    await shot(guest, '09-active-party-invalid-invitation');
    await guest.read(`history.pushState(null,'',${JSON.stringify(link)});window.dispatchEvent(new PopStateEvent('popstate'))`);
    await until(guest, "!!document.querySelector('#invite-conflict')", 'active-party invitation conflict');
    check('a corrected active-party invitation replaces its previous notice', await guest.read("document.querySelectorAll('#invite-conflict').length===1 && document.querySelectorAll('#accept-other-invite').length===1 && !document.querySelector('#invite-conflict').textContent.includes('invalid')"));
    check('opening invitation while in another active party waits for an explicit leave choice', (await snapshot(guest)).multiplayer!.code === otherCode && (await snapshot(otherHost)).multiplayer!.shared!.connected[1]);
    await shot(guest, '09-active-party-invitation-choice');
    await click(guest, '#accept-other-invite');
    await wait(guest, 'explicit leave joins original invitation', s => s.multiplayer?.websocket === 'CONNECTED' && s.multiplayer?.code === code && s.multiplayer?.slot === 2);

    const outsider = await h.page(link, debug); await onboardNinja(outsider, 'ThirdNinja', 'cyan');
    await until(outsider, "document.querySelector('#connection-status')?.textContent.includes('already has two players')", 'full party error');
    check('full invitation retains retry and URL without changing original two-player party', await outsider.read<boolean>("new URL(location.href).searchParams.has('join') && !!document.querySelector('#retry-join') && !binaryNinja.coop.active")
        && (await snapshot(host)).multiplayer!.shared!.connected.every(Boolean));
    await shot(outsider, '10-full-party-feedback');
    await click(outsider, '#retry-join');
    await until(outsider, "document.querySelector('#connection-status')?.textContent.includes('already has two players')", 'full party retry');
    await click(outsider, '#back-main'); await click(outsider, '#show-join');
    await fill(outsider, '#join-code', `https://untrusted.example/?join=${code}`); await click(outsider, '#join-room');
    check('pasted foreign invitation is rejected locally without navigation or a connection', await outsider.read(`location.origin===${JSON.stringify(origin)} && !binaryNinja.coop.active && !!document.querySelector('#join-error').textContent`));
    const missing = [code, otherCode].includes('ZZZZ') ? 'YYYY' : 'ZZZZ';
    await outsider.send('Page.navigate', { url: `${origin}/?join=${missing}` });
    await until(outsider, "document.querySelector('#connection-status')?.textContent.includes('Party not found')", 'missing invitation feedback');
    await shot(outsider, '11-missing-party-feedback');
    await outsider.send('Page.navigate', { url: `${origin}/?join=0000` });
    await until(outsider, "document.querySelector('#join-error')?.textContent.includes('invalid')", 'invalid invitation feedback');
    check('invalid invitation never creates or reconnects a party', await outsider.read('!binaryNinja.coop.active && !binaryNinja.coop.room'));
    await shot(outsider, '12-invalid-invitation-feedback');

    await click(otherHost, '#leave-coop'); await click(otherHost, '#play-coop'); await click(otherHost, '#create-party');
    const fresh = await wait(otherHost, 'fresh manual-entry party', s => s.multiplayer?.shared?.party?.phase === 'lobby' && s.multiplayer?.code !== otherCode);
    const freshCode = fresh.multiplayer!.code!;
    await fill(outsider, '#join-code', `${origin}/?join=${freshCode}`); await click(outsider, '#join-room');
    await wait(outsider, 'pasted first-party invitation joins normally', s => s.multiplayer?.websocket === 'CONNECTED' && s.multiplayer?.code === freshCode && s.multiplayer?.slot === 2);
    check('correcting an invalid invitation with a valid manual target consumes the obsolete query', await outsider.read("!new URL(location.href).searchParams.has('join')"));
    await click(outsider, '#leave-coop'); await click(outsider, '#play-coop'); await click(outsider, '#show-join');
    await fill(outsider, '#join-code', freshCode); await click(outsider, '#join-room');
    await wait(outsider, 'manual four-character code still joins', s => s.multiplayer?.websocket === 'CONNECTED' && s.multiplayer?.code === freshCode && s.multiplayer?.slot === 2);
    check('manual codes and canonical pasted URLs both preserve guest assignment', true);
    await outsider.send('Page.reload');
    await wait(outsider, 'corrected invitation reloads into accepted remembered session', s => s.multiplayer?.websocket === 'CONNECTED' && s.multiplayer?.code === freshCode && s.multiplayer?.slot === 2);
    for (const p of h.clients) check('no browser runtime errors', p.errors.length === 0, p.errors.join('\n'));
    await writeFile(join(h.shots, 'checks.txt'), h.checks.join('\n') + '\n');
} catch (error) {
    for (const [i, p] of h.clients.entries()) {
        await shot(p, `failure-${i}`).catch(() => {});
        await writeFile(join(h.shots, `failure-${i}.json`), JSON.stringify(await snapshot(p).catch(() => null), null, 2));
    }
    console.error(String(error).split(': {')[0]); process.exitCode = 1;
} finally { await h.cleanup(); }
