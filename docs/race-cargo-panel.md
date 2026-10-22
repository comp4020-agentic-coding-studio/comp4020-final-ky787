# RACE cargo presentation contract

RACE CONDITION uses four small, fixed pieces of native assembly as **optional
environmental flavour**. Level structure and machinery communicate the puzzle;
a short authored string and a subdued output-store accent respond to accepted
state. Detailed evidence remains available on demand in the existing inspector.
This is presentation only: controller, server scheduling, protocol, physics and
room geometry are unchanged.

The 22 October 2026 environmental revision supersedes the original cargo
dashboard. Do not restore its viewport fitting, inverse-zoom scaling, operator
layouts, compact summary, address gutter, evidence bookkeeping or tutorial text.
The earlier dashboard screenshots and handoff are historical, not the current
visual contract.

## Evidence identity and compact asset

The authority is the frozen
[race-cargo-v1 study](../experiments/coop-controller-studies/race-cargo-v1/README.md)
and its original acquisition. Neither directory is a generator output directory
for this feature. The separate `race-cargo-presentation/v1` schema lives in
[`race-cargo-types.ts`](../src/coop/race-cargo-types.ts).

| Section | Output / existing target | Write 0 RVA | Write 1 RVA |
| --- | --- | --- | --- |
| UPPER SUPPORT | `topBridge` / `cargo-top` | `1279` | `120E` |
| BUFFER SUPPORT | `bufferBridge` / `cargo-buffer` | `14B6` | `144A` |
| SAFETY INTERLOCK | `safetyFirewall` / `safety-beam` | `167A` | `160E` |
| OVERLAP INTERLOCK | `raceFirewall` / `race-beam` | `1840` | `17D4` |

Image base is `0x140000000`. The PE SHA-256 is
`371d0217e00d8662430df701ab2f8b34d4192a9b574534b5b32099dddc6c491a`.

`public/evidence/coop/race-condition.cargo.json` is **25,595 uncompressed bytes**,
with an explicit 36,000-byte budget. It includes 26 separate static fragments,
four section/output/target associations, both real stores per section, exact
instruction VA/RVA/bytes/size/mnemonic/operands/block/order, fragment ranges and
repository-relative source hashes. It excludes compositions, traces, observations
and full disassembly. The original five world assets and their 75 KB combined
size guard remain unchanged.

[`scripts/native/race-cargo-evidence.ts`](../scripts/native/race-cargo-evidence.ts)
reads the frozen catalogue and panel plan. It checks source hashes, specimen,
acquired store/output offsets, current target associations, exact disassembly
fields, raw block order, fragment contiguity, PE section bytes and image base.
It reuses the existing world evidence helpers without relaxing the v1 validator.
The generated asset digest in `src/coop/race-cargo-integrity.ts` also pins browser
content: runtime loading checks the byte budget, SHA-256 and bounded schema.

```sh
pnpm gen:race-cargo          # writes only the separate asset and integrity pin
pnpm check:race-cargo        # exact deterministic comparison; no writes
```

The latter is included in `pnpm check:native`, hence `pnpm check`. The study's
own audit and `reference.mjs --check` remain independent checks. Do not run its
writers or change its inventory to accommodate integration.

## Accepted state and time

[`RaceCargoEvidence`](../src/coop/race-cargo-evidence.ts) copies inputs, raw outputs,
buffer phase/duration/remaining time and identity from **accepted `coop.room`**.
It does not read `world.inputs`, predicted frame signals or pending phase control.
One copied snapshot supplies store selections, authored strings and inspector details.

- Raw `true` selects the genuine write-one fragment; `false` selects write-zero.
  Missing or invalid values stay `UNKNOWN`; no formula fills them in.
- Conditions are static context, including potentially short-circuited checks.
  Store accents associate a native record with an accepted result. They never
  mark an executing instruction, branch, flag, register or PC.
- Phase is the native enum: 0 idle, 1 window, 2 released, 3 expired. A phase-only
  update is meaningful even when all four raw outputs stay identical.
