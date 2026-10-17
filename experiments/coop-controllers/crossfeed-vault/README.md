# CROSSFEED VAULT native acquisition

Status: all clean/BCF native comparisons and retained instruction traces passed. Acquisition only; the live controller is unchanged.
Reference game commit: `1315c3616ce5ac939baf913f9b09b4ebad34132a`.

Files: [C source](src/controller.c), [ABI header](src/controller.h), [CLI harness](src/harness.c),
[clean PE](bin/clean_x64.exe), [BCF PE](bin/obfuscated_x64.exe), [contract](contract.json),
[build identity](build_or_identity/identity.json), [exact commands](build_or_identity/commands.json),
[manifest](manifest.json), [integration mapping](integration.json).

Windows x64 `void bn_evaluate(const ControllerInputs*, ControllerOutputs*)`: RCX inputs, RDX outputs,
little-endian uint32 fields at consecutive 4-byte offsets; every output is written on every call.
Boolean domains are 0/1; RACE's bufferPhase uses 0=idle, 1=window, 2=released, 3=expired.
Input order: switchB, switchC, switchD, routeMode, plateAOccupied, routePowerOccupied, cubeOnLiftCargo, cubeOnFinalLeft, cubeOnFinalRight, finalPlateLeftOccupied, finalPlateRightOccupied, exitUnlocked, leftGraceActive, rightGraceActive. Initial values and meanings are in the contract.

Coverage: 16,384 exhaustive abstract input vectors; 35 additional server-sequence snapshots;
3 ordered sequences / 35 calls replayed in sequence order per PE.
Total 32,908 native invocations across both PEs, zero output mismatches.
The ordered native calls are stateless; their reference server performs any state transitions.

[Native summary](evidence/native-summary.json), `evidence/native-results.json.gz` and both
`evidence/native-*-stdout.jsonl.gz` retain comparisons and actual process output.
[Trace summary](evidence/trace-summary.json), `evidence/representative-traces.json.gz`,
`evidence/disassembly-clean.json.gz` and `evidence/disassembly-bcf.json.gz` retain exact addresses,
bytes, decoded CFGs, executed instruction occurrences and output commits.
There are 32 selected BCF traces, with both 0 and 1 observed for every output.
Static decoding alone is not execution evidence. Unicorn traces execute retained PE instructions;
they are emulator observations, separately compared with real Windows PE output.

| Raw output | Offset | Existing machinery / role | BCF store RVAs (observed value) |
| --- | ---: | --- | --- |
| grappleAnchor | 0 | crossing-anchor.signal | `0x13A0` (1), `0x140B` (0) |
| bridge | 4 | return-bridge.signal | `0x14EB` (1), `0x1557` (0) |
| liftField | 8 | central-lift.signal | `0x16AF` (1), `0x171B` (0) |
| serviceAccess | 12 | service-door.openWhen | `0x17FD` (1), `0x1869` (0) |
| relayGates | 16 | transfer.signal | `0x19C3` (1), `0x1A2F` (0) |
| leftRoute | 20 | left1.signal, crumbleA.signal, left3.signal | `0x1B86` (1), `0x1BF2` (0) |
| rightRoute | 24 | right1.signal, crumbleB.signal, right3.signal | `0x1D49` (1), `0x1DB5` (0) |
| galleryAccess | 28 | gallery-return-low.signal, gallery-return-high.signal, gallery-launch.signal | `0x1E97` (1), `0x1F03` (0) |
| vaultPower | 32 | final-left-low.signal, final-left-high.signal, final-right-low.signal, final-right-high.signal | `0x1FE1` (1), `0x204D` (0) |
| vaultReturn | 36 | vault-return.signal, vault-return-step.signal | `0x212B` (1), `0x2197` (0) |
| exitDoor | 40 | vault-divider.openWhen, exit.unlocked | `0x2279` (1), `0x22E5` (0) |
| physicalLeftRoute | 44 | left1.signal, crumbleA.signal, left3.signal | `0x243D` (1), `0x24A9` (0) |
| physicalRightRoute | 48 | right1.signal, crumbleB.signal, right3.signal | `0x2601` (1), `0x266D` (0) |
| exitUnlockCandidate | 52 | Actual definition.unlock(ctx) candidate for server commitAction; no authored MachineSignal or new physical object. | `0x283D` (1), `0x28A9` (0) |

Clean → BCF: 165 → 2130 instructions;
56 → 361 raw blocks.
`evidence/bogus-proof.json.gz` and [shared proof method](../shared/PROOF.md) justify
56 altered clones under the stated normal-entry/intact-code assumptions.
No clone is assigned to an authored unstable platform.

- Exhaustive cases are synthetic abstract projections, not a claim that all vectors are reachable with two players and two cubes.
- Synthetic contexts may exceed two body contacts or two cube entries and may combine runtime flags that sync would normalize. Every abstract input is nevertheless roundtripped through the actual current extractor/status projection.
- Ordered fixtures use valid current records, exactly cubeA/cubeB and two body slots. They test reducers and snapshots, not geometry/reachability, WebSocket authorization, cube ownership or epoch acceptance.
- Native code is stateless: it does not advance clocks, set latches, persist records, process arrivals, schedule crumble or authorize actions.
- Raw signals, grace-inclusive physical power, current unlock candidate and existing durable exit door are separate outputs.
- Crumble remains authored gameplay timing. Its warning/broken/stable observations are server evidence, never OLLVM/bogus-block evidence.

See the [package README](../README.md) for every binary hash and rerun commands.
