# Co-op environmental assembly

Authentic assembly is optional environmental flavour. Machinery and level
structure communicate the puzzle; detailed native evidence remains available
on demand. This pass extends the accepted RACE visual language to HANDSHAKE,
CROSSFEED VAULT, DEADLOCK and USE AFTER FREE, preserving RACE and CONTROL SPINE.

## Placement plan recorded before implementation — 22 October 2026

Reviewed current released geometry and baseline overview/detail captures, plus
a fresh production browser audit in `/tmp/bn-environment-baseline`. These are
authored starting rectangles for visual iteration, not geometry changes. Each
row retains one of the 25 existing output/target associations; none is dropped
or duplicated. A group means neighbouring independent snippets, no outer panel.

| Chamber / output | Existing target | Local group | Intended bounds x,y,w,h | Nearby machinery / reason |
| --- | --- | --- | --- | --- |
| HANDSHAKE crossingPower | nearAnchor | crossing | 675,805,328,124 | Below crossing wires; outside the powered anchor silhouettes |
| HANDSHAKE liftPower | serviceLift | service pair | 1300,610,304,124 | Below maintenance gallery, right of lift travel |
| HANDSHAKE relayPower | lowerRelay | service pair | 1628,610,280,124 | Aligned beside lift, above lower relay approach |
| HANDSHAKE exitReady | exit | exit | 1980,610,280,124 | Local exit/receiver zone with a gap after service pair |
| CROSSFEED grappleAnchor | crossing-anchor | crossing | 2370,1200,328,124 | Below recovery deck, right of anchor wire |
| CROSSFEED bridge | return-bridge | lower return | 2050,1540,328,124 | Pit wall below crossing; within the existing gap |
| CROSSFEED liftField | central-lift | cargo lift | 1760,1165,328,124 | Right of lift travel, below recovery shelf |
| CROSSFEED relayGates | transfer | transfer relay | 340,1320,328,124 | Beside service relay, above resting payload |
| CROSSFEED leftRoute | left1 | left route | 1420,405,328,124 | Below representative left anchor |
| CROSSFEED rightRoute | right1 | gallery pair | 3800,260,328,124 | Below right anchor; clear of its grapple endpoint |
| CROSSFEED galleryAccess | gallery-return-low | gallery pair | 3800,470,328,124 | Aligned lower in the same local gallery approach |
| CROSSFEED vaultPower | final-left-low | final vault | 2500,815,328,124 | Under final apparatus, clear of receiver openings |
| CROSSFEED vaultReturn | vault-return | vault return | 1940,800,328,124 | Below actual regroup bridge; separate from final vault |
| CROSSFEED serviceAccess | service-door | service passage | 900,880,328,124 | Above service roof and left of passage |
| DEADLOCK cargoLift | cargoField | lower cargo | 780,2830,328,124 | Right of shaft, above resting third cube |
| DEADLOCK shaftFirewall | shaftBeam | shaft interlock | 220,2320,328,124 | Left of shaft and right of vertical wire |
| DEADLOCK serviceRelay | serviceUpper | completion pair | 760,700,328,124 | Upper service/receiver zone, above landing |
| DEADLOCK hatchOpen | hatch | hatch | 250,1080,328,124 | Left of shaft opening, below its wire |
| DEADLOCK payloadReady | exit | completion pair | 1150,700,328,124 | Above receiver/exit approach, aligned with relay |
| USE AFTER FREE routeA | a2 | route A | 690,1798,328,124 | Below representative route slab |
| USE AFTER FREE routeB | b1 | route B | 1180,1760,328,124 | Below retry wire, independent climbing zone |
| USE AFTER FREE routeC | c1 | route C | 650,1420,328,124 | Below route wiring, beside representative route |
| USE AFTER FREE launchPower | lowerLift | launch | 1240,2130,328,124 | Left of lift travel corridor |
| USE AFTER FREE assistBlocked | finalLift | assist | 1450,1440,328,124 | Below field/approach, right of route wiring |
| USE AFTER FREE exitReady | exit | summit | 1430,590,328,124 | Above summit exit, right of route wiring |

All rectangles, fonts, line slots and message baselines remain fixed through
camera movement, zoom, viewport and state changes. Culling alone uses the view.
The smaller HANDSHAKE service/exit widths preserve spacing in its compact room.
The other local mechanisms remain distributed rather than becoming a status wall.

## Fixed environmental presentation contract

`src/slice/environmental-layout.ts` owns authored rectangles, local group names,
excerpt choices and short message wording. The native asset owns instructions
and their provenance. Neither layer supplies gameplay authority. Group names
only describe nearby independent snippets: they create no enclosing dashboard,
connecting wires, CFG edges or runtime arrangement.

