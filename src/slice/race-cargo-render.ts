import type { Box } from '../engine/geometry.ts';
import type { RaceCargoEvidence } from '../coop/race-cargo-evidence.ts';
import type { CargoFragment, CargoOutput } from '../coop/race-cargo-types.ts';
import { CargoPresentation, cargoSectionState, selectedCargoStore } from './race-cargo-presentation.ts';

const dim = '#627985', code = '#8398a6', green = '#77ba9e', red = '#ca817e';
const intersects = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
/** Authored decoration below the span firewall, above the lower control wires. */
export const CARGO_BLOCKS = [
    { output: 'topBridge', x: 800, y: 960, w: 328, h: 124 },
    { output: 'bufferBridge', x: 1152, y: 960, w: 328, h: 124 },
    { output: 'safetyFirewall', x: 1504, y: 960, w: 328, h: 124 },
    { output: 'raceFirewall', x: 1856, y: 960, w: 328, h: 124 },
] as const;
export const CARGO_CODE_SIZE = 12;
const bounds: Box = { x: 800, y: 960, w: 1384, h: 124 };
type DisplayFragment = { id: string; block: string; omittedBefore: string; instructions: CargoFragment['instructions']; firstLineY: number };

export class RaceCargoRenderer {
    readonly presentation = new CargoPresentation();
    view: ReturnType<CargoPresentation['update']> = null;
    diagnostic: ReturnType<RaceCargoRenderer['empty']> = this.empty();
    private empty() { return { mode: 'STATE-LINKED', availability: 'idle', visible: false, detail: 'environmental', bounds: null as Box | null,
        codeFontSize: CARGO_CODE_SIZE, accepted: null as null | { dropA: boolean | null; dropB: boolean | null; outputs: Record<CargoOutput, boolean | null>; revision: number },
        phase: null as string | null, status: '', lastKnown: false, timer: null as NonNullable<ReturnType<CargoPresentation['update']>>['timer'] | null,
        phasePulse: 0, sections: [] as { output: CargoOutput; target: string; raw: boolean | null; state: string; storeId: string | null; storeRva: number | null; pulse: number;
            bounds: Box; visible: boolean; colour: string; message: string; revealed: string; fragments: DisplayFragment[] }[] }; }

    /** The existing camera transform owns all scaling. View bounds are used only for culling. */
    draw(c: CanvasRenderingContext2D, evidence: RaceCargoEvidence, room: string, visible: Box, dt: number, animate: boolean, running: boolean, now: number): void {
        const s = room === 'race-condition' ? evidence.state : null;
        const model = this.presentation.update(s, now, dt, animate, running); this.view = model;
        this.diagnostic = this.empty(); this.diagnostic.availability = evidence.status;
        if (!s || !model) return;
        Object.assign(this.diagnostic, { accepted: { dropA: s.dropA, dropB: s.dropB, outputs: s.outputs, revision: s.revision }, phase: s.phase,
            status: model.feedback.title, lastKnown: model.lastKnown, timer: model.timer, phasePulse: model.phasePulse, bounds: { ...bounds } });
        const data = evidence.status === 'ready' ? evidence.data : null;
        for (const place of CARGO_BLOCKS) {
            const section = data?.sections.find(s => s.output === place.output);
            const raw = s.outputs[place.output], selected = data ? selectedCargoStore(data, place.output, raw) : null;
            const known = raw !== null && (place.output !== 'bufferBridge' || s.phase !== null);
            const colour = model.lastKnown || !known || !data ? dim : place.output.endsWith('Bridge') ? raw ? green : red : raw ? red : green;
            const fragments: DisplayFragment[] = [];
            // A comparison adds context to upper support; safety shows the saved-Boolean branch.
            // These remain separate catalogue excerpts, never a new block or an execution path.
            if (section && data && (place.output === 'topBridge' || place.output === 'safetyFirewall')) {
                const f = data.fragments.find(f => f.id === section.condition_fragments[place.output === 'topBridge' ? 0 : 1])!;
                fragments.push({ id: f.id, block: f.source_block_id, omittedBefore: 'omitted preceding context',
                    instructions: place.output === 'topBridge' ? f.instructions.filter(i => i.mnemonic === 'cmp') : f.instructions, firstLineY: 20 });
            }
            if (selected) fragments.push({ id: selected.id, block: selected.source_block_id, omittedBefore: 'omitted intervening code; not a CFG edge',
                instructions: place.output === 'safetyFirewall' ? selected.instructions.slice(-1) : selected.instructions,
                firstLineY: place.output === 'safetyFirewall' ? 76 : 44 });
            const message = data ? model.messages[place.output] : { text: 'ASSEMBLY UNAVAILABLE', revealed: 'ASSEMBLY UNAVAILABLE' };
            const blockBounds = { x: place.x, y: place.y, w: place.w, h: place.h };
            const shown = intersects(blockBounds, visible);
            const diag = { output: place.output, target: section?.machinery ?? '', raw, state: cargoSectionState(place.output, raw),
                storeId: selected?.id ?? null, storeRva: selected?.verified_output_store?.instruction_rva ?? null, pulse: model.pulses[place.output],
                bounds: blockBounds, visible: shown, colour, message: message.text, revealed: message.revealed, fragments };
            this.diagnostic.sections.push(diag);
            if (!shown) continue;
            this.diagnostic.visible = true;
            c.save();
            c.fillStyle = '#0b172099'; c.fillRect(place.x, place.y, place.w, place.h);
            c.fillStyle = '#2a3e48'; c.fillRect(place.x, place.y, 1, place.h);
            const text = (t: string, y: number, colour: string) => {
                c.font = `${CARGO_CODE_SIZE}px ui-monospace, monospace`; c.fillStyle = colour; c.fillText(t, place.x + 12, place.y + y);
            };
            for (const [n, part] of fragments.entries()) {
                if (n) text('...', part.firstLineY - 12, dim);
                for (const [line, ins] of part.instructions.entries()) {
                    const y = part.firstLineY + line * 16, isStore = ins.rva === selected?.verified_output_store?.instruction_rva;
                    if (isStore) {
                        c.save(); c.globalAlpha = .06 + diag.pulse * .12; c.fillStyle = colour;
                        c.fillRect(place.x + 7, place.y + y - 11, place.w - 14, 16); c.restore();
                    }
                    text(`${ins.mnemonic} ${ins.op_str}`, y, isStore ? colour : model.lastKnown ? dim : code);
                }
            }
            text(`"${message.revealed}"`, 108, model.lastKnown || !known || !data ? dim : '#b8b2a1');
            c.restore();
        }
    }
}
