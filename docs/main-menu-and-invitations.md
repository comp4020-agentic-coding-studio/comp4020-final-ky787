# Main menu, party invitations and tutorial onboarding

The application starts with normal character initialization, then a full-screen title screen. `src/menu/views.ts` contains the small presentation templates; `SliceGame` owns explicit application views and transitions. The title screen, destinations, character setup, connection screen, solo pause, co-op pause, lobby, chamber selection and victory have distinct states. The title's cosmetic `NinjaPreview` swing reuses `drawNinja`, has no world physics, observes reduced motion/page visibility, and is disposed on navigation.

## Player navigation

- **Tutorial** always starts PRESSURE, then uses existing progression through SWITCH, RELAY and CONTROL SPINE. `tutorialProgress` replaces those four room memories and selects PRESSURE, retaining completed-room records, learned mechanics and bounded history. It neither resets visitor identity nor modifies character or co-op persistence.
- Returning visitors have a secondary **Continue** action for their saved room. **Resume** in pause continues the current room. **Restart Room** resets only that room's logical state, retaining records in all other rooms.
- **Play Co-op** offers **Start Co-op** and **Join Co-op**. Hosting sends the existing `create-party` request and opens a lobby. The host separately selects one of five chambers; hosting never selects or starts a chamber automatically.
- **Level Builder** contains `/workbench.html` and `/my-levels.html`. Both await the progress save queue before navigation and retain the unsaved-progress confirmation. Local development retains `VITE_WORKBENCH_URL`; the builder retains its own dirty-edit safeguards.
- **Customize Ninja** uses the existing creator and persistence; save and cancel return to the title. The selected colour immediately appears in the title preview. Customization is unavailable in gameplay pause.
- **About** explains controls and distinguishes retained binary evidence from authored tutorial controllers, string effects and prototype crumble. **Settings** contains sound, volume and the explicitly confirmed, revision-aware progress reset.

Solo pause offers Resume, Restart Room, Main Menu and collapsed sound controls. Co-op pause offers Resume, Copy Link, Leave Party, sound, and host-only chamber selection. Backdrop clicks and Escape resume only ordinary pause states. Setup, home, lobby, chamber selection, victory and reset confirmation cannot be dismissed into gameplay. Escape cancels a reset confirmation. Every view transition clears held input and queued actions; menus keep native keyboard navigation, and resume restores canvas focus. A same-party/same-chamber reconnect preserves an open pause; an authoritative new chamber still opens its normal overview.

`?debug=1` continues to enable diagnostics; `?labs=1` reveals regression rooms inside Play Co-op. A developer room selector is available in Settings under either flag. Neither grid appears on the normal title screen.

## Invitations

Links are constructed with `new URL('/', location.origin)` and `searchParams.set('join', acceptedCode)`: `https://<game-host>/?join=7K3M`. They include no debug/lab flags or credentials. The visible four-character party code and secondary Copy code remain available. Clipboard success is reported only after `writeText` resolves. Failure exposes a focused, selectable invitation URL.

The initial query is validated through `normalizeCode` and retained through profile setup. An explicit invitation takes priority over a remembered unrelated session, even when the invitation is invalid. Joining uses the existing WebSocket client/protocol and server-owned identity, slots and two-player limit. Repeated pending invitations are deduplicated. Receiving a different invitation while already in an active party requires an explicit Leave Party & Join Invitation action.

Only an accepted matching room snapshot consumes `join` via `history.replaceState`; other parameters remain intact. Failed joins retain their invitation for Retry. Manually correcting an invitation updates the pending query to the validated replacement code, so its successful snapshot consumes the obsolete invitation. The manual input accepts four-character codes or same-origin root URLs containing exactly one `join` parameter and no other parameters, credentials or fragment. Pasted URLs are parsed as data and never used as navigation targets. Full, absent and expired parties show feedback plus Back/Retry.

The SWITCH onboarding contract is documented in [the C8 design](c8-vertical-slice.md). It observes the existing target ring and actual rope attachment; it never changes grapple physics or treats cursor movement as mechanic completion.

## Validation

Focused suites cover progress reset boundaries, input suspension, view templates, character preview, invitation parsing/clipboard/client lifecycle and staged SWITCH cues. Real browser routes:

- `pnpm check:menu`: title sizes 1600×900, 1366×768, 1024×768 and 390×844; customization; navigation; fresh tutorial history; pause, backdrop, Escape, focus, held inputs, Space; settings confirmation.
- `pnpm check:menu-invitations`: actual isolated visitors, exact clipboard URL, first-time setup, shared gameplay, reconnect, remembered/active conflicts, full/missing/invalid parties, pasted/manual codes and clipboard failure.
- `pnpm check:switch-onboarding`: physically solve PRESSURE then power SWITCH, aim at the real anchor, jump and attach; inspect all stages and saved retirement at desktop sizes and reduced motion.

Screenshots and assertion reports are in [the dated review](playtest/2026-10-26-menu/). Existing character, campaign, multiplayer, four-room solo and workbench checks continue to traverse real UI controls through the shared browser navigation helper; their gameplay routes are retained.
