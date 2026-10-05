import { uplinkEvidence } from './validated-controller.ts';
import { evidenceDetails, provenCrumbleId, type TracePlayback } from './evidence-presentation.ts';
/** Optional paused inspector; never writes to world/controller state. */
export class EvidenceInspector {
    readonly element = document.querySelector<HTMLElement>('#evidence')!;
    readonly select = this.element.querySelector<HTMLSelectElement>('select')!;
    private last = '';
    constructor(onClose: () => void, onReveal: (show: boolean) => void) {
        for (const b of uplinkEvidence.machine_bindings) this.select.add(new Option(b.id, b.id));
        this.select.add(new Option('Optional unstable region / proof', provenCrumbleId));
        this.element.querySelector('button')!.addEventListener('click', onClose);
        this.element.querySelector('input')!.addEventListener('change', e => onReveal((e.target as HTMLInputElement).checked));
    }
    update(replay: TracePlayback): void {
        const trace = replay.trace;
        if (this.element.hidden || !trace) return;
        const key = `${this.select.value}:${trace.id}`;
        if (key === this.last) return;
        this.last = key;
        this.element.querySelector('pre')!.textContent = evidenceDetails(this.select.value, trace);
    }
}
