# Final environmental and audio UI polish — 2026-10-27

Baseline: `590d899`, fetched current `main`. This pass changes presentation and
new-user audio defaults. [Preservation checks](preservation.json) confirm that
the three JSON changes affect only `presentation.labels`, campaign/draft pairs
match, runtime music and its catalogue retain their exact hashes, and RACE
authority, environmental assembly placements and the CI deployment gate are
unchanged. Unrelated local work was excluded from the commit.

## Changes

- **RACE COMMIT:** reuses HANDSHAKE's compact floating screen/pad, bounded signal
  filaments, reduced-motion policy and green latched face. Ready is exactly the
  existing `E · COMMIT` hint; completed is accepted `finalControl`, exposed by
  the existing authority as `inputs.switchC`. No extra states or range checks.
  Its caption is fixed at (−116, −22) relative to the existing contact point so
  it clears the exit header. Repeated E leaves it committed and plays no new cue.
- **Audio/UI:** new Music default 25%, Effects still 65%. Saved Music choices,
  including 35% and zero, are retained. Both pause menus show the existing range
  controls immediately after Resume. Main Menu/Leave Party, restart, invitations,
  and host chamber selection remain available in a compact panel.
- **Fixed spacing:** DEADLOCK's heading fits the left wall and SERVICE / PERSONNEL
  ONLY occupies two lines above the gateway. HATCH's caption moves up 40 units,
  clear of the nearby cube-use prompt. HANDSHAKE's boost hint moves to (1400,370),
  clear of the held cube and relay wire/header. RACE's CARGO CLOCK heading moves
  right to x350, clear of RECEIVER. USE AFTER FREE's A → B instruction moves to
  y2120, below the recovery shelf and above the launch listing.
- **Listening review:** [Shadow variants, PYNCHON and Loaben alongside Algate](../2026-10-27-crossfeed-listening/index.html).
  Five loop-ready candidates, seam auditions, sources and measured levels;
  CROSSFEED remains Through the Sewers pending human selection.

## Gameplay screenshots

All images are actual browser Canvas captures, not mockups or composites.
The [screenshot index](screenshots.json) gives exact source paths and hashes.
Selected captures live in [screenshots/](screenshots/); the complete raw matrix
remains in `.workbench/reports/2026-10-27-final-polish/`.

| Review | Representative captures |
| --- | --- |
| RACE control, normal camera | [Dormant 1600](screenshots/race-commit-dormant-1600.png), [ready/interacting 1024](screenshots/race-commit-ready-1024.png), [green 1024](screenshots/race-commit-completed-1024.png), [departure 1600](screenshots/race-commit-departure-p1-1600.png) |
| DEADLOCK entry | [Before](screenshots/deadlock-entry-before-1600.png), [after 1600](screenshots/deadlock-entry-p1-1600.png), [after 1024](screenshots/deadlock-entry-p1-1024.png), [second player](screenshots/deadlock-entry-p2-1024.png) |
| DEADLOCK powered HATCH | [Caption / cube prompt 1024](screenshots/deadlock-powered-p1-1024.png) |
| HANDSHAKE retained control / boost hint | [Ready 1024](screenshots/handshake-ready-1024.png), [completed 1600](screenshots/handshake-completed-1600.png) |
| RACE cargo / USE AFTER FREE instruction | [Cargo 1024](screenshots/race-cargo-caption-1024.png), [instruction before](screenshots/use-after-free-launch-before-1600.png), [after 1024](screenshots/use-after-free-launch-1024.png) |
| Pause sliders | [Solo default 1024](screenshots/solo-pause-sliders-1024.png), [co-op default 1024](screenshots/coop-pause-sliders-1024.png), [host actions 1024](screenshots/coop-host-pause-1024.png) |
| Untouched solo layouts | [PRESSURE](screenshots/solo-pressure-powered-1024.png), [SWITCH](screenshots/solo-switch-powered-1024.png), [RELAY](screenshots/solo-relay-powered-1024.png), [CONTROL SPINE](screenshots/solo-control-spine-powered-1024.png) |