- The display uses the existing `RaceAuthority.bufferDisplay` semantics:
  subtract elapsed time since `roomReceivedAt` from accepted `remainingMs`, clamp
  at zero, and use received `durationMs`. It never starts another deadline.
  The existing chute is the only visible countdown; the blocks have no timer.
  Its shared presentation helper still owns the display value. Zero cannot expire
  a phase, choose another store, release support or declare failure.
- Pause freezes the displayed countdown and labels it `HELD`; resuming catches
  up from the original receipt. Disconnect shows muted `OFFLINE` block strings,
  stops effects and freezes the display. Diagnostics and Evidence retain the
  explicit last-known distinction. Transport reconnection alone does not certify
  an old receipt as fresh. A new accepted snapshot restores current status without
  inventing a transition from zero.
- Party/room code or level-instance changes reset presentation bookkeeping.
  Initial loading, reconnect, pause and reduced motion establish a baseline.
  Identical snapshots, unrelated revisions and countdown ticks do not restart
  output pulses or message reveals.

Successful asset loads are cached, concurrent requests shared, and late responses
guarded by a generation counter. Failures are isolated from gameplay and retry
on re-entry/reconnect. A failure shows only muted `ASSEMBLY UNAVAILABLE` strings
at the fixed block positions. The four superseded listings stay suppressed,
including during loading/failure; no substitute instructions are invented.
Workbench/custom rooms never load this campaign evidence, even when based on RACE
geometry.

## Fixed environmental arrangement

[`race-cargo-render.ts`](../src/slice/race-cargo-render.ts) draws four separate
blocks behind machinery and characters in one authored row. Each is **328 × 124
world units**, at **y=960**, with **24 units** between blocks:

| Mechanism | World x | Displayed native context |
| --- | ---: | --- |
| Upper support | 800 | Genuine CMP, bare `...`, complete selected store excerpt (4 instructions) |
| Buffer support | 1152 | Complete selected store excerpt (3 instructions) |
| Safety beam | 1504 | Saved-Boolean reload/TEST/JNE, bare `...`, selected store instruction (4 instructions) |
| Overlap interlock | 1856 | Complete selected store excerpt (3 instructions) |

The group occupies `(800, 960, 1384, 124)`, below the span firewall at y=900 and
above the lower control wires at y=1120/1140. It clears the stairs to the left,
the floor at y=1240 and DROP B. There is no enclosing dashboard, global caption,
status row, timer, framing instructions or mechanism legend.

Code and strings use **12 world-unit monospace text**, quiet dark backing and a
thin muted edge. Only the actual selected output-store instruction receives a
restrained green/red accent and brief pulse. Supports are green when solid and
red when released; firewalls are red when active and green when clear. Other
instructions stay subdued. The authored string uses a quiet neutral colour.

World positions, dimensions, line slots, message baseline, font size and order
never depend on zoom, viewport, player or operator. The renderer does not accept
zoom/overview/operator layout arguments and applies no additional transform. The
existing world/camera transform scales everything naturally; view bounds only
cull individual fixed blocks. Text may become small, be partly clipped or leave
the screen. That is intentional. Never dock, clamp, rearrange or enlarge it to
chase a camera view. Selected zero/one alternatives and decoding have fixed space.

Instruction operands remain exact, including memory offsets and genuine branch
targets. Separate excerpts stay separate in diagnostics and the asset. A bare
`...` denotes a visual gap, not an asserted CFG edge. Addresses, bytes, raw blocks,
omission explanations and specimen provenance belong in Evidence/diagnostics,
not the normal game view. There is no execution cursor or branch animation.

The four superseded cargo listings remain suppressed. `spanMaster`, `phaseA`,
`phaseB`, `returnBridge` and `exitDoor` keep their original authored placements;
the dashboard's placement overrides have been removed. Platform address headers
retain their original static identities.

## Short authored state strings

