# Process overview

## What I built

I created a binary ninja platformer game where 2 players control a character that can move blocks and shoot a grapple hook. The aim of the game is to navigate the stage to get to the end by interacting with the world. The world is also reflective of real windows x64 binaries I generated after designing the stages for flavour and also include O-LLVM obfuscator research ideas. 

## How I got here

### Separating backend and frontend. 

I used separate agents with different harnesses for backend and frontend. I used a windows codex agent to do the backend which create datasets from level designs by generating matching binaries and wrote outputs to a shared folder which a separate agent on the front end which read them from. Then this agent which as a separate harness which is catered towards gameplay visuals is used to generate the actual game and infrastructure. 


- [e8b0e25](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/e8b0e25c458df420972f469f2d7ee852d5d3189e) — Agent instructions
- [82a9b62](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/82a9b62eb728a33806e86686d5cb88d3d0b8b58a) — Native controller integration

### Two major redesigns. 

I did experiments and playtested various game ideas, one that tried to piece together a binary with "cards" and another with a similar card approach but with more trial and error using binary ninja physics. The agents then created a second game which was more geared towards gameplay however this was still too academic since I had the backend generate the binaries first, and then had Claude generate the frontend. Finally I decided on getting the agents to generate the frontend gameplay and levels, and then generate a handoff for the backend to compile the binaries.

- [8304251](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/83042511d683f40e558ad410e6a4896c7705c5d2) — Gameplay-first redesign
- [ec1e4ae](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/ec1e4ae206f8a90db2da4128b2cbd0938deacfbf) — UPLINK retrieval puzzle

### Streamlining level generation

I got the agents to generate a level builder with aims to improve the level design for both myself and via AI. Previously the level generation involved getting Claude changing the .ts level file directly which was difficult for both the model and for me to understand/change it. To fix this I designed a new world builder which used a front end to generate levels with a drag and drop design, and also include a json for the agents to easily modify the levels which also allowed me to make simple changes to AI generated levels without modifying the source directly. This enabled easy generation and modification of the main 2-player campaign which involved multiple small edits to get the levels right.

- [b8797e7](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/b8797e79e8a9384b48a690f1cfff4b92bba620e8) — JSON level format
- [8f8adc4](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/8f8adc4cbbd97839395d0e45e6dd8395336a7d6a) — Visual level editor
- [565a77e](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/565a77e1ecd9c017544c144098b59750c496bb78) — Chamber refinements

### Revise audio

Originally I got claude to pick some audio for various things such as sound effects and background music, however I soon realised that the models were not able to read the audio directly. Instead the models were choosing sounds to use purely by metadata and other audio measurements. For this reason several audio picks were not suited for the game, such as a victory sound which sounded cartoonish rather than the intended sci-fi theme. I eventually had the agents find a bunch of audio effects and tracks that had friendly licensing and manually listened to them, picking out the best ones. Another example of this is when the agents originally choose heavy techno for some levels which was intense, and so I asked claude to curate a list of CC0 license music and I choose the best ones.

- [9e33207](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/9e3320736982389d47418db0aa19d5eacf3a6f0c) — Initial audio choices
- [60c04fc](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/60c04fcddf519b452d9eb9d56ae754ecc6fb6dce) — Human-approved audio

### Multiple small changes and polished

Towards the end of the project I attended crits and had various friends test the game and gather feedback. This occurred on multiple occasions where feedback gradually made the game more intuitive and fun. Examples were:

- Quickly making a ninja character instead of being forced to create a name and make customisation optional
- Changing jump height to be static regardless of the space key being held
- Change grapple mechanics to stop the enforcement of the mouse and replaced triple tapping space with a tap and hold design
- Making inactive machinery and connections more visible

Some testers played the game before and after some of these and found it easier and more enjoyable to play. Some changes such as jumping keyboard mechanics would not have been optimised if not for the repeated testing with actual humans which shows the importance of attending the crits.

- [e61466f](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/e61466fefca0c7bfb42c5357c732b7af6a85d354) — One-click character setup
- [7bf93b2](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/7bf93b2071e233e49271eee9db33455ad7059f42) — Simpler jump/grapple controls
- [f24f06f](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/f24f06f07b5ce0554d6ad706caf8ad402957a41d) — Visible inactive connections

### Verifying the generated binaries

An important part of the process was ensuring the game actually reflected real obfuscated binaries rather than simply displaying assembly for visual effect. I had the Windows Codex agent generate clean and O-LLVM obfuscated executables, then compare their outputs against the original TypeScript controllers across all possible input combinations. It also retained disassembly, execution traces and output mappings so the frontend could display genuine instructions. Rather than running Windows binaries on the game server, I used lookup tables containing the actual binary outputs. This was considerably more complicated than using purely imaginative assembly, but I felt it was important to preserve the reverse engineering aspect of the original idea.

- [7e510db](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/7e510dbdad54ac2b09ff0021a1067561738d5fa2) — Native binary acquisition and verification
- [dfa4399](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/dfa4399b0684e714ba189141d3a6256b2ab29850) — Integration of verified native lookup tables

### Developing the multiplayer architecture

Since cooperation was central to the game, I needed a system where two players could interact with the same machinery without seeing inconsistent results. I chose a Node.js backend using WebSockets, allowing each browser to handle its own movement and grappling while the server controlled shared interactions, cubes and puzzle progress. This made the game responsive without requiring the server to simulate every movement. However, it introduced additional complexity, particularly around shared objects, reconnecting players and preserving progress. I had the agents implement persistent multiplayer sessions and test reconnects, server restarts and two-player completion. This architecture eventually made it relatively easy to implement the world build and save local and server wide levels. Overall this was considerably more work than building a single-player platformer, but necessary to achieve the coop gameplay I wanted.

- [c51f221](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/c51f2215d8c55300e23e56229fb7aa8b102c0265) — Persistent multiplayer parties and campaign transitions
