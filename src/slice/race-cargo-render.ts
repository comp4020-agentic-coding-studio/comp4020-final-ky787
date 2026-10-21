import type { Box } from '../engine/geometry.ts';
import type { RaceCargoEvidence } from '../coop/race-cargo-evidence.ts';
import type { CargoFragment, CargoOutput } from '../coop/race-cargo-types.ts';
import { CargoPresentation, CARGO_LABELS, cargoSectionState, selectedCargoStore } from './race-cargo-presentation.ts';

const ink = '#d6e5ef', dim = '#95acbd', cyan = '#64e6d5', amber = '#f9ba68', red = '#fa817e';
const rva = (n: number) => n.toString(16).toUpperCase().padStart(4, '0');
const intersects = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export class RaceCargoRenderer {
    readonly presentation = new CargoPresentation();
    view: ReturnType<CargoPresentation['update']> = null;
    diagnostic: ReturnType<RaceCargoRenderer['empty']> = this.empty();
    private empty() { return { mode: 'STATE-LINKED', availability: 'idle', visible: false, detail: 'compact', bounds: null as Box | null,
        minCodePixels: 0, accepted: null as null | { dropA: boolean | null; dropB: boolean | null; outputs: Record<CargoOutput, boolean | null>; revision: number },
        phase: null as string | null, status: '', lastKnown: false, timer: null as NonNullable<ReturnType<CargoPresentation['update']>>['timer'] | null,
        phasePulse: 0, sections: [] as { output: CargoOutput; target: string; raw: boolean | null; state: string; storeId: string | null; storeRva: number | null; pulse: number;
            fragments: { id: string; block: string; omittedBefore: string; instructions: CargoFragment['instructions'] }[] }[] }; }
    draw(c: CanvasRenderingContext2D, evidence: RaceCargoEvidence, room: string, visible: Box, zoom: number, dt: number, animate: boolean, running: boolean, overview: boolean, now: number, cargoOperator = false): void {
        const s = room === 'race-condition' ? evidence.state : null;
        const model = this.presentation.update(s, now, dt, animate, running); this.view = model;
        this.diagnostic = this.empty(); this.diagnostic.availability = evidence.status;
        if (!s || !model) return;
        Object.assign(this.diagnostic, { accepted: { dropA: s.dropA, dropB: s.dropB, outputs: s.outputs, revision: s.revision }, phase: s.phase,
            status: model.feedback.title, lastKnown: model.lastKnown, timer: model.timer, phasePulse: model.phasePulse });
        // Only the cargo neighbourhood owns this surface. Ordinary operator reveals include it.
        if (!intersects(visible, { x: 90, y: 420, w: 700, h: 652 })) return;
        const scale = 1 / zoom;
        const operatorLayout = cargoOperator || zoom < 1.04;
        const wideX = Math.max(350, visible.x + 12 * scale);
        const fits = operatorLayout ? wideX + 1212 * scale <= visible.x + visible.w : 740 + 712 * scale <= visible.x + visible.w;
        const compact = overview || visible.w * zoom < 1400 || zoom < .55 || !fits;
        const wide = !compact && operatorLayout;
        const width = compact ? 370 : wide ? 1200 : 700, height = compact ? 160 : wide ? 223 : 349;
        const x = compact ? Math.min(740, visible.x + visible.w - (width + 12) * scale) : wide ? wideX : 740;
        const y = compact ? Math.max(400, visible.y + 22 * scale) : wide ? Math.max(400, visible.y + 22 * scale) : 904;
        const bounds = { x, y, w: width * scale, h: height * scale };
        if (!intersects(bounds, visible)) return;
        this.diagnostic.visible = true; this.diagnostic.bounds = bounds; this.diagnostic.detail = compact ? 'compact' : 'assembly';
        c.save(); c.translate(x, y); c.scale(scale, scale);
        c.fillStyle = '#0b1923f5'; c.fillRect(0, 0, width, height);
        c.strokeStyle = '#476374'; c.lineWidth = 1; c.strokeRect(.5, .5, width - 1, height - 1);
        const text = (t: string, xx: number, yy: number, size = 11, colour = dim) => { c.font = `${size}px ui-monospace, monospace`; c.fillStyle = colour; c.fillText(t, xx, yy); };
        text('CARGO TRANSFER CONTROLLER', 12, 21, 15, ink);
        if (!compact) text('RVA / x64', wide ? 600 : 470, 20, 10);
        if (!compact) text('STATE-LINKED', wide ? 450 : width - 102, 20, 11, cyan);
        const bit = (v: boolean | null) => v === null ? '?' : Number(v);
        if (model.phasePulse > 0) { c.fillStyle = cyan; c.fillRect(12, 44, 300 * model.phasePulse, 1); }
        const timerText = s.phase === 'window' && model.timer.seconds !== null ? ` ${model.timer.seconds.toFixed(1)}s${model.timerLive ? '' : ' · HELD'}` : '';
        text(`ACCEPTED A ${bit(s.dropA)}  B ${bit(s.dropB)}  |  ${(s.phase ?? 'UNKNOWN').toUpperCase()}${timerText}${model.lastKnown ? ' · LAST KNOWN' : ''}`, 12, 40, 11, model.lastKnown ? amber : ink);
        if (evidence.status !== 'ready' || !evidence.data) {
            text(`ASSEMBLY ${evidence.status === 'loading' ? 'LOADING' : 'UNAVAILABLE'}`, 12, 66, 12, amber);
            text('Accepted machinery continues independently.', 12, 85, 11);
            c.restore(); return;
        }
        const data = evidence.data;
        for (const [n, section] of data.sections.entries()) {
            const raw = s.outputs[section.output], selected = selectedCargoStore(data, section.output, raw);
            const state = cargoSectionState(section.output, raw);
            const colour = model.lastKnown || raw === null ? dim : section.output.endsWith('Bridge') ? raw ? cyan : amber : raw ? red : cyan;
            const diag = { output: section.output, target: section.machinery, raw, state, storeId: selected?.id ?? null,
                storeRva: selected?.verified_output_store?.instruction_rva ?? null, pulse: model.pulses[section.output], fragments: [] as typeof this.diagnostic.sections[number]['fragments'] };
            this.diagnostic.sections.push(diag);
            if (compact) { text(`${CARGO_LABELS[n].padEnd(18)} ${state}`, 12, 61 + n * 17, 11, colour); continue; }
            const cellWidth = wide ? 294 : 344;
            const sx = 12 + (wide ? n : n % 2) * cellWidth, sy = 54 + (wide ? 0 : Math.floor(n / 2)) * 126;
            c.fillStyle = '#10212d'; c.fillRect(sx, sy - 6, cellWidth - 12, 122);
            c.fillStyle = diag.pulse > 0 ? ink : colour; c.fillRect(sx, sy - 6, 2 + diag.pulse * 2, 122);
            text(CARGO_LABELS[n], sx + 10, sy + 8, 12, ink);
            text(`${state} · RAW ${bit(raw)}`, sx + 10, sy + 23, 11, colour);
            const read = data.fragments.find(f => f.id === section.condition_fragments[0])!;
            const branch = data.fragments.find(f => f.id === section.condition_fragments[1])!;
            const fragments = [
                { f: read, instructions: read.instructions.filter(i => i.mnemonic === 'cmp'), label: `… ptr omitted · ${n === 1 || n === 2 ? 'B' : 'A'} · ${read.source_block_id}`, yy: sy + 34 },
                { f: branch, instructions: branch.instructions, label: `… save/BCF omitted · ${branch.source_block_id}`, yy: sy + 58 },
                { f: selected, instructions: selected?.instructions.slice(-1) ?? [], label: selected ? `… code/setup omitted · ${selected.source_block_id}` : '… output store UNKNOWN', yy: sy + 102 },
            ];
            for (const part of fragments) {
                text(part.label, sx + 10, part.yy, 9, dim);
                if (!part.f) continue;
                diag.fragments.push({ id: part.f.id, block: part.f.source_block_id, omittedBefore: part.label, instructions: part.instructions });
                for (const [i, ins] of part.instructions.entries()) {
                    const yy = part.yy + 11 * (i + 1);
                    if (part.f === selected) { c.fillStyle = '#203942'; c.fillRect(sx + 7, yy - 10, cellWidth - 26, 12); }
                    text(rva(ins.rva), sx + 10, yy, 11, dim);
                    text(`${ins.mnemonic} ${ins.op_str}`, sx + 49, yy, 11, part.f === selected ? colour : ink);
                }
            }
        }
        if (compact) {
            text('STATE-LINKED · Evidence for assembly / both stores', 12, 137, 10, cyan);
            text('Authored status; no instruction replay', 12, 151, 9);
        } else {
            this.diagnostic.minCodePixels = 11;
            const footerX = wide ? 312 : 12;
            text(model.revealed, footerX, height - 35, 12, s.phase === 'expired' || s.outputs.raceFirewall ? red : cyan);
            text(model.feedback.detail, footerX, height - 20, 11, ink);
            text('STATIC · BCF clobbers AL/flags; reload + TEST restores the check · Evidence: all checks & stores', footerX, height - 6, wide ? 10 : 9);
        }
        c.restore();
    }
}