[`race-cargo-presentation.ts`](../src/slice/race-cargo-presentation.ts) supplies
one short string per mechanism. Examples include `UPPER SUPPORT RELEASED`,
`BUFFER HOLDING`, `BUFFER RELEASED`, `WINDOW EXPIRED`, `SAFETY BEAM ACTIVE` and
`INTERLOCK CLEAR`. They describe current state without giving the solution
sequence or claiming cargo delivery. Expiry is distinct from release; idle with
B held still says BUFFER RELEASED, and letting go of B after transfer does not
claim a recatch.

Each block independently uses the existing CONTROL SPINE-style authored hex
reveal when its message changes. A phase-only transition can reveal BUFFER
HOLDING while the other three messages stay settled. Identical snapshots,
countdown ticks and unrelated revisions never restart it. The instruction text
never scrambles. Initial/missing state, a new room instance, reconnect, pause and
reduced motion establish settled baselines. Disconnected code is muted and its
string says OFFLINE; missing results stay UNKNOWN without selecting zero.

The fuller `cargoFeedback` explanation and its deterministic expiry/overlap
precedence remain in the inspector and read-only diagnostics. They are not drawn
in normal play. Do not reintroduce the global feedback title/detail as a fifth
panel or tutorial sentence.

## Evidence inspector and trace boundary

The existing paused Evidence inspector has four cargo sections plus optional
obfuscator-guard context. It opens on cargo for RACE and preserves the original
current/output/bogus navigation and representative sample labels. Each cargo
section leads with both genuine alternatives, the associated fragment, bytes,
VA/RVA, block, buffer offset, specimen and study, followed by complete static
condition context and source hashes.

The upper input-slot fragment at RVA `1183` remains separate from the read at
`1196`, with an explicit master-local omission. Gameplay checks spill a Boolean,
run intervening BCF code that clobbers AL and flags, then reload before TEST/JNE.
The later TEST supplies those branch flags. Optional guard global x/y comparisons
are clearly obfuscator code, not A/B/phase inputs. Authored unstable slabs are
not presented as proven bogus blocks.

No `EMULATED REPLAY` is implemented. The browser evidence adapter cannot validate
all eleven canonical native inputs, including explicit return grace. Neither
cargo triples nor four outputs establish an exact trace. The sixteen abstract
cases fix eight other inputs to zero; case 16 adds receiver arrival. Separate
accepted snapshots are separate native evaluations, not a continuous CPU trace
across cargo flight or timer waiting.

## Verification

`tests/race-cargo.test.ts` checks the 17 independent study vectors, all 25 ordered
scenario frames, eight store identities, tamper rejection, explicit omissions,
phase-only/unchanged/output transitions, independent strings, unknown state,
lifecycle resets, timers, reduced motion, caching, failure isolation and draft
exclusion. Canvas checks require fixed bounds across pans/zoom/viewport sizes,
per-block culling, quiet text and genuine native records; they do not require
all blocks to be readable or contained within every viewport. The existing
HANDSHAKE fixed-write-one tests are intact.

`pnpm check:world-assembly` retains its flat-list provenance/contiguity assertions
for existing panels and separately verifies grouped RACE fragments. Read-only
`snapshot().raceCargo` reports mode, availability, accepted values, phase/status,
timer, selected fragment/store IDs, separate displayed instructions, union bounds,
fixed per-block bounds/visibility, world font size, strings, colours and pulses;
it omits private party identity. Mode and provenance remain diagnostic data, not
gameplay labels.

`pnpm check:race-cargo-browser` uses real controls and two independent visitors.
It covers accepted contact, timely transfer, receiver arrival, expiry, a second
attempt, overlap, real nearby camera pans, overview zoom, ordinary A/B views,
a smaller desktop and reduced motion.
It does not assign controller/world state or override the camera. Its real input
results are separate from semantic fixture tests, which do not prove geometric
reachability or WebSocket authorization. Screenshots and the completion receipt
are in the [visual review](playtest/2026-10-22-race-cargo-environment/README.md).

Delivery follows AGENTS.md: proportionate checks, commit/push to main, then the
existing CI-gated Fly deployment for human visual/playtesting feedback. Puzzle
or validated-contract expansion still requires the separate acceptance step.
