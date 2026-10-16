# Main cooperative campaign integration — 2026-10-16

## Scope and provenance

The user explicitly requested adding the three delivered chambers to the main
campaign, superseding the earlier draft-only stop condition. This is authorization
to integrate, not evidence that human playtesting has occurred.

Starting commit: `8bd7014a41bc3620c6d41dcdea0f84ed2aea9cb2`.
Tested implementation ending commit: `8ab45f6e9760453ea99b0e2fcf07cd144c06efa6`.
This handoff and two small screenshots are saved in a following documentation
commit; the final response identifies the pushed tip and deployment result.

Unrelated changes to `CLAUDE.md` and `levels/drafts/blank-room.json` are preserved
and excluded. No read-only research artifacts, original tutorial definitions,
CROSSFEED VAULT/RACE CONDITION geometry, global movement constants or CONTROL SPINE
binary evidence changed. No new binary work was undertaken.

## Integration decisions

The campaign is HANDSHAKE → CROSSFEED VAULT → RACE CONDITION → DEADLOCK → USE AFTER
FREE. New parties begin in HANDSHAKE; existing parties retain their chamber,
members, code and completed badges. The host can choose chambers; NEXT follows
the sequence. CAMPAIGN COMPLETE requires all five badges.

Canonical released snapshots live in `levels/campaign/` and exactly match the
three tested drafts. The editable drafts remain independent. Shared declarative
controller and authority modules serve both custom sessions and the named
campaign rooms. Geometry still comes from the JSON adapter, with no duplicate
TypeScript layout implementation. See `docs/adr/0010-json-coop-campaign.md` for
the durable contract, persistence details and reproduction commands.

The existing version-6 persistence model stores semantic progress, checkpoints,
cube placements and exit arrivals. It does not persist occupancy or transient
physics. Document allowlists, sender/generation/epoch checks and ownership remain
enforced. The Docker image now includes the released JSON imported by the server.

Presentation removes internal lab annotations from the released chambers while
retaining socket glyphs and actual powered-state labels. A vertical camera rail
with upward viewing space keeps the tall chambers and rising grapple catches
usable. Control reveals and manual overview retain priority.

Independent review exposed a real pause defect: paused JSON operators retained
their last pressure contacts. `occupy(null)` now releases JSON contacts before
the legacy contact-cache guard. Unit and actual two-client browser checks prove
that pausing A removes route power, resuming resamples contact, and the original
unstable fuse keeps counting down.

## Verification

Ignored reports: `.workbench/reports/2026-10-16-campaign-integration/`.

- `pnpm check`: typecheck, 57 unit files / 546 tests passed, two existing skips;
  three HTTP/WebSocket specs passed. `final-check.log`.
- `pnpm build`: passed, including retained UPLINK validation. The existing
  bundle-size advisory remains. `final-build.log`.
- Each `levels/campaign/*.json` validates as playable with zero diagnostics.
  The canonical draft/release SHA-256 values are unchanged:
  HANDSHAKE `15538dd03c12048dc7203cc76262ce67b4ca462a916d290791c4a286b82a0797`;
  DEADLOCK `b72226f19b90fbeb2ea8a8b35915af8de9afe7c3001ea491bdac53cc662d1b29`;
  USE AFTER FREE `53d81f2cf3953a6997de93dae9947aacfaf0c4119132c0beff524b92d3851cac`.
- `BN_SHOTS=.workbench/reports/2026-10-16-campaign-integration/acceptance pnpm check:campaign`:
  all 76 checks passed. The same party completed all five chambers via actual
  two-player input, then retained badges and chamber state across reconnect and
  SIGKILL restart. `acceptance.log`, `acceptance/checks.txt`.
- The new campaign rooms passed all 59 HANDSHAKE, 87 DEADLOCK and 43 USE AFTER FREE
  scenario steps from authored starts, with zero deaths and both accepted physical
  exit arrivals. `acceptance/{handshake,deadlock,use-after-free}-report.json` stores
  hashes, observations, cameras and step results. No output/body/arrival forcing.
- Grapple replay explicitly verifies the target is inside the actual player
  canvas before clicking. Campaign victory freezes physics at the second exit
  overlap; accepted victory supersedes subsequent movement/landing waits, while
  every authored scenario assertion remains strict.
- `pnpm check:public-coop`: all 48 custom-session checks passed, covering real
  completion, IndexedDB/export independence, replay, reconnect, restart expiry
  and absence of campaign progress mutation. `public-coop.log` and
  `public-coop-checks.json`.
- `pnpm check:evidence` passed. New authority/persistence tests also cover legacy
  version-6 parties continuing from RACE into DEADLOCK and resumed cube/checkpoint
  positions without stored live physics.

Earlier failed runs are retained. A RACE launch miss passed on rerun without a
geometry change. Full-room completion first exposed the victory-freeze runner
wait; it did not justify weakening gameplay assertions. Camera visibility checks
then caught a high C3 target outside the viewport; increasing upward viewing space
fixed it. `pause-before-fix/` reproduced the stale pause contact before its repair.
`uaf-camera/` separately passed all 43 steps after these corrections, before the
final uninterrupted five-chamber acceptance run.

Two compact screenshots are committed under `docs/playtest/2026-10-16-campaign/`:
`selector.png` and `complete.png`. All detailed interaction screenshots remain
ignored under `acceptance/`, including HANDSHAKE's held boost, DEADLOCK's final
hatch catch and USE AFTER FREE's three handovers. They were inspected in the
actual renderer. Large logs, trajectories and temporary scripts are not committed.

After deployment, the separate ignored `live-smoke.ts` checks live selection of
all five rooms, both valid spawns, independent identities, persistent party/slots
and reconnect. Its `live/report.json` is narrower than the local full physical
solve and must not be described as a second live completion tour. The final
response reports its actual result rather than assuming success here.

## Human acceptance

Refresh both browsers after deployment, open the public game, choose CO-OP
CAMPAIGN, create/join a party and use CHOOSE CHAMBER. An existing party keeps its
progress; it does not automatically restart at HANDSHAKE.

Human two-player playtesting remains outstanding. Assess held-boost discovery and
introductory grappling, DEADLOCK cargo pacing and catch comfort, USE AFTER FREE
aiming and retry clarity, swapped roles, and reconnect during partial progress on
two separate computers. Automated completion does not establish blind solve time,
accessibility, enjoyable pacing or exhaustive shortcut freedom. The chamber design
documents retain their known alternatives and physical limits. Stop here without
adding further chambers or binary-backed controllers.
