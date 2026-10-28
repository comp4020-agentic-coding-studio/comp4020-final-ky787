# Fine contact signals, perimeter flow and CROSSFEED scanners — 2026-10-28

Baseline: `750c447` ([near-black architecture review](../2026-10-28-terrain-signal/README.md)).
Human feedback said the platform signals worked but were a little thick, and
asked for more, smaller, thinner ones. It also asked for sparser animated lines
on vertical sides and undersides, for the death zone to stay exactly as is, and
for CROSSFEED's buttons to use the new pad asset instead of the old orange bar.

- **Top contact edge.** Three interleaved world-anchored trains replace two
  thick ones. Pitches are 132/176/236 units, speeds 146/118/160 units/s, with
  22/16/12-unit heads and 40/30/24-unit fades. The middle train flows the other
  way. Each signal is a 1.25-unit hairline on the strip's top face, with a 4-unit
  white tip and a 2.5-unit inward glow. Previously it was a 4-unit core with a
  5-unit glow. The base strip is slightly dimmer (`#5560d8`) so the brighter
  hairlines stand out. Ledges under 240 units still carry one signal.
- **Sides and underside.** Every static box at least 40 units tall carries one
  sparse train (360-unit pitch, 104 units/s), down its right face and up its
  left. Boxes at least 24 tall carry two co-prime underside trains (520 and 740
  units, 102/112 units/s) flowing leftward, so the flow runs clockwise around the
  silhouette. Underside spacing never repeats evenly. Faint indigo tracks
  (`#222e66`) carry these streaks. Narrow walls keep their rails, now with the
  fine signals. Perimeter density is under half the top's per unit length;
  under a long floor the underside carries at most a third of the top's segments.
- **Death zone.** Unchanged. `drawDeathZone`, `hazardSignals`, `drawRail` and the
  bus code are byte-identical to `750c447`. Hazard raster metrics are identical.
- **CROSSFEED scanners.** The vault's LEFT/RIGHT biometric scanners (`plateB`,
  `plateC`) now use the animated `drawPressurePad` asset, which every other
  chamber's buttons already use. Before, they were the legacy flat orange bar.
  Idle shows the pad's amber tread; occupied shows the pressed blue tread and
  output pulse. Their body-height scanner rails stay, now dim grey when idle and
  cyan when occupied. Occupancy, authority and the two-player exit rule are
  unchanged. `entry`/`routePower` already used the asset. Payload sockets keep
  the PAYLOAD RECEIVER asset.

Runtime changes: `src/slice/terrain-render.ts`, `src/slice/machinery-presentation.ts`
(scanners added to the presentational pad list) and `src/slice/render.ts` (rails
moved beside the pad). [Preservation hashes](preservation.json) verify 150 other
files byte-identical to `750c447`, including CROSSFEED geometry and authority,
world physics, collision, grapple and `plate-render.ts`. [Rendering contract](../../terrain-art.md).

## Review

| View | Capture |
| --- | --- |
| Top-edge strip, three clip frames 0.25 s apart: v1 above, v2 below | [comparison](comparison/edge-strip-v1-vs-v2.png) |
| CROSSFEED scanners occupied, before/after | [comparison](comparison/scanners-occupied-before-after.png), [full](screenshots/crossfeed-scanners-occupied.png) |
| CROSSFEED scanners idle, before/after | [comparison](comparison/scanners-idle-before-after.png), [full](screenshots/crossfeed-scanners-idle.png) |
| CROSSFEED walls, undersides and death zone | [flow frame](screenshots/crossfeed-flow-frame-0.png), [clip](crossfeed-flow.webm) |
| CROSSFEED lift off/on | [off](screenshots/crossfeed-lift-off-1920.png), [on](screenshots/crossfeed-lift-on-1920.png) |
| HANDSHAKE | [1920](screenshots/handshake-player-1-1920.png), [1024](screenshots/handshake-player-1-1024.png), [overview](screenshots/handshake-overview-1024.png) |
| RACE ledges, chute walls, floor underside | [1920](screenshots/race-condition-player-1-1920.png), [1024](screenshots/race-condition-player-1-1024.png) |
| DEADLOCK, USE AFTER FREE | [DEADLOCK](screenshots/deadlock-player-1-1024.png), [UAF](screenshots/use-after-free-player-1-1024.png) |
| SWITCH death zone (unchanged) | [1920](screenshots/switch-unpowered-1920.png) |
| Reduced motion, paused | [reduced](screenshots/crossfeed-reduced-motion-1920.png), [paused](screenshots/crossfeed-paused-1920.png) |

Visual review: the top edge now reads as many fine, fast streaks rather than a
few thick bars. Side and underside streaks are clearly sparser and quieter.
Static architecture remains distinct from cyan code and the blue lift. These are
automated captures and do not replace human playtest acceptance.

## Validation

- `pnpm typecheck`: passed.
- `pnpm test:unit tests/terrain-render.test.ts tests/platform-grapple.test.ts
  tests/machinery-presentation.test.ts`: [30 passed](checks/unit.txt). Updated
  contracts:
  - at least one top segment per 110 visible units;
  - 10–24-unit heads with cores of 1.5 units or less;
  - over 35% edge coverage;
  - clockwise perimeter flow, with every streak inside its own face;
  - perimeter density under half the top's, and the floor underside at most a
    third of the top;
  - CROSSFEED's pad list now has both scanners at their original 49-unit label
    offset, with payload sockets still receivers.
- `pnpm test:unit`: [92 files, 919 passed, 2 skipped](checks/unit-full.txt).
- `pnpm build`: [passed](checks/build.txt), with the existing bundle-size advisory.
- `BN_TERRAIN_BASELINE=<5ba794f terrain source> pnpm check:terrain`:
  [103 passed](checks/terrain-checks.txt).
  - The floor contact band changes in 60.6% of columns per 0.25 s, against
    2.5% for `5ba794f` and about 62.5% for v1.
  - The hazard band is identical to v1.
  - In actual CROSSFEED gameplay, 60–71% of the floor edge changes per quarter
    second, split across 10–13 separate moving segments (v1: 4–10).
  - Pause and reduced motion are still, and keep both edges fully lit.
- `BN_TERRAIN_REVIEW=1 BN_CROSSFEED_FORWARD_ONLY=1 pnpm check:crossfeed`:
  [35 passed](checks/crossfeed.txt). This is the full real-input two-visitor
  route: both players on opposite scanners, exit stays latched after they leave,
  one arrival does not complete, and the chamber completes.
- `BN_TERRAIN_REVIEW=1 pnpm check:browser`: [122 passed](checks/solo-browser.txt),
  covering the four solo rooms, which use the same pad renderer.
