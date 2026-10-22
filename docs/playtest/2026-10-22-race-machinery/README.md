# RACE machinery visual review — 22 October 2026

Production browser, 1600 × 900 unless noted. Two independent visitor identities,
actual keyboard/mouse controls and accepted server snapshots. The existing RACE
route completed cargo delivery, five grapple platforms, the cube-held return
bridge, commit and both exit arrivals. No player/world/controller state was
assigned. Camera-only detail captures are explicitly identified below.

The implementation agent personally inspected the Canvas screenshots for native
text, state colours, decoded strings, quiet backing, fixed placement and gameplay
overlap. The ordinary TRACE/RETURN cameras deliberately show small text. Panels
do not enlarge or follow the viewport. Characters and machinery draw above the
decoration; nearby code is readable at its authored 12px world font.
The first visual pass found Cube B touching the locked-exit string. EXIT was
raised 40 world units, and the full RACE route/captures were repeated successfully;
the main gallery shows that final placement.

| Image | Accepted state / view |
| --- | --- |
| `full-cargo-comparison-drop-b.png` | Original four cargo blocks after delivery, ordinary DROP B view; new phase/span blocks above |
| `full-span-phase-inactive-nearby.png` | SPAN idle and both phases inactive, camera-only nearby detail |
| `full-trace-operator-active.png` | SPAN armed / A active / B inactive, ordinary TRACE operator camera, zoom about 0.54 |
| `full-span-phase-a-active-nearby.png` | Same accepted state, camera-only nearby detail at zoom 1 |
| `full-phase-b-active-nearby.png` | Real lever toggled after runner safely crossed; A inactive / B active, camera-only detail |
| `full-phase-small-1024.png` | A active / B inactive at 1024 × 768; fixed world bounds, camera-only detail |
| `full-phase-zoomed-out-small.png` | Same state and viewport, camera panned/zoomed to 0.6; unchanged world layout |
| `full-phase-reduced-motion.png` | Real toggle with reduced motion: final strings, no pulses |
| `full-return-inactive-nearby.png` | RETURN inactive, camera-only nearby detail |
| `full-return-operator-active.png` | RETURN active from actual body/cube contact, ordinary operator camera |
| `full-return-active-nearby.png` | Same accepted power, camera-only detail |
| `full-exit-locked-nearby.png` | EXIT locked, camera-only nearby detail |
| `full-exit-operator-unlocked.png` | Persistent unlock after real COMMIT, ordinary camera |
| `full-exit-unlocked-nearby.png` | Same accepted latch, camera-only detail |
| `full-machinery-evidence.png` | Existing paused inspector at 1600 × 1000: both real phase A alternatives, bytes, blocks and specimen; remaining context scrolls below |
| `full-complete.png` | Two-player route completed |

`machinery-review.json` contains 97 passing assertions and snapshots with actual
painted text, font, colour and coordinates. Its `live-phase-grace` record observes
raw phase A false with physical phase A true, the real zero-store, and the string
PHASE A ACTIVE. After server grace ends the string becomes inactive. This is a
live accepted interaction, distinct from the semantic fixtures in unit tests.

`world-regression/browser-review.json` records 178 passing checks across all five
cooperative chambers, CONTROL SPINE, custom-room isolation and unavailable-asset
behaviour. The other chambers' static write-one presentation remains unchanged.
That broad regression predates the final EXIT clearance adjustment; the repeated
RACE route and focused renderer checks verify the final bounds.

`cargo-regression/` records 54 passing assertions for real timely transfer,
expiry/retry and overlap interactions, including ordinary DROP A/B, nearby,
overview, 1024-wide and reduced-motion views. The cargo renderer, presentation
code and asset are byte-for-byte unchanged from the preceding main commit.

`evidence-regression/` and `evidence-check.log` retain the existing HANDSHAKE
inspector smoke check (9 assertions). The RACE inspector is additionally covered
by the real RACE route and provenance tests.

Unit fixtures test invalid/missing state, return/phase grace, latch/raw divergence,
room/instance reset, disconnected receipt freshness, reduced motion and asset
failure. They are not labelled as live cooperative playthroughs. Human review on
other displays can now judge the subtle contrast and environmental text size;
there are no remaining automated route failures.
