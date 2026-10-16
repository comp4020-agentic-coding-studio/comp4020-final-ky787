/** Replay the canonical real-input scenario inside the ordinary persistent campaign. */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AuthoredCampaignLevel } from '../src/coop/campaign.ts';
import { CAMPAIGN_DOCUMENTS } from '../src/coop/authored-campaign.ts';
import { draftHash, objectBounds } from '../src/workbench/model.ts';
import { conditionMatches, parseScenario, type ScenarioCondition } from './level-tools/scenario.ts';
import type { Cdp, coopBrowser } from './coop-browser.ts';

export async function campaignDraftRoute(h: Awaited<ReturnType<typeof coopBrowser>>, level: AuthoredCampaignLevel, pages: [Cdp, Cdp]) {
    const scenario = parseScenario(JSON.parse(await readFile(`levels/scenarios/${level}.json`, 'utf8')));
    const document = CAMPAIGN_DOCUMENTS[level], hash = await draftHash(document);
    const actors = new Map(scenario.actors.map(a => [a.id, pages[a.slot - 1]]));
    const results: unknown[] = []; let failedStep: string | null = null, pass = false, error: string | null = null;
    const deadline = Date.now() + scenario.timeoutMs;
    // Read-only shape adapter: no changes to transforms, inputs, outputs or progress.
    const observe = (p: Cdp) => p.read<any>(`(()=>{const g=binaryNinja,w=g.world,c=g.coop,r=c.room;return{
        player:{...w.player,deaths:w.deaths},cubes:w.cubes,signals:{...w.frame.outputs,...w.frame.signals},
        controls:w.frame.controls??{},plates:w.frame.plates??{},exitUnlocked:w.frame.outputs.exitDoor,completed:r.completed,
        camera:{x:g.renderer.camera.x,y:g.renderer.camera.y,zoom:g.renderer.camera.zoom},
        session:{code:r.code,slot:c.slot,visitor:c.visitor,peers:r.connected,generation:r.levelInstance,reachedExit:r.reachedExit,sharedCubes:r.cubes,room:r}
    }})()`);
    async function until(p: Cdp, condition: ScenarioCondition, timeout = 10000, movement = false) {
        const end = Math.min(deadline, Date.now() + timeout); let last: unknown;
        do {
            if (pages.some(p => p.errors.length)) throw new Error(pages.flatMap(p => p.errors).join('\n'));
            const observed = await observe(p); last = observed;
            if (conditionMatches(last, condition)) return;
            // A campaign stops physics on the second exit overlap, sometimes
            // while still airborne. Further walking/landing is impossible;
            // accepted completion supersedes only these movement waits.
            if (movement && observed.completed && observed.session.reachedExit.every(Boolean)) return;
            await h.sleep(25);
        } while (Date.now() < end);
        throw new Error(`Timeout ${JSON.stringify(condition)}: ${JSON.stringify(last)}`);
    }
    try {
        for (const p of pages) { await h.tap(p, 'Space'); await h.wait(p, `${level} starts`, s => s.started && s.room === level); }
        h.check(`${level}: two independent visitors retain one party`, (await observe(pages[0])).session.visitor !== (await observe(pages[1])).session.visitor
            && (await observe(pages[0])).session.code === (await observe(pages[1])).session.code);
        for (const step of scenario.steps) {
            failedStep = step.label;
            if (Date.now() > deadline) throw new Error('Full-room scenario deadline exceeded');
            for (const action of step.actions ?? []) {
                const p = actors.get(action.actor)!;
                if ((await observe(p)).completed) continue;
                if (action.type === 'tap') await h.tap(p, action.code);
                else if (action.type === 'key') await h.key(p, action.code, action.down);
                else if (action.type === 'walk') {
                    const right = (await observe(p)).player.x < action.x, key = right ? 'KeyD' : 'KeyA';
                    await h.key(p, key, true);
                    try { await until(p, { path: 'player.x', ...(right ? { min: action.x } : { max: action.x }) }, action.timeoutMs ?? 10000, true); }
                    finally { await h.key(p, key, false); }
                } else {
                    const target = action.down ? document.geometry.objects.find(o => o.id === action.target) : undefined;
                    if (action.down && !target) throw new Error(`Unknown hook target ${action.target}`);
                    const b = target ? objectBounds(target) : { x: 0, y: 0, w: 0 };
                    if (action.down && !await p.read<boolean>(`(()=>{const c=binaryNinja.renderer.camera,r=binaryNinja.canvas.getBoundingClientRect();
                        const x=(${b.x + b.w / 2}-c.originX())*c.zoom,y=(${b.y + 12}-c.originY())*c.zoom;
                        return x>=0&&x<r.width&&y>=0&&y<r.height})()`)) throw new Error(`Hook target ${action.target} is outside the player's viewport`);
                    await h.mouse(p, b.x + b.w / 2, b.y + 12, action.down);
                }
            }
            if (step.waitMs) await h.sleep(step.waitMs);
            if (step.wait) await until(actors.get(step.wait.actor)!, step.wait.condition, step.wait.timeoutMs,
                ['player.x', 'player.y', 'player.groundId', 'player.grounded'].includes(step.wait.condition.path));
            const observed = Object.fromEntries(await Promise.all([...actors].map(async ([id, p]) => [id, await observe(p)] as const)));
            for (const a of step.assert ?? []) if (!conditionMatches(observed[a.actor], a.condition)) throw new Error(`Assertion ${JSON.stringify(a)}`);
            if (level === 'use-after-free' && step.capture === 'a-powered') {
                const operator = actors.get('partner')!, climber = actors.get('host')!;
                const before = (await observe(climber)).session.room.levelState.platforms['draft:operatorA'];
                await h.click(operator, '#pause');
                await until(climber, { path: 'signals.draft:routeA', equals: false }, 3000);
                await h.click(operator, '#continue');
                await until(climber, { path: 'signals.draft:routeA', equals: true }, 3000);
                const after = (await observe(climber)).session.room.levelState.platforms['draft:operatorA'];
                h.check('pausing the unstable operator releases route power; resume resamples contact without resetting its fuse',
                    after.phase === 'warning' && after.remainingMs < before.remainingMs && after.durationMs === before.durationMs);
            }
            if (step.capture) for (const [id, p] of actors) await h.shot(p, `${level}-${step.capture}-${id}`);
            results.push({ label: step.label, pass: true, campaignVictory: Object.values(observed).every(s => s.completed), observed });
        }
        for (const p of pages) await until(p, { path: 'completed', equals: true });
        h.check(`${level}: authored-start physical solve with both arrivals`, true);
        pass = true; failedStep = null;
    } catch (caught) { error = String(caught); throw caught; }
    finally {
        const final = Object.fromEntries(await Promise.all([...actors].map(async ([id, p]) => [id, await observe(p).catch(() => null)])));
        await writeFile(join(h.shots, `${level}-report.json`), JSON.stringify({ pass, scope: 'full-room campaign; real controls from authored starts', hash, failedStep, error, results, final }, null, 2) + '\n');
    }
}
