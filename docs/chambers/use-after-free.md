# USE AFTER FREE — authored cooperative chamber

The released chamber is [`levels/campaign/use-after-free.json`](../../levels/campaign/use-after-free.json); the editable source remains [`levels/drafts/use-after-free.json`](../../levels/drafts/use-after-free.json). It joined the campaign unchanged on explicit request, 2026-10-16, using the [shared JSON authority and party persistence](../adr/0010-json-coop-campaign.md). It remains authored/mock with prototype crumble and no binary evidence, new binary or account. The JSON is authoritative; no bespoke TypeScript geometry factory exists.

This is a vertical ownership exchange. A player keeps an ordinary pressure plate occupied while the partner climbs, then both deliberately release the previous owner before the next route becomes usable. The operator's footing also expires: the player, plate contact and route really fall out of service, rather than playing a cosmetic collapse animation. Both players climb and operate. Swapping browser slots exchanges the complete player roles.

## Topology and intended solution

The shared shaft is 1800 × 2550 world units. Permanent bottom footing is at y=2350; A's right refuge at y=1950; B's left refuge at y=1650; C's right refuge at y=1300; summit at y=950. There is one bottom breakpoint terminal/pedestal pair and exactly two slot-specific checkpoint markers. No intermediate checkpoint erases the cooperative traversal.

```text
                    summit / permanent ASSIST ─── EXIT: both players
                          ↑ C chain                 ↑ final lift
          c1 → c2 → c3    │                    ASSIST && !C
             ↑           │
       B left refuge ────┘                      C right refuge
       unstable B                              unstable C
             ↑                                      ↑
          A chain                               B return arc
             ↑                                      ↑
       lower shaft                              A right refuge
                                               unstable A
                                                     ↑ lower lift
                  bottom / LAUNCH / BREAKPOINT
```

1. Activate SAVE BOTTOM with E. Player 1 holds permanent LAUNCH; Player 2 rides the clear right-hand lift lane, leaves it onto A's refuge, and walks onto unstable floor A.
2. Player 1 hooks a1, swings left, rope-jumps to a2, catches a3 while rising, and rope-jumps onto B's permanent left refuge. The full cooperative replay uses all three; a1 provides a gentler launch, but the alternative jump described below can skip it.
3. Player 1 stands on B. Player 2 steps right off A onto permanent footing. B's route becomes active only when A is released. Player 2 jumps over A's sensor, hooks b1 leftward, changes direction on b2, and rope-jumps through b3 onto C's permanent refuge.
4. Player 2 holds C. Player 1 steps left off B, jumps over the released B sensor and catches c1. Let the initial swing descend before steering right; catch c2 while rising, rope-jump to c3, retract around the permanent baffle and rope-jump onto the summit. The baffle's upper surface joins the summit, so a small landing error is recoverable.
5. Player 1 holds permanent ASSIST. Player 2 releases C onto its adjacent refuge, enters the final lift, and leaves it onto summit footing. Both make distinct physical exit arrivals. Exit unlock latches; completion still requires both arrivals.

The actor called `host` in the scenario performs steps 1/2/4/5 and `partner` performs steps 1/3/5. These names describe the route roles, not a required network slot.

## Logic, physical inputs and presentation

| Output or resolved destination | Exact condition | Machinery |
| --- | --- | --- |
| `launchPower` | `launch.occupied` | Lower lift |
| `routeA` | `plateA.occupied` | a1, a2, a3 |
| `routeB` | `plateB.occupied AND NOT plateA.occupied` | b1, b2, b3; B retry shelf |
| `routeC` | `plateC.occupied AND NOT plateB.occupied` | c1, c2, c3; C retry shelf |
| `assistBinding` | `assist.occupied AND NOT plateC.occupied` | Final lift |
| `exitReady` | `assist.occupied` | Latched unlock; two physical arrivals |

`assistBlocked` is the negation of the assist condition; its destination binding inverts exactly once. The decorative assist wire observes that resolved binding and marks the inversion. Anchor wires observe the actual active bindings. The two recovery shelves are controlled static architecture: inverted `open` bindings retract them when their route is off, while their decorative wires observe the route output and illuminate when the shelf is solid. Wires do not implement the controller.

A/B/C are ordinary `plate` devices centered on separate 130-unit unstable supports. Each operator support is unhookable and touches permanent refuge footing on the release side. Sensor half-width is 48 units for a player; the support boundary is 65 units from its center. Standing on the adjacent refuge therefore releases the sensor. There are no cubes or surrogate controls holding occupancy.

All nine hook anchors use the real address-bar grapple surface, the existing 500-unit range, 200-unit minimum rope, bounded swing energy and ordinary rope jumps. Static architecture and the baffle are unhookable. Disabled anchors are ghosted/non-solid. No native addresses or retained-binary classifications are invented. Each of LAUNCH, A, B, C and ASSIST has a contextual reveal of the machinery it supports. Existing camera logic uses the local grounded occupant, so the operator sees the supported route while the remote climber keeps their own camera. After a handover the departing operator waits on permanent footing for the camera to return before aiming; the scenario gives this 650 ms.

## Measured constraints and timing