Use subdued 12-world-unit monospace code with fixed line slots, a quiet backing,
one restrained output-store accent and one authored decoded string. A distant
snippet naturally becomes smaller or leaves the view. Camera or viewport changes
must never resize, reposition, reflow or replace it with a floating name tag.
The viewport only determines whether its fixed rectangle is painted. Update
presentation lifecycle for culled blocks too, so walking back into view does not
replay an old state change.

There are no ordinary-play address columns, internal output headings, RAW/POWER
footers, STATIC/WRITE 1 labels, grace/latch diagnostics or instructions for solving
the puzzle. Existing platform address bars remain static native identities.
Detailed addresses, bytes, source hashes and fragment boundaries belong in the
optional Evidence view and read-only diagnostics.

The accepted raw output selects the genuine zero-store or one-store fragment.
Its accent associates it with that result; it is not an execution cursor. The
accepted machinery binding separately determines message and colour, including
physical projection, grace, inversion and persisted unlock state. For example,
CROSSFEED route grace may show a powered route with a native zero-store, and USE
AFTER FREE's inverted `assistBlocked` output may show an active lift with a native
zero-store. DEADLOCK's service relay follows the accepted completion-enabled
output; its message must not be reconstructed from SAFE and FEED controls.

Helpful powered/open/available machinery uses subdued green; unavailable
machinery uses red or muted colour. The shaft hazard reverses this meaning:
BLOCKED is red, CLEAR is green. Route messages say POWERED, not SAFE or SOLID;
individual authored unstable platforms retain their existing lifecycle. Exit
messages describe accepted latched unlock state, including the `payloadReady`
binding in DEADLOCK. No message asserts delivery or a trace observation.

The approximately 0.4-second decoding reveal applies only to authored strings;
native code never scrambles. A meaningful accepted change affects its member
only, with an approximately 0.45-second store pulse. Identical revisions, timer
ticks and camera re-entry do not restart effects. Unknown values stay unknown;
offline snapshots remain muted and do not imply a current authoritative receipt.
Room/party/instance changes, pause, reduced motion and fresh-snapshot reconnect
handling establish a new baseline rather than inventing a transition from zero.

## Implemented placement accounting

All 25 baseline output/target associations remain one-for-one. The plan above is
retained as the preimplementation record; this table records refinements and
the final authored configuration. Dimensions are 328×124 except HANDSHAKE's
relay/exit blocks and USE AFTER FREE's assist block. All positions are world
coordinates.

| Chamber / output | Final x,y,w,h | Excerpt treatment | Local arrangement |
| --- | --- | --- | --- |
| HANDSHAKE crossingPower | 675,805,328,124 | comparison + store | Isolated crossing wall |
| HANDSHAKE liftPower | 1020,290,328,124 | saved-Boolean branch + store | Separate wall above lift |
| HANDSHAKE relayPower | 1628,610,280,124 | store | Separate wall above lower relay |
| HANDSHAKE exitReady | 1980,610,280,124 | Boolean excerpt + store | Separate exit wall |
| CROSSFEED grappleAnchor | 2580,1200,328,124 | comparison + store | Crossing/access wall, right of transfer wire |
| CROSSFEED bridge | 2050,1540,328,124 | store | Pit return wall |
| CROSSFEED liftField | 1760,1165,328,124 | Boolean excerpt + store | Local lift wall |
| CROSSFEED relayGates | 340,1320,328,124 | saved-Boolean branch + store | Lower transfer relay |
| CROSSFEED leftRoute | 1420,405,328,124 | Boolean excerpt + store | Left route |
| CROSSFEED rightRoute | 3800,260,328,124 | saved-Boolean branch + store | Gallery pair, upper |
| CROSSFEED galleryAccess | 3800,470,328,124 | comparison + store | Gallery pair, lower |
| CROSSFEED vaultPower | 2500,815,328,124 | saved-Boolean branch + store | Final vault |
| CROSSFEED vaultReturn | 1940,800,328,124 | store | Local regroup bridge |
| CROSSFEED serviceAccess | 900,880,328,124 | Boolean excerpt + store | Service passage |
| DEADLOCK cargoLift | 780,2830,328,124 | saved-Boolean branch + store | Right of lower shaft |
| DEADLOCK shaftFirewall | 220,2320,328,124 | comparison + store | Left of shaft beam |
| DEADLOCK serviceRelay | 760,650,328,124 | Boolean excerpt + store | Completion pair, left |
| DEADLOCK hatchOpen | 250,1080,328,124 | store | Left of hatch |
| DEADLOCK payloadReady | 1150,650,328,124 | saved-Boolean branch + store | Completion pair, right |
| USE AFTER FREE routeA | 690,1798,328,124 | comparison + store | Lower route zone |
| USE AFTER FREE routeB | 1000,1420,328,124 | saved-Boolean branch + store | Between first and middle B slabs |
| USE AFTER FREE routeC | 650,1420,328,124 | Boolean excerpt + store | Upper route zone |
| USE AFTER FREE launchPower | 1240,2130,328,124 | store | Left of launch field |
| USE AFTER FREE assistBlocked | 1500,1450,280,124 | saved-Boolean branch + store | Below assist approach, right of retry wire |
| USE AFTER FREE exitReady | 1430,590,328,124 | comparison + store | Summit wall |

