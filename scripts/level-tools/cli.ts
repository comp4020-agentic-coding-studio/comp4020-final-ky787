import { parseArgs } from 'node:util';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { newDraft, draftHash } from '../../src/workbench/model.ts';
import { importDraft } from '../../src/workbench/imports.ts';
import { parseDraft, validateDraft } from '../../src/workbench/validation.ts';
import { DraftStorage } from './storage.ts';

async function main() {
    const [command, ...args] = process.argv.slice(2).filter(arg => arg !== '--');
    const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
        out: { type: 'string' }, json: { type: 'boolean' }, state: { type: 'string' }, region: { type: 'string' },
        scenario: { type: 'string' }, report: { type: 'string' }, help: { type: 'boolean' },
    } });
    if (values.help || !command) {
        console.log('level:new <levels/drafts/name.json>\nlevel:import <factory> --out levels/drafts/name.json\nlevel:validate <file> [--json]\nlevel:render <file> [--state name] [--region x,y,w,h] --out .workbench/reports/name.png\nlevel:playtest <file> --scenario levels/scenarios/name.json --report .workbench/reports/name'); return;
    }
    if (command === 'new' || command === 'import') {
        const target = command === 'new' ? positionals[0] : values.out;
        if (!target) throw new Error('A destination file is required');
        const absolute = resolve(target), root = resolve('levels/drafts');
        if (dirname(absolute) !== root) throw new Error('Canonical draft files must be directly under levels/drafts');
        const document = command === 'new' ? newDraft(basename(absolute, '.json')) : importDraft(positionals[0] ?? '');
        const record = await new DraftStorage(root).write(basename(absolute), document, null);
        console.log(JSON.stringify({ file: target, hash: record.hash, diagnostics: record.diagnostics }, null, 2)); return;
    }
    const source = positionals[0]; if (!source) throw new Error('A draft file is required');
    const bytes = await readFile(source);
    if (bytes.length > 1_000_000) throw new Error('Draft exceeds 1,000,000 bytes');
    let value: unknown;
    try { value = JSON.parse(bytes.toString('utf8')); } catch (error) {
        if (command === 'validate') { console.log(JSON.stringify({ pass: false, structural: false, playable: false, diagnostics: [{ code: 'JSON_PARSE', severity: 'error', message: String(error) }] }, null, 2)); process.exitCode = 2; return; }
        throw error;
    }
    const validation = validateDraft(value);
    if (command === 'validate') {
        const result = { pass: validation.playable, structural: validation.structural, playable: validation.playable, hash: validation.document ? await draftHash(validation.document) : null, diagnostics: validation.diagnostics };
        if (values.json) console.log(JSON.stringify(result, null, 2));
        else { console.log(`${result.playable ? 'PLAYABLE' : result.structural ? 'DRAFT ONLY' : 'MALFORMED'} ${source}`); for (const d of result.diagnostics) console.log(`${d.severity.toUpperCase()} ${d.code}${d.objectId ? ` [${d.objectId}]` : ''}: ${d.message}`); }
        if (!result.playable) process.exitCode = 2; return;
    }
    if (!validation.playable) { console.error(JSON.stringify({ error: 'Blocking diagnostics prevent runtime creation', diagnostics: validation.diagnostics }, null, 2)); process.exitCode = 2; return; }
    const document = parseDraft(value);
    if (command === 'render') {
        if (!values.out) throw new Error('--out PNG path is required');
        let region: { x: number; y: number; w: number; h: number } | undefined;
        if (values.region) { const parts = values.region.split(',').map(Number); if (parts.length !== 4 || !parts.every(Number.isFinite) || parts[2] <= 0 || parts[3] <= 0) throw new Error('--region is x,y,width,height in world units'); region = { x: parts[0], y: parts[1], w: parts[2], h: parts[3] }; }
        const { renderDraft } = await import('./browser-tools.ts');
        const result = await renderDraft(document, { out: values.out, state: values.state, region });
        console.log(JSON.stringify(result, null, 2)); return;
    }
    if (command === 'playtest') {
        if (!values.scenario || !values.report) throw new Error('--scenario and --report are required');
        const { runScenario } = await import('./browser-tools.ts');
        const scenario = JSON.parse(await readFile(values.scenario, 'utf8'));
        const result = await runScenario(document, scenario, values.report);
        console.log(JSON.stringify(result, null, 2)); if (!result.pass) process.exitCode = 1; return;
    }
    throw new Error(`Unknown level command: ${command}`);
}
main().catch(error => { console.error(JSON.stringify({ pass: false, error: error instanceof Error ? error.message : String(error) })); process.exitCode = 2; });
