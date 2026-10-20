# Anonymous ninja characters

A character is a cosmetic `{name, colour}` profile, separate from campaign progress, room state, and level documents. The existing HTTP-only `bn_visitor` cookie remains the anonymous identity. Display names are neither unique nor credentials. Two visitors may use the same name and colour.

## Creation and customization

The main game establishes its cookie by loading progress, then requests the profile. It shows a neutral loading view until this completes, so returning visitors never flash the creator. Visitors with progress but no profile see INITIALIZE NINJA once; saving leaves their progress and remembered party intact. The menu's CUSTOMIZE NINJA opens the same view with SAVE CHANGES and CANCEL. Party menus also expose it and use the existing pause/contact-release behavior.

Names trim outer spaces and accept 2–16 ASCII letters, digits, spaces, underscores and hyphens. Controls and markup are rejected. DOM names use `textContent`; lobby templates escape names. The eight approved colour IDs and hex accents are defined in `src/character/profile.ts`. The server accepts IDs only.

The creator keeps saved, selected, and temporary colours separate. Its actual displayed colour is `previewColour ?? selectedColour`; only selection is submitted. Pointer hover and keyboard focus preview immediately, pointer leave/blur restore selection, and click/Enter/Space/tap select. Cancel discards draft edits. An enlarged Canvas uses the production `drawNinja()` with a presentation-only PlayerState for idle, run, jump and landing. It never steps physics. Hidden/disposed views stop their animation, and reduced motion shows a stationary pose while still updating colours immediately.

Failed profile loads offer retry or a guest creator. Failed saves preserve inputs and offer retry; initial/guest creators can continue without saving. Guest profiles live only in page memory and are visibly labelled NOT SAVED. Co-op always renders the server's last saved profile, or the safe Ninja/cyan default. Clearing cookies loses the association with a saved profile; there is no account recovery or device synchronization.

## API and durable storage

`GET /api/profile` returns `{profile: PublicCharacterProfile | null, revision: number}`. It establishes the normal cookie when needed and sends `Cache-Control: no-store`. `PUT /api/profile` accepts exactly `{profile, revision}`, with the same-origin checks used by progress. Requests are capped at 1 KB. No visitor ID or player slot is accepted in the payload.

Profiles use `/data/profiles/<visitor UUID>.json` (or `DATA_DIR/profiles/`), with version 1, profile, independent revision, and update timestamp. `ProfileStore` serializes reads/writes per visitor and uses the existing file-sync/atomic-rename/directory-sync writer. A stale revision returns 409 plus the current profile record. The client retains the draft and requires another deliberate save after displaying the conflict. Acknowledgement follows durable storage. The deployment remains one Node process on one volume.

A missing profile returns null/revision zero. Malformed stored JSON or invalid fields also return that safe state without touching existing bytes. An explicit replacement first preserves the malformed content in `<visitor UUID>.recovery.json`. Storage failures return an error rather than replacing a valid saved character. Resetting campaign progress never touches this directory or its revision.

## Multiplayer propagation and rendering

`attachMultiplayer` receives a trusted profile loader. Joining/reconnecting resolves a profile using the cookie identity already associated with membership. Public room snapshots carry a slot-indexed `profiles` tuple containing only sanitized `{name, colour}` objects or null for an unassigned slot. The client resolves local and remote appearances from their actual slots, regardless of which computer renders them. Profiles are optional on the wire for compatibility; absent profiles use Ninja/cyan. Authority, sequence, generation, host selection, room codes and visitor-slot assignment retain their existing rules.

After durable profile saves, a store subscription queues a profile update through the existing multiplayer serialization. It reloads the current profile, updates all retained memberships, increments the snapshot revision and broadcasts to room participants. Avatar-position messages contain no profile data; there is no client message for setting another player's appearance. Room records continue to persist identity/membership, while profile data remains separate and is loaded afresh after restart. Public custom room expiry rules remain unchanged.

The shared `PuzzleRenderer` applies the chosen accent to the existing outline, visor, scarf, glow and rope. Name cards follow world positions, retain YOU/P1/P2 labels, shorten names at overview zoom, use 11 CSS-pixel light text on a dark backing, and stack when nearby. They do not affect collision bounds, targeting or camera framing. Lobby cards show names, colour swatches and host/guest roles. All five campaign chambers, internal labs, public custom sessions and local developer sessions share these paths.

Solo tutorials and builder physics previews use the renderer's cosmetic `profile` property. The builder's optional lookup never blocks editing, import/export or physics; profiles are absent from canonical level JSON. `pnpm dev` shares one ProfileStore between the game and local workbench and uses the same loopback hostname so its existing browser cookie is retained across ports. The workbench exposes read-only profile lookup, receives live updates for its multiplayer sessions, and keeps draft/session persistence separate. A standalone workbench reads profiles from `DATA_DIR` or `.local-data` and refreshes them on join/reconnect.

## Validation and observability boundary

Run `pnpm check:character` after `pnpm build` for real browser onboarding, pointer/focus/touch colour preview, persistence/cancel, multiplayer appearances and screenshots. Focused tests cover profile validation, malformed data, atomic writes/concurrent revision conflicts, process restart, client errors, UI state/lifecycle, room propagation, public/local custom sessions and host authority. Existing campaign, public co-op, workbench and public-builder routes still use actual onboarding before gameplay.

Server-side code can later associate its existing visitor ID, sanitized display name/colour, room membership and slot. This feature adds no Crit 10 logging, account identifiers, authentication, cosmetics inventory, physics or binary-evidence changes. Public profiles never contain the cookie or visitor UUID. Screenshot evidence and the dated handoff record the checks for this implementation.

## Visual evidence

[Browser checks](playtest/2026-10-20-characters/checks.txt) and [regression results](playtest/2026-10-20-characters/regression-results.txt) accompany the retained screenshots:

- [First-time creator](playtest/2026-10-20-characters/01-first-time-creation.png), [cyan selection](playtest/2026-10-20-characters/02-cyan-selected.png), [temporary purple hover](playtest/2026-10-20-characters/03-purple-hover.png), [cyan restored](playtest/2026-10-20-characters/04-hover-ended-cyan.png), [purple selected](playtest/2026-10-20-characters/05-purple-selected.png).
- [Name entry](playtest/2026-10-20-characters/06-name-entry.png), [returning visitor](playtest/2026-10-20-characters/07-returning-saved-character.png), [menu customization](playtest/2026-10-20-characters/08-customization-from-menu.png).
- [Two coloured ninjas](playtest/2026-10-20-characters/09-two-coloured-ninjas.png), [partner perspective](playtest/2026-10-20-characters/09b-partner-perspective.png), [named lobby](playtest/2026-10-20-characters/10-coop-lobby-two-names.png), [overview labels](playtest/2026-10-20-characters/11-low-zoom-name-readability.png).
- [Reduced motion](playtest/2026-10-20-characters/12-reduced-motion.png), [mobile touch](playtest/2026-10-20-characters/13-mobile-touch-creator.png), [mobile form actions](playtest/2026-10-20-characters/13b-mobile-form-actions.png), [live profile update](playtest/2026-10-20-characters/14-live-profile-update.png), [public custom session](playtest/2026-10-20-characters/15-public-custom-profiles.png), [unsaved guest](playtest/2026-10-20-characters/16-unsaved-guest.png), [internal lab](playtest/2026-10-20-characters/17-internal-lab-profiles.png).
