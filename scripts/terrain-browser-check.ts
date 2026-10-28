#!/usr/bin/env node
/** Actual gameplay cameras plus pixel contracts for the production Canvas helpers.
 * No player, cube, geometry, controller, evidence or camera state is injected. */
import { createServer } from 'vite';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coopBrowser } from './coop-browser.ts';
import { reviewTerrainMotion } from './terrain-motion-review.ts';

const h = await coopBrowser({ shots: process.env.BN_SHOTS ?? '/tmp/bn-terrain-shots', internalLabs: false });
const vite = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
const observations: unknown[] = [];
try {
    await vite.listen();
    const url = await h.startServer(), debug = await h.launch();
    const a = await h.page(url, debug), b = await h.page(url, debug);
    const raster = await a.read<{ name: string; pass: boolean; detail?: unknown }[]>(`(async()=>{
        const {drawStaticPlatform,drawDeathZone}=await import(${JSON.stringify(vite.resolvedUrls!.local[0] + 'src/slice/terrain-render.ts')});
        const approved=${JSON.stringify(process.env.BN_TERRAIN_BASELINE ?? '')};
        const baseline=approved?await import(${JSON.stringify(vite.resolvedUrls!.local[0])}+approved):null;
        const results=[];
        function render(kind,box,view,zoom=1,time=2,motion=true,death=drawDeathZone){
            const canvas=document.createElement('canvas');canvas.width=480;canvas.height=320;
            const c=canvas.getContext('2d');c.scale(zoom,zoom);c.translate(-view.x,-view.y);
            if(kind==='static')drawStaticPlatform(c,box,view,time,motion);else death(c,box,view,time,motion);
            return c.getImageData(0,0,480,320).data;
        }
        const hash=data=>{let v=2166136261;for(const x of data)v=Math.imul(v^x,16777619);return v>>>0;};
        // Perceptual comparison with the previous renderer: fraction of columns along
        // the floor's top contact band whose brightest pixel changes clearly in 0.25s.
        const edgeMotion=(fn,kind)=>{
            const box=kind==='static'?{x:0,y:40,w:480,h:240}:{x:0,y:40,w:480,h:70},view={x:0,y:0,w:480,h:320};
            const draw=t=>{const canvas=document.createElement('canvas');canvas.width=480;canvas.height=320;const c=canvas.getContext('2d');
                c.fillStyle='#0c131a';c.fillRect(0,0,480,320);(kind==='static'?fn.drawStaticPlatform:fn.drawDeathZone)(c,box,view,t,true);
                return c.getImageData(0,0,480,320).data;};
            const a=draw(4),b=draw(4.25);let moving=0,lit=0;
            for(let x=0;x<480;x++){let changed=0,peak=0;
                for(let y=40;y<(kind==='static'?52:110);y++){const i=(y*480+x)*4;
                    changed=Math.max(changed,Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]));
                    peak=Math.max(peak,a[i]+a[i+1]+a[i+2]);}
                if(changed>90)moving++;if(peak>540)lit++;}
            return {moving:moving/480,lit:lit/480};
        };
        const current={drawStaticPlatform,drawDeathZone};
        for(const kind of ['static','hazard']){
            const now=edgeMotion(current,kind),before=baseline?edgeMotion(baseline,kind):null;
            results.push({name:kind+' contact band: over 30% of columns visibly change in 0.25s',pass:now.moving>.3,detail:{now,before}});
            results.push({name:kind+' contact band: bright signal heads light over 8% of columns',pass:now.lit>.08,detail:{now,before}});
            if(before)results.push({name:kind+' contact band moves at least 4× as much as the previous renderer',pass:now.moving>=Math.max(.05,before.moving*4),detail:{now,before}});
        }
        for(const kind of ['static','hazard']){
            for(const [w,height] of [[430,70],[165,22],[30,280],[315,270],[12,8],[2,2]]){
                for(const zoom of [.5,1,2]){
                    const box={x:12,y:16,w,h:height},view={x:0,y:0,w:480/zoom,h:320/zoom};
                    const pixels=render(kind,box,view,zoom);let spill=0,inside=0;
                    for(let y=0;y<320;y++)for(let x=0;x<480;x++)if(pixels[(y*480+x)*4+3]){
                        if(x<box.x*zoom||x>=(box.x+w)*zoom||y<box.y*zoom||y>=(box.y+height)*zoom)spill++;
                        else inside++;
                    }
                    results.push({name:kind+' '+w+'×'+height+' at '+zoom+' clips every painted pixel',pass:spill===0&&inside>0,detail:{spill,inside}});
                }
            }
            for(const box of [{x:-128,y:-72,w:1600,h:1000},{x:20,y:80,w:430,h:230}])for(const zoom of [.5,1,2]){
                const v1={x:0,y:0,w:480/zoom,h:320/zoom},v2={...v1,x:32,y:24};
                const first=render(kind,box,v1,zoom),second=render(kind,box,v2,zoom);let maxDelta=0;
                for(let y=2;y<320-24*zoom-2;y++)for(let x=2;x<480-32*zoom-2;x++){
                    const i=(y*480+x)*4,j=((y+24*zoom)*480+x+32*zoom)*4;
                    for(let k=0;k<4;k++)maxDelta=Math.max(maxDelta,Math.abs(second[i+k]-first[j+k]));
                }
                // Chromium gradient dithering is anchored to the raster, with a
                // measured 1–2 channel-value variation after an integer pan.
                results.push({name:kind+' world patterns and packets stay anchored while panning at '+zoom+' ('+box.w+' wide)',pass:maxDelta<=2,detail:{maxDelta,tolerance:2}});
            }
            const box={x:12,y:16,w:430,h:260},view={x:0,y:0,w:480,h:320};
            results.push({name:kind+' reduced motion ignores elapsed time',pass:hash(render(kind,box,view,1,0,false))===hash(render(kind,box,view,1,99,false))});
            results.push({name:kind+' deterministic at the same time',pass:hash(render(kind,box,view))===hash(render(kind,box,view))});
            const first=render(kind,box,view,1,0),later=render(kind,box,view,1,3);
            const motionDelta=first.reduce((delta,value,i)=>Math.max(delta,Math.abs(value-later[i])),0);
            results.push({name:kind+' signal decoration moves',pass:motionDelta>8,detail:{motionDelta}});
            if(kind==='static'){
                // Below the contact glow (16 units) and inside the side rails, the body is still.
                let bodyDelta=0,peak=0;
                for(let y=40;y<270;y++)for(let x=16;x<438;x++){const i=(y*480+x)*4;
                    for(let k=0;k<4;k++)bodyDelta=Math.max(bodyDelta,Math.abs(first[i+k]-later[i+k]));
                    peak=Math.max(peak,first[i]+first[i+1]+first[i+2]);}
                // Separate Canvas rasters can differ by one channel value from
                // gradient dithering; unit tests also compare exact body commands.
                results.push({name:'static interior pixels remain stationary between edge animation frames',pass:bodyDelta<=1,detail:{bodyDelta,tolerance:1}});
                results.push({name:'static interior stays nearly black and visually quiet',pass:peak<=3*48,detail:{peakRgbSum:peak}});
            }
        }
        return results;
    })()`);
    await writeFile(join(h.shots, 'raster-checks.json'), JSON.stringify(raster, null, 2) + '\n');
    for (const r of raster) h.check(r.name, r.pass, JSON.stringify(r.detail ?? ''));

    await h.click(a, '#create-party');
    const party = await h.wait(a, 'terrain review lobby', s => !!s.multiplayer?.code);
    await h.click(b, '#join-code'); await b.send('Input.insertText', { text: party.multiplayer!.code }); await h.click(b, '#join-room');
    await h.wait(a, 'partner joined', s => s.multiplayer?.shared?.connected.every(Boolean) === true);
    for (const chamber of ['handshake', 'crossfeed-vault', 'race-condition', 'deadlock', 'use-after-free']) {
        if (chamber !== 'handshake') { await h.click(a, '#pause'); await h.click(a, '#choose-chamber'); }
        await h.click(a, '[data-select-level="' + chamber + '"]');
        for (const p of [a, b]) {
            await h.wait(p, chamber + ' overview', s => s.room === chamber && s.overviewVisible);
            await h.tap(p, 'Space'); await h.wait(p, chamber + ' started', s => s.started && !s.overviewVisible);
        }
        for (const [width, height] of [[1920, 1080], [1024, 768]]) {
            for (const [index, p] of [a, b].entries()) {
                await p.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
                await h.sleep(1000);
                const name = chamber + '-player-' + (index + 1) + '-' + width;
                const state = await h.snapshot(p);
                observations.push({ name, camera: state.camera, player: state.player, outputs: state.outputs });
                await h.shot(p, name);
                h.check(name + ' is an ordinary player camera', state.camera.kind === 'follow' && !state.overviewVisible);
            }
            if (chamber === 'crossfeed-vault' && width === 1920) await reviewTerrainMotion(h, a);
            await h.key(a, 'Tab', true); await h.sleep(1000);
            await h.shot(a, chamber + '-overview-' + width);
            h.check(chamber + ' overview ' + width, (await h.snapshot(a)).camera.kind === 'overview');
            await h.key(a, 'Tab', false); await h.sleep(1000);
            if (chamber === 'crossfeed-vault' && width === 1024) {
                await a.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
                await h.sleep(300); await h.shot(a, 'crossfeed-reduced-motion-1024');
                h.check('actual gameplay receives reduced-motion preference', await a.read("matchMedia('(prefers-reduced-motion: reduce)').matches"));
                await a.send('Emulation.setEmulatedMedia', { features: [] });
            }
        }
    }
    for (const p of [a, b]) h.check('no browser runtime errors', p.errors.length === 0, p.errors.join('\n'));
    await writeFile(join(h.shots, 'observations.json'), JSON.stringify(observations, null, 2) + '\n');
    await writeFile(join(h.shots, 'checks.txt'), h.checks.join('\n') + '\n');
} finally { await vite.close(); await h.cleanup(); }
