# Multiplayer mechanics laboratories

The room-code, symmetric two-player, shared-cube and prediction foundation was
manually accepted on two physical computers. Subsequent two-player mechanics-lab
testing reproduced a loose-cube relay obstruction. The 2026-10-11 pass starts at
`81422495b19e16b931b51ae298381f7970f3b1a2`, fixes that obstruction and adds BOOST LAB
to the four existing **authored mock test rooms**. The revised relay behavior and
partner-held boost await two-computer acceptance; these are not a final campaign.

C8's four single-player rooms, anonymous visitor progress and retained CONTROL
SPINE controller remain independent. No accounts, matchmaking, new binaries,
player-player collision, server player physics, or invented assembly are added.
See [ADR 0001](adr/0001-multiplayer-authority.md),
[ADR 0002](adr/0002-shared-cube-authority.md),
[ADR 0003](adr/0003-multiplayer-prediction.md),
[ADR 0004](adr/0004-coop-labs-and-transient-machinery.md), and
[ADR 0005](adr/0005-partner-cube-support.md).

## Architecture and deployment

```text
Browser A / Browser B
    local avatar physics + optional granted cube simulation
    authored geometry → semantic physical reports
                         ↓ HTTPS / WSS, same origin /ws
    existing Node server :8080
    membership + coordinate-free level reducers + ephemeral machinery clock
                         ↓ accepted shared outputs
    frontend authority adapter → existing world machinery / presentation
                         ↓ durable logical progress only
    /data/rooms/<CODE>.json
```

The existing Fly app still uses one Node process, one machine, 256 MB, one `/data`
volume and the same HTTP/WebSocket port. `ws` 8.22.0 remains the sole production
dependency. No new runtime dependency or service is needed. Vite proxies `/api`,
`/readme` and `/ws`; `pnpm dev` starts Vite and the existing backend together.
Fly terminates TLS; browsers select `ws`/`wss` from the page URL. Upgrade requests
require the visitor cookie and same Origin/Host. Docker copies the shared
protocol and coordinate-free server modules, never research `Workspace` files.

| Module | Responsibility |
| --- | --- |
| `src/coop/protocol.ts` | Level IDs, discriminated wire state, strict message validation |
| `server/coop-state.ts` | Common session schema, durable projection and migration |
| `server/level-definitions.ts` | Small coordinate-free lab definitions |
| `server/pairing-state.ts` | Accepted PAIRING BAY rules and legacy record reader |
| `server/multiplayer.ts` | Membership, sequencing, serialized mutations, disk acknowledgment, stream forwarding |
| `server/crumble-state.ts` | Ephemeral semantic phase/deadline transitions |
| `server/cube-state.ts` | Shared cube grants, exclusive pull, epoch/sequence checks |
| `src/coop/labs.ts`, `pairing-bay.ts` | Hand-authored geometry and slot-specific spawns |
| `src/coop/lab-authority.ts`, `authority.ts` | Level adapters, local sensors, common physical arrival reporting |
| `src/coop/client.ts`, `prediction.ts` | Session lifecycle, responsive local interaction, result reconciliation |
| `src/coop/cube.ts`, `remote.ts` | One-body simulation boundary and bounded presentation interpolation |
| `src/slice/world.ts` | Reused player/cube/relay/lift/grapple/collision machinery |

Without `WorldAuthority`, C8 retains its existing controller and local crumble
path. With authority, sensors report intent and accepted outputs drive machinery.
Campaign `ROOM_IDS` remain exactly pressure, switch, relay and uplink.

## Sessions, menu and level model

The **CO-OP LABS** menu offers a CREATE button per lab and one room-code JOIN.
The creator supplies a `CoopLevelId`. The joiner supplies only the code; the
snapshot selects both geometry and authority adapter. There is no requirement
to separately select matching rooms. Codes still use four characters from
`ABCDEFGHJKMNPQRSTUVWXYZ23456789`, with trimming/uppercasing, collision retries
against loaded and persisted rooms, and distinct invalid/unknown/full errors.

