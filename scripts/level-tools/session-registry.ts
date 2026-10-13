import { draftHash, objectPort, serializeDraft, type DraftDocument, type DraftDevice } from '../../src/workbench/model.ts';
import { draftSignal, evaluateDraft, initialDeviceValues, draftFrame } from '../../src/workbench/evaluate.ts';
import { requirePlayable } from '../../src/workbench/validation.ts';
import type { FrozenDraftRegistry, FrozenDraftSession } from '../../server/multiplayer.ts';
import type { LevelContext, LevelDefinition } from '../../server/coop-state.ts';
import { crumbleView, triggerCrumble } from '../../server/crumble-state.ts';
import type { CrumbleId } from '../../src/coop/protocol.ts';

/** Local-only, bounded immutable snapshots. No generated source or executable imports. */
export class DraftSessionRegistry implements FrozenDraftRegistry {
    private snapshots = new Map<string, { document: DraftDocument; session: FrozenDraftSession }>();
    async register(value: unknown) {
        const document = structuredClone(requirePlayable(value)), hash = await draftHash(document);
        const existing = this.snapshots.get(hash);
        if (existing) return { hash, metadata: structuredClone(existing.session.metadata) };
        if (this.snapshots.size >= 32) throw new Error('Frozen snapshot limit (32) reached. Restart the workbench service to release sessions.');
        const copy: DraftDocument = JSON.parse(serializeDraft(document));
        const metadata = { hash, controller: { id: copy.controller.kind === 'builtin' ? copy.controller.id : 'declarative', version: 1 } };
        const exit = copy.geometry.objects.find(o => o.type === 'exit');
        const coopError = exit?.type === 'exit' && exit.latch && exit.arrivals === 2 ? undefined : 'Local co-op requires a latched exit with two distinct arrivals. Change the exit configuration before starting co-op.';
        const session: FrozenDraftSession = copy.controller.kind === 'builtin'
            ? { metadata, coopError, level: copy.controller.id }
            : { metadata, coopError, level: 'workbench', definition: declarativeDefinition(copy) };
        this.snapshots.set(hash, { document: copy, session });
        return { hash, metadata: structuredClone(metadata) };
    }
    get(hash: string): FrozenDraftSession | undefined { return this.snapshots.get(hash)?.session; }
    document(hash: string): DraftDocument | undefined {
        const doc = this.snapshots.get(hash)?.document;
        return doc ? structuredClone(doc) : undefined;
    }
}

export function declarativeDefinition(draft: DraftDocument): LevelDefinition<'workbench'> {
    const devices = draft.geometry.objects.filter((o): o is DraftDevice => o.type === 'device');
    const controls = devices.filter(o => o.kind === 'toggle' || o.kind === 'terminal');
    const occupied = devices.filter(o => o.kind !== 'toggle' && o.kind !== 'terminal');
    const unstable = draft.geometry.objects.filter(o => o.type === 'platform' && o.kind === 'unstable');
    const cubeIds = draft.geometry.objects.filter(o => o.type === 'cube').map(o => draftSignal(o.id));
    const defaults = () => Object.fromEntries(controls.map(o => [objectPort(o), !!o.initial]));
    function values(ctx: LevelContext<'workbench'>) {
        const values = { ...initialDeviceValues(draft), ...ctx.record.levelState.devices };
        for (const device of occupied) {
            const body = ctx.draftHeld?.some(held => held.includes(draftSignal(device.id))) ?? false;
            const cube = Object.entries(ctx.record.cubePlacements).some(([id, placement]) => {
                const contacts = ctx.draftCubeContacts?.[id as `draft:${string}`];
                return contacts ? contacts.includes(draftSignal(device.id)) : placement === draftSignal(device.id);
            });
            values[objectPort(device)] = device.kind === 'scanner' ? body : device.kind === 'socket' ? cube : body || cube;
        }
        return values;
    }
    return {
        cubeIds, defaults: () => ({ devices: defaults() }),
        valid: r => Object.keys(r.levelState).length === 1 && !!r.levelState.devices
            && Object.keys(r.levelState.devices).length === controls.length
            && controls.every(o => typeof r.levelState.devices[objectPort(o)] === 'boolean')
            && ['entry', 'reunion', 'upper'].includes(r.checkpoint),
        acceptsPlate: p => p === null || occupied.some(o => o.kind !== 'socket' && draftSignal(o.id) === p),
        acceptsPlacement: (_, p) => occupied.some(o => o.kind !== 'scanner' && draftSignal(o.id) === p),
        cubeEnabled: (_, id) => cubeIds.includes(id as `draft:${string}`),
        action: (ctx, message) => {
            if (message.type === 'crumble-trigger') {
                const platform = unstable.find(o => draftSignal(o.id) === message.platform);
                if (!platform || platform.type !== 'platform') return false;
                const v = values(ctx), frame = draftFrame(draft, v, evaluateDraft(draft, v));
                const binding = draft.bindings.find(b => b.target === platform.id && b.property === 'active');
                if (binding && !frame.signals?.[draftSignal(binding.id)]) return false;
                const warning = (message.trigger === 'hook' ? platform.hookCrumbleDelay ?? 1.65 : platform.crumbleDelay ?? .6) * 1000;
                return triggerCrumble(ctx.crumble, message.platform, message.trigger, ctx.now, warning, (platform.respawnDelay ?? 2.4) * 1000);
            }
            if (message.type !== 'control') return false;
            const control = controls.find(o => draftSignal(o.id) === message.control);
            if (!control) return false;
            const port = objectPort(control);
            ctx.record.levelState.devices[port] = control.kind === 'terminal' || !ctx.record.levelState.devices[port];
            if (control.checkpoint && ctx.record.levelState.devices[port]) ctx.record.checkpoint = control.checkpoint === 'relay' ? 'reunion' : 'upper';
            return true;
        },
        project: ctx => {
            for (const p of unstable) {
                const id: CrumbleId = draftSignal(p.id);
                ctx.crumble[id] ??= { phase: 'stable', deadline: 0, durationMs: 0 };
            }
            const devices = values(ctx);
            return { devices, outputs: evaluateDraft(draft, devices), platforms: crumbleView(ctx.crumble, ctx.now) };
        },
        unlock: ctx => { const v = values(ctx); return draftFrame(draft, v, evaluateDraft(draft, v)).outputs.exitDoor; },
    };
}
