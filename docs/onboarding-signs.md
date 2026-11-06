# Environmental onboarding signs

[`src/slice/onboarding-render.ts`](../src/slice/onboarding-render.ts) draws three
small authored wall signs through the ordinary world camera. They share the
existing monospace lettering and Canvas materials. Their positions, dimensions
and ink are static, including during pause and reduced motion; they add no
collision, interaction, input, saved state or binary evidence.

| Room | Guidance | Fixed world placement |
| --- | --- | --- |
| PRESSURE | PRESS E TO PICK UP CUBE | Text starts (250,385), above the cube's original pickup area and clear of the entry header. |
| SWITCH | PRESS SPACE TO JUMP / PRESS AND HOLD SPACE AGAIN TO SWING | Text starts (260,380), second baseline402; between the machine display and the wire at y430. |
| HANDSHAKE | BOOST YOUR PARTNER | Diagram x1618–1780, y274–391; caption centred at (1690,416), left of the maintenance ledge and above the players. |

The HANDSHAKE pictogram shows one ninja supporting a payload overhead, a second
standing on it, and an upward step arrow. It replaces the large `TWO HANDS. ONE
STEP HIGHER.` regional caption in the released room's rendering. The diagram's
visor/scarf shapes echo the playable ninja without a player glow or nameplate.
The actual [held-cube support](adr/0005-partner-cube-support.md), geometry and
interchangeable player roles are unchanged.

SWITCH's existing dynamic sign still teaches target selection, A/D swing and
Space release after a successful attachment. The small permanent lettering is
visible before the switch is powered and after that dynamic lesson retires.
These signs are background instructions, not additional modal tutorials.

Normal-camera screenshots and checks for this pass belong in the dated playtest
record; they do not imply a human playtest or a new physical route proof.
