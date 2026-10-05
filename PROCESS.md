# Process overview

## What I built

I created a binary ninja platformer game where the player (in the future it will be 2 players) control a character that can move blocks and shoot a grapple hook. The aim of the game is to navigate the stage to get to the end by interacting with the world. The world is also reflective of real windows x64 binaries I generated after designing the stages for flavour and also include O-LLVM obfuscator research ideas. 

## How I got here

### Separating backend and frontend. 

I used separate agents with different harnesses for backend and frontend. I used a codex agent to do the backend which create datasets from level designs by generating matching binaries and wrote outputs to a shared folder which a separate agent on the front end which read them from. Then this agent which as a separate harness which is catered towards gameplay visuals is used to generate the actual game and infrastructure. 


- [e8b0e25 — Project harness](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/e8b0e25c458df420972f469f2d7ee852d5d3189e): Set the agent instructions in `CLAUDE.md`, separating binary evidence from hand-authored rooms and frontend presentation. Kept the shared research workspace out of Git.
- [82a9b62 — Real controller integration](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/82a9b62eb728a33806e86686d5cb88d3d0b8b58a): Connected UPLINK to the validated Windows OLLVM bundle. Added retained trace playback, real assembly, proof-backed bogus-block presentation and evidence checks while preserving the accepted puzzle mechanics.

### Two major redesigns. 

I did experiments and playtested various game ideas, one that tried to piece together a binary with "cards" and another with a similar card approach but with more trail and error using binary ninja physics. The agents then created a second game which was more geared towards gameplay however this was still too academic since I had the backend generate the binaries first, and then had Claude generate the frontend. Finally I decided on getting the agents to generate the frontend gameplay and levels, and then generate a handoff for the backend to compile the binaries. 

- [8304251 — Gameplay-first pivot](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/83042511d683f40e558ad410e6a4896c7705c5d2): Replaced the earlier code-wiring tutorials with PRESSURE, SWITCH and RELAY. Added controlled grappling, explicit mock controllers and server-side progress saving, with browser and persistence tests.
- [ec1e4ae — UPLINK retrieval puzzle](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/ec1e4ae206f8a90db2da4128b2cbd0938deacfbf): Added reusable lift fields and fixed two-way relay gates. Combined them into a cube-retrieval puzzle, testing the physical design before integrating its real binary controller.
- [6c31f23 — CONTROL SPINE showcase](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/6c31f236322b73cd2fd2fe2ac0aa1f33ed869888): Enlarged UPLINK into a chamber with two payload-retrieval loops without changing its validated controller contract. Added authored XOR message effects, clearly separate from binary evidence, and retained route screenshots.
- [409b076 — Clearer connections and grapple finale](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/409b076e7e5611c37781c212298518b659cadb75): Added animated powered connections and a held overview so players could read the room. Reworked the final route into a grapple sequence with an unstable anchor and safe recovery.


