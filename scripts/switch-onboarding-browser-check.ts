/** Actual keyboard/mouse tutorial route; no world, progress or controller injection.
 * pnpm build && node scripts/switch-onboarding-browser-check.ts
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coopBrowser, type Cdp } from './coop-browser.ts';

const h = await coopBrowser({ shots: process.env.BN_SHOTS ?? '/tmp/bn-switch-onboarding-shots', internalLabs: false });
async function aimAt(p: Cdp, x: number, y: number) {
    const at = await p.read<{ x: number; y: number }>(`(()=>{const c=binaryNinja.renderer.camera,r=binaryNinja.canvas.getBoundingClientRect();return {x:(${x}-c.originX())*c.zoom+r.left,y:(${y}-c.originY())*c.zoom+r.top}})()`);
    await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at, button: 'none', buttons: 0 });
}
async function cueInk(p: Cdp) {
    return p.read<{ text: string; left: number; top: number; right: number; height: number; width: number }[]>(`new Promise(resolve=>{
        const proto=CanvasRenderingContext2D.prototype, original=proto.fillText, seen=[];
        proto.fillText=function(label,x,y,...rest){
            if (/^(MOVE YOUR MOUSE|AT THE ANCHOR|ANCHOR TARGETED|JUMP, THEN|IN MID-AIR|NICE CATCH|HOLD D|Alternative: CLICK)/.test(label)) {
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
    await h.walk(p, 275); await h.tap(p, 'KeyE'); await aimAt(p, 300, 400);
    await h.wait(p, 'powered anchor introduces mouse aiming', s => s.switchOnboarding.stage === 'aim');
    await h.shot(p, 'switch-01-move-mouse-1600');
    const normal = await cueInk(p);
    h.check('mouse instruction is visible above the jump path', normal.some(t => t.text === 'MOVE YOUR MOUSE TO AIM') && normal.every(t => t.top < t.height / 2));
    for (const [width, height] of [[1366, 768], [1024, 768]]) {
        await p.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
        await h.sleep(500);
        await h.shot(p, `switch-01-move-mouse-${width}`);
        const ink = await cueInk(p);
        h.check(`${width}×${height} aiming prompt stays inside the canvas`, ink.length > 0 && ink.every(t => t.left >= 0 && t.right <= t.width && t.top > 0));
    }
    await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await h.sleep(200); await h.shot(p, 'switch-01-reduced-motion-1024');
    h.check('reduced motion keeps the aiming instructions visible', (await cueInk(p)).some(t => t.text === 'MOVE YOUR MOUSE TO AIM'));
    await p.send('Emulation.setEmulatedMedia', { features: [] });
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
    await h.walk(p, 415); await h.sleep(500); await aimAt(p, 770, 226);
    await h.wait(p, 'actual grapple target confirms aim', s => s.switchOnboarding.stage === 'targeted');
    await h.shot(p, 'switch-02-targeted-1600');
    h.check('targeted stage teaches the two presses and mouse alternative', (await cueInk(p)).some(t => t.text === 'JUMP, THEN PRESS SPACE AGAIN')
        && (await cueInk(p)).some(t => t.text === 'Alternative: CLICK + HOLD on the anchor'));
    h.check('aiming alone does not mark the mechanic learned', !(await h.snapshot(p)).progress.mechanics.includes('grapple'));
    await aimAt(p, 300, 400); await h.wait(p, 'leaving the actual target removes confirmation', s => s.switchOnboarding.stage === 'aim');
    await aimAt(p, 770, 226);
    await h.key(p, 'KeyD', true); await h.tap(p, 'Space');
    h.check('first Space jumps without firing the rope', (await h.snapshot(p)).player.rope.phase === 'idle');
    await aimAt(p, 770, 226); await h.tap(p, 'Space');
    await h.wait(p, 'second Space attaches the actual rope', s => s.player.rope.phase === 'attached');
    await h.wait(p, 'successful attachment shows feedback', s => s.switchOnboarding.stage === 'attached');
    await h.shot(p, 'switch-03-grapple-connected-1600');
    h.check('actual grapple is persisted by existing mechanic events', (await h.snapshot(p)).progress.mechanics.includes('grapple'));
    await h.key(p, 'KeyD', false);
    await h.wait(p, 'successful hint retires after its brief confirmation', s => s.switchOnboarding.stage === 'complete', 5000);
    await h.shot(p, 'switch-04-cue-retired-1600');
    h.check('retired onboarding does not leave its text behind', (await cueInk(p)).length === 0);
    await h.wait(p, 'learned grapple saved', s => s.persistence.status === 'Saved on server');
    await p.send('Page.reload');
    await h.wait(p, 'returning player retains learned grapple', s => s.character.ready && s.room === 'switch' && s.switchOnboarding.stage === 'complete');
    h.check('browser reports no errors', p.errors.length === 0, p.errors.join('\n'));
    await writeFile(join(h.shots, 'checks.txt'), h.checks.join('\n') + '\n');
} finally { await h.cleanup(); }
