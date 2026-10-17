# HANDSHAKE native acquisition

Status: all clean/BCF native comparisons and retained instruction traces passed. Acquisition only; the live controller is unchanged.
Reference game commit: `1315c3616ce5ac939baf913f9b09b4ebad34132a`.

Files: [C source](src/controller.c), [ABI header](src/controller.h), [CLI harness](src/harness.c),
[clean PE](bin/clean_x64.exe), [BCF PE](bin/obfuscated_x64.exe), [contract](contract.json),
[build identity](build_or_identity/identity.json), [exact commands](build_or_identity/commands.json),
[manifest](manifest.json), [integration mapping](integration.json).

Windows x64 `void bn_evaluate(const ControllerInputs*, ControllerOutputs*)`: RCX inputs, RDX outputs,
little-endian uint32 fields at consecutive 4-byte offsets; every output is written on every call.
Boolean domains are 0/1; RACE's bufferPhase uses 0=idle, 1=window, 2=released, 3=expired.
Input order: crossing, liftPlate, link, maintenance, exitSocket. Initial values and meanings are in the contract.

Coverage: 32 exhaustive abstract input vectors; 0 additional server-sequence snapshots;
6 ordered sequences / 33 calls replayed in sequence order per PE.
Total 130 native invocations across both PEs, zero output mismatches.
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
| crossingPower | 0 | nearAnchor.active, farAnchor.active | `0x10F1` (1), `0x115C` (0) |
| liftPower | 4 | serviceLift.power | `0x123D` (1), `0x12A9` (0) |
| relayPower | 8 | lowerRelay.power, upperRelay.power | `0x138B` (1), `0x13F7` (0) |
| exitReady | 12 | exit.unlock | `0x1552` (1), `0x15BE` (0) |

Clean → BCF: 40 → 542 instructions;
14 → 89 raw blocks.
`evidence/bogus-proof.json.gz` and [shared proof method](../shared/PROOF.md) justify
14 altered clones under the stated normal-entry/intact-code assumptions.
No clone is assigned to an authored unstable platform.

- Native snapshot decisions only. The server retains occupancy authority, persistence, exit latching, arrivals and all movement/physics.

See the [package README](../README.md) for every binary hash and rerun commands.
