# Simplified jump and assisted grapple — 2026-11-06

The first Space press gives the existing maximum ordinary jump. A second,
held airborne press attempts the automatically highlighted anchor. A/D swings;
Space release performs the existing bounded rope jump. Holding S on release,
or exhausting that anchor's jump budget, detaches without another impulse.
Mouse aim/click/hold/release remains available, including optional Space/W/Up
jump-off from a mouse-owned rope. The touch JUMP / HOOK button follows the same
two-press hold/release sequence.

The implementation preserves original launch speed, maximum jump rise, range,
hookable surfaces, swing/release caps, crumble timing, level geometry, controller
contracts and native evidence. Ground/coyote jump ascent has a transient flag;
lifts and rope motion do not inherit a global gravity change. A focused equality
test compares release-jump and existing unheld press-jump player states.

## Measured ordinary jump heights

Measured with the shared `stepPlayer`, `FIXED_DT = 1/120`, identical unobstructed
launches, and the original 800-unit/s launch velocity:

| Input | Before | After |
| --- | ---: | ---: |
| Immediate tap | 90.8056 units | 127.4000 units |
| Hold through apex | 127.4000 units | 127.4000 units |

The only new ascent assistance applies to a real ground/coyote/buffered jump.
Ceilings, landing, an attached rope and a lift end that state. The existing
520-unit/s deliberate rope jump and once-per-distinct-anchor budget remain.

## Target and input behavior

Candidates use the existing ray probe, marked attachment point/header slab,
power flags and 58–500-unit range. Ranking favors forward/overhead transfers and
unused jump budgets, with hysteresis between nearby alternatives. It is a local
heuristic, not route planning. Cubes are excluded. Meaningful pointer movement
overrides assistance for 1.5 seconds; a mouse-held rope retains precision aiming.
Static-wall occlusion remains the inherited probe behavior.

The visible marker and keyboard attempt share `PuzzleWorld.selectedTarget`.
Keyboard rope ownership is transient. Release is processed separately from the
jump-press buffer and validates current attachment, airborne status, live power
and remaining budget. Failed/flying/retracting hooks, grounded players, lost input,
pause, respawn and reconnect cannot create a release impulse. Space edges are
queued in order so a fast release/second press between fixed steps is preserved.
S/Down is captured at release even if that key also goes up before the next step.
Touch controls capture their pointers and suppress browser pan/pinch gestures.

SWITCH teaches the four requested instructions and records learning only on
actual attachment. The attached release lesson remains visible through a long
first swing. Menus, accessible canvas instructions, footer, README and workbench
help use the new controls.

## Validation

- Typecheck and production build passed (existing chunk-size advisory).
- Final focused controls tests: 52 passed across five files.
- Integrated unit suite during development: 947 passed, two skipped across 93
  files. Four further input/equivalence checks were added and passed in the final
  focused run; CI runs the complete final suite.
- Existing solo browser regression: 122 checks passed. Includes complete
  PRESSURE, SWITCH, RELAY and CONTROL SPINE retrieval/return routes, automatic
  keyboard anchor chain, per-anchor jumps, and precise mouse collapse/recovery.
- SWITCH browser onboarding: 18 checks passed, including a mouse-free crossing,
  actual two-touch crossing, reduced motion, 1366/1024-width caption bounds,
  saved learning, paused keyup and resume safety.
- Targeted RACE CONDITION: 27 checks passed, including the five-anchor timed
  keyboard chain, shared crumble fuses, cargo and both arrivals.
- Targeted CROSSFEED VAULT: 27 checks passed, including both three-anchor keyboard
  cargo transfers, shared crumble warnings and S-release low detach.
- USE AFTER FREE recovery scenario: all 60 steps passed, including deliberate B/C
  misses, return jumps to refuges, retry, all transfers and both exit arrivals.
- Complete five-chamber campaign regression: 79 checks passed in one integrated
  run, including HANDSHAKE grapple/held-cube traversal, both arrivals in all five
  chambers, reconnect and crash recovery.
- Public custom co-op regression: 49 checks passed across both test/play routes, checkpoint resets,
  replay and official-progress isolation. Its final restart assertion now checks
  the current invitation error text and absent session; the previous assertion
  expected server wording superseded by the existing menu/invitation redesign.
- HTTP spec: three passed; process-evidence check and `git diff --check` passed.

USE AFTER FREE's C-route scenario now approaches 40 units farther right so the
first swing does not land back on B and cut its own power. The C1-to-C2 manual
rope jump is held for 100 ms before firing the next precise hook. This uses the
existing rope-jump height budget. Every original assertion and physical wait
condition is retained, including C2's y ≤ 1240 waypoint. The full recovery run
passes without changing any room geometry. Failed diagnostic trajectories remain
in the ignored report directory for comparison.

## Artifacts and limits

- [Mouse-free gameplay demonstration](switch-keyboard-demo.webm): actual game
  canvas recorded with the existing recording helper, with no world-state edits.
- [Automatic selection](switch-auto-selected.png) and [successful crossing](switch-crossed.png).
- [Checks](checks.txt).
- Full local reports: `.workbench/reports/2026-11-06-assisted-controls/`, grouped
  as `switch`, `solo`, `race`, `crossfeed`, `uaf-recovery` and `campaign`.

The automatic selector cannot infer a player's entire route. Direction changes,
recovery or unusual backwards transfers may still benefit from deliberate mouse
aim. USE AFTER FREE's C2/C3 transfers remain precise and the retained complete
scenario uses manual aiming there. No human acceptance or exhaustive absence of
shortcuts is claimed; these are the tested physical routes.

## Changed files

- Physics/selection: `src/engine/physics.ts`, `src/engine/constants.ts`,
  `src/engine/grapple-targeting.ts`, `src/slice/world.ts`.
- Input/lifecycle: `src/ui/input.ts`, `src/slice/game.ts`,
  `src/workbench/editor.ts`, `src/workbench/runner.ts`,
  `src/workbench/public-runner.ts`.
- Onboarding/control presentation: `src/slice/switch-onboarding.ts`,
  `src/slice/render.ts`, `src/menu/views.ts`, `index.html`, `styles.css`.
- Tests/routes: `tests/assisted-controls.test.ts`, `tests/menu-input.test.ts`,
  `tests/slice.test.ts`, `tests/switch-onboarding.test.ts`,
  `scripts/switch-onboarding-browser-check.ts`, `scripts/browser-check.ts`,
  `scripts/race-browser-check.ts`, `scripts/crossfeed-browser-check.ts`,
  `scripts/level-tools/public-coop-browser-check.ts`,
  `levels/scenarios/use-after-free.json`,
  `levels/scenarios/use-after-free-recovery.json`.
- Documentation: `README.md`, `docs/c8-vertical-slice.md`,
  `docs/main-menu-and-invitations.md`, `docs/level-workbench.md`,
  `docs/chambers/use-after-free.md`, and this evidence directory.
