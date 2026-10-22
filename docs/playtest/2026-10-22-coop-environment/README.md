# Co-op environmental assembly visual review — 22 October 2026

All 25 existing placements are represented: HANDSHAKE 4, CROSSFEED VAULT 10,
DEADLOCK 5, USE AFTER FREE 6. The [durable contract](../../coop-environmental-assembly.md)
records every target, final rectangle, group, native site and placement rationale.
Screenshots were personally inspected, including ordinary player cameras and
1024×768 views. Machinery remains foreground; code naturally shrinks or clips.

## Reading this gallery

`final/` is the final placement gallery. Default size is 1600×900; `*-1024.png`
is 1024×768 and the Evidence capture is 1600×1000. Zone/detail, pan/zoom and
overview captures use camera-only framing over accepted state. They do not
claim that a player reached that location. `*-ordinary-player-*` and the named
host/partner route captures use the normal player cameras.

`campaign/` records the complete existing two-visitor campaign route using real
inputs, ordinary cameras and accepted server state. Both players completed all
five chambers. Its 76 observations include 51 output transitions and both raw
values for all 25 replacements, plus a live CROSSFEED route grace mismatch.
This run preceded the four final wire-clearance refinements; final HANDSHAKE
and USE AFTER FREE routes were rerun afterward. No state/position injection was
used for these solves. Latched unlock with a differing raw result is covered by
semantic unit fixtures, not claimed as a captured live event.

## Selected views

| Room / zone | State and framing | Screenshot |
| --- | --- | --- |
| HANDSHAKE crossing | Inactive / active accepted contact, detail | [idle](final/handshake-crossing-inactive.png), [powered](final/handshake-crossing-active.png) |
| HANDSHAKE lift | LINK active, final placement above lift, camera-only | [desktop](final/handshake-lift-linked-detail.png), [1024](final/handshake-lift-linked-1024.png) |
| HANDSHAKE relay / exit | Local isolated blocks, initial locked exit | [detail](final/handshake-relay-exit.png), [1024](final/handshake-relay-exit-1024.png) |
| HANDSHAKE exit | Real route, unlocked, ordinary operator | [unlocked](final/handshake-exit-unlocked-host.png) |
| CROSSFEED cargo / return | Three distributed mechanisms, inactive, camera-only | [lower apparatus](final/crossfeed-cargo-machinery.png) |
| CROSSFEED service / relay | Separate local zones, initial, camera-only | [service and relay](final/crossfeed-service-relay.png) |
| CROSSFEED left route | Fixed bounds across pan/zoom and width | [detail](final/crossfeed-left-route.png), [pan/zoom](final/crossfeed-left-route-pan-zoom.png), [1024](final/crossfeed-left-route-1024.png) |
| CROSSFEED right / gallery | Local vertical pair, camera-only | [gallery](final/crossfeed-right-route-gallery.png) |
| CROSSFEED vault / return | Separate local snippets, camera-only | [vault and bridge](final/crossfeed-vault-return.png) |
| CROSSFEED handover / exit | Actual route, powered machinery and unlocked vault | [left](campaign/full-upper-left-routing.png), [right](campaign/full-upper-right-routing.png), [unlocked](campaign/full-vault-unlocked.png) |
| DEADLOCK lower / shaft | Inactive cargo and active hazard, camera-only | [cargo](final/deadlock-lower-lift.png), [1024](final/deadlock-lower-lift-1024.png), [shaft](final/deadlock-shaft-firewall.png) |
| DEADLOCK hatch / completion | Local upper pair and separate hatch, camera-only | [upper apparatus](final/deadlock-upper-payload.png) |
| DEADLOCK payload completion | Actual three-payload state and enabled service relay | [operator](campaign/full-deadlock-stage-06-three-payloads-operator.png), [service](campaign/full-deadlock-stage-07-payload-service-carrier.png) |
| USE AFTER FREE launch / A | Separate lower snippets, camera-only | [launch](final/use-after-free-launch.png), [1024](final/use-after-free-launch-1024.png), [route A](final/use-after-free-route-a.png) |
| USE AFTER FREE B / C | Final fixed alignment; B powered, C idle after real handover | [desktop](final/use-after-free-route-b-powered-detail.png), [1024](final/use-after-free-route-b-powered-1024.png) |
| USE AFTER FREE assist | Inverted binding: active machinery with genuine write-zero | [active detail](final/use-after-free-assist-active-detail.png), [initial inactive](final/use-after-free-assist-inversion.png) |
| USE AFTER FREE summit | Isolated exit and real two-player completion | [exit detail](final/use-after-free-final-lift-exit.png), [ordinary completion](final/use-after-free-completed-host.png) |
| RACE reference | Existing cargo, phase and exit appearance | [cargo](final/race-cargo-firewalls.png), [phase](final/race-phase-a-b.png), [exit](final/race-exit.png) |
| CONTROL SPINE reference | Original service assembly, no co-op overlays | [service](final/control-spine-existing-service-assembly.png) |
| Evidence | Both genuine alternatives, bytes, blocks and specimen | [inspector](final/handshake-evidence-alternatives.png) |
| Isolation / failure | Custom room and failed compact asset | [custom](final/public-custom-no-native-overlay.png), [failure](final/missing-asset-gameplay-fallback.png) |

