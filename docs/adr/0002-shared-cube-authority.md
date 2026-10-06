# One browser simulates the shared cube; the server grants that authority

Date: 2026-10-06. Status: implemented for PAIRING BAY; shared-cube behavior manually accepted on two physical computers.
Starting HEAD: `cbad2534d2b19f1ff799c9d540f5cd972cad97bd`.

The existing same-origin Node/Fly multiplayer architecture and symmetric exit
have been accepted on two physical computers. Adding one physical cube requires
one coherent body that either player can carry, drop and pull, without rewriting
the tuned browser collision/carry/grapple system or introducing server physics.

## Alternatives

1. **Both clients simulate independently.** Low implementation cost initially,
   but input order, frame timing, collision and ownership races produce different
   bodies. Neither the cargo plate nor handoff would have a stable physical source.
2. **Full server cube simulation.** Stronger physical validation, but requires
   geometry/physics on the server plus prediction/reconciliation for carry and
   grapple forces. This is a larger change to the accepted hybrid architecture.
3. **Chosen: one browser simulates at a time, with server arbitration.** Reuses
   the existing tuned physics. The server retains an in-memory transform and
   exclusively grants the right to publish it; replicas interpolate without
   integrating a second body.

## Decision

The server maintains separate `holder` and `physicsAuthority`. Pickup grants
both to the authenticated requester. Drop clears holder, retaining the simulator.
Either player may later claim the free cube. The first accepted serialized
pickup wins; the other request receives a nonfatal denial. The subsequent
[responsiveness decision](0003-multiplayer-prediction.md) adds temporary local
prediction and rollback without changing accepted ownership or publication rights. Slot numbers retain no gameplay priority after initial assignment.

A loose pull can transfer physics authority. An ephemeral `pulling` flag protects
that grant until release, preventing competing requests from repeatedly stealing
the same pull. Its owner may pick up; partners cannot pull a carried cube. Pull
release keeps loose physics with the current simulator. There is no second pull
owner or persistent pull state.

Every ownership/control handoff advances a cube epoch and resets its sequence;
ordinary pull-stop leaves the same loose stream running. Old-epoch snapshots are
rejected even with a larger sequence. The new simulator starts from the latest
accepted transform, snapping rather than interpolating an authority transition.
Drop includes a bounded proposed transform, accepted only from the holder.
Disconnect or same-cookie replacement clears carrying/pulling, revokes the old
stream and transfers to the connected partner. If nobody remains, physics stops
and the latest transform remains in memory until room unload. Reconnect assigns
a simulator without restoring a ghost holder.

Only the current simulator can report cargo contact. The server derives
`cubeOnCargoPlate` and momentary `finalAccess`; players cannot satisfy cargo.
Final opposite body plates still permanently unlock the exit, and both distinct
physical arrivals still complete it. All machinery remains authored/mock.

## Durability and consequences

Version-3 room records add only `cubePlacement: "spawn" | "cargoPlate"`. Transforms,
velocities, holder, authority, pull lock, epochs and sequences are ephemeral.
Snapshot traffic never enters the persistence queue. A process restart restores
arbitrary loose/carried cargo at the safe authored spawn and docked cargo at its
plate. It assigns authority to a connected browser, with no retained holder.
Version-2 migration preserves unlock/arrival progress and starts the new cube at
spawn; the existing version-1 completion-to-unlock migration remains intact.

This prevents duplicate accepted simulations while retaining responsive physics.
It accepts approximate remote collision and a 100 ms presentation delay. The
server trusts the authorized browser's physical proximity/contact reports and
bounded transforms, as it already trusts local avatar interactions. It is not an
anti-cheat system. Browser suspension may pause loose motion until another player
claims it or disconnect detection transfers authority. Existing heartbeat,
session, persistence and single-process Fly boundaries remain unchanged.

The authoritative contract, exact protocol, recovery rules and validation live
in [c9-multiplayer.md](../c9-multiplayer.md). RelayGatePair/LiftField transport,
multiplayer CONTROL SPINE and new binary controllers require a later accepted
mechanics/design pass.
