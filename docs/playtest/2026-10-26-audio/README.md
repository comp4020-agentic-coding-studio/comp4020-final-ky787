# Audio review — 26 October 2026

Open [the playable review](index.html) for six music excerpts, actual prepared
loop seams, the before/after effects comparison, full tracks and screenshots.
[Audio credits](../../../AUDIO_CREDITS.md) is the concise source/license catalogue;
[selection notes](../../audio-selection.md) explain the candidates and exact edits.

The original grapple fire/attach/reel, cube and plate files remain unchanged.
Seven new CC0 effects distinguish switch, latch, checkpoint, breakpoint deploy,
breakpoint confirm, completion and ordinary code activation. Machinery gains
and overlap are reduced. A co-op victory no longer cuts off its stinger.

Six CC0 music selections total 13.16 MB, mastered near −23 LUFS. Two bounded
streaming media players handle 1.8-second scene fades. Native looping preserves
complete musical cycles; no extra overlap shifts the beat. Defaults keep the
music quiet beneath interaction sounds, with additional tutorial/pause/completion
ducking. Music and Effects controls are independent and persist without erasing
old preferences, including an old zero-volume choice.

## Validation

All runs used the production Vite build and local Node server. The audio,
solo and campaign browser routes enabled audio output (`BN_TEST_AUDIO=1`).

| Check | Result |
| --- | --- |
| `pnpm check` | TypeScript, native evidence, **882 unit tests passed / 2 pre-existing skips**, **3 HTTP tests passed** |
| `pnpm build` | Passed native bundle validation, Vite build and browser-boundary audit; existing large-chunk warning remains |
| `pnpm check:audio` | **29 assertions passed**; [report](browser/checks.txt) |
| `pnpm check:browser` | **122 assertions passed**; [report](solo-checks.txt) |
| `pnpm check:campaign` | **78 assertions passed**; [report](campaign-checks.txt) |
| `pnpm check:receivers` | **33 assertions passed**, including custom co-op and Level Builder; [report](receiver-checks.txt) |

The audio route uses independent host/guest identities, real user gestures,
WebSocket joining and an actual HANDSHAKE solve. It verifies all scene tracks,
completion, unchanged stream position across reconnect, independent controls,
mute/unmute, migration/reload and blocked-download gameplay. It seeks only media
near its end to observe a real native wrap, checking unchanged load/play/fade
counts. Blur, visibility and persisted-page lifecycle events are deliberately
simulated and labeled; they are not represented as an actual browser BFCache hit.
Full campaign checks also exercise real process-kill recovery.

The retired beep measured 99.955% of spectral energy above 1.8 kHz. The new
switch/latch/checkpoint/breakpoint-confirmation clips measure at most 1.162%
there. All source/output hashes, licensing, filters, levels and loop edits are
recorded. No original music masters, television recordings or third-party
runtime requests are shipped.

## Visual and listening handoff

The 1600×900 settings, solo pause and co-op pause screenshots were inspected;
the separate sliders remain readable and compact. Settings also fit 1024×768
and 420×800 without horizontal overflow. Representative captures:

- [Desktop sound settings](browser/01-independent-settings.png)
- [1024-pixel settings](browser/01-settings-1024.png)
- [420-pixel settings](browser/01-settings-420.png)
- [Solo pause](browser/02-solo-pause-mix.png)
- [Co-op completion](browser/03-completion-mix.png)
- [Co-op pause](browser/04-coop-pause-mix.png)
- [Return to title screen](browser/05-return-menu.png)

**Perceptual audition remains outstanding.** The agent could verify media
playback and analyze signals, but could not hear the output. Track placements
are informed structural recommendations, not claims of subjective listening.
The provided montages make that review concrete. Please compare musical fit,
long-session repetition, voice-chat masking and loop seams on headphones and
speakers. Native browser looping is not a sample-accurate output guarantee.
The default mix is deliberately conservative; stronger music is available on
its own slider. DEADLOCK uses a darker dub arrangement rather than sparse piano;
HANDSHAKE carries the piano/electronic contrast.
