# Partner-held cube support stays local to avatar movement

Date: 2026-10-11. Status: implemented; awaiting two-computer acceptance.
Starting HEAD: `81422495b19e16b931b51ae298381f7970f3b1a2`.

Manual multiplayer testing found that loose relay cargo could obstruct later
players. It also motivated a cooperative boost using the existing overhead carry
pose. Both changes reuse the accepted hybrid authority and shared cube.

## Decision

`SharedCubeAuthority` exposes an optional one-way top surface for the **other**
slot's accepted carried cube. `PuzzleWorld` supplies it only to local player
movement. It never enters world architecture, loose cube integration, pressure
plate sampling, or relay clearance; it cannot be grappled. The carrier's browser
has no such surface. No avatar body becomes a collider.

Support requires a connected accepted holder, no pending local cube prediction,
both the latest and displayed carrier samples grounded, and avatar/cube stream
ages of at most 250 ms. A relay/respawn marker suppresses support for 100 ms.
Positions use the same 100 ms interpolated carrier as the visible overhead cube.
Latest-snapshot grounding revokes support ahead of that presentation buffer.

The existing one-way landing, grounded jump, coyote time, drop-through and landing
audio handle the rider. There is no carrier displacement or velocity transfer:
small horizontal movement can keep the cube beneath the rider; moving out from
under them makes them fall. Drop, accepted release/reset/disconnect, stale streams
or an airborne holder removes support. The partner remains under local physics,
including ordinary coyote time. There are no airborne elevators, rollback,
anti-cheat changes, ownership transfers or new server physics.

This deliberately trusts local movement derived from accepted shared holder
state plus remote avatar presentation, consistent with ADRs 0001–0003. Snapshot
delay and temporary support loss under network stalls remain known limitations.

## Relay egress

The confirmed obstruction was `cube-body` being included in the player's
destination-solid list once a loose cube rested. In the current RELAY LAB,
B → A reproduces permanently; A → B falls clear on the lower destination floor.
The focused regression failed before the fix at x=1008 instead of exiting A.

Shared loose cargo is now passed separately from authored blockers. The normal
authored destination must first pass its existing geometry/bounds check. If its
payload box overlaps a resting shared cube, choose one point just beyond that
cube on the gate's outward side, with a two-unit gap and at most 96 units of
horizontal adjustment. Recheck the complete payload at that position. If either
check fails, transit remains blocked. No geometry is disabled and the cube stays
untouched. This also avoids the ordinary cube collision pushing an arrival back
into the gate, which an ignore-only fix allowed in the extended regression.

Loose/carried transit, 650 ms per-entity cooldowns, cube authority/epochs and
stream discontinuities remain intact. C8 retains its previous clearance inputs.
Partner-held support never participates in destination validation.

## BOOST LAB

`boost-lab` is a small authored mock room. Its upper deck is 190 units above the
floor: beyond a floor or resting-cube jump, but reachable from an overhead cube
top 82 units above the floor. Either slot holds while the partner jumps twice.
The upper `boostRoute` control durably latches `routeLatched`, enables two return
steps and unlocks the exit. Both distinct physical arrivals still complete it.
Only this latch and the existing logical progress persist; support and transforms
do not. No binary or evidence claim is introduced. Final co-op levels and CONTROL
SPINE are unchanged. Stop here for human two-computer testing.
