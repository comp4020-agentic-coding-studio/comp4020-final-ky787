#!/usr/bin/env node
/** Real-input two-browser chamber route. Reads snapshots; never writes world/controller state. */
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coopBrowser, type Cdp, type GameSnapshot } from './coop-browser.ts';
import type { CubeId, SharedRoom } from '../src/coop/protocol.ts';
type Snapshot = GameSnapshot;
export async function crossfeedRoute(h: Awaited<ReturnType<typeof coopBrowser<Snapshot>>>, url: string, debug: string, reverse = false, partyPlayers?: [Cdp, Cdp]) {
const { snapshot, wait, check, click, key, tap, walk, mouse, sleep, shot } = h;
const state = (s: Snapshot) => s.multiplayer!.shared! as SharedRoom<'crossfeed-vault'>;
async function align(p: Cdp, x: number) {
    const deadline = Date.now() + 12000;
    let held: 'KeyA' | 'KeyD' | null = null;
    try {
        while (Date.now() < deadline) {
            const s = await snapshot(p), dx = x - s.player.x;
            if (Math.abs(dx) < 7 && Math.abs(s.player.vx) < 35) return;
            const desired = Math.max(-380, Math.min(380, dx * 6));
            const next = desired - s.player.vx > 20 ? 'KeyD' : desired - s.player.vx < -20 ? 'KeyA' : null;
            if (next !== held) { if (held) await key(p, held, false); if (next) await key(p, next, true); held = next; }
            await sleep(20);
        }
        throw new Error(`Could not align at ${x}: ${JSON.stringify((await snapshot(p)).player)}`);
    } finally { if (held) await key(p, held, false); }
}
async function pickup(p: Cdp, id: CubeId) {
    const x = (await snapshot(p)).cubes[id]!.x;
    const sign = (await snapshot(p)).player.x < x ? -1 : 1;
    await align(p, x + sign * 44);
    await wait(p, 'payload within physical reach after landing', s => s.player.grounded && Math.hypot(s.player.x - s.cubes[id]!.x, s.player.y - s.cubes[id]!.y) < 66);
    await tap(p, 'KeyE');
    await wait(p, `accepted ${id} pickup`, s => !s.multiplayer?.pendingCubeAction && state(s).cubes[id]!.holder === s.multiplayer?.slot);
}
async function place(p: Cdp, id: CubeId, x: number, placement?: string) {
    const start = await snapshot(p), direction = x > start.player.x ? 1 : -1;
    for (const [other, c] of Object.entries(start.cubes)) if (other !== id && !c.carried && c.grounded
        && (c.x - start.player.x) * direction > 0 && (x - 43 - c.x) * direction > 0 && Math.abs(c.y + 22 - (start.player.y + 17)) < 5)
        await hop(p, c.x + direction * 85);
    await align(p, x - 43); await key(p, 'KeyD', true);
    try { await wait(p, 'face the intended drop', s => s.player.facing === 1); } finally { await key(p, 'KeyD', false); }
    await sleep(120);
    await tap(p, 'KeyE');
    await wait(p, `accepted ${id} drop`, s => !s.multiplayer?.pendingCubeAction && state(s).cubes[id]!.holder === null && !!s.cubes[id]?.grounded);
    if (placement) await wait(p, `${id} on ${placement}`, s => state(s).cubePlacements[id] === placement);
}
async function hop(p: Cdp, x: number, ground?: string) {
    await wait(p, 'grounded before jump', s => s.player.grounded);
    await key(p, 'Space', true);
    let held: 'KeyA' | 'KeyD' | null = null, airborne = false;
    try {
        for (let n = 0; n < 180; n++) {
            const s = await snapshot(p); airborne ||= !s.player.grounded;
            if (airborne && s.player.grounded) {
                if (ground && s.player.groundId !== ground) throw new Error(`Jump to ${ground} landed on ${s.player.groundId} at ${s.player.x}, ${s.player.y}`);
                return;
            }
            // Brake with ordinary air steering instead of relying on ground friction.
            const stoppingX = s.player.x + s.player.vx * Math.abs(s.player.vx) / (2 * 1900);
            const next = stoppingX < x - 4 ? 'KeyD' : stoppingX > x + 4 ? 'KeyA' : null;
            if (next !== held) { if (held) await key(p, held, false); if (next) await key(p, next, true); held = next; }
            await sleep(18);
        }
        throw new Error(`Jump to ${ground ?? x} did not land`);
    } finally { if (held) await key(p, held, false); await key(p, 'Space', false); await sleep(100); }
}
async function lift(p: Cdp) {
    await key(p, 'Space', true);
    try { await walk(p, 1550); } finally { await key(p, 'Space', false); }
    await wait(p, 'lift reaches control level', s => s.player.y < 733, 15000);
    await walk(p, 1370); await wait(p, 'upper catwalk landing', s => s.player.groundId === 'control-catwalk');
}
async function mount(p: Cdp, id: CubeId) {
    await wait(p, 'fresh partner support', s => !!s.multiplayer?.partnerCubeSupportActive);
    await align(p, (await snapshot(p)).cubes[id]!.x);
    await key(p, 'Space', true);
    try { await wait(p, 'landing on held payload', s => !!s.multiplayer?.groundedOnPartnerCube); }
    finally { await key(p, 'Space', false); await sleep(100); }
}
async function swing(p: Cdp, operator: Cdp, side: 'left' | 'right', id: CubeId) {
    const direction = side === 'left' ? 1 : -1, move = direction === 1 ? 'KeyD' : 'KeyA';
    const anchors = side === 'left' ? [{ id: 'left1', x: 1540, y: 356 }, { id: 'crumbleA', x: 1990, y: 276 }, { id: 'left3', x: 2440, y: 356 }]
        : [{ id: 'right1', x: 4100, y: 186 }, { id: 'crumbleB', x: 3640, y: 156 }, { id: 'right3', x: 3180, y: 306 }];
    await align(p, side === 'left' ? 1400 : 4260);
    const deaths = (await snapshot(p)).deaths;
    await key(p, move, true);
    await key(p, 'Space', true); await wait(p, 'launch jump clears the lift / gallery', s => s.player.y < (side === 'left' ? 650 : 550)); await key(p, 'Space', false);
    await mouse(p, anchors[0].x, anchors[0].y, true);
    await wait(p, `${side} first hook with cargo`, s => s.player.rope.anchorId === anchors[0].id);
    for (const target of anchors.slice(1)) {
        await wait(p, `${side} swing release arc`, s => (s.player.x - s.player.rope.anchor.x) * direction > 90 && s.player.vx * direction > 450 && s.player.vy < 0, 4000);
        await tap(p, 'Space'); await mouse(p, target.x, target.y, false); await mouse(p, target.x, target.y, true);
        await wait(p, `${side} catch ${target.id}`, s => s.player.rope.anchorId === target.id, 3500);
        check(`${id} stays accepted while swinging from ${target.id}`, (await snapshot(p)).cubes[id]!.carried && state(await snapshot(p)).cubes[id]!.holder === (await snapshot(p)).multiplayer!.slot);
        if (target.id.startsWith('crumble')) await wait(operator, `partner sees ${target.id} warning`, s => state(s).levelState.platforms[target.id as 'crumbleA' | 'crumbleB'].phase === 'warning');
    }
    await wait(p, `${side} final release arc`, s => (s.player.x - s.player.rope.anchor.x) * direction > 90 && s.player.vx * direction > 350 && s.player.vy < 0, 4000);
    await mouse(p, anchors[2].x, anchors[2].y, false);
    // Ordinary air steering brakes the landing, leaving the payload above its holder.
    for (let n = 0; n < 180; n++) {
        const s = await snapshot(p); if (s.player.grounded) break;
        const target = side === 'left' ? 2680 : 2860, stop = s.player.x + s.player.vx * Math.abs(s.player.vx) / 3800;
        await key(p, 'KeyD', stop < target); await key(p, 'KeyA', stop >= target); await sleep(18);
    }
    await key(p, 'KeyA', false); await key(p, 'KeyD', false);
    await wait(p, `${side} vault cargo landing`, s => s.player.groundId === 'vault-cargo-deck', 2000);
    check(`${side} three-hook cargo route has no death/reset shortcut`, (await snapshot(p)).deaths === deaths && (await snapshot(p)).cubes[id]!.carried);
}
    h.scenario = reverse ? '[reversed roles] ' : '[full chamber] '; h.shotPrefix = reverse ? 'reverse-' : 'full-';
    const [a, b] = partyPlayers ?? [await h.page(url, debug), await h.page(url, debug)];
    const holder = reverse ? b : a, runner = reverse ? a : b;
    if (!partyPlayers) {
    await click(a, '#create-party');
    const created = await wait(a, 'created CROSSFEED', s => !!s.multiplayer?.code);
    await click(b, '#join-code'); await b.send('Input.insertText', { text: created.multiplayer!.code }); await click(b, '#join-room');
    await wait(b, 'join discovers chamber', s => s.room === 'crossfeed-vault' && !!s.multiplayer?.shared?.connected.every(Boolean));
    await click(a, '[data-select-level="crossfeed-vault"]');
    for (const p of [a,b]) await wait(p, 'host selection loads v2', s => s.room === 'crossfeed-vault' && state(s).party?.phase === 'playing');
    }
    const created = await snapshot(a);
    await sleep(1500); await shot(a, 'overview');
    check('one large chamber, two named cubes, honest mock source', Object.keys(created.cubes).join(',') === 'cubeA,cubeB' && created.source === 'mock-multiplayer' && !created.evidence);
    for (const p of [a, b]) { await tap(p, 'Space'); await wait(p, 'overview dismissed', s => s.started && !s.overviewVisible); }
    if (process.env.BN_HERO_REVIEW) {
        await sleep(1000); await shot(a, 'entry-point');
        check('attach sequence runs after overview then settles', (await snapshot(a)).heroAssets.entryAge! >= .85);
    }
    await align(holder, 1870); await wait(runner, 'A powers partner anchor', s => s.outputs.grappleAnchor);
    await walk(runner, 1950);
    await key(runner, 'KeyD', true); await mouse(runner, 2300, 1166, true);
    try {
        await wait(runner, 'real grapple attaches', s => s.player.rope.phase === 'attached');
        await wait(runner, 'grapple crosses first gap', s => s.player.x > 2340 && s.player.y < 1450 && s.player.vx > 0);
        await tap(runner, 'Space');
        await mouse(runner, 2300, 1166, false);
        await wait(runner, 'right balcony landing', s => s.player.x > 2440 && s.player.groundId === 'access-balcony');
    } finally { await key(runner, 'KeyD', false); await mouse(runner, 2300, 1166, false); }
    await pickup(runner, 'cubeA'); await sleep(500);
    check('reachable A pickup accepted and retained before B', !state(await snapshot(runner)).levelState.inputs.switchB && (await snapshot(runner)).cubes.cubeA!.carried);
    await place(runner, 'cubeA', 2760);
    await align(runner, 2560); await tap(runner, 'KeyE'); await wait(holder, 'B return bridge', s => s.outputs.bridge);
    await walk(holder, 1780); check('B bridge lets the entry holder leave A', !(await snapshot(holder)).outputs.grappleAnchor && (await snapshot(holder)).outputs.bridge);
    await pickup(runner, 'cubeA'); await place(runner, 'cubeA', 1750, 'liftCargo');
    await wait(holder, 'cargo powers lift', s => s.outputs.liftField); check('Cube A temporarily powers lift', !state(await snapshot(holder)).levelState.inputs.switchC);
    await lift(holder); await align(holder, 1210);
    if (process.env.BN_HERO_REVIEW) {
        await shot(holder, 'breakpoint-offline');
        check('authored breakpoint starts retracted', (await snapshot(holder)).heroAssets.breakpoints[0].mast === 0);
    }
    await tap(holder, 'KeyE');
    await wait(runner, 'C powers lift/checkpoint independently of transfer mode', s => s.checkpoint === 'upper' && s.outputs.liftField && !s.outputs.relayGates);
    if (process.env.BN_HERO_REVIEW) {
        for (const age of [.1, .5, 1, 1.35, 1.8]) {
            await wait(holder, `breakpoint deployment ${age}s`, s => (s.heroAssets.breakpoints[0].age ?? -1) >= age);
            await shot(holder, `breakpoint-${age}`);
        }
        const deployed = (await snapshot(holder)).heroAssets.breakpoints[0];
        check('mast and flag stay deployed through repeated snapshots', deployed.mast === 1 && deployed.flag === 1 && deployed.age! >= 1.6);
        await wait(runner, 'partner observes deployed checkpoint', s => s.heroAssets.breakpoints[0].flag === 1);
        if (process.env.BN_HERO_CHECKPOINT_ONLY) {
            const before = await snapshot(holder);
            await tap(holder, 'KeyR');
            await wait(holder, 'local respawn at upper milestone', s => s.deaths > before.deaths && s.player.y < 760);
            const respawned = (await snapshot(holder)).heroAssets;
            check('physical respawn does not redeploy or reattach', respawned.breakpoints[0].age! >= deployed.age!
                && respawned.breakpoints[0].flag === 1 && respawned.entryAge! >= before.heroAssets.entryAge!);
            await shot(holder, 'breakpoint-respawn');
            await holder.send('Page.reload');
            await wait(holder, 'reconnect restores upper breakpoint', s => s.started && s.checkpoint === 'upper' && s.heroAssets.breakpoints[0]?.active);
            const restored = (await snapshot(holder)).heroAssets;
            check('reconnect baselines deployed flag with no attach or deployment replay', restored.breakpoints[0].age === null
                && restored.breakpoints[0].flag === 1 && restored.entryAge === null);
            await sleep(500); await shot(holder, 'breakpoint-restored');
            await holder.send('Emulation.setDeviceMetricsOverride', { width: 800, height: 600, deviceScaleFactor: 1, mobile: false });
            await sleep(800); await shot(holder, 'breakpoint-compact');
            await key(holder, 'Tab', true); await sleep(1200); await shot(holder, 'overview-compact'); await key(holder, 'Tab', false);
            check('small viewport overview keeps camera aiming invertible', await holder.read(`(()=>{
                const c=binaryNinja.renderer.camera, target={x:1540,y:356};
                const back=c.screenToWorld((target.x-c.originX())*c.zoom,(target.y-c.originY())*c.zoom);
                return Math.abs(back.x-target.x)<1e-6 && Math.abs(back.y-target.y)<1e-6;
            })()`));
            return;
        }
    }
    await pickup(runner, 'cubeA'); await place(runner, 'cubeA', 1840);
    check('C leaves lift on after cargo removal without moving partner', (await snapshot(runner)).outputs.liftField && (await snapshot(runner)).player.y > 1400);
    // Reconfigure B live: the upper player returns to A while the partner
    // switches back to relay mode and uses the initial anchor in reverse.
    await walk(holder, 700); await wait(holder, 'service bay floor', s => s.player.groundId === 'central-floor');
    await walk(holder,1740); await hop(holder,1900); await align(holder, 1900); await hop(runner,1940); await walk(runner, 2560); await tap(runner, 'KeyE');
    await wait(holder, 'B back to relay mode without closing service', s => s.outputs.relayGates && !s.outputs.bridge && !!s.signals?.serviceAccess);
    await align(runner, 2470); await key(runner, 'KeyA', true); await mouse(runner, 2300, 1166, true);
    await wait(runner, 'reverse entry swing', s => s.player.x < 2210 && s.player.vx < 0 && s.player.vy < 0);
    await tap(runner,'Space'); await mouse(runner, 2300,1166,false);
    await wait(runner, 'return to central floor', s => s.player.x < 1980 && s.player.groundId === 'central-floor'); await key(runner,'KeyA',false);
    check('reverse transfer crossing uses rope jump without death', (await snapshot(runner)).deaths === 0);
    await hop(runner,1740); await hop(holder,1740);
    await walk(holder,1370); await wait(holder,'land after crossing powered lift',s=>s.player.groundId==='central-floor'); await walk(holder,700);
    await pickup(holder, 'cubeB');
    const untouchedA = { ...((await snapshot(runner)).cubes.cubeA!) }, epochB = state(await snapshot(holder)).cubes.cubeB!.epoch;
    await walk(holder, 900);
    await wait(holder, 'service filter resets B', s => (state(s).cubes.cubeB!.lastReset?.epoch ?? 0) > epochB && Math.abs(s.cubes.cubeB!.x - 510) < 2);
    check('B firewall reset preserves A and walking carrier', Math.abs((await snapshot(runner)).cubes.cubeA!.x - untouchedA.x) < 1 && (await snapshot(holder)).deaths === 0);
    await pickup(holder, 'cubeB'); await walk(holder, 370);
    await key(holder, 'KeyA', true);
    try { await wait(holder, 'carried B emerges from R2', s => s.player.x > 3736 && s.cubes.cubeB!.carried && s.player.y < 950); }
    finally { await key(holder, 'KeyA', false); }
    await align(holder, 3890); await place(holder, 'cubeB', 3870);
    await walk(runner,1370); await wait(runner,'land before low service filter',s=>s.player.groundId==='central-floor');
    await walk(runner, 370); await key(runner, 'KeyA', true);
    try { await wait(runner, 'partner joins through relay', s => s.player.x > 3736 && s.player.y < 950); }
    finally { await key(runner, 'KeyA', false); }
    check('relay leaves one B in gallery and A below', Object.keys((await snapshot(runner)).cubes).length === 2 && (await snapshot(runner)).cubes.cubeA!.y > 1400);
    await pickup(runner, 'cubeB'); await align(runner, 3980);
    await mount(holder, 'cubeB'); await shot(holder, 'boost-support');
    await hop(holder, 4140, 'control-ledge'); await align(holder, 4200); await tap(holder, 'KeyE');
    await wait(runner, 'D opens local gallery access', s => s.outputs.codePlatformA);
    check('real second jump reaches D with roles changed since A', (await snapshot(holder)).player.groundId === 'control-ledge' && state(await snapshot(runner)).cubes.cubeB!.holder === (reverse ? 1 : 2));
    await place(runner, 'cubeB', 3870);
    // Former climber returns through the lower recovery region to operate routes.
    await walk(holder,3770); await key(holder,'KeyA',true);
    try { await wait(holder,'R2 returns operator to service',s=>s.player.x<700 && s.player.y>1400); } finally { await key(holder,'KeyA',false); }
    await walk(holder, 1550); await wait(holder, 'lift carries operator upward', s => s.player.y < 733, 15000);
    await walk(holder, 1370); await wait(holder, 'control station landing', s => s.player.groundId === 'control-catwalk');
    await align(holder,1330); await wait(holder, 'local sustained upper route camera', s => s.camera.kind === 'plate' && s.camera.id === 'routePower');
    const cameraFrame = JSON.stringify((await snapshot(holder)).camera.frame);
    // Cargo runner uses the lower region to retrieve A, then rides the permanent lift.
    await align(runner,3770); await key(runner,'KeyA',true);
    try { await wait(runner,'R2 returns cargo runner to service',s=>s.player.x<700 && s.player.y>1400); } finally { await key(runner,'KeyA',false); }
    await pickup(runner,'cubeA'); await lift(runner);
    await wait(runner, 'left route powered by partner', s => !!s.signals?.leftRoute);
    await swing(runner, holder, 'left', 'cubeA'); await place(runner,'cubeA',2620,'finalLeft');
    check('one cube does not enable operator return', !(await snapshot(holder)).signals?.vaultReturn);
    check('party HUD leaves both upper hook routes visible', await holder.read(`(()=>{
        const h=document.querySelector('#coop-hud').getBoundingClientRect(), c=binaryNinja.renderer.camera, r=binaryNinja.canvas.getBoundingClientRect();
        return binaryNinja.world.room.platforms.filter(p=>p.signal==='leftRoute'||p.signal==='rightRoute').every(p=>{
            const x=(p.x+p.w/2-c.originX())*c.zoom+r.left,y=(p.y+6-c.originY())*c.zoom+r.top;
            return x<h.left||x>h.right||y<h.top||y>h.bottom;
        });
    })()`));
    await shot(holder,'upper-left-routing');
    await tap(holder,'KeyE'); await wait(runner,'right selection accepted',s=>!!s.signals?.rightRoute && !s.signals?.leftRoute);
    check('reversible selector keeps held camera stable', JSON.stringify((await snapshot(holder)).camera.frame) === cameraFrame);
    await shot(holder,'upper-right-routing');
    await walk(runner,2500); await wait(runner,'recover below vault after A delivery',s=>s.player.groundId==='route-recovery');
    await align(runner,3400); await hop(runner,3520,'gallery-recovery-step'); await hop(runner,3620,'boost-gallery'); await align(runner,3625); await hop(runner,3800,'boost-gallery');
    await pickup(runner,'cubeB'); await align(runner,3780); await hop(runner,3860,'gallery-return-low');
    await hop(runner,3980,'gallery-return-high'); await hop(runner,4200,'control-ledge'); await hop(runner,4260,'gallery-launch');
    await swing(runner,holder,'right','cubeB'); await place(runner,'cubeB',2910,'finalRight');
    await wait(holder,'both payloads power safe regroup',s=>!!s.signals?.vaultReturn && !!s.signals?.vaultPower);
    await walk(holder,2310); await hop(holder,2470,'vault-return-step'); await hop(holder,2620,'cube-body:cubeA'); await hop(holder,2680,'vault-cargo-deck');
    check('both sockets enable a safe operator return', !!(await snapshot(holder)).signals?.vaultReturn);
    // Bodies approach from opposite ends. Neither can press both plates.
    await walk(holder, 2670); await hop(holder,2540,'final-left-low'); await hop(holder,2490,'final-left-high'); await hop(holder, 2600, 'vault-crown'); await align(holder, 2620);
    await hop(runner, 3020, 'final-right-low'); await hop(runner, 3080, 'final-right-high'); await align(runner, 3080); await hop(runner, 2940, 'vault-crown'); await align(runner, 2910);
    await wait(holder, 'opposite bodies latch vault exit', s => s.outputs.exitDoor);
    if (process.env.BN_HERO_REVIEW) {
        check('unlock leaves party victory pending with zero arrivals', !state(await snapshot(holder)).completed && !state(await snapshot(holder)).reachedExit.some(Boolean));
        await sleep(1100);
    }
    await shot(holder, 'vault-unlocked');
    await align(holder,2670); await align(runner,2968);
    check('exit stays open after both players leave final plates', (await snapshot(runner)).outputs.exitDoor);
    await key(holder,'KeyD',true);
    try { await wait(holder, 'one physical arrival', s => state(s).reachedExit.filter(Boolean).length === 1); } finally { await key(holder,'KeyD',false); }
    check('one arrival does not complete room', !state(await snapshot(holder)).completed);
    await key(runner, 'KeyA', true);
    try { await wait(holder, 'two physical arrivals complete vault', s => state(s).completed); } finally { await key(runner, 'KeyA', false); }
    await shot(runner, 'complete');
    check('CROSSFEED completed through real controls', state(await snapshot(holder)).completed && (await snapshot(holder)).deaths === 0 && (await snapshot(runner)).deaths === 0);
    if (process.env.BN_HERO_REVIEW) {
        await holder.send('Page.reload');
        await wait(holder, 'reconnect restores completed party and upper breakpoint', s => !!s.multiplayer?.shared?.completed && s.checkpoint === 'upper' && s.heroAssets.breakpoints[0]?.active);
        const restored = (await snapshot(holder)).heroAssets;
        check('reconnect baselines deployed flag with no attach, deployment, or completion replay', restored.breakpoints[0].age === null
            && restored.breakpoints[0].flag === 1 && restored.entryAge === null && restored.completionAge === null);
        await shot(holder, 'breakpoint-restored');
    }
}

