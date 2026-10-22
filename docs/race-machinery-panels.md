# RACE machinery assembly presentation

All nine RACE decorations use the same restrained environmental style. The four
[cargo blocks](race-cargo-panel.md) retain their existing asset, excerpts, layout
and effects. The other five are independent, fixed world blocks near their
original machinery. Assembly is optional flavour; geometry communicates the
puzzle, and the paused Evidence inspector supplies detailed provenance.

## Presentation contract

`src/slice/race-machinery-render.ts` owns five 328 × 124 world-unit blocks, with
12px world monospace text, 16-unit instruction spacing, a quiet translucent
backing and one short authored string. All use the cargo palette and timings.
The camera supplies the ordinary transform; viewport bounds only cull. No
inverse scaling, docking, reflow, heading, address gutter, RAW/POWER footer or
grace/latch jargon belongs in these gameplay blocks. Distant text naturally
shrinks or leaves the view. The original static platform address bars remain
identities for their retained native regions, not selected result-store labels.

World origins are SPAN `(740,540)`, A `(900,390)`, B `(1420,400)`, RETURN
`(2520,760)`, EXIT `(3500,530)`. EXIT is 40 world units above its old diagnostic
origin so the string clears Cube B's resting/carry route. No machinery moved.

| Output | Visible native subset | Genuine write 0 / write 1 RVA |
| --- | --- | --- |
| spanMaster | master-local CMP; `...`; three-instruction output store | `198A` / `191E` |
| phaseA | saved-Boolean reload, TEST, JNE; `...`; output store | `1B4D` / `1AE1` |
| phaseB | phase CMP, SETNE; `...`; three-instruction output store | `1D10` / `1CA4` |
| returnBridge | occupancy CMP, SETNE, spill; `...`; output store | `1E5E` / `1DF2` |
| exitDoor | three-instruction output store | `1FAC` / `1F40` |

The short status strings describe accepted power/open state. Green means active,
armed or unlocked; muted red means inactive, idle or locked. Only the actual
selected output-store instruction receives the accent. Other instructions stay
subdued and never scramble. Status changes use CONTROL SPINE's authored hex
reveal for 0.4 seconds; result/power changes pulse for 0.45 seconds. The allotted
space never changes. Identical snapshots, unrelated revisions and timer ticks
do not restart either effect. Pausing, disconnecting or reduced motion stops
effects; initial loading and reconnecting establish a baseline without an
invented transition. Missing data is UNKNOWN; disconnected data is OFFLINE and
muted. The last-known genuine store may remain visible.

## Accepted semantics, not execution

`RaceMachineryEvidence` reads accepted `coop.room` snapshots, never predicted
world signals. `nativeWorldBindingState` supplies the existing binding semantics:

- Raw native outputs select real zero/one alternatives. Missing raw output
  selects no store.
- Phase A/B and RETURN strings/colour use the accepted physical projection,
  including server-owned grace. Thus an active green panel can legitimately
  contain a zero-store while grace keeps machinery powered. No client timer
  predicts grace ending. Phase B power does not override authored crumble
  breakage or imply that every manifestation is currently solid.
- EXIT uses `room.exitUnlocked`, the existing persistent latch, for open status.
- SPAN CONTROL uses its raw wire signal and has no invented physical binding.

The panel never infers flags, branch direction, registers, a PC or instruction
execution from these bits. Complete eleven-input trace matching remains out of
scope. Existing representative samples in Evidence keep their sample identity.
Room-code/level-instance changes reset transition bookkeeping. Reconnected
transport alone cannot make an old snapshot current: a new receipt is required.

## Compact evidence and verification

`public/evidence/coop/race-condition.machinery.json` is **16,753 bytes**, with a
separate **24,000-byte budget**. It contains 20 fragments (read, saved branch,
zero-store and one-store for each output), existing bindings, specimen identity
and six source-file hashes. It contains no traces or occurrence/register data.
The original five `coop-native-world/v1` assets and their 75 KB combined guard
remain unchanged; their single-block validator has not been relaxed.

The source is the frozen original acquisition under
`experiments/coop-controllers/race-condition/`, not a new study or executable.
The BCF PE is SHA-256
`371d0217e00d8662430df701ab2f8b34d4192a9b574534b5b32099dddc6c491a`,
image base `0x140000000`.

`scripts/native/race-machinery-evidence.ts` checks manifest hashes, exact PE
bytes, address/RVA/size, block order and within-fragment contiguity. All ten
stores were already observed in the acquisition's integration records; both
value, output-buffer offset and block/site identity must agree. The existing
world verifier checks the binding contract, and the span association is checked
against the existing `receiver-master` wire. Generation is deterministic;
`pnpm check:race-machinery` checks without writing and is included in
`pnpm check:native`. `pnpm gen:race-machinery` writes only the presentation asset
and its runtime SHA-256 pin. No frozen input is regenerated.

Static context selectors are audited against the acquired disassembly and
retained C ABI/source. `rbp-0x28` holds the input-pointer slot; `rbp-0x20` holds
the master-local slot. The phase reads use input offset `0x10`, RETURN `0x14`,
and EXIT `0x1c`. Booleans spill to `rbp-0x44/46/48/49/4a`; later blocks reload
the corresponding byte and TEST it before JNE. Intervening opaque guards
clobber AL/flags and are excluded from these gameplay snippets. The genuine
JNE destinations are retained, including destinations in intervening guard
blocks. No direct edge to the visually adjacent store is asserted.

Every fragment keeps its block, range and exact instructions. Even when only
one instruction is painted, it remains a subset of that named fragment.
Discontiguous pieces have a bare `...` in the world and explicit omissions in
Evidence. Layout, meanings, colours and decoded strings are authored UI, not
extracted binary strings. The full Evidence entries expose both alternatives,
VA/RVA, bytes, source files and limitations. The runtime loader verifies the
content digest, caches successful data, deduplicates requests and rejects stale
responses. Failure shows ASSEMBLY UNAVAILABLE without affecting gameplay or
the cargo asset. Custom/workbench and other chambers never load this asset.

## Review checks

`tests/race-machinery.test.ts` checks provenance/tampering, genuine alternatives,
accepted bindings, grace/latch differences, transitions, missing state, resets,
connection receipt freshness, reduced motion, asset failures, isolation and
Canvas content/bounds. These semantic fixtures do not claim physical reachability.

`pnpm check:race-machinery-browser` runs the existing two-visitor RACE route with
real inputs, including the grapple chain, return cube and two-player exit. It
adds safe capture points and a real lever toggle to observe grace. Camera-only
detail views are labelled separately from ordinary operator views; no state is
injected. `pnpm check:world-assembly` independently compares displayed fragments
with the acquisition and checks other chambers, custom rooms and CONTROL SPINE.
