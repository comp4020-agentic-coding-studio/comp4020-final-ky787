"""Study-local constants and read helpers; acquisition files are never written."""
from pathlib import Path
import gzip
import hashlib
import json
import runpy

STUDY = Path(__file__).resolve().parents[1]
REPO = STUDY.parents[2]
ACQUISITION = REPO / 'experiments/coop-controllers'
RACE = ACQUISITION / 'race-condition'
REVISION = '0810cb8c4883c5a8bd979d49612108d39329d0f8'
HASHES = {'clean': '2eb161048cac1f2734838ed3a87e601e6e990e311a6c316eacf88696928b8487',
          'bcf': '371d0217e00d8662430df701ab2f8b34d4192a9b574534b5b32099dddc6c491a'}
CARGO = ['topBridge', 'bufferBridge', 'safetyFirewall', 'raceFirewall']
SECTIONS = dict(zip(CARGO, ['upper-support','buffer-support','safety-interlock','overlap-interlock']))
PHASES = ['idle','window','released','expired']

# These are reviewed address associations for this exact frozen specimen.
# range ends are exclusive; every record is later checked against decoded PE bytes.
RULES = [
    dict(id='upper-a', output='topBridge', field='dropA', compare=0x1199, read_start=0x1196, read_end=0x11a2, operation='ne', constant=0, spill=-0x3c, branch_start=0x11d0, branch=0x11d5),
    dict(id='buffer-b', output='bufferBridge', field='dropB', compare=0x12e4, read_start=0x12dd, read_end=0x12ee, operation='ne', constant=0, spill=-0x3d, branch_start=0x131c, branch=0x1321),
    dict(id='buffer-idle', output='bufferBridge', field='bufferPhase', compare=0x135e, read_start=0x1357, read_end=0x1368, operation='eq', constant=0, spill=-0x3e, branch_start=0x1396, branch=0x139b),
    dict(id='buffer-window', output='bufferBridge', field='bufferPhase', compare=0x13d4, read_start=0x13cd, read_end=0x13de, operation='eq', constant=1, spill=-0x3f, branch_start=0x140c, branch=0x1411),
    dict(id='safety-b', output='safetyFirewall', field='dropB', compare=0x1522, read_start=0x151b, read_end=0x152c, operation='ne', constant=0, spill=-0x40, branch_start=0x155a, branch=0x155f),
    dict(id='safety-expired', output='safetyFirewall', field='bufferPhase', compare=0x1598, read_start=0x1591, read_end=0x15a2, operation='eq', constant=3, spill=-0x41, branch_start=0x15d0, branch=0x15d5),
    dict(id='overlap-a', output='raceFirewall', field='dropA', compare=0x16e6, read_start=0x16df, read_end=0x16ef, operation='ne', constant=0, spill=-0x42, branch_start=0x171d, branch=0x1722),
    dict(id='overlap-b', output='raceFirewall', field='dropB', compare=0x175e, read_start=0x1757, read_end=0x1768, operation='ne', constant=0, spill=-0x43, branch_start=0x1796, branch=0x179b),
]
STORES = {'topBridge': {0:0x1279,1:0x120e}, 'bufferBridge': {0:0x14b6,1:0x144a},
          'safetyFirewall': {0:0x167a,1:0x160e}, 'raceFirewall': {0:0x1840,1:0x17d4}}


def require(value, message):
    if not value:
        raise ValueError(message)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read(path):
    path = Path(path)
    raw = path.read_bytes()
    return json.loads(gzip.decompress(raw) if path.suffix == '.gz' else raw)


def write(path, value):
    path = Path(path)
    require(path.resolve().is_relative_to(STUDY), 'Study writer may not alter acquisition/game files')
    raw = (json.dumps(value, indent=None if path.suffix == '.gz' else 2, ensure_ascii=True)+'\n').encode()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(gzip.compress(raw, mtime=0) if path.suffix == '.gz' else raw)


def load_auditor():
    # Import helper functions only. Do not call the historical package main:
    # historical source identities intentionally differ from today's integrated server.
    return runpy.run_path(str(ACQUISITION/'shared/verify_portable.py'))


def case_id(inputs):
    c = read(RACE/'contract.json')
    return sum(inputs[f['name']] << i for i,f in enumerate(c['inputs'][:10])) * 4 + inputs['bufferPhase']


def key(inputs):
    return tuple(inputs[f['name']] for f in read(RACE/'contract.json')['inputs'])


def load_traces():
    reused = read(RACE/'evidence/representative-traces.json.gz')['traces']
    new = read(STUDY/'evidence/targeted-traces.json.gz')['traces']
    require(not {t['trace_id'] for t in reused} & {t['trace_id'] for t in new}, 'New trace duplicates retained exact case')
    return {t['trace_id']:t for t in reused+new}


def guard_maps():
    proof = read(RACE/'evidence/bogus-proof.json.gz')
    return proof, {int(g['branch_rva'],16):g for g in proof['guards']}


def selected_path(inputs, cfg):
    """Walk actual raw CFG edges using eight checked puzzle predicates and proven guards.

    This is a static reduced path, NOT a newly observed trace. Concrete traces are
    checked against it separately. No synthetic edge is created.
    """
    blocks = {b['id']:b for b in cfg['blocks']}
    by_rva = {b['start_rva']:b['id'] for b in cfg['blocks']}
    rule_by_branch = {r['branch']:r for r in RULES}
    _, guards = guard_maps()
    current = by_rva[0x1183]
    stop = by_rva[0x1877]
    path, edges = [], []
    while current != stop:
        require(current not in path, 'Unexpected cycle in cargo subgraph')
        block = blocks[current]
        path.append(current)
        last = block['instructions'][-1]
        successors = block['successors']
        if block['branch_type'] == 'conditional_direct':
            if last['rva'] in guards:
                require(guards[last['rva']]['universally_taken'], 'Opaque guard not established')
                taken = True
            else:
                require(last['rva'] in rule_by_branch, 'Unclassified conditional in cargo region')
                rule = rule_by_branch[last['rva']]
                equal = inputs[rule['field']] == rule['constant']
                taken = equal if rule['operation'] == 'eq' else not equal
            successor = next(s for s in successors if s['kind'] == ('branch_taken' if taken else 'fallthrough'))
        else:
            require(len(successors) == 1, 'Unexpected cargo terminator')
            successor = successors[0]
        edge = next(e for e in cfg['edges'] if e['source'] == current and e['target'] == successor['target'] and e['kind'] == successor['kind'])
        edges.append(edge)
        current = successor['target']
    return {'blocks':path, 'edges':edges, 'exit_block':stop,
            'classification':'static_path_under_checked_predicates_and_guard_proof_not_an_execution_trace'}
