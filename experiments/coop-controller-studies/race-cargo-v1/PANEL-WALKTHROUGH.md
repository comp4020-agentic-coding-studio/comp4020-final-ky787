# Linux handoff: CARGO TRANSFER CONTROLLER

Implement one grouped panel with four sections using this study's authentic
fragments. This is a presentation proposal; the established binary mappings,
scope and reproduction commands live in [README.md](README.md). Keep geometry,
physics and the native controller unchanged.

## Proposed layout

```text
CARGO TRANSFER CONTROLLER          RACE / BCF / 371d0217e00d…
Accepted input summary: A · B · buffer phase       [STATE-LINKED]

UPPER SUPPORT       input check … saved-Boolean branch … actual output store
BUFFER SUPPORT      B check … idle/window checks … branch … actual output store
SAFETY BEAM         B check … expired check … branch … actual output store
OVERLAP INTERLOCK   A check … B check … branch … actual output store

Server buffer phase / remaining time              [SERVER STATE]
```

Every excerpt keeps its RVA/VA, source raw block ID and instruction order.
Use small omission separators, not arrows joining excerpt addresses. Offer
collapsed guard context and alternate stores; do not turn all underlying code
into a single decorative block. Compiler and raw block IDs are evidence identity,
not a generator for the room's physical layout.

Use `panel-plan.json.sections` for output association and alternatives. Each
`condition_fragments` pair names an input read and the later branch. `fragments.json`
provides the exact records; `evidence/decision-mappings.json` supplies condition
meaning, actual successors, IR citations and spill/branch observations.

## Four sections

| Section | Read/decision excerpts to explain | Result store alternatives (RVA) |
| --- | --- | --- |
| upper-support | `upper-a.read`, `upper-a.branch`; optionally preceding `input-slot` | 0: `1279`; 1: `120E` |
| buffer-support | `buffer-b`, then `buffer-idle`, then `buffer-window` as reached | 0: `14B6`; 1: `144A` |
| safety-interlock | `safety-b`, then `safety-expired` as reached | 0: `167A`; 1: `160E` |
| overlap-interlock | `overlap-a`, then `overlap-b` as reached | 0: `1840`; 1: `17D4` |

Use full IDs from the catalogue, e.g. `buffer-support.buffer-b.read` and
`buffer-support.write-0`. A short-circuited check can remain visible as static
context, but it must not receive an executed highlight for that case.

For example, exact case 10 has A=0, B=1, P=2, other eight inputs zero. Buffer
selection is explained by these three separate excerpts:

```asm
; bb_000012DD, input-check excerpt; RVAs shown
12DD  mov rax, qword ptr [rbp - 0x28]
12E1  mov rax, qword ptr [rax]
12E4  cmp dword ptr [rax + 4], 0       ; dropB = 1
12E8  setne al
12EB  mov byte ptr [rbp - 0x3d], al    ; preserve the Boolean

; ... omitted 13 guard instructions, 12EE..1315 ...
; actual guard JNE at 1315 reaches bb_0000131C

; bb_0000131C, puzzle-branch excerpt
131C  mov al, byte ptr [rbp - 0x3d]    ; reload 1 after guard clobbers
131F  test al, 1                      ; ZF = 0
1321  jne 0x140001481                 ; taken, NOT a direct jump to 14AF

; ... omitted guard block bb_00001481 ...
; its JNE at 14A8 reaches bb_000014AF

; bb_000014AF, real zero-store excerpt
14AF  mov rax, qword ptr [rbp - 0x38]
14B3  mov rax, qword ptr [rax]
14B6  mov dword ptr [rax + 4], 0       ; actual bufferBridge = 0 commit
```

The catalogue contains the exact bytes omitted from this readable illustration.
Case 10's composition includes step indices, both real CFG edges through the
second gap, and guard IDs. Its phase checks are **not executed**: B already
determines buffer=0. The one-store alternative is at `144A`, in a different block.

The upper-support input pointer is loaded separately at `1183`; intervening
master-local instructions preserve RAX before dereference at `1196`. Keep that
pointer-context gap explicit. All eight comparisons spill their Boolean before
BCF guard arithmetic overwrites AL/flags; the later `TEST`, not the original
input `CMP`, supplies the flags used by the displayed gameplay `JNE`.

## Selection and replay

1. Read accepted controller outputs and label the panel `STATE-LINKED`. Select
   each section's verified `write-0` or `write-1` by its raw output value. A store
   accent means “associated with this result”; it does not imply execution now.
   With missing/untrusted output data, leave both alternatives static or show
   `UNKNOWN`. Do not alter bytes or derive output from a desired visual state.
2. Enable `EMULATED REPLAY` only when an authoritative, completely encoded
   11-field input vector exactly matches `cases.json`. The existing output-only
   world presentation cannot establish that vector. Grace flags, latches and
   the four-valued phase must not be guessed from the four displayed outputs.