Operator supports have 24-second foot fuses. Anchor foot/hook fuses are 3.6 seconds. Both respawn after 3 seconds. These are per-object authored prototype values. Turning route power off and back on preserves a warning already in progress. The server decides when shared collision actually disappears.

The final normal and slot-swapped two-browser runs measured these ranges of first observed attachment lengths and attached intervals. Length is the first polled attached snapshot; intervals use 50 ms trajectory samples, with about 50 ms sampling uncertainty. These are observed real engine values, not distances inferred from the layout; `measured-grapples.json` retains all nine anchors for both runs:

| Chain | Anchor 1 / 2 / 3 attachment length | Attached intervals | Physical route |
| --- | --- | --- | --- |
| A |408–410 / 372–379 / 393–400 |1.65 / 0.55–0.60 / 0.75–0.80 s | Bottom to B, three leftward transfers |
| B |319–321 / 359–361 / 473–476 |0.60 / 1.20 / 0.70 s | A to C with a direction reversal |
| C |377–385 / 358–360 / 480–485 |0.80 / 0.55 / 1.75 s | B to summit, descending swing and rising catch |

C1's recorded player y spans 1520→1609→1479 in the normal run: the first arc actually descends and rises. C3's first observed attachment was 480–485 units after the C2 margin adjustment, within the 500-unit cap and improved from the earlier 492–497 measurements. This remains the longest catch and needs human feedback. No stronger shortcut or timing claim follows from range checks.

The normal held ground jump is about 127 units; the ascent uses actual rope motion and bounded rope-jump impulses. Operator holds in the complete automated route were approximately 5–7 seconds, leaving substantial room inside 24 seconds. The automated solution is deliberately efficient; its roughly 29-second traversal does not estimate first-time human completion time.

## Recovery, alternatives and known shortcuts

Every operator has permanent footing immediately adjacent. A's collapse lands on the permanent catch at y=2050, 100 units below A. The lower catch at 2280 retains lower missed swings. While B is powered, a solid unhookable retry shelf spans x=650–1280 at y=2050 and joins A's permanent catch. A missed B traveler can walk right and make an ordinary 100-unit jump back to A's refuge. While C is powered, a second solid unhookable shelf spans x=560–1160 at y=1760; a 110-unit leftward jump returns the traveler to B's refuge. The shelves retract when their owning route is off, so they add no permanent staircase through earlier stages.

The retained recovery scenario deliberately releases b1 and c1 during the real full route, catches each corresponding shelf, physically jumps back to the departure refuge, waits for the used anchor to recover, retries and finishes with both players. This is measured recovery from traveler misses while the operator still holds. It is not a promise that every fall is caught: leaving the covered region, or allowing the operator's own 24-second floor to collapse, can send a player farther down and retract the controlled catch. The operator should leave for the immediately adjacent permanent refuge before expiry. A failed higher operator handover may require both players to return to the bottom checkpoint and restart LAUNCH. R returns to the activated bottom checkpoint without resetting the partner's shared fuse.

A player may switch browser roles, retry an anchor after recovery, or wait on permanent footing before entering an operator floor. Holding both A and B correctly suppresses routeB; holding both B and C correctly suppresses routeC. Running back across a released sensor reasserts that input, so the taught departure jump matters.

A confirmed within-stage alternative skips a1: from the authored bottom spawn, walk and settle near x=882, hold a ground jump for about 0.22 seconds, hook a2 leftward, then rope-jump through a3 onto B. The real-engine section replay reaches `refugeB` at (406.68, 1633) with zero deaths and no a1 use; multiple timings worked. It explicitly supplies A through a partner-contact override, so `physics/uaf-skip-a1.json` is a section diagnostic, not additional network completion evidence. A must still be occupied, and all subsequent ownership handovers remain. A1 is a meaningful gentler launch option, not a mandatory anchor; the full two-browser solution uses all nine, and does not prove that nine are required.

An independent adversarial search found a real earlier bypass: with B still held and C off, the traveler used B anchors for extra airborne jumps, landed on b3, then jumped directly to the summit. The permanent baffle now leaves only 20 units above b3's top, less than the 34-unit player body, removing that landing/reset. Its top is permanent summit recovery footing. A retained exact exploit replay regression and bounded 7.5-second searches reject the old path, including searches starting on C, A and the new B recovery shelf with B held. This is evidence against that path, not proof that every shortcut is impossible.

A swapped-role replay also exposed an accidental 30-unit gap between baffle top and summit. That gap was closed, preserving the intended difficult swing while removing a one-pixel landing failure. A later swapped replay peaked 1.35 units short of the C2 transfer height. C2 was raised 20 units (y=1090→1070) to increase physical ascent margin, retaining the same replay transfer condition and all completion assertions. These corrections preserve the required Boolean contracts.

## Reproduce validation

