# Near-black architecture and obvious signal flow — 2026-10-28

Baseline: fetched `main` at `5ba794f`, whose terrain motion human playtesting
found too subtle: grey, cluttered chip interiors and edge packets that were not
noticeable during ordinary play. This pass makes a deliberately strong change,
for human review; intensity can be reduced afterwards.

- **Static platforms.** The chips, pins, bus contacts and dense circuit cells
  are gone. The body is a `#080f16`→`#04080e` near-black mass with only about
  one faint etched run per 416×232 world cell (none on ledges or narrow walls).
  The shape is defined by a crisp 2.5-unit violet-periwinkle contact strip
  (`#6873f0`, hairline `#a3aaff`) and a soft inner glow. Two interleaved,
  world-anchored signal trains travel along long surfaces at 148 and 108
  units/s, with 40- and 24-unit blue-white heads and 78/52-unit trailing fades.
  Ledges under 240 units carry a single 124 units/s signal; tall narrow walls
  have rails on both faces, descending left and climbing right at 122 units/s.
- **Death fields.** The approved crimson/magenta palette, dim perimeter,
  interrupted bends and side ticks stay. The lethal top edge is now a broken
  hot rail with 48-unit heads plus 92-unit fades running at 228 units/s.
  Short bend pulses travel at 196–240 units/s. Below the edge, long stepped buses
  with right-angle risers and breaks carry trailing signals at 172–248 units/s,
  including backflow lanes. Signals stop more than 110 units below the edge.
- **Hierarchy.** Near-black quiet body; vivid periwinkle surface flow; muted
  grey inactive machinery; existing cyan powered code and sky-blue powered lift;
  red/magenta corruption. No assembly, addresses or provenance on scenery.

Runtime change is limited to `src/slice/terrain-render.ts`. The main renderer,
collision, physics, grapple eligibility, geometry and evidence are unchanged:
[preservation hashes](preservation.json) verify 151 files byte-identical to
`5ba794f`. [Rendering contract](../../terrain-art.md).

## Before and after

Same real-input route, same chambers and camera to within one world unit.
Previous captures are in the [prior review](../2026-10-28-terrain-flow/README.md).

| View | Previous `5ba794f` | This pass |
| --- | --- | --- |
| HANDSHAKE floor | [1920](../2026-10-28-terrain-flow/screenshots/handshake-player-1-1920.png) | [1920](screenshots/handshake-player-1-1920.png), [1024](screenshots/handshake-player-1-1024.png) |
| CROSSFEED lift off | [1920](../2026-10-28-terrain-flow/screenshots/crossfeed-lift-off-1920.png) | [1920](screenshots/crossfeed-lift-off-1920.png), [1024](screenshots/crossfeed-lift-off-1024.png) |
| CROSSFEED lift on | [1920](../2026-10-28-terrain-flow/screenshots/crossfeed-lift-on-1920.png) | [1920](screenshots/crossfeed-lift-on-1920.png), [1024](screenshots/crossfeed-lift-on-1024.png) |
| RACE ledges, chute walls, powered code | [1920](../2026-10-28-terrain-flow/screenshots/race-condition-player-1-1920.png) | [1920](screenshots/race-condition-player-1-1920.png), [1024](screenshots/race-condition-player-1-1024.png) |
| SWITCH death field | — | [1920](screenshots/switch-unpowered-1920.png), [1024](screenshots/switch-unpowered-1024.png) |
| Clip (4 s, real canvas) | [HANDSHAKE](comparison/handshake-previous.webm), [CROSSFEED](comparison/crossfeed-previous.webm) | [HANDSHAKE](comparison/handshake-new.webm), [CROSSFEED](comparison/crossfeed-new.webm) |

[Contact-edge strip](comparison/crossfeed-edge-strip-previous-vs-new.png): three
CROSSFEED clip frames 0.25 s apart, previous above, new below. The new segments
visibly advance 30–40 screen pixels per frame.

Measured perceptual motion with identical cameras: the share of screen columns
along the widest visible floor's top contact band whose RGB changes by over 90
in each quarter second (eight pairs, [new](comparison/motion-new.json) and
[previous](comparison/motion-previous.json)):

| Band | Previous | New |
| --- | --- | --- |
| HANDSHAKE floor edge, 1270 units | 2.4% | 52.4% |
| CROSSFEED floor edge, 1088 units | 1.3% | 49.1% |
| CROSSFEED exposed lethal edge, 410 units | 5.2% | 81.7% |

Other captures: [DEADLOCK](screenshots/deadlock-player-1-1024.png),
[USE AFTER FREE ledges](screenshots/use-after-free-player-1-1024.png),
[HANDSHAKE overview](screenshots/handshake-overview-1024.png), CROSSFEED
[flow frames](screenshots/crossfeed-flow-frame-0.png) ([1](screenshots/crossfeed-flow-frame-1.png),
[2](screenshots/crossfeed-flow-frame-2.png)) and [clip](crossfeed-flow.webm),
[reduced motion 1920](screenshots/crossfeed-reduced-motion-1920.png) /
[1024](screenshots/crossfeed-reduced-motion-1024.png), and [paused](screenshots/crossfeed-paused-1920.png).

Visual review notes: static architecture and powered cyan code slabs remain
clearly distinct, as does the sky-blue powered lift. Inactive `GRAVITY LIFT /
SIGNAL OFF` lettering and grey machinery read well against the darker body.
Zoomed out, silhouettes remain defined by their lit edges. The death field is
recognisable from its active top edge even when floors conceal most of it.
Automated metrics do not replace the human visual/playtest acceptance this
pass is waiting for.

## Validation

- `pnpm typecheck`: passed.
- `pnpm test:unit tests/terrain-render.test.ts tests/platform-grapple.test.ts`:
  [21 passed](checks/unit.txt). New tests measure segment count per visible
  width, 100–160 units/s floor and 170–250 units/s hazard speeds, 20–50-unit
  heads, over 35% lit coverage of a visible floor edge, world-anchored
  advancement by velocity, viewport independence, wall rails, single ledge
  signals, a plain body, multiple hazard lanes and exposed-strip activity. They
  also prove time-dependent ink is drawn only after the complete still image.
- `pnpm test:unit`: [92 files, 918 passed, 2 skipped](checks/unit-full.txt).
- `pnpm build`: [passed](checks/build.txt), with the existing bundle-size advisory.
- `BN_TERRAIN_BASELINE=<previous-terrain.ts> pnpm check:terrain`:
  [103 passed](checks/terrain-checks.txt) including [62 raster checks](checks/raster-checks.json).
  The baseline is `git show 5ba794f:src/slice/terrain-render.ts`. The floor
  contact band changes in 62.5% of columns per 0.25 s (previous 2.5%), the
  hazard band in 97.5% (previous 0%). The static interior peaks at an RGB sum
  of 96. Clipping, panning, fixed body pixels and determinism are retained.
  In actual CROSSFEED gameplay, 76–86% of the floor edge and 78–87% of the
  lethal edge change per quarter second ([observations](checks/motion-observations.json)).
  Pause and reduced motion change zero channel values while keeping every
  sampled column of both edges illuminated.
- `BN_TERRAIN_REVIEW=1 BN_CROSSFEED_FORWARD_ONLY=1 pnpm check:crossfeed`:
  [35 passed](checks/crossfeed.txt); complete two-visitor real-input solve with
  lift, cargo, firewall reset and both exits, and [lift captures](checks/lift-observations.json).
- `BN_TERRAIN_REVIEW=1 pnpm check:browser`: [122 passed](checks/solo-browser.txt);
  all four solo rooms, movement, grapple, reset and persistence.