| Level ID | Lab | Durable level state | Cube | Exit unlock |
| --- | --- | --- | --- | --- |
| `pairing-bay` | Shared inputs, grapple, cargo, handoff | `switchB` | yes | B + cargo + opposite final body plates |
| `relay-lab` | Player / loose / carried relay transport | `relayEnabled` | yes | Relay power latch |
| `lift-lab` | Shared vertical transport / checkpoint | `liftLatched` | yes | Upper latch/checkpoint |
| `crumble-lab` | Shared step / hook unstable blocks | `tested.foot`, `tested.hook` | no | Both trigger styles accepted |
| `boost-lab` | Partner-held cube boost / return steps | `routeLatched` | yes | Upper shared switch |

`SharedRoom` is a union discriminated by `level`. Common session fields are code,
revision, assigned/connected slots, checkpoint, cube/semantic placement when
applicable, `exitUnlocked`, `reachedExit[2]`, and `completed`. `levelState` contains
only that lab's inputs/outputs, latches, or ephemeral phases. A crumble room has
`cube: null` and `cubePlacement: null`. Durable records use the same level tag
with a separate, smaller level-specific state; runtime phases never leak into it.

`GET /api/identity` establishes the existing anonymous HttpOnly `bn_visitor` UUID
cookie (SameSite=Lax, one year, Secure over HTTPS). The UUID owns a reserved slot;
the code selects a session. Exactly two visitors can join. Slots identify
identity, reconnect, stream attribution, avatar colour and distinct arrivals.
They never assign operator/rider/runner roles. A disconnected slot stays reserved.
A second tab with the same cookie replaces that slot's old socket, revoking its
rights before queued actions can run. There are no spectators or accounts.

Room code/COPY CODE, lab, local slot, partner status and arrival count remain
visible. The tab remembers the code in sessionStorage and rejoins after refresh;
another tab/profile can enter it manually. Play begins after the authoritative
snapshot. Leaving returns to the individual's C8 menu and save. Co-op never
writes campaign progression. Pause releases momentary occupancy, stops local
input and cancels pull; a connected background body may continue holding a plate.

## PAIRING BAY preservation

The accepted 2,200 × 780 geometry is unchanged. Either player holds Plate A while
the partner grapples the enabled slab across the 420-unit gap; either latches B.
B powers the return bridge, unlocks cube interactions and saves reunion. The
shared cube at (1190,538) can be carried, dropped, handed off or pulled onto the
cargo plate (1310,560). Only resting uncarried cargo powers the final access step.
Body occupancy cannot substitute for cargo. Static architecture is unhookable;
ghost code is non-solid and enabled slabs accept hooks across their address bar.

Each body reports one of plateA/finalLeft/finalRight/null. Two distinct connected
bodies on opposite final plates, with B and cargo active, permanently unlock the
exit. Leaving plates or removing cargo cannot close it. The 130 × 140 physical
exit remains at (2030,200); both bodies must subsequently reach it. Switch B's
local prediction, cube pickup/drop/pull prediction, handoff arbitration, cargo
phase and completion behavior retain the accepted contracts.

## Relay synchronization

RELAY LAB reuses `RelayGatePair.teleport('player', ...)` in each player's own
browser. Either player latches shared power with E. Both local gate pairs derive
power from accepted `relayEnabled`; neither gate coordinates nor cooldowns are
networked. The server does not perform teleports. The receiving floor sits below
Gate B so loose cargo falls clear of its arrival volume; jump into B to return.

The granted cube browser alone executes `teleport('cube', ...)` for loose cargo.
Transit keeps holder, physics authority and cube epoch. A carried cube follows
its holder, using the existing carried-height clearance. A cube held by the
partner never enlarges the local player's clearance or emits local cargo transit.
The original obstruction test accidentally included the resting shared
`cube-body` alongside authored solids. A cube left at a receiving gate could
therefore reject every subsequent player. Current RELAY LAB reproduces this
permanently B → A; A → B falls clear on its lower receiving floor.

