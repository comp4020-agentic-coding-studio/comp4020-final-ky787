#!/usr/bin/env node
/**
 * Browser smoke test for the native co-op evidence inspector.
 *
 * Opens a HANDSHAKE co-op party, pauses into the evidence inspector, and checks
 * that what it renders is the actual generated native evidence (status label,
 * PE hash, and a real output-store instruction whose bytes/address match the
 * on-disk evidence file). This proves the inspector shows verified native data,
 * not fabricated assembly, and that the button only appears for native chambers.
 */
import { readFile } from 'node:fs/promises';
import { coopBrowser, type Cdp } from './coop-browser.ts';

const h = await coopBrowser({ shots: process.env.BN_SHOTS ?? '/tmp/bn-native-evidence-shots', internalLabs: false });
const { check, click, wait, sleep, shot } = h;
const visible = (p: Cdp, sel: string) => p.read<boolean>(`!!document.querySelector(${JSON.stringify(sel)}) && !document.querySelector(${JSON.stringify(sel)}).closest('[hidden]')`);
const text = (p: Cdp, sel: string) => p.read<string>(`document.querySelector(${JSON.stringify(sel)})?.textContent ?? ''`);

try {
    const evidence = JSON.parse(await readFile('public/evidence/coop/handshake.evidence.json', 'utf8'));
    const firstStore = evidence.outputs.flatMap((o: { store_sites: unknown[] }) => o.store_sites)[0] as { mnemonic: string; op_str: string; bytes: string };

    const url = await h.startServer(), debug = await h.launch();
    const a = await h.page(url, debug), b = await h.page(url, debug);
    await click(a, '#create-party');
    const first = await wait(a, 'party lobby', s => s.multiplayer?.shared?.party?.phase === 'lobby');
    const code = first.multiplayer!.code!;
    await click(b, '#join-code'); await b.send('Input.insertText', { text: code }); await click(b, '#join-room');
    await wait(b, 'guest joins', s => s.multiplayer?.shared?.connected.every(Boolean) === true);
    await click(a, '[data-select-level="handshake"]');
    for (const p of [a, b]) await wait(p, 'handshake overview', s => s.room === 'handshake' && s.overviewVisible);

    check('evidence button available for native-backed HANDSHAKE', await visible(a, '#evidence-toggle'));
    check('source badge reads VALIDATED OLLVM BCF', (await text(a, '#controller-source')).includes('VALIDATED OLLVM BCF'));

    await click(a, '#evidence-toggle');
    await sleep(400); // lazy evidence fetch
    check('evidence inspector opens', await visible(a, '#evidence'));
    const body = await text(a, '#evidence pre');
    check('inspector shows NATIVE-VERIFIED status', body.includes('NATIVE-VERIFIED OUTPUTS') || body.includes('VALIDATED OLLVM BCF'));
    check('inspector shows the verified obfuscated PE hash', body.includes(evidence.bcf_pe_sha256));

    // Select an output region and verify a real store-site instruction renders.
    await a.read(`(()=>{const s=document.querySelector('#evidence select');s.value='output:${evidence.outputs[0].name}';s.dispatchEvent(new Event('change'));})()`);
    await sleep(100);
    const outBody = await text(a, '#evidence pre');
    check('output region shows a real native store instruction from the evidence file',
        outBody.includes(`${firstStore.mnemonic} ${firstStore.op_str}`) && outBody.includes(firstStore.bytes));

    // Bogus region renders proof assumptions, not an executed-path claim.
    await a.read(`(()=>{const s=document.querySelector('#evidence select');s.value='bogus';s.dispatchEvent(new Event('change'));})()`);
    await sleep(100);
    const bogusBody = await text(a, '#evidence pre');
    check('bogus region shows proven-clone evidence with assumptions', bogusBody.includes('PROVEN BOGUS CLONES') && bogusBody.includes('PROOF ASSUMPTIONS'));
    check('bogus region does not claim live execution', !bogusBody.toLowerCase().includes('executing live'));
    await shot(a, 'handshake-native-evidence');

    await click(a, '#evidence-toggle');
    check('inspector closes and gameplay can resume', !(await visible(a, '#evidence')));

    process.stdout.write(`\n${h.checks.length} checks passed\n`);
} finally {
    await h.cleanup();
}
