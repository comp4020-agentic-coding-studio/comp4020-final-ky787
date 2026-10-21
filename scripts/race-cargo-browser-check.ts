#!/usr/bin/env node
/** Real controls, two visitor identities, unchanged server/physics. No fixture state injection. */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { coopBrowser, type Cdp, type GameSnapshot } from './coop-browser.ts';
import type { SharedRoom } from '../src/coop/protocol.ts';
import type { CargoArtifact } from '../src/coop/race-cargo-types.ts';

const root = process.env.BN_SHOTS ?? resolve('docs/playtest/2026-10-22-race-cargo');
const asset = JSON.parse(await readFile('public/evidence/coop/race-condition.cargo.json', 'utf8')) as CargoArtifact;
const report: unknown[] = [];
const state = (s: GameSnapshot) => (s.multiplayer!.shared! as SharedRoom<'race-condition'>).levelState;
const modes = process.env.BN_CARGO_MODE ? [process.env.BN_CARGO_MODE] : ['timely', 'expiry', 'overlap'];
for (const mode of modes) {
    const h = await coopBrowser({ shots: root });
    const { check, snapshot, click, wait, key, sleep, shot } = h;
    async function align(p: Cdp, x: number) {
        const dx = x - (await snapshot(p)).player.x;
        if (Math.abs(dx) > 65) await h.walk(p, x - Math.sign(dx) * 35);
        for (let n = 0; n < 100; n++) {
            const s = await snapshot(p), dx = x - s.player.x;
            if (Math.abs(dx) < 7 && Math.abs(s.player.vx) < 10) return;
            const direction = dx > 0 ? 'KeyD' : 'KeyA';
            await key(p, direction, true); await sleep(Math.abs(dx) > 60 ? 100 : Math.abs(dx) > 25 ? 55 : 20);
            await key(p, direction, false); await sleep(80);
        }
        throw Error(`Could not align at ${x}`);
    }
    async function capture(p: Cdp, name: string, assembly = true) {
        const s = await wait(p, 'rendered accepted projection', s => s.raceCargo.sections.length === 4 && s.raceCargo.sections.every(section => section.raw === state(s).outputs[section.output])), cargo = s.raceCargo;
        check(`${name}: accepted state and authentic selected stores`, cargo.availability === 'ready'
            && cargo.sections.length === 4 && cargo.sections.every(section => {
                const f = asset.fragments.find(f => f.id === section.storeId);
                return section.raw === state(s).outputs[section.output] && f?.verified_output_store?.value === Number(section.raw)
                    && section.fragments.every(part => part.instructions.every((i, n) =>
                        asset.fragments.find(f => f.id === part.id)?.instructions.some(o => JSON.stringify(o) === JSON.stringify(i))
                        && (!n || i.address === part.instructions[n - 1].address + part.instructions[n - 1].size)));
            }));
        const paint = await p.read<{ text: string; pixels: number; x: number; y: number; width: number; font: string }[]>(`(()=>{
            const records=globalThis.__cargoPaint??[];
            return records.filter(r=>performance.now()-r.at<100).map(({at,...r})=>r);
        })()`);
        if (assembly) check(`${name}: readable native Canvas text in ordinary camera`, cargo.detail === 'assembly'
            && paint.some(p => p.text.startsWith('cmp ') && p.pixels >= 10.9) && paint.some(p => p.text.startsWith('jne ') && p.pixels >= 10.9));
        await shot(p, name);
        report.push({ name, mode, fixture: false, camera: s.camera, viewport: await p.read('[innerWidth,innerHeight]'), cargo, paint });
    }
    try {
        const url = process.env.BN_CARGO_URL ?? await h.startServer(), debug = await h.launch();
        const a = await h.page(url, debug), b = await h.page(url, debug);
        for (const p of [a, b]) await p.read(`(()=>{
            const records=[];globalThis.__cargoPaint=records;const original=CanvasRenderingContext2D.prototype.fillText;
            CanvasRenderingContext2D.prototype.fillText=function(t,x,y,...rest){
                const m=this.getTransform(),scale=Math.hypot(m.a,m.b);
                if(this.canvas.id==='stage'){records.push({text:String(t),font:this.font,pixels:parseFloat(this.font)*scale,x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f,width:this.measureText(String(t)).width*scale,at:performance.now()});if(records.length>3000)records.splice(0,1500);}
                return original.call(this,t,x,y,...rest);
            };
        })()`);
        await click(a, '[data-create-lab="race-condition"]');
        const created = await wait(a, 'created cargo room', s => s.room === 'race-condition' && !!s.multiplayer?.code);
        await click(b, '#join-code'); await b.send('Input.insertText', { text: created.multiplayer!.code! }); await click(b, '#join-room');
        await wait(b, 'two visitors connected', s => s.room === 'race-condition' && s.multiplayer?.shared?.connected.every(Boolean) === true);
        check(`${mode}: distinct visitors`, (await snapshot(a)).persistence.visitor !== (await snapshot(b)).persistence.visitor);
        for (const p of [a, b]) { await click(p, '#start-room'); await wait(p, 'assembly ready', s => s.started && s.raceCargo.availability === 'ready'); }
        await sleep(900);
        if (mode === 'timely') await capture(a, 'initial-nearby-1600');
        await align(b, 1760);
        await align(a, 180);
        await wait(a, 'real accepted buffer contact', s => state(s).buffer.phase === 'window');
        await wait(a, 'ordinary DROP A framing', s => s.camera.id === 'dropA');
        if (mode === 'timely') {
            await capture(a, 'window-drop-a-1600');
            await align(a, 80);
            await Promise.all([align(b, 1880), (async () => {
                await wait(b, 'accepted transfer clear', s => s.raceCargo.status === 'TRANSFER CLEAR');
                await sleep(200);
                await capture(b, 'released-clear-drop-b-1600');
            })()]);
            await wait(a, 'real receiver arrival', s => state(s).inputs.payloadDelivered);
            check('receiver arrival rearms accepted phase', state(await snapshot(a)).buffer.phase === 'idle');
            await sleep(900); await capture(b, 'receiver-arrival-drop-b-1600');
            await b.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
            await sleep(800); await capture(b, 'drop-b-small-1024', false);
            await click(b, '#evidence-toggle'); await sleep(250);
            await b.read(`(()=>{const s=document.querySelector('#evidence select');s.value='cargo:buffer-support';s.dispatchEvent(new Event('change'));})()`);
            const detail = await b.read<string>("document.querySelector('#evidence pre').textContent");
            check('inspector shows both authentic stores and provenance', detail.includes('0x14B6') && detail.includes('0x144A')
                && detail.includes('NO MATCHING LIVE TRACE') && detail.includes('buffer-support.buffer-window.branch') && detail.includes(asset.bcf_pe_sha256));
            await b.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
            await sleep(100); await shot(b, 'inspector-buffer-1600');
            await click(b, '#evidence-toggle');
            await b.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
            await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
            await sleep(500); await capture(b, 'drop-b-reduced-motion-1600');
            check('reduced motion settles all pulses', Object.values((await snapshot(b)).raceCargo.sections).every(s => s.pulse === 0));
            check('normal play never loads traces/disassembly', await a.read<boolean>("!performance.getEntriesByType('resource').some(r=>/\\.(traces|disasm|evidence)\\.json/.test(r.name))"));
        } else if (mode === 'expiry') {
            await wait(a, 'server owns actual expiry', s => state(s).buffer.phase === 'expired');
            await sleep(190);
            await capture(a, 'expired-drop-a-1600');
            await wait(a, 'server resets cargo after failed attempt', s => !!(s.multiplayer!.shared!.cubes.cubeA?.lastReset));
            await align(a, 80); await wait(a, 'reset rearms buffer', s => state(s).buffer.phase === 'idle');
            await align(a, 180); await wait(a, 'second actual buffer contact', s => state(s).buffer.phase === 'window');
            await align(a, 80); await align(b, 1880);
            await wait(a, 'second attempt receiver arrival', s => state(s).inputs.payloadDelivered);
            check('second real attempt recovers delivery', true);
        } else {
            await align(b, 1880);
            await wait(b, 'real overlap interlock', s => state(s).outputs.raceFirewall);
            await capture(b, 'overlap-drop-b-1600'); await capture(a, 'overlap-drop-a-1600');
        }
        for (const p of [a, b]) check(`${mode}: no browser errors`, p.errors.length === 0, p.errors.join('\n'));
        await writeFile(join(root, `${mode}-checks.txt`), h.checks.join('\n') + '\n');
    } catch (error) {
        process.exitCode = 1;
        for (const [n, p] of h.clients.entries()) { await shot(p, `${mode}-failure-${n}`).catch(() => {}); await writeFile(join(root, `${mode}-failure-${n}.json`), JSON.stringify(await snapshot(p).catch(() => null), null, 2)); }
        await writeFile(join(root, `${mode}-error.txt`), String(error)); console.error(String(error).split(': {')[0]);
    } finally { await h.cleanup(); }
    if (process.exitCode) break;
}
await writeFile(join(root, 'cargo-browser-review.json'), JSON.stringify({ pass: !process.exitCode, scope: 'Real input cargo interactions; no state injection and no camera override', report }, null, 2) + '\n');
