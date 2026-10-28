# Static terrain and death fields

`src/slice/terrain-render.ts` owns two Canvas helpers used by the shared puzzle
renderer, including the campaign, solo tutorials and custom-level preview.
They receive rectangles and the current visible world bounds, not world state.

- `drawStaticPlatform` gives enabled `kind: 'static'` boxes a near-black
  `#080f16`→`#04080e` architectural mass defined by its contact edge: a crisp
  2.5-unit violet-periwinkle strip (`#5560d8`, with an `#8f97f5` hairline),
  short end caps, faint indigo side/underside tracks (`#222e66`) and a soft
  inner glow. It is deliberately distinct from cyan powered code and the
  sky-blue gravity lift. The interior has no chips, pins, bus contacts or seams,
  only about one barely visible etched run per 416×232 world cell. Runs are
  upright on tall blocks and omitted on ledges and narrow walls.
  `staticSignals` returns the moving segments, each a 1.25-unit hairline with a
  4-unit white tip, a fading tail and a narrow inward glow.
  - **Top surfaces:** three interleaved world-anchored trains (pitch
    132/176/236 units, 146/118/160 units/s, 22/16/12-unit heads; the middle one
    reversed). Ledges under 240 units carry one 124 units/s signal.
  - **Sides:** boxes at least 40 tall carry one sparse train, 360-unit pitch at
    104 units/s, down the right face and up the left.
  - **Undersides:** boxes at least 24 tall carry two co-prime trains (520/740
    units) flowing leftward, so flow runs clockwise around the silhouette.
    Perimeter density stays under half the top's per unit length.
  - **Narrow walls** (`h ≥ 2w`, 10–80 wide): keep static side rails, and
    their perimeter signals ride them.
- `drawDeathZone` keeps the approved crimson/magenta depth, rim, dim perimeter,
  interrupted bends and side ticks. Its top edge is a broken hot rail with
  world-fixed gaps, never a continuous walkable-looking line. Long stepped
  buses run below it on 176-unit cells, with right-angle risers and breaks.
  `hazardSignals` returns the moving segments: 48-unit heads with 92-unit
  fades along the lethal edge at 228 units/s, and trailing bus signals at
  172–248 units/s, including backflow lanes. Short pulses follow the bends at
  196–240 units/s. Signals stop more than 110 units below the edge. No
  external glow, spikes, labels or full-field flash. Existing
  controller-driven orange firewalls still use `drawFirewalls`.

Both helpers clip all ink to the intersection of the original physics box and
the viewport. Repetition indices and signal heads derive from fixed world
coordinates, phase and the presentation clock; viewport changes only select
what to draw. No resized textures, random frame noise, offscreen buffers,
shadows or whole-room loops are used. Both helpers receive the existing
presentation time and energy-motion gate. Time-dependent ink is drawn only
after the complete still image, so pause, disconnected co-op and reduced
motion show exactly the moving frame without signals: a stable lit contact
edge and lethal boundary.

Geometry, enabled-state decisions, solid extents, hookability, collision/reset
logic, cube recovery, camera behaviour, controller outputs and native evidence
are outside these helpers. Code and crumble artwork stays in its existing branch.
Hazards retain their existing draw order behind platforms: for example,
CROSSFEED's 4,320-unit field is mostly concealed by the two solid floors, with
its dangerous openings exposed.

## Review

- `pnpm test:unit tests/terrain-render.test.ts`: offscreen rejection, bounded
  work for huge boxes, immutable inputs, clipping/state restoration and the
  still-then-signals draw order. Perceptual signal contracts cover segment count
  per visible width, speed bands, 10–24-unit fine heads, lit coverage of a
  visible floor edge, advancement by velocity, viewport independence, sparser
  clockwise side/underside flow, wall rails, single ledge signals, a plain
  body and multiple fast hazard lanes.
- `pnpm build && pnpm check:terrain`: real Chromium raster checks and both
  player cameras plus Tab overview in all five chambers, at 1920×1080/1024×768.
  The pan comparison allows two RGB channel values for Chromium gradient
  dithering; it does not allow a displaced seam or fragment. Contact-band
  checks require over 30% of columns to change clearly in 0.25 s and the static
  body to stay near-black. Optional
  `BN_TERRAIN_BASELINE=<saved-source-path-relative-to-repo>` also requires at
  least 4× the previous renderer's band motion. The baseline is review input,
  not a runtime dependency. Actual CROSSFEED canvas samples measure flow across
  the floor contact edge and exposed lethal edge within the first second, plus
  three timed screenshots and a short WebM. Paused and reduced-motion frames
  must stay still with both edges illuminated.
- `BN_TERRAIN_REVIEW=1 BN_CROSSFEED_FORWARD_ONLY=1 pnpm check:crossfeed`:
  matched ordinary-camera lift-off/lift-on captures at both sizes while the
  existing real-input route places Cube A. The complete route still runs,
  including the physical lift, cargo transfer, reset and both exit arrivals.
- `BN_TERRAIN_REVIEW=1 BN_NATIVE_WORLD_REVIEW=1 pnpm check:campaign`:
  ordinary-camera captures at stable powered holds during all five real-input
  solves. The original route, authority and completion assertions still run.
- `BN_TERRAIN_REVIEW=1 pnpm check:browser <server-url> <shots>`:
  all four solo rooms, powered/unpowered and held overview at both sizes,
  alongside the existing movement, grapple, reset and persistence regressions.

Set `BN_SHOTS` to choose the co-op/raster output directory. Recorded reviews:
[approved death-field art](playtest/2026-10-28-terrain/README.md) and
[static cybernetic architecture](playtest/2026-10-28-cyber-terrain/README.md), then
[darker substrate and data flow](playtest/2026-10-28-terrain-flow/README.md), then
[near-black architecture and obvious signal flow](playtest/2026-10-28-terrain-signal/README.md), then
[fine contact signals and perimeter flow](playtest/2026-10-28-terrain-fine-signal/README.md).
