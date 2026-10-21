# RACE cargo-controller study — 2026-10-22

This study establishes eight input-comparison/branch mappings and both real
output-store alternatives for RACE CONDITION's four cargo signals. It proposes
one grouped **CARGO TRANSFER CONTROLLER** display. No gameplay, frontend, binary,
original acquisition evidence, native table or public world-assembly file changed.

Start with [PANEL-WALKTHROUGH.md](PANEL-WALKTHROUGH.md) for the Linux implementation
handoff. The proposal is not an implemented renderer or a new gameplay decision.

## Identity and authority

Analyzed checkout: `0810cb8c4883c5a8bd979d49612108d39329d0f8` (`origin/main` when
this study started). Dedicated branch: `codex/race-cargo-evidence`.

| Retained PE under `../../coop-controllers/race-condition/bin/` | SHA-256 |
| --- | --- |
| `obfuscated_x64.exe` | `371d0217e00d8662430df701ab2f8b34d4192a9b574534b5b32099dddc6c491a` |
| `clean_x64.exe` | `2eb161048cac1f2734838ed3a87e601e6e990e311a6c316eacf88696928b8487` |

Image base is `0x140000000`; `bn_evaluate` occupies RVA `[0x1000,0x2B01)`.
All ranges in JSON are end-exclusive. Instruction RVAs/VAs are numeric; their
bytes, raw block IDs and compiler labels retain the original acquisition identity.

The [original contract](../../coop-controllers/race-condition/contract.json), C
source, linked PE, compiler IR/assembly labels and retained proof remain the binary
authority. Historical reference commit
`1315c3616ce5ac939baf913f9b09b4ebad34132a` and its source hashes are preserved.
Current integrated server source hashes are recorded **separately** in
`evidence/current-reference.json` and `manifest.json`. A changed current source
must not be accommodated by editing the old contract's hashes.

## Established mappings

`A = dropA`, `B = dropB`, `P = bufferPhase`. `P` is a uint32 enum:
`0 idle`, `1 window`, `2 released`, `3 expired`. All eleven ABI fields are supplied
on every evaluation; the controller is stateless.

| Section / output | Established value | Genuine store of 0 (RVA) | Genuine store of 1 (RVA) |
| --- | --- | --- | --- |
| upper-support / `topBridge` | `!A` | `0x1279` | `0x120E` |
| buffer-support / `bufferBridge` | `!B && (P == 0 || P == 1)` | `0x14B6` | `0x144A` |
| safety-interlock / `safetyFirewall` | `!B || P == 3` | `0x167A` | `0x160E` |
| overlap-interlock / `raceFirewall` | `A && B` | `0x1840` | `0x17D4` |

These are coordinate-free raw signals, not proof of cube motion or physical
reachability. Each alternative has its own real address; never replace an
instruction's displayed immediate to fabricate the other alternative.

Each check compiles as input `CMP`, `SETNE`/`SETE`, byte spill, BCF guard,
byte reload, `TEST AL,1`, then `JNE`. The ordinary branch consumes the **reloaded
puzzle Boolean**. The guard clobbers AL/flags between CMP and branch. Its global
`x`/`y` arithmetic is not a DROP A/B/phase comparison.

| Condition ID | Input predicate | CMP RVA | Spill | JNE RVA | Taken target / fallthrough RVA |
| --- | --- | --- | --- | --- | --- |
| upper-a | A != 0 | `1199` | RBP-3C | `11D5` | `1244` / `11D7` |
| buffer-b | B != 0 | `12E4` | RBP-3D | `1321` | `1481` / `1327` |
| buffer-idle | P == 0 | `135E` | RBP-3E | `139B` | `1415` / `139D` |
| buffer-window | P == 1 | `13D4` | RBP-3F | `1411` | `1415` / `1413` |
| safety-b | B != 0 | `1522` | RBP-40 | `155F` | `1563` / `1561` |
| safety-expired | P == 3 | `1598` | RBP-41 | `15D5` | `15D9` / `15D7` |
| overlap-a | A != 0 | `16E6` | RBP-42 | `1722` | `1729` / `1724` |
| overlap-b | B != 0 | `175E` | RBP-43 | `179B` | `179F` / `179D` |

