# BYPASS native acquisition request — four inputs, always-open exit

**This supersedes the six-input controller in the 2026-11-06 draft and campaign
handoffs. Do not acquire/compile that old contract.** BYPASS stays released as
chamber 02 and labelled AUTHORED until independently verified native evidence is
integrated. This request contains no native disassembly or binary claims.

Machine-readable request: [`bypass.json`](bypass.json), using the existing
`coop-native-contract/v1` vocabulary. SHA-256 of its exact bytes:
`af24de094de2926bf47e4ea8d01536ff999f69b58030ff88993acb06792fb469`.

## Frozen source

The dated `*-bypass-native-request-linux.md` in the verified shared
`Workspace/binary_binja_redesign/handoffs/` supplies the actual resulting source
commit. Fetch that commit and use an isolated checkout; do not use moving main or
the old handoff's commit. This document deliberately does not embed its own
resulting commit hash. Verify request/source hashes against Git blob bytes (or an
LF checkout), not a Windows CRLF-converted working copy.

Both canonical files, `levels/campaign/bypass.json` and
`levels/drafts/bypass.json`, have SHA-256:
`38fc3c7e1393caa034eb840f96bca9d1a79bae466d46db01b3a45b04144ec9cb`.
The request pins the actual TS reference sources: `src/workbench/evaluate.ts`
(the stateless evaluator), `model.ts` (ports/canonical format), `runtime.ts`
(local input adapter), `server/declarative-state.ts` (server input/output adapter),
`server/coop-state.ts` (initial unlock/save migration), and `level-definitions.ts`
(released registration). These hashes identify source; they are not native proof.

## ABI and meanings

`void bn_evaluate(const uint32_t *inputs, uint32_t *outputs)`; Windows x64,
Microsoft x64 ABI, RCX input pointer, RDX output pointer. Both arrays are 16 bytes,
4-byte aligned, little-endian. Every field's valid domain is exactly `{0,1}`.
There is no retained state; write every output on every invocation.

| Input order / bit | Byte offset | Game port | 0 / 1 |
| --- | --- | --- | --- |
| 0 `anchorHold` | 0 | `anchorHold.occupied` | No accepted grounded body / body on HOLD ANCHOR |
| 1 `link` | 4 | `link.value` | Uncommitted / LINK committed |
| 2 `bypassHold` | 8 | `bypassHold.occupied` | No accepted grounded body / body on HOLD BYPASS |
| 3 `override` | 12 | `override.value` | Uncommitted / OVERRIDE committed |

| Output order | Byte offset | Expression | True / false |
| --- | --- | --- | --- |
| 0 `anchorPower` | 0 | `anchorHold OR link` | Powered grapple bar / inactive ghost |
| 1 `bridgePower` | 4 | `link` | Solid non-hookable bridge / inactive ghost |
| 2 `firewallActive` | 8 | `NOT (bypassHold OR override)` | Both barriers lethal / both passable |
| 3 `exitReady` | 12 | **constant true** | Portal unlock always asserted / false unreachable |

Case encoding: `bit0(anchorHold) | bit1(link) | bit2(bypassHold) | bit3(override)`.
The request retains all 16 abstract vectors evaluated by the actual TS evaluator.
All-zero input is `[0,0,0,0]` and returns **`[0,0,1,1]`**. Physical reachability
must not prune this exhaustive truth table. Do not substitute LINK AND OVERRIDE
or scanner occupancy for the constant output.

All bindings are uninverted (`resolved = bool(raw) != false` exactly once):
`anchorFeed: anchorPower → anchor.active`, `bridgeFeed: bridgePower → bridge.active`,
`barrierA: firewallActive → firewallA.active`,
`barrierB: firewallActive → firewallB.active`, and
`exitFeed: exitReady → exit.unlock`. The two firewalls are manifestations of
**one** output; they are not two native outputs.

## Outside the native function

The server owns body-only occupancy, one-use LINK/OVERRIDE commitments and their
persistence, exit latch (`true`), two distinct arrivals, badges, checkpoint/respawn,
and shared crumble scheduling. Movement, grapple, collision and hazard contact
remain in their existing layers. Crumble warns 1.4 s and recovers 2.6 s; it is authored
mechanics, not a bogus-code claim. No scanner or terminal gate remains on exit
completion. Both physical arrivals are still required.

Windows should validate all 16 vectors against this exact source snapshot, retain
compiler/toolchain/binary hashes and output stores, and report the source commit
and request hash with acquisition artifacts. Integration, native labelling and
assembly placement are separate later work. No existing chamber evidence may be
borrowed to fill this room's background.
