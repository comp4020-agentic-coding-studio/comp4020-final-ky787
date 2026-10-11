# Contextual machinery views

Plates and controls may opt into local camera framing through `cameraReveal` in
`RoomDef.plates` and `RoomDef.controls`. This is authored presentation, not a
controller signal, shared state or binary evidence. The existing `Camera` still
owns viewport fitting, exponential follow/zoom, world clamping and pointer mapping.

```ts
cameraReveal: {
    platformIds: ['span1', 'crumbleA', 'span3', 'crumbleB', 'span5'],
    bounds: { x: 540, y: 150, w: 2820, h: 760 },
    padding: 70,
    duration: 1.5,
}
```

`platformIds` selects authored rectangles, including ghosts and collapsed blocks.
Optional `bounds` adds a preferred region for swing arcs, firewalls, timers or
other objects. Either may be used alone; together their union is framed. Missing
IDs are ignored; an empty target does not start a reveal. The local body is always
included and target bounds are clipped to the room. Padding is in world units
(default 64); duration is in seconds (default 1.5, used only for controls).

Choose a relevant region rather than the entire room. The existing camera fits it
to the current viewport without zooming closer than normal. On a viewport wider
or taller than the world at that zoom, the existing centered overscan behavior is
preserved. No remote-avatar chasing or continually changing powered-platform bounds
are used: framing remains stable when outputs toggle or a fake block collapses.

Priority, highest first:

1. Initial or held Tab whole-room overview.
2. A locally held, authored pressure-plate view, with no timeout.
3. A brief local control-interaction view.
4. Normal following. CONTROL SPINE retains its existing 2.2-second final-route
   reveal at the temporary-view tier; its authored contract and trigger are unchanged.

Plate contact uses the same grounded-body predicate as co-op sensors, sampled
locally without waiting for a server reply. It does not read shared occupancy or
cube contacts. A fixed envelope around the plate covers the player's contact
range without recentering on small movements. Stepping off immediately selects
normal following; the existing camera then eases back.

Control adapters return the authored control ID only after issuing a local
interaction. `PuzzleWorld.localControl` records that input edge for presentation.
The camera consumes it once; acknowledgements, denial reconciliation and remote
room snapshots cannot restart the timer. This field is neither saved nor sent
over WebSocket. If adding another control adapter, return its ID from `interact`
when the local interaction is issued; proximity alone must not trigger a reveal.

A plate suppresses and discards temporary control views. Repeated PHASE toggles
on TRACE therefore keep exactly the same target and cannot leave a delayed reveal
behind after stepping off. Explicit overview overrides either view; temporary
timers still expire underneath it. Room replacement, death/respawn and local
disconnect clear old temporary state. Reconnecting may reveal a plate again if
the local body is still actually holding it.

## RACE CONDITION targets

- DROP A/B: cargo enclosure, top/buffer, Cube A, timer, both beams and receiver,
  unioned with the local operator. B needs a wider view because it is farther away.
- TRACE ENABLE and PHASE: all five slabs and the space below for the runner's arcs.
  A held TRACE view takes precedence over every short PHASE interaction.
- RETURN: the bridge and both connecting deck edges, without framing the whole room.

Legacy rooms opt out unless authored with metadata. Camera diagnostics are in the
read-only game snapshot (`camera.kind`, `id`, target `frame`, center and `zoom`).
Focused tests cover local/remote separation, sustained/temporary lifetimes,
priorities, interruption cleanup, fixed phase targets, viewport bounds and pointer
round trips throughout transitions. The muted two-browser RACE route checks views
while physically solving both role arrangements and clicking every grapple target.

Manual acceptance: watch the partner from TRACE while toggling repeatedly; inspect
both DROP views during cargo transfer; stand on and step off RETURN; operate PHASE
off TRACE, hold/release Tab, and reset/disconnect during a reveal. Judge readability
and easing at both players' actual window sizes. No puzzle semantics changed.