Addresses in this table are hexadecimal. Targets are immediate machine successors,
not direct links to the eventual output store. Short-circuiting skips later checks:
for example, B=1 selects buffer=0 without executing either phase check.

`evidence/decision-mappings.json` ties each field's typed IR GEP/load/icmp/branch
to PE bytes, native CFG successors and concrete input-memory observations. It
records 31 opaque guards reached within cargo-local RVA `[0x1183,0x1877)`.
The original [guard proof](../../coop-controllers/shared/PROOF.md) establishes their
always-taken normal paths; unobserved clone code alone would not establish that.
The verifier rechecks all 108 retained RACE guard records as proof support,
without investigating other chambers.

Pointer context matters: entry RCX is the input buffer, RDX the output buffer.
The prologue retains pointer slots via `[RBP-0x28]` and `[RBP-0x38]` respectively.
Upper's `RVA 1183` loads the input slot before intervening master-local work;
`1196` dereferences it. The other input excerpts include both pointer loads.
Output excerpts include their two original pointer loads. A panel gap does not
reset registers or join addresses into a new basic block.

## Coverage and limits

- The 16 abstract `(A,B,P)` cases fix `payloadDelivered`, `traceOccupied`, `phase`,
  `returnOccupied`, `finalControl`, `exitUnlocked`, `phaseGraceActive` and
  `returnGraceActive` to zero. IDs are `4*(A + 2*B) + P`.
- Exact original trace IDs reused: `bcf_case_0`, `3`, `4`, `6`, `8`, `12`, `15`
  (each numeric suffix uses the same `bcf_case_` prefix).
- Nine missing abstract traces: cases `1,2,5,7,9,10,11,13,14`. One additional
  trace, case `16`, covers receiver arrival (`payloadDelivered=1`, all other
  inputs zero). Only these ten new traces are stored here.
- The retained fresh comparison batch ran both unchanged Windows PEs for all
  17 vectors plus 25 ordered scenario snapshots: **84 evaluations**, all matching
  the independent current TypeScript reference on **all 13 outputs**.
- Instruction traces are **Unicorn executions of exact PE instructions**,
  including the linked stack-probe helper. Native Windows stdout is separate
  terminal-output evidence. There are no hardware debugger traces here.
  Trace input/output addresses belong to the emulated harness; instruction VAs
  use the retained image base. They are not measured live Windows/ASLR addresses.
- The original 4096 clean/BCF/reference output rows cover all 256 backgrounds
  for each cargo triple. They establish four-output independence on the defined
  abstract domain. They do not establish instruction-path independence.
- Separately, the eight checked field predicates and proven guards account for
  every conditional reached in the local subgraph. Static paths follow actual
  raw CFG edges; all 32 original plus ten new traces agree with those local paths.
  This supports local selection under normal ABI entry, valid distinct buffers,
  preserved stack slots and intact code. It does not prove the entire function's
  path/register values for every other input: master, phase, return and exit
  logic use other inputs. Only 42 full traces were checked, not 4096 full traces.
- Abstract combinations need not survive server normalization or be physically
  reachable. Scenario fixtures exercise actual reducers/projections after
  explicitly accepted semantic actions; they do not test geometry, WebSocket
  authorization, cube ownership or epoch acceptance.

No cargo mapping remains unresolved within that scope. Missing full-input replay
matches and physical reachability remain unknown, rather than filled in by a
representative trace. The exact-deadline failure, lack of buffer recatch, and
reset while B remains held are preserved in the scenarios.

## Files and consumer rules

