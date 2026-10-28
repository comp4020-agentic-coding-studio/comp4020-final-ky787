# CROSSFEED floating buttons — 2026-10-28

Baseline: `06aa9d4` ([fine signal review](../2026-10-28-terrain-fine-signal/README.md)).
Human feedback said CROSSFEED's orange boxes are functionally buttons and should use
the button asset. It also asked for the one near the breakpoint to move higher and a
little right, so it is pressed mid-jump, without introducing much asset overlap.

- **Asset.** CROSSFEED's two one-use terminals, SYSTEM ONLINE (`switchC`) and
  D / GALLERY ACCESS (`switchD`), carry `floating: true`. They draw with
  `drawFloatingControl`, the hovering button already used by HANDSHAKE maintenance
  and RACE COMMIT:
  - muted and UNCONFIRMED until reachable;
  - cyan `E · CONFIRM` while the local body touches it;
  - green LATCHED once accepted.
  The orange box and its floor post are gone.
- **Reach.** A floating button is pressed by touching its 56 × 48 housing (14–62
  units above `at`) with a 10-unit margin, grounded or airborne. This is
  `touchesFloatingControl` in `src/slice/maintenance-render.ts`. It is used by
  the CROSSFEED client authority and by declarative/draft authorities. E is still
  required; proximity commits nothing.
- **SYSTEM ONLINE** moved from (1210, 750) on the catwalk to (1255, 662). Its housing
  spans x 1227–1283, y 600–648: above and right of the BREAKPOINT pedestal
  (x 1038–1202), clear of its sign. A player standing anywhere on the catwalk
  cannot press it. A tap jump (about 92 units) or a held jump (about 129 units)
  from beneath reaches it, and E pressed mid-jump commits it. The automatic
  breakpoint stays independent; walking through it never operates the button.
- **D / GALLERY ACCESS** stays at (4200, 750) on its boost ledge. The puzzle is
  unchanged: held floor jumps from the gallery stay short of it, and the
  partner-boost second jump reaches it. Its caption moved below the ledge's lit
  underside instead of across it.
- **Overlap.** Captions sit beside or below each housing. SYSTEM ONLINE's caption is
  right of the housing, clear of the catwalk player tag. The lift and service wires
  leave the housing roof or base, and the gallery wire leaves D's roof, so no wire
  crosses its own caption or the housing face. Unit tests assert that neither
  housing overlaps any platform, and that SYSTEM ONLINE's housing does not overlap
  the breakpoint art box.
- **Unchanged.** Server semantics (`server/crossfeed-state.ts` switches on control id
  only), save keys, controller rules, wire outputs, collision and physics. The
  optional `floating` draft field is carried through import, validation and the
  room adapter so imported CROSSFEED round-trips exactly. The validator allows it
  only on terminals (`device.floating-role`).

[Preservation hashes](preservation.json) show 148 files byte-identical to `06aa9d4`:
server state, native evidence, campaign JSON, physics, terrain and pad renderers.
The five listed `changedFromBaseline` files are the intended runtime edits.

## Review

| View | Capture |
| --- | --- |
| D before/after (same route and camera) | [comparison](comparison/gallery-d-before-after.png) |
| SYSTEM ONLINE idle, player standing beneath (cannot press) | [capture](screenshots/control-system-online-before.png) |
| SYSTEM ONLINE mid-jump, cyan `E · CONFIRM` | [capture](screenshots/control-system-online-mid-jump.png) |
| SYSTEM ONLINE latched, lift and service wires powered | [1600](screenshots/control-system-online-latched.png), [1024](screenshots/control-system-online-latched-1024.png) |
| D idle above the boost, then latched | [idle](screenshots/boost-support.png), [latched](screenshots/control-gallery-latched.png) |
| ROUTE POWER reveal (zoomed out) | [capture](screenshots/upper-left-routing.png) |
| Completion | [capture](screenshots/complete.png) |

Visual review notes:

- The button reads as the same device family as HANDSHAKE/RACE.
- The breakpoint pedestal, ROUTE SELECT lever and ROUTE POWER pad keep their own
  space.
- In the zoomed-out ROUTE POWER reveal, P1's screen-sized name tag can pass over the
  small button. That tag is a transient player overlay drawn on top by design; in
  the normal follow camera it sits below the housing.
- These are automated captures and do not replace human playtest acceptance.

## Validation

- `pnpm typecheck`: passed.
- Focused unit tests (CROSSFEED world, machinery presentation, connections,
  workbench): [104 passed](checks/unit.txt). A new test covers:
  - every catwalk standing position never offers SYSTEM ONLINE;
  - tap and held jumps from beneath it offer it airborne, and E calls
    `control('switchC')`;
  - held gallery-floor jumps never offer D;
  - neither housing overlaps platforms or the breakpoint.
- `pnpm test:unit`: [92 files, 920 passed, 2 skipped](checks/unit-full.txt).
- `pnpm build`: [passed](checks/build.txt), with the existing bundle-size advisory.
- `pnpm check:native-world && pnpm check:environmental`: [passed](checks/native.txt).
- `BN_CONTROL_REVIEW=1 BN_TERRAIN_REVIEW=1 BN_CROSSFEED_FORWARD_ONLY=1 pnpm check:crossfeed`:
  [37 passed](checks/crossfeed.txt). This is the full real-input two-visitor route:
  - standing beneath SYSTEM ONLINE cannot press it;
  - a real Space-held jump plus E presses it mid-jump, and the player lands back on
    the catwalk;
  - the real boost second jump reaches D;
  - the chamber completes.
  [Control observations](checks/control-observations.json).
- `pnpm check:maintenance`: [passed](checks/maintenance.txt) (HANDSHAKE floating control).
- `pnpm check:race`: [full route passed](checks/race.txt), including RACE COMMIT and
  "RACE complete using real controls". The reverse route then stops at a launch-deck
  hop ("Jump to launch-step-N landed on launch-step-N−1"). Unmodified `06aa9d4` fails
  the same way ([baseline log](checks/race-baseline-06aa9d4.txt)). This is a
  pre-existing timing flake in that harness's air-steering helper; no RACE, physics
  or server file changed.
- `pnpm check:browser`: [122 passed](checks/solo-browser.txt) (four solo rooms).