Player egress now separates that shared cube from authored blockers. The normal
destination must still pass every enabled authored-solid and room-bound check.
If occupied by the resting cube, the player exits just beyond it on the gate's
outward side (two-unit gap, at most 96 units of adjustment). The entire alternate
payload box must also pass those checks. No cube is moved or duplicated. An
ignore-only approach was rejected because ordinary collision could push the
arrival back into the gate. Unsafe walls, floors, doors and room bounds still
reject transit. Partner-held support is never in either clearance list. C8's
clearance inputs, cube transit and all per-entity cooldowns are unchanged.

The next player/cube stream snapshot carries `discontinuity: "relay"` after a
transit (`"respawn"` for local death/reset, `"recovery"` for cube recovery).
Markers survive send throttling and clear only on successful publication.
A valid marker empties the recipient's interpolation buffer and snaps immediately,
even for a small displacement. Stale sequences/epochs cannot snap a newer body.
The existing >300-unit fallback remains defensive. Markers are presentation only;
they do not grant physics authority or logical progression. Remote carried cargo
uses the same snapped avatar and existing offset, so there is still one cube.

## Lift, checkpoint, death and reset

LIFT LAB has a lower body-held control, a shared LiftField, and an upper E latch.
Either player may hold or ride first. Accepted `lowerHeld || liftLatched` powers
each client's own field. Each browser applies `LiftField.influence` to its local
player. Remote vertical motion stays snapshots/interpolation. Only the granted
cube simulator applies the loose-cube field. Carried cargo follows its holder
and never receives a second loose-body force.

The upper latch saves the generic shared checkpoint `upper`, holds lift power
and unlocks the exit. It does **not** teleport live players. Later death, R or
rejoin spawns that slot at its upper position: P1 (790,343), P2 (885,343).
PAIRING BAY maps its saved `reunion` to the existing world checkpoint positions;
relay/crumble/boost labs use entry. Player coordinates are never persisted.

Ordinary death and **R reset only the local player**. Shared latches, checkpoint,
exit credits and partner simulation remain. The local cube release uses the
existing drop rules before moving the player; a sequenced `local-reset` clears
that slot's momentary occupancy and any still-held/pulling cube, including a
pickup grant already in flight. The loose cube keeps its simulator. Death/reset
emits an explicit avatar snap marker. No full-room reset/voting UI is introduced.

## Shared crumble

CRUMBLE LAB uses semantic `crumbleA` (step) and `crumbleB` (hook), both labelled
prototype/unstable test blocks. They carry no evidence IDs or OLLVM claims.
A local grounded body or attached rope reports its own physical contact.
Membership, level, allowed ID/trigger, phase, schema and action sequence are
validated server-side; coordinates and anti-cheat movement validation are absent.

| Phase | Authority and timing |
| --- | --- |
| stable | Collision and hooks enabled; first accepted trigger starts warning |
| warning | Foot: 600 ms; hook: 1,650 ms; subsequent triggers cannot restart/shorten it |
| broken | Server phase change disables collision/hooks and releases attached local ropes; lasts 2,400 ms |
| stable again | Server phase change restores the block for both clients |

The server holds deadlines in memory, checks due phases with one 20 ms clock,
and serializes transitions with semantic actions. Only meaningful phase changes
broadcast; no per-frame timer messages or writes. Snapshots on join/reconnect
include phase, remaining milliseconds and total authored duration. Clients count
down locally for presentation; collision waits for the accepted phase. Network
reception skew remains approximate, rather than lockstep physics.

An initiator predicts the warning immediately, including sound. It cannot
predict collapse, even when its visual countdown reaches zero. Accepted warning
keeps the same audio baseline; denial reconciles to current truth. Each broken
transition cancels local rope attachment and emits collapse feedback once.
Respawn restores collision/hooks on both clients. Players fall under their own
physics; a falling player's death does not kill/reset the partner.

Actual server restart and idle room unload/reload safely reconstruct both blocks
as stable. Durable foot/hook test credits and exit progress survive. No warning,
broken timer, deadline or phase is saved. These are authored game timings, never
obfuscator evidence. C8 continues using its pre-existing local timers.

