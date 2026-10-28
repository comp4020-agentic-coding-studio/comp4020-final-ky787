# CROSSFEED VAULT v2

**PROVISIONAL UNTIL HUMAN PLAYTEST ACCEPTANCE**

Room ID `crossfeed-vault`; objective **ROUTE BOTH PAYLOADS TO THE VAULT**.
Starting HEAD for this revision: `c51f2215d8c55300e23e56229fb7aa8b102c0265`.
Pickup correction: `01f93060ce2252fa6a1794bcbbe23956fcba9cc9`.

Human testing found v1 mechanically successful but too linear and dependent on
permanent unlocks. V2 retains its two payloads, lift, service firewall, relay,
boost and final assembly. Reversible transfer configuration and two separate
cargo swing routes replace the continuous upper bridge. Unlike RACE CONDITION,
one route is selected for an entire traversal: the puzzle is configuring and
transporting resources while keeping the partner mobile, rather than rapid
alternation at every hook.

The controller is **mock-multiplayer / binary integration pending**. The firewall
and required unstable blocks are authored gameplay, not binary/obfuscator
evidence. No addresses, assembly, OLLVM provenance or proven bogus-block claims
are attached to this chamber. Human acceptance must precede contract freezing
and any matching binary generation.

## Pickup diagnosis

Before geometry changes, focused tests reproduced two independent failures:

- `cubeAvailable` suppressed the local pickup/pull action for A until B and B
  until C, despite a clear physical reach check and an unheld payload.
- The server's `cubeEnabled` rejected the corresponding epoch-qualified request.

Normal input was therefore not offered; bypassing that client guard produced a
server denial. There was no accepted pickup followed by an unexplained reset in
these reproductions. Both hidden CROSSFEED progression permissions were removed.
Physical geometry governs access. Holder/epoch arbitration, one held or pulled
cube per player, prediction, per-cube resets and the trusted-browser physics
model remain unchanged. PAIRING BAY retains its legacy behavior.

The pickup commit's tests cover both slots and both payloads, accepted prediction
retention, pickup/drop/pull, competing requests, reset isolation, party selection,
Race-to-Crossfeed replay, reconnect and process restart. Its real-input two-browser
route picked up A **before B**, then completed v1 with the corrected interaction.

## One interconnected machine

The authored world remains 4320 × 1780. Several destinations are visible before
access. The first-entry and Tab overview give a map; local plate/control reveals
show affected machinery without solution text.

| Region | Physical role |
| --- | --- |
| Central floor, y=1500 | Universal A, distinct lift payload socket, first gap |
| Access balcony | Cube A and reversible TRANSFER MODE B |
| Central lift | Temporary cargo power, permanent supply after SYSTEM ONLINE |
| Upper-left catwalk, y=750 | SYSTEM ONLINE, ROUTE POWER, ROUTE SELECT, safe checkpoint |
| Lower service bay | Cube B, R1, independently opened service door |
| Service passage | Walking body fits under a static horizontal cube-filter firewall |
| Upper-right gallery, y=940 | R2; partner boost reaches D at y=750 |
| Left/right upper routes | Three hook slabs each, including one required unstable block |
| Lower recovery deck, y=1120 | Safe falls, lift return, short stairs to the gallery |
| Vault cargo deck, y=650 | Interchangeable payload sockets E/F |
| Vault crown, y=350 | Two biometric scanners and physical two-player exit |

### Lower configuration and logistics

Initially B is off. A accepts either body or a resting cube, but both cubes begin
beyond the initial accessible area. A powers the first grapple anchor; a partner
swings to B. Turning B on creates the return bridge and disables the anchor and
relay. It is a reversible lever, not a permanent unlock.

A cube in the visibly distinct lift socket temporarily powers the lift. The upper
SYSTEM ONLINE terminal (C) permanently powers it and opens the service bay. The
adjacent automatic breakpoint separately saves the upper checkpoint. It never moves a living partner. **Service access does not
follow relay power**, so changing B cannot seal a player inside the service bay.

The `system-online` BREAKPOINT pedestal at (1120, 750) activates automatically
when either player walks through at floor level. Its accepted `upper` checkpoint
raises the existing flag independently of the SYSTEM ONLINE terminal at (1210,
750). SYSTEM ONLINE still requires E and alone controls its real machinery.
Old saves where the switch and checkpoint were committed together remain valid;
new saves permit either ordering. Each slot keeps its own upper respawn marker.

Configure B off for relay transfer. The entry anchor can also help return across
the first gap; after retrieving A, using it on the universal entry plate is a
legitimate alternative to keeping a body there.