async function main() {
const h = await coopBrowser<Snapshot>({ shots: process.env.BN_SHOTS ?? '/tmp/bn-crossfeed-shots' });
const { check, shot, snapshot } = h;

try {
    const url = process.argv[2] ?? await h.startServer(), debug = await h.launch();
    if (!process.env.BN_CROSSFEED_REVERSE_ONLY) await crossfeedRoute(h, url, debug, false);
    if (!process.env.BN_CROSSFEED_FORWARD_ONLY) {
        // Only two active renderers: completed worlds need not keep drawing while
        // a fresh pair exercises reversed roles on the same test machine.
        for (const c of h.clients.splice(0)) {
            check('browser has no runtime errors', c.errors.length === 0, c.errors.join('\n'));
            await c.send('Page.close'); c.socket.close();
        }
        await crossfeedRoute(h, url, debug, true);
    }
    for (const c of h.clients) check('browser has no runtime errors', c.errors.length === 0, c.errors.join('\n'));
    await writeFile(join(h.shots, 'checks.txt'), h.checks.join('\n') + '\n');
} catch (e) {
    for (let i = 0; i < h.clients.length; i++) {
        await shot(h.clients[i], `failure-${i}`).catch(() => {});
        await writeFile(join(h.shots, `failure-${i}.json`), JSON.stringify(await snapshot(h.clients[i]).catch(() => null), null, 2));
    }
    await writeFile(join(h.shots, 'error.txt'), String(e));
    console.error(String(e).split(': {')[0]); process.exitCode = 1;
} finally { await h.cleanup(); }

}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
