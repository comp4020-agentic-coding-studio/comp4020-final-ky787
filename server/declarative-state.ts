import { objectPort, type DraftDocument, type DraftDevice } from '../src/workbench/model.ts';
import { draftSignal, evaluateDraft, initialDeviceValues, draftFrame } from '../src/workbench/evaluate.ts';
import type { LevelContext, LevelDefinition } from './coop-state.ts';
import { crumbleView, triggerCrumble } from './crumble-state.ts';
import type { CrumbleId, DeclarativeLevelId } from '../src/coop/protocol.ts';

/** One declarative controller for frozen custom sessions and released JSON chambers. */
export function declarativeDefinition<L extends DeclarativeLevelId = 'workbench'>(draft: DraftDocument): LevelDefinition<L> {
    const devices = draft.geometry.objects.filter((o): o is DraftDevice => o.type === 'device');
    const controls = devices.filter(o => o.kind === 'toggle' || o.kind === 'terminal');
    const occupied = devices.filter(o => o.kind !== 'toggle' && o.kind !== 'terminal');
    const unstable = draft.geometry.objects.filter(o => o.type === 'platform' && o.kind === 'unstable');
    const breakpoints = draft.geometry.objects.filter(o => o.type === 'breakpoint');
    const legacyControls: Record<string, string> = { handshake: 'checkpointControl.value', deadlock: 'lowerCommit.value', 'use-after-free': 'breakpointControl.value' };
    const cubeIds = draft.geometry.objects.filter(o => o.type === 'cube').map(o => draftSignal(o.id));
    const defaults = () => Object.fromEntries(controls.map(o => [objectPort(o), !!o.initial]));
    function values(ctx: LevelContext<L>) {
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
            && Object.keys(r.levelState.devices).every(key => controls.some(o => objectPort(o) === key)
                || key === legacyControls[r.level] && typeof r.levelState.devices[key] === 'boolean')
            && controls.every(o => typeof r.levelState.devices[objectPort(o)] === 'boolean')
            && (r.checkpoint === 'entry' || draft.geometry.objects.some(o => o.type === 'checkpoint'
                && o.checkpoint === (r.checkpoint === 'reunion' ? 'relay' : r.checkpoint))
                || r.checkpoint === 'reunion' && (r.level === 'deadlock' || r.level === 'use-after-free')),
        acceptsPlate: p => p === null || occupied.some(o => o.kind !== 'socket' && draftSignal(o.id) === p),
        acceptsPlacement: (_, p) => occupied.some(o => o.kind !== 'scanner' && draftSignal(o.id) === p),
        cubeEnabled: (_, id) => cubeIds.includes(id as `draft:${string}`),
        action: (ctx, message) => {
            if (message.type === 'checkpoint') {
                const station = breakpoints.find(o => draftSignal(o.id) === message.breakpoint);
                if (!station) return false;
                if (ctx.record.checkpoint !== 'upper') ctx.record.checkpoint = station.checkpoint === 'relay' ? 'reunion' : 'upper';
                return true;
            }
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
            if (control.checkpoint && ctx.record.levelState.devices[port] && ctx.record.checkpoint !== 'upper') ctx.record.checkpoint = control.checkpoint === 'relay' ? 'reunion' : 'upper';
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
