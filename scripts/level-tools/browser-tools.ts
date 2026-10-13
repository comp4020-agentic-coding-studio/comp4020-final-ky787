import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { coopBrowser, type Cdp } from '../coop-browser.ts';
import { startWorkbench } from './service.ts';
import { draftHash, type DraftDocument } from '../../src/workbench/model.ts';
import { conditionMatches, parseScenario, type ScenarioCondition, type ScenarioAction } from './scenario.ts';
import type { Box } from '../../src/engine/geometry.ts';

async function environment(document: DraftDocument, reports: string) {
    const harness = await coopBrowser({ shots: reports, internalLabs: false, readyExpression: '!!globalThis.draftRunner?.ready' });
    let app: Awaited<ReturnType<typeof startWorkbench>>;
    try { app = await startWorkbench({ port: 0, dataDir: join(harness.temporary, 'workbench') }); }
    catch (error) { await harness.cleanup(); throw error; }
    let closing: Promise<void> | undefined;
    const close = () => closing ??= (async () => { await harness.cleanup(); await app.close(); })();
    const signal = () => { void close().finally(() => { process.exitCode = 130; }); };
    process.once('SIGINT', signal); process.once('SIGTERM', signal);
    try {
        const frozen = await app.registry.register(document), debuggerUrl = await harness.launch();
        return { harness, app, frozen, debuggerUrl, close: async () => { process.off('SIGINT', signal); process.off('SIGTERM', signal); await close(); } };
    } catch (error) { process.off('SIGINT', signal); process.off('SIGTERM', signal); await close(); throw error; }
}
async function screenshot(page: Cdp, path: string) {
    const capture = await page.send('Page.captureScreenshot', { format: 'png' });
    const bytes = Buffer.from(capture.data, 'base64');
    if (bytes.length < 2000) throw new Error('Screenshot unexpectedly empty');
    await mkdir(dirname(resolve(path)), { recursive: true }); await writeFile(path, bytes);
}
function browserErrors(pages: Cdp[]) { const errors = pages.flatMap(p => p.errors); if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`); }
export async function renderDraft(document: DraftDocument, options: { out: string; state?: string; region?: Box }) {
    const env = await environment(document, dirname(resolve(options.out)));
    try {
        const page = await env.harness.page(`${env.app.origin}/workbench-runner.html?capture=1&hash=${env.frozen.hash}`, env.debuggerUrl);
        const observed = await page.read(`draftRunner.render(${JSON.stringify({ state: options.state, region: options.region })})`);
        browserErrors([page]); await screenshot(page, options.out);
        const metadata = { pass: true, draftHash: env.frozen.hash, engineRevision: env.app.engineRevision, state: options.state ?? 'initial', region: options.region ?? 'whole-room', renderer: 'PuzzleRenderer', observed, image: options.out };
        await writeFile(options.out.replace(/\.png$/i, '') + '.json', JSON.stringify(metadata, null, 2) + '\n');
        return metadata;
    } finally { await env.close(); }
}
export async function runScenario(document: DraftDocument, value: unknown, report: string) {
    const scenario = parseScenario(value), directory = resolve(report);
    await mkdir(directory, { recursive: true });
    const env = await environment(document, directory), actors = new Map<string, Cdp>();
    const results: { label: string; pass: boolean; observed?: unknown; error?: string }[] = [];
    let pass = false, failedStep: string | null = null, error: string | null = null;
    const deadline = Date.now() + scenario.timeoutMs;
    const observe = (p: Cdp) => p.read<Record<string, unknown>>('draftRunner.observe()');
    const checkDeadline = () => { if (Date.now() > deadline) throw new Error(`Scenario timeout (${scenario.timeoutMs}ms)`); browserErrors([...actors.values()]); };
    async function wait(p: Cdp, condition: ScenarioCondition, timeoutMs: number) {
        const until = Math.min(deadline, Date.now() + timeoutMs); let last: unknown;
        do { checkDeadline(); last = await observe(p); if (conditionMatches(last, condition)) return last; await env.harness.sleep(25); } while (Date.now() < until);
        throw new Error(`Timed out waiting for ${JSON.stringify(condition)}; observed ${JSON.stringify(last)}`);
    }
    async function action(a: ScenarioAction) {
        const p = actors.get(a.actor)!; checkDeadline();
        if (a.type === 'key') await env.harness.key(p, a.code, a.down);
        else if (a.type === 'tap') await env.harness.tap(p, a.code);
        else if (a.type === 'walk') {
            const state = await observe(p), player = state.player as { x: number }, right = player.x < a.x, code = right ? 'KeyD' : 'KeyA';
            await env.harness.key(p, code, true);
            try { await wait(p, { path: 'player.x', ...(right ? { min: a.x } : { max: a.x }) }, a.timeoutMs ?? 10000); }
            finally { await env.harness.key(p, code, false); }
        } else {
            const point = a.down ? await p.read<{ x: number; y: number }>(`draftRunner.aimPoint(${JSON.stringify(a.target)})`) : { x: 400, y: 400 };
            await p.send('Input.dispatchMouseEvent', { type: a.down ? 'mousePressed' : 'mouseReleased', ...point, button: 'left', buttons: a.down ? 1 : 0, clickCount: 1 });
        }
    }
    try {
        let code: string | undefined;
        for (const actor of [...scenario.actors].sort((a, b) => a.slot - b.slot)) {
            const query = scenario.mode === 'single' ? `hash=${env.frozen.hash}&slot=${actor.slot}` : actor.slot === 1 ? `coopHash=${env.frozen.hash}` : `code=${code}`;
            const page = await env.harness.page(`${env.app.origin}/workbench-runner.html?${query}&scenario=${encodeURIComponent(scenario.id)}`, env.debuggerUrl); actors.set(actor.id, page);
            if (scenario.mode === 'single') await page.read(`draftRunner.start(${JSON.stringify({ ...actor.start, scenario: scenario.id })})`);
            else if (actor.slot === 1) code = await page.read<string>('draftRunner.observe().session.code');
        }
        if (scenario.mode === 'coop') {
            for (const p of actors.values()) await wait(p, { path: 'session.peers.1', equals: true }, 10000);
            const identities = await Promise.all([...actors.values()].map(p => p.read<string>('draftRunner.observe().session.visitor')));
            if (new Set(identities).size !== 2) throw new Error('Co-op scenario requires two isolated browser identities');
        }
        for (const step of scenario.steps) {
            failedStep = step.label; checkDeadline();
            // Actions in one step may hold controls for both actors concurrently.
            for (const a of step.actions ?? []) await action(a);
            if (step.waitMs) { await env.harness.sleep(step.waitMs); checkDeadline(); }
            if (step.wait) await wait(actors.get(step.wait.actor)!, step.wait.condition, step.wait.timeoutMs);
            const observed = Object.fromEntries(await Promise.all([...actors].map(async ([id, p]) => [id, await observe(p)])));
            for (const assertion of step.assert ?? []) if (!conditionMatches(observed[assertion.actor], assertion.condition)) throw new Error(`Assertion failed: ${JSON.stringify(assertion)}; observed ${JSON.stringify(observed[assertion.actor])}`);
            results.push({ label: step.label, pass: true, observed });
        }
        if (scenario.scope === 'full-room') {
            failedStep = 'full-room completion';
            for (const [id, page] of actors) if (!conditionMatches(await observe(page), { path: 'completed', equals: true }))
                throw new Error(`Full-room scope requires physical completion for ${id}; partial assertions cannot certify a full room`);
        }
        checkDeadline(); pass = true; failedStep = null;
    } catch (caught) {
        error = caught instanceof Error ? caught.message : String(caught);
        const observed = Object.fromEntries(await Promise.all([...actors].map(async ([id, page]) => {
            try { return [id, await observe(page)]; }
            catch (failure) { return [id, { observationError: String(failure) }]; }
        })));
        results.push({ label: failedStep ?? 'startup', pass: false, error, observed });
    }
    finally {
        for (const [id, p] of actors) {
            try { await screenshot(p, join(directory, `${pass ? 'final' : 'failure'}-${id}.png`)); await writeFile(join(directory, `trajectory-${id}.json`), JSON.stringify(await p.read('draftRunner.recording()'), null, 2) + '\n'); }
            catch (caught) { pass = false; error ??= String(caught); }
        }
        await env.close();
    }
    const output = { version: 1, pass, scope: scenario.scope, mode: scenario.mode, scenario: scenario.id, draftHash: await draftHash(document), engineRevision: env.app.engineRevision, failedStep, error,
        conclusion: pass ? 'The specified route/assertions worked in this tested configuration; reachability and shortcut absence outside this route are not tested.' : 'Scenario failed; inspect observations, screenshots and measured trajectories.', results };
    await writeFile(join(directory, 'report.json'), JSON.stringify(output, null, 2) + '\n'); return output;
}
