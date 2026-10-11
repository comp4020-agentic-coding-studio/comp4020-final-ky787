import type { RoomDef, Platform, CameraReveal } from '../slice/rooms.ts';
import type { MachineConnection } from '../slice/connections.ts';
import type { Slot } from './protocol.ts';

/** Hand-authored machine. Provisional mock contract, no binary provenance. */
export function raceCondition(slot: Slot): RoomDef<'race-condition'> {
    const span: Platform[] = [
        { id: 'span1', x: 930, y: 350, signal: 'phaseA', label: '01 / A', kind: 'code', w: 150, h: 30 },
        { id: 'crumbleA', x: 1430, y: 290, signal: 'phaseB', label: '02 / B', kind: 'crumble-prototype', w: 150, h: 30, hookCrumbleDelay: 1.55 },
        { id: 'span3', x: 1930, y: 350, signal: 'phaseA', label: '03 / A', kind: 'code', w: 150, h: 30 },
        { id: 'crumbleB', x: 2430, y: 290, signal: 'phaseB', label: '04 / B', kind: 'crumble-prototype', w: 150, h: 30, hookCrumbleDelay: 1.55 },
        { id: 'span5', x: 2930, y: 350, signal: 'phaseA', label: '05 / A', kind: 'code', w: 150, h: 30 },
    ];
    const wires: MachineConnection[] = [];
    const cargoView: CameraReveal = { bounds: { x: 70, y: 390, w: 280, h: 715 }, padding: 64 };
    const spanView: CameraReveal = { platformIds: span.map(p => p.id), bounds: { x: 540, y: 150, w: 2820, h: 760 }, padding: 70 };
    const returnView: CameraReveal = { platformIds: ['return-bridge'], bounds: { x: 560, y: 640, w: 3000, h: 150 }, padding: 70 };
    const wire = (id: string, output: MachineConnection['output'], x: number, y: number, toX: number, toY: number, viaY: number, inverted = false) =>
        wires.push({ id, input: 'plateA', output, resolved: true, inverted,
            points: [{ x, y }, { x, y: viaY }, { x: toX, y: viaY }, { x: toX, y: toY }] });
    wire('drop-top', 'topBridge', 180, 1228, 120, 500, 1160, true);
    wire('drop-buffer', 'bufferBridge', 1880, 1228, 290, 680, 1120, true);
    wire('safety', 'safetyFirewall', 1880, 1228, 290, 860, 1140, true);
    wire('race', 'raceFirewall', 180, 1228, 120, 800, 1180);
    wire('receiver-master', 'spanMaster', 205, 1030, 615, 705, 1080);
    for (const p of span) wire(`phase-${p.id}`, p.signal!, 655, 688, p.x + p.w / 2, p.y, p.signal === 'phaseA' ? 205 : 235, p.id === 'span1');
    wire('return', 'returnBridge', 3470, 708, 3240, 720, 845);
    wire('commit-exit', 'exitDoor', 4000, 518, 4045, 600, 475);
    return {
        id: 'race-condition', title: 'RACE CONDITION', instruction: 'DELIVER THE PAYLOAD. KEEP THE TRACE ALIVE.',
        width: 4180, height: 1420,
        spawn: { x: slot === 1 ? 120 : 250, y: 1223 }, checkpoint: { x: slot === 1 ? 585 : 695, y: 703 },
        cubes: [{ id: 'cubeA', mark: 'A', spawn: { x: 205, y: 478 } }, { id: 'cubeB', mark: 'B', spawn: { x: 3570, y: 698 } }],
        plates: [
            { id: 'dropA', at: { x: 180, y: 1240 }, label: 'DROP A', cameraReveal: cargoView },
            { id: 'dropB', at: { x: 1880, y: 1240 }, label: 'DROP B', cameraReveal: cargoView },
            { id: 'receiver', at: { x: 205, y: 1040 }, label: 'RECEIVER' },
            { id: 'trace', at: { x: 615, y: 720 }, label: 'TRACE ENABLE', cameraReveal: spanView },
            { id: 'return', at: { x: 3470, y: 720 }, label: 'RETURN', cameraReveal: returnView },
        ],
        controls: [{ id: 'phase', kind: 'toggle', at: { x: 655, y: 720 }, label: 'PHASE', cameraReveal: spanView },
            { id: 'commit', kind: 'terminal', at: { x: 4000, y: 530 }, label: 'COMMIT' }],
        platforms: [
            { id: 'floor', kind: 'static', x: 0, y: 1240, w: 4180, h: 180 },
            ...[1136, 1032, 928, 824].map((y, i): Platform => ({ id: `launch-step-${i}`, kind: 'static', x: 300 + i * 65, y, w: 140, h: 22 })),
            { id: 'launch', kind: 'static', x: 560, y: 720, w: 165, h: 28 },
            // Enclosed cargo, visible through its open frame. No body-only sensor rule.
            { id: 'chute-left', kind: 'static', blocksCubeInteraction: true, x: 90, y: 420, w: 30, h: 652 },
            { id: 'chute-right', kind: 'static', blocksCubeInteraction: true, x: 290, y: 420, w: 30, h: 652 },
            { id: 'chute-roof', kind: 'static', blocksCubeInteraction: true, x: 90, y: 420, w: 230, h: 24 },
            { id: 'receiver-floor', kind: 'static', blocksCubeInteraction: true, x: 90, y: 1040, w: 230, h: 32 },
            { id: 'cargo-top', kind: 'code', x: 120, y: 500, w: 170, h: 24, signal: 'topBridge', label: 'TOP', hookable: false },
            { id: 'cargo-buffer', kind: 'code', x: 120, y: 680, w: 170, h: 24, signal: 'bufferBridge', label: 'BUFFER', hookable: false },
            ...span,
            { id: 'return-bridge', kind: 'code', x: 725, y: 720, w: 2505, h: 24, signal: 'returnBridge', label: 'RETURN' },
            { id: 'right-deck', kind: 'static', blocksCubeInteraction: true, x: 3230, y: 720, w: 950, h: 32 },
            { id: 'commit-ledge', kind: 'static', x: 3820, y: 530, w: 360, h: 28 },
        ],
        firewalls: [
            // Below the swing arcs and powered return crossing; failed attempts respawn at launch.
            { id: 'span-firewall', x: 725, y: 900, length: 2505, orientation: 'horizontal' },
            { id: 'race-beam', x: 120, y: 800, length: 170, orientation: 'horizontal', signal: 'raceFirewall' },
            { id: 'safety-beam', x: 120, y: 860, length: 170, orientation: 'horizontal', signal: 'safetyFirewall' },
        ],
        wires, hazards: [], display: { x: 1320, y: 820 }, exit: { x: 4020, y: 580, w: 110, h: 140 },
        regions: [{ at: { x: 80, y: 1115 }, label: 'CARGO CLOCK' }, { at: { x: 1600, y: 130 }, label: 'ALTERNATING TRACE' },
            { at: { x: 3530, y: 860 }, label: 'RETURN / COMMIT' }, { at: { x: 2520, y: 1330 }, label: '← RECOVERY' }],
    };
}
