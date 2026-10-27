# Audio presentation contract

Audio observes accepted gameplay state. It never controls machinery, timings,
physics, checkpoints, party roles or room progression. Failures must leave all
of those systems usable.

## Effects

`GameAudio` loads only the 20 short assets named in `SOUNDS`. The original
`confirm.ogg` is retained for provenance but excluded from the pool. Named cues
have bounded gain, playback rate, cooldown and polyphony. The global limit is
12 voices, with at most two machinery activations at once. Completion takes
priority and has one voice; gameplay effects stop on pause/backgrounding.

`AudioPresentation` coalesces duplicate cues in each observed transition.
Several retained outputs can change in one controller step; their physical
changes remain intact, while the highest-priority audible machinery cue wins:
door, relay, lift, code. Tactile switch/cube feedback stays separate. Distance
attenuation and existing reel/lift loops remain. `HeroPresentation` retains its
existing breakpoint deployment/flag-confirmation timing. Restored snapshots
baseline it without replaying old milestones.

A co-op completion stinger starts **after** entering victory, so menu cleanup
cannot cut it off. An initial/reconnected completed snapshot does not replay it.
Background completions remain silent. Solo completion preserves automatic room
progression while ducking music. Completion uses the human-selected **Victory by
SRG774**, the complete 5.877551-second stereo recording with constant gain and
OGG conversion only. The toggle remains a separate 0.197-second electronic cue.

Lever-shaped controls share the digital toggle cue even when their accepted
event is `lift-latch`. The solo `switch` + `lift-latch` pair coalesces into one
click. Latch confirmation sits behind that click at 30%; a checkpoint paired
with an ordinary lever uses 40%. Genuine terminal controls retain their latch
feedback; authored breakpoint stations retain hero timing. Presentation reads
the existing room geometry/control kind; producers and authority are unchanged.

The approved Kenney `impactSoft_medium_000.ogg` landing uses constant mastering
gain and runtime gain 0.81. First-50-ms RMS is about 3 dB above the former landing
at the same speed, with a full-volume peak below −7.8 dBFS. The existing velocity
factor `min(1, landingSpeed / 700)` and 0.12-second cooldown remain. Emit once
on an airborne-to-grounded transition; a newly pressed plate under the local
player supplies its own impact instead. Distant/cube-driven plate changes do
not suppress ordinary footfalls. Plate and cube samples/gains are unchanged.

Completion sets a monotonic duck deadline from the **loaded AudioBuffer duration**,
rounded up to milliseconds (5.888 seconds in the tested 48 kHz browser).
The file's **5.878-second** rounded duration is the fallback before decoding;
an asset test keeps it tied to the recording. This accounts for browser codec/
resampling padding. The regular music synchronization then returns to the current view's
mix through the existing **450 ms ramp**. A completed co-op chamber does not hold the completion duck
indefinitely: its victory/chamber-selection screen returns to the ordinary pause
mix even while the result remains visible. Restored completed snapshots neither
replay the stinger nor renew its deadline.

## Streaming music

`MusicPlayer` owns at most two `HTMLAudioElement` decks. It never feeds long
tracks into `GameAudio` or `decodeAudioData`. Scene changes reuse those decks
with a 1.8-second smooth fade after the incoming track can play; the outgoing
track remains available if a download fails. The source files include authored
loop edits, declicking and no silent tail. Native `audio.loop` retains each
complete musical cycle: no arbitrary overlap shortens bars or doubles off-beat
percussion. An observed wrap counter is diagnostic only; media events do not
trigger beat scheduling. A defensive `ended` fallback handles interrupted media. Decks request metadata lazily; there is no soundtrack prefetch.

The focused soundtrack refinement changes asset selection without replacing
this player or changing its looping, fades, autoplay, focus or streaming behavior.
The catalogue now has seven runtime files: menu, five co-op chamber selections,
and `tutorial-relay.ogg`. The latter preserves the previous Celestial Harmony
file byte-for-byte at its existing gain for solo RELAY (`relay`) and CONTROL
SPINE (`uplink`); those tutorials do not inherit the new co-op HANDSHAKE selection.
PRESSURE and SWITCH continue using the unchanged menu track.

`SliceGame.syncMusic()` maps navigation to menu or chamber identity, independent
of multiplayer revisions. Menu destinations and waiting lobbies share the title
track. Pauses, inspectors, overviews and chamber selection keep the current
track at 28% of its normal gain. Completion uses 18% for the finite hold above;
active solo tutorials use 38%. Changes in ducking take 450 ms. Co-op reconnect and BFCache restoration
reuse the retained chamber identity and playback position.

Actual pointer/key gestures unlock playback. A rejected play promise records a
nonblocking failure and waits for a later gesture/resume; no per-frame retry
loop runs. Hidden/blurred pages pause both decks, retain positions and cancel
animation callbacks. Pagehide suspends music; permanent departure disposes
sources and event listeners. Music remains quiet while a pause stays open.

The Node server streams OGG byte ranges with `Content-Length`, `Accept-Ranges`
and `206`/`416` handling, so seeking does not allocate a whole soundtrack file
per request. The game's static path checks remain in force.

## Preferences and mix

The existing `binary-ninja/c8-audio/v1` key remains. `volume` is the Effects
level; `musicVolume` is independent; `muted` silences both. Existing Effects and
mute values survive. Missing Music defaults to 35%, except legacy `volume:0`
also initializes Music to zero to preserve intentional silence. Once the new
Music value exists, zero Effects no longer mutes Music.

New-user Effects defaults to 65%. All music masters are near −23 LUFS; the menu
uses catalogue gain 1.2, chambers 1.0, yielding roughly −30.5/−32.1 LUFS at the
35% default before ducking. These conservative defaults leave short effects
foregrounded and can be adjusted in Settings or either pause menu.

## Validation and provenance

`tests/audio.test.ts`, `audio-refinement.test.ts`, `landing-audio.test.ts`,
`music.test.ts`, `music-assets.test.ts` and `audio-stream.test.ts` cover selection,
migration, bounded playback, accepted lever events, physical landing intensity,
plate impacts, lifecycle, errors and provenance. `pnpm check:audio` exercises real browser media, two
independent visitors and a physical HANDSHAKE solve, all scene transitions,
completion, reconnect, controls, repeated jumps, plate landings and failure recovery.
`BN_TEST_AUDIO=1 pnpm check:multiplayer-lift` also checks both real lift roles:
one accepted digital click with secondary latch feedback for each visitor.
Synthetic lifecycle
events and accelerated media seeking in that route are labeled as such.

Sources, licenses, modifications and hashes live in [AUDIO_CREDITS.md](../AUDIO_CREDITS.md)
and the two JSON catalogues. See [selection notes](audio-selection.md) for the
limits of structural assessment: automated playback does not establish a human
listening judgment about musical fit, fatigue or speech masking.
