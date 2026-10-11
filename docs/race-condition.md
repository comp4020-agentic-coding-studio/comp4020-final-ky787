# RACE CONDITION

**PROVISIONAL UNTIL HUMAN PLAYTEST ACCEPTANCE** — 2026-10-11.

Room ID: `race-condition`. Objective: **DELIVER THE PAYLOAD. KEEP THE TRACE ALIVE.**
Controller: `mock-multiplayer` / binary integration pending. No binary is generated.
This chamber's firewalls, wires, timers and unstable blocks are authored gameplay,
not binary/obfuscator evidence. There are no invented addresses or bogus-block proofs.

## Intent and topology

CROSSFEED demonstrated the mechanics but its permanent sequence was too easy.
RACE uses one reversible machine: physical cargo enables a live operator/runner
span; a second payload replaces a body on a return plate and then becomes a boost.
Only the final commit/exit and a recovery checkpoint latch. All working routes
continue to depend on current input occupancy.

The 4180 × 1420 room is one continuous space. Its first-entry overview and held Tab
view show the cargo frame at the left, two widely separated floor controls, launch
stairs/operator deck, five overhead traversal slabs, safe catch floor, right deck
and high final control. The cargo enclosure sits beside the swing volume so it
does not interrupt the runner's arcs. DROP B faces the same visible machine from
the central floor. The code return bridge ghosts across the whole span.

| Region | Authored geometry |
| --- | --- |
| Cargo Clock | Open visual frame, x90–320; top y500, buffer y680, beams y800/860, receiver y1040 |
| DROP controls | A at (180,1240); B at (1880,1240) |
| Launch/trace | Five 104-unit rises up the left stairs; deck y720; TRACE x615, PHASE x655 |
| Alternating span | Five 150-wide slabs starting at x930/1430/1930/2430/2930; y350/290/350/290/350 |
| Catch/recovery | Continuous safe floor y1240; stairs at the left; saved launch respawn after delivery |
| Right deck | x3230–4180, y720; RETURN x3470, Cube B x3570 |
| Finish | Ungrappleable ledge at x3820, y530; COMMIT x4000; exit on the deck below |

## Cargo Clock

Cube A starts on the top bridge. DROP A and DROP B are **ordinary universal
pressure plates**, accepting a grounded body or any resting, unheld/unpulled cube.
There is no spare accessible payload at these controls initially. Their 1700-unit
separation exceeds solo running distance within the fall plus transfer window.

Let A/B mean accepted DROP occupancy:

| A | B | Top | Buffer while armed/window | Safety beam | Race beam |
| --- | --- | --- | --- | --- | --- |
| 0 | 0 | solid | solid | lethal | off |
| 1 | 0 | ghost | solid | lethal | off |
| 0 | 1 | solid | ghost | off | off |
| 1 | 1 | ghost | ghost | off | lethal |

The cube's confirmed simulator reports the first physical buffer landing using
`cube-contact {cubeId, epoch, seq, sensor:"buffer"}`. The server accepts only the
known Cube A's current simulator, with no holder/pull and placement `spawn`.
Reports are deduplicated by epoch. The server starts a **2800 ms** window. A strip
and remaining seconds beside the buffer show the shared deadline; interpolation
of the countdown is visual only.

The intended solution is A press, buffer landing, A release, then B press before
expiry. B must remain occupied until the payload clears the beams. The receiver
is another universal plate inside a visible solid enclosure that bodies cannot
enter. Its cube occupancy is reversible, not a delivery latch.

Apparatus phases are `idle` (armed), `window`, `released`, and `expired`:

- Idle keeps the buffer solid before the first landing; the literal provisional
  Boolean formula needs this armed state rather than starting with no buffer.
- A timely B commits release and cancels the deadline. The buffer stays off for
  the transfer, preventing a quick B tap from recatching the cube and granting
  unlimited buffer time. Safety/race beams still follow live B/A inputs.
- Expiry keeps the buffer off and safety beam on until reset. A late B cannot
  erase timeout failure after the cube has started falling.
- Receiver arrival rearms the apparatus and saves the launch recovery checkpoint.
  A firewall reset advances only A's epoch and restores its individual top spawn.
  If A is still held, the new attempt falls again; release the controls to rearm.

Failures do not kill/reset either player or Cube B. The authority uses the existing
predicted dissolve and server-confirmed cube reset, including stale-stream rejection.

