/** Authored explanations and transitions; never a second gameplay controller. */
import { cargoBufferDisplay, type CargoAccepted } from '../coop/race-cargo-evidence.ts';
import { CARGO_OUTPUTS, type CargoArtifact, type CargoOutput } from '../coop/race-cargo-types.ts';
import { revealMessage } from './presentation.ts';

export const CARGO_LABELS = ['UPPER SUPPORT', 'BUFFER SUPPORT', 'SAFETY INTERLOCK', 'OVERLAP INTERLOCK'];
export function cargoFeedback(s: CargoAccepted): { title: string; detail: string } {
    const o = s.outputs;
    if (s.phase === null || s.dropA === null || s.dropB === null || CARGO_OUTPUTS.some(k => o[k] === null))
        return { title: 'STATE UNKNOWN', detail: 'Waiting for complete accepted cargo state.' };
    if (s.phase === 'expired') return { title: 'BUFFER WINDOW EXPIRED', detail: o.raceFirewall ? 'Deadline passed; overlap interlock is also active.' : 'The server deadline passed. Wait for cargo reset.' };
    if (o.raceFirewall) return { title: 'INTERLOCK ACTIVE', detail: 'Both controls are held. Release A to clear overlap.' };
    if (s.phase === 'released' && !s.dropA && s.dropB && !o.bufferBridge && !o.safetyFirewall && !o.raceFirewall)
        return { title: 'TRANSFER CLEAR', detail: 'Chute interlocks are clear; delivery is not yet implied.' };
    if (s.phase === 'window' && o.bufferBridge) return { title: 'BUFFER HOLDING', detail: 'Release A, then hold B before the server deadline.' };
    if (!o.topBridge) return { title: 'UPPER SUPPORT RELEASED', detail: 'Upper support is off; this does not confirm cube motion.' };
    if (s.phase === 'released') return { title: 'BUFFER RELEASED', detail: 'Releasing B restores safety; it does not recatch cargo.' };
    if (!o.bufferBridge) return { title: 'LOWER SUPPORT RELEASED', detail: 'Idle with B held is not ready. Release B to rearm.' };
    return { title: 'CARGO SUPPORTS READY', detail: 'Hold A to release upper support; coordinate with B.' };
}
export function cargoSectionState(output: CargoOutput, raw: boolean | null): string {
    return raw === null ? 'UNKNOWN' : output.endsWith('Bridge') ? raw ? 'SOLID' : 'RELEASED' : raw ? 'ACTIVE' : 'CLEAR';
}
export function selectedCargoStore(data: CargoArtifact, output: CargoOutput, raw: boolean | null) {
    const section = data.sections.find(s => s.output === output);
    return raw === null || !section ? null : data.fragments.find(f => f.id === section.store_alternatives[raw ? '1' : '0']) ?? null;
}

export class CargoPresentation {
    private previous: CargoAccepted | null = null;
    private moving = false;
    private time = 0;
    private messageAt = -Infinity;
    private phaseAt = -Infinity;
    private outputAt = new Map<CargoOutput, number>();
    private timer: ReturnType<typeof cargoBufferDisplay> | null = null;
    update(s: CargoAccepted | null, now: number, dt: number, animate: boolean, running: boolean) {
        if (!s) { this.previous = null; this.timer = null; this.outputAt.clear(); return null; }
        const motion = animate && s.connected;
        const baseline = !this.previous || this.previous.key !== s.key || !this.previous.connected || !s.connected || !this.moving || !motion;
        this.time += motion ? Math.max(0, Math.min(dt, .1)) : 0;
        const feedback = cargoFeedback(s);
        if (baseline) { this.outputAt.clear(); this.messageAt = -Infinity; this.phaseAt = -Infinity; }
        else {
            for (const o of CARGO_OUTPUTS) if (this.previous!.outputs[o] !== null && s.outputs[o] !== null && this.previous!.outputs[o] !== s.outputs[o]) this.outputAt.set(o, this.time);
            if (this.previous!.phase !== s.phase) this.phaseAt = this.time;
            if (cargoFeedback(this.previous!).title !== feedback.title) this.messageAt = this.time;
        }
        // Freeze stale/paused display; resuming uses the original receipt, never a new deadline.
        if (!this.timer || this.previous?.key !== s.key || this.previous?.phase !== s.phase || running && s.connected)
            this.timer = cargoBufferDisplay(s, now);
        this.previous = s; this.moving = motion;
        const pulse = (at: number) => motion ? Math.max(0, 1 - (this.time - at) / .45) : 0;
        const fraction = motion ? Math.min(1, (this.time - this.messageAt) / .18) : 1;
        return { feedback, revealed: revealMessage({ active: true, text: feedback.title, label: 'authored UI' }, fraction),
            phasePulse: pulse(this.phaseAt), pulses: Object.fromEntries(CARGO_OUTPUTS.map(o => [o, pulse(this.outputAt.get(o) ?? -Infinity)])) as Record<CargoOutput, number>,
            timer: this.timer, timerLive: running && s.connected, lastKnown: !s.connected };
    }
}
