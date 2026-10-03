# Binary Ninja: Chamber 01

A puzzle-platformer prototype built on a real, obfuscated x86-64 program. Each
glowing card in the room is one stage of that program's code. Wire the cards
together in the order the program really runs, pick an input, and watch the
recorded execution follow your cables. It stops at the first wrong one.

This is an early prototype of one room, made to test whether the core mechanic
is fun and understandable.

## How to play

1. Walk to a card's **OUT** plug and press **E** to take its cable.
2. Carry it to another card's **IN** socket and press **E** to plug it in.
3. Choose input **6**, **7** or **8** (keys 1, 2, 3) and press **Enter** to run.
4. Watch the comparisons: is the value below, matching or above 22?
5. When the program opens the bridge, carry the power cube across to the
   analysis station.

Controls: A/D move, Space or W jump, S drop through a platform, E use,
I inspect a card's real code, hold Tab for an overview, H help.

## Where the data comes from

The program is a small controller compiled with OLLVM's bogus-control-flow
obfuscation. The game never runs the binary: it replays executions recorded
from the real compiled program for each of the three inputs. Some cards look
genuine but are fake code inserted by the obfuscator; the analysis station
reveals which, using a recorded proof.

## Development

```sh
pnpm install
pnpm dev          # play locally
pnpm check        # type-check, unit tests, and the deployed-app checks
```
