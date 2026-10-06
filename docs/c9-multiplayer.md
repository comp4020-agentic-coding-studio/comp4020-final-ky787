# PAIRING BAY multiplayer infrastructure

Implemented 2026-10-06, starting at
`55aaa36edc75b3be9bfa9ff6cb54a35e05ae2b65`.
The revised role-symmetric multiplayer architecture and physical exit were
manually accepted on two separate computers. The shared-cube milestone starts
at `cbad2534d2b19f1ff799c9d540f5cd972cad97bd` and extends that accepted chamber.
It adds exactly one shared cube and a cube-only cargo phase, now manually accepted
on two physical computers. The responsiveness pass starts at
`aec24f90b212ee9f051bc7cb3f49e3574b5c0d75`; its real-network feel still needs manual
acceptance after deployment. The four C8 rooms, personal saves and
retained CONTROL SPINE binary stay independent. No multiplayer CONTROL SPINE,
relay/lift cube transport or new binary is introduced.

## Authority and modules

See [ADR 0001](adr/0001-multiplayer-authority.md) and
[ADR 0002: shared cube simulation](adr/0002-shared-cube-authority.md), and
[ADR 0003: local prediction](adr/0003-multiplayer-prediction.md).

```text
Browser A / Browser B
        HTTPS + WSS (same origin /ws)
                    |
                 Fly proxy
                    |
        existing Node process :8080
        static + /api/progress + /api/identity + /ws
                    |
                  /data
```

`server/app.ts` attaches `server/multiplayer.ts` to its existing HTTP server.
There is no extra production process, service or public port. Fly's one machine,
256 MB allocation, volume and auto-stop settings are unchanged. `ws` **8.22.0** is
the sole production dependency (`@types/ws` 8.18.2 is development-only).
The [ws upgrade/heartbeat documentation](https://github.com/websockets/ws#client-authentication)
informs the use of `noServer`, authenticated upgrade handling and ping/pong.
The Docker runtime copies pruned production dependencies and the shared protocol.

The browser derives `ws://host/ws` or `wss://host/ws` from the current page URL.
Vite proxies `/api`, `/readme` and `/ws` to the same Node server on 8080; the
browser still sees only its current origin. `pnpm dev` now starts both listeners
in one development process, waits for the backend before exposing Vite, and
closes both on Ctrl+C. Its backend binds to loopback; `--host` can expose the
Vite origin for LAN testing. Fly terminates TLS. The upgrade reads
the HTTP cookie header and checks the request Origin against Host.

| Module | Responsibility |
| --- | --- |
| `src/coop/protocol.ts` | Explicit wire types, strict runtime client validation, code normalization, revision ordering |
| `server/identity.ts` | Shared C8 visitor-cookie parsing/establishment and origin check |
| `server/pairing-state.ts` | Coordinate-free authoritative mock room contract and durable schema |
| `server/multiplayer.ts` | Slots, serialized logical mutations, persistence, socket lifecycle and avatar/cube forwarding |
| `server/cube-state.ts` | Ephemeral cube ownership, exclusive pull arbitration and stream validation |
| `src/coop/cube.ts` | Confirmed physics boundary, predicted local interaction, reconciliation and physical cargo sensing |
| `src/coop/prediction.ts` | Local pending actions, generation/sequence correlation and confirmation timings |
| `src/coop/client.ts` | Identity bootstrap, WebSocket/rejoin/backoff, counters and semantic reports |
| `src/coop/authority.ts` | Physical sensors and accepted-state adapter; never evaluates shared outputs |
| `src/coop/pairing-bay.ts` | Hand-authored chamber geometry and per-slot spawn/checkpoint positions |
| `src/coop/remote.ts` | Bounded presentation-only interpolation |

`PuzzleWorld` has an optional `WorldAuthority` interface. Without it, C8 follows
its existing controller path. With it, local sensors report intent and accepted
server inputs/outputs drive the same platforms, door and grapple rules. No
platform, grapple or rope-jump tuning changed. The campaign `ROOM_IDS` and save
schema remain unchanged; `pairing-bay` is a separate world ID.

## Identity, session and UI

The menu preserves all four single-player rooms and adds **CREATE ROOM** and
**JOIN ROOM**. A room code chooses a shared session. The existing anonymous
`bn_visitor` UUID identifies the browser and owns a player slot in that session.
`GET /api/identity` establishes that same HttpOnly, SameSite=Lax, one-year cookie
before upgrade, even if `/api/progress` has not run. It adds Secure behind HTTPS.
There is no second identity system or account.

Codes are four characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O/1/I/L),
randomly generated with crypto and checked against both loaded and persisted
rooms. Collisions retry; input is trimmed and uppercased, then validated exactly.
Invalid, unknown and full rooms have distinct visible errors. There are exactly
two reserved visitor-owned slots, no spectators. Disconnecting does not free a
slot for an unrelated visitor. Create a new room to choose a different partner.

