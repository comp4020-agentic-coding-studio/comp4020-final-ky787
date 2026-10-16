# DEADLOCK — cooperative chamber

DEADLOCK is an authored/mock Level Builder chamber, independent of
CONTROL SPINE evidence. Its central discovery is that the last cube cannot remain
as a weight: both players must power its ascent, then the FEED operator changes
routes and catches it with a manually closed hatch. The JSON is authoritative for
this chamber; neither this document nor its physics reports claims binary evidence.

- Editable draft: `levels/drafts/deadlock.json`.
- Released campaign snapshot: `levels/campaign/deadlock.json`, promoted unchanged
  on explicit request, 2026-10-16. See the [integration contract](../adr/0010-json-coop-campaign.md).
- Authored-start, two-browser full route: `levels/scenarios/deadlock.json`.
- Authored-start, two-browser loose-cargo diagnostic: `levels/scenarios/deadlock-cargo.json`.
- Isolated real-engine checks: `tests/deadlock-physics.test.ts`.
- Reports and screenshots: `.workbench/reports/2026-10-16-chambers/deadlock/`.
- Current route: all 71 authored-start steps passed with both arrivals and zero
  deaths, retaining all three delivered payloads while the lower player returns
  through service. Human editor and two-player acceptance remain pending.

## One connected machine

The lower allocation floor is at y=3000. FEED at x=400 and SAFE at x=1500
are ordinary plates, accepting resting cubes or players. Their 1100-unit
separation prevents one body or cube from covering both. Three named cubes begin
loose on that floor. The cargo lift occupies x=600..720, from y=80 to the lower
floor. Its horizontal firewall crosses the shaft at y=2500.

The upper gallery and full-solid HATCH are at y=1000. The hatch starts closed;
a reversible HATCH toggle sits at x=785 on permanent gallery floor. Three upper
sockets, x=1030/1250/1470, accept cubes only. Their AND unlocks a latched exit
requiring two independent player arrivals.

The lower personnel relay is in a left-hand branch with 38 units of clearance.
Its upper endpoint also has 38 units of clearance. A bare player is 34 units tall;
a loose cube is 44, and the carried player/cube envelope is 82 high and 44 wide.
The restriction is physical architecture. There is no player-only relay flag,
cube permission list or special controller exception. Both roofs, the gallery,
and the hatch block cube interaction through their solids. The upper roof leaves 80 units of safe gallery between its entrance and the
hatch, and is an 80-unit step, allowing carried payloads to hop around it on the gallery without
using the personnel passage. Architecture remains unhookable.

The lower floor is the authored room start and respawn location. There is no
visible breakpoint, checkpoint terminal or checkpoint marker in this chamber.

## Coordinate-free contract

| Output | Expression | Physical destination |
| --- | --- | --- |
| `cargoLift` | FEED AND SAFE | Cargo lift power |
| `shaftFirewall` | NOT SAFE | Horizontal shaft firewall |
| `serviceRelay` | (SAFE AND NOT FEED) OR `payloadReady` | Both personnel relay endpoints |
| `hatchOpen` | HATCH toggle value | Full-solid hatch opening |
| `payloadReady` | PAYLOAD 1 AND PAYLOAD 2 AND PAYLOAD 3 | Latched two-arrival exit |

The first three expressions are the coupled machine. All three live payload
sockets also power service, allowing the lower player to leave SAFE and ascend
after delivery. This OR observes the current socket AND, not the latched exit:
removing any delivered cube can withdraw that completion-powered service, while
the exit remains unlocked. The last two outputs describe the manually operated
hatch and completion. Functional wires
observe resolved bindings. The SAFE-to-firewall wire and FEED-to-service wire
show NOT labels; the Boolean expressions are inverted once, without inverting
power a second time in presentation. Camera reveals frame related machinery
while an operator holds a plate, or after a hatch interaction. Holding FEED
frames the entire shaft, including the final hover, so departure does not depend
on an invisible cargo position. SAFE frames the lower firewall and allocation
floor; HATCH frames the catch and hover headroom.

## Intended physical solution

1. Put B on SAFE and stage loose C on the shaft
   floor. With FEED empty, the bare upper operator takes the personnel passage
   to the gallery and opens HATCH. The lower player keeps A clear of FEED.