## Common cube and physical completion

One server-arbitrated cube primitive serves PAIRING BAY, RELAY LAB and LIFT LAB.
Pickup grants holder+simulator to the authenticated requester; first accepted
serialized request wins. Drop clears holder and retains the simulator. Loose
pull may transfer authority; its exclusive pull flag prevents competing steals
until release. Pull stop retains the epoch/loose stream. Ownership changes
advance epoch and reset sequence; old epochs cannot publish. Disconnect/replaced
sockets release held/pulling state and transfer to the connected partner, or
pause physics if neither is connected. There is no host-only gameplay role.

Only the accepted simulator publishes transforms/contact, at most 20 Hz. Local
pickup/drop/pull prediction stays responsive, but no pending cube action can
publish predicted transforms or cargo state. Explicit action results correlate
sequence, connection generation and source epoch; acceptance keeps valid motion,
denial restores accepted ownership/transform and cancels pull. A late pull grant
is stopped after local release. Prediction never changes the accepted room.
PAIRING BAY's predicted B bridge cannot grant confirmed cargo/exit rights.

Replicas interpolate 100 ms behind using at most 12 samples, never integrate a
second loose body or extrapolate forever. A resting uncarried cube supports
a player; a partner-held cube adds the restricted support below. Cube hooks pull,
never swing. Remote avatars have no player collision
and cannot activate local sensors. Consequential physical reports are trusted
from the owning browser; this remains a course-scale cooperative trust model.

Every lab reuses the same ending: its puzzle condition latches `exitUnlocked`,
then each authenticated slot reports its own overlap with the open exit. The
first arrival cannot complete; both permanent `reachedExit` flags are required.
Walking away, disconnecting or restarting preserves earned arrival credit.
Completion is semantic progression, not simultaneous occupancy of a tiny zone.

## Partner-held cube boost and BOOST LAB

The accepted shared holder may support the **other** local avatar through a
one-way cube-top surface. The carrier never collides with their own held cube.
Jumping up through it, landing/grounding, normal jumping off, Down drop-through
and landing sound all reuse ordinary player physics. The surface is movement
only: no grapple target, pressure-plate body, architecture, relay blocker, second
cube or transfer of physics authority. Player bodies still pass through each
other. Local cube prediction never grants partner support.

Both latest and interpolated carrier states must be grounded; the accepted
holder must be connected and avatar/cube snapshots at most 250 ms old. Support
uses the same interpolated position as the visible overhead cube. The latest
snapshot removes support as soon as the carrier becomes airborne, without waiting
for the 100 ms presentation buffer. Explicit relay/respawn snaps suppress it for
100 ms. Drop or authoritative release/reset/disconnect removes it at the next
local movement step. The rider falls normally and is never reset or transported
with the holder. Existing coyote time is retained.

There is no horizontal rider transport or transferred impulse. Slight movement
is tolerated while the cube remains underfoot; moving away makes the rider fall.
Airborne elevators are unsupported. Network stalls can temporarily remove the
surface. This is local movement evaluated from accepted shared holder state and
remote presentation, within the existing cooperative trust model, without server
player physics, rollback or anti-cheat.

BOOST LAB (`boost-lab`) starts both players below a 190-unit upper ledge. The
held cube top is 82 units above the floor; a second normal jump comfortably
reaches the ledge. A floor jump or resting loose-cube jump cannot reach it. Either
player can hold or climb. The upper switch sends the ordinary shared control
`boostRoute`; accepted `routeLatched` permanently enables two return steps and
unlocks the exit. The holder climbs those steps, then both physically enter the
exit. Reset/rejoin starts at entry; the saved return route remains available.
All geometry, controls and strings are authored/mock, with no binary evidence.

## Protocol and persistence

