/** Actual mouse-free tutorial route; no world, progress or controller injection.
 * pnpm build && node scripts/switch-onboarding-browser-check.ts
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coopBrowser, type Cdp } from './coop-browser.ts';
import { startEnergyRecording, stopEnergyRecording } from './energy-browser-review.ts';

const h = await coopBrowser({ shots: process.env.BN_SHOTS ?? '/tmp/bn-switch-onboarding-shots', internalLabs: false });
async function cueInk(p: Cdp) {
    return p.read<{ text: string; left: number; top: number; right: number; height: number; width: number }[]>(`new Promise(resolve=>{
        const proto=CanvasRenderingContext2D.prototype, original=proto.fillText, seen=[];
        proto.fillText=function(label,x,y,...rest){
            if (['TAP SPACE', 'HOLD SPACE', 'HOLD A/D', 'RELEASE SPACE', 'ANCHOR SELECTED', 'GRAPPLE CONNECTED', 'GRAPPLE LEARNED', '02 / JUMP'].some(prefix=>label.startsWith(prefix))) {
                const m=this.getTransform(); seen.push({text:label,left:x*m.a+m.e,top:y*m.d+m.f,right:(x+this.measureText(label).width)*m.a+m.e,height:this.canvas.height,width:this.canvas.width});
            }
            return original.call(this,label,x,y,...rest);
        };
        requestAnimationFrame(()=>requestAnimationFrame(()=>{proto.fillText=original;resolve(seen)}));
    })`);
}
try {
    const origin = await h.startServer(), debug = await h.launch();
    const p = await h.page(origin, debug);
    await h.click(p, '#tutorial');
    await h.wait(p, 'fresh tutorial starts PRESSURE', s => s.room === 'pressure' && s.started);
    await h.walk(p, 260); await h.tap(p, 'KeyE');
    h.check('PRESSURE uses real carry input', (await h.snapshot(p)).cube?.carried === true);
    await h.walk(p, 560); await h.tap(p, 'KeyE');
    await h.wait(p, 'cube powers PRESSURE exit', s => s.inputs.cubeOnPlate);
    await h.key(p, 'KeyD', true); await h.tap(p, 'Space');
    try { await h.wait(p, 'tutorial progresses naturally to SWITCH', s => s.room === 'switch'); }
    finally { await h.key(p, 'KeyD', false); }
    await h.sleep(200);
    h.check('unpowered SWITCH has no premature grapple instruction', (await h.snapshot(p)).switchOnboarding.stage === 'hidden');
    await h.walk(p, 275); await h.tap(p, 'KeyE');
    await h.wait(p, 'powered anchor introduces jump and assisted hook', s => s.switchOnboarding.stage === 'approach');
    const normal = await cueInk(p);
    h.check('tap and hold instructions are visible above the jump path', normal.some(t => t.text === 'TAP SPACE TO JUMP')
        && normal.some(t => t.text === 'HOLD SPACE IN THE AIR TO GRAPPLE') && normal.every(t => t.top < t.height / 2));
    for (const [width, height] of [[1366, 768], [1024, 768]]) {
        await p.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
        await h.sleep(500);
        const ink = await cueInk(p);
        h.check(`${width}×${height} instructions stay inside the canvas`, ink.length > 0 && ink.every(t => t.left >= 0 && t.right <= t.width && t.top > 0));
    }
    await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await h.sleep(200);
    h.check('reduced motion keeps the instructions visible', (await cueInk(p)).some(t => t.text === 'TAP SPACE TO JUMP'));
    await p.send('Emulation.setEmulatedMedia', { features: [] });
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
    await h.walk(p, 415); await h.sleep(500);
    await h.wait(p, 'anchor selects automatically without pointer movement', s => s.switchOnboarding.stage === 'targeted');
    await h.shot(p, 'switch-01-auto-selected');
    h.check('automatic highlight alone does not mark grappling learned', !(await h.snapshot(p)).progress.mechanics.includes('grapple'));
    h.check('no gameplay pointer movement was needed', await p.read('!binaryNinja.input.hasPointer'));
    await startEnergyRecording(p);
    await h.sleep(500);
    const deaths = (await h.snapshot(p)).deaths;
    await h.key(p, 'KeyD', true); await h.tap(p, 'Space');
    h.check('first Space tap jumps without firing the rope', (await h.snapshot(p)).player.rope.phase === 'idle');
    await h.key(p, 'Space', true);
    await h.wait(p, 'second Space hold attaches the selected anchor', s => s.player.rope.phase === 'attached' && s.player.rope.anchorId === 'anchor');
    await h.wait(p, 'successful attachment shows feedback', s => s.switchOnboarding.stage === 'attached');
    h.check('attached instructions teach swing and release', (await cueInk(p)).some(t => t.text === 'HOLD A/D TO SWING')
        && (await cueInk(p)).some(t => t.text === 'RELEASE SPACE TO JUMP OFF'));
    h.check('actual grapple is persisted by existing mechanic events', (await h.snapshot(p)).progress.mechanics.includes('grapple'));
    await h.wait(p, 'rightward swing reaches release point', s => s.player.x > 860 && s.player.y < 510 && s.player.vx > 0);
    await h.key(p, 'Space', false);
    const released = await h.wait(p, 'release spends the anchor jump budget', s => s.player.ropeJumpAnchors.includes('anchor'));
    h.check('keyup produces the bounded rope jump without a third press', !released.keyboardGrapple && released.player.vy < 0
        && Math.hypot(released.player.vx, released.player.vy) <= 900);
    await h.wait(p, 'mouse-free crossing lands on the far bank', s => s.player.x > 965 && s.player.grounded);
    await h.key(p, 'KeyD', false);
    h.check('complete SWITCH gap traversal has no deaths', (await h.snapshot(p)).deaths === deaths);
    await h.sleep(650); await stopEnergyRecording(p, join(h.shots, 'switch-keyboard-demo.webm'));
    await h.wait(p, 'successful hint retires after its confirmation', s => s.switchOnboarding.stage === 'complete', 5000);
    await h.shot(p, 'switch-02-crossed');
    h.check('retired onboarding does not leave its text behind', (await cueInk(p)).length === 0);
    await h.wait(p, 'learned grapple saved', s => s.persistence.status === 'Saved on server');
    await p.send('Page.reload');
    await h.wait(p, 'returning player retains learned grapple', s => s.character.ready && s.room === 'switch' && s.switchOnboarding.stage === 'complete');
    // The existing touchscreen button uses real pointer capture and the same
    // ordered edges. Exercise jump + held hook + swing with two real touches.
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
    await p.send('Page.reload');
    await h.wait(p, 'touch reload ready', s => s.character.ready && s.room === 'switch');
    await h.click(p, '#continue'); await h.walk(p, 415);
    const buttons = await p.read<{ right: { x: number; y: number; id: number }; jump: { x: number; y: number; id: number } }>(`(()=>{
        const at=(kind,id)=>{const r=document.querySelector('[data-touch="'+kind+'"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,id}};
        return {right:at('right',1),jump:at('jump',2)};
    })()`);
    const touch = (type: string, jump: boolean, right = true) => p.send('Input.dispatchTouchEvent', {
        type, touchPoints: [...(right ? [buttons.right] : []), ...(jump ? [buttons.jump] : [])],
    });
    const touchDeaths = (await h.snapshot(p)).deaths;
    await touch('touchStart', true); await h.sleep(55); await touch('touchEnd', true, false);
    await touch('touchStart', true); await h.sleep(25);
    await h.wait(p, 'touch second hold attaches', s => s.player.rope.anchorId === 'anchor');
    await h.wait(p, 'touch swing reaches release point', s => s.player.x > 860 && s.player.y < 510 && s.player.vx > 0);
    await touch('touchEnd', true, false);
    await h.wait(p, 'touch release spends the jump budget', s => s.player.ropeJumpAnchors.includes('anchor'));
    await h.wait(p, 'touch crossing reaches far bank', s => s.player.x > 965 && s.player.grounded);
    await touch('touchEnd', false, true);
    h.check('touch jump/hold/swing/release crosses without a death', (await h.snapshot(p)).deaths === touchDeaths);
    await h.tap(p, 'KeyR'); await h.walk(p, 415);
    await h.tap(p, 'Space'); await h.key(p, 'Space', true);
    await h.wait(p, 'rope attaches before pause safety check', s => s.player.rope.phase === 'attached');
    await h.click(p, '#pause'); await h.key(p, 'Space', false);
    const paused = await h.snapshot(p);
    await h.sleep(150);
    h.check('paused release neither moves the player nor spends a rope jump', !(await h.snapshot(p)).started
        && (await h.snapshot(p)).player.y === paused.player.y && (await h.snapshot(p)).player.ropeJumpAnchors.length === 0);
    await h.click(p, '#continue'); await h.sleep(40);
    h.check('resume cannot replay the paused release as a jump', (await h.snapshot(p)).player.ropeJumpAnchors.length === 0
        && !(await h.snapshot(p)).keyboardGrapple);
    h.check('browser reports no errors', p.errors.length === 0, p.errors.join('\n'));
    await writeFile(join(h.shots, 'checks.txt'), h.checks.join('\n') + '\n');
} finally { await h.cleanup(); }