2. Put A on FEED. A and B now power the lift while loose C rises through the open
   hatch. The upper operator closes HATCH below C. The lower player retrieves A
   and steps clear of FEED, letting C land on HATCH. Collect C and deliver it to
   the far socket.
3. Reopen HATCH. Stage A loose on the shaft floor, then have the lower player
   stand on FEED. A rises while B still holds SAFE. The upper operator closes
   HATCH; the lower player steps off FEED; A lands on HATCH. Deliver it to the
   middle socket. This replaces a cube weight with a player.
4. With FEED empty, the upper operator returns through service. One player holds
   SAFE while B is removed and staged on the shaft floor. The other stands on
   FEED. The loose last cube rises alone to the top of the lift.
5. Leave FEED while SAFE stays held. The lift stops and service activates. Run
   through the low passage, arrive on safe gallery floor, and close HATCH before
   B falls to its height. Pick up the caught cube, hop the short service roof,
   and fill the near socket. All three payloads latch the exit.
6. Keep all three cubes in their sockets. Their live AND now powers service, so
   the lower player can leave SAFE and use the personnel relay with both lower
   plates empty. Both players hop over the delivered cubes and physically arrive
   at the exit. The payloads remain ordinary accessible objects throughout; none
   needs to be carried back to SAFE.

The complete recorded route takes a valid alternative for deliveries one and
two: the cargo handler carries those cubes up the powered lift, while the two
resting weights and then a player on FEED provide power. It still performs the
final two-player ascent, FEED-to-relay handoff and manual HATCH catch exactly as
described above. The separate `deadlock-cargo.json` diagnostic exercises the
intended loose-cargo method for the first two deliveries from the authored
start; its scope ends before the final challenge.

## Measured feasibility and the repaired blocker

The initial real `DraftRuntime` diagnostic exposed a shared engine defect: a
carried cube was posed above the character after movement, without full-solid
collision. A bare player and a carrying player both crossed a 38-unit corridor
from x=100 to x=676.083 in the same input sequence. The cube clipped through its
ceiling. `clearance-before.json` retains that result; it is a labelled isolated
diagnostic, not successful room evidence.

The shared physics now resolves a carried payload envelope against full-solid
walls and ceilings, while preserving the ordinary feet and one-way platform
behavior. The same isolated test stops the carrier at x=178 before a wall at
x=200, admits the bare player, prevents upward cube penetration, and still lets
the player jump through and land on a one-way platform. Generic pickup clearance
also rejects acquiring a cube where the overhead carried pose would intersect
architecture. `clearance-after.json` retains the measured result.

The isolated shaft fixture uses the real engine and actual movement/E input,
with a clearly labelled SAFE partner-contact override. It measures a maximum
rise speed of 240 units/s and hover center y=102 above a lift top at y=80. With
hatch y=1000 and lower floor y=3000, the operator left FEED, traversed the relay,
and closed the hatch in 0.225 seconds after lift power ended. The cube reached
the hatch 0.633 seconds later. This margin comes from shaft headroom, not a
hidden timer, grace period, automatic latch or catch trigger. The successful authored-start two-browser route measured a 0.350-second gap
from lift power loss to HATCH closing, followed by another 0.500 seconds before
the cube landed on HATCH at center y=978. `network-catch-measurement.json` records
the actual final run: power off at 58.250 seconds, hatch closed at 58.600 and
cargo caught at 59.100. The full-room report is completion evidence; the isolated
fixture alone is not.

A recovery diagnostic then exposed a second collision edge: treating the entire
carried assembly as 44 units wide down to the player's feet could push a carrier
from the gallery lip at x=711 to x=1862. The final shared fix resolves the actual
22-by-34 avatar and the separate overhead payload. A retained regression steps
through that measured lip contact, brakes in the shaft and lands on the lower
floor with the cube still carried and zero deaths.

The loose-cube diagnostic pulls a cube toward a 38-unit service entrance with a
real grapple. Its 44-unit collider cannot enter. Both relay destinations also
retain the existing full-payload egress validation. The eight focused mechanics and contract
checks currently pass; they establish components, not all-route completion or
shortcut absence.

## Failure and recovery

- A missed catch drops the last cube back to the lower shaft floor while SAFE is
  held. Reposition the two players, raise it again and retry. A closed hatch
  blocks ascent physically, so open it before the next launch.
- Releasing SAFE energizes the shaft firewall. Only the contacted named cube
  resets to its own lower home; other delivered cubes are not globally recalled.
  Player deaths return to the authored lower room start. Recover the affected cube
  through the same machine.