## Alternating grapple span

`spanMaster = payloadDelivered AND traceEnableOccupied`.
`phaseA = spanMaster AND NOT phase`; `phaseB = spanMaster AND phase`.
Slabs 1/3/5 use A; slabs 2/4 use B. The PHASE lever can be operated while standing
on TRACE and toggles in either direction. It is not a progression latch.

The operator predicts the lever and branch illumination immediately. Accepted
server state controls the runner's collision. On a toggle, the new branch is
valid immediately and the old branch remains physically valid for **350 ms**.
The old branch already looks ghosted and its wire is dark during this grace.
Master power loss revokes both branches immediately. A **650 ms minimum lever
interval** prevents repeated toggles from keeping both branches alive indefinitely;
rejected intents reconcile through the existing action-result path.

The runner swings past an anchor, rope-jumps/releases, and catches the next live
branch. No grapple acceleration, jump impulse, rope length, air control or gravity
was changed for this route. Five distinct catches, including both B blocks, are
required by the scripted feasibility route. Same-phase slabs are 1000 units apart
(850 edge-to-edge), outside the 500-unit hook range.

Blocks 2 and 4 are clearly labelled **UNSTABLE**. Their first physical standing
or grapple attachment starts a server-authoritative **1550 ms** warning fuse.
Collapse lasts **2400 ms**, then the shared block returns. Phase changes do not
cancel/reset that fuse. Collision still requires both an unbroken block and the
current phase/grace. The clients render the same warning/collapse and release a
rope whose anchor becomes invalid. Required use is authored puzzle design, not
proof that a native block is bogus.

Falling reaches a safe lower floor. Players can run back to the stairs or use
normal local R respawn at the saved launch checkpoint. Neither option resets
the delivered payload or moves the partner. No additional checkpoint enables a
route or overrides a momentary signal.

## Return and finish

RETURN is universal: either body initially powers the bridge, and Cube B can
replace that body. It does not latch. Deactivation has the same 350 ms physical
grace, with immediate ghost/wire feedback. Once Cube B holds RETURN, the operator
can leave TRACE, ghosting the span, and run across the safe bridge.

Removing B from RETURN removes that bridge. On the right deck either player
holds B for the existing partner-only, grounded-carrier boost. The climber lands
on the accepted held payload, then makes a normal second jump to the 190-unit
ledge. A floor jump or a resting 44-unit cube is insufficient. The ledge has no
hookable anchor. COMMIT is a visibly distinct one-shot terminal.

`exitCandidate = finalControl AND payloadDelivered`. The server permanently
latches exit unlock when both are true; later cargo removal cannot close it.
Both distinct players must then physically enter. One arrival never completes.

## Provisional controller contract

Inputs: `dropA`, `dropB`, `payloadDelivered`, `traceOccupied`, `phase`,
`returnOccupied`, `finalControl`, plus the transient buffer phase/deadline.

```
topBridge       = NOT dropA
bufferBridge    = NOT dropB AND (buffer == idle OR buffer == window)
safetyFirewall  = NOT dropB OR buffer == expired
raceFirewall    = dropA AND dropB
spanMaster      = payloadDelivered AND traceOccupied
phaseA          = spanMaster AND NOT phase
phaseB          = spanMaster AND phase
returnBridge    = returnOccupied
exitCandidate   = finalControl AND payloadDelivered
```

`ControllerFrame.signals` carries these authored mock outputs separately from the
unchanged validated C8 seven-output contract. Physical grace and crumble state
are separate from resolved logical power. The contract is **not frozen** for C
or obfuscated binary generation.

## Shared conventions and persistence

- New chamber wires show resolved destination outputs, including NOT branches.
  CROSSFEED adopts this too. Existing C8/legacy lab source-wire presentation is
  retained to protect accepted evidence/teaching behavior.
- Inactive controlled code remains a 25% ghost, non-solid and unhookable; no glow.
  A grace ghost temporarily retains old physical validity as described above.
- Ordinary new plates use `RoomDef.plates` and accept bodies/cubes alike.
  CROSSFEED retains its special rules but shows distinct biometric scanner frames
  and payload sockets. Its B/C/D controls are explicitly terminals. Legacy labs
  and C8 keep their accepted rules.
