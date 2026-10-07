# Co-op level definitions and server-owned transient machinery

Date: 2026-10-07. Status: implemented; mechanics labs await two-computer manual acceptance.
Starting HEAD: `e3bc06469f0be79f73ffd0f95de3882e6cff3bc0`.

The room-code, shared-cube and prediction foundation is manually accepted on two
physical computers. This milestone extends that infrastructure to four short
mock laboratories without changing the accepted PAIRING BAY puzzle or the C8
campaign / CONTROL SPINE contract.

## Decision

A code still identifies one two-visitor session. Its creator selects a level;
joining requires only the code. `SharedRoom` is a discriminated union indexed by
`CoopLevelId`, with common membership, revision, checkpoint, optional cube and
physical exit-arrival fields, plus the selected level's logical `levelState`.
The frontend registry selects hand-authored geometry and a small authority
adapter. A separate server registry selects coordinate-free semantic rules.
The server never imports geometry or simulates a player.

The shared cube retains the accepted single-browser simulator and server grants.
Relay and lift apply the existing `RelayGatePair.teleport` and
`LiftField.influence` paths. Ordinary relay transit does not change holder,
physics authority or epoch. Explicit `discontinuity` markers in avatar/cube
streams clear interpolation buffers, including short teleports. They are visual
metadata, never a claim to ownership or logical progress. Carry replicas follow
the same snapped avatar; local relay clearance counts only a locally held cube.

A checkpoint is shared durable progression, not an instruction to teleport live
players. Death and R release that player's momentary/carry/pull state and respawn
only that body at its slot's current shared checkpoint. A sequenced `local-reset`
also handles an outstanding cube grant. Partner physics and shared progress
continue. Full-room reset/voting is deferred.

## Crumble authority

Independent browser fuses would produce different collision times, so co-op
crumble uses one ephemeral server clock. The server accepts membership-checked
semantic foot/hook reports for known platform IDs. It retains a phase and
deadline per ID and broadcasts only phase transitions. Snapshot views contain
phase, remaining milliseconds and authored duration. No coordinates are needed.

Stable → warning → broken → stable uses 600 ms foot warning, 1,650 ms hook warning
and 2,400 ms broken duration. A 20 ms process clock schedules due transitions
through the existing serialized logical queue. If processing is delayed, each
broken phase still receives its full duration. A local trigger may predict only
the warning; its countdown reaching zero never removes collision. Only the
accepted broken phase disables collision/hooks, cancels the local rope, and
emits collapse feedback once. A denial reconciles with the current phase.

Server restart (and idle room unload/reload) reconstructs platforms as stable.
Timers, cooldowns, body transforms and interpolation never enter `/data`.
CRUMBLE LAB durably remembers that foot and hook tests were accepted; both unlock
its exit, while each distinct body must still physically arrive. Test completion
is not binary evidence. The existing C8 local crumble path is unchanged.

## Durability and migration

Room schema 4 separates common session fields from level-specific durable state.
The legacy validated reader migrates PAIRING BAY versions 1–3 on accepted join,
atomically before acknowledgment. Code, visitor assignments, Switch B,
checkpoint, cube placement, unlock, arrivals, completion and creation time are
preserved. The existing version-1 interpretation (plates-only completion becomes
unlock without invented arrivals) remains; versions 1–2 initialize absent cargo
at spawn. Corrupt records fail closed. The campaign schema and files are unchanged.

A durable latch/test/checkpoint/placement/arrival change still fsyncs before
acknowledgment. Body reports, cube grants, transforms, and crumble phase clocks
remain ephemeral. The first accepted crumble trigger of each style writes its
logical test credit; subsequent cycles and phase transitions cause no disk writes.

## Limits and acceptance

Clients remain trusted to report their own legitimate physical interactions;
this is not coordinate-based anti-cheat or lockstep simulation. Clock/countdown
presentation is approximate under network delay. Actual collision changes follow
server messages, so reception skew remains subject to latency. Suspension may
pause a cube simulator as before. No accounts, matchmaking, player-player
collision, new binaries, real-controller claims or final campaign are added.

The [multiplayer contract](../c9-multiplayer.md) defines the lab routes, wire
messages, recovery behavior and validation commands. After deployment, stop for
two-computer manual testing. Do not expand these test chambers into final levels
until they are accepted.
