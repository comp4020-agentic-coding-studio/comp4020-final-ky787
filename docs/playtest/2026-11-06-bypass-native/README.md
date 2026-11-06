# BYPASS final layout and native request — 2026-11-06

Base `e377ff8`; the [four-input request](../../native-requests/bypass.md) supersedes
both old six-input handoffs. This is a released BYPASS revision, not a new level or
native evidence integration. The room remains AUTHORED.

Removed LEFT/RIGHT scanners, their two wires, preview state and final scan visits;
`exitReady` is constant true. Removed three large solution captions and shortened
the room instruction. All other geometry, bindings, expressions, Kuia and campaign
order are unchanged. Body-only HOLD ANCHOR/BYPASS use the existing animated pad
artwork once, with scanner rails and their original accepted occupancy rules.

The server evaluates unlock before the first snapshot. A narrow BYPASS save
migration removes obsolete Boolean scanner keys, opens the portal and preserves
party membership, terminal commitments, checkpoint, generation and badges. It
continues to reject unrelated malformed records. No persistence schema bump.

## Checks actually run

- Canonical validator passes with zero diagnostics; release/draft hashes match.
- 102 focused tests pass across eight files: BYPASS draft/native request, machinery
  presentation, local workbench runtime, authored campaign/save recovery, party
  server/menu, co-op labs server and workbench multiplayer.
- `pnpm typecheck`, `pnpm build`, and diff whitespace checks pass. Build retains
  the existing bundle-size advisory.
- `node scripts/bypass-browser-check.ts` runs both official scenarios with two
  independent visitors, no gameplay state injection: normal 65 steps and swapped 59.
  Both pass with deliberate failures/recovery, LINK bridge, checkpoint, early
  firewall release, OVERRIDE persistence, shared crumble recovery and both arrivals.
- Both clients receive an open portal before inputs/commitments. One physical
  arrival remains incomplete. The second completes. Protocol fixtures separately
  verify arrivals can complete with both terminals still false: no hidden gate.
- Isolated tests verify the two sensors are still body-only, reject cube input,
  and enter the modern presentation list once. Browser observations compare both
  pads with accepted states; normal/1024-wide, inactive/active, reduced-motion and
  pause views were inspected. Existing CROSSFEED scanner classification stays covered.
- Request tests verify exact input/output ABI order, every one of 16 vectors,
  all bindings, and hashes of the actual reference sources.

The first shortened route exposed an old 3000 ms wait that relied on time spent
visiting the removed scanners. The scenarios now wait for the shared stable
state, retaining both slab-stability assertions. No fuse timing or movement changed.
The final complete runs passed; no unrelated full campaign replay was performed.

## Retained captures

- [Inactive scanner, 1024px/reduced motion](scanner-idle-1024.png)
- [Accepted anchor hold](anchor-held.png)
- [Accepted bypass hold / two disabled barriers](bypass-held.png)
- [Open final portal with one arrival and no scanners](exit-one-arrival.png)

[Browser checks](browser-checks.txt), [compact results](results.json).
Raw reports: `.workbench/reports/bypass-native/`. These automated routes and agent
visual review are not a claim of human playtesting or native binary verification.
