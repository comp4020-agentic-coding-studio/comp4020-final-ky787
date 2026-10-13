# Binary Ninja Level Workbench v1

This is a local draft authoring tool. Its JSON files, validator, controller evaluator,
`PuzzleWorld` physics and `PuzzleRenderer` are shared by the graphical editor and
command-line tools. Drafts are authored/mock content. They do not replace campaign
rooms, award campaign badges, or inherit verified binary evidence.

```sh
pnpm workbench
# optional: pnpm workbench --port 4175
```

Open the printed `http://127.0.0.1:4174/` URL. The process prints the canonical draft
root and local data directory. Stop with Ctrl+C. Node 24 and the repository's pnpm
dependencies are required. CLI screenshots and scenarios also need Chromium (the
existing browser harness searches installed Chromium/Chrome/Brave; `BROWSER_BIN`
can name an executable). No LLM service or subscription is involved.

## First use

1. Open `blank-room.json` from the toolbar. Use **Fit room**, then zoom with the
   wheel around the pointer. Middle-button drag pans. Select a palette item and
   click or drag it into the canvas. The inspector shows position/size and
   attributes; device positions are floor contacts, not rectangle corners.
2. Place a pressure plate and a code platform. Use **Connect**, select the device,
   then the target. Inspect the output expression and binding property. The logic
   inspector supports typed references, constants, AND, OR and NOT. Wires have
   their own editable bends; moving one never changes the expression.
3. Switch to **State preview**. Choose a saved input configuration or change device
   inputs. The resolved state drives ghosts, wires and machinery. Forced-output
   diagnostics are labelled separately and are not a gameplay result.
4. **Play from spawn** runs the actual engine. A/D or arrows move, Space jumps,
   click holds a grapple, E carries/uses, and R resets. Stop restores the authored
   document, selection and editor camera. Inspect/export the measured path.
5. Save directly to `levels/drafts`. To test together, choose **Test co-op draft**.
   Share its four-character room code with a separate browser profile or private
   window on the same computer. Open `/workbench-runner.html?code=CODE` there.
   Two ordinary tabs with the same cookie are the same player.

The editor includes multi-selection (Shift), numerical properties, corner resize
handles, duplicate/delete, undo/redo, search, a hierarchy with hide/lock controls,
grid/snapping, frame selection, hitboxes and a grapple-range guide. A completed
pointer drag is one undoable operation. Form controls retain their keyboard input.
Validation diagnostics can select/frame affected objects. Dirty replacement is
confirmed; a disk conflict offers reload or save-copy without overwriting the disk
version. Recovery data lives separately under `.workbench/recovery.json`.
Service writes are serialized and check the expected hash before replacement.
This is optimistic conflict detection: arbitrary external file writes are not part
of a filesystem-wide transaction. Finish a file edit before saving from the GUI;
continuous concurrent writers can race the final hash check and atomic rename.

## Canonical files and coordinates

- `levels/drafts/*.json`: canonical, human/agent-editable documents.
- `levels/scenarios/*.json`: bounded real-input scenarios.
- `src/workbench/`: model, shared validator/evaluator, adapters, GUI and local runner.
- `scripts/level-tools/`: CLI, file service and browser orchestration.
- `.workbench/`: ignored recovery, ephemeral sessions and diagnostic reports.

Version 1 is defined by `src/workbench/model.ts`; runtime validation is
`src/workbench/validation.ts`. Unknown fields/versions and malformed structures are
rejected with a diagnostic instead of silently discarded. Structurally valid but
incomplete drafts can be saved. Gameplay errors block Play and frozen sessions.

Coordinates use game pixels/world units: x increases right; y increases down.

| Object or field | Position convention |
| --- | --- |
| Spawn/checkpoint | Player body centre (body 22 × 34) |
| Named cube home | Cube centre (44 × 44) |
| Plate/socket/scanner/toggle/terminal/breakpoint | x centre, y floor contact |
| Platform/lift/relay/reset hazard/exit/camera bounds | Top-left rectangle, w/h positive |
| Firewall | Top-left lethal rectangle; orientation, length and thickness |
| Label/wire point | World point (text baseline for label) |

Example: on a floor at y=680, the player centre is y=663, cube centre y=658, and
plate floor contact y=680. Entry gateways and breakpoint pedestals reuse the game
assets; they do not define collision geometry themselves.

The document separates `geometry.objects`, `controller`, functional `bindings`,
`presentation` (wires, labels, camera reveals/display) and `editor` metadata. Array
order is preserved as intentional drawing order. Canonical serialization sorts
object keys, uses two-space indentation and a final newline, and has no changing
save timestamps. SHA-256 of canonical serialization is shared by CLI and browser.
Stable IDs begin with a letter and contain up to 64 letters/digits/underscores/
hyphens. Renaming or duplicating groups updates their internal references; external
connections remain explicit. Unsupported imported factory fields block import.