The DEADLOCK completion pair moved from planned y700 to y650, keeping its code
and message above the payload wire at y780. Actual HANDSHAKE play with LINK on
showed its bright vertical wire at x1500 crossing the planned lift excerpt. The
lift block therefore moved to x1020,y290 above the lift field, ending before the
upper LINK wire at y415. Lift and relay now use separate local placements rather
than forcing the planned pair. Relay and exit retain narrower blocks beneath
the gallery. The wire, lift, camera and room geometry remain unchanged.

Actual USE AFTER FREE handovers exposed two further wire crossings. Route B
moved from x1180,y1760 to x1000,y1420, between its first and middle slabs and left
of the active A wire at x1345. It aligns with the nearby C snippet but retains a
separate mechanism/group identity. The assist block moved right to x1500,y1450
and narrowed to 280 units, leaving 30 units after the active retry wire at x1470
and remaining within the room. These positions preserve the original target
associations while keeping native operands and messages clear of lit wires.

CROSSFEED's active transfer-relay wire at x2560 crossed the initial anchor
snippet's pointer operand. Its block moved right to x2580,y1200, still below the
recovery deck in the crossing/access zone, with a 20-unit gap from that wire.
Its full 328-unit width preserves readable native operands without squeezing.

Comparison, Boolean, branch and store treatments select verified contiguous
subsets within their source fragments. When context and store come from separate
locations, a bare `...` marks the omission. Their full fragment identities remain
separate underneath; adjacency is neither a new basic block nor evidence that a
branch went directly to the displayed store. OLLVM opaque predicates are never
presented as gameplay input conditions.

RACE's nine accepted blocks and CONTROL SPINE's retained trace presentation are
references preserved by this pass. Other solo/tutorial rooms, mechanics labs,
drafts and custom rooms acquire no campaign-native evidence.


## Compact native evidence

Each chamber loads one separate `coop-environmental-presentation/v1` asset.
It contains four explicit fragments per represented output: CMP/SETNE/spill,
saved-Boolean reload/TEST/JNE, real write-zero and real write-one. Gameplay
selects a short subset according to the table above. The 100 retained fragments
are each contiguous within one acquired block; the 50 store alternatives are
all established, so there are no static-only fallback exceptions.

| Asset in `public/evidence/coop/` | Bytes | Budget |
| --- | ---: | ---: |
| handshake.environment.json | 12,783 | 16,000 |
| crossfeed-vault.environment.json | 31,516 | 40,000 |
| deadlock.environment.json | 15,568 | 20,000 |
| use-after-free.environment.json | 19,044 | 24,000 |
| Total (only current chamber loads) | 78,911 | 100,000 |

`pnpm gen:environmental` writes only those compact assets and their integrity
pins; `pnpm check:environmental` compares deterministic output without writing.
The check is included in `pnpm check:native`. The original five world assets and
their combined 75 KB guard remain intact, as does their single-block/max-five
instruction validator. They still supply static platform-header identities.

The generator reads the original frozen acquisition, validates seven manifest
source hashes (contract, integration, C/H, disassembly, PE and representative
traces), and reuses the world verifier for current released bindings. It checks
exact PE bytes, VA/RVA/size, original instruction order and within-block
contiguity. Every store must match its acquired output, byte offset, block and
recorded value; retained trace memory writes independently confirm the exact
output-buffer address, width and case set. Counts and a trace source hash are
retained, but no trace/register/per-occurrence payload ships in these assets.

The runtime loader checks the byte budget, SHA-256 pin and bounded schema. It
caches successful per-chamber loads, deduplicates requests and rejects stale
responses. Only accepted campaign snapshots are eligible. Initial offline data
and transport reconnection require a fresh receipt before becoming current.
Failures leave quiet ASSEMBLY UNAVAILABLE strings at the same fixed positions;
the old diagnostic cards remain suppressed. Gameplay never depends on loading.

