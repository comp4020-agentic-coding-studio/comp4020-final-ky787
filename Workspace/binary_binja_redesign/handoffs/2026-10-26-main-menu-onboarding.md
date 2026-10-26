# Main menu and onboarding delivery — 2026-10-26

Implemented on `main` after fetching and confirming reviewed base `a639878d0f7a9da2d3b44f0ab5807737726e658e`. Unrelated edits to `CLAUDE.md`, `levels/drafts/blank-room.json` and the three pre-existing deleted 2026-10-20 handoffs were preserved and excluded from this delivery.

## Delivered behavior

The first normal screen is a full-viewport title with Tutorial, Play Co-op, Level Builder, Customize Ninja, About and secondary Settings/Continue. The selected-colour ninja swings using the existing renderer; motion is cosmetic, reduced-motion aware, visibility aware and disposed on navigation. Desktop 1600×900, 1366×768, 1024×768 and narrow 390×844 layouts were reviewed.

Tutorial always starts PRESSURE and resets only the four tutorial puzzle memories. Identity, previous completions, learned mechanics, history and co-op progress remain. Continue/Resume retains the current room. Solo pause provides Resume, Restart Room, Main Menu and compact sound settings. Co-op pause provides Resume, Copy Link, Leave Party and host-only chamber selection. Backdrop/Escape resumes only ordinary pause; setup, home, lobby, victory, chamber selection and destructive confirmation remain protected. Menu input is suspended and cleared; focus returns to the canvas. Same-chamber transport reconnect and persisted-page lifecycle retain pause and dismissed overview state.

Play Co-op separates Start and Join. Hosting sends the existing create-party message and waits for explicit host chamber selection. Copy Link produces `https://<current-origin>/?join=7K3M`, with no debug/lab flags. Invitations survive character setup, override unrelated remembered sessions, join through the existing client, and are consumed only after matching accepted snapshots. Active-party conflicts require an explicit leave/join choice; invalid invitations preserve an active party. Clipboard denial exposes a selected manual-copy URL. Full/missing/invalid parties have clear Back/Retry; expired-party server errors are covered by client tests. Pasted URLs must have the first-party origin and expected root/join-only format.

SWITCH now stages mouse aiming, actual target confirmation, jump/second Space instruction and actual rope-attachment feedback. Aiming alone does not complete the lesson. Saved grapple progress suppresses repeated instruction. The sign and highlight are authored presentation above the approach, with static reduced-motion cues. No physics, geometry, controller, binary evidence, server authority or campaign contract changed.

Both authoring routes retain save-flush, unsaved-progress confirmation and the development workbench override. Debug/lab flags remain available. The former tutorial selector is only a developer control in Settings; five co-op chambers are selected in the party lobby.

## Validation and review

- Full project check: typecheck, native evidence consistency, 860 passing unit tests (2 pre-existing skipped), and 3 HTTP specification checks.
- Production build: retained UPLINK verification (32 states/traces) and browser-boundary audit passed; existing large-bundle warning remains.
- Navigation: 27 browser assertions; invitations: 33 assertions across four independent browser contexts; character: 80 assertions; SWITCH: 12 assertions.
- Full physical solo route: 121 assertions through all four rooms. Full campaign: 78 assertions through all five co-op chambers, including victory/replay, disconnect and server-restart recovery.
- Multiplayer: 93 assertions with both role assignments, cube handoff, two arrivals and server-restart persistence.
- Workbench: 56 assertions; local menu/save/navigation safeguards: 13; public builder: 67.

The invitation suite verifies real copied-link joining, first-time creation, co-op gameplay, actual socket reconnect and reload. Persisted `pagehide`/`pageshow` handlers additionally use explicitly simulated PageTransitionEvents; this is not evidence of a real Chromium BFCache restoration.

Review caught and fixed creator backdrop stacking, lobby spacing, hidden conflict actions, stale invitation queries after manual correction, pause/overview restoration, active invalid-invitation protection and co-op focus. Existing browser routes were updated through actual menu navigation. The multiplayer test's outdated disk version was updated to current version 6 while retaining its semantic-only persistence assertions; physical approaches now use jump-before-hook and the cube's current position from the player's own side. A character reconnect comparison retains physical/persisted state assertions while excluding the unsent local groundId contact cache. The authored-campaign server test now waits for the guest to receive the selected chamber generation before triggering crumble and explicitly asserts that the trigger was accepted; this removes a stale-generation test race without weakening the machinery assertion.

Authoritative design: `docs/main-menu-and-invitations.md`, `docs/c8-vertical-slice.md`, existing character/party/workbench documents. Screenshots and check reports: `docs/playtest/2026-10-26-menu/README.md` and its linked artifacts. Handoffs are not binary evidence.

## Handoff

Commit and push use normal `main` workflow. The existing GitHub checks gate and Fly deployment remain unchanged; final delivery reports the resulting commit and deployment run. The next acceptance step is human playtesting of the title → Tutorial / shared invitation → co-op flows and mouse-based grappling in SWITCH. No further puzzle or validated binary-contract expansion is included.
