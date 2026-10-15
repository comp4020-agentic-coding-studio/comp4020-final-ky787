# Level Workbench architecture (v1 documents, custom multiplayer)

Starting point: `de19da89bb29b4d647ac0569e428997917261d8e` (2026-10-13).
The pre-existing change to `CLAUDE.md` is unrelated and must be preserved.

The canonical format is version-1 JSON. Local development stores it in `levels/drafts`; the public builder stores the same complete document in IndexedDB. Geometry, controller
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
The production build includes a static public `workbench.html`; it registers no development workbench APIs. The separate public custom runner uses a bounded production snapshot API. File writes use
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

## Stage 1 storage boundary (2026-10-14)

`storage.ts` defines list/load/save/import/recovery and optional backend capabilities. `local-storage.ts` preserves the loopback API, origin/capability checks, disk hashes and canonical project files. Its existing local co-op snapshot operations remain separate capabilities. Local file rename/delete continue through normal filesystem tools.

`browser-storage.ts` owns `binary-ninja-level-builder` schema version 1, with `drafts` and `recovery` object stores. Draft records contain a random stable storage ID, portable filename, complete canonical document, SHA-256, monotonic revision and ordering timestamp. Revision checks and writes/deletes share a readwrite transaction, including same-content changes and renames. Hashing happens before opening the transaction, so async crypto cannot cause an early commit. Imports and Save copy always allocate new storage IDs; filename collisions are disambiguated. Document IDs remain authored, portable data.

Recovery keys belong to independent editing sessions/documents. Saving clears that session's snapshot and any recovered source only if its update timestamp still matches, protecting a live tab's newer recovery. Upgrades create missing stores additively; versionchange closes stale connections. Blocked, quota, security and version errors leave current work exportable and never imply a successful save. Recovery is best effort before abrupt closure, not a durability claim equivalent to explicit Save/Export.

`entry.ts` injects one backend into the existing editor. Production defines `__WORKBENCH_LOCAL__ = false`; the local service defines true in its own Vite configuration, also requiring DEV. Production tree shaking removes the local adapter. No API discovery, query parameter, imported document or runtime fallback can select filesystem mode. The Vite build rejects Node services, scripts, local storage, privileged local runner modules in emitted chunks. Existing pure allowlisted controllers are safe to reuse as browser computations; they do not start servers.

Code activation is an optional backwards-compatible v1 field: missing means controlled, new palette objects explicitly choose always-powered. Constant on/off use reserved coordinate-free adapter signals which cannot collide with schema IDs. The ordinary engine still decides solidity, hooks, collisions and renderer state. No campaign geometry, contract, native evidence or tuning changes are required.

The Stage 1 browser storage contract is retained. Stage 2 adds the explicit boundary below; Fly resources and campaign progress/party formats remain unchanged.

## Public custom multiplayer (2026-10-16)

Authoring is single-user. `BrowserDraftStorage` still saves version-1 canonical documents and revisions only in IndexedDB; only its explicit `freeze` operation uploads a copy. `public-session.ts` hashes locally and checks the server result. `my-levels.ts` reads the same database, without mounting the editor. No cloud sync or editor permission model exists.

`server/draft-registry.ts` contains the existing `DraftSessionRegistry` and declarative authority definition; the old CLI path re-exports it. `PublicDraftRegistry` adds bounded uploader grants, canonical byte accounting, reference tracking and expiry. It validates via `requirePlayable`, allows only the existing built-in controller IDs/version or the Boolean AST, and enforces a latched two-arrival exit. Uploaded paths, JS operators, unknown fields and incompatible controller contracts are rejected; no uploaded code is compiled or executed. Existing schema bounds remain: 384 objects, 8 cubes, 48 devices, 64 outputs, 192 bindings, 256 expression nodes and depth 16.

HTTP boundary:

- `POST /api/custom/snapshots` accepts `{document}` with the existing visitor cookie and same-origin policy; returns hash/controller metadata and a two-minute host upload grant. At most two request bodies are buffered concurrently, each at most 256 KB with a ten-second total deadline. Validation/registration concurrency is one. Attempts are bounded to three per visitor and twelve globally per minute, with rate bookkeeping itself bounded.
- `create-draft` on the authenticated WebSocket consumes the uploader's grant, creates a four-character room and reserves host slot 1. Public connections use `/ws?custom=1`; the same multiplayer handler runs both kinds. A join by code reserves guest slot 2. Existing cookie replacement and origin rules apply.
- `GET /api/custom/rooms/CODE/snapshot` checks retained room membership before returning document/hash, with `Cache-Control: no-store`. Downloads are bounded to twelve per member and sixty-four globally per minute. Knowing a SHA-256 alone grants neither create nor read access. There is no public arbitrary-hash or filesystem endpoint.

`attachMultiplayer` skips persistence for the explicitly temporary registry, including join, controls, completion and replay. Campaign rooms still follow atomic persistence; local developer sessions retain their earlier behavior. Public limits are eight active rooms, three staged/active sessions per visitor, 2 MB total canonical snapshot bytes (JS representation adds bounded overhead), two-hour lifetime and five-minute abandonment. The 30-second sweep and lazy join/download checks expire rooms, close sockets and release unreferenced snapshot documents/controller closures. Expired-code messages retain only 64 tombstones. Restarts discard all custom memory.

Campaign traffic keeps reserved capacity: custom creation stops at 56 of the existing 64 total room slots; custom sockets are capped at 24 and refused at 96 of 128 total sockets. Custom semantic traffic stops at 64 queued events versus the global 256, with eight pending actions per peer. Existing bounded transform rate/cube simulation rules are retained. This is a conservative single-machine bound, not protection against every network denial-of-service attack.

`DraftSession` takes a snapshot URL callback, keeping local capability endpoints out of production chunks. `public-runner.ts` loads through the member endpoint, checks canonical hash and controller metadata, then uses `DraftCoopAuthority`, `CoopClient`, `PuzzleWorld`, `PuzzleRenderer`, `GameAudio` and `AudioPresentation`. Both test and normal modes are one entry/engine; mode only enables a read-only test panel. Its automation observation returns detached data and exposes no editor, authority or mutation handle. Guests get no editing interface. Public replay accepts only the existing hash, from slot 1; it increments `levelInstance`, retires old streams/predictions and resets the same shared machinery/cubes. Local host replacement remains a local capability.

Production builds include `custom-level.html` and `my-levels.html`; `workbench-runner.html` stays local and retains CLI recording/scenario operations. The build audit rejects local storage/service/runner and Node modules in browser chunks. The Docker runtime copies server and TypeScript source dependencies for validated registry imports; those sources are not served over HTTP. No new Fly machine, volume or account is needed.

Breakpoint placement lives in `editor-operations.ts`. It searches conservative permanent footing, adds only missing milestone/slot markers, and shares the existing history transaction. No geometry is inferred from controller evidence. The inspector frames marker links and exposes an explicit repair action; failures remain visible validation diagnostics. Runtime checkpoint activation is unchanged.

Acceptance uses `check:public-coop` against built assets and the production Node server, plus the existing public-builder and local-workbench checks. Its route uses keyboard/mouse actions in isolated browser identities and detached observations, never gameplay state injection. Human acceptance remains required before expanding accepted puzzle content or binary contracts.
