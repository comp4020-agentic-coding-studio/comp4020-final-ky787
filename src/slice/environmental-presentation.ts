/** Accepted-state decoration only. No controller evaluation or local grace prediction. */
import { nativeWorldBindingState } from '../coop/native-world-evidence.ts';
import type { EnvironmentalAccepted } from '../coop/environmental-evidence.ts';
import type { EnvironmentalArtifact, EnvironmentalSection } from '../coop/environmental-types.ts';
import { ENVIRONMENTAL_BLOCKS, type EnvironmentalBlock } from './environmental-layout.ts';
import { revealMessage } from './presentation.ts';

export function selectedEnvironmentalStore(data: EnvironmentalArtifact, output: string, raw: boolean | null) {
    if (raw === null) return null;
    const section = data.sections.find(s => s.name === output);
    return data.fragments.find(f => f.id === section?.stores[raw ? '1' : '0']) ?? null;
}
export function environmentalState(state: EnvironmentalAccepted, section: EnvironmentalSection) {
    const binding = section.bindings.find(b => b.target === section.target);
    const accepted = nativeWorldBindingState(state, section, binding);
    return { raw: accepted.raw, physical: binding ? accepted.physical : null,
        powered: binding ? accepted.physical : accepted.raw, grace: accepted.grace,
        inverted: accepted.inverted, latched: accepted.latched };
}
export function environmentalMessage(place: EnvironmentalBlock, powered: boolean | null, connected: boolean): string {
    return `${place.label} ${!connected ? 'OFFLINE' : powered === null ? 'UNKNOWN' : powered ? place.on : place.off}`;
}
export type EnvironmentalDisplayState = ReturnType<typeof environmentalState> & { message: string; revealed: string; pulse: number };

/** Same .4s authored reveal and .45s store accent as RACE; updates even when culled. */
export class EnvironmentalPresentation {
    private key = '';
    private moving = false;
    private time = 0;
    private previous = new Map<string, EnvironmentalDisplayState>();
    private messageAt = new Map<string, number>();
    private pulseAt = new Map<string, number>();
    update(state: EnvironmentalAccepted | null, data: EnvironmentalArtifact | null, dt: number, animate: boolean): Map<string, EnvironmentalDisplayState> {
        const valid = !!state && !!data && state.chamber === data.chamber_id;
        const moving = valid && state.connected && animate;
        const baseline = !state || this.key !== state.key || !this.moving || !moving;
        if (baseline) { this.previous.clear(); this.messageAt.clear(); this.pulseAt.clear(); }
        this.key = state?.key ?? ''; this.moving = moving;
        if (moving) this.time += Math.max(0, Math.min(dt, .1));
        const result = new Map<string, EnvironmentalDisplayState>();
        if (!valid) return result;
        for (const place of ENVIRONMENTAL_BLOCKS[data.chamber_id]) {
            const section = data.sections.find(s => s.name === place.output)!;
            const accepted = environmentalState(state, section);
            const known = accepted.raw !== null && accepted.powered !== null;
            const message = environmentalMessage(place, known ? accepted.powered : null, state.connected);
            const old = this.previous.get(place.output);
            if (moving && known && old && old.raw !== null && old.powered !== null) {
                if (old.message !== message) this.messageAt.set(place.output, this.time);
                if (old.raw !== accepted.raw || old.powered !== accepted.powered) this.pulseAt.set(place.output, this.time);
            }
            if (!known) { this.messageAt.delete(place.output); this.pulseAt.delete(place.output); }
            const at = this.messageAt.get(place.output), pulseAt = this.pulseAt.get(place.output);
            result.set(place.output, { ...accepted, message,
                revealed: revealMessage({ text: message, label: '', active: true }, at === undefined ? 1 : Math.min(1, (this.time - at) / .4)),
                pulse: pulseAt === undefined ? 0 : Math.max(0, 1 - (this.time - pulseAt) / .45) });
        }
        this.previous = result;
        return result;
    }
}