The room code, local slot, both connection states and partner status stay visible.
**COPY CODE** beside the room code copies it to the clipboard and confirms success;
if clipboard access is unavailable, the code remains selectable for manual copy.
Play starts only after the initial authoritative snapshot. A visitor may move
while waiting for a partner. The initial P1 spawn is off Plate A. The same tab
remembers the code in `sessionStorage` and automatically rejoins after refresh;
a new tab/profile can enter a remembered code manually. A second tab with the
same cookie replaces the older socket for that slot; the old tab shows an
explicit replacement message and stops retrying. It never becomes Player 3.

Co-op does not write campaign progress. Leaving a room returns to the individual's
campaign menu and existing checkpoint. Pause releases local momentary occupancy;
resuming reports fresh physical occupancy. A connected background window may
remain standing on a plate. Blur clears held movement and silences audio without
turning a still-connected player into a disconnect.

## PAIRING BAY contract

**Player slots identify players; they do not define gameplay roles.** Slots own
visitor/reconnect identity, avatar colour, movement streams and one distinct
body's reports. They never gate Plate A, Switch B, a traversal route or either
final plate. PAIRING BAY has no asymmetric characters. Either player can hold
for the other, cross first and latch the return bridge.

Two-machine human testing confirmed the deployed networking but exposed fixed
slot roles and an exit interaction problem: automatic completion while both
plates remained held was logically valid, yet leaving the plates closed the
door and prevented a natural physical finish. The revised ending separates the
cooperative unlock from each player's subsequent arrival.

The chamber is 2,200 × 780. The original near bank (ends x=460), far bank
(starts x=880), 420-unit death gap, anchor centre (770,226), entry spawns and B
remain unchanged. The cube starts at (1190,538), beyond initial grapple reach
from the near bank; cube interaction grants require B. Cubes cannot satisfy A.
The cargo plate is (1310,560), beside the reunion area. It powers a single
160-unit code step at (1400,455). The final static deck starts at (1580,340),
220 above the recovery floor: an ordinary jump, even from a resting cube, cannot
bypass the inactive step. Two short jumps with cargo power reach it. The floor
below is safe; losing power lets players fall and return to cargo. Players on
the final deck can always drop left to return. No new death gap was added.

Final plates are (1680,340) and (1920,340); the 130 × 140 exit is (2030,200).
Static banks/deck remain solid and unhookable. Inactive code is ghosted/non-solid;
enabled code accepts hooks across its address bar. The cargo wire lights from
accepted cube occupancy. The cube retains its existing amber treatment, carry,
drop, collision and bounded pull tuning. No player-player collision or remote
avatar impulse can move it.

| Semantic input | Ownership/meaning |
| --- | --- |
| `plateAOccupied` | Either connected body occupies A (250,560) |
| `switchB` | Either player's own nearby E interaction at B (1060,560), latched |
| `cubeOnCargoPlate` | Only the granted cube simulator reports resting, uncarried cargo overlap |
| `finalPlateLeftOccupied` | A connected body on left final plate (1680,340) |
| `finalPlateRightOccupied` | A connected body on right final plate (1920,340) |

Each slot reports **one** of `plateA`, `finalLeft`, `finalRight`, or `null`.
The server derives occupancy from both connected slots. Final plates are accepted
only after B latches. Reports carry no caller-chosen slot or visitor ID.