The optional Environment entries in the existing paused Evidence inspector show
both genuine alternatives, the selected record, full fragment boundaries,
block IDs, VA/RVA, bytes, output offsets, observed case counts, specimen and
source hashes. Existing matching-trace versus representative-sample navigation
is preserved. No execution replay is added.

### Native sites

RVA columns are hexadecimal; all four images use base `0x140000000`. Each read
and branch column identifies a separate three-instruction acquired fragment.
The store columns identify the final MOV within each three-MOV store fragment.

| Chamber / output | Read | Saved branch | Write 0 | Write 1 |
| --- | --- | --- | --- | --- |
| handshake / crossingPower | 107C | 10B3 | 115C | 10F1 |
| handshake / liftPower | 11C7 | 11FF | 12A9 | 123D |
| handshake / relayPower | 1315 | 134D | 13F7 | 138B |
| handshake / exitReady | 14DC | 1514 | 15BE | 1552 |
| crossfeed-vault / grappleAnchor | 132B | 1362 | 140B | 13A0 |
| crossfeed-vault / bridge | 1476 | 14AD | 1557 | 14EB |
| crossfeed-vault / liftField | 15C3 | 15FB | 171B | 16AF |
| crossfeed-vault / relayGates | 194E | 1985 | 1A2F | 19C3 |
| crossfeed-vault / leftRoute | 1B10 | 1B48 | 1BF2 | 1B86 |
| crossfeed-vault / rightRoute | 1CD3 | 1D0B | 1DB5 | 1D49 |
| crossfeed-vault / galleryAccess | 1E21 | 1E59 | 1F03 | 1E97 |
| crossfeed-vault / vaultPower | 1F6C | 1FA3 | 204D | 1FE1 |
| crossfeed-vault / vaultReturn | 20B6 | 20ED | 2197 | 212B |
| crossfeed-vault / serviceAccess | 1787 | 17BF | 1869 | 17FD |
| deadlock / cargoLift | 1290 | 12C8 | 1371 | 1306 |
| deadlock / shaftFirewall | 13DC | 1414 | 14BE | 1452 |
| deadlock / serviceRelay | 1612 | 1649 | 16F3 | 1687 |
| deadlock / hatchOpen | 175F | 1797 | 1841 | 17D5 |
| deadlock / payloadReady | 18AA | 18E1 | 198B | 191F |
| use-after-free / routeA | 11C7 | 11FF | 12A9 | 123D |
| use-after-free / routeB | 138E | 13C6 | 1470 | 1404 |
| use-after-free / routeC | 1555 | 158D | 1637 | 15CB |
| use-after-free / launchPower | 107C | 10B3 | 115C | 10F1 |
| use-after-free / assistBlocked | 1719 | 1751 | 17FB | 178F |
| use-after-free / exitReady | 1867 | 189F | 1949 | 18DD |

These checks are partial static context, not a complete formula or an executed
path. CROSSFEED vault and DEADLOCK completion checks read derived local Booleans.
CROSSFEED anchor/relay check switch B, route checks read routeMode; HANDSHAKE exit
checks exitSocket after maintenance. UAF compound conditions can short-circuit.
The later TEST supplies branch flags after intervening BCF guards; authentic
branch destinations remain untouched. No live case is matched from output bits.

## Verification

`tests/environmental-evidence.test.ts` checks all fifty observed stores,
malformed/tampered assets, source/target/offset identity, contiguous fragments,
cache/stale-response behaviour, fresh receipts and isolation.
`tests/environmental-presentation.test.ts` checks all 25 placements and bindings,
grace/inversion/latch divergence, completion-enabled relay, missing state,
independent strings, lifecycle, fixed Canvas line slots, quiet text, actual
acquired instructions and optional Evidence detail. Semantic fixtures do not
claim physical reachability.
`tests/environmental-inspector.test.ts` verifies asynchronous loading with an
unchanged accepted snapshot and compact provenance when the larger trace package
fails. Newly loaded Evidence must invalidate the display cache even without a
new room revision.

The extended `pnpm check:world-assembly` verifies all placements against original
acquisition records, measures actual painted Canvas text, checks fixed bounds
through camera/viewport changes, and covers failure/custom-room/CONTROL SPINE
isolation. `BN_NATIVE_WORLD_REVIEW=1 pnpm check:campaign` observes the existing
five-chamber two-visitor solve at its ordinary reads and capture points. It does
not inject state, change movement routes or add waits during grapple arcs.
See the [visual review](playtest/2026-10-22-coop-environment/README.md) and dated
handoff for checks actually run, screenshots and remaining limitations.
