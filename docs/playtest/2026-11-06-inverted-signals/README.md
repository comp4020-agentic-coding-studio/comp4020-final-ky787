# Inverted wire labels — 2026-11-06

The shared `drawConnections()` presentation now draws existing `link.inverted`
annotations in bold 14-world-unit amber (`#ffd76a`) over a compact opaque dark
backing. Labels draw after the wires with `globalAlpha = 1`, independent of the
powered/unpowered wire opacity. A shared inverted trunk gets one annotation.
Labels sit left of the first segment, at most 180 units from its source; this
keeps CROSSFEED's long vertical feeds readable in the normal local camera and
clear of device captions, player names and retained assembly excerpts.

No wire endpoints, inversion flags, controllers, evidence or physical objects
changed. CROSSFEED TRANSFER's NOT baseline is y1276; ROUTE SELECT's is y526.
Their right text edge is eight units left of x2820/x1385 respectively.

Validation used `scripts/inverted-signals-browser-check.ts`, a focused wrapper
around the existing production two-browser harness. **These are explicitly
labelled body-placement fixtures, not a full physical chamber solve.** SYSTEM
ONLINE was activated using a real jump and E; TRANSFER MODE and ROUTE SELECT
were pressed twice with real E input. Both clients observed the accepted state.
One body held the existing ROUTE POWER plate normally. No controller inputs or
outputs were injected.

Checks actually run:

- Existing `tests/connections.test.ts`: 5 passed.
- `pnpm typecheck`: passed.
- `pnpm build`: passed (existing chunk-size advisory).
- `node scripts/inverted-signals-browser-check.ts`: 36 checks passed, including
  accepted relay/bridge and left/right reversal, full label opacity, normal-camera
  visibility, and clearance against all rendered text. ROUTE SELECT was also
  checked at 1024×768, with reduced motion and while paused. No browser errors.

The four 1600×900 normal-camera captures were visually inspected. They show two
on/off comparisons; the NOT backing remains separate from the controls and text.
The existing ACCESS region title still intersects TRANSFER's interaction row;
this predates the NOT change and was not repositioned in this focused pass.

| Control | Inverted output on | Inverted output off |
| --- | --- | --- |
| TRANSFER MODE | [Relay on](01-transfer-relay-on-fixture.png) | [Relay off](02-transfer-relay-off-fixture.png) |
| ROUTE SELECT | [Left on](03-route-left-on-fixture.png) | [Left off](04-route-left-off-fixture.png) |

[Check log](checks.txt). Detailed temporary observations are written to
`.workbench/reports/inverted-signals/observations.json` when the script runs.
No full campaign replay was needed for this presentation-only change.
