# Debugger infrastructure visuals

These Canvas 2D assets are authored presentation metaphors. They do not depict
literal instructions, binary addresses, native blocks, or obfuscator evidence.

| Asset | Meaning | Silhouette and status |
| --- | --- | --- |
| ENTRY POINT | Authored player spawn infrastructure | Compact cyan attach gateway; SESSION ATTACHED; no checkpoint flag |
| BREAKPOINT OFFLINE | An authored checkpoint station before its existing milestone is accepted | Neutral pedestal, amber/grey screen, retracted mast |
| BREAKPOINT ACTIVE | Saved checkpoint/respawn milestone | Red screen, circular breakpoint emblem, extended mechanical mast and banner; body stays neutral |
| TRAVEL INCOMPLETE | Exit route is unavailable | Heavy portal frame, grey status, dim field |
| TRAVEL COMPLETE | Exit route is available | Green status and illuminated frame/field |

Exit readiness is separate from arrival. Co-op gates retain their physical
`0 / 2 ARRIVED`, `1 / 2 ARRIVED`, and `2 / 2 ARRIVED` display. The accepted party
completion event still controls victory and host navigation. Turning the gate
green never completes a party by itself.

Toggle levers retain their pivoting handles. Payload sockets retain their amber
outlined cargo bays. Pressure plates retain their low, compressible footprints.
None use checkpoint masts or breakpoint terminology.

## Rendering and state boundaries

- `src/slice/hero-render.ts` owns shared beveled panels, brackets, bolts, fields,
  gateway construction, pedestal drawing, and bounded procedural particles.
  Its helpers consume geometry, booleans and presentation clocks, not authority.
- `src/slice/hero-presentation.ts` observes checkpoint, exit readiness and
  completion edges. `reset` baselines a room/reconnect snapshot: retained active
  checkpoints render fully deployed, without replaying deployment or sounds.
- `PuzzleRenderer` positions these assets in the existing world transform.
  `SliceGame` sends returned cosmetic cues to the existing audio manager.
  Camera updates, screen-to-world aiming, simulation steps and network messages
  keep their existing ownership.
- Animation clocks are local and disposable. They do not enter visitor progress,
  room persistence, or the protocol. Diagnostics expose ages through
  `snapshot().heroAssets`; `null` means an already-settled baseline.

The visible exit opening uses the exact existing trigger rectangle. Its frame
extends outside that rectangle but adds no colliders, hooks or blocking solids.
New room definition properties describe presentation only; spawn and checkpoint
coordinates remain independent.

## Authoring

Solo rooms default to an entrance at `spawn`. Co-op rooms supply the same
`entryPoints` array for both clients, containing their existing authored spawn
positions. Points on the same floor within 140 world units share a frame with
separate projection lanes. PAIRING BAY's distant points receive separate compact
stations. Entry projection starts on the first running frame after a room is
loaded, so an initial menu or overview cannot consume it. Ordinary deaths/resets
do not replay attachment. Reloading at a saved checkpoint does not attach at the
old entrance.

Optional `RoomDef.breakpoints` describes actual checkpoint stations:

```ts
breakpoints: [{
    id: 'system-online',
    at: { x: 1120, y: 750 }, // floor contact, not a respawn position
    checkpoint: 'upper',
    label: 'AUTO CHECKPOINT',
    automatic: true,
}]
```

`activationControl` optionally replaces an existing control's drawing. It does
not register an interaction or change its reach. It also supports `lever` and
`upperLever` for the older room definitions. Legacy stations without automatic
contact still observe controller-owned milestones. Declarative workbench stations
activate by floor-level walking contact; their old `activationControl` association
is retained for document compatibility but does not hide or trigger that control. Checkpoint IDs currently use the existing
`relay`/`upper` progress vocabulary; reaching upper retains earlier relay stations.

