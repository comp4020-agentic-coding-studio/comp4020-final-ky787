# Generalize the accepted shared cube per named entity

Date: 2026-10-11. Status: implemented for provisional CROSSFEED VAULT;
awaiting chamber playtest acceptance. Existing mechanics were manually accepted
before this task. Starting HEAD: `33e632878594bd4de75568ed00dd7f9028856e07`.

## Decision

CROSSFEED requires two payloads with independent logistics. Extend the existing
single-browser cube simulator and server arbitration per stable room-defined ID;
do not introduce a second bespoke cube implementation or server physics.

The server definition owns valid IDs. All cube wire messages identify one cube
and retain strict keys, authenticated slot attribution and per-entity epochs /
sequences. One player may control at most one held or pulled cube. Loose physics
authority may cover both cubes. A 90/sec, 120-burst token bucket accommodates the
three legitimate 20 Hz streams without removing resource limits.

Clients keep one pending interaction containing `cubeId`. Only that cube stops
publishing during prediction. Each cube has its own replica/interpolation buffer,
reconciliation state, carry/pull/reset presentation and discontinuity. A reset
clears only that payload and advances its stream epoch. Death-zone recovery now
uses the same accepted per-cube reset path as firewall destruction.

`PuzzleWorld` reuses one generic cube collection and the existing physics.
Single-cube rooms retain `world.cube` and wire snapshot `cube` aliases for existing
consumers; multi-cube rooms use the collection. Each resting cube provides an
independent local-player solid. Partner-held support is derived from the specific
accepted carried cube, with ADR 0005's one-way, grounded, fresh-carrier limits.
It is absent from architecture, grapple targets, sensors and relay clearance.

Relay cooldowns use cube IDs. Player egress checks permanent geometry first,
then steps outward past overlapping resting payloads, rechecking geometry and
bounds at each candidate. The displacement remains bounded to 96 units per
payload (192 maximum in CROSSFEED). Neither cube is moved to clear an exit.
C8 retains its previous single-player destination clearance behavior.

## Durable state

Version 5 replaces `cubePlacement` with `cubePlacements`. A version-4 one-cube
record migrates to `{cube: oldPlacement}` and a cubeless record to `{}`; the
validated version-1–3 progression migrations still apply. Migration fsyncs before
accepted join. Transforms, holders, authority, pull flags, epochs and sequences
remain ephemeral. Single-player persistence is unchanged.

CROSSFEED placements are spawn/liftCargo/finalLeft/finalRight. A simulator can
report one resting placement for its cube, and each sensor has single capacity.
The two final cube inputs therefore require two distinct cubes simultaneously.
A reset restores the individual authored original spawn and clears durable dock
placement. Reconnect reconstructs the collection without ghost holders.

## Alternatives and consequences

A global owner would prevent simultaneous P1/A and P2/B carrying. A special
second-cube type would duplicate accepted mechanics and invite divergence.
Server-side physics would change the architecture and authority model. None is
needed: the per-entity extension retains local movement and semantic arbitration.

The same trusted-client contact model remains; this is not anti-cheat. Remote
collision and boost retain presentation delay. Loose cube-on-cube stacking is
not added. Old open browser clients require refresh for the coordinated wire
upgrade. No binary/evidence artifact or CONTROL SPINE contract changes.

The chamber and its nine-input/seven-output mock contract are described in
[crossfeed-vault.md](../crossfeed-vault.md), **PROVISIONAL UNTIL HUMAN PLAYTEST
ACCEPTANCE**. Human puzzle acceptance must precede binary generation.
