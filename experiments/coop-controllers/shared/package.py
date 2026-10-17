"""Explicit acquisition packaging step; never called by the read-only verifier."""
from pathlib import Path
import gzip
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
IDS = ('handshake', 'crossfeed-vault', 'race-condition', 'deadlock', 'use-after-free')
COMMIT = '1315c3616ce5ac939baf913f9b09b4ebad34132a'


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def read(p):
    raw = p.read_bytes()
    return json.loads(gzip.decompress(raw) if p.suffix == '.gz' else raw)


def write(p, data):
    p.write_text(json.dumps(data, indent=2, ensure_ascii=True) + '\n', encoding='utf-8', newline='\n')


def retained(p, base):
    rel = p.relative_to(base)
    return (p.is_file() and not any(x in ('_build', '__pycache__') for x in rel.parts)
            and p.suffix not in ('.pyc', '.log', '.exp', '.lib'))


def inventory(base):
    return {p.relative_to(base).as_posix(): sha(p) for p in sorted(base.rglob('*'))
            if retained(p, base) and p != base / 'manifest.json'}


def output_role(chamber, name, kind):
    if name == 'exitUnlockCandidate':
        return 'Actual definition.unlock(ctx) candidate for server commitAction; no authored MachineSignal or new physical object.'
    if name == 'spanMaster':
        return 'receiver-master wire and phase prediction gating; no separate physical platform.'
    if kind == 'persisted_latch_projection':
        return 'Projects server exitUnlocked. This function neither creates nor clears that latch.'
    if kind == 'physical_projection':
        return 'Grace-inclusive power for existing machinery; server crumble/physics constraints still apply.'
    if chamber == 'use-after-free' and name == 'assistBlocked':
        return 'Raw blocked signal. Invert once at finalLift binding, never inside the native controller.'
    return 'Current raw controller decision; apply each existing binding once.'