Each chamber also has `final/*-overview.png` and both
`final/*-ordinary-player-*.png` views. These deliberately retain distant text
and natural offscreen clipping; no camera-following fallback exists.

## Receipts and resolved issues

- [Final world receipt](final/browser-review.json): 548 checks, all placements,
  actual Canvas text, fixed bounds/culling, genuine stores, reconnect, reduced
  motion, Evidence and custom/failed-asset isolation.
- [Route receipt](final/route-review.json): 622 checks in the combined review,
  including final HANDSHAKE and USE AFTER FREE real-input solves and labelled
  active detail captures. Its older art observations were superseded by the
  final world receipt after the CROSSFEED anchor moved horizontally.
- [Full campaign coverage](campaign/native-world-physical-route.json) and
  [checks](campaign/checks.txt): 225 checks across all five chambers, both
  arrivals, reconnect and server restart restoration.
- Active screenshots exposed wires crossing the HANDSHAKE lift, CROSSFEED
  anchor, USE AFTER FREE B and assist excerpts. Only decoration moved; the
  final gallery and wire-intersection regression cover their new positions.
- `navigation-failure/` preserves a resolved browser-wrapper failure: after
  HANDSHAKE victory, the generic selector probe mistook the NEXT button for the
  requested chamber selector. The probe now checks the requested chamber;
  both canonical routes passed without changing movement or gameplay.
- The first native-inspector browser check exposed a real asynchronous refresh
  bug: default Current evidence could retain Loading after data arrived. The
  render cache now invalidates on load, two focused tests cover load/failure,
  and the nine-check browser regression passes.
- [Final repository checks](validation/pnpm-check.txt): typecheck, every native
  and generated-asset check, 834 unit tests passed (2 existing skips), three HTTP
  tests passed. [Production build](validation/build.txt) passed with the existing
  large-chunk advisory. `pnpm check:evidence` passed.
- [RACE cargo](race-cargo/checks.txt): 54 checks across timely, expiry/reset and
  overlap modes. [CONTROL SPINE/C8](control-spine/browser-check.txt): 120 checks,
  original assembly and retained inspector intact, no console errors.
- [Frozen study audit](frozen-study-check.txt) and read-only reference check
  passed. All 154 files in the five original acquisition manifests were also
  independently rehashed successfully.

`handshake-first/` and `world/` retain initial iteration receipts; their bulk
screenshots were superseded by `final/`. The single initial lift/relay image
records the planned grouping before the active-wire review split it.

The snippets are state-linked static context, never an instruction trace.
All zero/one alternatives are established. Remaining review is human aesthetic
and cooperative playtesting: distant text is intentionally optional, and not
every moving-player/cube combination can be captured. No unresolved route or
native-evidence failure remains in these receipts.
