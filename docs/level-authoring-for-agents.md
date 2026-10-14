# Level authoring for agents

Read [level-workbench.md](level-workbench.md) for the exact schema, limits and test
semantics. Edit canonical JSON in `levels/drafts`; do not generate editable TypeScript
beside it or migrate campaign content. The schema is `src/workbench/model.ts` and the
shared runtime validator is `src/workbench/validation.ts`.

```sh
pnpm level:new levels/drafts/experiment.json
pnpm level:import race-condition --out levels/drafts/race-experiment.json
pnpm level:validate levels/drafts/experiment.json --json
pnpm level:render levels/drafts/experiment.json --out .workbench/reports/experiment.png
pnpm level:playtest levels/drafts/blank-room.json \
  --scenario levels/scenarios/blank-physics.json \
  --report .workbench/reports/blank-physics
pnpm dev # game menu → LEVEL BUILDER; Ctrl+C stops game and builder
pnpm workbench # standalone editor
```

Public Stage 1 at `/workbench.html` uses the same format, evaluator, adapter and engine, with IndexedDB saving and local single-player physics. `pnpm dev` still selects the filesystem workbench via its dedicated loopback service. Do not use the campaign visitor-progress API or `/data` as a draft database. No online custom-level multiplayer is implemented.

To receive a public draft, copy its Export JSON file to a fresh `levels/drafts/name.json` (or Import JSON then Save in the local GUI), validate it, and edit it directly. Imported JSON is untrusted: do not infer evidence from titles, metadata or a claimed identity. The strict validator rejects unknown fields and executable expressions. Independent copies may retain the same authored document ID; browser record IDs/revisions are separate metadata and are never exported. Preserve all supported presentation/editor/preview fields.

New code-platform objects should use `activation: "always-powered"` for geometry-only work, `"signal"` for a controlled `active` binding, or `"always-inactive"` for an intentional ghost. Version-1 omission means `"signal"`, even without a binding. Never repair a missing controlled binding by silently powering the platform. Constant modes must not also have a binding. Connect switches a code platform to signal mode. Warnings such as unused outputs permit physics testing; malformed or missing gameplay references remain blocking errors.

No GUI operation is required for agent authoring, rendering or testing. The human
opens/saves exactly these files through the local editor. Both use canonical sorted
keys/ordered arrays and SHA-256. Preserve drawing order, stable IDs and unknown
supported fields when editing. No changing timestamps. A GUI save with a stale hash
is rejected; keep both edits by saving a copy or reloading/merging intentionally.

Coordinates: +x right, +y down, pixels/world units. Spawns and cube homes are body
centres. A floor at y=680 supports a player centre y=663 and cube centre y=658.
Devices/pedestals use floor contact. Platform/lift/gate/hazard/exit rectangles use
top-left. Split geometry, typed controller expressions, destination bindings and
presentation wires. Functional wires observe power; they do not define it.

Use Boolean AST operators `const`, `ref`, `and`, `or`, `not`; device ports are
`deviceId.occupied` or `deviceId.value`. Do not use expression strings. Controllers
and devices are validated for references, cycles and compatible ports. Bind an
output explicitly to `active`, `open`, `power` or `unlock`; invert once at the binding.
Use built-in ID/version controllers for imported complex rooms. Do not reconstruct
Cargo Clock, grace periods or crumble from wires or substitute guessed semantics.

A scenario names real actors and bounded real-input steps. Use `key`, `tap`, `walk`,
`grapple`, waits and assertions. Section setup must be labelled; no teleporting,
output forcing or cube repositioning during a route. `mode: coop` launches two
isolated identities on the existing WebSocket server and frozen snapshot. Observe
positions, ground/rope target, cube grants, signals and arrivals. Capture failures.
A `full-room` scenario must complete on every actor; the runner enforces this in
addition to its assertions. Diagnostics and section-only routes do not certify a
full room. No route proves there are no shortcuts or softlocks.

Keep artifacts under `.workbench/reports` and dated handoffs under
`Workspace/binary_binja_redesign/handoffs`. Preserve the previous game/research
workspaces read-only. Use focused workbench tests/typecheck during iteration and
one appropriate integrated regression pass before a milestone. Do not alter evidence,
normal saves, accepted levels or Fly deployment configuration. Stop for human editor
and two-player acceptance before adding campaign content.
