# RACE cargo panel implementation — 22 October 2026

Implemented on `feat/race-cargo-panel` in the isolated worktree
`/tmp/bn-race-cargo-panel`. The fetched base is
`bc396cdd0c04190a035b01ccbb21611a7f1938d7`
(`origin/codex/race-cargo-evidence`), retaining the complete Windows study commit
above main `0810cb8c4883c5a8bd979d49612108d39329d0f8`. The original Linux checkout
remains on main; its unrelated local work and instruction files were not edited.
The implementation is one focused feature commit after that base. Merge,
deployment and expansion to other chambers are outside this change.

This handoff records implementation and validation. The durable contract is
[`docs/race-cargo-panel.md`](../../../docs/race-cargo-panel.md); binary authority
remains the frozen study and acquisition, not this note.

## Player-visible result

One **CARGO TRANSFER CONTROLLER · STATE-LINKED** surface replaces the four cargo
write-one listings when the new asset is ready. Its four fixed sections compare
UPPER SUPPORT, BUFFER SUPPORT, SAFETY INTERLOCK and OVERLAP INTERLOCK. Ordinary
views show genuine input CMP, saved-Boolean reload/TEST/JNE and the genuine
accepted zero/one store, with explicit omissions between excerpts. The authentic
JNE destinations remain unchanged. A/B annotations, phase and server-derived
countdown accompany authored explanations.

Accepted contact changes the explanation to BUFFER HOLDING even when all output
bits stay unchanged. A timely B acceptance after A release shows TRANSFER CLEAR;
overlap shows INTERLOCK ACTIVE; accepted expiry shows BUFFER WINDOW EXPIRED.
Expiry takes priority over overlap. Output meaning stays independent in each
section: supports are SOLID/RELEASED, firewalls ACTIVE/CLEAR. A store accent is a
result association, never a claimed executing instruction. Releasing B after
release does not recatch the buffer; idle with B held does not claim readiness.

The ordinary A/B views use a row of four sections with 11 CSS pixel native code
around 0.78 camera zoom. The nearby view uses two columns. Small desktop and
overview views use a deliberate compact summary with complete Evidence details.
Panel placement adapts to existing framing; no camera or geometry changes were
made. Draw order remains behind machinery and characters. The five other RACE
panels remain, with authored placement adjustments to avoid the cargo surface.
Cargo platform headers retain their original address and say STATIC.

The existing paused Evidence inspector offers all four sections and an optional
opaque-guard view. It shows both genuine alternatives, all static condition
fragments, exact VA/RVA/bytes/blocks, specimen identity, source hashes and explicit
omissions. UI messages/layout are authored annotations. Representative traces
retain their sample status; no exact live trace or EMULATED REPLAY is claimed.

## Implementation and provenance

- `src/coop/race-cargo-types.ts`, `race-cargo-evidence.ts` and the generated
  `race-cargo-integrity.ts`: local schema, strict loader and accepted-room view.
- `scripts/native/race-cargo-evidence.ts`: deterministic generator and non-writing
  checker, using frozen catalogue/plan plus acquisition and exact PE-byte checks.
- `public/evidence/coop/race-condition.cargo.json`: **25,595 bytes**, below the
  explicit 36,000-byte budget. It contains 26 separate fragments and source
  identities, with no trace packages, compositions or full disassembly.
- `src/slice/race-cargo-presentation.ts` and `race-cargo-render.ts`: feedback,
  lifecycle, timer display, layout, native excerpts and read-only diagnostics.
- `src/coop/race-cargo-inspector.ts`, narrow additions to `native-inspector.ts`,
  `src/slice/game.ts`, `render.ts` and `native-world-render.ts`: existing UI/render
  integration. The original five world assets and v1 validator are unchanged.
- `tests/race-cargo.test.ts`, `scripts/race-cargo-browser-check.ts` and the grouped
  RACE extension to `scripts/native-world-browser-check.ts`: semantic, provenance
  and actual browser verification.

All eight real store records are retained: top `1279/120E`, buffer `14B6/144A`,
safety `167A/160E`, overlap `1840/17D4` (zero/one RVAs). The PE hash is
`371d0217e00d8662430df701ab2f8b34d4192a9b574534b5b32099dddc6c491a`, image base
`0x140000000`. Generation checks catalogue equality, source hashes, correct
output/target/offset associations, exact acquisition fields, block order,
within-fragment contiguity and PE bytes. Browser loading checks a generated
SHA-256 pin, schema and size budget; failures cannot affect gameplay.

