# Bundled specimen data

`level01_compare_bcf_v2.json` is a byte-for-byte copy of
`Workspace/binary_binja_redesign/game_data/level01_compare_bcf_v2.json`, the
validated browser bundle (schema `binary-binja-specimen/v2`, persistent branch
ports) produced by the evidence workspace. It is copied so the deployed game
does not depend on the workspace at runtime.

Never edit it here. Re-export it in the workspace, then run
`pnpm sync:bundle`. `tests/bundle.test.ts` fails if the copy and the source
differ while the workspace is mounted. Its data contract is the workspace's
`game_data/README.md`.

## UPLINK OLLVM-16 BCF — integrated 2026-10-05

`uplink_controller_ollvm_bcf_v1.json` is an exact copy of the same-named bundle
under `Workspace/binary_binja_redesign/game_data/`. Schema `room-controller/v1`,
version 1; specimen `uplink_controller_ollvm_bcf_v1`.

Bundle SHA-256: `87dec9e470119a951eb1486e25d62226c72b34367e754b0a14b4e5a818c4c082`.
BCF PE SHA-256: `1e6e39f015613d03560e1dc49a93a8de43e16ea2f0006ee8809632cc3972aa61`.

The read-only portable verifier passed from the shared experiment before copying:
`python3 -I -B verify_bundle.py` in
`Workspace/binary_binja_redesign/experiments/uplink_controller_ollvm_bcf_v1/`.
The full report/limits are `uplink-verification.json`; baseline/source metadata is
`uplink-source.json`. No binary was executed or rebuilt on Linux.

Do not edit the bundle or experiment to fit the frontend. A replacement needs
Windows evidence, a passing portable verification, an exact copy and deliberate
identity-pin review. The older `sync:bundle` script applies only to v2 tutorial
exports; it does not update UPLINK. `pnpm check:uplink` checks this pinned artifact
and runs on every build. Tests compare the source bytes when the share is mounted.
Runtime assets use only the tracked copy; Workspace is never a deployed dependency.

The UPLINK export retains its original CRLF ending. Its `.gitattributes` entry
disables text normalization so cloning/checking out cannot change the pinned bytes.
