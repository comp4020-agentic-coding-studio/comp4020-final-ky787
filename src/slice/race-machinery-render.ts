import type { Box } from '../engine/geometry.ts';
import type { RaceMachineryEvidence } from '../coop/race-machinery-evidence.ts';
import type { MachineryFragment, RaceMachineryOutput } from '../coop/race-machinery-types.ts';
import { MachineryPresentation, selectedMachineryStore } from './race-machinery-presentation.ts';

/** Fixed near the original machinery; EXIT sits above Cube B's resting/carry route. */
export const RACE_MACHINERY_BLOCKS = [
    { output: 'spanMaster', x: 740, y: 540, w: 328, h: 124 },
    { output: 'phaseA', x: 900, y: 390, w: 328, h: 124 },
    { output: 'phaseB', x: 1420, y: 400, w: 328, h: 124 },
    { output: 'returnBridge', x: 2520, y: 760, w: 328, h: 124 },
    { output: 'exitDoor', x: 3500, y: 530, w: 328, h: 124 },
] as const;
const dim = '#627985', code = '#8398a6', green = '#77ba9e', red = '#ca817e';
const intersects = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
type Part = { id: string; block: string; omittedBefore: string; instructions: MachineryFragment['instructions']; firstLineY: number };
export class RaceMachineryRenderer {
    private presentation = new MachineryPresentation();
    diagnostic = this.empty();
    private empty() { return { mode: 'STATE-LINKED', detail: 'environmental', availability: 'idle', lastKnown: false, codeFontSize: 12,
        sections: [] as { output: RaceMachineryOutput; target: string; raw: boolean | null; physical: boolean | null; powered: boolean | null; grace: boolean;
            bounds: Box; visible: boolean; colour: string; pulse: number; message: string; revealed: string;
            storeId: string | null; storeRva: number | null; fragments: Part[] }[] }; }
    draw(c: CanvasRenderingContext2D, evidence: RaceMachineryEvidence, room: string, view: Box, dt: number, animate: boolean): void {
        const s = room === 'race-condition' ? evidence.state : null;
        const data = evidence.status === 'ready' ? evidence.data : null;
        const model = this.presentation.update(s, data, dt, animate);
        this.diagnostic = this.empty(); this.diagnostic.availability = evidence.status;
        if (!s) return;
        this.diagnostic.lastKnown = !s.connected;
        for (const place of RACE_MACHINERY_BLOCKS) {
            const section = data?.sections.find(v => v.name === place.output), state = model.get(place.output);
            const selected = data && state ? selectedMachineryStore(data, place.output, state.raw) : null;
            const known = !!state && state.raw !== null && state.powered !== null && s.connected;
            const colour = known ? state.powered ? green : red : dim;
            const fragments: Part[] = [];
            const part = (f: MachineryFragment, instructions: MachineryFragment['instructions'], y: number) => {
                fragments.push({ id: f.id, block: f.block_id, omittedBefore: 'omitted code; not a CFG edge', instructions, firstLineY: y });
            };
            if (section && data && place.output !== 'exitDoor') {
                const f = data.fragments.find(f => f.id === section.context[place.output === 'phaseA' ? 1 : 0])!;
                const ins = place.output === 'spanMaster' ? f.instructions.slice(1, 2)
                    : place.output === 'phaseB' ? f.instructions.slice(2, 4)
                    : place.output === 'returnBridge' ? f.instructions.slice(2) : f.instructions;
                part(f, ins, place.output === 'phaseB' ? 12 : 20);
            }
            if (selected) {
                const short = place.output === 'phaseA' || place.output === 'returnBridge';
                part(selected, short ? selected.instructions.slice(-1) : selected.instructions, short ? 76 : place.output === 'phaseB' ? 52 : 44);
            }
            const bounds = { x: place.x, y: place.y, w: place.w, h: place.h }, visible = intersects(bounds, view);
            const message = state?.message ?? 'ASSEMBLY UNAVAILABLE', revealed = state?.revealed ?? message, pulse = state?.pulse ?? 0;
            this.diagnostic.sections.push({ output: place.output, target: section?.target ?? '', bounds, visible, colour, message, revealed, pulse,
                raw: state?.raw ?? null, physical: state?.physical ?? null, powered: state?.powered ?? null, grace: state?.grace ?? false,
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
                    text(`${i.mnemonic} ${i.op_str}`, y, isStore ? colour : s.connected ? code : dim);
                }
            }
            text(`"${revealed}"`, 108, known ? '#b8b2a1' : dim); c.restore();
        }
    }
}