| File | Purpose |
| --- | --- |
| `manifest.json` | Specimen/reused-file identities, tools, inventory, reproduction commands |
| `cases.json` | 17 complete input vectors, full outputs, exact retained/new trace references |
| `fragments.json` | 26 contiguous authentic excerpts, stable IDs, inputs, stores and support |
| `panel-plan.json` | Four sections, safe selection modes, 68 exact-case compositions and explicit omissions |
| `evidence/decision-mappings.json` | Eight conditions, IR citations, guard/CFG mappings and dependency checks |
| `evidence/fragment-observations.json.gz` | 300 excerpt observations with actual steps, register states, flags and writes |
| `evidence/targeted-traces.json.gz` | Only ten newly acquired full Unicorn traces |
| `evidence/native-comparisons.json` | Fresh native input streams/stdout and full-frame comparisons |
| `evidence/current-reference.json` | Independent current-server oracle and distinct historical/current identities |
| `evidence/scenario-sequences.json` | Four ordered scenarios, 25 state transitions/evaluations |
| `evidence/preservation-baseline.json` | SHA-256 of 903 tracked files before the study |
| `verification-report.json` | Recomputed audit receipt; excluded from the manifest to avoid a hash cycle |

Trace references in `cases.json` are repository-relative. Fragment observations,
step indices and raw occurrence IDs are scoped to one exact trace. Consumers
must validate the complete input vector, not just a numeric case label.

**State-linked:** an accepted raw output chooses its real 0/1 store, labelled
`STATE-LINKED`. Conditions remain static; result association is not an execution
claim. **Replay:** an exact 11-field match selects the retained step/occurrence
sequence, labelled `EMULATED REPLAY`. Missing or unmatched inputs disable replay.
Separate accepted snapshots always start separate native evaluations. See the
walkthrough for an implementable layout and scenario annotations.

## Reproduce and verify

From repository root, on Linux or Windows with Python 3.11+ (stdlib only):

```sh
python3 -I -B experiments/coop-controller-studies/race-cargo-v1/scripts/verify-study.py
node experiments/coop-controller-studies/race-cargo-v1/scripts/reference.mjs --check
```

The second command uses Node 24 native TypeScript support to rerun the actual
current server functions without writing files. The first audits retained
evidence; it does not execute PEs or reproduce Windows observations. Both require
the pinned source/evidence checkout. `--preservation` additionally verifies all
903 pre-study files, appropriate on this branch before subsequent integration.

Exact Windows producer commands used, in PowerShell at
`E:\Workspace\binary_binja_redesign\comp4020-final-ky787`:

```powershell
node experiments/coop-controller-studies/race-cargo-v1/scripts/reference.mjs
& 'C:\Users\royga\anaconda3\python.exe' -B experiments/coop-controller-studies/race-cargo-v1/scripts/trace-cargo.py
& 'C:\Users\royga\anaconda3\python.exe' -B experiments/coop-controller-studies/race-cargo-v1/scripts/curate.py
& 'C:\Users\royga\anaconda3\python.exe' -B experiments/coop-controller-studies/race-cargo-v1/scripts/package.py
& 'C:\Users\royga\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -I -B experiments/coop-controller-studies/race-cargo-v1/scripts/verify-study.py --preservation
```

Production used Python 3.13.9, pefile 2024.8.26, Capstone 5.0.7, Unicorn 2.1.4 and
Node v24.19.0. No compiler is needed. Native PE launch requires a Windows host
permitted to run these retained executables; the restricted sandbox rejected
launch, so the native comparison ran through approved host execution. The
isolated audit used bundled Python with `-I -B` and no analysis dependencies.
A Linux OS execution was not available on this host.

Producers write only this new directory. Do not invoke the original analyzer's
writer/main against the frozen acquisition; `trace-cargo.py` imports its tracing
component only. Do not blindly run the old package-wide source-hash audit against
today's changed server sources or rewrite historical hashes to make it pass.

The study audit checks exact bytes/ranges/block order, encoded stores and branches,
trace register/flag/memory chronology, preserved predicate spills, original guard
proofs, full output comparisons, local dependencies, scenario boundaries and
composite gaps. Seven in-memory tamper probes must be rejected: altered bytes,
wrong specimen, wrong block, false 0/1 store label, branch destination, invented
gap edge and missing phase case. It performs no browser/gameplay campaign.
