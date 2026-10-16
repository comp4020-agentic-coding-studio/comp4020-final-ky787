import { DeclarativeAuthority } from './declarative-authority.ts';
import type { MachineSignal } from '../slice/controller.ts';
import type { PuzzleWorld, WorldAuthority } from '../slice/world.ts';
import { createCoopAuthority } from '../coop/lab-authority.ts';
import type { CoopClient } from '../coop/client.ts';
import type { SessionRoom } from '../coop/protocol.ts';
import { CONSTANT_POWER, draftSignal } from './evaluate.ts';
import { nativeSignal } from './room-adapter.ts';
import type { DraftDocument } from './model.ts';

export interface DraftCoopAuthority extends WorldAuthority { room: SessionRoom }
class BoundBuiltinAuthority implements DraftCoopAuthority {
    constructor(private document: DraftDocument, private base: DraftCoopAuthority) {}
    get room() { return this.base.room; }
    set room(value: SessionRoom) { this.base.room = value; }
    get cube() { return this.base.cube; }
    get cubes() { return this.base.cubes; }
    get crumble() { return this.base.crumble; }
    get inputs() { return this.base.inputs; }
    get checkpoint() { return this.base.checkpoint; }
    get frame() {
        const frame = this.base.frame, values: Record<string, boolean> = { ...frame.outputs, ...frame.signals };
        const signals: Partial<Record<MachineSignal, boolean>> = { ...CONSTANT_POWER, ...frame.signals };
        for (const binding of this.document.bindings) if (binding.invert) signals[draftSignal(binding.id)] = !values[binding.output];
        return { ...frame, signals };
    }
    physicalPower(signal: MachineSignal): boolean {
        if (signal === 'draft:activation:on' || signal === 'draft:activation:off') return CONSTANT_POWER[signal];
        const binding = this.document.bindings.find(b => b.invert && draftSignal(b.id) === signal);
        const native = binding ? nativeSignal(binding.output) : signal;
        const values: Partial<Record<MachineSignal, boolean>> = { ...this.base.frame.outputs, ...this.base.frame.signals };
        const powered = this.base.physicalPower ? this.base.physicalPower(native) : !!values[native];
        return binding ? !powered : powered;
    }
    sample(w: PuzzleWorld) { this.base.sample(w); }
    interact(w: PuzzleWorld) { return this.base.interact(w); }
    hint(w: PuzzleWorld) { return this.base.hint(w); }
}
export function createDraftAuthority(document: DraftDocument, room: SessionRoom, client: CoopClient): DraftCoopAuthority {
    const authority: DraftCoopAuthority = room.level === 'workbench' ? new DeclarativeAuthority(document, room, client) : new BoundBuiltinAuthority(document, createCoopAuthority(room, client));
    authority.reset = () => client.localReset();
    authority.discontinuity = (entity, reason, id) => client.markDiscontinuity(entity, reason, id);
    return authority;
}