## Objects, logic and connections

Platforms are `static`, `code`, or authored `unstable`. Static architecture is always
solid and unhookable. Controlled code is a ghost while disabled; enabled floating
slabs accept hooks across the address bar. Unstable blocks expose foot/hook warning
and respawn timing. They are prototypes, never proof of bogus binary code.

Ordinary plates accept grounded players or resting cubes. Sockets accept cubes.
Scanners accept players. Toggle controls change Boolean value each interaction;
terminals commit once. Their output ports are `id.occupied` and `id.value`.
Reachable ordinary draft cubes have no progression gate on pickup. Existing trusted
built-in controller requirements remain explicit in imported drafts.

```json
{
  "kind": "declarative",
  "outputs": {
    "leftRoute": {
      "op": "and",
      "args": [
        { "op": "ref", "id": "powerPlate.occupied" },
        { "op": "not", "arg": { "op": "ref", "id": "routeLever.value" } }
      ]
    },
    "rightRoute": {
      "op": "and",
      "args": [
        { "op": "ref", "id": "powerPlate.occupied" },
        { "op": "ref", "id": "routeLever.value" }
      ]
    }
  }
}
```

References may name a device port or another output. Unknown references and
combinational cycles are errors. There are no executable expression strings, timer
languages or uploaded code. Each binding names an output, target, and property:
`active` (platform/firewall), `open` (service door), `power` (lift/relay), or `unlock`
(exit). `invert` is applied once to destination power. Several targets can share
one output. Wires reference a binding or output; lit functional wires follow the
resolved destination including inversion. Decorative routes are separate.

Relay objects name a pair (exactly two gates), with an exit direction -1 or +1.
Both gates must agree on power. Firewall dimensions describe the lethal rectangle.
Checkpoint markers retain each player's own centre; breakpoint assets and controls
explicitly name the checkpoint. Camera reveals name a source device and platform
IDs and/or bounds, with world-unit padding and seconds duration.

Built-in controllers are allowlisted by ID/version, including RACE CONDITION,
CROSSFEED VAULT and the existing labs. Their internals remain code-owned. Geometry
and bindings are editable; changing required IDs produces diagnostics. Cargo Clock,
handovers and authoritative crumble use existing controller implementations, not
logic inferred from decorative wires. `CONTROL SPINE` and binary artifacts are not
part of the importer.

## Modes and test evidence

**Edit** stops simulation. **State preview** evaluates explicit input values and can
also show a labelled forced-output diagnostic. An input configuration is not a
proof it is reachable. Neither preview mode writes progress.

**Playtest** clones the document, uses existing movement, collisions, grapple,
cube support, relay/lift/firewall code and records actual paths/events. Test from a
marker or point checks active geometry and hazards before starting. Local physics
preview is one player; simulated partner inputs are diagnostics. It cannot certify
a two-person exit. Pause/frame stepping is local only.

Recordings identify the draft hash, engine revision and scenario. Edits make old
paths stale. Range/clearance guides are hints; measured paths are shown separately.
Static validation cannot prove reachability, absence of softlocks or puzzle quality.
A passing scenario proves its stated assertions in its tested configuration only.

A co-op test freezes one validated snapshot with a content hash and fresh instance
generation. Both identities download and verify it. Avatar physics stays local;
shared outputs, controls, timers, crumble and cube grants remain on the existing
WebSocket authority. One player may hold/pull one cube, and each shared cube has one
accepted simulator. Saving edits does not change a live room. The host runner's
**Latest draft / Host: restart snapshot** explicitly loads the saved file, freezes
it, restarts both clients and rejects traffic from the old generation. Completion
uses the draft's controller and two distinct arrivals and awards no campaign badge.
Co-op requires a latched exit with `arrivals: 2`; other exit configurations remain
available to local preview. Frozen snapshots live in memory: restart the test after
restarting the workbench service.

## Command-line workflows

```sh
pnpm level:new levels/drafts/my-room.json
pnpm level:import race-condition --out levels/drafts/my-race-copy.json
pnpm level:validate levels/drafts/my-room.json --json
pnpm level:render levels/drafts/blank-room.json --state left-powered \
  --out .workbench/reports/left.png
pnpm level:render levels/drafts/race-condition-copy.json \
  --region 0,150,1600,900 --out .workbench/reports/race-region.png
pnpm level:playtest levels/drafts/blank-room.json \
  --scenario levels/scenarios/blank-physics.json \
  --report .workbench/reports/blank-physics
pnpm level:playtest levels/drafts/cooperative-test.json \
  --scenario levels/scenarios/cooperative-test.json \
  --report .workbench/reports/cooperative-test
pnpm check:workbench
node scripts/level-tools/coop-browser-check.ts
```