def main():
    rows = []
    binary_rows = []
    cfg_rows = []
    for name in IDS:
        d = ROOT / name
        c = read(d / 'contract.json')
        identity = read(d / 'build_or_identity/identity.json')
        native = read(d / 'evidence/native-summary.json')
        traces = read(d / 'evidence/trace-summary.json')
        assert native['all_valid'] and traces['all_valid']
        outputs = []
        for out in c['outputs']:
            sites = [s for s in traces['output_store_sites'] if s['output'] == out['name']]
            bindings = [b for b in c['bindings'] if b['output'] == out['name'] or b.get('physical_output') == out['name']]
            outputs.append({**out, 'role': output_role(name, out['name'], out['kind']),
                'memory': f"uint32_t at the output buffer supplied in RDX + {out['offset']} bytes",
                'bindings': bindings, 'verified_bcf_store_sites': sites,
                'observed_values': traces['output_value_coverage'][out['name']],
                'dynamic_evidence': 'Exact PE instruction execution in Unicorn; terminal values also compared with native Windows harness stdout'})
        write(d / 'integration.json', {'schema': 'coop-native-integration/v1', 'chamber_id': name,
            'contract_sha256': sha(d / 'contract.json'), 'status': 'proposal_only_no_live_integration',
            'trace_summary_sha256': sha(d / 'evidence/trace-summary.json'), 'outputs': outputs,
            'server_owned': c['server_owned'],
            'mapping_limits': ['An output store is evidence for a signal, not a unique physical platform or complete backwards data-flow slice.',
                'Multiple machinery bindings may share one signal and the same native region.',
                'Authored unstable platforms have no proven-bogus-block mapping in this acquisition.',
                'Supply accepted canonical state, retain server scheduling/latches, then apply existing bindings. Do not change geometry or ownership.']})
        base_count = c['coverage'].get('exhaustive_row_count', c['coverage']['row_count'])
        rows.append(f"| [{name}]({name}/README.md) | {len(c['inputs'])} / {len(c['outputs'])} | {base_count:,} | {native['case_count']-base_count} | {native['sequence_count']} / {native['ordered_sequence_frames']} | {native['native_frames']:,} |")
        for b in identity['builds']:
            binary_rows.append(f"| {name} | [{b['variant']}]({name}/{b['binary_path']}) | `{b['binary_sha256']}` |")
        metrics = traces['cfg_metrics']
        cfg_rows.append(f"| {name} | {metrics['clean']['instructions']} / {metrics['bcf']['instructions']} | {metrics['clean']['blocks']} / {metrics['bcf']['blocks']} | {metrics['bcf']['clone_origin_blocks']} | {traces['trace_count']} |")
        table = ['| Raw output | Offset | Existing machinery / role | BCF store RVAs (observed value) |', '| --- | ---: | --- | --- |']
        for out in outputs:
            targets = ', '.join(f"{b['target']}.{b['property']}" + (' (invert once)' if b.get('invert') else '') for b in out['bindings']) or out['role']
            sites = ', '.join(f"`0x{s['instruction_rva']:X}` ({'/'.join(map(str,s['observed_values']))})" for s in out['verified_bcf_store_sites'])
            table.append(f"| {out['name']} | {out['offset']} | {targets} | {sites} |")
        limits = c.get('limits', ['Native snapshot decisions only. The server retains occupancy authority, persistence, exit latching, arrivals and all movement/physics.'])
        text = f"""# {name.upper().replace('-', ' ')} native acquisition

Status: all clean/BCF native comparisons and retained instruction traces passed. Acquisition only; the live controller is unchanged.
Reference game commit: `{COMMIT}`.

Files: [C source](src/controller.c), [ABI header](src/controller.h), [CLI harness](src/harness.c),
[clean PE](bin/clean_x64.exe), [BCF PE](bin/obfuscated_x64.exe), [contract](contract.json),
[build identity](build_or_identity/identity.json), [exact commands](build_or_identity/commands.json),
[manifest](manifest.json), [integration mapping](integration.json).

Windows x64 `void bn_evaluate(const ControllerInputs*, ControllerOutputs*)`: RCX inputs, RDX outputs,
little-endian uint32 fields at consecutive 4-byte offsets; every output is written on every call.
Boolean domains are 0/1; RACE's bufferPhase uses 0=idle, 1=window, 2=released, 3=expired.
Input order: {', '.join(x['name'] for x in c['inputs'])}. Initial values and meanings are in the contract.

Coverage: {base_count:,} exhaustive abstract input vectors; {native['case_count']-base_count} additional server-sequence snapshots;
{native['sequence_count']} ordered sequences / {native['ordered_sequence_frames']} calls replayed in sequence order per PE.
Total {native['native_frames']:,} native invocations across both PEs, zero output mismatches.
The ordered native calls are stateless; their reference server performs any state transitions.

[Native summary](evidence/native-summary.json), `evidence/native-results.json.gz` and both
`evidence/native-*-stdout.jsonl.gz` retain comparisons and actual process output.
[Trace summary](evidence/trace-summary.json), `evidence/representative-traces.json.gz`,
`evidence/disassembly-clean.json.gz` and `evidence/disassembly-bcf.json.gz` retain exact addresses,
bytes, decoded CFGs, executed instruction occurrences and output commits.
There are {traces['trace_count']} selected BCF traces, with both 0 and 1 observed for every output.
Static decoding alone is not execution evidence. Unicorn traces execute retained PE instructions;
they are emulator observations, separately compared with real Windows PE output.

{chr(10).join(table)}

Clean → BCF: {metrics['clean']['instructions']} → {metrics['bcf']['instructions']} instructions;
{metrics['clean']['blocks']} → {metrics['bcf']['blocks']} raw blocks.
`evidence/bogus-proof.json.gz` and [shared proof method](../shared/PROOF.md) justify
{metrics['bcf']['clone_origin_blocks']} altered clones under the stated normal-entry/intact-code assumptions.
No clone is assigned to an authored unstable platform.

{chr(10).join('- '+s for s in limits)}

See the [package README](../README.md) for every binary hash and rerun commands.
"""
        (d / 'README.md').write_text(text, encoding='utf-8', newline='\n')
        write(d / 'manifest.json', {'schema': 'coop-native-manifest/v1', 'chamber_id': name,
            'reference_commit': COMMIT, 'contract_sha256': sha(d / 'contract.json'),
            'reference_source_sha256': c['reference_source_sha256'],
            'native_source_sha256': identity['source_sha256'], 'compiler': identity['compiler'],
            'linker': identity['linker'], 'seed': identity['seed'], 'builds': identity['builds'],
            'exact_commands': read(d / 'build_or_identity/commands.json'), 'abi': c['abi'],
            'input_output_mapping': 'contract.json and integration.json', 'coverage': c['coverage'],
            'native_verification': native, 'trace_provenance': {k: traces[k] for k in ('tools','trace_artifact','cfg_artifacts','selection','cfg_metrics')},
            'known_limits': limits + traces['limitations'], 'files': inventory(d)})
    template = (ROOT / 'shared/README-template.md').read_text(encoding='utf-8')
    (ROOT / 'README.md').write_text(template.replace('{{COVERAGE}}', '\n'.join(rows)).replace('{{BINARIES}}', '\n'.join(binary_rows)).replace('{{CFGS}}', '\n'.join(cfg_rows)), encoding='utf-8', newline='\n')
    write(ROOT / 'shared/manifest.json', {'schema': 'coop-native-shared-manifest/v1', 'reference_commit': COMMIT, 'files': inventory(ROOT / 'shared')})
    write(ROOT / 'manifest.json', {'schema': 'coop-native-package/v1', 'reference_commit': COMMIT,
        'chambers': {name: {'manifest_path': f'{name}/manifest.json', 'sha256': sha(ROOT/name/'manifest.json')} for name in IDS},
        'shared': {'manifest_path': 'shared/manifest.json', 'sha256': sha(ROOT/'shared/manifest.json')},
        'files': {p.name: sha(p) for p in sorted(ROOT.iterdir()) if retained(p, ROOT) and p.name not in ('manifest.json','verification-report.json')}})
    print(json.dumps({'status': 'packaged', 'chambers': list(IDS), 'manifest_sha256': sha(ROOT / 'manifest.json')}))


if __name__ == '__main__':
    main()
