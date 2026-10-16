# Cooperative chamber drafts

These three authored/mock JSON documents are editable workbench drafts. The
accepted campaign, single-player tutorials and CONTROL SPINE evidence are unchanged.
Human two-player acceptance is required before campaign integration.

| Draft | Central discovery | Design and measured evidence |
|---|---|---|
| [HANDSHAKE](../../levels/drafts/handshake.json) | Recover one cube, substitute it for a plate operator, use partner-held support, then deliver it to the exit. | [HANDSHAKE](handshake.md) |
| [DEADLOCK](../../levels/drafts/deadlock.json) | Delivered weights become unavailable; two people power the last cargo lift, then releasing FEED enables the relay trip to close HATCH. | [DEADLOCK](deadlock.md) |
| [USE AFTER FREE](../../levels/drafts/use-after-free.json) | Alternate climber and operator roles as occupied pressure-platforms crumble; release each previous circuit before the next route works. | [USE AFTER FREE](use-after-free.md) |

## Import and play with a friend

1. Open <https://comp4020-final-ky787.fly.dev/workbench.html>.
2. Use **Import JSON** to select one of the files in `levels/drafts/` above.
3. Use Fit/overview and State Preview to inspect the machine. Save the browser
   draft; it is stored locally in IndexedDB. Export JSON preserves the portable
   source. Import each chamber separately; importing does not publish a campaign.
4. Use **TEST WITH FRIEND**, then share its invitation URL with the second player.
   Both clients use the same frozen draft hash on the existing multiplayer server.
   Reopen a session after editing; edits do not change an already running room.
5. Check both roles, missed grapples/catches, cube recovery, breakpoint reset and
   both physical exit arrivals. Record the draft hash with feedback.

The carried-clearance repair in this delivery is required for DEADLOCK's physical
personnel passage. Use the deployment containing this commit, or run the current
local repository with `pnpm dev`. No accounts or native binaries are required.

## Reproduce validation, rendering and full-room solves

Run from the repository root, after `pnpm install --frozen-lockfile`:

```sh
for chamber in handshake deadlock use-after-free; do
  pnpm level:validate "levels/drafts/$chamber.json" --json
  pnpm level:render "levels/drafts/$chamber.json" \
    --out ".workbench/reports/2026-10-16-chambers/$chamber/recheck-overview.png"
  pnpm level:playtest "levels/drafts/$chamber.json" \
    --scenario "levels/scenarios/$chamber.json" \
    --report ".workbench/reports/2026-10-16-chambers/$chamber/recheck"
done
```

The CLI uses the real renderer, physics and two isolated browser identities.
A configured Chromium-family browser is required; see [CLI setup and scope](../level-workbench.md).
Reports contain draft/engine identity, assertions, both trajectories and named
screenshots. The canonical scenarios start at authored spawns and cannot force
controller outputs or body positions. The failed-swing recovery scenario also completes the full room; collapse and
loose-cargo diagnostics declare their narrower scope. Isolated unit fixtures are
labelled separately.

After `pnpm build`, `node scripts/level-tools/chambers-browser-check.ts` exercises
all three imports, previews, local physics, exports, IndexedDB reload and
public-compatible custom-session starts. These integration checks do not replace
the full physical solves above. Large reports and captures remain ignored under
`.workbench/reports/2026-10-16-chambers/`; the design documents identify final runs
and distinguish failed iterations.

## Human acceptance priorities

- HANDSHAKE: first-use grappling and Space rope jumps, discoverability of the held
  cube boost, optional cube-on-LIFT allocation, role exchange and blind solve time.
- DEADLOCK: comfort of the measured catch window, long cargo travel, lower
  entry/checkpoint crowding, loose-cargo allocations and the legitimate grapple
  catch alternative. A mechanically valid solve does not establish its pacing.
- USE AFTER FREE: aiming near maximum hook range, handover clarity, crumble
  pressure, local camera reveals and whether failed swings are rewarding to retry.

No human playtest, difficulty rating or 5–15 minute completion estimate has been
validated. Automated passes prove the recorded routes and assertions in their
measured configurations, not absence of every shortcut or softlock.
