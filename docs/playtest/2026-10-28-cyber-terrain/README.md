# Static cybernetic architecture — 2026-10-28

Baseline: fetched `main` at `701cd2f`. Only the static terrain artwork changes.
`drawStaticPlatform()` in `src/slice/terrain-render.ts` now draws dark navy
computational surfaces with etched right-angle branches, flat contact nodes,
small embedded chip modules and segmented buses. The industrial plates, bolts,
reinforcement ribs and heavy bevel are removed.

Four deterministic layouts vary circuit routing, chip position and size. Fixed
208×112 world cells alternate their row offset; upright structures rotate the
pattern into 112×208 cells. Thin ledges simplify to one trace row, narrow walls
to one vertical column, and tiny rectangles omit decoration. A crisp blue-grey
top edge and opaque substrate preserve the solid silhouette. There is no static
animation, glow, text, machine-code address or binary-evidence claim.

Clipping, viewport culling and bounded detail work remain in place. No bitmap
assets or rendering framework were introduced. [Rendering contract](../../terrain-art.md).

## Preservation

[Source hashes](preservation.json) verify 146 gameplay, geometry, server, audio,
evidence, other renderer and deployment files against the baseline. The main
renderer, code/crumble branches and orange firewalls are unchanged.

The approved `drawDeathZone()` and all four shared helpers remain byte-for-byte
unchanged. Six browser raster comparisons also confirm exact RGBA equality with
the approved renderer at 0, 0.7 and 5 seconds, with motion both on and off.

## Actual gameplay captures

All screenshots come from the production game, using ordinary player cameras
or the existing held Tab overview. No transforms or controller state were injected.
Both visitors were inspected at 1920×1080 and 1024×768 across all five chambers.

| Review | Screenshots |
| --- | --- |
| HANDSHAKE large floors | [1920](screenshots/handshake-player-1-1920.png), [1024](screenshots/handshake-player-1-1024.png) |
| RACE narrow walls and thin platforms | [1920](screenshots/race-condition-player-1-1920.png), [1024](screenshots/race-condition-player-1-1024.png) |
| DEADLOCK service structures | [1920](screenshots/deadlock-player-1-1920.png), [1024](screenshots/deadlock-player-1-1024.png) |
| USE AFTER FREE small ledges | [1920](screenshots/use-after-free-player-1-1920.png), [1024](screenshots/use-after-free-player-1-1024.png) |
| Static circuitry beside active cyan code | [1920](screenshots/race-powered-code-1920.png), [1024](screenshots/race-powered-code-1024.png) |
| Overview consistency | [HANDSHAKE 1024](screenshots/handshake-overview-1024.png) |
| Approved death field retained | [CROSSFEED, reduced motion](screenshots/crossfeed-reduced-motion-1024.png) |

[Screenshot index](screenshots.json) records exact source paths and hashes.
Full captures remain in `.workbench/reports/2026-10-28-cyber-terrain/`.

## Checks

- `pnpm typecheck` and `pnpm build`: passed; existing bundle-size advisory remains.
- `pnpm test:unit tests/terrain-render.test.ts tests/platform-grapple.test.ts`:
  12 passed, including stationary rendering, immutable bounds, invisible-box
  rejection, viewport-bounded work and static terrain remaining unhookable.
- `BN_TERRAIN_BASELINE=.workbench/reports/2026-10-28-cyber-terrain/approved-terrain.ts
  BN_SHOTS=.workbench/reports/2026-10-28-cyber-terrain/initial pnpm check:terrain`:
  [87 checks passed](checks/checks.txt), including the six exact death-field
  comparisons. [Raster results](checks/raster-checks.json) verify no overflow,
  world anchoring and deterministic still imagery at 0.5×, 1× and 2× zoom.
  The approved source was saved directly with `git show 701cd2f:src/slice/terrain-render.ts`.
- Existing `raceRoute()` with `reviewCampaignTerrain(h, 1)`: complete two-visitor
  real-input traversal, timed cargo transfer, all five hook blocks, COMMIT and
  both exit arrivals; [34 assertions passed](checks/race.txt). Powered-state
  captures use the normal grounded right-deck hold at both desktop sizes.

Runtime changes are confined to `src/slice/terrain-render.ts`. The only check
change adds the optional approved-source comparison to
`scripts/terrain-browser-check.ts`; existing assertions remain intact.
Unrelated local edits were preserved. Fine circuitry intentionally becomes less
prominent in overview; the solid contact edge stays readable.
