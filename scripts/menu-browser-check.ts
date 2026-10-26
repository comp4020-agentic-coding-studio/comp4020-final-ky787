/** Real browser checks of title navigation, focus, persistence and pause boundaries. */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { coopBrowser, type Cdp } from './coop-browser.ts';
import { onboardNinja } from './character-onboarding.ts';
import { freshProgress } from '../src/slice/progress.ts';
const shots = resolve(process.env.BN_SHOTS ?? 'docs/playtest/2026-10-26-menu/navigation');
await mkdir(shots, { recursive: true });
const h = await coopBrowser({ shots, internalLabs: false, onboarding: false });
async function until(p: Cdp, expression: string) {
    const deadline = Date.now() + 15000;
    while (!await p.read<boolean>(expression)) { if (Date.now() > deadline) throw new Error(expression); await h.sleep(25); }
}
async function escape(p: Cdp) {
    for (const type of ['rawKeyDown', 'keyUp']) await p.send('Input.dispatchKeyEvent', { type, code: 'Escape', key: 'Escape', windowsVirtualKeyCode: 27 });
    await h.sleep(100);
}
async function outside(p: Cdp) {
    for (const type of ['mousePressed', 'mouseReleased']) await p.send('Input.dispatchMouseEvent', { type, x: 15, y: 120, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
    await h.sleep(100);
}
try {
    const url = await h.startServer(), browser = await h.launch(), p = await h.page(url, browser);
    await until(p, '!!document.querySelector("#initialize-ninja")');
    await outside(p); await escape(p);
    h.check('outside click and Escape cannot dismiss initial setup', await p.read('!!document.querySelector("#initialize-ninja") && !binaryNinja.started'));
    await onboardNinja(p, 'Signal', 'purple');
    await until(p, 'binaryNinja.snapshot().view === "home"');
    h.check('normal landing offers five clear destinations without tutorial or campaign grids', await p.read('["tutorial","play-coop","level-builder","customize-ninja","about"].every(id=>document.querySelector("#"+id)) && !document.querySelector("[data-room],.campaign-select")'));
    h.check('home preview paints selected profile through existing renderer', await p.read('document.querySelector("#home-ninja-preview").dataset.previewColour === "purple"'));
    await outside(p); await escape(p); h.check('title screen cannot resume through backdrop or Escape', (await h.snapshot(p)).view === 'home');
    for (const [width, height] of [[1600,900],[1366,768],[1024,768],[390,844]]) {
        await p.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }); await h.sleep(180);
        h.check(`title ${width}×${height} fits and keeps main actions visible`, await p.read('document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll(".home-nav button,#settings")].every(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth})'));
        await h.shot(p, `title-${width}x${height}`);
    }
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
    await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await h.sleep(150);
    const still = await p.read('document.querySelector("#home-ninja-preview").toDataURL()'); await h.sleep(200);
    h.check('reduced-motion title preview is static', still === await p.read('document.querySelector("#home-ninja-preview").toDataURL()'));
    await p.read('window.__oldPreview=document.querySelector("#home-ninja-preview"); window.__oldImage=__oldPreview.toDataURL()');
    await h.click(p, '#customize-ninja'); await h.sleep(150);
    h.check('leaving home disposes detached preview animation', await p.read('__oldPreview.toDataURL()===__oldImage'));
    await h.click(p, '[data-colour="orange"]'); await h.click(p, '#save-character');
    await until(p, 'binaryNinja.snapshot().view === "home"');
    h.check('saving customization immediately updates home preview', await p.read('document.querySelector("#home-ninja-preview").dataset.previewColour === "orange"'));
    await h.click(p, '#customize-ninja'); await h.click(p, '[data-colour="lime"]'); await h.click(p, '#cancel-character');
    h.check('cancel customization returns home with saved colour', await p.read('document.querySelector("#home-ninja-preview").dataset.previewColour === "orange"'));
    await h.click(p, '#play-coop'); await h.shot(p, 'coop-start-or-join');
    await h.click(p, '#show-join'); await h.shot(p, 'coop-join-code');
    await h.click(p, '#join-code'); await p.send('Input.insertText', { text: 'https://example.org/?join=7K3M' }); await h.click(p, '#join-room');
    h.check('foreign pasted links show visible feedback and do not connect', await p.read('!document.querySelector("#join-error").hidden && !binaryNinja.coop.active'));
    await escape(p); await escape(p);
    await h.click(p, '#about'); await h.shot(p, 'about'); await escape(p);
    await h.click(p, '#level-builder'); h.check('both authoring destinations are accessible', await p.read('document.querySelector("#open-workbench").getAttribute("href")==="/workbench.html" && document.querySelector("#my-levels").getAttribute("href")==="/my-levels.html"')); await h.shot(p, 'builder'); await escape(p);
    const previous = freshProgress(); previous.currentRoom = 'relay'; previous.completedRooms = ['pressure','switch']; previous.mechanics = ['carry','grapple'];
    previous.history = [{ room:'switch', event:'grapple', at:'2026-10-26T00:00:00.000Z' }]; previous.rooms.pressure.cubeOnPlate = true; previous.rooms.switch.switchB = true;
    await p.read(`fetch('/api/progress').then(r=>r.json()).then(s=>fetch('/api/progress',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:s.revision,progress:${JSON.stringify(previous)}})})).then(r=>{if(!r.ok)throw Error('Seed failed')})`);
    await p.send('Page.reload'); await until(p, 'globalThis.binaryNinja?.snapshot().character.ready && binaryNinja.snapshot().view==="home"');
    h.check('returning visitor visibly continues current room', await p.read('document.querySelector("#continue").textContent.includes("RELAY")'));
    const visitor = (await h.snapshot(p)).persistence.visitor;
    await h.click(p, '#tutorial'); await h.wait(p, 'fresh PRESSURE', s=>s.started && s.room==='pressure');
    const fresh = await h.snapshot(p);
    h.check('Tutorial resets puzzle rooms while retaining identity, completion, mechanics and history', fresh.persistence.visitor === visitor && JSON.stringify(fresh.progress.rooms)===JSON.stringify(freshProgress().rooms) && JSON.stringify(fresh.progress.completedRooms)===JSON.stringify(previous.completedRooms) && JSON.stringify(fresh.progress.mechanics)===JSON.stringify(previous.mechanics) && JSON.stringify(fresh.progress.history)===JSON.stringify(previous.history));
    await h.key(p,'KeyD',true); await h.sleep(100); await h.click(p,'#pause');
    h.check('solo pause is compact and contains no character or campaign UI', await p.read('document.querySelector(".pause-card").getBoundingClientRect().width<=400 && !document.querySelector("#customize-ninja,.campaign-select")'));
    await h.shot(p,'solo-pause');
    h.check('pause releases held inputs and silences audio', await p.read('!binaryNinja.input.state.right && !binaryNinja.input.state.grappleHeld && binaryNinja.snapshot().audio.voices===0'));
    await outside(p); await h.key(p,'KeyD',false); await h.sleep(300);
    h.check('outside dismissal resumes same room with canvas focus and no grapple', await p.read('binaryNinja.started && binaryNinja.world.room.id==="pressure" && document.activeElement.id==="stage" && !binaryNinja.input.state.right && binaryNinja.world.player.rope.phase==="idle"'));
    await escape(p); h.check('Escape pauses', (await h.snapshot(p)).view==='pause'); await escape(p); h.check('Escape resumes same room', (await h.snapshot(p)).started);
    await h.click(p,'#pause'); await h.key(p,'Space',true); await h.key(p,'Space',false); await h.sleep(100);
    h.check('Space on Resume does not queue a jump or grapple', await p.read('binaryNinja.started && binaryNinja.world.player.grounded && binaryNinja.world.player.rope.phase==="idle"'));
    await h.click(p,'#pause'); await h.click(p,'#restart-room'); h.check('Restart Room preserves historical records', (await h.snapshot(p)).progress.completedRooms.length===2);
    await h.click(p,'#pause'); await h.click(p,'#main-menu'); await h.click(p,'#settings'); await h.shot(p,'settings');
    await h.click(p,'#reset-progress'); await outside(p);
    h.check('outside click cannot dismiss destructive confirmation', await p.read('!document.querySelector("#reset-confirmation").hidden && !binaryNinja.started'));
    await escape(p); h.check('Escape cancels reset without discarding progress', await p.read('document.querySelector("#reset-confirmation").hidden && binaryNinja.store.progress.completedRooms.length===2'));
    await escape(p); await p.send('Page.reload'); await until(p,'globalThis.binaryNinja?.snapshot().character.ready');
    h.check('main menu return persists tutorial restart and character', (await h.snapshot(p)).room==='pressure' && (await h.snapshot(p)).character.profile?.colour==='orange');
    for (const page of h.clients) h.check('no browser runtime errors', page.errors.length===0,page.errors.join('\n'));
    await writeFile(join(shots,'checks.txt'), h.checks.join('\n')+'\n');
} catch(error) { for(const [i,p] of h.clients.entries()) await h.shot(p,`failure-${i}`).catch(()=>{}); await writeFile(join(shots,'checks.txt'),h.checks.join('\n')+'\nFAIL '+error+'\n'); console.error(error); process.exitCode=1; }
finally { await h.cleanup(); }
