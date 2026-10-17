# DEADLOCK native acquisition

Status: all clean/BCF native comparisons and retained instruction traces passed. Acquisition only; the live controller is unchanged.
Reference game commit: `1315c3616ce5ac939baf913f9b09b4ebad34132a`.

Files: [C source](src/controller.c), [ABI header](src/controller.h), [CLI harness](src/harness.c),
[clean PE](bin/clean_x64.exe), [BCF PE](bin/obfuscated_x64.exe), [contract](contract.json),
[build identity](build_or_identity/identity.json), [exact commands](build_or_identity/commands.json),
[manifest](manifest.json), [integration mapping](integration.json).

Windows x64 `void bn_evaluate(const ControllerInputs*, ControllerOutputs*)`: RCX inputs, RDX outputs,
little-endian uint32 fields at consecutive 4-byte offsets; every output is written on every call.
Boolean domains are 0/1; RACE's bufferPhase uses 0=idle, 1=window, 2=released, 3=expired.
Input order: feed, safe, hatchToggle, payloadOne, payloadTwo, payloadThree. Initial values and meanings are in the contract.

Coverage: 64 exhaustive abstract input vectors; 0 additional server-sequence snapshots;
7 ordered sequences / 39 calls replayed in sequence order per PE.
Total 206 native invocations across both PEs, zero output mismatches.
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
| cargoLift | 0 | cargoField.power | `0x1306` (1), `0x1371` (0) |
| shaftFirewall | 4 | shaftBeam.active | `0x1452` (1), `0x14BE` (0) |
| serviceRelay | 8 | serviceLower.power, serviceUpper.power | `0x1687` (1), `0x16F3` (0) |
| hatchOpen | 12 | hatch.open | `0x17D5` (1), `0x1841` (0) |
| payloadReady | 16 | exit.unlock | `0x191F` (1), `0x198B` (0) |

Clean → BCF: 70 → 861 instructions;
22 → 142 raw blocks.
`evidence/bogus-proof.json.gz` and [shared proof method](../shared/PROOF.md) justify
22 altered clones under the stated normal-entry/intact-code assumptions.
No clone is assigned to an authored unstable platform.

- Native snapshot decisions only. The server retains occupancy authority, persistence, exit latching, arrivals and all movement/physics.

See the [package README](../README.md) for every binary hash and rerun commands.
