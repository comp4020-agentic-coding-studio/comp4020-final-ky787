# RACE CONDITION native acquisition

Status: all clean/BCF native comparisons and retained instruction traces passed. Acquisition only; the live controller is unchanged.
Reference game commit: `1315c3616ce5ac939baf913f9b09b4ebad34132a`.

Files: [C source](src/controller.c), [ABI header](src/controller.h), [CLI harness](src/harness.c),
[clean PE](bin/clean_x64.exe), [BCF PE](bin/obfuscated_x64.exe), [contract](contract.json),
[build identity](build_or_identity/identity.json), [exact commands](build_or_identity/commands.json),
[manifest](manifest.json), [integration mapping](integration.json).

Windows x64 `void bn_evaluate(const ControllerInputs*, ControllerOutputs*)`: RCX inputs, RDX outputs,
little-endian uint32 fields at consecutive 4-byte offsets; every output is written on every call.
Boolean domains are 0/1; RACE's bufferPhase uses 0=idle, 1=window, 2=released, 3=expired.
Input order: dropA, dropB, payloadDelivered, traceOccupied, phase, returnOccupied, finalControl, exitUnlocked, phaseGraceActive, returnGraceActive, bufferPhase. Initial values and meanings are in the contract.

Coverage: 4,096 exhaustive abstract input vectors; 41 additional server-sequence snapshots;
5 ordered sequences / 41 calls replayed in sequence order per PE.
Total 8,356 native invocations across both PEs, zero output mismatches.
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
| topBridge | 0 | cargo-top.signal | `0x120E` (1), `0x1279` (0) |
| bufferBridge | 4 | cargo-buffer.signal | `0x144A` (1), `0x14B6` (0) |
| safetyFirewall | 8 | safety-beam.signal | `0x160E` (1), `0x167A` (0) |
| raceFirewall | 12 | race-beam.signal | `0x17D4` (1), `0x1840` (0) |
| spanMaster | 16 | receiver-master wire and phase prediction gating; no separate physical platform. | `0x191E` (1), `0x198A` (0) |
| phaseA | 20 | span1.signal, span3.signal, span5.signal | `0x1AE1` (1), `0x1B4D` (0) |
| phaseB | 24 | crumbleA.signal, crumbleB.signal | `0x1CA4` (1), `0x1D10` (0) |
| returnBridge | 28 | return-bridge.signal | `0x1DF2` (1), `0x1E5E` (0) |
| exitDoor | 32 | exit.unlocked | `0x1F40` (1), `0x1FAC` (0) |
| physicalPhaseA | 36 | span1.signal, span3.signal, span5.signal | `0x217D` (1), `0x21E9` (0) |
| physicalPhaseB | 40 | crumbleA.signal, crumbleB.signal | `0x23BA` (1), `0x2426` (0) |
| physicalReturnBridge | 44 | return-bridge.signal | `0x257E` (1), `0x25EA` (0) |
| exitUnlockCandidate | 48 | Actual definition.unlock(ctx) candidate for server commitAction; no authored MachineSignal or new physical object. | `0x2745` (1), `0x27B1` (0) |

Clean → BCF: 153 → 2040 instructions;
54 → 350 raw blocks.
`evidence/bogus-proof.json.gz` and [shared proof method](../shared/PROOF.md) justify
54 altered clones under the stated normal-entry/intact-code assumptions.
No clone is assigned to an authored unstable platform.

- Exhaustive cases are synthetic abstract projections, not a claim that all vectors are reachable with two players and two cubes.
- Synthetic contexts may exceed two body contacts or two cube entries and may combine runtime flags that sync would normalize. Every abstract input is nevertheless roundtripped through the actual current extractor/status projection.
- Ordered fixtures use valid current records, exactly cubeA/cubeB and two body slots. They test reducers and snapshots, not geometry/reachability, WebSocket authorization, cube ownership or epoch acceptance.
- Native code is stateless: it does not advance clocks, set latches, persist records, process arrivals, schedule crumble or authorize actions.
- Raw signals, grace-inclusive physical power, current unlock candidate and existing durable exit door are separate outputs.
- Crumble remains authored gameplay timing. Its warning/broken/stable observations are server evidence, never OLLVM/bogus-block evidence.

See the [package README](../README.md) for every binary hash and rerun commands.
