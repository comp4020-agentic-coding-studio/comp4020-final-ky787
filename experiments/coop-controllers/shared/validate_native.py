"""Windows authority: execute exact hash-pinned PEs and compare actual game oracle.

Batch stdin avoids one OS process per vector. Full ordered stdout is retained.
The Linux verifier only audits these observations; it cannot replace this run.
"""
from pathlib import Path
import argparse,gzip,hashlib,json,subprocess
AREA=Path(__file__).resolve().parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(gzip.decompress(p.read_bytes()) if p.suffix=='.gz' else p.read_bytes())
def save(p,v):
    data=(json.dumps(v,separators=(',',':'))+'\n').encode()
    p.write_bytes(gzip.compress(data,mtime=0) if p.suffix=='.gz' else data)
def main():
    ap=argparse.ArgumentParser();ap.add_argument('chamber');args=ap.parse_args()
    root=AREA/args.chamber;ev=root/'evidence';c=read(root/'contract.json');identity=read(root/'build_or_identity/identity.json')
    refpath=next(p for p in [ev/'reference-vectors.json.gz',ev/'reference-vectors.json'] if p.is_file())
    ref=read(refpath);cases=ref['cases'];names=[x['name'] for x in c['inputs']];outputs=[x['name'] for x in c['outputs']]
    assert cases and len({str(x['id']) for x in cases})==len(cases)
    by_id={str(row['id']):row for row in cases}
    ordered=[(seq,[by_id[str(i)] for i in seq['case_ids']]) for seq in ref.get('sequences',[]) if 'case_ids' in seq]
    execution_cases=cases+[row for _, sequence in ordered for row in sequence]
    stdin=''.join(' '.join(str(row['inputs'][n]) for n in names)+'\n' for row in execution_cases)
    processes={};observations={}
    for build in identity['builds']:
        variant=build['variant'];exe=root/build['binary_path'];assert sha(exe)==build['binary_sha256']
        try:
            p=subprocess.run([str(exe)],input=stdin,cwd=root,text=True,capture_output=True,timeout=180)
            status=dict(argv=[str(exe)],exit_code=p.returncode,stderr=p.stderr,stdout_sha256=hashlib.sha256(p.stdout.encode()).hexdigest())
            stdout=p.stdout
        except (OSError,subprocess.TimeoutExpired) as e:
            stdout='';status=dict(argv=[str(exe)],exit_code=None,error=str(e))
        rawpath=ev/f'native-{variant}-stdout.jsonl.gz';rawpath.write_bytes(gzip.compress(stdout.encode(),mtime=0))
        status.update(binary_sha256=sha(exe),stdout_path=rawpath.relative_to(root).as_posix(),stdout_file_sha256=sha(rawpath),input_vectors=len(execution_cases))
        processes[variant]=status
        try:observations[variant]=[json.loads(line) for line in stdout.splitlines()]
        except ValueError:observations[variant]=[];status['parse_error']=True
    rows=[]
    for index,case in enumerate(cases):
        row=dict(id=case['id'],inputs=[case['inputs'][n] for n in names],expected=[case['expected_outputs'][n] for n in outputs])
        valid=True
        for variant in ['clean','bcf']:
            actual=observations[variant][index] if index<len(observations[variant]) else None
            row[variant]=[actual['outputs'].get(n) for n in outputs] if actual and isinstance(actual.get('outputs'),dict) else None
            valid &= (processes[variant]['exit_code']==0 and actual is not None and actual.get('inputs')==case['inputs'] and actual.get('outputs')==case['expected_outputs'])
        row['valid']=bool(valid);rows.append(row)
    ordered_results=[];cursor=len(cases)
    for sequence, snapshots in ordered:
        steps=[]
        for case in snapshots:
            step=dict(case_id=case['id'],inputs=case['inputs'],expected_outputs=case['expected_outputs'])
            good=True
            for variant in ['clean','bcf']:
                actual=observations[variant][cursor] if cursor<len(observations[variant]) else None
                step[variant]=actual
                good &= actual==dict(inputs=case['inputs'],outputs=case['expected_outputs'])
            step['valid']=bool(good);steps.append(step);cursor+=1
        ordered_results.append(dict(id=sequence['id'],steps=steps,all_valid=all(s['valid'] for s in steps)))
    complete=all(len(observations[v])==len(execution_cases) for v in processes)
    report=dict(schema='coop-native-results/v1',chamber_id=args.chamber,contract_sha256=sha(root/'contract.json'),reference_path=refpath.relative_to(root).as_posix(),reference_sha256=sha(refpath),input_names=names,output_names=outputs,rows=rows,processes=processes,case_count=len(cases),ordered_sequences=ordered_results,ordered_sequence_frames=len(execution_cases)-len(cases),all_valid=complete and all(r['valid'] for r in rows) and all(s['all_valid'] for s in ordered_results),failed_case_ids=[r['id'] for r in rows if not r['valid']],sequence_validation='Actual native calls in retained sequence order; reference server owns transitions and timer scheduling. Native controller is stateless.')
    save(ev/'native-results.json.gz',report)
    summary={k:v for k,v in report.items() if k not in ['rows','processes','ordered_sequences']}
    summary['sequence_count']=len(ordered_results)
    summary['native_frames']=2*len(execution_cases);summary['native_result_sha256']=sha(ev/'native-results.json.gz')
    save(ev/'native-summary.json',summary)
    print(json.dumps(summary,indent=2))
    if not report['all_valid']:raise SystemExit('Native failures retained; build not accepted.')
if __name__=='__main__':main()
