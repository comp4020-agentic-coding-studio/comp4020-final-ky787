# Level Workbench v1 architecture

Starting point: `de19da89bb29b4d647ac0569e428997917261d8e` (2026-10-13).
The pre-existing change to `CLAUDE.md` is unrelated and must be preserved.

The canonical source is versioned JSON in `levels/drafts`. Geometry, controller
configuration, presentation and editor metadata are separate. Ordered arrays retain
intentional drawing order; canonical serialization sorts object keys, not arrays.
Content hashes are SHA-256 of that serialization. Invalid gameplay references may
be saved with diagnostics, but malformed structures and unknown schema versions
are rejected and blocking diagnostics prevent runtime creation.

The room adapter constructs `RoomDef` and `PuzzleWorld`; it does not implement
movement or collisions. Rectangles use top-left world coordinates, body and cube
homes use centres, and floor-mounted device/pedestal positions use floor contact.
Both authored player slots and checkpoint positions are retained. Draft IDs map
through bounded validated registries rather than masquerading as campaign IDs.

Basic logic uses typed Boolean expression trees (constant, reference, AND, OR,
NOT). Device state is explicit. References and cycles are checked before play.
Destination bindings encode activation/open/power and apply inversion once;
decorative wire points never define behavior. Trusted built-in controllers retain
the existing coordinate-free implementations, including clocks, grace intervals,
and shared crumble. Their registry is an allowlist, never an executable path.
Imported geometry is a mock draft copy and grants no evidence classification.

Editor, preview, CLI screenshots and tests share the real `PuzzleRenderer` and
engine. Edit never advances physics. State preview distinguishes evaluated inputs
from forced diagnostic outputs. Play clones authored data, records measured paths,
and restores the editor camera/document on stop. Recordings carry the draft hash,
engine revision and scenario identity. A local simulation is labelled as a physics
preview, not proof of two-player completion.

A separate loopback workbench entry point hosts the editor and local file service.
The production entry and build do not register workbench routes. File writes use
strict draft-root confinement, no symlink traversal, size limits, an origin check,
a random local write capability and atomic replacement with expected-content-hash
checking. Recovery and ephemeral sessions/reports live under ignored `.workbench`.
No tutorial or campaign progress store is opened by the editor.

Local draft co-op reuses the existing WebSocket server, identity and cube authority
with an explicitly injected workbench snapshot registry. A validated frozen draft
hash and controller version travel with a fresh level-instance generation. Saving
cannot alter an active snapshot. Explicit host restart replaces it, retires old
streams/predictions and rejects stale messages. Built-in imported rooms use their
existing definitions; basic drafts use the same shared declarative evaluator as
preview. Draft completion is isolated from campaign party badges and saves.

Implementation ownership: integration/storage/CLI/docs (root), schema/import and
engine adapter (runtime agent), editor operations/UI (GUI agent), protocol and
local draft session adapter (multiplayer agent). Shared interface changes are
coordinated before editing. Narrow tests accompany each seam; the final integrated
pass covers old campaign behavior, browser editing, physical controls, frozen
sessions, storage conflicts and production endpoint exclusion. Static validation
never claims reachability or puzzle quality. Human editor and two-player acceptance
remain an explicit final gate, not an invented automated result.
