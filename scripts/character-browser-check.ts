#!/usr/bin/env node
/** Real browser input and production Canvas pixels; no seeded character profiles or physics mutations. */
import { readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { coopBrowser, type Cdp } from './coop-browser.ts';
import { onboardNinja } from './character-onboarding.ts';
import { colourHex, type CharacterColour } from '../src/character/profile.ts';
import { freshProgress } from '../src/slice/progress.ts';

const h = await coopBrowser({ shots: process.env.BN_SHOTS ?? resolve('docs/playtest/2026-10-20-characters'), internalLabs: false, onboarding: false });
const { check, click, shot, sleep, snapshot, wait } = h;
const evidence: unknown[] = [];
const instrumentation = `(() => {
    const records = [], counts = {};
    Object.defineProperty(window, '__characterPaint', { value: { records, counts } });
    const prototype = CanvasRenderingContext2D.prototype, stroke = prototype.strokeRect, text = prototype.fillText;
    prototype.strokeRect = function(x,y,w,h) {
        const result=stroke.call(this,x,y,w,h);
        if(w===22 && h===34) {
            const m=this.getTransform(), id=this.canvas.id;
            counts[id]=(counts[id]||0)+1;
            records.push({kind:'ninja',canvas:id,at:performance.now(),colour:this.strokeStyle,x:m.e,y:m.f,scale:Math.hypot(m.a,m.b)});
            if(records.length>2000) records.splice(0,1000);
        }
        return result;
    };
    prototype.fillText = function(value,x,y,maxWidth) {
        const result=maxWidth===undefined?text.call(this,value,x,y):text.call(this,value,x,y,maxWidth);
        if(String(value).includes(' / P') || String(value).includes(' / YOU')) {
            records.push({kind:'label',canvas:this.canvas.id,at:performance.now(),text:String(value),x,y,width:this.measureText(value).width,font:this.font,transform:{a:this.getTransform().a,d:this.getTransform().d}});
            if(records.length>2000) records.splice(0,1000);
        }
        return result;
    };
    const seen={creator:false};
    Object.defineProperty(window,'__characterOnboardingSeen',{value:seen});
    new MutationObserver(()=>{ if(document.querySelector('#initialize-ninja')) seen.creator=true; }).observe(document,{subtree:true,childList:true});
})()`;

async function until(p: Cdp, expression: string, label = expression, timeout = 15000) {
    const end = Date.now() + timeout;
    while (!await p.read<boolean>(expression)) {
        if (Date.now() > end) throw new Error(`Timed out: ${label}`);
        await sleep(25);
    }
}
async function instrument(p: Cdp) {
    await p.send('Page.addScriptToEvaluateOnNewDocument', { source: instrumentation });
    await p.read(instrumentation);
}
async function point(p: Cdp, selector: string) {
    return p.read<{ x: number; y: number }>(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
}
async function hover(p: Cdp, selector: string) {
    await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...await point(p, selector), button: 'none' });
}
async function key(p: Cdp, value: string, code: string, vk: number, modifiers = 0) {
    const text = !modifiers && code === 'Enter' ? '\r' : !modifiers && code === 'Space' ? ' ' : undefined;
    await p.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key: value, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers, ...(text ? { text, unmodifiedText: text } : {}) });
    await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: value, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
    await sleep(35);
}
async function typeName(p: Cdp, name: string) {
    await click(p, '#operative-name'); await key(p, 'a', 'KeyA', 65, 2); await p.send('Input.insertText', { text: name });
}
async function profile(p: Cdp) { return p.read<{ profile: { name: string; colour: CharacterColour } | null; revision: number }>("fetch('/api/profile').then(r=>r.json())"); }
async function preview(p: Cdp, colour: CharacterColour, label: string) {
    const rgb = colourHex(colour).match(/[0-9a-f]{2}/ig)!.map(value => parseInt(value, 16));
    const result = await p.read<{ accent: string; colour: string; pixels: number; calls: number }>(`(()=>{
        const c=document.querySelector('#ninja-preview'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,rgb=${JSON.stringify(rgb)};
        let pixels=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>150&&rgb.every((n,j)=>Math.abs(d[i+j]-n)<32))pixels++;
        return{accent:c.dataset.previewAccent,colour:c.dataset.previewColour,pixels,calls:__characterPaint.counts[c.id]||0};
    })()`);
    check(label, result.colour === colour && result.accent.toUpperCase() === colourHex(colour) && result.pixels > 30 && result.calls > 0,
        `${result.accent}; ${result.pixels} actual accent pixels; ${result.calls} production ninja outline draws`);
    evidence.push({ label, result });
}
async function selected(p: Cdp, colour: CharacterColour) {
    return p.read<boolean>(`document.querySelector('[data-colour="${colour}"]').getAttribute('aria-pressed')==='true'`);
}
async function renderEvidence(p: Cdp, canvasSelector: string, names: [string, string], colours: [CharacterColour, CharacterColour], positionCheck = true) {
    await sleep(250);
    const expected = colours.map(colour => colourHex(colour).match(/[0-9a-f]{2}/ig)!.map(value => parseInt(value, 16)));
    const result = await p.read<any>(`(()=>{
        const c=document.querySelector(${JSON.stringify(canvasSelector)}),ctx=c.getContext('2d');
        const recent=__characterPaint.records.filter(r=>r.canvas===c.id&&performance.now()-r.at<250);
        const expected=${JSON.stringify(expected)},names=${JSON.stringify(names)};
        const bodies=expected.map(rgb=>{
            const record=recent.findLast(r=>r.kind==='ninja'&&r.colour.match(/\\d+/g)?.slice(0,3).every((v,i)=>Number(v)===rgb[i]));
            if(!record)return null;
            const radius=Math.max(8,Math.ceil(24*record.scale)),x=Math.max(0,Math.floor(record.x-radius)),y=Math.max(0,Math.floor(record.y-radius));
            const width=Math.min(c.width-x,radius*2),height=Math.min(c.height-y,radius*2);let pixels=0;
            if(width>0&&height>0){const d=ctx.getImageData(x,y,width,height).data;for(let i=0;i<d.length;i+=4)if(rgb.every((n,j)=>Math.abs(d[i+j]-n)<38))pixels++;}
            return{...record,pixels};
        });
        const labels=names.map((name,i)=>recent.findLast(r=>r.kind==='label'&&(r.text.startsWith(name+' / P'+(i+1))||r.text.startsWith(name.slice(0,7)+'… / P'+(i+1)))));
        let expectedPositions=null;
        if(globalThis.binaryNinja){
            const s=binaryNinja.snapshot(),cam=binaryNinja.renderer.camera,local=s.multiplayer.slot;
            expectedPositions=[1,2].map(slot=>{const n=slot===local?s.player:s.multiplayer.remote;return n?{x:(n.x-cam.originX())*cam.zoom,y:(n.y-cam.originY())*cam.zoom}:null});
        }
        return{bodies,labels,expectedPositions};
    })()`);
    check(`${canvasSelector}: both named ninjas have their own production renderer accents and visible pixels`, result.bodies.every((b: any) => b && b.pixels > 1) && result.labels.every(Boolean), JSON.stringify(result.bodies.map((b: any) => b && { colour: b.colour, pixels: b.pixels })));
    if (positionCheck) check('slot colours stay at the correct physical player positions on this viewing computer',
        result.bodies.every((body: any, i: number) => result.expectedPositions[i] && Math.hypot(body.x - result.expectedPositions[i].x, body.y - result.expectedPositions[i].y) < 3));
    check('name labels use readable 11px screen text and retain P1/P2 roles', result.labels.every((label: any) => label.font.includes('11px') && label.transform.a === 1 && label.transform.d === 1));
    evidence.push(result);
    return result;
}
async function navigate(p: Cdp, url: string, ready: string) {
    await p.send('Page.navigate', { url }); await until(p, ready);
}

