# Multiplayer chambers and mechanics laboratories

RACE CONDITION (`race-condition`) is the second provisional chamber. Human testing
found CROSSFEED mechanically successful but too easy and sequential; the new
chamber explores reversible cargo/trace/return state. See its [design contract](race-condition.md)
and [ADR 0008](adr/0008-reversible-coop-machinery.md). `pnpm check:race` runs both
role arrangements with real controls. Binary generation remains pending acceptance.

The named-cube authority and v5 persistence model are retained. RACE adds an
epoch-qualified buffer contact report, transient server deadlines for cargo and
phase/return handover, and locally predicted toggle presentation. No coordinates
or player physics move to the server. New ordinary plates accept players or
resting cubes; CROSSFEED's specialized sensors are visibly scanners/sockets and
its one-shot controls are terminals. New chamber wires show resolved destination
power; controlled ghosts remain visible at 25%. Grounded running increases from
380 to 426; air/jump/grapple tuning and C8 controller contracts stay unchanged.

The historical milestones below retain their original scope and rationale.

The room-code, shared-cube, prediction and mechanics laboratories (including
corrected relay egress, partner boost and static firewalls) were manually accepted
on two physical computers before CROSSFEED VAULT. The first full cooperative
chamber starts from `33e632878594bd4de75568ed00dd7f9028856e07` and extends the
accepted cube primitive to two independent named payloads. Its controller remains
honestly mock; the [chamber contract](crossfeed-vault.md) is **PROVISIONAL UNTIL
HUMAN PLAYTEST ACCEPTANCE**. This milestone does not generate a binary.

C8's four single-player rooms, anonymous visitor progress and retained CONTROL
SPINE controller remain independent. No accounts, matchmaking, new binaries,
player-player collision, server player physics, or invented assembly are added.
See [ADR 0001](adr/0001-multiplayer-authority.md),
[ADR 0002](adr/0002-shared-cube-authority.md),
[ADR 0003](adr/0003-multiplayer-prediction.md),
[ADR 0004](adr/0004-coop-labs-and-transient-machinery.md),
[ADR 0005](adr/0005-partner-cube-support.md), and
[ADR 0006](adr/0006-static-firewalls.md), and
[ADR 0007](adr/0007-named-shared-cubes.md).

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
| `src/slice/firewall.ts`, `firewall-render.ts` | Authored lethal rectangles and reusable beam presentation |

Without `WorldAuthority`, C8 retains its existing controller and local crumble
path. With authority, sensors report intent and accepted outputs drive machinery.
Campaign `ROOM_IDS` remain exactly pressure, switch, relay and uplink.

## Sessions, menu and level model

The menu separates **CO-OP CHAMBERS** (CROSSFEED VAULT) from **MECHANICS LABS**.
Each offers CREATE; the common JOIN needs only a room code.
The creator supplies a `CoopLevelId`. The joiner supplies only the code; the
snapshot selects both geometry and authority adapter. There is no requirement
to separately select matching rooms. Codes still use four characters from
`ABCDEFGHJKMNPQRSTUVWXYZ23456789`, with trimming/uppercasing, collision retries
against loaded and persisted rooms, and distinct invalid/unknown/full errors.

| Level ID | Lab | Durable level state | Cube | Exit unlock |
| --- | --- | --- | --- | --- |
| `crossfeed-vault` | Full interconnected chamber | `switchB`, `switchC`, `switchD` | `cubeA`, `cubeB` | Two distinct cube pads + opposite body plates |
| `pairing-bay` | Shared inputs, grapple, cargo, handoff | `switchB` | yes | B + cargo + opposite final body plates |
| `relay-lab` | Player / loose / carried relay transport | `relayEnabled` | yes | Relay power latch |
| `lift-lab` | Shared vertical transport / checkpoint | `liftLatched` | yes | Upper latch/checkpoint |
| `crumble-lab` | Shared step / hook unstable blocks | `tested.foot`, `tested.hook` | no | Both trigger styles accepted |
| `boost-lab` | Partner-held cube boost / return steps | `routeLatched` | yes | Upper shared switch |
| `firewall-lab` | Static beams / independent death / shared cube destruction | `checkpointSet` | yes | Entry checkpoint switch |

`SharedRoom` is a union discriminated by `level`. Common session fields are code,
revision, assigned/connected slots, checkpoint, named `cubes` / `cubePlacements`, `exitUnlocked`, `reachedExit[2]`, and `completed`. `levelState` contains
only that lab's inputs/outputs, latches, or ephemeral phases. A crumble room has
`cubes: {}` and `cubePlacements: {}`. Single-cube rooms retain legacy `cube` /
`cubePlacement` snapshot aliases; CROSSFEED and CRUMBLE expose null aliases. Durable records use the same level tag
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
outward side (two-unit gap, at most 96 units of adjustment per resting payload). The entire alternate
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
FIREWALL LAB also uses `reunion`; relay/crumble/boost labs use entry. Player
coordinates are never persisted.

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

