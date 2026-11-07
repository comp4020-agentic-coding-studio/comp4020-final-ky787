# Authored wire logic gates — 2026-11-07

Presentation follow-up to `f24f06f` (inactive wire visibility). Floating NOT labels
are replaced by amber modules with square input and ringed output terminals.
These are **authored circuit diagrams**, not claims about instruction placement
or live native execution. No controller, native artifact, level JSON, physics,
authority, persistence or signal-to-destination binding changed.

## Signal contract

`src/slice/wire-logic.ts` maps the actual accepted ports, not legacy `wire.input`
identifiers. RACE and CROSSFEED expose a read-only `ControllerFrame.circuit` view
of accepted inputs/outputs and the accepted buffer phase. Pending lever prediction,
extrapolated countdowns and physical handover grace do not change these diagrams.
Declarative diagrams factor the actual AST and binding inversion; evaluator files
and frozen source hashes remain untouched. Metadata is attached at the renderer
boundary; local previews and custom sessions pass their frozen draft document.
`room-adapter.ts` stays byte-identical to the Windows request. The first CI run
caught its additional source pin; the follow-up moved presentation work out of
that file without changing the request, hashes or hash assertions.

| Connection | Incoming source | Intermediate / junction | Final outgoing value |
|---|---|---|---|
| CROSSFEED relay fanout | `switchB` | NOT, then AND `switchC` (SYSTEM) | accepted `relayGates` |
| CROSSFEED left route | `routeMode` | NOT, then AND SYSTEM + occupied ROUTE POWER | accepted `leftRoute` |
| CROSSFEED right route | `routeMode` | AND SYSTEM + occupied ROUTE POWER | accepted `rightRoute` |
| RACE TOP | `dropA` | NOT | accepted `topBridge` |
| RACE BUFFER | `dropB` | shared NOT, then AND BUFFER (`idle` or `window`) | accepted `bufferBridge` |
| RACE SAFETY | `dropB` | same NOT, then OR EXPIRED | accepted `safetyFirewall` |
| RACE phase A/B | `phase` | NOT for A only; AND SPAN for each branch | accepted `phaseA` / `phaseB` |
| HANDSHAKE firewall | `maintenance.value` | NOT | accepted firewall binding |
| DEADLOCK shaft / service | `safe.occupied` / `feed.occupied` | NOT SAFE; (NOT FEED AND SAFE) OR all PAYLOADS | accepted respective binding |
| USE AFTER FREE ASSIST | `assist.occupied` | AND with a side-input NOT C | accepted effective lift binding |

ASSIST's old inversion flag came from an inverted binding to `assistBlocked`.
The two outer NOTs cancel: its input is **not** inverted. The diagram correctly
shows `assist AND NOT C`. Branches share a module only when source expression,
preceding operations and world position agree. DROP B has one inverter feeding
two different junctions; unrelated nearby signals are not merged.

Each incoming, intermediate and final polyline is painted separately and clipped
at module terminals. Idle scans retain 75 units/s, blue-grey backbones and contrast
edges. Powered strokes retain their colours, flowing dashes (70 units/s) and
220-units/s pulses. No pulse crosses a housing. All motion still uses the world
clock and existing `energyMotion` permission. Pause, disconnect and reduced motion
retain static lines and gate states.

## Local presentation placement

All device/destination coordinates remain fixed. Runtime-only wire jogs provide
room for the modules; canonical import/export does not insert a second jog.

| Mechanism | Module centres (world units) |
|---|---|
| TRANSFER | NOT `(2820,1284)`; AND `(2820,1204)` |
| ROUTE SELECT | NOT `(1385,454)`; left AND `(1385,374)`; right AND `(1565,560)` |
| DROP A | NOT `(420,1200)`, outside the entry artwork |
| DROP B | shared NOT `(1980,1158)`; AND `(1720,1120)`; OR `(1815,1140)` |
| PHASE | NOT `(655,548)`; ANDs `(655,468)`, `(735,468)` |
| MAINTENANCE | NOT `(2140,410)` |
| DEADLOCK | SAFE NOT `(1570,2878)`; FEED NOT `(400,2850)`; AND `(500,2820)`; OR `(600,2820)` |
| ASSIST | AND `(1350,800)`; side NOT C `(1277,800)` |

## Validation and captures

- 86 focused tests passed: `connections`, `wire-logic`, `workbench-runtime`,
  `camera-reveals`, `handshake-v2`. This includes 656 controller vectors against actual TS
  evaluators, accepted-versus-pending state, buffer phases, raw versus grace,
  unknown inputs, shared gates, segment/pulse boundaries and motion-disabled output.
- `pnpm typecheck`, `pnpm build`, `pnpm check:native` passed. Build retains the
  existing large-chunk advisory. Frozen native and environmental evidence checks
  remain enabled and pass; no evidence regenerated.
- 114 checks passed in the existing two-browser CDP harness: real E/Space and accepted body occupancy,
  including SYSTEM absent, ROUTE POWER absent, both reversible lever states,
  DROP A/B states, real cube release/expiry, 1024-wide view, pause, reduced motion
  and server disconnect. Gates are checked against text and platform footprints.
- 27 checks passed in the optional declarative fixture, which checks the existing HANDSHAKE, DEADLOCK and
  ASSIST modules using the same renderer. No campaign replay was needed.

These are labelled **isolated body-placement presentation fixtures**, not full-room
physical solves. No outputs, controller inputs, timer phases or cube state were
injected. The real expired-buffer state is sampled before automatic cube recovery;
all four phases also have exhaustive unit coverage. Human acceptance is still a
playtesting decision, not established by pixel or geometry assertions.

| Capture | View |
|---|---|
| `01-transfer-false.png`, `02-transfer-true.png` | TRANSFER before/after E; SYSTEM accepted |
| `03-route-false.png`, `04-route-true.png` | ROUTE before/after E; partner holds POWER |
| `05-route-1024.png` | Normal 1024×768 view |
| `06-drop-a-false.png`, `07-drop-a-true.png` | TOP direct NOT before/after occupancy |
| `08-drop-b-true.png`, `09-drop-b-false.png` | Shared inverter and separate BUFFER/SAFETY junctions |

Reproduce after building:

```sh
pnpm exec vitest run --config vitest.unit.config.ts tests/connections.test.ts tests/wire-logic.test.ts tests/workbench-runtime.test.ts tests/camera-reveals.test.ts tests/handshake-v2.test.ts
BN_SHOTS=.workbench/reports/logic-gates node scripts/inverted-signals-browser-check.ts
BN_GATES_DECLARATIVE_ONLY=1 BN_SHOTS=.workbench/reports/logic-gates-existing node scripts/inverted-signals-browser-check.ts
```

Unsupported custom inverted wires with ambiguous origins or expressions that
cannot be factored into one source path remain neutral with `?`; they do not
invent a false input or display a fake NOT. Partial/mismatched accepted data is
reported by the renderer's read-only `connectionLogic.unavailable` diagnostic.
This is a compact visualization of the existing connections, not a general
circuit editor. Small world-space text is naturally less readable in full-room
zoom-out; the reviewed captures use ordinary gameplay cameras.