| Authoritative output/state | Rule |
| --- | --- |
| `grappleAnchor` | `plateAOccupied` |
| `returnBridge` | `switchB` |
| `finalAccess` | Momentary `cubeOnCargoPlate`; maps to the existing frontend `codePlatformA` signal |
| `exitUnlocked` | Permanently latched by two connected distinct bodies on opposite final plates with B and cargo power |
| `exitDoor` | `exitUnlocked`, regardless of current plates/connections |
| `reachedExit[slot - 1]` | Permanently recorded when that slot reports its own physical arrival at the unlocked exit |
| checkpoint | `entry` initially; `reunion` when B latches |
| `completed` | Both `reachedExit` flags are true; unlock alone never completes |

Phase 1: either player holds A while the partner uses the grapple slab. Removing
the last body from A disables the slab and releases its rope through the existing
rules. Phase 2: either player presses E near B; the bridge materializes and the
reunion checkpoint is saved. Phase 3: either player retrieves the shared cube,
optionally hands it off, and docks it on CARGO PLATE. Cargo holds the short access
step active as a third hand while both players climb to the final deck. Removing
the cube deactivates access. Phase 4: opposite final plates latch the door open
with **EXIT UNLOCKED · REGROUP**. Both leave their plates and enter the nearby
exit. The first arrival shows **1 / 2 ARRIVED**; the second produces **PAIRING
COMPLETE**. P1-left/P2-right and P2-left/P1-right work identically.

Each plate's animated connection follows its accepted occupancy independently:
one held final plate lights its feed while the exit waits for the second signal.
Released feeds go dim even after the door has permanently unlocked.

Arrival is deliberately lasting semantic progress, not simultaneous exit
occupancy: once a player reaches the unlocked exit, walking away or disconnecting
does not remove their credit. The other distinct player must still reach it.
Repeated arrival messages from one slot cannot finish for the other. The door
stays open after plate release, disconnect, reconnect, restart and completion.

The server imports no chamber geometry. The owning browser detects its own
plate contact, switch proximity and player-box overlap with the exit, reporting
arrival only after the accepted unlock. It never decides shared outputs or
completion. This course-scale prototype trusts those physical semantic reports;
a client could lie about its own location. The server enforces ownership, phase,
one plate per body, connected membership, monotonic sequences and distinct
arrivals. A lone player alternating plates cannot unlock the door. This is not
anti-cheat. There is still no player-player collision.

All machinery/text is labelled **mock multiplayer / test controller**. There are
no native addresses, traces, OLLVM provenance or crumble here. C8 evidence bytes
and the validated five-input/seven-output UPLINK contract remain untouched.

## Shared cube authority and trust

There is one cube entity. The server owns `holder` and `physicsAuthority`;
clients request interactions without choosing a slot. Holder means carrying;
physics authority means the one browser allowed to publish the shared body. A
pending local interaction may advance a temporary predicted presentation, which
cannot publish snapshots or semantic contact until confirmed.

| Event | Accepted result |
| --- | --- |
| Initial connection | P1 if connected, otherwise P2 simulates; this is not a gameplay role |
| Free pickup | Requester becomes holder and simulator; first serialized mutation wins |
| Holder drops | Holder clears; the same browser simulates from the accepted proposed drop transform |
| Partner picks up later | Holder and simulator transfer to the partner |
| Loose pull starts | Requester becomes simulator; a temporary `pulling` flag locks competing claims |
| Pull stops | Lock clears; simulator stays assigned for loose motion |
| Non-authority disconnects | Cube unchanged |
| Simulator/holder disconnects | Holder and pull clear; connected partner receives latest transform and a new epoch |
| Last simulator disconnects | No authority; latest transform stays in memory while the room remains loaded |
| Same-cookie socket replacement | Release carrying/pulling and revoke the old epoch; prefer the connected partner |

The pull lock is only a boolean qualified by the current physics authority, not
a second persistent owner. Competing pull/pickup requests cannot steal an active
pull; its owner may pick up the cube. A carried cube cannot be pulled away. Release,
blur, pause, reset and death cancel the local pull, including a grant that arrives
after release. Reset/death requests a holder drop before moving the avatar back
to its checkpoint. Loose cubes reaching a hazard return to the authored spawn
through the same authority's existing recovery physics.

Clients predict local pickup/drop and pull startup while awaiting explicit
`action-result` confirmation. Contested/stale requests are ordinary rollback,
not session errors (the compatibility `cube-denied` notification is also retained). The old authority stops on the accepted room update;
its in-flight snapshots are already rejected by the server's new epoch. No two
accepted streams advance the shared body. Transfer starts from the most recent
accepted transform, retaining velocity for a loose body. A disconnected holder
releases an ungrounded body to fall/settle. With no accepted transform yet, the
frontend uses the authored semantic placement instead.