One server-arbitrated cube primitive serves every cube-bearing co-op room.
CROSSFEED uses two independent instances keyed by `cubeA` / `cubeB`; existing
rooms use `cube`. A browser may simulate both loose cubes, but each player may
carry or pull only one. Prediction, transforms, resets, boost support and relay
cooldowns identify their cube. See ADR 0007 for the per-entity extension.
Pickup grants holder+simulator to the authenticated requester; first accepted
serialized request wins. Drop clears holder and retains the simulator. Loose
pull may transfer authority; its exclusive pull flag prevents competing steals
until release. Pull stop retains the epoch/loose stream. Ownership changes
advance epoch and reset sequence; old epochs cannot publish. Disconnect/replaced
sockets release held/pulling state and transfer to the connected partner, or
pause physics if neither is connected. There is no host-only gameplay role.

Only the accepted simulator publishes transforms/contact, at most 20 Hz. Local
pickup/drop/pull prediction stays responsive, but the cube named by a pending action cannot
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

## Static firewalls and FIREWALL LAB

**This firewall is a game-authored hazard and is not binary/obfuscator evidence.**
Rooms optionally define `firewalls: FirewallDef[]`. Each definition has an `id`,
top-left `x/y`, `orientation: "horizontal" | "vertical"`, positive `length`, and
optional positive `thickness` (default 12). Horizontal boxes are length ×
thickness; vertical boxes are thickness × length. Collision and rendering use
the same derived rectangle. Beam geometry stays entirely in frontend room data.

Firewalls are always visible and lethal. They never enter the solid, support,
grapple-target, pressure-plate, controller-output or relay-clearance lists.
Crit 5 supplies only the orange glow, bright core, mesh and emitter-post visual
reference. Mesh flicker changes presentation, never collision or activation.
No timed opening, warning, charge, sweep, moving gate, authentication or watchdog
state is ported. A short `firewallZap` reuses the already-approved Kenney CC0
`firewall-open.ogg` asset at a higher playback rate; no ambient loop or new asset.

The local player's physical box overlapping a beam causes ordinary local death
with cause `firewall`: release grapple/momentary input, release carry if needed,
and respawn at the current shared checkpoint. Partner, switches, checkpoint,
exit unlock and arrival credits survive. There is no server player simulation.

Only the accepted cube physics authority reports actual cube-box contact, loose
or carried, via `{type:"cube-reset", seq, epoch, cause:"firewall"}`. This is a
trusted semantic sensor report like the existing occupancy system; the server
validates membership, current authority, epoch and sequence, not room geometry.
A replica cannot request a reset for somebody else's cube. The server clears
holder/pull, retains the reporting connected authority, increments the epoch,
clears the transform/stream sequence, and sets `cubePlacements[cubeId]:"spawn"`. The
original authored cube spawn is resolved by each frontend, never a checkpoint,
carrier location or previous cargo plate. Changed durable placement is persisted
before acknowledgment; transforms, epochs and the `lastReset` effect marker
remain ephemeral. Disconnects use the existing authority-transfer rules.

Contact immediately dissolves the authority's local cube and cancels pull;
simulation/publication pause until reconciliation. No predicted spawn becomes
shared truth. Contact during an in-flight pickup/drop/pull waits for its accepted
epoch; a death/release race can retry with the newer epoch while authority is
retained. Loss of authority or connection follows the accepted state. Both
clients snap the single existing cube to spawn on acceptance; old epochs cannot
resurrect its pre-destruction position. A newly accepted reset also cancels stale
carry/pull prediction. Rejoin uses a silent effect baseline.

A held cube touching by itself resets the cube without killing its carrier.
When both physical boxes touch, cube contact is reported before the ordinary
player death releases it. A pulled cube clears shared pull and local rope
feedback. Only actual cube geometry is tested, never the partner support surface.
Accepted reset removes that surface; its rider falls normally and dies only on
their own beam contact. Loose cube contact is checked before and after relay
transit and after lift integration; relay cooldowns and ownership rules remain.

`firewall-lab` has a 150-unit horizontal beam with default thickness and a
80-unit vertical beam with thickness 16. A drop perch and short safe overpass
allow repeated carry, drop and pull experiments without room restarts. Carry
under the horizontal beam to destroy only the overhead cube; drop from the perch
to test falling cargo. Carry over the walkway, drop before the vertical beam,
jump over it and pull cargo through from the far side. Walk/jump/fall into beams
to test player death. The entry switch saves `reunion` (P1 130,623; P2 220,623)
and opens the exit; both physical arrivals are still required. It never turns
either beam off.

Known limits: contact uses the existing fixed-step physical boxes, not pixel
alpha; glow/posts are decorative. Level authors must keep original cube spawns
and player checkpoints clear of beams. Remote destruction arrives with the
accepted reset, so its presentation may lag by network latency. No rollback,
anti-cheat, new player authority, or general player collision is introduced.

## Protocol and persistence