Cube B cannot fit through the service passage: the walking body is 34 high, the
loose payload is 44, and the space under the beam is 36. The long roof leaves
only 42 above the beam, preventing a simple cargo jump/pull over it. A carrier
whose body stays below the beam survives while only the payload resets. B resets
to its own service spawn; A and the partner are unaffected. Powered R1/R2 is the
natural transport solution. Carried/loose transit, individual relay cooldowns and
safe egress around resting shared cubes reuse the accepted implementation.

### Gallery and cargo routes

Either partner holds B overhead while grounded; the other lands on it and makes
a second normal jump to D. A normal or resting-cube jump is too low. Even a
powered right route begins above grapple reach from a floor or resting-cube
jump. D is a one-shot terminal providing **local gallery launch/regroup steps
only**, including a short raised launch step that keeps the first high anchor
visible in the normal follow camera.

ROUTE POWER is universal. ROUTE SELECT is a reversible lever within reach of
its operator. The selected branch can be changed before power exists; no
progression boolean refuses an ordinary lever operation.

The left route has wider lateral transfers and a descending final catch. The
right starts with a higher launch jump from the gallery, then descends toward
the vault. Each has three real hooks, with `crumbleA` / `crumbleB` as its middle
unstable support. Payload remains accepted and overhead while swinging; there
is no separate cargo traversal implementation. Fixed-step feasibility checks
exercise each route alone and carrying either A or B.

Both unstable blocks use a shared **1650 ms** hook/foot fuse, **2400 ms** collapse,
and normal respawn. Switching routes neither restarts nor cancels the fuse.
Broken state cancels attached ropes on both clients. Required use is game design,
not claimed native bogusness.

Accepted route power falls retain the previous physical route for **325 ms**.
Resolved wires and ghost appearance change immediately, with a brief fade toward
the inactive outline; the server owns physical expiry.
New power is immediate. A **650 ms** selector interval prevents repeated toggles
from sustaining both branches indefinitely. Local lever/branch presentation
predicts through the existing action-result reconciliation; collision follows
accepted state. Body release/disconnect also gets the bounded grace.

### Final assembly and regrouping

One player normally powers/selects routes while the other transports A and B.
Transport order and roles are interchangeable. The permanent lift, gallery
steps and low recovery deck make the second journey shorter. A failed route
has safe recovery; local R returns to the shared upper checkpoint and releases
only that player's controlled payload.

Two distinct cubes in opposite payload sockets power both final approaches and
**VAULT RETURN**, a safe bridge/step connection for the operator to leave the
catwalk and regroup. Either A-left/B-right or B-left/A-right works. One cube has
one placement; each payload socket has single capacity. Held/pulled cubes count
for no socket. Removing either payload removes momentary vault power. Safe decks
remain below; cubes are not consumed.

A visible bulkhead separates the two cargo bays beneath the crown. Without it,
the low recovery route allowed both payloads to use the left path, making the
right-hand contraption optional. The bulkhead blocks walking, ordinary jumps,
through-wall pickup/pull and drops across the bays. It opens with the permanent
exit latch for subsequent free recovery. Either payload may still use either
approach; no cube-ID permission decides its destination.

Two distinct players must then occupy opposite biometric scanners while both
payloads remain docked. This permanently unlocks the exit. Both must subsequently
physically enter; one player arriving twice is insufficient. The existing shared
campaign victory, host NEXT/CHOOSE controls and same-code transitions are reused.

## Provisional coordinate-free contract

Wire identifiers B/C/D are retained as `switchB/C/D` to keep device identity
stable; they now mean transfer mode, system-online terminal and gallery terminal.
V2 has its own explicit chamber revision, so old saves are never interpreted
under these changed semantics.

| Output | Rule |
| --- | --- |
| `grappleAnchor` | `entryOccupied AND NOT switchB` |
| `bridge` | `switchB` |
| `liftField` | `cubeOnLiftCargo OR switchC` |
| `serviceAccess` | `switchC` |
| `relayGates` | `switchC AND NOT switchB` |
| `leftRoute` | `switchC AND routePowerOccupied AND NOT routeMode` |
| `rightRoute` | `switchC AND routePowerOccupied AND routeMode` |
| `galleryAccess` | `switchD` |
| `vaultPower`, `vaultReturn` | `cubeOnFinalLeft AND cubeOnFinalRight` |
| Exit candidate | `vaultPower AND finalScannerLeft AND finalScannerRight` |

The server latches `exitUnlocked` from the candidate. `exitDoor` presents it.
Distinct authored signals live in `ControllerFrame.signals`; no unrelated
machinery is forced into the validated seven-output C8 contract. Compatibility
frame outputs `codePlatformA/B` present gallery/vault state to existing audio/HUD
code, without representing the two main routes as permanently unlocked.

## Presentation conventions