The authority sends at most 20 snapshots/second using a cube-specific sequence
and epoch, independent of avatar traffic. The server retains and forwards the
latest valid transform without simulating physics or writing it to disk. A
replica interpolates 100 ms behind, with at most 12 samples, no extrapolation and
no independent integration outside a pending local prediction. Epoch changes and discontinuities over 300 units
snap. An interpolated falling cube is not marked grounded before landing. A
remote carried cube follows the same interpolated avatar using the existing
carry offset; its holder is always server-owned. Only a resting uncarried cube
supports a player. It never becomes a swing anchor, and a player standing on it
cannot grapple it to self-lift.

The authority browser senses cargo overlap from authored frontend geometry. The
server accepts only its current-epoch cargo report, with B latched and no holder
or active pull for positive occupancy. Player body reports cannot name cargo.
Accepted cargo placement determines `finalAccess`; a client cannot publish that
output. Pickup/pull immediately clears cargo power, and later resting contact
can restore it. Unlock and arrival credits remain permanent after cargo removal.

This preserves the course-scale trust model: pickup/pull reach, occlusion, body
movement, proposed drop location and cargo overlap are trusted physical reports
from the relevant browser. The server checks membership, ownership, epoch,
sequence, bounds, interaction availability and puzzle phase; it does not verify
proximity against server physics. A modified authority client could lie about
its own cube motion or cargo contact. Normal input checks use the existing reach,
range, support and pull limits. This is not anti-cheat or lockstep physics.

## Local prediction and reconciliation

Pickup attaches the local cube at the existing carry offset immediately. Drop
detaches at the existing collision-checked drop transform and starts loose motion.
Pull startup shows the rope and uses the existing bounded pull forces immediately;
release stops those forces locally, even if its start grant is still pending. A
late start grant is followed by an epoch-correct stop request. The confirmed pull
lock remains exclusive. Each browser has one local cube action pending at a time;
additional E/click requests wait until it resolves.

`LocalPrediction` is separate from `SharedRoom`. A pending action records kind,
semantic sequence, source epoch, connection generation, prediction time and send
time. The server returns `{type: "action-result", seq, accepted, room}` to the
requester before broadcasting the room. It also acknowledges no-op switch and
cargo requests. Matching confirmation clears the pending flag while retaining
valid local motion; it does not reset the cube to the older request transform.
Denial clears pending carry/pull and restores the latest accepted replica/holder.
Ownership disagreement snaps instead of smoothing the cube through geometry.
An unrelated room message alone cannot confirm a prediction. Old sequences and
old socket generations cannot resolve a new action. Disconnect, leave and rejoin
clear pending feedback; the reconnect snapshot establishes truth afresh.

**No cube transforms or cargo reports are published while a cube action is
pending**, including when its requester was already the simulator. A losing
request therefore cannot overwrite the winner's cube. The first accepted server
mutation still wins simultaneous pickup; both browsers may briefly show local
carry, but only one is confirmed and allowed to publish. Partners otherwise see
only accepted state, using the existing interpolation buffer.

Switch B predicts its local switch and return bridge plus one switch cue. Its
confirmed latch/checkpoint remain unchanged until the durable acknowledgment.
Cube requests and final plate reports still check confirmed B; exit reports
still check confirmed unlock. A predicted bridge cannot grant those semantic
rights. On denial, the bridge returns to the accepted state.

Cargo contact can depress/light/sound the plate immediately on the confirmed
simulator, including a pending drop by that simulator. This presentation uses
`cargoPlateActive`, independently of accepted controller inputs. `finalAccess`
remains server-only and becomes solid only after durable cargo confirmation.
Predicted pickup/drop sounds play once locally; confirmation preserves the audio
baseline. Ownership rollback suppresses a contradictory pickup/drop cue. Remote
players hear the normal accepted transitions. Pull audio follows local actual
pull activity; denied/released pulls stop it.

## Protocol, revisions and limits

Client messages are JSON discriminated by `type`:

