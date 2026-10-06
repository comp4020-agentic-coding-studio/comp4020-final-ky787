# PAIRING BAY multiplayer infrastructure

Implemented 2026-10-06, starting at
`55aaa36edc75b3be9bfa9ff6cb54a35e05ae2b65`.
This is a two-player infrastructure/gameplay prototype. Two-computer human
playtesting validated the deployed networking and motivated the role/exit
correction described below; the revised chamber awaits another manual playtest.
The four C8 campaign rooms, personal saves and retained CONTROL SPINE binary stay
independent. No shared cubes or multiplayer CONTROL SPINE are implemented.

## Authority and modules

See [ADR 0001](adr/0001-multiplayer-authority.md).

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
| `server/multiplayer.ts` | Slots, sessions, serialized logical mutations, persistence, socket lifecycle and avatar forwarding |
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

The chamber is 1,850 × 780, with no cube. The near bank ends at x=460 and the
far bank begins at x=880. Its 420-unit death gap and anchor centre (770,226)
reuse the accepted SWITCH traversal proportions. Entry spawns remain (150,543)
and (405,543); these are starting positions, not assigned jobs. Both can walk
freely between A and the approach. Static banks remain solid and unhookable.
Inactive code remains ghosted/non-solid; accepted power lights/enables it.
The exit is now a 130 × 140 area at (1700,420), wide enough for both avatars,
just beyond the final right plate. No new movement mechanic or tuning is used.

| Semantic input | Ownership/meaning |
| --- | --- |
| `plateAOccupied` | Either connected body occupies A (250,560) |
| `switchB` | Either player's own nearby E interaction at B (1060,560), latched |
| `finalPlateLeftOccupied` | A connected body on left final plate (1370,560) |
| `finalPlateRightOccupied` | A connected body on right final plate (1610,560) |

Each slot reports **one** of `plateA`, `finalLeft`, `finalRight`, or `null`.
The server derives occupancy from both connected slots. Final plates are accepted
only after B latches. Reports carry no caller-chosen slot or visitor ID.

| Authoritative output/state | Rule |
| --- | --- |
| `grappleAnchor` | `plateAOccupied` |
| `returnBridge` | `switchB` |
| `exitUnlocked` | Permanently latched by two connected distinct bodies on opposite final plates after B |
| `exitDoor` | `exitUnlocked`, regardless of current plates/connections |
| `reachedExit[slot - 1]` | Permanently recorded when that slot reports its own physical arrival at the unlocked exit |
| checkpoint | `entry` initially; `reunion` when B latches |
| `completed` | Both `reachedExit` flags are true; unlock alone never completes |

Phase 1: either player holds A while the partner uses the grapple slab. Removing
the last body from A disables the slab and releases its rope through the existing
rules. Phase 2: either player presses E near B; the bridge materializes and the
reunion checkpoint is saved. Phase 3: opposite final plates latch the door open
with **EXIT UNLOCKED · REGROUP**. Both leave their plates and enter the nearby
exit. The first arrival shows **1 / 2 ARRIVED**; the second produces **PAIRING
COMPLETE**. P1-left/P2-right and P2-left/P1-right work identically.

Arrival is deliberately lasting semantic progress, not simultaneous exit
occupancy: once a player reaches the unlocked exit, walking away or disconnecting
does not remove their credit. The other distinct player must still reach it.
Repeated arrival messages from one slot cannot finish for the other. The door
stays open after plate release, disconnect, reconnect, restart and completion.

The server knows none of these coordinates. The owning browser detects its own
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

## Protocol, revisions and limits

Client messages are JSON discriminated by `type`:

