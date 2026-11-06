# Signal switch artwork

`src/slice/signal-switch-render.ts` is the shared Canvas vector asset for the
legacy lever and rectangular ground-terminal branch of `PuzzleRenderer`. It
uses the same chamfered metal materials as the newer machinery: a near-black
housing, recessed circuit traces and a small signal packet. It is drawn directly
at gameplay resolution; there is no raster loading or external asset dependency.

- OFF: amber trace, handle angled toward the open-circle contact.
- Ready: bright rim and an E key on the face, driven by the existing interaction
  hint (including cube priority).
- ON: cyan trace, handle angled toward the closed-bar contact.
- Latched: green trace and closed catches. A one-use terminal uses a seated press
  face/check instead of a toggle handle. Existing latching rules decide this state.

Motion uses the existing energy-motion gate and presentation clock. Paused,
disconnected and reduced-motion views keep the static state readable. Ink is
bounded by x±28, y−94…−24 relative to the unchanged floor contact point. The
housing floats above the floor; neither its position nor its visual state changes
interaction reach, collision or controller state. Existing floating buttons and
breakpoint pedestals retain their distinct artwork.

The shared branch covers SWITCH, RELAY, both CONTROL SPINE levers, HANDSHAKE's
LINK, CROSSFEED's TRANSFER MODE and ROUTE SELECT, RACE's PHASE and DEADLOCK's
HATCH. It also covers old internal labs and equivalent Level Builder objects.
PRESSURE has no lever. BYPASS and USE AFTER FREE use floating terminals or
breakpoints and therefore need no legacy lever replacement.

## Local spacing

No physical device or geometry coordinates change. RACE's PHASE stays at
(655,720) and TRACE ENABLE stays at (615,720). The new housing ends at y696;
the idle pad tread starts at y714, leaving 18 world units between their ink.
The existing PHASE/HATCH caption row stays 130 units above floor contact.
Other authored toggle captions move from −90 to −140; the offered interaction
uses a separate row at −108. Legacy solo captions remain at +40. Nearby character names
move above the control text and housing for both players, preserving YOU/P1/P2. CONTROL
WING moves from (1030,1100) to (1030,1075) to clear its switch prompt.

These placements are authored presentation. No binary listings, truth tables,
room definitions, soundtracks, progression or physics change. See
[onboarding signs](onboarding-signs.md) and the dated visual validation record.