```sh
pnpm level:validate levels/drafts/use-after-free.json --json
pnpm exec vitest run --config vitest.unit.config.ts \
  tests/use-after-free.test.ts tests/use-after-free-shortcuts.test.ts
pnpm typecheck
pnpm level:render levels/drafts/use-after-free.json \
  --out .workbench/reports/2026-10-16-chambers/use-after-free/overview-final.png
pnpm level:render levels/drafts/use-after-free.json --state route-c \
  --out .workbench/reports/2026-10-16-chambers/use-after-free/powered-c-final.png
pnpm level:playtest levels/drafts/use-after-free.json \
  --scenario levels/scenarios/use-after-free.json \
  --report .workbench/reports/2026-10-16-chambers/use-after-free/final
pnpm level:playtest levels/drafts/use-after-free.json \
  --scenario levels/scenarios/use-after-free-collapse.json \
  --report .workbench/reports/2026-10-16-chambers/use-after-free/final-collapse
pnpm level:playtest levels/drafts/use-after-free.json \
  --scenario levels/scenarios/use-after-free-recovery.json \
  --report .workbench/reports/2026-10-16-chambers/use-after-free/recovery-proof
```

The main and failed-then-retry scenarios are `full-room`, `coop`, with both authored starts and real keyboard/mouse actions. Neither changes a transform, forces an output or substitutes a local fake partner. The separate collapse scenario is honestly labelled `diagnostic`: both browsers still start at the authored spawns, physically reach A, power-cycle an already-warning a1, and observe the actual operator floor breaking, occupancy clearing and the player falling to permanent catch footing. It does not claim room completion.

Eight main unit tests cover the truth table, local-only contextual camera, physical operator collapse, two ordinary recovery jumps and three real-engine section routes. The isolated section tests explicitly use initial placement and a partner-contact override and are not two-player evidence. The ninth test retains the exact formerly-successful shortcut input sequence. Browser reports, detached trajectories, staged screenshots and render metadata live in the ignored report directory; they are diagnostics rather than authoritative design or binary evidence.

Final canonical hash: `53d81f2cf3953a6997de93dae9947aacfaf0c4119132c0beff524b92d3851cac`.

- Validation: playable, zero diagnostics. All nine focused tests and TypeScript pass.
- `final/report.json`: full two-browser completion, both distinct arrivals, zero deaths; host 29.58 seconds of simulation.
- `final-swapped/report.json`: same full route with browser slots exchanged, both arrivals, zero deaths; completion in about 29.1 seconds. The swapped scenario is retained beside its report and differs only in actor slots, scenario ID and slot-specific arrival observation.
- `final-collapse/report.json`: actual grounded A contact, anchor power cycle without reset, server-owned collapse, lost occupancy/route and permanent catch recovery all pass. The a1 warning had 2651–2652 ms remaining after the off/on cycle and broke on its original deadline. At the first broken-floor snapshot, the partner is airborne while still seeing the prior shared plate/output; 16.7 ms later the next observation has both released on both clients. The unit test verifies the exact next-physics-step contact transition separately.
- `recovery-proof/report.json`: the real full route deliberately misses B and C, lands on each powered static catch, jumps back to the permanent departure refuge and retries, then completes with both arrivals and zero deaths in 43.82 seconds.
- Staged captures include initial, A powered, first chain/handover, second chain/handover, summit ASSIST, near-complete and completed views for both players. Final initial/powered renders use the same canonical hash.
- Independent final-baffle adversarial search: the known B-only bypass is rejected across a bounded 7.5-second search. This does not prove all shortcuts absent.

Human two-player playtesting remains outstanding despite the separately requested campaign integration.

## Candid quality review

| Criterion | Current assessment and remaining limitation |
| --- | --- |
| Central discovery | Releasing the previous owner is a real NOT condition, and the operator's own floor can expire. The labels reveal the Boolean rule; whether the discovery is satisfying needs people rather than assertions. |
| Cooperation | Both bodies supply inputs, both climb, and the operator/traveler roles exchange A→B→C→ASSIST. Both exit arrivals are required. Slot-swapped completion is tested separately. |
| Readability | A/B/C, short floor labels, functional wires, local operator camera reveals and permanent side refuges explain ownership. Final image review removed overlapping fuse text and duplicated operator captions. Nine overlapping shaft anchors still demand a useful overview and a human readability pass. |
| Physical movement | The routes use measured swings, an arc reversal, actual descending/rising motion and bounded rope jumps. C3 is the tightest range catch; broader motor-skill accessibility is not certified. |
| Recovery | Adjacent permanent releases and two controlled retry shelves make measured B/C misses recoverable by ordinary jumps; both failures and subsequent full completion are tested. If the operator also loses the floor, catch power can disappear and the pair may need the bottom checkpoint. No intermediate checkpoint masks this limitation. |
| Replayability | Players can exchange roles, improve swing timing or take the confirmed direct-a2 launch. The Boolean handover solution stays fixed; no random layout or alternate control branch is claimed. |
| Shortcuts | The demonstrated B-anchor summit skip is closed and retained as a regression. The confirmed a1 skip is a permitted movement alternative preserving all handovers. A bounded negative search is explicitly not exhaustive; further human exploration remains. |
| Complexity | Six coordinate-free Boolean outputs drive two lifts, nine anchor instances and two retractable recovery shelves. The final lift and the shelves use their documented single binding inversions. No custom controller or runtime machinery was added. The shaft asks for substantial movement skill despite simple logic. |