| Client message | Fields |
| --- | --- |
| create | `level` (omitted means legacy PAIRING BAY) |
| join | `code` only |
| avatar | `seq`, bounded `avatar`, optional `discontinuity` |
| cube | `epoch`, independent `seq`, bounded `transform`, optional `discontinuity` |
| cube-pickup / cube-pull-start / cube-pull-stop | semantic `seq`, current `epoch` |
| cube-drop | semantic `seq`, `epoch`, bounded proposed `transform` |
| cube-occupancy | semantic `seq`, `epoch`, `cargo`; only PAIRING BAY simulator |
| occupancy | `seq`, one allowed `plate` or null; lift uses `liftControl` |
| switch | `seq`; accepted PAIRING BAY B latch |
| control | `seq`, `relayPower`, `liftLatch` or `boostRoute`, restricted by level |
| crumble-trigger | `seq`, `platform`, `foot` or `hook`, only CRUMBLE LAB |
| local-reset | `seq`; release this body only |
| exit | `seq`; own physical arrival after accepted unlock |
| leave / ping | no additional fields |

Server messages remain snapshot/room/avatar/cube/action-result/cube-denied/error/
pong. Room snapshots carry the discriminated state; never another visitor's UUID.
Exact client keys reject injected slots, owners, outputs and revisions. Payloads
are ≤2 KiB; finite coordinates are bounded to ±10,000 and velocities to ±2,000.
Token bucket: 60 messages/sec, 80 burst; eight pending semantic requests per peer,
256 queued overall, 128 peers and 64 loaded rooms. Slow outbound recipients over
64 KiB are disconnected. Heartbeat is 5 seconds; missed pongs terminate on the
next pass. Retries use bounded backoff up to 5 seconds plus jitter.

```text
/data/<visitor UUID>.json   unchanged C8 campaign envelope/progress
/data/rooms/<CODE>.json     version-4 co-op logical record
```

Common durable fields: version, code, level, revision, visitors, checkpoint,
cubePlacement (or null), exitUnlocked, reachedExit, completed, createdAt, updatedAt.
`levelState` has exactly the durable fields listed in the lab table. Durable
mutations use the existing atomic file/fsync/rename/directory-fsync writer and
acknowledge only afterward. Failure closes the room rather than exposing unsaved
progress. Live revisions include ephemeral mutations; the disk revision is the
last durable watermark. Initial reconnect snapshots reset that baseline.

Do not persist player/cube coordinates, velocity, holder, physics grants, pull
flags, epochs, sequences, body occupancy, relay cooldowns, lift positions,
crumble timers or interpolation. Arbitrary cargo restores at its authored spawn;
PAIRING BAY docked cargo restores at its plate. Relay/lift/boost labs have no docked
placement, so their cubes restore at spawn. Power derives from saved latches.

On accepted join, validated versions 1–3 migrate atomically to version 4. Code,
visitors, B latch, checkpoint, cargo placement, unlock, arrivals, completion and
creation time survive. Version 1's former plates-only completion still becomes
unlock with no invented arrivals; versions 1–2 initialize the then-absent cube at
spawn. Version 3 preserves both cargo placements and existing completion.
Corrupt/inconsistent records fail closed without replacement. No campaign schema
migration occurs. Idle rooms unload after five minutes without deleting files.
Refresh existing browser tabs after the coordinated client/server wire update.

## Presentation and diagnostics

Authored wires show control→relay and lower-control/upper-latch→lift. Crumble
blocks show their warning bar or broken countdown. No wire is described as a CFG
edge or CPU timing. Labs display mock-controller labels and omit evidence data.

Existing audio observes accepted machinery power, remote/local relay transit,
crumble warning/break/respawn, checkpoint and completion. Carried transit produces
one cue; remote carried cargo follows the avatar cue. Predicted confirmation does
not replay pickup/drop/switch/warning sounds. Rejoin establishes a silent state
baseline, plus the existing connection cue. Browser validation is muted by default.

F1 includes level, checkpoint, level state/power, live revision, accepted cube
holder/authority/epoch/placement, local pending actions and RTT, local/remote
teleport markers, crumble phases with approximate remaining time, stream ages and
traffic counters. It also shows `partnerCubeSupportActive`, carrier slot, surface
position and `groundedOnPartnerCube`. These remain debug details; the normal HUD stays compact.