| Type | Fields |
| --- | --- |
| `create` | none |
| `join` | `code` |
| `avatar` | `seq`, bounded `avatar` (`x`, `y`, `vx`, `vy`, `facing`, `grounded`, optional visual rope tip as object or null) |
| `cube` | `epoch`, independent cube `seq`, `transform` (`x`, `y`, `vx`, `vy`, `grounded`) |
| `cube-pickup`, `cube-pull-start`, `cube-pull-stop` | semantic `seq`, current `epoch` |
| `cube-drop` | semantic `seq`, current `epoch`, proposed bounded `transform` |
| `cube-occupancy` | semantic `seq`, current `epoch`, `cargo` boolean |
| `occupancy` | `seq`, `plate` (single enum or null) |
| `switch` | `seq` (the room's sole switch) |
| `exit` | `seq` (this connection's own physical arrival, only after unlock) |
| `leave`, `ping` | none |

Server messages: `snapshot` (assigned slot and full room), `room` (full accepted
state at a newer revision), `avatar` (server-owned slot, stream ID, sequence and
bounded visual snapshot), `cube` (accepted epoch/sequence/transform),
`action-result` (request sequence, acceptance and full accepted room),
`cube-denied` (compatibility rejection notification), `error` (public code/message) and
`pong`. Full room
state includes level, code, revision, assigned/connected slots, inputs, outputs,
`exitUnlocked`, both `reachedExit` flags, checkpoint, completion, `cubePlacement`
and ephemeral cube holder, authority, pull lock, epoch, sequence and latest
transform (null until first publication after load). Other visitors' UUIDs are
never broadcast.

Every accepted shared mutation increments the **live** room revision. Body plate
occupancy, cube ownership/pull state, disconnect and existing-visitor reconnect
broadcast without filesystem writes. The existing serial semantic queue is
retained, so an ephemeral operation can still wait behind an earlier durable
operation; it does not add a write of its own. Transform traffic bypasses it.

A mutation that changes B/checkpoint, semantic cargo placement, exit unlock,
arrivals or completion writes atomically before acknowledgment/broadcast. Room
creation, slot reservation and legacy migration also save before acknowledgment.
A storage failure still closes the room rather than acknowledge unsaved progress.
An ownership change that removes docked cargo therefore waits for that semantic
placement write; prediction hides it locally.

The version-3 record's existing `revision` stores the last durably acknowledged
live revision. Ephemeral revisions are not saved by themselves. No schema bump
is needed. Restart/unload may restore a lower live baseline than the last
ephemeral update; a new socket's initial snapshot explicitly resets that baseline.
Within a connection, clients reject ordinary room updates with another code or a
non-increasing revision. Action results may resolve pending actions at an equal
revision (denial/no-op), but never replace newer room truth. Cube snapshot epoch
and sequence ordering remain independent. Semantic sequences remain per socket.

Avatar movement and cube transforms each send at up to 20 Hz, are forwarded only
to the partner, and never enter
the logical mutation queue or disk. Coordinates are finite and bounded to
±10,000; velocities to ±2,000 (validation bounds, not server physics). Remote
avatars interpolate about 100 ms behind arrivals using at most 12 samples.
Large respawn discontinuities snap, and new streams reset old sequence/buffer
state. When no new sample arrives, presentation holds the last position rather
than extrapolating indefinitely. No player-player collision exists; remote
avatars cannot activate local sensors or become grapple/collision surfaces.
The original ninja drawing is reused with cyan P1 and violet P2 accents.

Payloads are limited to 2 KiB, exact keys/types are validated, binary messages
are rejected, and no user-provided paths are accepted. Each socket has a token
bucket (60 messages/sec, 80 burst, allowing both 20 Hz streams), at most eight queued semantic operations;
the service bounds total queued work (256), peers (128) and loaded rooms (64).
Slow recipients exceeding 64 KiB buffered outbound data are disconnected.
Server heartbeat runs every 5 seconds; a missed pong terminates the socket on
the next pass. Unjoined sockets expire after 15 seconds. Graceful socket closes
release on handling; a physically severed network is detected within roughly
5–10 seconds, since the server cannot observe it instantaneously.

## Persistence and recovery

```text
/data/<visitor UUID>.json   existing C8 envelope, version-3 campaign progress
/data/rooms/<CODE>.json     version-3 shared co-op logical record
```

No campaign file moves and no new campaign migration is necessary. Existing
version-1/2-to-3 migrations and corrupt-save behavior still pass. The shared
atomic writer preserves temporary-file fsync, rename and directory fsync with
mode 0600 and acknowledgement after durability, under the single-writer model.

A room record stores version, code, level, revision, the two visitor assignments,
B latch, checkpoint, `exitUnlocked`, both semantic `reachedExit` flags, completion,
`cubePlacement: "spawn" | "cargoPlate"`, and creation/update timestamps.
Momentary ownership/body-plate changes do not write this record:
**no raw transform, velocity, holder, physics authority, pull flag, epoch, sequence,
body-plate occupancy, connection or interpolation data is saved**. Avatar and
cube snapshots, ordinary ownership/pull transitions and momentary body occupancy
cause no writes unless they also change durable progression. `spawn` also represents arbitrary loose or
carried motion; a process restart restores that cube at (1190,538). A docked cube
restores at cargo centre (1310,538), immediately holding cargo power. Holder is
always null after process restart, and the first connected slot gets authority.
Within a loaded empty room, reconnect instead uses the last in-memory transform.
Corrupt existing room files fail closed without replacement. Reserved codes include persisted rooms, even when unloaded.

Version-1 rooms migrate on their next accepted join using the same atomic writer.
Codes, visitors, B latch, checkpoint, creation time and revision ordering survive.
The old `completed` flag meant only that both plates had been held; migration
maps it to `exitUnlocked`, starts `reachedExit` at `[false, false]` and reserves
new `completed` for actual arrivals. Previously solved rooms keep their open
exit and need only the new physical finish; no unobserved arrival is fabricated.
Version-2 records migrate to version 3 with safe `spawn` placement while preserving
existing unlock and arrival credit. Version-1 migration also initializes the cube
at spawn. Version-3 validation rejects inconsistent placement, unlock, arrival
and completion records without replacing the file. Campaign files and their migrations are unchanged.

An inactive in-memory room unloads after five minutes, checked every 30 seconds.
Its file is retained and loads again by code. Persisted rooms are not automatically
deleted. Capacity exhaustion returns an explicit busy/unavailable result; this is
a small single-machine prototype, not an unbounded matchmaking service.

On disconnect the avatar and momentary plate state disappear; B, exit unlock,
arrival credits, completion and checkpoint remain. Retries start around 300 ms, double to a 5-second maximum
plus up to 150 ms jitter. The client also has handshake and server-message
timeouts. On reconnect the same visitor receives a complete snapshot and spawns
at the current shared checkpoint: entry spawns above, or reunion P1 (1050,543)
and P2 (1150,543). Both are off plates on static ground. A live checkpoint update
does not teleport either player; only reset/death/rejoin reconstructs position.
Already-arrived players also respawn at this shared checkpoint, keep their
visible ARRIVED credit and need not repeat any step for completion. They may
walk back to regroup. A disconnected but previously arrived partner remains
counted; the remaining player must still reach the exit themselves.

## Feedback and diagnostics

F1 / Debug exposes transport state/URL, room code, local visitor and slot,
connected slots, revision, accepted inputs/outputs, server-message age, traffic
counters, consecutive reconnect attempts, remote-snapshot age, checkpoint,
exit unlock, each arrival and completion. Cube diagnostics add holder, physics
authority, epoch, snapshot age, semantic placement/cargo input, whether this
client owns confirmed physics, and sent/received cube snapshot counters.
`pendingCubeAction`, `predictedHolder` and `pendingSwitch` are explicitly local.
`interactionTimings` retains the latest result per action with prediction/send
time, confirmation or denial receive time, accepted flag and RTT in milliseconds.
These are development diagnostics only, not normal HUD or persistent state.
Normal HUD omits these diagnostics. Connection confirmation uses an existing cue.
Cube pickup/drop, local cargo contact and Switch B feedback can observe predicted
transitions. Matching server confirmation never plays them again; partners hear
the accepted transitions. Rejoin creates
a silent machinery baseline and only plays connection confirmation. Permanent
unlock plays the existing door cue once; leaving plates cannot replay or reverse
it. First arrival uses a quiet latch confirmation; the second arrival plays the
completion cue. Unlock/arrival/completion feedback remains authoritative.

## Running and validation

```sh
pnpm install --frozen-lockfile
pnpm dev                             # Vite on 5173 + real API/WS on 8080
# Or test the production server separately:
pnpm build
DATA_DIR=.local-data pnpm start        # HTTP/API/WS on 8080
pnpm typecheck
pnpm test:unit
pnpm test                            # live HTTP + WebSocket spec on 8080
pnpm check:browser                   # full C8 browser route
pnpm check:multiplayer               # own temporary server, two isolated contexts, actual restart
BN_TEST_TLS=1 pnpm check:multiplayer  # test-only TLS proxy + Secure cookies + WSS
```

Development needs no prebuilt `dist`. Its saves default to `.local-data/`, or
`DATA_DIR` when provided. `pnpm dev --host` exposes the frontend for LAN testing;
`--port` selects the frontend port and `DEV_API_PORT` selects the backend port.
The launcher configures the proxy from the backend's actual listening port.
It preserves the frontend Host header so same-origin campaign writes and
WebSocket upgrades pass the backend's origin check. Vite reloads frontend edits;
restart `pnpm dev` after changing server code.
If running the backend separately, use `pnpm dev:server` and `pnpm dev:client`
in two terminals. Do not start a second backend on an occupied port 8080.

`BROWSER_BIN=/path/to/chromium-compatible-browser` selects the browser. The local
machine's Snap Chromium could not launch with the temporary profile; installed
Brave worked. TLS tests need `openssl`; certificate exceptions are confined to
that temporary test browser. The proxy is test infrastructure, not a deployment
service. Browser scripts accept an optional URL and screenshot directory:

```sh
pnpm check:multiplayer http://localhost:5173/ /tmp/pairing-vite
pnpm check:multiplayer https://comp4020-final-ky787.fly.dev/ /tmp/pairing-fly
```

An explicit URL tests that app without restarting it. Use the Fly command **after
an authorized deployment**; this implementation pass does not push or deploy.
For manual play use a normal window + private window, two different browsers, or
isolated profiles. Two windows sharing the same cookie represent the same player.
Create in the first, COPY CODE, join in the second. Choose who holds A and who
grapples first. Try the opposite choice in a new room. After B, retrieve the
shared cube, try pulling and handoff in both directions, and dock it on CARGO
PLATE. Climb the powered access step and use opposite final plates, then leave
them and walk both bodies into the open exit. Check
that the first arrival alone does not complete. Try disconnect while holding A,
refresh while carrying, restart with cargo docked, and reconnect after one player
has arrived. Existing open
browser tabs should refresh after this coordinated client/server contract update.

Shared-cube milestone validation (2026-10-06):

- Typecheck and production build pass; the pinned 32-state UPLINK bundle retains
  SHA-256 `87dec9e470119a951eb1486e25d62226c72b34367e754b0a14b4e5a818c4c082`.
- 236 unit/server tests pass, with two existing conditional skips. The focused
  multiplayer/cube/state/world set contains 48 passing tests.
- All 95 real two-context HTTPS/WSS checks pass, including both handoff directions,
  actual carrying disconnect/rejoin and docked-cube process restarts.
- All 115 C8 browser checks and three live HTTP/WebSocket specs pass. Both CONTROL
  SPINE routes, campaign persistence and audio remain healthy. No console errors.
- Screenshots of handoff, docked cargo and completion were visually reviewed.

Exact logs and selected screenshots are in `docs/playtest/pairing-cube-*` and the
dated shared-cube handoff. Targeted development
checks cover protocol bounds, exclusive ownership/pulls, handoff symmetry, motion
stream revocation, real socket disconnect/replacement, semantic SIGKILL recovery,
version-2 migration, replica collision, sounds and the physical access step. The
real two-context route uses controls and read-only snapshots; it performs A/B in
both role assignments, cube pull, pickup, handoff, carrying disconnect/rejoin,
cargo docking, final access, opposite plates, both exit arrivals and restart with
cargo docked. No test substitutes world/controller mutation for the browser route.

Both browser harnesses launch with `--mute-audio` by default. Audio state/cue
assertions still run without audible output; only explicit `BN_TEST_AUDIO=1`
removes the output mute. Follow AGENTS.md: targeted tests during iteration, then
one complete relevant milestone validation when stable. C8 evidence, persistence,
both CONTROL SPINE routes and existing audio checks remain part of that gate.

## Responsiveness validation (2026-10-06)

For delayed semantic handling on a temporary test server:

```sh
BN_TEST_TLS=1 BN_TEST_SEMANTIC_DELAY_MS=200 pnpm check:multiplayer
# Or run a development server with the test-only injection explicitly enabled:
NODE_ENV=test BN_TEST_SEMANTIC_DELAY_MS=100 DATA_DIR=.local-data pnpm dev
```

The application reads this delay only under `NODE_ENV=test`; it is clamped to
0–1000 ms. Each semantic request gets an arrival deadline, so queued requests do
not each add another artificial sleep. Avatar/cube snapshots bypass the delay.
`attachMultiplayer` also accepts an optional `onActionTiming` observer for tests:
action type, queue delay, persistence duration, total time through broadcast, and
whether the operation was durable. Production emits no per-frame timing logs.
F1 client RTT measures request/confirmation including network and queue time; the
server callback separates queue and volume costs when diagnosing locally.

Stable milestone evidence:

- Typecheck and production build pass; the pinned UPLINK evidence hash is unchanged.
- 248 unit/server tests pass with three conditional skips. This includes 100/200 ms
  semantic-delay tests, exact disk-content checks for ephemeral mutations, durable
  storage failure, actual SIGKILL recovery, stale generation/sequence replies,
  prediction publication gates, and seamless/silent confirmation or rollback.
- All 115 C8 browser checks and three live HTTP/WebSocket specs pass; browser
  audio stays muted, campaign saves and both CONTROL SPINE routes remain healthy.
- All 135 real two-context HTTPS/WSS checks pass with 200 ms injected delay. Both
  pickup race orders, immediate feedback, post-race handoff, pending disconnect,
  carrying reconnect, docked-cargo restart and both physical exits pass.
- Observed control-to-local-feedback time was 25–33 ms; cube action confirmation
  RTT was 204–222 ms in this run. Switch-to-remote-bridge observation was 237–241 ms.
  These are localhost CDP observations under injected delay, **not Fly measurements**.
- The first full unit run in the working directory hit a Vite shutdown timeout:
  its filesystem watcher stalled on `lstat(Workspace)` while SMB was unavailable.
  The unchanged suite passed against an identical local source copy without that
  network mount. No timeout/assertion was weakened; Vite configuration is unchanged.

Logs are retained as `docs/playtest/pairing-responsiveness-*`. The browser
route uses real controls and read-only snapshots, and remains muted by default.
A reconnect regression found during this pass is covered explicitly: a prior
successful prediction must not suppress semantic cargo reconstruction in a new
world. Gameplay geometry, grapple tuning and durable room schema are unchanged.

## Limits and next acceptance step

The shared-cube architecture has been accepted on two physical computers. Stop
for manual acceptance of responsiveness after an authorized deployment: repeat
pickup/drop, handoff, simultaneous pickup, pull, Switch B and cargo contact on two
physical computers. Record typical Fly confirmation RTT from F1 alongside the
subjective local feel. Partner feedback still includes network/interpolation
delay; final cargo access intentionally waits for durable confirmation. Automated local HTTPS/WSS checks do
not replace that human acceptance. Fly auto-stop timing and touch multiplayer
remain unmeasured; Vite's existing retained-evidence chunk-size advisory remains.

The server does not simulate physics, validate proximity or reconcile dishonest
clients. Transfers can snap by one publication interval; replicas are about
100 ms behind. A paused/suspended authority browser can temporarily stop loose
motion while still connected; a partner can claim the available cube, and an
actual disconnect transfers it. Avatar/cube collision is approximate across
latency, with no remote-player impulses. Clearing cookies loses anonymous slot
ownership; full rooms retain reservations indefinitely. Persistent room files
need eventual explicit housekeeping if usage grows. Loss of the very first
create response can leave an unused saved room; subsequent reconnects rejoin the
acknowledged code. No durable state is deleted automatically.

After manual acceptance, the next separate pass can generalize this primitive
through RelayGatePair/LiftField, then design a full cooperative chamber. No relay
or lift transport, multiplayer CONTROL SPINE or new binary belongs in this
milestone. The C9 reflection remains the user's work.
