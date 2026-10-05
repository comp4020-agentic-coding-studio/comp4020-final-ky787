import { bogusInstructions, hex, instructionText, machineExcerpt, signalForBinding, type TracePlayback } from './evidence-presentation.ts';
import type { PuzzleWorld } from './world.ts';
import type { NativeInstruction } from '../data/uplink-bundle.ts';
/** Authored display positions only; neither geometry nor these connectors represent a CFG. */
const displays = [
    { id: 'grapple-anchor-display', label: 'ANCHOR', x: 595, y: 330, target: { x: 780, y: 520 } },
    { id: 'relay-control-display', label: 'RELAY', x: 990, y: 635, target: { x: 1328, y: 750 } },
    { id: 'lift-control-display', label: 'LIFT', x: 1690, y: 535, target: { x: 1750, y: 855 } },
    { id: 'service-landing-display', label: 'SERVICE', x: 1320, y: 310, target: { x: 1505, y: 460 } },
    { id: 'payload-route-display', label: 'PAYLOAD ROUTE', x: 1400, y: 72, target: { x: 1605, y: 260 } },
    { id: 'exit-display', label: 'EXIT', x: 740, y: 75, target: { x: 1110, y: 170 } },
];
function panel(c: CanvasRenderingContext2D, lines: NativeInstruction[], label: string, x: number, y: number, active: boolean, pulse: number, stepAddress?: number) {
    c.save();
    c.font = '11px ui-monospace, monospace';
    const width = Math.max(310, ...lines.map(i => c.measureText(`${i.rva.toString(16).padStart(8, '0')}  ${instructionText(i)}`).width + 24));
    const height = 61 + lines.length * 16;
    c.globalAlpha = active ? 0.96 : 0.55;
    c.fillStyle = '#0b1720'; c.fillRect(x, y, width, height);
    c.strokeStyle = pulse > 0 ? '#e2edf1' : active ? '#64e6d5' : '#647e91';
    c.lineWidth = 1 + pulse * 2; c.strokeRect(x, y, width, height);
    c.fillStyle = active ? '#64e6d5' : '#9fb1be';
    c.fillText(`${label} · semantic label`, x + 10, y + 17);
    c.fillStyle = '#96aec0'; c.font = '10px ui-monospace, monospace';
    c.fillText(`${hex(lines[0].address)}–${hex(lines.at(-1)!.address + lines.at(-1)!.size)} excl.`, x + 10, y + 33);
    c.font = '11px ui-monospace, monospace';
    lines.forEach((i, n) => {
        const yy = y + 52 + n * 16;
        if (i.address === stepAddress) { c.fillStyle = '#25534f'; c.fillRect(x + 5, yy - 12, width - 10, 16); }
        c.fillStyle = '#728d9f'; c.fillText(i.rva.toString(16).padStart(8, '0'), x + 10, yy);
        c.fillStyle = '#e2edf1'; c.fillText(i.mnemonic, x + 75, yy);
        c.fillStyle = '#a9bdd1'; c.fillText(i.op_str, x + 75 + c.measureText(`${i.mnemonic} `).width, yy);
    });
    c.fillStyle = '#728d9f'; c.font = '9px ui-monospace, monospace';
    c.fillText('REAL x64 · excerpt · full region in EVIDENCE', x + 10, y + height - 8);
    c.restore();
    return { width, height };
}
export function drawEvidence(c: CanvasRenderingContext2D, w: PuzzleWorld, replay: TracePlayback, revealBogus: boolean): void {
    const trace = replay.trace;
    if (w.room.id !== 'uplink' || !trace) return;
    for (const d of displays) {
        const signal = signalForBinding(d.id), active = w.frame.outputs[signal];
        const size = panel(c, machineExcerpt(d.id, trace), d.label, d.x, d.y, active, replay.pulse(signal), trace.step_instruction_addresses[replay.step]);
        // Display-to-machine tether, explicitly presentation geometry, without arrows/CFG claims.
        c.save(); c.strokeStyle = active ? '#38605e' : '#263945'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(d.x + size.width / 2, d.y + size.height); c.lineTo(d.target.x, d.target.y); c.stroke(); c.restore();
    }
    const p = w.platforms.find(p => p.def.id === 'proven-clone')!;
    panel(c, bogusInstructions(), revealBogus ? 'PROVEN BOGUS / BCF' : 'UNANALYSED REGION', 2020, 555, p.solid.enabled, 0);
}