New/import refuses to overwrite an existing destination. Direct file editing is
supported. Validation emits stable code/severity/object/message diagnostics.
Render uses the real browser renderer, checks browser errors and writes PNG plus
metadata containing state/hash/engine revision. Render defaults to the whole room;
`--region x,y,w,h` fits requested world bounds into a 1600 × 900 viewport;
extra context may appear when the aspect ratios differ. Commands return 0 on success, 1 for a failed
scenario, and 2 for malformed input, blocking validation or tool failure.

Scenarios use version 1 with `id`, explicit `scope` (`full-room`, `section-only`,
`diagnostic`), `mode` (`single`/`coop`), total `timeoutMs` and distinct actor IDs/slots.
Steps have labels, real-control actions, bounded waits and observable assertions.
A step's `actions` are dispatched in order; held keys persist across steps, so both
players can act concurrently. Supported actions are key down/up, tap, walk-to-x and
grapple target/release. A grapple aim helper maps object position through the real
camera and sends a real mouse action. No step can teleport or set outputs/cubes.
An explicit initial local start point/marker requires section-only/diagnostic scope.
Co-op scenarios always use authored spawns in two isolated browser contexts.

```json
{
  "version": 1, "id": "walk-check", "scope": "diagnostic", "mode": "single",
  "timeoutMs": 15000,
  "actors": [{ "id": "designer", "slot": 1 }],
  "steps": [{
    "label": "walk right",
    "actions": [{ "type": "walk", "actor": "designer", "x": 240 }],
    "assert": [{ "actor": "designer", "condition": { "path": "player.x", "min": 240 } }]
  }]
}
```

Conditions use a path under player/cubes/signals/controls/plates/session or
exitUnlocked/completed plus `equals`, `min`, `max`. All waits have a deadline; the
scenario is capped at five minutes. Failure reports include the step, last physical
observations, screenshots and measured trajectory JSON. Parse the saved
`report.json`; the pnpm wrapper can append lifecycle text to failed-command stdout. Browser contexts, service
and child processes are closed on success/failure/cancellation.

## Included examples

- `blank-room.json`: safe floor, two spawns, cube, plate, toggle, code platform and exit.
- `race-condition-copy.json` and `crossfeed-vault-copy.json`: imported geometry with
  their original allowlisted controller, including Cargo Clock and grace behavior.
- `relay-lab-copy.json`: small imported lab with paired gates.
- `cooperative-test.json`: small authored co-op route with cube takeover, real
  grapple segment, unstable block, latched return bridge and two-person exit.
- `multiple-machinery.json`: four named cubes and two relay pairs; targeted tests
  verify bounded authority, traffic, independent resets and controller contacts.

`blank-physics.json` is a diagnostic route. `cooperative-test.json` in the scenarios
folder is a full-room physical route; completion is required on both identities.
The separate frozen-session check tests save/restart/stale-message behavior and is
explicitly a session diagnostic, not route-completion evidence.

## Boundaries and current limits

Version 1 bounds: 1,000,000 document bytes; 384 objects; 8 named cubes; 48 devices;
8 relay pairs; 64 outputs; 192 bindings and 192 wires; 64 points per wire; 256 total
expression nodes at depth 16; room dimensions up to 9000 units. This is bounded
capacity, not arbitrary capacity. There are 32 frozen snapshots per service run.
Network limits scale with legitimate cube traffic while retaining rate limiting.

Version 1 supports one exit and up to 32 saved preview states.

Checkpoint milestones reuse the engine's `relay` and `upper` stages, with separate
positions for both player slots. Built-in imports retain their required IDs/cube
sets; arbitrary added control semantics belong in declarative drafts. Playable drafts
need both spawns and an exit even for local preview. The editor is one-user local
file editing, with conflict detection rather than collaborative cursor sharing.

The server binds loopback only. Writes require the exact printed origin and a random
local capability. Filenames are flat `.json` names under the draft root; traversal,
absolute paths, symlink escapes and oversized requests are rejected. The standard
`pnpm start` production process and `pnpm build` output have no workbench entry or
write/diagnostic endpoints. No Fly configuration changes or public hosting are
included. The tool does not execute uploaded code, build binaries or publish levels.

Human editor usability and two-player playtesting are the release acceptance gate.
Automated diagnostic results are not a claim of human puzzle acceptance.
