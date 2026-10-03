# Binary Ninja: Tutorial Chambers

A puzzle-platformer prototype built on a real, obfuscated x86-64 program. Each
machine in a room is one stage of that program's code. Connect them, choose an
input, and watch the recorded execution follow your cables. It stops at the
first wrong one.

This is an early prototype: four short tutorial chambers, made to test whether
the core mechanic is fun and understandable.

## How to play

The signs in each room tell you what to do next.

1. **Power:** carry the cube to its socket to open the exit.
2. **Connect:** take START's cable to CALCULATE, then put the power cube in
   **RUN**.
3. **Input:** put a numbered cube (6, 7 or 8) in **INPUT** and power **RUN**.
   Only one input opens the bridge.
4. **Branch:** wire the comparison's **TRUE** and **FALSE** outputs once, then
   run 6, 7 and 8 without rewiring to open the door.

Controls: A/D move, Space or W jump, S drop through a platform, E pick up or
use, R reset the cubes, F fast-forward a run, I inspect the real code, hold Tab
for an overview.

## Where the data comes from

The program is a small controller compiled with OLLVM's bogus-control-flow
obfuscation. The game never runs the binary: it replays executions recorded
from the real compiled program for each of the three inputs. Stages the
tutorial hides still run in full, just out of sight.

## Development

```sh
pnpm install
pnpm dev          # play locally (?chamber=0..3 to jump, ?debug for tools)
pnpm check        # type-check, unit tests, and the deployed-app checks
```
