# HANDSHAKE — cooperative chamber

Released source: [`levels/campaign/handshake.json`](../../levels/campaign/handshake.json).
Editable draft: [`levels/drafts/handshake.json`](../../levels/drafts/handshake.json).
This authored/mock chamber joined the campaign on the user's explicit request,
2026-10-16. The released JSON preserves the tested draft layout. See the
[integration contract](../adr/0010-json-coop-campaign.md); no binary evidence is implied.
The intended first-time experience is a forgiving 5–8 minute introduction; that
estimate has **not** been measured with inexperienced human players.

## Experience and topology

One shared payload connects the room's two discoveries: a cube can replace a
person on a pressure plate, and a cube held by a person is a higher step than a
loose cube. Two broad powered grapple bars connect the central bay to a side
alcove across a 600-unit gap. Permanent recovery flooring lies below, with two
ordinary jumps back to the bay. It cannot reach the alcove without powered hooks.

A separate plate operates the lift beside the upper service gallery. LINK opens
both fixed relay gates, allowing the other player and the cube to regroup without
repeating the lift. The gallery's 190-unit maintenance ledge requires the held
cube. The final socket and two-arrival gate are back in the central bay. The room
is 2290 × 1300; the additional bay width separates ENTRY POINT, BREAKPOINT, the
relay, socket and exit instead of stacking their silhouettes.

## Controller and objects

- `crossingPower = crossing.occupied`: both grapple slabs; ordinary player/cube plate.
- `liftPower = liftPlate.occupied`: vertical service lift; ordinary player/cube plate.
- `relayPower = link.value`: reversible LINK toggle, both relay gates.
- `exitReady = maintenance.value AND exitSocket.occupied`: latched two-arrival exit.

MAINTENANCE COMPLETE is the only puzzle progression commitment. The central
BREAKPOINT pedestal automatically activates the existing `relay` checkpoint milestone
(the shared server names it `reunion`) when a player walks onto its grounded
contact area. Its two markers remain on the starting floor. There is no separate
checkpoint terminal or E interaction, and the checkpoint powers no route. Wires observe destination bindings, not a second controller. Camera
reveals frame the affected crossing, lift, link and exit; Tab retains manual overview.

### Maintenance control presentation

The campaign's `draft:maintenance` control uses
[`maintenance-render.ts`](../../src/slice/maintenance-render.ts): a compact hovering
screen and recessed industrial press pad, built from the existing Canvas metalwork
helpers. Four short animated signal filaments extend at most 64 world units to
either side. The housing floats above the existing contact point; it adds no
collision or hook surface. Filaments render behind the players and remain above
the ledge. Glow, hover and packet motion respect the existing reduced-motion and
paused/disconnected presentation policy.

Its presentation observes existing state only:

- **Unconfirmed:** muted blue-grey housing, dim telemetry and faint filaments.
- **Ready:** cyan display, mild pulse and visible signal packets only while the
  existing interaction hint offers `E · MAINTENANCE COMPLETE`. This preserves the
  grounded/elevation/range checks and cube interaction priority; jumping beneath
  the control does not make it usable. The ready caption carries `E · CONFIRM`
  below the object, replacing its overhead interaction hint so the prompt stays
  clear of the player and compact desktop session overlay.
- **Latched:** the accepted `frame.controls['draft:maintenance']` value turns the
  screen and filaments green, displays a checkmark, and seats the pad into closed
  catches. This appearance persists regardless of player proximity. Repeated E
  does not undo the commitment or replay its confirmation sound.

The campaign-only renderer leaves authored geometry, drafts, controller outputs,
completion/save logic and existing terminal audio unchanged. Other terminals keep
their existing rendering. `pnpm check:maintenance` replays the canonical real-input
HANDSHAKE route with focused state checks and normal-camera captures at 1600×900,
1024×768 and 800×600; use `BN_SHOTS` to choose the report directory.

The [2026-10-27 review](../playtest/2026-10-27-maintenance/review.json) retains
normal-camera [unconfirmed](../playtest/2026-10-27-maintenance/01-dormant-approach.png),
[ready/interaction](../playtest/2026-10-27-maintenance/02-ready-approach.png),
[completed](../playtest/2026-10-27-maintenance/05-completed-departure.png) and
[800×600 completed](../playtest/2026-10-27-maintenance/03-completed-green-800.png)
captures. Both players completed the 59-step route with zero deaths; the repeated
press left the latch and confirmation audio count unchanged. This is automated
physical and visual review, not human playtest acceptance.

## Intended two-player solution

1. One player holds CROSSING while the other jumps/hooks/swings to the alcove,
   picks up the payload and returns through the same powered route.
2. Put the cube on CROSSING and let both players leave: it preserves the power.
   Recover it, then let the partner hold LIFT while its carrier rides upstairs.
3. Stage the cube in the gallery and toggle LINK. The lower player leaves LIFT
   and uses the relay to join the carrier. LINK can be turned off again; either
   player can descend from the gallery's left side if necessary.
4. One player holds the cube beneath the maintenance ledge. The other jumps
   vertically onto it, then jumps sideways onto the ledge and commits maintenance.
5. Return the cube and both players through the relay. Rest the cube in PAYLOAD.
   Jump over it and physically enter the unlocked exit with both players.

The carriers and climbers are interchangeable. A cube on LIFT instead of a player
is also legitimate: enable LINK upstairs, retrieve it downstairs, and return by
relay. An early gallery visit does not bypass maintenance. CROSSING substitution
is a useful demonstration, not an extra artificial prerequisite in the controller.

## Measured physical constraints and shortcut review

