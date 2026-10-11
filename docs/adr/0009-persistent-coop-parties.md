# Persistent parties across authored cooperative chambers

2026-10-11. Implemented; two-computer acceptance pending.
Starting HEAD: `e9d81a0510da374e0bec8f2a70e14adf1d0c1df0`.

## Identity and progression

A public room code now names a persistent two-visitor party. The existing first
reserved visitor is its host; refresh, connection order and disconnect never
transfer this role. The server checks the authenticated cookie against that
reservation before accepting level selection. No new accounts or host migration.

`src/coop/campaign.ts` is the authoritative ordered public list: CROSSFEED VAULT,
then RACE CONDITION. Menus, numbering, badges and next-chamber lookup use it.
The full co-op registry still contains the hidden mechanics fixtures. All public
campaign chambers remain selectable during playtesting.

## State and durable schema

Room record **version 6** retains the tagged active-chamber fields (`level`,
`levelState`, checkpoint, named cube placements, unlock and two arrivals). Common
session fields now include `levelInstance` and `party`, whose fields are `phase`
(`lobby`, `playing`, `victory`) and `completedLevels`. Membership and completion
belong to this code, independently of any other party created by the same visitor.
Host identity is derived from `visitors[0]`; it is not duplicated in another field.

A new lobby contains an untouched, dormant first-chamber record; it cannot process
gameplay. The first START creates a fresh instance. Only the active chamber's
durable puzzle state is retained. Selecting any chamber, including the current
one, discards that chamber's incomplete puzzle state and starts from authored
spawns. Completion badges remain. The selector states this reset consequence.

Both distinct physical exit contacts are still required. After the second accepted
arrival, the server adds the badge, enters victory, and atomically fsyncs the record
before sending either client the result. Both pause beneath a shared victory
overlay. Only the host can choose NEXT or open the selector; the last chamber
offers CHOOSE CHAMBER as its primary action. There is no automatic advancement.

## Same-socket transitions and stale traffic

`create-party` opens the lobby. `select-level {seq, levelInstance, level}` accepts
only public campaign IDs and the current generation, from the host identity.
Every accepted selection increments the durable `levelInstance`. It preserves
the code, reservations and completion badges while reconstructing cubes, grants,
body occupancy, crumble phases and Cargo Clock deadlines. Persistence and broadcast
remain in the existing semantic queue. Streams are rejected during the disk commit.

All current clients stamp sequenced gameplay actions and avatar/cube streams with
the current instance. Party traffic with an absent or different instance is denied
before it can affect machinery or advance a stream sequence. Server stream messages
carry that instance too. Per-socket action/avatar sequences and per-cube epoch/seq
checks remain in force; a new cube epoch alone cannot validate an old chamber action.
The existing bounded traffic budget is unchanged.

The client reconstructs the world once when a new instance arrives, including from
an action result. It clears predictions, pending controls, occupancy caches, cube
replicas, remote interpolation, queued effects, input, audio, camera reveals and
machinery. Both browsers load their slot-specific spawns and initial overview,
even if a partner was paused. No socket reconnect or new room code is needed.
Old-generation replies cannot reconcile new predictions or revive old transforms.

## Reconnect and migration

Refresh and server restart load the current phase and accepted puzzle progress.
Victory reconnect restores the overlay; gameplay reconnect uses the shared
checkpoint and semantic cube placements. Transforms, holders, authority, pulls,
camera state, physics and machinery deadlines remain ephemeral. A guest joining
first after a restart remains the guest and waits for the original host to return.

Version-5 CROSSFEED/RACE records migrate in place with code, visitors, puzzle state,
checkpoint, placements and completion intact. Their original creator becomes host;
completed records gain their current chamber's badge and victory phase. Generation
starts at 1. Versions 1–4 retain their existing validated migrations, then pass
through v5 to v6. Migration is written before join acknowledgment; corrupt records
fail closed. Single-player C8 files and contracts are unchanged.

Old and internal mechanics sessions use `party: null`, keeping their fixed-level
behavior and accepting legacy messages without generation (they cannot transition).
`?labs=1` exposes internal CREATE controls for regression routes; the public menu
contains only TUTORIAL and CO-OP CAMPAIGN. This flag hides fixtures, not a security
boundary. The old `create {level}` protocol remains for developer routes and old
clients. Creating a campaign chamber that way starts a playing party directly.

## Validation and limits

`pnpm check:campaign` uses two isolated identities and muted real controls to solve
both chambers in the same party, use NEXT, replay with badges, and test pause,
refresh, host/guest disconnect and SIGKILL recovery in playing/victory phases.
Focused server tests inject forged/stale wire requests, check queued transitions,
durable-before-ack completion, generation isolation, migrations and independent codes.
Client tests check prediction/stream cleanup; menu tests check role-specific controls.
Existing lab harnesses explicitly opt into the internal menu.

The same trusted local movement/contact model remains. Party host powers concern
navigation only; neither player gains physics authority over the other's avatar.
There is no ready check, host migration, matchmaking or cross-party progress merge.
These chambers remain mock multiplayer controllers / binary integration pending.
No puzzle mechanics or binary evidence changes are part of this decision.

Manual acceptance: create/join on two computers; select from lobby and pause; finish
both chambers; compare host/guest victory; replay and inspect badges; refresh each
role; disconnect host while guest waits; verify independent audio/menu controls.
