import { hex } from '../coop/native-evidence.ts';
import { nativeWorldBindingState, type NativeWorldEvidence } from '../coop/native-world-evidence.ts';
import type { NativeDisasmInstruction } from '../coop/native-evidence.ts';
import type { Box } from '../engine/geometry.ts';
import type { PuzzleWorld } from './world.ts';
import { WORLD_ASSEMBLY_PLACEMENTS, nativeWorldPlacementBinding, nativeWorldPlatformBinding } from './native-world-presentation.ts';

export interface NativeWorldPanel {
    objectId: string; output: string; address: number; storeAddress: number;
    raw: boolean | null; physical: boolean | null; expanded: boolean; static: true;
    bounds: Box; instructions: NativeDisasmInstruction[];
}
const intersects = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const ink = '#c6d8e8', muted = '#8099ac', cyan = '#64e6d5';
function text(c: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, colour: string): void {
    c.font = `${size}px ui-monospace, monospace`; c.fillStyle = colour; c.fillText(value, x, y);
}

/** Decoration only: no prediction, trace playback, collisions or controller writes. */
export class NativeWorldRenderer {
    private time = 0;
    private key = '';
    private changes = new Map<string, { value: string; at: number }>();
    panels: NativeWorldPanel[] = [];

    header(evidence: NativeWorldEvidence, chamber: string, objectId: string): { address: string; powered: boolean | null } | null {
        if (evidence.data?.chamber_id !== chamber) return null;
        const mapped = nativeWorldPlatformBinding(evidence.data, objectId);
        return mapped && evidence.state ? { address: `${chamber === 'race-condition' && ['cargo-top', 'cargo-buffer'].includes(objectId) ? 'STATIC ' : ''}${hex(mapped.output.excerpt.store_address)}`, powered: evidence.state.connected ? nativeWorldBindingState(evidence.state, mapped.output, mapped.binding).physical : null } : null;
    }

    draw(c: CanvasRenderingContext2D, w: PuzzleWorld, evidence: NativeWorldEvidence, view: Box, zoom: number, dt: number, animate: boolean, cargoGrouped = false): NativeWorldPanel[] {
        this.panels = [];
        const data = evidence.data, state = evidence.state;
        if (!data || !state || data.chamber_id !== w.room.id) return this.panels;
        const key = `${state.chamber}:${state.levelInstance}`;
        if (key !== this.key) { this.key = key; this.changes.clear(); }
        if (animate) this.time += Math.max(0, Math.min(dt, .1));
        const compactBounds: Box[] = [];
        for (const place of WORLD_ASSEMBLY_PLACEMENTS[data.chamber_id] ?? []) {
            if (cargoGrouped && data.chamber_id === 'race-condition' && ['topBridge', 'bufferBridge', 'safetyFirewall', 'raceFirewall'].includes(place.output)) continue;
            const mapped = nativeWorldPlacementBinding(data, place, w.room);
            if (!mapped) continue; // malformed/missing evidence never substitutes invented text
            const { output, binding } = mapped, excerpt = output.excerpt;
            const accepted = nativeWorldBindingState(state, output, binding);
            // A wire-only native signal has no physical binding or collision state.
            const physical = binding ? accepted.physical : null;
            const status = binding ? accepted.statusLabel : `RAW ${accepted.raw === null ? '?' : Number(accepted.raw)} · SIGNAL ${accepted.raw === null ? '?' : accepted.raw ? 'ON' : 'OFF'}`;
            const expanded = zoom >= .8;
            const scale = expanded ? 1 : 1 / zoom;
            const instructions = excerpt.instructions;
            const width = expanded ? Math.max(320, ...instructions.map(i => `${i.mnemonic} ${i.op_str}`.length * 6.8 + 30)) * scale : (output.name.length * 6.1 + 28) * scale;
            const height = (expanded ? 68 + instructions.length * 16 : 23) * scale;
            const { x, y } = place;
            const bounds = { x, y, w: width, h: height };
            if (!intersects(bounds, view)) continue;
            if (!expanded && compactBounds.some(other => intersects(bounds, other))) continue;
            if (!expanded) compactBounds.push(bounds);
            const signature = `${accepted.raw}:${physical}`;
            const previous = this.changes.get(output.name);
            if (!previous || previous.value !== signature) this.changes.set(output.name, { value: signature, at: previous ? this.time : -1 });
            const changed = this.changes.get(output.name)!;
            const pulse = animate && state.connected && changed.at >= 0 ? Math.max(0, 1 - (this.time - changed.at) / .35) : 0;
            const powered = binding ? physical : accepted.raw;
            const colour = state.connected && powered ? cyan : muted;
            c.save();
            c.fillStyle = '#0b1923f2'; c.fillRect(x, y, width, height);
            c.strokeStyle = pulse > 0 ? '#b8fff0' : powered && state.connected ? '#416d70' : '#344958';
            c.lineWidth = 1 / zoom; c.strokeRect(x, y, width, height);
            c.fillStyle = colour; c.fillRect(x, y, 2 * scale, height);
            if (!expanded) {
                text(c, output.name, x + 10 * scale, y + 15 * scale, 10 * scale, colour);
            } else {
                text(c, output.name, x + 12 * scale, y + 17 * scale, 12 * scale, colour);
                text(c, hex(excerpt.store_address), x + 12 * scale, y + 33 * scale, 10 * scale, muted);
                text(c, 'STATIC / WRITE 1', x + width - 111 * scale, y + 33 * scale, 10 * scale, muted);
                instructions.forEach((instruction, n) => {
                    const yy = y + (53 + n * 16) * scale;
                    const isStore = instruction.address === excerpt.store_address;
                    if (isStore) {
                        // Fixed annotation identifies a verified store site, never an executing instruction.
                        c.fillStyle = '#203440'; c.fillRect(x + 7 * scale, yy - 12 * scale, width - 14 * scale, 16 * scale);
                        c.fillStyle = '#8bacbf'; c.fillRect(x + 7 * scale, yy - 12 * scale, 2 * scale, 16 * scale);
                    }
                    text(c, `${instruction.mnemonic} ${instruction.op_str}`.trim(), x + 15 * scale, yy, 12 * scale, isStore ? '#e0eaf3' : ink);
                });
                text(c, `${status}${state.connected ? '' : ' · LAST KNOWN'}`, x + 12 * scale, y + height - 10 * scale, 10 * scale, colour);
            }
            c.restore();
            this.panels.push({ objectId: binding?.target ?? place.target, output: output.name, address: excerpt.store_address, storeAddress: excerpt.store_address,
                raw: accepted.raw, physical, expanded, static: true, bounds, instructions: expanded ? instructions : [] });
        }
        return this.panels;
    }
}
