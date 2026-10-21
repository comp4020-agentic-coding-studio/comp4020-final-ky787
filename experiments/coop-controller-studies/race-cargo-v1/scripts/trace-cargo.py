"""Execute existing PEs and acquire only missing exact traces in this new study.

Requires Windows for PE comparison; pefile/Capstone/Unicorn for trace production.
Imports trace_controller only, never the acquisition analyzer's main/analyze/save.
"""
import importlib.util
import json
import platform
import subprocess
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import STUDY, RACE, ACQUISITION, HASHES, REVISION, sha, read, write, require, key, load_auditor


def main():
    require(sys.platform == 'win32','Native acquisition must execute the existing PEs on Windows')
    reference=read(STUDY/'evidence/current-reference.json')
    contract=read(RACE/'contract.json')
    identity=read(RACE/'build_or_identity/identity.json')
    builds={b['variant']:b for b in identity['builds']}
    cfg=read(RACE/'evidence/disassembly-bcf.json.gz')
    old=read(RACE/'evidence/representative-traces.json.gz')
    retained={key(t['inputs']):t for t in old['traces']}
    names=[f['name'] for f in contract['inputs']]
    payload=''.join(' '.join(str(c['inputs'][n]) for n in names)+'\n' for c in reference['cases'])
    scenarios=read(STUDY/'evidence/scenario-sequences.json')['scenarios']
    # Also execute the accepted scenario snapshots in their actual recorded order.
    ordered=[step for scenario in scenarios for step in scenario['steps']]
    payload+=''.join(' '.join(str(s['native_inputs'][n]) for n in names)+'\n' for s in ordered)
    processes={}
    decoded={}
    for variant in ('clean','bcf'):
        binary=RACE/builds[variant]['binary_path']
        require(sha(binary)==HASHES[variant]==builds[variant]['binary_sha256'],'Frozen PE identity mismatch')
        run=subprocess.run([str(binary)],input=payload,capture_output=True,text=True,encoding='utf-8',timeout=30)
        require(run.returncode==0 and not run.stderr, f'Native execution failed: {variant}: {run.returncode}: {run.stderr}')
        lines=[json.loads(line) for line in run.stdout.splitlines()]
        require(len(lines)==len(reference['cases'])+len(ordered),'Native output line count mismatch')
        processes[variant]={'argv':[str(binary)],'binary_sha256':sha(binary),'exit_code':run.returncode,'stderr':run.stderr,
                            'stdout':run.stdout,'input_stream':payload,'platform':platform.platform()}
        decoded[variant]=lines
    rows=[]
    for index,case in enumerate(reference['cases']):
        results={v:decoded[v][index] for v in decoded}
        require(all(x=={'inputs':case['inputs'],'outputs':case['expected_outputs']} for x in results.values()),'Native/reference mismatch')
        rows.append({'id':case['id'],'inputs':case['inputs'],'expected_outputs':case['expected_outputs'],**results,'valid':True})
    sequence_rows=[]
    for index,step in enumerate(ordered,len(rows)):
        results={v:decoded[v][index] for v in decoded}
        require(all(x=={'inputs':step['native_inputs'],'outputs':step['expected_outputs']} for x in results.values()),'Ordered native/reference mismatch')
        sequence_rows.append({'event':step['event'],'case_id':step['case_id'],**results,'valid':True})
    write(STUDY/'evidence/native-comparisons.json',{'schema':'race-cargo-native-comparisons/v1','analyzed_revision':REVISION,
        'reference_sha256':sha(STUDY/'evidence/current-reference.json'),'scenario_sha256':sha(STUDY/'evidence/scenario-sequences.json'),
        'producer_sha256':sha(__file__),'processes':processes,'rows':rows,'ordered_scenario_rows':sequence_rows,
        'all_valid':True,'unique_cases':len(rows),'ordered_frames_per_pe':len(ordered),'native_calls':2*(len(rows)+len(ordered))})
    spec=importlib.util.spec_from_file_location('frozen_race_trace_components',ACQUISITION/'shared/analyze.py')
    analyzer=importlib.util.module_from_spec(spec); spec.loader.exec_module(analyzer)
    analyzer.FUNCTION='bn_evaluate'; analyzer.CONTRACT=contract
    analyzer.INPUT_NAMES=names; analyzer.OUTPUT_NAMES=[f['name'] for f in contract['outputs']]
    pe=analyzer.pefile.PE(str(RACE/builds['bcf']['binary_path']))
    auditor=load_auditor(); image=auditor['PE'](RACE/builds['bcf']['binary_path'])
    new=[]; selections=[]
    for case,row in zip(reference['cases'],rows):
        trace=retained.get(key(case['inputs']))
        if trace is None:
            state={'inputs':case['inputs'],'expected_outputs':case['expected_outputs'],
                **{v:{'result':row[v],'binary_sha256':HASHES[v]} for v in ('clean','bcf')}}
            trace=analyzer.trace_controller(pe,cfg,case['id'],state)
            require(trace['validation']['ok'],str(trace['validation']))
            new.append(trace)
            path='experiments/coop-controller-studies/race-cargo-v1/evidence/targeted-traces.json.gz'
            origin='new_exact_pe_unicorn_execution'
        else:
            path='experiments/coop-controllers/race-condition/evidence/representative-traces.json.gz'
            origin='reused_exact_full_input_trace'
        auditor['trace_check'](trace,case,contract,cfg,image,builds['bcf'])
        selections.append({**case,'trace':{'id':trace['trace_id'],'path':path,'origin':origin},
                           'abstract_cargo_case':case['id']<16})
    write(STUDY/'evidence/targeted-traces.json.gz',{'schema':'race-cargo-targeted-traces/v1','binary_sha256':HASHES['bcf'],
        'native_comparisons_sha256':sha(STUDY/'evidence/native-comparisons.json'),
        'analyzer_sha256':sha(ACQUISITION/'shared/analyze.py'),'producer_sha256':sha(__file__),
        'method':'Existing trace_controller called with frozen PE and frozen CFG; no original artifact writer invoked',
        'tools':{'python':platform.python_version(),'pefile':analyzer.pefile.__version__,'capstone':__import__('capstone').__version__,'unicorn':__import__('unicorn').__version__},
        'traces':new})
    write(STUDY/'cases.json',{'schema':'race-cargo-cases/v1','binary_sha256':HASHES['bcf'],
        'input_names':names,'output_names':reference['output_names'],'abstract_cases':16,
        'fixed_other_inputs':dict.fromkeys(names[2:10],0),'additional_scenario_case_ids':[c['id'] for c in selections if c['id']>=16],
        'reused_count':len(selections)-len(new),'new_count':len(new),'cases':selections,
        'limits':['Every case records all 11 native fields; bufferPhase is a four-valued uint32.',
                  'The abstract product is not a claim of server or physical reachability.',
                  'Only exact full input vectors select a trace. Missing matches remain unknown.',
                  'Unicorn instruction execution and real Windows PE stdout are different evidence sources.']})
    print(json.dumps({'status':'PASS','reused':len(selections)-len(new),'new':len(new),'native_calls':2*(len(rows)+len(ordered))}))


if __name__=='__main__':
    main()
