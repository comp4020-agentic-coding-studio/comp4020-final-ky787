import { nativeWorldBindingState } from '../coop/native-world-evidence.ts';
import type { MachineryAccepted } from '../coop/race-machinery-evidence.ts';
import { RACE_MACHINERY_OUTPUTS, type MachinerySection, type RaceMachineryArtifact, type RaceMachineryOutput } from '../coop/race-machinery-types.ts';
import { revealMessage } from './presentation.ts';

export function selectedMachineryStore(data: RaceMachineryArtifact, output: RaceMachineryOutput, raw: boolean | null) {
    if (raw === null) return null;
    const section = data.sections.find(s => s.name === output)!;
    return data.fragments.find(f => f.id === section.stores[raw ? '1' : '0'])!;
}
export function machineryState(s: MachineryAccepted, section: MachinerySection) {
    const binding = section.bindings.find(b => b.target === section.target);
    const accepted = nativeWorldBindingState(s, section, binding);
    // spanMaster decorates the existing wire. It is not an invented platform.
    const physical = binding ? accepted.physical : null;
    return { raw: accepted.raw, physical, powered: binding ? physical : accepted.raw, grace: accepted.grace };
}
const names: Record<RaceMachineryOutput, string> = {
    spanMaster: 'SPAN CONTROL', phaseA: 'PHASE A', phaseB: 'PHASE B', returnBridge: 'RETURN BRIDGE', exitDoor: 'EXIT',
};
export function machineryMessage(output: RaceMachineryOutput, powered: boolean | null, connected: boolean): string {
    if (!connected) return `${names[output]} OFFLINE`;
    if (powered === null) return `${names[output]} UNKNOWN`;
    const suffix = output === 'spanMaster' ? powered ? 'ARMED' : 'IDLE'
        : output === 'exitDoor' ? powered ? 'UNLOCKED' : 'LOCKED' : powered ? 'ACTIVE' : 'INACTIVE';
    return `${names[output]} ${suffix}`;
}
type DisplayState = ReturnType<typeof machineryState> & { message: string; revealed: string; pulse: number };
/** Same restrained .4s authored reveal / .45s accent as cargo. No instruction replay. */
export class MachineryPresentation {
    private key = '';
    private moving = false;
    private time = 0;
    private previous = new Map<RaceMachineryOutput, DisplayState>();
    private messageAt = new Map<RaceMachineryOutput, number>();
    private pulseAt = new Map<RaceMachineryOutput, number>();
    update(s: MachineryAccepted | null, data: RaceMachineryArtifact | null, dt: number, animate: boolean): Map<RaceMachineryOutput, DisplayState> {
        const moving = !!s?.connected && animate && !!data;
        const baseline = !s || this.key !== s.key || !this.moving || !moving;
        if (baseline) { this.previous.clear(); this.messageAt.clear(); this.pulseAt.clear(); }
        this.key = s?.key ?? ''; this.moving = moving;
        if (moving) this.time += Math.max(0, Math.min(dt, .1));
        const result = new Map<RaceMachineryOutput, DisplayState>();
        if (!s || !data) return result;
        for (const output of RACE_MACHINERY_OUTPUTS) {
            const state = machineryState(s, data.sections.find(v => v.name === output)!);
            const known = state.raw !== null && state.powered !== null;
            const message = machineryMessage(output, known ? state.powered : null, s.connected);
            const old = this.previous.get(output);
            if (moving && known && old && old.raw !== null && old.powered !== null) {
                if (old.message !== message) this.messageAt.set(output, this.time);
                if (old.raw !== state.raw || old.powered !== state.powered) this.pulseAt.set(output, this.time);
            }
            if (!known) { this.messageAt.delete(output); this.pulseAt.delete(output); }
            const at = this.messageAt.get(output), pulseAt = this.pulseAt.get(output);
            const fraction = at === undefined ? 1 : Math.min(1, (this.time - at) / .4);
            result.set(output, { ...state, message,
                revealed: revealMessage({ text: message, label: '', active: true }, fraction),
                pulse: pulseAt === undefined ? 0 : Math.max(0, 1 - (this.time - pulseAt) / .45) });
        }
        this.previous = result;
        return result;
    }
}
