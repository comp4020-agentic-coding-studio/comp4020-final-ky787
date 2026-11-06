# Targeted co-op spacing — 2026-11-06

Base: `eb30226`. Uses the [existing audit](../2026-10-28-chamber-spacing/README.md);
HANDSHAKE and solo rooms are unchanged. Coordinates are world units, +y down.
No controller, physical tuning, native evidence, save or party contracts change.

## CROSSFEED VAULT

| Object | Before | After |
| --- | --- | --- |
| P1/P2 spawn, entry and initial checkpoint x | 1660 / 1760 | 1890 / 1990 |
| Central floor width (x=200, y=1500) | 1800 | 2060 |
| Plate A x | 1870 | 2130 |
| Entry anchor / return bridge x | 2220 / 2000 | 2480 / 2260 |
| Access balcony x / width | 2420 / 1900 | 2680 / 1640 |
| TRANSFER MODE / cube A home x | 2560 / 2760 | 2820 / 3020 |
| SYSTEM ONLINE caption offset | (+112, -42) | (+112, -80) |
| TRANSFER MODE reveal x / width | 1950 / 2220 | 2210 / 1960 |
| ACCESS region x | 2510 | 2770 |
| Active anchor / bridge assembly panel x | 2580 / 2050 | 2840 / 2310 |
| Legacy anchor / bridge assembly placement x | 2240 / 2050 | 2500 / 2310 |

The lower crossing translates 260 units with its wires, ACCESS region label,
assembly-text placements and transfer camera bounds. Its gap stays 420 units;
all upper jump, grapple, boost and cargo routes retain their geometry. The lift
and receiver remain fixed. Adjacent footprint gaps now exceed 30 units.
The route's cube-hop still launches from x=1900 on the return journey.

## Capture method

The existing `scripts/spacing-browser-review.ts` accepts `BN_SPACING_ROOM`,
`BN_SPACING_WALK`, `BN_SPACING_WIDTH` and `BN_SPACING_TARGET_VIEWS` to limit captures
to one room and named views. Null uses the ordinary follow camera; fixed views
use the existing renderer camera override without changing gameplay state.
`BN_SHOT_FILTER` limits existing route screenshots without changing assertions.
Raw checks and route reports: `.workbench/reports/2026-11-06-spacing/`.
Visual review by the coding agent is not human playtest acceptance.

## RACE CONDITION

PHASE stays at (655, 720). Only its caption baseline changes, y=630 → 590.
The nearby hint remains on its original row. The real-input route captures
`full-phase-hint.png` after the temporary camera reveal expires.

## DEADLOCK

| Object | Before | After |
| --- | --- | --- |
| P1 spawn/entry/checkpoint x | 350 | 850 |
| P2 spawn/entry/checkpoint x | 1730 | 1870 |
| Lower floor and room width | 1800 | 1980 |
| Cargo assembly panel y (active / legacy placement) | 2830 / 2840 | 2550 / 2550 |

Both entry markers remain at y=2983. FEED, SAFE, cube homes, cargo lift,
relay, hatch and upper geometry retain their exact coordinates and expressions.
The initial route approaches A at x=560 and hops to x=340 before entering
service; no final-catch steps, deadlines or assertions change.
The draft and released campaign JSON are kept identical.

## USE AFTER FREE

ASSIST moves (1440, 950) → (1350, 950); the first assist-wire point follows
at y=938. It stands on the existing permanent baffle top. No floor, lift,
exit, anchor, camera reveal or timing changes. Its pad edge now has 53 units
of clearance from the gateway flare. Both normal and recovery scenario
hold targets move to x=1350; arrival targets and assertions are unchanged.

## Retained visual checks

| Area | Before | After |
| --- | --- | --- |
| CROSSFEED entry, ordinary follow camera | [Before](screenshots/crossfeed-start-before.png) | [After](screenshots/crossfeed-start-after.png) |
| CROSSFEED control captions, same camera | [Before](screenshots/crossfeed-controls-before.png) | [After](screenshots/crossfeed-controls-after.png) |
| RACE PHASE, ordinary follow camera after real interaction | Existing audit | [Caption and hint](screenshots/race-phase-after.png) |
| DEADLOCK lower section, same camera | [Before](screenshots/deadlock-lower-before.png) | [After](screenshots/deadlock-lower-after.png), [ordinary follow](screenshots/deadlock-follow-after.png) |
| USE AFTER FREE summit, same camera | [Before](screenshots/uaf-summit-before.png) | [After](screenshots/uaf-summit-after.png), [1024-wide view](screenshots/uaf-small-after.png) |

The local before captures precede each room's geometry change. Only the named
areas were inspected. Existing broader audit findings (including CROSSFEED's
low-clearance vault scanners and DEADLOCK's overview badge/header density) are
outside these local spacing changes; no room-wide cleanup is claimed.

## Validation

- CROSSFEED: four focused files, 38 tests pass; full forward two-browser route
  passes with zero deaths, all cargo transfers, mid-jump SYSTEM ONLINE press,
  both three-hook routes and independent arrivals. The first run exposed a stale
  cube-hop launch point; the corrected route walks to the original launch point.
- RACE: 13 focused tests and the full forward two-browser route pass, including
  timed cargo, all phase handovers, recovery and two arrivals. No geometry change.
- DEADLOCK: 24 focused physics/campaign tests pass; 71-step full-room two-browser
  scenario passes, zero deaths on both actors, including the final hatch catch,
  payload-powered service and both arrivals.
- USE AFTER FREE: 9 focused route/shortcut tests pass; 43-step full-room
  two-browser scenario passes with zero deaths and both arrivals.
- Integrated focused suite: 92 tests in 10 files pass. TypeScript, production
  build (existing chunk-size advisory only) and all native evidence checks pass.
- Complete campaign regression run **once**: 79 PASS / 0 FAIL. One party
  completes all five rooms; both visitors retain badges across restart. Host
  disconnect, playing restart, and unstable-operator pause/resume checks pass.
- [Validation summary](validation.json) retains scenario hashes and SHA-256s
  for 30 unchanged evidence/HANDSHAKE artifacts. Raw real-input reports remain
  under `.workbench/reports/2026-11-06-spacing/`.

No human playtest acceptance is claimed. The old editable CROSSFEED import remains
an independent historical draft; the released factory is authoritative. DEADLOCK
and USE AFTER FREE drafts and campaign snapshots are byte-identical. Controller
schemas and input/output contracts are unchanged; only authored coordinates and
presentation placements change.

## CI camera-fixture correction — 2026-11-06

[Run 42139068990](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/actions/runs/42139068990)
built the application successfully but failed the unit suite. The CROSSFEED
fixture in `tests/camera-reveals.test.ts` still placed the player at x=1870,
while the entry plate now lives at x=2130. The camera correctly stayed in follow
mode at the old position. The earlier focused selection omitted this test file.
Deployment was skipped by the normal CI gate.

The fixture now reads the authored entry plate position, matching the existing
plate-based fixture pattern. All camera assertions remain unchanged; no game,
geometry, controller or pipeline code changes. The failure reproduced locally
before the fix (1 failed / 12 passed). Afterwards all 13 camera tests passed.
Full `pnpm check` then passed: TypeScript, native verification, 92 unit-test files
(920 passed / 2 skipped locally), and all three HTTP specs against a temporary
local app. `pnpm check:evidence` also passed. GitHub's runner may skip additional
local-artifact-dependent tests; the remote run remains the deployment gate.