- Removing a socket cube before all three are simultaneously filled does not
  unlock the exit. After the three-way AND has occurred, the exit stays latched. Service still
  observes live payload occupancy: removing any socket cube turns off its
  completion branch, so retain all three while the lower player ascends. The
  ordinary SAFE AND NOT FEED branch remains available independently.
- The lower floor is continuous and safe; there are no unrecoverable pits. All
  three payload sockets are reachable from the gallery. The upper roof provides
  a modest hop around service, including when carrying a payload.

A legitimate alternative allocation uses a player on FEED for the first
delivery, with a cube on SAFE. A separately labelled real-engine section probe
also recovers the final cube with HATCH left open. Starting from hover center
(660,102), with SAFE held and FEED released, it waits 0.575 seconds for relay and
approach allowance, hooks the falling cube from (735,983), releases it onto
permanent ground, picks it up and hops the personnel roof. It ends with the
player at (1060.17,983) holding the cube, zero deaths and HATCH still open. The
report is `physics/deadlock-pull-catch.json` under the dated chambers report
root, using draft hash `b72226f19b90fbeb2ea8a8b35915af8de9afe7c3001ea491bdac53cc662d1b29`.
This is section-only engine evidence, not a full-room or network proof. That preserves both players holding
plates for ascent, the SAFE partner hold, the FEED-to-service handoff and physical
cargo recovery. The primary recorded route demonstrates the requested manual
HATCH catch; the hatch is useful and readable rather than the sole possible
catch. This alternative needs human acceptance, not extra permissions or gates.

The engine-blocker alternative would have been low relay egress alone: that
rejects carried teleportation but still lets a cube clip through the approach
ceiling. It was rejected because it does not satisfy physical passage exclusion.
A role-specific relay permission or timed automatic catch would also change the
central concept and was not introduced.

## Gameplay quality review

| Criterion | Assessment and remaining question |
| --- | --- |
| Central discovery | The diminishing cube supply changes two weights into one player, then two players, then a falling payload caught with HATCH. Human testing must establish whether the last substitution is an earned insight. |
| Cooperation | SAFE and FEED are widely separated; the final ascent needs both players, then a coordinated SAFE hold during the operator's relay trip. A one-player browser preview cannot certify completion. |
| Readability | Labelled plates, resolved wires, NOT labels, hatch control and camera reveals expose the machine. The tall shaft is legible in context views but the whole-room overview is dense; human readability review is needed. |
| Physical movement | Carrying, lift exit, a short roof hop, personnel transfer and the manual catch change the route without adding unrelated challenge rooms. The long ascent and recovery descent may feel slow and need playtesting. |
| Recovery | Missed catches return cargo to safe lower ground; named firewall resets are independent; the room start remains on safe lower ground. Three delivered payloads free the SAFE operator by powering service directly. |
| Replayability | Either player can carry, hold SAFE or operate FEED/HATCH. The stored route uses one assignment; a role-swapped human run remains untested. |
| Shortcuts | There is no hookable geometry bypass, one cube cannot cover two sockets, and the service passages reject cube dimensions. Ordinary plates also permit a player to occupy FEED on the first delivery; that is a valid allocation alternative. An isolated real-engine probe confirmed a falling-cube grapple catch as an alternative to HATCH. It preserves the final two-player plate allocation and FEED-to-service handoff; HATCH is not an exclusive catch method. Human acceptance must judge this alternative. Code review and one solve are not exhaustive shortcut/softlock searches. |
| Complexity | Five architecture pieces, one lift, one firewall, one relay pair, two plates, one toggle and three sockets support the same allocation problem. The live payload AND also keeps service available at completion; no extra visible checkpoint or unrelated gate sequence is added. |

## Actual validation and remaining limits

Current draft and campaign SHA-256: `45fe70810ec108ee6671f97056024642f0491c68c08bccfbde078bda4d1b3fc0`.
The current full scenario removes the checkpoint interaction and obsolete
payload-return sequence. It asserts that both lower plates are empty while
service remains powered by all three sockets, then requires the lower player
to make the real personnel ascent. Final assertions keep every socket occupied
and require both physical exit arrivals.


