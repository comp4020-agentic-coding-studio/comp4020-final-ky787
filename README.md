# Binary Ninja

**A browser-based, two-player cooperative puzzle-platformer built around a reverse engineering inspired world.**

Work together to redirect power, carry shared payloads, activate platforms and grapple across changing terrain. The puzzles come first; reverse engineering gives their machinery its identity and adds background flavour.

## Getting started

1. When you first open the game, you can customise your ninja's name and colour or simply accept the automatically generated name and start immediately.

2. Select **Tutorial** to learn the controls and basic mechanics, or **Play Co-op** to start a multiplayer session.

3. For multiplayer, one player selects **Start Co-op** and shares the invitation link or room code with their friend. The second player should join using a different device or browser profile. The host selects a level, and both players must reach the exit to complete it.

## Controls

| Key | Action |
| --- | --- |
| `A` / `D` | Move left and right. |
| `Space` | Jump. Press and hold `Space` again while airborne to grapple onto the highlighted anchor. Release `Space` to jump off the rope. |
| `E` | Interact with switches, buttons and cubes. |
| `S` | Drop down or detach from a grapple without jumping. |
| `Tab` | View the entire level. |
| `R` | Respawn at the current checkpoint. |
| `Esc` | Pause the game. |

The game automatically highlights nearby grapple points, although mouse aiming is also available for more precise control.

## What good means for this game

A good Binary Ninja level should make two players say, "Hold that while I try this," rather than ask what a button does or why a jump failed. Overall the level design philosophy was inspired from Valve's Portal 2 (2011). My goal is a cooperative platformer where the challenge comes from understanding a shared world and coordinating movement. Players should not need assembly knowledge, precise mouse or keyboard interactions or an explanation from the developer before they can start enjoying the game. Overall the game should be fun and intuitive regardless of background.

### Cooperation

Cooperation should arise from the level itself. One player might hold a pressure pad while the other crosses, carry a cube that becomes a step for their partner, or change a route while their partner swings between anchors. Neither player has a permanently assigned role, and both must reach the exit. I judge these puzzles by whether each player can understand their contribution and communicate a useful next action, not simply whether two characters appear on screen.

### Readable machinery

The machinery also needs to communicate its state. In Binary Ninja, wires connect controls to machinery, powered and unpowered platforms look different, and payload receivers show whether they have accepted a cube. Visual logic gates show how a signal changes rather than leaving players to interpret a small NOT label. The intended result is a puzzle players can investigate by observing cause and effect, without reading a technical manual.

### Authentic reverse engineering

Finally, the reverse-engineering theme should be authentic without becoming academic work for the player. The campaign’s controller results are verified against real Windows x64 binaries built with O-LLVM (an obfuscator for the clang toolchain), while assembly excerpts add atmosphere beside the machinery. The server uses lookup tables to to evaluate the binary backed controllers. Level geometry, animations, crumble timing and other physical rules remain authored gameplay, not claims about how a processor behaves. 

Sources: 

Portal 2 - Official Steam page: https://store.steampowered.com/app/620/Portal_2/

Junod, P., Rinaldini, J., Wehrli, J., & Michielin, J. (2015). Obfuscator-LLVM - Software Protection for the Masses. IEEE/ACM Workshop on Software Protection.