Inactive controlled slabs remain 25% ghosts, unhookable/non-solid after grace.
Wires show resolved destination power; inverse relay/left-route branches have
NOT markers. Ordinary plates look alike and accept either kind of occupant.
Payload sockets use compact tech [PAYLOAD RECEIVER interfaces](payload-receiver.md)
with amber awaiting/cyan detected status. The two biometric vault scanners use the
shared animated pressure-pad art, idle amber and pressed blue, plus body-height
rails that turn cyan while occupied.
Toggle levers and one-shot terminals have visibly different drawings.

Room-owned `cameraReveal` metadata gives A the entry gap/anchor, B a brief transfer
view, and ROUTE POWER both upper paths plus the vault. Repeated ROUTE SELECT
operations under a held plate retain the same camera target. Only a local body
or local interaction edge requests a reveal. Remote occupancy and stationary
cubes do not move the camera. Tab/initial overview takes priority; step-off,
death, disconnect and level transition release/reset contextual framing. During
a reveal/overview the party HUD compacts to code/copy and connection status,
so it does not obscure the high route anchors; normal follow restores details.

## Persistence and recovery

Party schema remains **version 6**. CROSSFEED's `levelState.chamberRevision = 2`
marks this contract. Durables are B, C, D, route selection, per-cube semantic
placements, checkpoint, unlock and two arrivals. New placements `entry` and
`routePower` represent universal plates alongside spawn/liftCargo/finalLeft/
finalRight. Each spawn remains individual. Body occupancy, grace/crumble clocks,
holders, transforms, velocities and epochs remain transient.

A validated v1 CROSSFEED record (v5 or v6) migrates deliberately: preserve code,
reserved visitors/host and existing campaign badges; restart an unfinished
attempt with clean v2 switches, individual spawns and entry checkpoint. Advance
the level-instance generation, revoking old gameplay traffic. An untouched lobby
remains a lobby. A completed v1 victory remains victory with its badge and an
explicit `legacyVictory` marker; it does not invent solved v2 controls. Replay
creates clean v2 state and removes that archival marker. Migration fsyncs before
join acknowledgment, including migrations within schema 6.

RACE records, hidden labs, older lab migrations and personal C8 progress are
unchanged. Named-cube arbitration/epochs and party identity remain as described
in [ADR 0007](adr/0007-named-shared-cubes.md) and
[ADR 0009](adr/0009-persistent-coop-parties.md).

## Validation and human acceptance

Focused pickup, routing, world, migration, camera and swing tests accompany the
real-input `pnpm check:crossfeed` route. It starts through CREATE PARTY and host
selection, exercises lower reconfiguration, B's firewall/relay transport, actual
boost, both three-hook cargo paths and shared unstable fuses, operator regroup,
scanners, two arrivals and victory. Server tests cover both socket assignments;
physics tests carry either payload over either route. The reversed
scenario swaps roles. `pnpm check:campaign` additionally protects replay,
transition generations, reconnect/restart and RACE completion. Browsers are muted
and diagnostic snapshots are read-only. Milestone results are recorded in the
dated handoff; automated feasibility is not human puzzle acceptance.

Known limits and playtest questions:

- Contact reports retain the trusted-browser model, not server physics/anti-cheat.
  Remote boost still uses accepted holder state plus fresh interpolated grounded
  avatar presentation, with no airborne carrier elevator or momentum transfer.
- This is not an exhaustive movement solver. Creative rope jumps, extra boosts,
  alternate payload order and cube-held ROUTE POWER should be explored. Keep
  cooperative alternatives that preserve the logistics instead of forbidding
  them with invisible permissions.
- Is configuring B clear and useful, or does returning to it feel tedious?
- Does the filter communicate that walking bodies fit but overhead cargo does not?
- Do the two routes feel different and substantial with cargo? Are 1650 ms fuses
  forgiving enough, and does 325 ms grace behave comfortably on real networks?
- Can the operator see the runner and understand branch changes? Are labels,
  ghosts and wires legible without adding solution text?
- Is retrieving the second payload thoughtful positioning or dull backtracking?
- Is both-payload regrouping discoverable? Try removing a socket cube mid-approach.
- Look for cargo traps, bypasses, disconnect/recovery problems and safe checkpoint
  behavior in either mode. Does each player have enough to do?

Manual checklist: create/select/join; swap entry roles; pick up/drop/pull both
payloads; change B repeatedly; lift temporarily then commit C; walk the filter,
try carried/loose/pulled B, relay both ways leaving B at an exit; boost with either
holder; operate/preselect/release routes; use and overstay each unstable hook;
fall/recover with cargo; deliver sockets in both assignments; regroup and use
opposite scanners; leave scanners and enter separately; replay, reconnect and
restart; disconnect a holder/operator while the partner is on a route.

Stop for two-computer acceptance. No next chamber or binary generation in this pass.
