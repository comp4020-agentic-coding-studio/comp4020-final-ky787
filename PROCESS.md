# Process overview

## What I built

I created a binary ninja platformer game where 2 players control a character that can move blocks and shoot a grapple hook. The aim of the game is to navigate the stage to get to the end by interacting with the world. The world is also reflective of real windows x64 binaries I generated after designing the stages for flavour and also include O-LLVM obfuscator research ideas. 

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

### Streamlining level generation

I got the agents to generate a level builder with aims to improve the level design for both myself and via AI. Previously the level generation involved getting Claude changing the .ts level file directly which was difficult for both the model and for me to understand/change it. To fix this I designed a new world builder which used a front end to generate levels with a drag and drop design, and also include a json for the agents to easily modify the levels which also allowed me to make simple changes to AI generated levels without modifying the source directly. This enabled easy generation and modification of the main 2-player campaign which involved mlutiple small edits to get the levels right. 

- [b8797e7 — Shared JSON level format](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/b8797e79e8a9384b48a690f1cfff4b92bba620e8): Added versioned JSON drafts, validation, imports and atomic saving. The [agent authoring guide](docs/level-authoring-for-agents.md) documents how agents edit and validate this format directly.
- [8f8adc4 — Graphical level editing](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/8f8adc4cbbd97839395d0e45e6dd8395336a7d6a): Added the visual editor, object manipulation, connections and undo/redo. The [builder guide](docs/level-workbench.md) explains placing, dragging and resizing objects, plus importing and exporting JSON for changes between human and agent editing.
- [615421c — Physics previews and agent tools](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/615421c3aa50c8e8bedcd2df7550c2da8fa5373d): Reused the game's renderer and physics for draft previews and added CLI screenshot and scenario tools, allowing level changes to be checked in the actual engine.
- [9f25031 — Three cooperative JSON drafts](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/9f2503167406951e3dc88c5848e0e5cf044d51bc) and [552cbea — Campaign integration](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/552cbeaa1a42a421448e0ce59574a132cd332f20): Authored HANDSHAKE, DEADLOCK and USE AFTER FREE as workbench JSON with physical solve scenarios, then promoted reviewed copies into the five-chamber campaign. The [integration contract](docs/adr/0010-json-coop-campaign.md) explains how released levels remain separate from editable drafts.
- [565a77e — Iterative chamber refinements](https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/commit/565a77e1ecd9c017544c144098b59750c496bb78): Updated draft and campaign JSON so DEADLOCK's service relay remains powered after all payloads are delivered. Also simplified checkpoint activation and updated the solve scenarios and regression tests.


