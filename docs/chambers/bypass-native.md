# BYPASS — verified native integration

Released BYPASS consumes retained Windows-native results through the existing
`nativeDeclarativeEvaluator` and packed lookup. It does not execute a PE or emulate
instructions during gameplay. The matching Level Builder draft remains authored;
custom sessions never inherit campaign evidence from a title or document name.

## Frozen producer

- Final gameplay/request source: `a209122ba1e3b54c6d329a94c01276b9550c9189`.
- Windows acquisition commit: `758ae8ef2ab8824b908ff77f3fac9c4a42660612`.
- Independent package: [`experiments/coop-controller-studies/bypass-v1/`](../../experiments/coop-controller-studies/bypass-v1/README.md).
- Request: [`docs/native-requests/bypass.json`](../native-requests/bypass.json), SHA-256
  `af24de094de2926bf47e4ea8d01536ff999f69b58030ff88993acb06792fb469`.
- Canonical campaign and draft SHA-256:
  `38fc3c7e1393caa034eb840f96bca9d1a79bae466d46db01b3a45b04144ec9cb`.
- Acquisition manifest SHA-256:
  `72ab82a3bdf5c24e2091903993b77a55524b4b98d2f1471d4dc0d90683ced9c9`.
- Clean PE SHA-256:
  `85ec3623042a89256e89d89fa028b1cc8019ada2c33ead04761c67ccf6371343`.
- BCF PE SHA-256:
  `af1ad2ec9562728c94f21a764bb0be450bad5541a0cb1b0d6eb696087d4b2e74`.

The old six-input/final-scanner acquisition contract is superseded. The exact
four-input ABI and bindings remain in the frozen request: uint32 fields at
0,4,8,12; `anchorHold`, `link`, `bypassHold`, `override`; ports
`.occupied`, `.value`, `.occupied`, `.value` respectively. Case ID uses those four
bits in order. Outputs are `anchorPower`, `bridgePower`, `firewallActive`,
`exitReady`, also at 0,4,8,12. All-zero inputs produce `[0,0,1,1]`; exitReady is
one in all 16 cases. Both firewalls manifest the single firewallActive output.

The Linux read-only portable verifier passed against all 72 retained files
(manifest plus its 71-file inventory), 50 captured Windows native evaluations
(16 exhaustive cases and nine ordered snapshots per PE), 16 emulator traces,
64 output commits, seven store sites and seven rejection fixtures. This audits
retained evidence; it is not a fresh Linux PE run. The actual current TS evaluator
was separately compared against all 16 retained expected/clean/BCF vectors.

Source resolution is additive and chamber-specific. The original five chambers
retain `experiments/coop-controllers/<id>` and reference
`1315c3616ce5ac939baf913f9b09b4ebad34132a`. Their manifests, integrity checks and
runtime artifacts remain unchanged. BYPASS generation pins its independent
manifest, request and canonical room hashes, and refuses changed controller
results. The frozen reference files are never edited when runtime registration
changes `server/level-definitions.ts`.

## Runtime consumer and presentation

`server/native/tables/bypass.json` retains all four outputs in an eight-byte packed
truth table. `public/evidence/coop/bypass.{evidence,traces,disasm,world,environment}.json`
contains generated evidence. The on-demand inspector retains complete specimen,
store and trace identities. `pnpm check:native` reproduces all artifacts read-only.
The environmental asset is 13,694 bytes; world binding evidence is 6,278 bytes.

| Snippet | Fixed bounds x,y,w,h | Display | Real store RVAs 0 / 1 |
| --- | --- | --- | --- |
| SHARED ANCHOR | 350,380,328,124 | input comparison, `...`, selected store block | 0x11D2 / 0x1167 |
| LINK BRIDGE | 1020,350,328,124 | selected store block | 0x131F / 0x12B3 |
| FIREWALL CONTROL | 1960,370,328,124 | input comparison, `...`, selected store block | 0x1477 / 0x14E3 |

Each snippet shows 3–4 authentic instructions and one short authored state string.
All original 4/5-instruction input fragments and separate branch fragments remain
available in compact Evidence. The inspector explains omitted block boundaries,
partial conditions and state-linked association. No live PC or execution is
inferred from colour. Complete matching input/output frames may identify an exact
retained sample; missing/mismatched fields or disconnected evidence never claim
an exact current match. The exit's sole store (RVA 0x154F, value one) is available
in Evidence with no in-world panel, zero alternative or conditional requirement.

No geometry, scanner type/art, terminal semantics, checkpoint, save migration,
crumble timing, music, room order or movement changed. Prototype crumble remains
an authored mechanic, independent of the package's separately proven bogus clones.
The portal is open initially; one physical arrival cannot finish; both arrivals do.

## Reproduce and limitations

```sh
python3 -I -B experiments/coop-controller-studies/bypass-v1/scripts/verify_portable.py
pnpm check:native
pnpm typecheck
pnpm build
node scripts/bypass-browser-check.ts
```

[Validation and normal-camera captures](../playtest/2026-11-06-bypass-native-integration/README.md)
record actual runs. No new binary acquisition or human playtest is claimed.
Retained hashes establish consistency, not independent authentication of Windows
capture or the compiler supply chain. Assembly is optional background detail and
naturally becomes smaller or partly offscreen at normal small-viewport zoom;
controls, machinery and arrival/recovery state remain legible independently.
