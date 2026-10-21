# 2026-10-22 — RACE cargo evidence handoff to Linux Codex

Temporary implementation handoff. Authoritative binary facts, limitations and
commands are in the new [study README](../../../experiments/coop-controller-studies/race-cargo-v1/README.md)
and [annotated panel walkthrough](../../../experiments/coop-controller-studies/race-cargo-v1/PANEL-WALKTHROUGH.md).

Branch: `codex/race-cargo-evidence`, based on
`0810cb8c4883c5a8bd979d49612108d39329d0f8`. Windows checkout:
`E:\Workspace\binary_binja_redesign\comp4020-final-ky787`.

## Established evidence

Eight cargo input predicates are mapped through real CMP/SETcc/spill/guard/
reload/TEST/JNE instructions to the four outputs. Both store alternatives retain
their genuine addresses:

| Output | Zero store RVA | One store RVA |
| --- | --- | --- |
| topBridge | `1279` | `120E` |
| bufferBridge | `14B6` | `144A` |
| safetyFirewall | `167A` | `160E` |
| raceFirewall | `1840` | `17D4` |

The field checks use A, B and the **four-valued** buffer phase. Intervening BCF
guards use globals x/y and clobber AL/flags; stack bytes preserve the puzzle
Booleans. The later TEST supplies the gameplay branch's flags. Do not label a
guard CMP as checking a player button.

`fragments.json` has 26 excerpts; `panel-plan.json` has four sections, real store
alternatives and 68 exact-case compositions with explicit gaps and actual edge
chains. `evidence/decision-mappings.json` ties all eight conditions to typed IR,
native bytes, input memory, branch observations and 31 local opaque guards.

Selected original traces reused: case IDs `0,3,4,6,8,12,15` (prefix `bcf_case_`).
New abstract traces: `1,2,5,7,9,10,11,13,14`; new receiver-arrival trace: `16`.
No original trace was rewritten or silently substituted for another full vector.
Both unchanged Windows PEs matched the independent current game oracle for all
13 outputs on 17 cases plus 25 ordered frames: **84 native evaluations passed**.
Unicorn instruction observations remain clearly distinct from Windows stdout.

The 4096 retained output cases support value independence from the other eight
inputs. The checked local CFG predicates/guard proof separately support local
branch selection, also matching all 42 retained/new traces. Neither licenses
claiming the same whole-function path for other backgrounds. Physical reachability
and action/epoch authorization were not tested.

## Proposed Linux implementation

Build one **CARGO TRANSFER CONTROLLER** panel with upper support, buffer support,
safety beam and overlap interlock sections. Each shows a real input-check excerpt,
an omission separator, its saved-Boolean branch and the real selected store.
Keep addresses and raw block IDs. Short-circuited checks stay static.

State-linked mode selects a store by the accepted raw output, labelled
`STATE-LINKED`. Enable `EMULATED REPLAY` only for an exact **11-field** match in
`cases.json`, using that trace's step/occurrence IDs. Output-only presentation
cannot supply those inputs. Missing matches remain `NO MATCHING TRACE`, without
a substitute representative. Separate game snapshots start separate evaluations.

The walkthrough covers contact/window, timely B, overlap, expiry, reset and a
second attempt. Preserve the awkward cases: B release does not recatch the
buffer; expiry is processed before an exactly-on-deadline B; reset while B stays
held does not restore lower support. Countdown and status strings are authored
server/presentation annotations, never native wait loops or PE strings.

## Verify and reproduce

From repository root, with Python 3.11+ and Node 24:

```sh
python3 -I -B experiments/coop-controller-studies/race-cargo-v1/scripts/verify-study.py
node experiments/coop-controller-studies/race-cargo-v1/scripts/reference.mjs --check
```

The stdlib audit checks retained bytes, control flow, observations, comparisons,
gaps and seven in-memory tamper cases. `--preservation` additionally checks all
903 files present before the study. The Node command replays current actual
reference functions without writing. Both passed on Windows; Linux OS execution
was unavailable. Original/current source hashes remain separate.

Exact Windows acquisition, curation and packaging commands are in the owning
README and `manifest.json`. They write only the new study directory and import
the old analyzer's trace component, not its artifact writer. No binary rebuild
is needed. The original acquisition, native tables, world-assembly files and all
other pre-study tracked files remain byte-identical.

This branch stops at evidence and handoff. Panel/transition/string implementation
belongs to Linux Codex; no merge to main, deployment or renderer changes were made.
