# Client-authoritative movement, server-authoritative puzzle state

Date: 2026-10-06. Status: accepted for the PAIRING BAY infrastructure prototype.
Starting Git HEAD: `55aaa36edc75b3be9bfa9ff6cb54a35e05ae2b65`.

Binary Ninja has responsive local platform/grapple physics but needs real-time
two-player puzzle interaction. C8 campaign progress and retained CONTROL SPINE
evidence remain independent of the new co-op session.

## Alternatives

1. **Fully server-authoritative physics:** strongest consistency and movement
   validation, but a major rewrite with latency/prediction complexity that risks
   changing tuned movement feel.
2. **Host-browser authority:** relatively simple, but makes one player special,
   complicates host disconnect/migration and durable shared state.
3. **Chosen hybrid:** each browser owns its avatar motion; the existing Node
   process owns membership, inputs, outputs, checkpoint and completion. This
   preserves responsive movement, consistent machinery and the one-machine Fly
   topology, with a clear boundary for later shared-cube arbitration.

Remote avatars are approximate, interpolated presentation. They have no collision
with players or machinery. The server trusts a browser to report its own semantic
physical interactions, never another slot's. This is not an anti-cheat design.
Frontend-authored coordinates are not server controller inputs.

## Player identity and cooperative progression

**Player slots identify players; they do not define gameplay roles.** Ownership,
reconnect, avatar colour, stream attribution and distinct-body checks use slots.
Plate/switch access and traversal roles do not. PAIRING BAY lets either player
hold A, grapple first, latch B or occupy either final plate. Future asymmetric
characters would require a deliberate separate level design.

Two-computer human testing validated networking but found the initial plates-only
completion physically awkward: leaving the plates closed the exit. The final
plates now permanently latch `exitUnlocked` with two simultaneous distinct
bodies. This opens the door; it does not complete the room. Each client then
reports its own actual exit contact with a sequenced `exit` intent. The server
accepts it only after unlock and completes once both distinct slots have arrived.

Each arrival persists as semantic progress even after walking away, disconnect
or restart. This authored decision avoids requiring simultaneous occupancy of a
small trigger. The enlarged exit permits both avatars to stand together. All
rejoins use the shared checkpoint; already-earned arrival credit stays visible
and does not need repeating. The trust boundary remains unchanged: the frontend
detects physical contact, while the server owns unlock, arrival and completion.

## Connection and durability

Same-origin `/ws` upgrades the existing HTTP server on port 8080. Browser protocol
follows the page (`ws` locally, `wss` through Fly HTTPS). No other service or port.
The existing HttpOnly `bn_visitor` cookie owns slots; a room code selects a shared
session, not a person or campaign save. Identity is established before upgrading.

Sockets are disposable. Disconnect removes the avatar and releases body-held
controls. Latches, exit unlock, arrivals, checkpoint, completion and visitor-owned slots remain. The same
visitor reclaims its slot and receives a complete authoritative snapshot, spawning
at the shared checkpoint. Automatic retries use bounded backoff. Missed messages
are not replayed. Replacement connections retire the old socket before it can
act again. Logical revisions and ephemeral movement sequences are separate.

Campaign files retain their C8 paths and migrations. New room records live under
`/data/rooms/`; no player position, velocity, rope, socket or interpolation buffer
is stored. Atomic writes use the existing fsync/rename/directory-fsync discipline.
Version-2 room records add unlock and arrival flags. Legacy plates-only completion
migrates to exit unlock, preserving solved machinery without inventing arrivals;
both players then perform the newly required physical finish.

PAIRING BAY is an authored mock multiplayer test chamber. It introduces no binary
or claimed assembly evidence. Shared cubes and multiplayer CONTROL SPINE await
manual playtesting and a separate design pass.

Implementation limits, exact protocol, persistence paths, lifecycle and validation
are recorded in [the multiplayer contract](../c9-multiplayer.md). Inactive rooms
unload after five minutes without deleting their files. Slots stay reserved.
Closed sockets release on handling; undetectable network loss uses a 5-second
heartbeat with termination after a missed pong. No player-player collision is
implemented. No Fly configuration change was needed. The original multiplayer
build passed deployed two-browser checks and subsequent two-computer human
testing; this revised gameplay contract still requires manual acceptance.