## Validation and manual acceptance

The [2026-10-11 relay/boost regression record](playtest/2026-10-11-relay-boost-regression.txt)
records the pre-fix failure, focused checks and passing local milestone gate.
Both BOOST LAB holder arrangements and untouched loose-cargo relay directions
passed with real browser input. The C8, PAIRING BAY, lift and crumble regressions
also passed. This working-tree pass has not been deployed or manually accepted
on two physical computers.

The 2026-10-07 [milestone regression record](playtest/coop-labs-regression.txt)
contains the complete passing local gate, including TLS and artificial semantic
delay. The [deployed validation record](playtest/coop-labs-deployment.txt) confirms
all four routes over live HTTPS/WSS. Automated checks do not replace the pending
two-computer playtest.

During development use the narrow relevant tests. Before this milestone ships,
run one complete relevant gate:

```sh
pnpm typecheck
pnpm test:unit
pnpm build
pnpm test                         # live HTTP / identity / WebSocket spec
pnpm check:browser                # C8, both CONTROL SPINE routes, save/audio
pnpm check:multiplayer-pairing     # accepted Pairing Bay route + restart
pnpm check:multiplayer-relay       # relay, loose/carry, both actor slots
pnpm check:multiplayer-lift        # both roles, cube, checkpoint, reset/death
pnpm check:multiplayer-crumble     # phases, hook, reconnect and process restart
pnpm check:multiplayer-boost       # both holder roles, drop/reset/disconnect, two-body finish
```

`BROWSER_BIN=/usr/bin/brave-browser` selects a usable Chromium engine on this
host. `BN_TEST_TLS=1` uses the shared test-only HTTPS/WSS proxy.
`BN_TEST_SEMANTIC_DELAY_MS=200` tests delayed semantic handling on the temporary
server; transform streams remain independent. Scripts stay muted unless
`BN_TEST_AUDIO=1` is explicitly requested. No-URL routes own temporary servers and
data, including actual SIGKILL/restart where applicable. Explicit URLs test the
selected deployment without restarting it:

```sh
pnpm check:multiplayer https://comp4020-final-ky787.fly.dev/ /tmp/pairing-fly
pnpm check:multiplayer-relay https://comp4020-final-ky787.fly.dev/ /tmp/relay-fly
pnpm check:multiplayer-lift https://comp4020-final-ky787.fly.dev/ /tmp/lift-fly
pnpm check:multiplayer-crumble https://comp4020-final-ky787.fly.dev/ /tmp/crumble-fly
```

Use two physical computers with distinct visitor cookies, create a lab on one,
and join by code on the other. Swap roles in a new room:

- RELAY: either player powers and teleports; send loose cargo, then carried
  cargo; confirm one cube, retained holder, and no remote slide across the room.
- LIFT: swap operator/rider; ride with loose and carried cargo; latch the upper
  checkpoint; reset and kill one player while the partner continues. Rejoin and
  confirm saved checkpoint/power without teleporting an already-connected partner.
- CRUMBLE: either player steps/hooks; both see warning and coherent collapse;
  attached rope releases; one player can fall/die independently; platforms
  respawn for both. Refresh during warning/broken to inspect recovery.
- BOOST: P1 holds/P2 climbs, then swap. Move the grounded holder slightly; drop,
  reset/die and disconnect while supporting. Confirm the partner falls without
  reset or launch. Jumping holders must lose support. Latch the return steps and
  physically finish with both bodies. Carry the cube through a relay afterward.
- RELAY regression: drop cargo through without following; leave it exactly where
  it lands. Both players transit repeatedly in both directions without moving it.
- All labs: finish with both bodies, reconnect/restart, and verify C8 progress
  remains separate. PAIRING BAY should feel as it did in the accepted build.

Stop after deployment for this manual acceptance. Final hand-authored cooperative
level design follows acceptance; do not extend CONTROL SPINE or generate binaries
in this milestone. Exact verification logs and before/after commits belong in the
dated mechanics-lab handoff; this document is the authoritative behavior contract.
