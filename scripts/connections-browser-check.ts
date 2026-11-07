#!/usr/bin/env node
/** Focused wire presentation review using the existing production/CDP harness.
 * HANDSHAKE pads use real walking. BYPASS body-placement fixtures isolate remote
 * controls, then use real E and accepted state; no full-room solve is claimed.
 * Optional BN_WIRE_BASELINE is a Vite-served copy of the previous renderer.
 * CROSSFEED/NOT interaction review remains in inverted-signals-browser-check.ts.
 */
import { createServer } from 'vite';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coopBrowser, type Cdp } from './coop-browser.ts';

const h = await coopBrowser({ shots: process.env.BN_SHOTS ?? '.workbench/reports/connections', internalLabs: false });
const vite = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
const observations: unknown[] = [];
async function choose(a: Cdp, b: Cdp, room: string) {
    if (await a.read<boolean>("document.querySelector('#menu').hidden")) await h.click(a, '#pause');
    const selector = `[data-select-level="${room}"]`;
    if (!await a.read<boolean>(`!!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).closest('[hidden]')`)) await h.click(a, '#choose-chamber');
    await h.click(a, selector);
    for (const p of [a, b]) {
        await h.wait(p, room + ' overview', s => s.room === room && s.overviewVisible);
        await h.tap(p, 'Space'); await h.wait(p, room + ' running', s => s.started && !s.overviewVisible);
    }
}
async function capture(p: Cdp, name: string, held = false) {
    await h.wait(p, name + ' reveal finishes', s => (s.camera.kind === 'follow' || held && s.camera.kind === 'plate') && !s.overviewVisible, 6500);
    await h.sleep(1100); const s = await h.snapshot(p);
    h.check(name + ' uses the normal gameplay camera', (s.camera.kind === 'follow' || held && s.camera.kind === 'plate')
        && !s.overviewVisible && await p.read('!binaryNinja.renderer.editorCamera'));
    observations.push({ name, camera: s.camera, signals: s.signals, outputs: s.outputs });
    await h.shot(p, name);
}
async function wireInk(p: Cdp) {
    return p.read<{ scan: number[]; flow: number[]; backbone: number }>(`new Promise(resolve=>{
        const c=binaryNinja.canvas.getContext('2d'),stroke=c.stroke,seen={scan:[],flow:[],backbone:0};
        c.stroke=function(...args){const dash=this.getLineDash().join(',');
            if(dash==='12,228')seen.scan.push(this.lineDashOffset);
            if(dash==='9,28')seen.flow.push(this.lineDashOffset);
            if(this.strokeStyle==='#71849c'&&!dash)seen.backbone++;
            return stroke.apply(this,args);};
        requestAnimationFrame(()=>requestAnimationFrame(()=>{c.stroke=stroke;resolve(seen)}));})`);
}
async function still(p: Cdp, mode: string) {
    await h.sleep(250); const a = await wireInk(p); await h.sleep(350); const b = await wireInk(p);
    h.check(mode + ': inactive backbone remains and both kinds of animated marks stop',
        a.backbone > 0 && b.backbone > 0 && !a.scan.length && !b.scan.length && !a.flow.length && !b.flow.length);
    observations.push({ mode, a, b });
}
async function fixture(p: Cdp, x: number, y: number) {
    await p.read(`(()=>{const g=binaryNinja;g.input.releaseAll();Object.assign(g.world.player,{x:${x},y:${y},vx:0,vy:0,grounded:false,groundId:null});
        g.renderer.cameraReveals.reset(g.world);g.renderer.camera.snapTo(${x},${y}-100);})()`);
    await h.wait(p, 'isolated body fixture settles on authored floor', s => s.player.grounded);
}
try {
    await vite.listen();
    const url = await h.startServer(), debug = await h.launch(), a = await h.page(url, debug), b = await h.page(url, debug);
    const raster = await a.read<{ name: string; pass: boolean; detail?: unknown }[]>(`(async()=>{
        const {drawConnections}=await import(${JSON.stringify(vite.resolvedUrls!.local[0] + 'src/slice/connections.ts')});
        const baseline=${JSON.stringify(process.env.BN_WIRE_BASELINE ?? '')};
        const before=baseline?(await import(${JSON.stringify(vite.resolvedUrls!.local[0])}+baseline)).drawConnections:null;
        const results=[],points=[{x:40,y:40},{x:180,y:40},{x:180,y:180}];
        function render(on,time,motion=true,zoom=1,bg='#0c131a',fn=drawConnections,output='relayGates'){
            const canvas=document.createElement('canvas');canvas.width=240;canvas.height=220;
            const c=canvas.getContext('2d');c.fillStyle=bg;c.fillRect(0,0,240,220);c.scale(zoom,zoom);
            fn(c,[{id:'fixture',input:'switchB',output,points}],{elapsed:time,inputs:{switchB:on},frame:{outputs:{[output]:on}}},motion);
            return c.getImageData(0,0,240,220).data;
        }
        const equal=(a,b)=>a.every((v,i)=>v===b[i]);
        const contrast=(data,bg)=>{const rgb=bg.slice(1).match(/../g).map(v=>parseInt(v,16));let sum=0;
            for(let i=0;i<data.length;i++)if(i%4<3)sum+=Math.abs(data[i]-rgb[i%4]);return sum;};
        for(const zoom of [.45,.75,1])for(const bg of ['#0c131a','#1b2934']){
            const current=contrast(render(false,0,false,zoom,bg),bg),old=before?contrast(render(false,0,true,zoom,bg,before),bg):null;
            results.push({name:'continuous inactive contrast at zoom '+zoom+' on '+bg,pass:current>0&&(old===null||current>old*3),detail:{current,old,ratio:old?current/old:null}});
            if(before)for(const output of ['relayGates','grappleAnchor'])for(const t of [0,.25,1.8])results.push({name:'powered pixels unchanged '+output+' '+zoom+' '+bg+' '+t,
                pass:equal(render(true,t,true,zoom,bg,drawConnections,output),render(true,t,true,zoom,bg,before,output))});
        }
        for(const on of [false,true])results.push({name:'motion disabled ignores time, powered='+on,pass:equal(render(on,0,false),render(on,99,false))});
        results.push({name:'idle scan visibly advances',pass:!equal(render(false,.2),render(false,.8))});
        const off=render(false,0,false),atCorner=render(false,1.8),afterCorner=render(false,2.2);
        const delta=(data,x,y)=>{const i=(y*240+x)*4;return Math.abs(data[i]-off[i])+Math.abs(data[i+1]-off[i+1])+Math.abs(data[i+2]-off[i+2]);};
        results.push({name:'scan follows the elbow continuously onto the vertical segment',pass:delta(atCorner,177,40)>8&&delta(atCorner,180,44)>8&&delta(afterCorner,180,70)>8&&delta(afterCorner,177,40)===0});
        return results;})()`);
    for (const r of raster) h.check(r.name, r.pass, JSON.stringify(r.detail ?? ''));
    observations.push({ raster });
    await h.click(a, '#create-party'); const party = await h.wait(a, 'party created', s => !!s.multiplayer?.code);
    await h.click(b, '#join-code'); await b.send('Input.insertText', { text: party.multiplayer!.code! }); await h.click(b, '#join-room');
    await h.wait(a, 'partner connected', s => !!s.multiplayer?.shared?.connected.every(Boolean));
    await choose(a, b, 'handshake'); await h.walk(a, 1360);
    await capture(a, 'handshake-inactive');
    const ink1 = await wireInk(a); await h.sleep(400); const ink2 = await wireInk(a);
    h.check('actual gameplay advances faint idle and unchanged powered flow', ink1.scan.length > 0 && ink2.scan[0] !== ink1.scan[0] && ink1.flow.length > 0 && ink2.flow[0] !== ink1.flow[0]);
    observations.push({ mode: 'running', ink1, ink2 });
    await h.key(a, 'Tab', true); await h.sleep(1300);
    h.check('continuous inactive lines remain drawn in chamber overview', (await h.snapshot(a)).camera.kind === 'overview' && (await wireInk(a)).backbone > 0);
    await h.shot(a, 'handshake-overview');
    await h.key(a, 'Tab', false);
    await a.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await still(a, 'reduced motion'); await a.send('Emulation.setEmulatedMedia', { features: [] });
    await h.click(a, '#pause'); await still(a, 'paused'); await h.click(a, '#continue');
    await h.walk(a, 1120); await h.walk(b, 1630);
    for (const p of [a, b]) await h.wait(p, 'both physical pads accepted', s => !!s.signals?.['draft:nearPower'] && !!s.signals?.['draft:liftPower']);
    await a.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
    await capture(a, 'handshake-powered-1024', true);
    await a.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
    await choose(a, b, 'bypass'); await capture(a, 'bypass-initial');
    await h.walk(a, 270);
    for (const p of [a, b]) await h.wait(p, 'body scanner powers anchor while bridge remains off', s => !!s.signals?.['draft:anchorFeed'] && !s.signals?.['draft:bridgeFeed']);
    await fixture(a, 1100, 663); await h.tap(a, 'KeyE');
    for (const p of [a, b]) await h.wait(p, 'real LINK commits bridge', s => !!s.signals?.['draft:bridgeFeed']);
    await fixture(a, 1460, 663);
    for (const p of [a, b]) await h.wait(p, 'body-held BYPASS disables firewall', s => !s.signals?.['draft:barrierA']);
    await fixture(a, 1550, 663);
    for (const p of [a, b]) await h.wait(p, 'leaving BYPASS restores firewall', s => !!s.signals?.['draft:barrierA']);
    await capture(a, 'bypass-firewall-active');
    await fixture(a, 1910, 663); await h.tap(a, 'KeyE');
    for (const p of [a, b]) await h.wait(p, 'real OVERRIDE disables both barriers', s => !s.signals?.['draft:barrierA'] && !s.signals?.['draft:barrierB']);
    await capture(a, 'bypass-override');
    h.app!.kill('SIGTERM');
    await h.wait(a, 'actual server disconnect', s => s.multiplayer?.websocket !== 'CONNECTED'); await still(a, 'disconnected');
    for (const p of h.clients) h.check('no browser runtime errors', p.errors.length === 0, p.errors.join('\n'));
} catch (error) { console.error(String(error).split(': {')[0]); process.exitCode = 1; }
finally {
    await writeFile(join(h.shots, 'checks.txt'), h.checks.join('\n') + '\n');
    await writeFile(join(h.shots, 'observations.json'), JSON.stringify(observations, null, 2) + '\n');
    await vite.close(); await h.cleanup();
}