The historical `route-11/report.json` is a successful full-room network proof for the earlier
SHA-256 `b72226f19b90fbeb2ea8a8b35915af8de9afe7c3001ea491bdac53cc662d1b29`, on
engine revision `f90fab59b0b35995ec36455402f8056d651d3a0f-dirty` with the retained
working-tree collision repairs. It records 87 successful steps, distinct browser
identities, zero deaths for each actor, both arrivals, all three payload sockets,
the final manual hatch catch and the former SAFE replacement ending. That
postdelivery cube-return ending has been replaced in the current scenario by
physical personnel ascent with all three payloads left in place. Its first two cargo
deliveries use the carried alternative described above. Simulation time is approximately
83.7 seconds. The scenario uses only keyboard actions, walks, waits and detached
observations, with no starts away from spawn, output forcing or body placement.

`cargo-03/report.json` separately passes all 49 steps of the intended first two
loose-cargo deliveries from the same authored start and hash. In the first hover,
A rests on FEED, B rests on SAFE, the lower player stands clear at x=540.1, and the
upper player waits on the gallery. C remains loose throughout its ascent. After
the upper player manually closes HATCH and the lower player releases FEED, C
lands on HATCH at y=978. The second delivery replaces A on FEED with the lower
player and repeats the loose ascent and manual HATCH catch for A. Both payloads
are delivered to separate sockets, B remains on SAFE, and neither player dies.
`loose-cargo-measurement.json` extracts the relevant observed states. This is a
bounded diagnostic: its final state deliberately has two filled sockets, the
exit still locked, and the final challenge still to do. It supplements the
complete route without claiming another full solve.

The earlier eight focused tests passed. The current JSON validates with no diagnostics.
The independent browser integration report at
`.workbench/reports/2026-10-16-chambers/integration/report.json` also passes the
earlier hash through graphical import, preview, play/stop, export, IndexedDB
reload, public two-player snapshot/spawns and editor isolation. It does not
substitute for the full physical route.

Historical route captures, each recorded for both actors, are
`stage-02-two-weights-operator.png`, `stage-03-player-substitution-operator.png`,
`stage-04-final-hover-operator.png`, `stage-05-hatch-catch-operator.png`,
`stage-06-three-payloads-operator.png`, `stage-07-safe-recovery-operator.png` and
`stage-08-complete-operator.png` under `route-11/`. `overview.png` uses the actual
PuzzleRenderer. Earlier route reports retain unsuccessful automation attempts:
wrong checkpoint observation, walking into loose cubes, insufficient relay
cooldown, a facing-dependent drop and a recovery approach. The first loose-cargo
attempt also left the lower player overlapping FEED after lifting its weight;
the retained scenario explicitly walks clear before expecting the cargo to fall.
These failed attempts are not counted as successful full-room proofs. The isolated gallery recovery also found the
carried-edge ejection defect described above; it was repaired before the final
successful network run.

Human acceptance is still needed for the long lift travel, reduced overview text
size, the revised completion-service route, role-swapped play and comfort of
the half-second catch margin. One full solve and focused diagnostics do not prove
all shortcuts, all recovery branches, latency conditions or softlock absence.
Campaign availability does not resolve these human-playtest questions. No new binary evidence is included.

## Reproduction

```sh
pnpm level:validate levels/drafts/deadlock.json --json
pnpm exec vitest run --config vitest.unit.config.ts tests/deadlock-physics.test.ts
pnpm level:render levels/drafts/deadlock.json --out .workbench/reports/2026-10-16-chambers/deadlock/overview.png
pnpm level:playtest levels/drafts/deadlock.json --scenario levels/scenarios/deadlock.json --report .workbench/reports/2026-10-16-chambers/deadlock/full-room
pnpm level:playtest levels/drafts/deadlock.json --scenario levels/scenarios/deadlock-cargo.json --report .workbench/reports/2026-10-16-chambers/deadlock/loose-cargo
```

Further puzzle or binary-contract expansion still needs manual editor and
two-player acceptance. Reports are evidence of their stated scope, not proof
of all possible play.

### Campaign regression after behaviour refinement

The current hash above passed all 71 canonical scenario steps in the five-room
campaign run, with both physical exit arrivals and zero deaths. Report:
`.workbench/reports/2026-10-16-checkpoints/campaign/deadlock-report.json`.
The same persistent party completed all five rooms and passed reconnect and
server-restart recovery. DEADLOCK retained all three socket cubes through the final personnel relay trip and both arrivals.
