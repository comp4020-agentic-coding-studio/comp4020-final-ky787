# Three cooperative chamber drafts — 2026-10-16

## Scope and Git provenance

Starting commit: `f90fab59b0b35995ec36455402f8056d651d3a0f` on `main`.
Tested implementation ending commit: `9f2503167406951e3dc88c5848e0e5cf044d51bc`.
This handoff is saved in a separate documentation commit following that implementation.
The final response identifies the pushed delivery tip. No force push is used.

Unrelated pre-existing changes to `CLAUDE.md` and `levels/drafts/blank-room.json`
were preserved and excluded from these commits. Read-only research trees were not
modified. Official campaign order, tutorial room definitions, CROSSFEED VAULT,
RACE CONDITION and CONTROL SPINE evidence remain unchanged.

## Durable deliverables

The authoritative authored/mock drafts are:

- `levels/drafts/handshake.json`
- `levels/drafts/deadlock.json`
- `levels/drafts/use-after-free.json`

Matching full-room scenarios are in `levels/scenarios/`. Additional diagnostic
scenarios exercise loose cargo, actual operator collapse and failed-swing recovery.
Design contracts, alternative solutions, measured constraints, limitations and
exact reproduction commands live in `docs/chambers/{handshake,deadlock,use-after-free}.md`.
`docs/chambers/README.md` explains public import and human acceptance. This handoff
is a record of work, not authoritative controller or binary evidence.

All rooms use canonical JSON, declarative Boolean controllers and the existing
adapter, shared authority and renderer. No bespoke TypeScript room factories,
new accounts, binaries, assembly or fabricated retained evidence were added.

## Decisions and actual discoveries

HANDSHAKE uses a 600-unit protected crossing and a 190-unit maintenance ledge.
Measured jump heights separate ordinary/loose-cube jumping from partner-held
support. An independently reproduced solo remote-pull exploit was closed with
physical interaction-blocking alcove geometry and cube placement; thirteen bounded
launch attempts reject that extraction. The final route demonstrates cube
substitution, lift, reversible relay, held boost, payload and both arrivals.

DEADLOCK preserves FEED AND SAFE lift power, NOT SAFE firewall, and SAFE AND NOT
FEED personnel service. Two 38-unit passages admit a 34-unit bare player but reject
44-unit loose cargo and the 82-unit held assembly. Real diagnostics exposed missing
carried-payload collision and a subsequent false widened-feet ledge contact. The
small shared repair uses the normal avatar plus its actual overhead payload, checks
pickup clearance and retains ordinary feet/one-way landing behavior. The final
manual hatch catch was measured after a real relay trip, with 0.500 seconds until
cargo contact after closing. No timer, automatic catch or special cube permission
was introduced. A grapple catch remains a legitimate alternative after the same
cooperative final lift/relay handoff. Delivered cargo remains accessible; after exit
latch, one cube returns to SAFE so both players can reach the exit.

USE AFTER FREE uses nine real grapple anchors, three unstable ordinary plate
supports, 24-second operator fuses and 3.6-second anchor fuses. Shared physical
collapse releases occupancy and the partner's route without a second controller.
An independently reproduced B-only summit skip required a permanent baffle.
A separate A1-skip route still requires the A operator and every ownership handover;
it is retained as a legitimate optional-anchor alternative, with section-only evidence. Failed
upper swings required additional powered, unhookable static retry shelves, with
real catch/ordinary-return-jump/retry evidence. They retract with their current
route, avoiding a permanent staircase through prior sections. A/B/C reveals use
existing local occupant camera logic and do not seize the remote climber's camera.

The CLI gained safe named step screenshots. Browser cleanup now tolerates profile
shutdown races and still closes the local server. Existing public smoke checks
received two input/readiness repairs: a cube-drop approach ten units farther inside
the real plate tolerance, retaining every assertion; and a null-safe DOM poll while
navigating after restart. Initial failure reports are retained, not relabelled passes.

## Validation and report locations

The ignored report root is `.workbench/reports/2026-10-16-chambers/`.
Full records include hashes, engine revision, bounded assertions, 20 Hz trajectories
and both actors' screenshots. Reports made before committing identify the starting
revision plus `-dirty`; their JSON hashes identify the tested authored documents.
The ending implementation commit captures that tested working tree.

