import { newDraft, type DraftDocument } from './model.ts';

export const PUBLIC_TEMPLATES = [
    { id: 'beginner', title: 'Beginner room', description: 'Cube, pressure plate, always-powered grapple slab and a two-player exit.' },
    { id: 'signals', title: 'Signal routes', description: 'Two controlled platforms, a plate, a switch and visible functional connections.' },
] as const;
/** Compiled authored/mock templates. Each call returns independent editable data. */
export function publicTemplate(id = 'beginner'): DraftDocument {
    const d = newDraft(id === 'signals' ? 'signal-routes' : 'beginner-room');
    const platform = d.geometry.objects.find(o => o.id === 'route')!;
    const exit = d.geometry.objects.find(o => o.type === 'exit')!;
    if (exit.type === 'exit') exit.arrivals = 2;
    if (d.controller.kind !== 'declarative' || platform.type !== 'platform') throw new Error('Invalid template');
    if (id === 'signals') {
        d.title = 'SIGNAL ROUTES / AUTHORED EXAMPLE';
        d.instruction = 'PUT THE CUBE ON POWER. TOGGLE ROUTE TO SWITCH PLATFORMS.';
        platform.activation = 'signal'; platform.x = 730; platform.y = 490; platform.w = 220;
        d.geometry.objects.push({ ...platform, id: 'upperRoute', label: 'SECOND ROUTE', x: 1050, y: 350 });
        d.controller.outputs.upperPower = { op: 'and', args: [{ op: 'ref', id: 'powerPlate.occupied' }, { op: 'ref', id: 'routeLever.value' }] };
        d.bindings.push({ id: 'upperBinding', output: 'upperPower', target: 'upperRoute', property: 'active' });
        d.presentation.wires.push({ id: 'upperWire', binding: 'upperBinding', points: [{ x: 610, y: 668 }, { x: 610, y: 300 }, { x: 1160, y: 300 }, { x: 1160, y: 350 }] });
        d.previewStates['upper-powered'] = { 'powerPlate.occupied': true, 'routeLever.value': true };
    } else {
        d.title = 'BEGINNER ROOM / AUTHORED EXAMPLE';
        d.instruction = 'PRACTISE GRAPPLING. PUT THE CUBE ON POWER TO OPEN THE EXIT.';
        d.geometry.objects = d.geometry.objects.filter(o => o.id !== 'routeLever');
        platform.activation = 'always-powered'; platform.label = 'ALWAYS POWERED';
        d.controller.outputs = { exitReady: { op: 'ref', id: 'powerPlate.occupied' } };
        d.bindings = d.bindings.filter(b => b.target !== 'route');
        d.presentation.wires = [];
        d.presentation.wires.push({ id: 'exitWire', binding: 'exitBinding', points: [{ x: 440, y: 668 }, { x: 440, y: 600 }, { x: 1400, y: 600 }] });
        d.previewStates = { idle: {}, powered: { 'powerPlate.occupied': true } };
    }
    return d;
}
