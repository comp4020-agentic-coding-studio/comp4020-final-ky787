import type { Box } from '../engine/geometry.ts';
import type { EnvironmentalEvidence } from '../coop/environmental-evidence.ts';
import { isEnvironmentalChamber, type EnvironmentalFragment } from '../coop/environmental-types.ts';
import { ENVIRONMENTAL_BLOCKS } from './environmental-layout.ts';
import { EnvironmentalPresentation, selectedEnvironmentalStore } from './environmental-presentation.ts';

const dim = '#627985', code = '#8398a6', green = '#77ba9e', red = '#ca817e';
const intersects = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
type Part = { id: string; block: string; omittedBefore: string; instructions: EnvironmentalFragment['instructions']; firstLineY: number };

/** One small renderer, explicit authored room arrangements. The camera owns all scaling. */
export class EnvironmentalRenderer {
    private presentation = new EnvironmentalPresentation();
    diagnostic = this.empty();
    private empty() { return { mode: 'STATE-LINKED', detail: 'environmental', availability: 'idle', chamber: null as string | null,
        lastKnown: false, codeFontSize: 12,
        sections: [] as { output: string; target: string; group: string; raw: boolean | null; physical: boolean | null; powered: boolean | null;
            grace: boolean; inverted: boolean; latched: boolean; bounds: Box; visible: boolean; colour: string; pulse: number;
            message: string; revealed: string; storeId: string | null; storeRva: number | null; fragments: Part[] }[] }; }
    draw(c: CanvasRenderingContext2D, evidence: EnvironmentalEvidence, room: string, view: Box, dt: number, animate: boolean): void {
        const state = isEnvironmentalChamber(room) && evidence.state?.chamber === room ? evidence.state : null;
        const data = evidence.status === 'ready' && evidence.data?.chamber_id === state?.chamber ? evidence.data : null;
        const model = this.presentation.update(state, data, dt, animate);
        this.diagnostic = this.empty(); this.diagnostic.availability = evidence.status;
        if (!state || !isEnvironmentalChamber(room)) return;
        this.diagnostic.chamber = room; this.diagnostic.lastKnown = !state.connected;
        for (const place of ENVIRONMENTAL_BLOCKS[room]) {
            const section = data?.sections.find(s => s.name === place.output), value = model.get(place.output);
            const selected = data && value ? selectedEnvironmentalStore(data, place.output, value.raw) : null;
            const known = !!value && value.raw !== null && value.powered !== null && state.connected;
            const colour = known ? (place.hazard ? !value.powered : value.powered) ? green : red : dim;
            const fragments: Part[] = [];
            const part = (f: EnvironmentalFragment, instructions: EnvironmentalFragment['instructions'], y: number) => {
                fragments.push({ id: f.id, block: f.block_id, omittedBefore: 'omitted code; not a CFG edge', instructions, firstLineY: y });
            };
            if (section && data && place.excerpt !== 'store') {
                const f = data.fragments.find(f => f.id === section.context[place.excerpt === 'branch' ? 1 : 0])!;
                part(f, place.excerpt === 'compare' ? f.instructions.slice(0, 1) : f.instructions, 20);
            }
            if (selected) {
                const short = place.excerpt === 'branch' || place.excerpt === 'boolean';
                part(selected, short ? selected.instructions.slice(-1) : selected.instructions, short ? 76 : 44);
            }
            const bounds = { x: place.x, y: place.y, w: place.w, h: place.h }, visible = intersects(bounds, view);
            const message = value?.message ?? 'ASSEMBLY UNAVAILABLE', revealed = value?.revealed ?? message, pulse = value?.pulse ?? 0;
            this.diagnostic.sections.push({ output: place.output, target: place.target, group: place.group, bounds, visible, colour, pulse, message, revealed,
                raw: value?.raw ?? null, physical: value?.physical ?? null, powered: value?.powered ?? null, grace: value?.grace ?? false,
                inverted: value?.inverted ?? false, latched: value?.latched ?? false,
                storeId: selected?.id ?? null, storeRva: selected?.store?.rva ?? null, fragments });
            if (!visible) continue;
            c.save(); c.fillStyle = '#0b172099'; c.fillRect(place.x, place.y, place.w, place.h);
            c.fillStyle = '#2a3e48'; c.fillRect(place.x, place.y, 1, place.h);
            const text = (t: string, y: number, colour: string) => {
                c.font = '12px ui-monospace, monospace'; c.fillStyle = colour; c.fillText(t, place.x + 12, place.y + y);
            };
            for (const [n, fragment] of fragments.entries()) {
                if (n) text('...', fragment.firstLineY - 12, dim);
                for (const [line, i] of fragment.instructions.entries()) {
                    const y = fragment.firstLineY + line * 16, isStore = i.rva === selected?.store?.rva;
                    if (isStore) {
                        c.save(); c.globalAlpha = .06 + pulse * .12; c.fillStyle = colour;
                        c.fillRect(place.x + 7, place.y + y - 11, place.w - 14, 16); c.restore();
                    }
                    text(`${i.mnemonic} ${i.op_str}`, y, isStore ? colour : state.connected ? code : dim);
                }
            }
            text(`"${revealed}"`, 108, known ? '#b8b2a1' : dim); c.restore();
        }
    }
}