The existing 120 Hz engine gives a full held jump rise of 127.4, versus 90.8 for a
short tap. A loose 44-unit cube raises the maximum feet height to 171.4 above the
floor; a grounded partner's held cube raises it to 209.4. The 190-unit unhookable
ledge therefore separates these cases. Terminal use requires grounded feet at
its elevation, so neither jumping beneath it nor pressing E from the held cube
can commit without landing on the ledge. No grapple slab is within 500 of this
boost area. An airborne carrier does not supply partner support.

The 600-unit crossing exceeds the measured ordinary/coyote jump envelope (the
independent sweep crossed up to 296.5 units at equal height). The browser solution
uses the actual near and far address bars in both directions, including rope
release and rope jumps. The anchors have no crumble timer: players can pause,
re-aim and retry. A release-only diagnostic missed the alcove, so the supplied
route intentionally uses the normal Space rope-jump control; its learnability
needs human acceptance rather than being described as an effortless walk.

Independent review reproduced a solo cube-pulling exploit through the original
alcove floor. The final floor uses `blocksCubeInteraction`, and the cube home is
100 units from the left wall, beyond a coyote-jump extraction ray. Thirteen real
input launch timings now fail to extract it. This is bounded adversarial evidence,
not proof against every possible input sequence.

## Failure and recovery

The crossing has no lethal pit. Missing a hook drops the player onto permanent
recovery flooring; two real jumps return to the bay. A dropped cube can be carried
back through the same recovery path. The partner can keep CROSSING powered while
the carrier retries. Gallery descent is safe even with LINK off. Resetting a
player uses the single central breakpoint after activation; it cannot place them
upstairs or commit maintenance. The exit stays locked until both required inputs
are simultaneously true, then preserves the existing latch behavior.

## Automated evidence

`levels/scenarios/handshake.json` is a 59-step, full-room, two-browser scenario from
the authored spawns. Its checkpoint step now observes automatic activation after
walking, without pressing E. The earlier terminal-based revision passed with
**both players completed and zero deaths** at
hash `15538dd03c12048dc7203cc76262ce67b4ca462a916d290791c4a286b82a0797`.
A second run of that earlier revision swaps both actor slots and also completes with zero deaths.
Both runs use real keyboard/mouse inputs and server cube grants, never state injection.
It observes cube substitution, lift ascent, relay travel, partner support,
maintenance, the still-locked exit before payload, live socket unlock and arrivals.

`tests/handshake-physics.test.ts` retains 17 tests: the 13 bounded extraction
attempts, real recovery, floor/loose-cube boost rejection and held-cube success.
Boost fixtures are explicitly section-only, and do not substitute for the browser
solve. Shared carry-clearance tests also cover pickup, ceiling, relay and firewall
behavior. The public integration check exercises graphical import, every saved
State Preview, local physics, exact JSON export, IndexedDB reload and two distinct
public-compatible custom-session identities.

Current draft and campaign SHA-256: `e05842d86169d80ec3d1b8f2b9de6a73ca1671fb30d0ec3784ad4f8efcb5cf06`.
The automatic-checkpoint update removes only the checkpoint control device; the
physical puzzle layout and its controller outputs are unchanged.

Earlier reports and screenshots: `.workbench/reports/2026-10-16-chambers/handshake/`.
`final/report.json` is the full solve; `swapped/report.json` tests exchanged roles; `final/trajectory-{host,partner}.json` records
measured paths; `measured-grapples.json` summarizes launch, attachment, swing
samples, release and subsequent landing for all four engagements. Named captures include `initial`, `powered-crossing`,
`cube-substitution`, `gallery-lift`, `relay-linked`, `partner-held-boost`,
`maintenance-complete`, `near-complete`, `exit-unlocked` and `completed`.
`overview.png` uses the actual PuzzleRenderer. Earlier iteration failures are
retained separately and are not presented as successful full-room evidence.

```sh
pnpm level:validate levels/drafts/handshake.json --json
pnpm level:render levels/drafts/handshake.json --out .workbench/reports/2026-10-16-chambers/handshake/overview.png
pnpm level:playtest levels/drafts/handshake.json --scenario levels/scenarios/handshake.json --report .workbench/reports/2026-10-16-chambers/handshake/recheck
```

## Critical gameplay assessment

| Criterion | Assessment |
|---|---|
| Central discovery | The same cube replaces a person, becomes their carried step, then becomes the exit payload. |
| Cooperation | Initial power and crossing separate the players; held support requires both in the gallery. |
| Readability | One visible machine, short functional labels and wires; inactive bars ghost. LINK's usefulness should be observed rather than explained verbally. |
| Physical movement | Two broad hooks and safe recovery are forgiving; the required Space rope jump may still challenge a first-time player. |
| Recovery | Misses return to the nearby bay, not a room reset. Cube mistakes remain recoverable. |
| Replayability | Either player can traverse, carry, operate LINK or climb; no identity permissions. |
| Shortcuts | The reproduced remote-pull bypass is closed. Early gallery visits and cube-powered lift alternatives preserve the held-boost discovery. |
| Complexity | One cube, two plates, two hooks, one lift, one relay pair and one maintenance commitment; no extra route latches. |

Human two-player acceptance remains required: check first-use grapple teaching,
the boost hint, camera framing while aiming, controller latency, optional lift
allocations, role exchange, recovery with a dropped cube, and actual blind solve
time. Campaign integration was requested separately; no human playtesting is claimed.

### Campaign regression after behaviour refinement

The current hash above passed all 59 canonical scenario steps in the five-room
campaign run, with both physical exit arrivals and zero deaths. Report:
`.workbench/reports/2026-10-16-checkpoints/campaign/handshake-report.json`.
The same persistent party completed all five rooms and passed reconnect and
server-restart recovery. The HANDSHAKE checkpoint was earned by walking without E; maintenance remained a deliberate interaction.
