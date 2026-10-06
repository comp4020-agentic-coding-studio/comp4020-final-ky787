# Binary Ninja

**Binary Ninja is a cooperative puzzle-platformer where real obfuscated programs control the level around you.**

My definition of a good version of this project is first and foremost a **fun two-player puzzle game**. Movement should feel satisfying, rooms should be deliberately designed rather than procedurally generated, and cooperation should be necessary to progress. Players should be carrying cubes, holding pressure plates for each other, flipping switches, grappling across gaps, powering lifts, activating portals and changing the structure of the room together.

Reverse engineering is the flavour and underlying machinery!

## What I am trying to build

The final game is intended to be two-player only game inspired by portal (apart from tutorial and test chambers). A typical room might require one player to hold a pressure plate while the other uses an activated grapple block to cross a gap. The second player can then enable a bridge or relay so the first can follow. Cubes act as movable substitutes for players and can be carried, pulled with the grapple, placed on switches or routed through machinery.

Different program-controlled objects provide different movement and puzzle possibilities:

- grapple blocks provide horizontal traversal;
- lift fields provide vertical traversal;
- relay gates teleport players and payloads between fixed locations;
- code platforms can become solid or disappear depending on program state;
- proven bogus-code blocks can appear stable before collapsing;
- switches, pressure plates and cubes act as inputs to the room controller.

A good level should be understandable through its physical design without needing an assembly lesson. The reverse-engineering layer should reward players who look deeper.

## Gameplay first, binaries second

An important change in my process has been to **design the puzzle before designing the binary**.

The level is first greyboxed as a normal game. Once its mechanics and state transitions work, the room is annotated with logical inputs and outputs. For example:

`Plate A → Grapple Anchor`

`Relay Switch → Relay Gates`

`Payload on Node C → Final Route + Exit`

A separate agent then builds a small C program implementing that accepted state machine, compiles and obfuscates it, and exhaustively tests its supported input states.

The resulting binary is disassembled and traced. Its real assembly, addresses, execution order and validated outputs are then brought back into the playable room.

This means the stage is not shaped around whatever CFG a compiler happened to produce. Instead, a carefully designed game level gains an authentic binary underneath it.

## Current Crit 8 build

The current build contains introductory rooms for pressure plates, switches, grappling and payload routing, followed by a larger puzzle combining these mechanics.

The fourth level is already driven by a validated OLLVM-16 bogus-control-flow controller. Its real machine instructions appear on the floating code machinery, and the displayed execution follows retained traces from the actual obfuscated binary.

One optional unstable platform uses assembly from a real OLLVM BCF clone whose incoming bogus paths were independently proved infeasible. The crumble behaviour is a game metaphor; the underlying bogus-code classification is real.

Other visual effects, including decoded machine messages, remain authored presentation and are labelled accordingly.

## What good means

For the final project, I want:

- genuinely enjoyable two-player cooperation;
- responsive movement and a restrained but satisfying grapple;
- strong sound, visual feedback and environmental presentation;
- hand-crafted levels with clear sightlines and deliberate puzzle progression;
- persistence so players can leave and continue later;
- real obfuscated binaries underneath important room machinery;
- optional inspection depth for experienced reverse engineers without excluding beginners.

Previous experiments with OLLVM, Hikari, Polaris, Tigress and several deobfuscation techniques provide a pool of real evidence that can be used to give later rooms different obfuscation flavours.

The goal is not to disguise an obfuscation study as a game.

The goal is to make a good cooperative game whose strange machinery genuinely comes from the reverse-engineering work behind it.

## Multiplayer infrastructure: PAIRING BAY

The menu now offers a separate two-player **PAIRING BAY** test chamber. Create a
room, share its four-character code, and join from a different browser profile or
private window. One player holds an anchor online, the other latches a return
bridge, and both must occupy separate final plates to complete the chamber.

Movement remains local and responsive; the existing Node server synchronizes and
saves shared puzzle state over same-origin WebSockets. Refresh restores the same
visitor's slot and shared checkpoint. PAIRING BAY is explicitly mock test
infrastructure. The C8 campaign and CONTROL SPINE's validated evidence remain
separate, and personal campaign saves keep their existing format.

See [the multiplayer contract and test flow](docs/c9-multiplayer.md) and
[the authority ADR](docs/adr/0001-multiplayer-authority.md). Human playtesting is
the next acceptance step before adding shared cubes or redesigning co-op stages.

## Run locally

Run `pnpm install`, then `pnpm dev`. This starts Vite on `http://localhost:5173`
and the real HTTP/API/WebSocket server on port 8080 together. No separate backend
command or production build is needed for development. Local saves persist in
the ignored `.local-data/` directory; `DATA_DIR` can select another directory.
Ctrl+C stops both listeners. Use separate browser profiles or a private window
for the two players.

For separate terminals, use `pnpm dev:server` and `pnpm dev:client` instead.