Selection copies raw Boolean outputs from one accepted `coop.room` snapshot.
Inputs and phase annotations come from that same snapshot, never predicted world
signals. Missing/invalid values remain UNKNOWN. No formulas override accepted
outputs. Receipt-based countdown uses accepted `remainingMs` and `durationMs`;
panel and chute share the displayed value. Displayed zero never changes phase.
Pause/disconnect freeze the display; disconnect labels LAST KNOWN and stops
effects. Reconnection requires a fresh receipt. Initial load, room/instance
changes and reconnection establish baselines without fabricated transitions.
Identical snapshots, revisions and countdown ticks do not restart effects.

The upper pointer fragment at RVA `1183` and read at `1196` remain separate in
Evidence. The Boolean spill, intervening BCF clobber of AL/flags, later reload
and TEST supplying branch flags are explained explicitly. Optional guard globals
are not gameplay inputs. No unstable platform is called a proven bogus block.
The full eleven-input frame, including explicit return grace, is not inferred.

## Verification completed

The frozen study audit and reference check passed before edits. The initial audit
also passed `--preservation` across all 903 pre-study files. After implementation,
the non-writing audit and `reference.mjs --check` passed again; preservation was
not imposed on legitimate frontend integration. No frozen report was rewritten.

Final successful checks:

| Check | Result |
| --- | --- |
| `pnpm check` | Typecheck/native evidence and assets; 77 unit files, 769 passed / 3 skipped; 2 HTTP spec files, 3 passed |
| Focused cargo tests after layout refinement | 35 passed; typecheck passed |
| `pnpm build` | Passed; Vite reports its chunk-size advisory |
| `pnpm check:race-cargo` | Exact deterministic asset/integrity-pin comparison passed, 25,595 / 36,000 bytes |
| Study `verify-study.py` | Passed: 26 fragments, 17 cases, 42 retained traces, 4,096 native rows and tamper checks |
| Study `reference.mjs --check` | Passed: 17 cases, 4 scenarios / 25 ordered frames |
| `pnpm check:race-cargo-browser` | 31 assertions passed across timely transfer, expiry/retry and overlap with two real visitors |
| `pnpm check:world-assembly` | 168 assertions passed; separate grouped provenance/contiguity plus all original flat-panel checks |
| `pnpm check:native-evidence` | Existing HANDSHAKE inspector check passed; cargo inspector separately covered in cargo browser flow |
| `pnpm check:campaign` | 78 assertions passed; five chambers, real RACE grapple route and two-player completion, reconnect and restart recovery |
| `pnpm check:evidence` | Passed |
| `git diff --check` | Passed |

All 17 study vectors independently select the expected stores. The 25 scenario
frames cover phase-only contact, release, deadline ordering, late B, receiver
arrival, reset while B remains held and a second attempt. Tamper tests reject
changed bytes/address/block/specimen/associations and malformed fragments. Tests
also cover unknown state, stale loads, disconnect/reconnect, room instances,
unchanged updates, timer zero, pause, reduced motion and draft exclusion.
Semantic fixtures are not described as physical playthroughs. The separate live
browser flow uses ordinary keyboard controls, real server acceptance and distinct
visitor identities, with no controller/world assignment or camera override.

During iteration, the world verifier initially assumed a flat RACE listing and
later used a camera frame that correctly selected compact mode. Its grouped
representation and assembly-review frame were corrected; original provenance
assertions remain. Transient clear/expiry screenshot capture was synchronized to
the rendered accepted snapshot. These were resolved harness issues, not changes
to physics or weakened gameplay assertions. There is no remaining scripted
movement or verification failure.

## Visual review and next decision

The committed [screenshot index](../../../docs/playtest/2026-10-22-race-cargo/README.md)
records every operator, accepted state, viewport and zoom. It includes initial
nearby, active window at DROP A, released/clear at DROP B, receiver arrival,
overlap from A and B, expired at A, a 1024 × 768 desktop, reduced motion and a
1600 × 1000 Evidence view showing both buffer alternatives. Images were personally
inspected for actual Canvas text, clipping and machinery visibility. Structured
diagnostics and completion logs accompany them. Additional campaign and world
review artifacts are retained in `/tmp/bn-cargo-campaign` and
`/tmp/bn-cargo-world-accepted` on this machine.

Remaining human acceptance questions: comfort of 11-pixel code on the intended
displays, the nearby/operator/compact transitions, and how clearly feedback
teaches the timing on a first two-person attempt. Automated traversal and agent
image inspection do not replace that playtest. Stop here before merge/deployment
or puzzle/contract expansion.

Confirmed unchanged relative to the evidence base: the frozen study and original
acquisition, native tables/binaries, gameplay controllers, server timing/state,
protocol, cube authority, movement/physics, geometry, camera behaviour, CONTROL
SPINE contract, character profiles, observability and Level Builder. Original
HANDSHAKE fixed-write-one tests and the five existing runtime world assets remain
intact. The original checkout's local edits and instruction files are preserved.