| Type | Fields |
| --- | --- |
| `create` | none |
| `join` | `code` |
| `avatar` | `seq`, bounded `avatar` (`x`, `y`, `vx`, `vy`, `facing`, `grounded`, optional visual rope tip as object or null) |
| `occupancy` | `seq`, `plate` (single enum or null) |
| `switch` | `seq` (the room's sole switch) |
| `exit` | `seq` (this connection's own physical arrival, only after unlock) |
| `leave`, `ping` | none |

Server messages: `snapshot` (assigned slot and full room), `room` (full accepted
state at a newer revision), `avatar` (server-owned slot, stream ID, sequence and
bounded visual snapshot), `error` (public code/message) and `pong`. Full room
state includes level, code, revision, assigned/connected slots, inputs, outputs,
`exitUnlocked`, both `reachedExit` flags, checkpoint and completion. Other visitors' UUIDs are never broadcast.

Every accepted shared mutation increments the durable room revision. Writes
complete before its revision is acknowledged/broadcast. On close, the body is
removed immediately from in-memory logic, then the durable updated revision is
broadcast. A storage failure closes room connections rather than acknowledge
unsaved changes. Clients apply ordinary room updates only when their code matches
and revision increases. A new connection's initial snapshot establishes its
baseline; missed messages are never replayed. Semantic sequence numbers are
per-socket and independent of room revisions; stale reports are rejected.

Movement is sent at up to 20 Hz, forwarded only to the partner and never enters
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
bucket (40 messages/sec, 80 burst), at most eight queued semantic operations;
the service bounds total queued work (256), peers (128) and loaded rooms (64).
Slow recipients exceeding 64 KiB buffered outbound data are disconnected.
Server heartbeat runs every 5 seconds; a missed pong terminates the socket on
the next pass. Unjoined sockets expire after 15 seconds. Graceful socket closes
release on handling; a physically severed network is detected within roughly
5–10 seconds, since the server cannot observe it instantaneously.

## Persistence and recovery

```text
/data/<visitor UUID>.json   existing C8 envelope, version-3 campaign progress
/data/rooms/<CODE>.json     version-2 shared co-op logical record
```

No campaign file moves and no new campaign migration is necessary. Existing
version-1/2-to-3 migrations and corrupt-save behavior still pass. The shared
atomic writer preserves temporary-file fsync, rename and directory fsync with
mode 0600 and acknowledgement after durability, under the single-writer model.

A room record stores version, code, level, revision, the two visitor assignments,
B latch, checkpoint, `exitUnlocked`, both semantic `reachedExit` flags, completion,
and creation/update timestamps. Even momentary
changes persist only the revised logical record: **no plate occupancy, connection
flags, position, velocity, grapple, socket or interpolation data is saved**.
Movement alone causes no writes. Corrupt existing room files fail closed without
replacement. Reserved codes include persisted rooms, even when unloaded.

Version-1 rooms migrate on their next accepted join using the same atomic writer.
Codes, visitors, B latch, checkpoint, creation time and revision ordering survive.
The old `completed` flag meant only that both plates had been held; migration
maps it to `exitUnlocked`, starts `reachedExit` at `[false, false]` and reserves
new `completed` for actual arrivals. Previously solved rooms keep their open
exit and need only the new physical finish; no unobserved arrival is fabricated.
Version-2 validation rejects inconsistent unlock/arrival/completion records
without replacing the file. Campaign files and their migrations are unchanged.

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
exit unlock, each arrival and completion.
Normal HUD omits these diagnostics. Connection confirmation uses an existing cue.
Plate/code/bridge/door/switch sounds observe applied authoritative transitions;
reporting local intent does not play the same shared sound again. Rejoin creates
a silent machinery baseline and only plays connection confirmation. Permanent
unlock plays the existing door cue once; leaving plates cannot replay or reverse
it. First arrival uses a quiet latch confirmation; the second arrival plays the
completion cue. All come from newly applied authoritative transitions.

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
grappels first. Try the opposite choice in a new room. After B, use opposite
final plates, then leave them and walk both bodies into the open exit. Check
that the first arrival alone does not complete. Try disconnect while holding A,
refresh after B, and reconnect after one player has arrived. Existing open
browser tabs should refresh after this coordinated client/server contract update.

Validation recorded for the symmetric-role / physical-exit correction:

- Typecheck, production build and unchanged pinned 32-state UPLINK bundle pass.
- 211 unit/server tests pass; two pre-existing conditional skips remain. New
  coverage includes A/B access by either slot, either final-plate assignment,
  single-body alternation, two bodies on one plate, premature/stale/duplicate
  arrivals, strict impersonation rejection, permanent unlock and both arrival
  orders. Actual process restarts preserve partial arrivals and completion;
  version-1 room migrations retain solved progress without inventing arrivals.
- Existing session/code/reconnect, malformed/oversized payload, traffic limits,
  idle unloading, campaign migrations and development-launcher tests still pass.
- The existing C8 browser route passes all 115 assertions, including both CONTROL
  SPINE solutions, saves, reset and audio; retained evidence is unchanged.
- The HTTPS/WSS browser route passes **67 checks** across **both role assignments**.
  Each run creates/joins through the UI, copies the real clipboard code, moves
  remote avatars, holds A, grapples, latches B, refreshes, crosses the bridge and
  swaps the final-plate assignment. Both plates unlock without completing; both
  bodies leave the plates and physically enter the exit in opposite arrival
  orders. First-arrival credit survives leaving the zone and an actual SIGKILL /
  server restart. Door feedback plays once; completion sound waits for arrival 2.
  No world/controller mutation substitutes for controls. No console errors.
- Local propagation bounds, including physical approach/input time:

  | Roles | Plate A | Switch B | Final unlock |
  | --- | --- | --- | --- |
  | P1 holds / P2 runs | 493 ms | 66 ms | 473 ms |
  | P2 holds / P1 runs | 604 ms | 63 ms | 468 ms |

- Three live HTTP/WebSocket specs pass against the same Node app.
- Logs and selected screenshots: `docs/playtest/pairing-symmetry-*`. Earlier
  infrastructure evidence remains under the original `pairing-*` filenames.
- The prior `7aa75e3` build passed GitHub CI's real Docker build/tests and a Fly
  deployment, followed by deployed two-browser checks and the user's successful
  two-computer networking test. This gameplay correction is verified locally;
  it has not yet been pushed/deployed or manually accepted on two computers.

## Limits and next acceptance step

Repeat the two-computer manual playtest after an authorized deployment of this
correction, swapping all roles in a fresh room. Review permanent unlock feedback,
physical exit arrival and partial-arrival reconnect behavior. The original build
has been validated on Fly; the new semantics currently have local HTTPS/WSS
evidence. Fly auto-stop recovery timing remains unmeasured. Vite's existing large
retained-evidence chunk advisory remains. Touch multiplayer is unvalidated.

There is no anti-cheat or host migration because there is no host browser.
Clearing cookies loses anonymous slot ownership. Full rooms retain reservations
indefinitely; persisted files need eventual explicit housekeeping if usage grows.
Loss of the very first create response before a code is received can leave an
unused saved room when the client retries creation; no gameplay has started yet.
Subsequent reconnects always rejoin the acknowledged code. No durable state is
deleted automatically.

Stop for manual playtesting. After acceptance, the separate next work is shared
cube arbitration, possibly multiplayer RELAY, then a genuine cooperative CONTROL
SPINE redesign. New binary controllers should follow stabilized co-op contracts.
C9 reflection content is left to the user.