- Grounded sustained running is **426**, formerly 380 (+12.1%). The airborne cap
  remains 380; existing momentum carry is retained. All other movement values stay.
  This applies to the current C8/co-op world. The retained pre-C8 prototype keeps
  its 380 cap because its 340-unit CONNECT gap was bypassable at 426 (and 420).
  Its original reachability assertion remains unchanged.
- Firewalls default to always-on; this chamber explicitly authors a power signal.
  They remain stationary lethal rectangles, not solids or an autonomous timed
  firewall state machine. No Crit 5 moving/open-close cycle was imported.
- Visible enclosed walls can block cube pickup/pull rays. The cargo frame and
  right deck use this to prevent reaching payloads through solid architecture.
  Existing rooms do not opt in; cube authority/physics is unchanged.

Schema remains v5. Durable state is the lever position, final commit, per-cube
semantic placement, launch checkpoint, exit unlock and arrivals. Body occupancy,
buffer/phase/return deadlines, crumble phases, holders, transforms and epochs
are not persisted. A process restart rearms the apparatus; arbitrary/transit
Cube A returns to its top spawn. A durably delivered A restores at the receiver.
Cube B restores at its own spawn or accepted universal plate. Reconnect transfers
authority using the existing named-cube rules. The server has no room coordinates.

## Feasibility and remaining questions

`pnpm check:race` uses muted real keyboard/mouse input in two separate browser
contexts. It checks timed delivery, all five catches, both shared 1550 ms fuses,
Cube B on RETURN, actual held-cube landing/second jump, commit, and two arrivals.
It reverses the cargo operator, trace operator/runner and holder/climber roles in
a second fresh room, including a solo cargo attempt that times out on the way
to B. `BN_RACE_FORWARD_ONLY=1` and `BN_RACE_REVERSE_ONLY=1` narrow iteration.
Focused world/server tests cover timeout and overlap destruction, inversion,
universal contacts, authority/epoch rejection, grace, restart, prediction and
the boost/range/enclosure boundaries. Automated movement is feasibility evidence,
not puzzle-quality acceptance or an exhaustive solver.

Known limits and possible alternatives to evaluate:

- Very late physical beam toggles remain possible: releasing A after B but
  before actual beam contact may save the cube. This is live cooperative timing,
  not an automatic failure flag. Keep it if human players find it satisfying.
- A skilled runner might discover alternative swing/release arcs. No invisible
  walls force a specific trajectory; tests prove the intended five-hook route
  and range constraints, not absence of every creative shortcut.
- Once B is legitimately recovered, using it on TRACE is an allowed alternative.
  It cannot operate the remote PHASE lever itself. A in the receiver is enclosed.
- Dropping B onto the lower catch floor is recoverable by carrying it up the
  stairs and traversing again; human testing should judge the recovery cost.
- The 650 ms lever interval, 350 ms grace and 1550 ms fuse need real network
  playtesting. A denied very rapid toggle visibly reconciles. No rollback exists.
- Audio uses existing bounded one-shots, not a new hum/music track. Browser routes
  remain muted. Geometry is intentionally spare until puzzle acceptance.

## Manual two-computer acceptance

1. Create RACE, join by code, inspect overview; independently describe the machine.
2. Try A+B overlap and a missed buffer window. Watch A reset, B and players remain.
3. Solve delivery with A released before B. Swap cargo roles in another room.
4. Operate TRACE/PHASE while the partner swings through all five blocks. Swap.
5. Hold each fake hook too long, fall to the catch deck, retry using the checkpoint.
6. Toggle near the transfer boundary under real latency; try rapid toggles and
   briefly leaving TRACE. Judge the grace, ghost clarity and shared collapse.
7. Stand on RETURN, leave it, then substitute B. Bring the operator across.
8. Remove B, confirm the bridge disappears, then boost with both holder arrangements.
   Drop/reset/disconnect the holder and confirm support disappears naturally.
9. Commit while cargo is delivered; leave controls; finish with both bodies.
10. Reconnect/restart after delivery and after commit; inspect placement and exit.

Is the Cargo Clock understandable without explanation? Does releasing A first
feel satisfying? Are failure/retry times short enough? Is swinging substantial,
and does alternating phase require communication? Are the unstable blocks exciting
instead of annoying? Is 1.55 s enough for deliberate movement? Does B on RETURN
produce an aha? Is the boost finish too familiar? Does faster running help? Does
this feel like one harder puzzle rather than stages? Which cooperative shortcuts
are worth keeping? Record human feedback before changing or freezing the contract.
