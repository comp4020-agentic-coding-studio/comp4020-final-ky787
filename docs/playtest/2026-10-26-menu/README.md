# Main menu and onboarding visual review — 2026-10-26

Screenshots were captured from the production build in Chromium with actual Canvas rendering and independent browser contexts. The menu, invitation and SWITCH routes use real pointer/keyboard input. Review found and corrected a character-card backdrop stacking issue, a cramped lobby, hidden invitation conflicts, and optimistic headings on failed joins.

## Screens

- Title: [1600×900](navigation/title-1600x900.png), [1366×768](navigation/title-1366x768.png), [1024×768](navigation/title-1024x768.png), [390×844](navigation/title-390x844.png).
- Destinations: [Co-op](navigation/coop-start-or-join.png), [Join](navigation/coop-join-code.png), [Level Builder](navigation/builder.png), [About](navigation/about.png), [Settings](navigation/settings.png).
- Character: [initial setup](character/01-first-time-creation.png), [customization](character/08-customization-from-menu.png), [mobile](character/13-mobile-touch-creator.png).
- Invitations: [host copied link](invitations/03-host-link-copied.png), [manual clipboard fallback](invitations/04-manual-copy-fallback.png), [recipient setup](invitations/05-invitation-character-setup.png), [joined lobby](invitations/06-invitation-joined-lobby.png), [active-party choice](invitations/09-active-party-invitation-choice.png), [full party](invitations/10-full-party-feedback.png), [missing party](invitations/11-missing-party-feedback.png), [invalid invitation](invitations/12-invalid-invitation-feedback.png).
- Pause: [solo](navigation/solo-pause.png), [co-op host](invitations/07-coop-pause-host.png), [co-op guest](invitations/07-coop-pause-guest.png).
- SWITCH: [move mouse](switch/switch-01-move-mouse-1600.png), [target selected](switch/switch-02-targeted-1600.png), [actual attachment](switch/switch-03-grapple-connected-1600.png), [cue retired](switch/switch-04-cue-retired-1600.png), [1024×768 reduced motion](switch/switch-01-reduced-motion-1024.png).

## Verification

The adjacent `checks.txt` files retain 27 navigation, 33 invitation, 80 character and 12 SWITCH assertions. Invitation tests exercise four independent profiles, exact copied URLs, first-time initialization, actual shared gameplay, socket reconnect, reload, full/missing/invalid parties, active and remembered conflicts, native Space activation and clipboard failure. Persisted pagehide/pageshow handlers are additionally exercised with explicitly simulated `PageTransitionEvent`s; this is not a claim that Chromium restored a real BFCache entry.

The `validation/` reports retain the wider production, solo, campaign, multiplayer and builder checks. The solo and campaign routes physically solve all four and five rooms respectively. Gameplay/controller assertions remain intact. An existing multiplayer disk-version assertion was corrected to the current version 6 schema; its no-physics persistence checks remain. That route now jumps before hooking and resamples a settling cube during its physical approach, avoiding stale coordinates and a late fall under browser scheduling delays. The authored-campaign server test waits for the guest’s new chamber generation before its trigger and asserts acceptance, fixing a stale-generation test race.

Screenshots were inspected at all requested desktop sizes plus narrow mobile. The title has no long scrolling menu, both authoring links are reachable, five chamber choices fit the desktop lobby, pause cards remain compact, and SWITCH's cue sits above the approach without obscuring the anchor or jump path. Human playtesting remains the next acceptance step; no room geometry or binary contract was expanded.