| Client message | Fields |
| --- | --- |
| create | `level` (omitted means legacy PAIRING BAY) |
| join | `code` only |
| avatar | `seq`, bounded `avatar`, optional `discontinuity` |
| cube | `cubeId`, `epoch`, independent `seq`, bounded `transform`, optional `discontinuity` |
| cube-pickup / cube-pull-start / cube-pull-stop | `cubeId`, semantic `seq`, current `epoch` |
| cube-drop | `cubeId`, semantic `seq`, `epoch`, bounded proposed `transform` |
| cube-reset | `cubeId`, semantic `seq`, current `epoch`, `cause:"firewall"` or `"recovery"`; current simulator only |
| cube-occupancy | `cubeId`, semantic `seq`, `epoch`, room-valid `placement`; only that cube’s simulator |
| occupancy | `seq`, one allowed `plate` or null; lift uses `liftControl` |
| switch | `seq`; accepted PAIRING BAY B latch |
| control | `seq`, `relayPower`, `liftLatch`, `boostRoute`, `firewallCheckpoint`, or CROSSFEED `switchB/C/D`, restricted by level |
| crumble-trigger | `seq`, `platform`, `foot` or `hook`, only CRUMBLE LAB |
| local-reset | `seq`; release this body only |
| exit | `seq`; own physical arrival after accepted unlock |
| leave / ping | no additional fields |

Server messages remain snapshot/room/avatar/cube/action-result/cube-denied/error/
pong. Room snapshots carry the discriminated state; never another visitor's UUID.
Exact client keys reject injected slots, owners, outputs and revisions. Payloads
are ≤2 KiB; finite coordinates are bounded to ±10,000 and velocities to ±2,000.
Token bucket: 90 messages/sec, 120 burst (avatar + two 20 Hz cube streams plus inputs); eight pending semantic requests per peer,
256 queued overall, 128 peers and 64 loaded rooms. Slow outbound recipients over
64 KiB are disconnected. Heartbeat is 5 seconds; missed pongs terminate on the
next pass. Retries use bounded backoff up to 5 seconds plus jitter.

```text
/data/<visitor UUID>.json   unchanged C8 campaign envelope/progress
/data/rooms/<CODE>.json     version-5 co-op logical record
```

Common durable fields: version, code, level, revision, visitors, checkpoint,
cubePlacements (map, empty when cubeless), exitUnlocked, reachedExit, completed, createdAt, updatedAt.
`levelState` has exactly the durable fields listed in the lab table. Durable
mutations use the existing atomic file/fsync/rename/directory-fsync writer and
acknowledge only afterward. Failure closes the room rather than exposing unsaved
progress. Live revisions include ephemeral mutations; the disk revision is the
last durable watermark. Initial reconnect snapshots reset that baseline.

Do not persist player/cube coordinates, velocity, holder, physics grants, pull
flags, epochs, sequences, body occupancy, relay cooldowns, lift positions,
crumble timers or interpolation. Arbitrary cargo restores at its authored spawn;
PAIRING BAY docked cargo restores at its plate unless destroyed. Relay/lift/boost/firewall labs have no docked
placement, so their cubes restore at spawn. Power derives from saved latches.

On accepted join, validated versions 1–4 migrate atomically to version 5.
Version 4 maps its placement to `{cube: previousPlacement}` (or `{}` for CRUMBLE).
CROSSFEED stores each payload’s spawn/liftCargo/finalLeft/finalRight placement.
It restores arbitrary cargo at that payload’s own original spawn. No physics is persisted. Code,
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
position and `groundedOnPartnerCube`, firewall IDs/rectangles, `lastDeath`, and the
accepted cube's `lastCubeReset` marker/epoch. These remain debug details; the normal HUD stays compact.

## Validation and manual acceptance

The [2026-10-11 firewall regression record](playtest/2026-10-11-firewall-regression.txt)
records 322 passing unit/server tests (2 skipped), typecheck/build, live specs,
C8 and all existing co-op browser routes. FIREWALL LAB passed 43 assertions with
both acting slots at normal latency and again over HTTPS/WSS with 200 ms semantic
delay. The final wire-routing presentation adjustment received narrow connection
checks and the delayed browser run. No deployment or human acceptance is claimed.

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
pnpm check:multiplayer-firewall
pnpm check:race         # timed cargo, all five hooks, required unstable blocks, return/boost, both roles
pnpm check:crossfeed    # both slots, independent deaths, loose/carry/pull resets, finish
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
- FIREWALL: set the checkpoint, walk/jump/fall into each beam and verify only the
  touching player respawns. Drop cargo from the perch; carry into the horizontal
  beam with each slot; pull through the vertical beam from its far side. Each
  destruction must restore one cube at the same original spawn. Confirm carry
  alone can touch without killing its holder; then touch with both bodies.
  Repeat after reconnect. Beams must remain lit before/after the switch. Use the
  overpass and jump the vertical beam to finish with both players.
- All labs: finish with both bodies, reconnect/restart, and verify C8 progress
  remains separate. PAIRING BAY should feel as it did in the accepted build.

Stop after deployment for this manual acceptance. Final hand-authored cooperative
level design follows acceptance; do not extend CONTROL SPINE or generate binaries
in this milestone. Exact verification logs and before/after commits belong in the
dated mechanics-lab handoff; this document is the authoritative behavior contract.