try {
    const url = await h.startServer(), debug = await h.launch();
    const a = await h.page(url, debug); await instrument(a);
    await until(a, "!!document.querySelector('#initialize-ninja')");
    check('new visitor is gated by INITIALIZE NINJA', !(await snapshot(a)).character.ready && !await a.read("!!document.querySelector('#create-party')"));
    await shot(a, '01-first-time-creation');
    await preview(a, 'cyan', 'initial cyan selection reaches the actual renderer');
    await shot(a, '02-cyan-selected');
    await hover(a, '[data-colour="purple"]'); await preview(a, 'purple', 'real pointer hover immediately paints purple without clicking');
    check('hover keeps cyan selected and leaves the saved profile empty', await selected(a, 'cyan') && (await profile(a)).profile === null);
    await shot(a, '03-purple-hover');
    await hover(a, '[data-colour="orange"]'); await preview(a, 'orange', 'moving directly between swatches paints orange');
    await hover(a, '[data-colour="pink"]'); await preview(a, 'pink', 'repeated swatch movement paints pink');
    await hover(a, '#character-title'); await preview(a, 'cyan', 'pointer leaving the palette restores selected cyan');
    await shot(a, '04-hover-ended-cyan');
    await click(a, '[data-colour="purple"]'); await hover(a, '#character-title');
    await preview(a, 'purple', 'click selects purple and leaving it keeps purple');
    check('local selection is not persisted before initialize', await selected(a, 'purple') && (await profile(a)).profile === null);
    await shot(a, '05-purple-selected');

    await click(a, '[data-colour="cyan"]'); await click(a, '#operative-name');
    await key(a, 'Tab', 'Tab', 9); await preview(a, 'cyan', 'keyboard Tab focuses and previews cyan');
    await key(a, 'Tab', 'Tab', 9); await preview(a, 'purple', 'keyboard focus temporarily previews purple');
    check('keyboard focus does not select until activation', await selected(a, 'cyan'));
    await key(a, 'Enter', 'Enter', 13); check('Enter commits focused purple locally', await selected(a, 'purple'));
    await key(a, 'Tab', 'Tab', 9); await preview(a, 'blue', 'keyboard can preview the next colour');
    await key(a, ' ', 'Space', 32); check('Space commits focused electric blue locally', await selected(a, 'blue'));
    await click(a, '[data-colour="purple"]');
    await typeName(a, ''); await click(a, '#initialize-ninja');
    check('empty name receives a visible validation message', await a.read("!document.querySelector('#character-error').hidden && document.querySelector('#operative-name').getAttribute('aria-invalid')==='true'"));
    await typeName(a, '<svg>'); await click(a, '#initialize-ninja');
    check('HTML-like name is rejected and displayed only as text', await a.read("!document.querySelector('#character-error').hidden && document.querySelector('#character-preview-name').textContent==='<svg>' && !document.querySelector('#character-preview-name svg')"));
    await typeName(a, 'ShadowByte');
    check('name entry immediately updates the preview caption', await a.read("document.querySelector('#character-preview-name').textContent==='ShadowByte'"));
    await shot(a, '06-name-entry');
    const phases = new Set<string>();
    const animationEnd = Date.now() + 6600;
    while (Date.now() < animationEnd) { phases.add(await a.read("document.querySelector('#ninja-preview').dataset.animation")); await sleep(100); }
    check('actual preview cycles idle, run, jump and landing without gameplay simulation', ['idle', 'run', 'jump'].every(phase => phases.has(phase)) && (await snapshot(a)).player.vx === 0);
    await a.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await until(a, "matchMedia('(prefers-reduced-motion: reduce)').matches && document.querySelector('#ninja-preview').dataset.animation==='idle'");
    await sleep(80); // Chromium delivers the media-query change asynchronously.
    const still = await a.read<string>("document.querySelector('#ninja-preview').toDataURL()");
    await sleep(250);
    check('reduced motion stops animation frames', still === await a.read("document.querySelector('#ninja-preview').toDataURL()"));
    await hover(a, '[data-colour="orange"]'); await preview(a, 'orange', 'reduced motion still paints colour input immediately');
    await hover(a, '#character-title'); await shot(a, '12-reduced-motion');
    await click(a, '#initialize-ninja'); await wait(a, 'saved character enters normal menu', s => s.character.ready && s.character.persisted);
    check('initialize persists selected purple, never a temporary hovered orange', (await profile(a)).profile?.colour === 'purple');
    const draws = await a.read<number>("__characterPaint.counts['ninja-preview']");
    await sleep(200); check('closed creator stops rendering its preview', draws === await a.read("__characterPaint.counts['ninja-preview']"));
    const visitor = (await snapshot(a)).persistence.visitor;
    await a.send('Page.reload'); await wait(a, 'returning visitor menu', s => s.character.ready);
    check('returning visitor skips onboarding without flashing it', !await a.read('__characterOnboardingSeen.creator') && (await snapshot(a)).character.profile?.name === 'ShadowByte' && (await snapshot(a)).persistence.visitor === visitor);
    await shot(a, '07-returning-saved-character');
    await click(a, '#customize-ninja'); await preview(a, 'purple', 'customization loads the saved colour');
    await shot(a, '08-customization-from-menu');
    await typeName(a, 'DiscardMe'); await click(a, '[data-colour="red"]'); await hover(a, '[data-colour="lime"]'); await click(a, '#cancel-character');
    check('cancel discards selected and previewed colours plus edited name', JSON.stringify((await profile(a)).profile) === JSON.stringify({ name: 'ShadowByte', colour: 'purple' }) && (await snapshot(a)).character.profile?.name === 'ShadowByte');

    for (const room of ['pressure', 'switch', 'relay', 'uplink']) {
        await click(a, `[data-room="${room}"]`); await wait(a, `solo ${room}`, s => s.room === room);
        await sleep(100);
        check(`solo ${room} uses saved purple through drawNinja`, await a.read("__characterPaint.records.some(r=>r.kind==='ninja' && r.canvas!=='ninja-preview' && performance.now()-r.at<200 && r.colour.startsWith('rgba(181, 155, 255'))"));
        await click(a, '#pause');
    }
    await click(a, '#reset-progress'); await click(a, '#confirm-reset');
    check('resetting campaign progress retains the saved character', (await snapshot(a)).room === 'pressure' && (await profile(a)).profile?.colour === 'purple');

    const b = await h.page(url, debug); await instrument(b);
    await onboardNinja(b, 'ZeroDay', 'orange');
    check('two independent browser visitors create different persistent characters', (await snapshot(b)).persistence.visitor !== visitor && (await profile(b)).profile?.name === 'ZeroDay');
    await click(a, '#create-party'); const lobby = await wait(a, 'host lobby', s => s.multiplayer?.shared?.party?.phase === 'lobby');
    const code = lobby.multiplayer!.code!;
    await click(b, '#join-code'); await b.send('Input.insertText', { text: code }); await click(b, '#join-room');
    for (const p of [a, b]) await wait(p, 'both profiles in same lobby', s => s.multiplayer?.shared?.connected.every(Boolean) === true && s.multiplayer.shared.profiles?.[1]?.name === 'ZeroDay');
    for (const p of [a, b]) check('lobby shows both names, colours and original host/guest roles', await p.read("document.querySelector('[data-player-slot=\"1\"]').textContent.includes('ShadowByte') && document.querySelector('[data-player-slot=\"1\"]').textContent.includes('PURPLE') && document.querySelector('[data-player-slot=\"2\"]').textContent.includes('ZeroDay') && document.querySelector('[data-player-slot=\"2\"]').textContent.includes('ORANGE')"));
    await shot(a, '10-coop-lobby-two-names');
    check('guest retains no chamber-selection permission', !await b.read("!!document.querySelector('[data-select-level]')") && await b.read("binaryNinja.coop.selectLevel('race-condition')===false"));
    await click(a, '[data-select-level="handshake"]');
    for (const p of [a, b]) { await wait(p, 'Handshake overview', s => s.overviewVisible); await click(p, '#start-room'); }
    await renderEvidence(a, '#stage', ['ShadowByte', 'ZeroDay'], ['purple', 'orange']);
    await renderEvidence(b, '#stage', ['ShadowByte', 'ZeroDay'], ['purple', 'orange']);
    await shot(a, '09-two-coloured-ninjas'); await shot(b, '09b-partner-perspective');

    await h.key(a, 'Tab', true); await sleep(1300);
    const low = await renderEvidence(a, '#stage', ['ShadowByte', 'ZeroDay'], ['purple', 'orange']);
    check('overview names remain compact and readable at low zoom', (await snapshot(a)).camera.zoom < .5 && low.labels.every((label: any) => label.width < 190));
    await shot(a, '11-low-zoom-name-readability'); await h.key(a, 'Tab', false);
    await b.send('Page.reload'); await wait(b, 'guest reconnects in same party', s => s.character.ready && s.multiplayer?.slot === 2 && s.multiplayer.code === code && s.multiplayer.shared?.connected.every(Boolean) === true);
    check('reconnection restores both profiles without swapping slots', (await snapshot(b)).multiplayer!.shared!.profiles?.map(profile => profile?.name).join(',') === 'ShadowByte,ZeroDay');
    await click(a, '#pause');
    if (!(await b.read<boolean>("!document.querySelector('#menu').hidden"))) await click(b, '#pause');
    const before = await snapshot(a);
    await click(a, '#customize-ninja'); await typeName(a, 'ShadowFlux'); await click(a, '[data-colour="lime"]'); await click(a, '#save-character');
    await wait(b, 'connected partner receives changed character', s => s.multiplayer?.shared?.profiles?.[0]?.name === 'ShadowFlux' && s.multiplayer.shared.profiles[0].colour === 'lime');
    const after = await snapshot(a);
    check('customizing while connected preserves party, chamber, checkpoint, badges and cube positions',
        after.multiplayer?.code === before.multiplayer?.code && after.room === before.room && after.checkpoint === before.checkpoint
        && JSON.stringify(after.multiplayer?.shared?.party) === JSON.stringify(before.multiplayer?.shared?.party)
        && JSON.stringify(after.cubes) === JSON.stringify(before.cubes));
    for (const p of [a, b]) { await click(p, '#continue'); if ((await snapshot(p)).overviewVisible) await click(p, '#start-room'); }
    await renderEvidence(b, '#stage', ['ShadowFlux', 'ZeroDay'], ['lime', 'orange']);
    await shot(b, '14-live-profile-update');

    // Public custom gameplay uses the same visitors and their own profiles, not level authorship.
    const document = JSON.parse(await readFile('levels/drafts/cooperative-test.json', 'utf8'));
    const uploaded = await a.read<{ hash: string }>(`fetch('/api/custom/snapshots',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({document:${JSON.stringify(document)}})}).then(async r=>{const v=await r.json();if(!r.ok)throw Error(v.error);return v})`);
    await navigate(a, `${url}custom-level.html?host=${uploaded.hash}`, '!!globalThis.customLevel?.observe().ready');
    const invite = await a.read<string>("document.querySelector('#invite').value");
    await navigate(b, invite, '!!globalThis.customLevel?.observe().ready');
    for (const p of [a, b]) await until(p, 'customLevel.observe().session.peers.every(Boolean)');
    for (const p of [a, b]) {
        check('public custom chamber publishes the participants’ own profiles', await p.read("customLevel.observe().session.room.profiles.map(p=>p.name).join(',')==='ShadowFlux,ZeroDay' && document.querySelector('#custom-players').textContent.includes('ShadowFlux') && document.querySelector('#custom-players').textContent.includes('ZeroDay')"));
        await renderEvidence(p, '#stage', ['ShadowFlux', 'ZeroDay'], ['lime', 'orange'], false);
    }
    await shot(a, '15-public-custom-profiles');

    for (const p of [a, b]) {
        await navigate(p, `${url}?labs=1`, '!!globalThis.binaryNinja?.snapshot().character.ready');
        // Profile readiness precedes the asynchronous persisted-party reconnect.
        // Wait for that real connection before leaving, otherwise a late join can
        // replace the main menu after the test has started looking for lab inputs.
        await wait(p, 'saved official party reconnects after custom play', s => s.room === 'handshake' && s.multiplayer?.websocket === 'CONNECTED');
        if ((await snapshot(p)).multiplayer) {
            if (await p.read<boolean>("document.querySelector('#menu').hidden")) await click(p, '#pause');
            await until(p, "!!document.querySelector('#leave-coop')");
            await click(p, '#leave-coop');
        }
    }
    await click(a, '[data-create-lab="pairing-bay"]');
    const lab = await wait(a, 'internal lab created', s => s.room === 'pairing-bay' && s.multiplayer?.websocket === 'CONNECTED');
    await click(b, '#join-code'); await b.send('Input.insertText', { text: lab.multiplayer!.code! }); await click(b, '#join-room');
    for (const p of [a, b]) await wait(p, 'both participants in internal lab', s => s.room === 'pairing-bay' && s.multiplayer?.shared?.connected.every(Boolean) === true);
    await renderEvidence(a, '#stage', ['ShadowFlux', 'ZeroDay'], ['lime', 'orange']);
    await renderEvidence(b, '#stage', ['ShadowFlux', 'ZeroDay'], ['lime', 'orange']);
    await shot(a, '17-internal-lab-profiles');

    // Existing campaign visitors receive onboarding once without losing their stored progress.
    const existing = await h.page(url, debug); await instrument(existing);
    const progress = freshProgress(); progress.currentRoom = 'relay'; progress.completedRooms = ['pressure', 'switch'];
    await existing.read(`fetch('/api/progress',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:0,progress:${JSON.stringify(progress)}})}).then(r=>{if(!r.ok)throw Error('Could not seed existing campaign save')})`);
    await existing.send('Page.reload'); await until(existing, "!!document.querySelector('#initialize-ninja')");
    check('visitor with progress and no profile is prompted without losing completion badges', (await snapshot(existing)).progress.completedRooms.length === 2 && (await snapshot(existing)).room === 'relay');
    await onboardNinja(existing, 'ReturningOp', 'blue');
    check('initializing an existing visitor preserves campaign state', (await snapshot(existing)).progress.completedRooms.length === 2 && (await snapshot(existing)).room === 'relay');

    // Service failure is a visible recovery path; an unsaved guest is never called persistent.
    const offline = await h.page(url, debug); await instrument(offline);
    await offline.send('Network.enable'); await offline.send('Network.setBlockedURLs', { urls: ['*/api/profile'] });
    await offline.send('Page.reload'); await until(offline, "!!document.querySelector('#retry-profile')");
    check('profile service outage presents retry and explicit nonpersistent fallback', await offline.read("!!document.querySelector('#guest-profile') && document.querySelector('#menu').textContent.includes('not saved')"));
    await offline.send('Network.setBlockedURLs', { urls: [] }); await click(offline, '#retry-profile');
    await until(offline, "!!document.querySelector('#initialize-ninja')"); check('retry recovers into real onboarding', true);
    await offline.send('Network.setBlockedURLs', { urls: ['*/api/profile'] }); await offline.send('Page.reload');
    await until(offline, "!!document.querySelector('#guest-profile')"); await click(offline, '#guest-profile');
    await typeName(offline, 'GuestNinja'); await click(offline, '[data-colour="pink"]'); await click(offline, '#initialize-ninja');
    await wait(offline, 'guest reaches main menu', s => s.character.ready);
    check('guest fallback is explicitly session-only and never marked saved', !(await snapshot(offline)).character.persisted && await offline.read("document.querySelector('.character-summary').textContent.includes('NOT SAVED')"));
    await shot(offline, '16-unsaved-guest');
    await offline.send('Network.setBlockedURLs', { urls: [] });
    check('guest character was never persisted', (await profile(offline)).profile === null);
    await offline.send('Page.reload'); await until(offline, "!!document.querySelector('#initialize-ninja')");

    const mobile = await h.page(url, debug); await instrument(mobile);
    await mobile.send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 1, mobile: true });
    await mobile.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await mobile.send('Page.reload');
    await until(mobile, "!!document.querySelector('[data-colour=\"orange\"]')");
    check('mobile creator has no horizontal overflow or gameplay controls covering its form', await mobile.read("document.documentElement.scrollWidth<=innerWidth && [...document.querySelectorAll('.touch-pad')].every(e=>getComputedStyle(e).display==='none')"));
    const touch = await point(mobile, '[data-colour="orange"]');
    await mobile.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...touch, id: 1, radiusX: 3, radiusY: 3, force: 1 }] });
    await mobile.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(100);
    await preview(mobile, 'orange', 'touch tap selects and paints orange without hover');
    check('touch selection is committed locally', await selected(mobile, 'orange'));
    await typeName(mobile, 'TouchNinja');
    await shot(mobile, '13-mobile-touch-creator');
    await point(mobile, '#initialize-ninja'); await shot(mobile, '13b-mobile-form-actions');
    await click(mobile, '#initialize-ninja'); await wait(mobile, 'touch ninja saved', s => s.character.ready);
    check('touch selection persists the selected colour', (await profile(mobile)).profile?.colour === 'orange');

    for (const p of h.clients) check('no browser runtime errors', p.errors.length === 0, p.errors.join('\n'));
    for (const file of await readdir(h.shots)) if (/^failure-\d+\.png$/.test(file)) await unlink(join(h.shots, file));
    await writeFile(join(h.shots, 'checks.txt'), h.checks.join('\n') + '\n');
    await writeFile(join(h.shots, 'renderer-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
} catch (error) {
    for (const [i, p] of h.clients.entries()) await shot(p, `failure-${i}`).catch(() => {});
    await writeFile(join(h.shots, 'checks.txt'), h.checks.join('\n') + `\nFAIL ${String(error)}\n`);
    console.error(error); process.exitCode = 1;
} finally { await h.cleanup(); }