3. Load that case's trace from its repository-relative path and use its
   `raw_occurrences`/`steps`, or the matching excerpt observations. Only those
   observed steps may animate. The 17 cases have 68 precomputed compositions;
   omitted instruction indices and raw edge chains live with each composition.
4. Display comparison input values, reconstructed relevant registers, CMP/TEST
   flags, actual branch direction/destination and output write address/value
   from those observations. Instruction ticks represent replay position, not
   wall-clock CPU timing. State changes start another separate evaluation.
5. On no exact match, retain state-linked/static mode with `NO MATCHING TRACE`.
   Four-output independence does not license replaying the whole function from
   a different input background. The static local path analysis is separately
   classified; it must not masquerade as an additional observed trace.

## Important scenario changes

Each row below means accepted server snapshot → **separate** native evaluation.
`T/B/S/R` are the four raw output values, not sampled cube position. Complete
contexts, intervening timer/action/sync states and all eleven inputs are in
`evidence/scenario-sequences.json`. Times are logical fixture milliseconds;
same-time steps show reducer order, not a physically simulated fall.

| Timely-transfer fixture | ms | A/B/P | Case | T/B/S/R | Panel explanation |
| --- | --- | --- | --- | --- | --- |
| Initial | 1000 | 0/0/idle | 0 | 1/1/1/0 | Upper/lower support on; safety on |
| A pressed | 1000 | 1/0/idle | 4 | 0/1/1/0 | Upper uses its real zero store |
| Accepted buffer contact | 1000 | 1/0/window | 5 | 0/1/1/0 | Same outputs, different buffer condition path |
| A released | 1000 | 0/0/window | 1 | 1/1/1/0 | Upper restores; window remains server-owned |
| B at deadline minus one | 3799 | 0/1/released | 10 | 1/0/0/0 | `syncRace` releases buffer; B short-circuits its checks |
| B released | 3799 | 0/0/released | 2 | 1/0/1/0 | Buffer does not recatch; safety returns |
| Receiver arrival | 3799 | 0/0/idle | 16 | 1/1/1/0 | Receiver occupancy rearms buffer; payload input is now 1 |

The phase transition idle→window is a useful assembly distinction even though
the outputs remain the same: idle-check true becomes idle-check false followed
by window-check true. The countdown is server state, never a native wait loop.

The other three fixtures preserve these important transitions:

| Fixture / event | ms | Case | T/B/S/R | Meaning |
| --- | --- | --- | --- | --- |
| Overlap: both controls held | 1100 | 14 | 0/0/0/1 | B releases buffer while A keeps overlap beam active |
| Overlap: A released | 1200 | 10 | 1/0/0/0 | A clears overlap; B remains held |
| Expiry: deadline exactly reached | 3800 | 3 | 1/0/1/0 | `advanceRace` changes window to expired |
| Expiry: B pressed after that advance | 3800 | 11 | 1/0/1/0 | Late B cannot remove the safety beam |
| Expiry: accepted reset, B still held | 3801 | 8 | 1/0/0/0 | Phase idle alone does not restore the lower support |
| Expiry: B released after reset | 3801 | 0 | 1/1/1/0 | Lower support returns |
| Second attempt: accepted contact | 3901 | 5 | 0/1/1/0 | New server deadline 6701; fixture supplies new cube epoch |
| Second attempt: A released | 3902 | 1 | 1/1/1/0 | Ready for timely B |
| Second attempt: B in time | 6700 | 10 | 1/0/0/0 | New attempt releases successfully |

The retained expiry fixture also checks 3799 and 3801. The new recovery fixture
continues its actual reset/release state, then includes A pressed at 3900.
The server advances timers **before** applying a button/contact action. Do not
draw an animation that lets B at 3800 retroactively win the 3800 deadline.

Contacts/placements in these fixtures are post-authorization inputs. Accepted
contact assigns `contactEpoch` from the fixture cube epoch (1 initially, 2 on the
second attempt); it is not an increment performed by the native controller.
The fixtures do not validate cube transport, epoch authorization or motion.

## Authored status suggestions

These are proposed UI strings, **not strings extracted from the PE**:

- `UPPER SUPPORT RELEASED`: accepted topBridge=0; do not claim the cube moved.
- `BUFFER HOLDING`: accepted bufferPhase=window and bufferBridge=1.
- `TRANSFER CLEAR`: accepted released phase, A=0, B=1, and lower/safety/overlap outputs all 0; do not claim delivery.
- `INTERLOCK ACTIVE`: accepted raceFirewall=1.
- `BUFFER WINDOW EXPIRED`: accepted phase=expired, rather than inferring it from bufferBridge=0.

Use phase for the authored timing label, output for a result-linked store, and
an exact full frame for trace replay. Linux owns the panel, transitions and string
effects; this evidence study stops at that handoff.