The current campaign displays pedestals in HANDSHAKE and CROSSFEED VAULT only.
CROSSFEED's automatic pedestal sits beside the separate SYSTEM ONLINE terminal.
Walking activates the upper checkpoint; E at SYSTEM ONLINE commits permanent lift
power and service access. Existing flag/audio timing is unchanged. ROUTE SELECT
remains a toggle. CONTROL SPINE keeps its controller-specific checkpoint contract.

Rooms without an authored station preserve their existing respawn behavior.
A quiet red floor bracket marks a non-entry checkpoint; there is no invented
interactive terminal. The old floating cyan checkpoint flag has been removed.

## Animation and sound

| Sequence | Local timing | Presentation |
| --- | --- | --- |
| Entry | 0–0.85 s | Field brightens, vertical scan/ring crosses each spawn lane, particles converge |
| Breakpoint terminal | 0–0.2 s | Status illuminates red and display flashes |
| Mast | 0.2–0.8 s | Smoothstep telescoping extension and side-lock movement |
| Banner | 0.8–1.2 s | Smoothstep mechanical unfolding |
| Confirmation | 1.2–1.6 s | Red perimeter pulse and outward particles |
| Exit unlock | 0–1 s | Sequential frame nodes, traveling perimeter pulse, field powers up |
| Party completion | 0–0.65 s | Green field flare and converging traces beneath the immediate existing victory menu |

Active pedestal idle keeps the mast, banner and red status, with a quiet indicator
pulse. Deployment starts only on an inactive-to-active checkpoint edge. Repeated
snapshots, local respawns, pauses and restored state never restart it. Reversible
exit readiness may legitimately trigger another unlock animation after relocking.

Audio reuses credited files in `public/audio/credits.json`: quiet
`grapple-attach.ogg` for entry, a slowed `door-open.ogg` for mechanical deployment,
and `confirm.ogg` at banner confirmation. Existing exit/party cues remain in use.
No audio files or licenses were added. Mute, gesture unlock, voice limits and
distance attenuation remain in the existing framework; browser tests stay muted.

Below 0.68 camera zoom, small anchored badges preserve major text and exit arrival
counts in screen pixels. Ornament can disappear, but material mass, semantic
colour and raised-flag silhouette remain. These badges never change camera or
input coordinates. The exit badge sits below the gate to clear the compact party
HUD; its primary status display remains in the upper frame. Entry captions expand
inward over the header to clear nearby machinery. Captions for visible assets stay
inside the canvas horizontally; offscreen assets do not gain floating edge labels.

## Review and validation

The [asset gallery](playtest/2026-10-12-hero-assets/hero-gallery.png) and
[deployment sequence](playtest/2026-10-12-hero-assets/sequence.png) are explicit
presentation fixtures drawn by the production helpers. Live input-driven captures
are stored separately in `playtest/2026-10-12-hero-assets/live/` (gate/party finish)
and `playtest/2026-10-12-hero-assets/checkpoint/` (entry, deployment, reset, reload,
and compact views).

```sh
pnpm typecheck
pnpm test:unit tests/hero-presentation.test.ts tests/audio.test.ts tests/camera-reveals.test.ts
pnpm build
pnpm check:heroes
BN_HERO_REVIEW=1 BN_CROSSFEED_FORWARD_ONLY=1 pnpm check:crossfeed
BN_HERO_REVIEW=1 BN_HERO_CHECKPOINT_ONLY=1 BN_CROSSFEED_FORWARD_ONLY=1 pnpm check:crossfeed
```

The checkpoint-only browser branch uses real R/reset and page reload, checks
deployed restoration, and captures an 800 × 600 follow/overview view without
changing the main route's player positions. The full route independently checks
grappling, payload authority, exit readiness, one arrival, and two-player victory.

Human inspection is the next art gate. The immediate party menu may obscure part
of the short completion flare; it deliberately does not wait for cosmetic timing.
Co-op projection clocks are local, so clients need not show identical animation
frames. Any further expansion or art tuning should follow manual inspection.
