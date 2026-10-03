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
