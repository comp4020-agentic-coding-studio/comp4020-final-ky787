import { CODE_SLAB_HEIGHT } from './tuning.ts';
import { bogusInstructions, hex, instructionText, machineExcerpt, type TracePlayback } from './evidence-presentation.ts';
import { uplinkEvidence } from './validated-controller.ts';
import type { PuzzleWorld, PlatformState } from './world.ts';
import type { MachinePresentation } from './presentation.ts';
import type { NativeInstruction } from '../data/uplink-bundle.ts';
import type { Box } from '../engine/geometry.ts';

/** A real excerpt belongs to the physical slab, rather than a separate tethered card. */
export function platformListing(platform: PlatformState, replay: TracePlayback): NativeInstruction[] | null {
    if (!replay.trace) return null;
    if (platform.def.kind === 'crumble-proven') return bogusInstructions();
    const binding = uplinkEvidence.machine_bindings.find(b => b.frontend_object.collection === 'platforms' && b.frontend_object.id === platform.def.id);
    return binding ? machineExcerpt(binding.id, replay.trace) : null;
}
export function platformAddress(platform: PlatformState, replay: TracePlayback): string | null {
    const listing = platformListing(platform, replay);
    return listing ? hex(listing[0].address) : null;
}
function text(c: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, colour: string) {
    c.font = `${size}px ui-monospace, monospace`; c.fillStyle = colour; c.fillText(value, x, y);
}
/** The top edge/header is the collider. This hanging listing is decoration, like Crit 5. */
function listing(c: CanvasRenderingContext2D, lines: NativeInstruction[], slab: Box, active: boolean, pulse: number, stepAddress: number | undefined, message?: string) {
    c.save(); c.font = '11px ui-monospace, monospace';
    const width = Math.max(slab.w, 220, ...lines.map(i => c.measureText(instructionText(i)).width + 24));
    const x = slab.x + (slab.w - width) / 2, y = slab.y + slab.h;
    const height = 12 + lines.length * 14 + (message ? 24 : 0);
    c.globalAlpha = active ? 0.92 : 0.35;
    c.fillStyle = '#0b1720d9'; c.fillRect(x, y, width, height);
    c.fillStyle = pulse > 0 ? '#64e6d5' : '#385563'; c.fillRect(x, y, 2, height);
    lines.forEach((i, n) => {
        const yy = y + 18 + n * 14;
        if (i.address === stepAddress) { c.fillStyle = '#25534f'; c.fillRect(x + 4, yy - 12, width - 8, 16); }
        text(c, i.mnemonic, x + 12, yy, 11, '#d6e8f8');
        text(c, i.op_str, x + 12 + c.measureText(`${i.mnemonic} `).width, yy, 11, '#96b2cc');
    });
    if (message) text(c, `"${message}"`, x + 12, y + height - 10, 11, '#e8ca92');
    c.restore();
}
function displayString(w: PuzzleWorld, presentation: MachinePresentation, signal: Parameters<MachinePresentation['describe']>[2], pulse: number): string {
    const feedback = presentation.describe(w.room.id, w.frame, signal);
    const count = feedback.active ? Math.floor(feedback.text.length * (1 - pulse)) : 0;
    return feedback.text.split('').map((ch, i) => i < count ? ch : ((i * 17 + Math.floor(w.elapsed * 8)) % 16).toString(16).toUpperCase()).join('');
}
/** Draw below all solid geometry so a nearby listing never conceals another ledge. */
export function drawPlatformListings(c: CanvasRenderingContext2D, w: PuzzleWorld, replay: TracePlayback, presentation: MachinePresentation): void {
    if (w.room.id !== 'uplink' || !replay.trace) return;
    for (const p of w.platforms) {
        const lines = platformListing(p, replay);
        if (!lines || p.respawn > 0) continue;
        listing(c, lines, { ...p.def, h: Math.min(CODE_SLAB_HEIGHT, p.def.h) }, p.solid.enabled, p.def.signal ? replay.pulse(p.def.signal) : 0,
            p.def.kind === 'crumble-proven' ? undefined : replay.trace.step_instruction_addresses[replay.step],
            p.def.signal ? displayString(w, presentation, p.def.signal, p.pulse) : undefined);
    }
}
/** Equipment displays share the same address/listing layout; no fake physical code slab. */
export function drawMachineListings(c: CanvasRenderingContext2D, w: PuzzleWorld, replay: TracePlayback, presentation: MachinePresentation): void {
    const trace = replay.trace;
    if (w.room.id !== 'uplink' || !trace) return;
    const relaySwitch = w.room.lever!, lift = w.room.lifts![0], exit = w.room.exit;
    const devices = [
        // Mount the retained relay-output listing under its power control, clear of the gate.
        // This is frontend presentation placement; the exported binary binding stays unchanged.
        { id: 'relay-control-display', type: 'SWITCH', signal: 'relayGates' as const, box: { x: relaySwitch.x - 132, y: relaySwitch.y + 56, w: 265, h: 24 }, pulse: w.gates[0].pulse },
        { id: 'lift-control-display', type: 'LIFT', signal: 'liftField' as const, box: { x: lift.x, y: lift.y + lift.h + 5, w: lift.w, h: 24 }, pulse: w.lifts[0].pulse },
        { id: 'exit-display', type: 'EXIT', signal: 'exitDoor' as const, box: { x: exit.x - 65, y: exit.y + exit.h + 32, w: 260, h: 24 }, pulse: w.displayPulse },
    ];
    for (const d of devices) {
        const lines = machineExcerpt(d.id, trace), active = w.frame.outputs[d.signal], b = d.box;
        listing(c, lines, b, active, replay.pulse(d.signal), trace.step_instruction_addresses[replay.step], displayString(w, presentation, d.signal, d.pulse));
        c.save(); c.globalAlpha = active ? 0.95 : 0.5;
        c.fillStyle = '#13252e'; c.fillRect(b.x, b.y, b.w, b.h);
        text(c, hex(lines[0].address), b.x + 10, b.y + 17, 11, active ? '#64e6d5' : '#91a9b5');
        text(c, d.type, b.x + b.w - 48, b.y + 16, 9, '#829daa'); c.restore();
    }
}