The host pause capture deliberately shows its persisted 0% music choice; the
fresh solo and guest captures show the new 25% default. Both sizes are retained
for all pause variants and RACE control states.

## Verification

| Check | Result |
| --- | --- |
| `pnpm typecheck`, `pnpm build` | Pass. Existing large-chunk build advisory remains. |
| Relevant unit tests | 55 audio/music/menu/authored tests + 141 native/RACE/input/audio-regression tests passed; authored consistency rerun after the final hint adjustment. |
| `pnpm check:native`, `pnpm check:evidence` | Pass; retained specimens, stores, world/cargo/machinery/environment artifacts and process evidence verified. |
| `pnpm check:menu` | Pass; both sliders initially visible, keyboard changes and preference reload, compact host/guest/solo panels at 1600×900 and 1024×768, Escape and backdrop resume. |
| Touch smoke check | Pass; actual emulated touch events change sliders and resume both solo/co-op without triggering gameplay input while paused. |
| `pnpm check:audio` | Pass; independent preferences, legacy migration, mute, gesture unlock, loops, crossfades, pause/victory ducking, all chamber tracks and failed-download fallback. |
| `BN_NATIVE_WORLD_REVIEW=1 BN_POLISH_REVIEW=1 pnpm check:campaign` | All five chambers completed by one persistent two-visitor party through real input; reconnect and server-restart recovery passed. All 25 native replacements observed. COMMIT's ready/accepted states, both peers and repeated-E audio checked. |
| `pnpm check:maintenance` | Final HANDSHAKE 59-step solve, zero deaths, dormant/ready/green, repeated E, reduced motion, normal cameras at 1600×900, 1024×768 and 800×600. |
| Canonical DEADLOCK rerun | Final HATCH caption checked through all 71 steps and two physical arrivals, zero deaths. |
| `BN_POLISH_REVIEW=1 pnpm check:browser <isolated-server-url> <shots>` | Complete four-room solo route, retained five-input/seven-output UPLINK contract, checkpoint/save/reload checks; powered/unpowered normal and Tab overview captures at both desktop sizes. |
| `BN_WORLD_SKIP_TIMING=1 pnpm check:world-assembly` | Pass; all five co-op rooms, both ordinary player cameras, overview and local diagnostic views at 1600×900/1024×768. Fixed bounds, strict culling, accepted outputs, authentic listing pixels, fallback and evidence inspector checks retained. |
| Listening preview browser review | Eleven files decode/play, five candidate loops wrap, one-at-a-time playback, 25% initial volume, no media errors or horizontal overflow. |

Logs are in [checks/](checks/). [Route summaries](route-summary.json) retain exact
authored hashes and outcomes. The full campaign preceded the final boost-hint
and HATCH-caption refinements; those presentation-only refinements each received
their complete focused room rerun. No mechanics changed between those runs.

The review harness was corrected in two places: the RACE latch assertion now
counts one additional cue across the persistent party rather than assuming a
fresh audio counter, and native culling compares the assembly and camera from
the same browser turn. The original strict assertions remain; neither fix
changes runtime state or relaxes a gameplay test.

## Files changed and limits

Runtime: `src/slice/maintenance-render.ts`, `src/slice/render.ts`,
`src/coop/race-condition.ts`, `src/audio/game-audio.ts`,
`src/audio/music-player.ts`, `src/menu/views.ts`, `src/coop/party-menu.ts`,
`styles.css`; the HANDSHAKE, DEADLOCK and USE AFTER FREE campaign/draft JSON pairs.
Supporting changes: focused audio/music/menu tests; menu/audio/solo/native-world
browser checks; the optional campaign polish capture hook; the review-only
audio generator; chamber/audio contracts and these review artifacts.
The [complete changed-file index](files-changed.txt) includes all retained assets.

CROSSFEED and the four solo rooms required no decorative moves after review.
Small native snippets remain intentionally small in whole-room overview;
authored world text does not track the camera or reflow. Moving characters can
temporarily pass in front of world art. This is browser automation and visual
inspection, not a new human cooperative playtest or a subjective music verdict.
Gamepad behavior was not claimed or added; existing keyboard/pointer/touch
handlers are unchanged. Human listening approval is the remaining music step.