- All three canonical drafts validate as playable with zero diagnostics.
- HANDSHAKE: 59-step full solve and slot-swapped solve, both complete with zero
  deaths; `handshake/{final,swapped}/report.json`.
- DEADLOCK: 87-step full solve, both complete with zero deaths;
  `deadlock/route-11/report.json`. The 49-step authored-start loose-cargo diagnostic
  separately proves the first two intended HATCH deliveries, without claiming full
  completion; `deadlock/cargo-03/report.json`.
- USE AFTER FREE: 43-step normal and swapped full solves, zero deaths; 59-step
  deliberate B/C miss-and-retry full solve, zero deaths; 14-step real-collapse
  diagnostic. See `use-after-free/{final,final-swapped,recovery-proof,final-collapse}`.
- `verification-manifest.json` links all eight reports to exact canonical hashes.
- `pnpm check`: typecheck, 534 unit tests passed (two existing skips), and three
  HTTP/WebSocket specs passed against the running app. The first attempt's spec
  startup failure is retained; the final run uses an explicitly started server.
- `pnpm build` passed; only the existing bundle-size advisory remains.
- `pnpm check:campaign` passed again after the final carry repair, including
  existing CROSSFEED VAULT/RACE CONDITION traversal and persisted party/restart
  behavior; `campaign-final.log` and `campaign/`.
- `pnpm check:public-coop` passed all 48 checks, including both-player test/play,
  slot reconnect, checkpoint reset, replay, local library retention, server restart
  and no official progress changes; `public-coop.json`.
- `pnpm check:uplink` passed 32 states/32 traces; retained bundle SHA-256 remains
  `87dec9e470119a951eb1486e25d62226c72b34367e754b0a14b4e5a818c4c082`.
  `pnpm check:evidence` also passed.
- Final graphical integration passed 25 checks at all three final hashes, recorded
  in `integration/report.json`; it checks
  every saved preview state, exact export, IndexedDB reload, both valid spawns and
  public-compatible server-authorized frozen snapshots. Live deployment checking,
  if performed after push, is isolated under `integration-live/` and reported in
  the final response rather than conflated with local production evidence.

Representative screenshots:

- `handshake/overview.png`, `handshake/final/partner-held-boost-partner.png`,
  `handshake/final/completed-host.png`.
- `deadlock/overview.png`, `deadlock/route-11/stage-05-hatch-catch-operator.png`,
  `deadlock/route-11/stage-08-complete-operator.png`.
- `use-after-free/overview-final.png`, `use-after-free/powered-c-final.png`,
  and the final route/recovery folders named in its design document.
- `integration/` contains actual graphical editor, State Preview and production
  custom-session screenshots for each document.

Large temporary reports, screenshots and exploratory scripts were not committed.
The dated handoff is the only explicitly included file from the normally ignored
research workspace. Narrow unit tests clearly label local state/partner fixtures;
full-room browser scenarios use authored starts and real controls without forcing
outputs, transforms, cube placements or arrivals.

## Human acceptance and remaining limits

No human playtest has occurred during this work. Automated completion is not a
claim of enjoyable pacing, blind solve time, exhaustive shortcut freedom or
campaign acceptance.

1. Import each JSON into the public Level Builder and use TEST WITH FRIEND. Confirm
   the deployed version includes the carried-clearance repair before testing DEADLOCK.
2. HANDSHAKE: test first-time grapple/Space rope-jump comprehension, the held-boost
   hint, either role, dropped-cube recovery and cube-powered LIFT alternatives.
3. DEADLOCK: assess tall-shaft pacing, lower entry/breakpoint visual crowding,
   comfortable manual catch timing, role exchange, loose-cargo allocations and the
   permitted grapple catch. The full machine works, but could still feel slow.
4. USE AFTER FREE: assess camera/aiming, changing ownership, unstable-footing
   pressure, missed-swing retries and recovery when the operator also falls. Extreme
   misses or a lost operator can still require both players to restart from below.
5. Record draft hashes and concrete feedback before changing accepted geometry.

Stop here for human two-player acceptance. Do not promote these drafts, author
additional chambers or begin native/binary-backed controllers in this pass.
