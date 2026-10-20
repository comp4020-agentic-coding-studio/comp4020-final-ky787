import type { NativeChamberId } from '../coop/native-evidence.ts';
import type { MachineConnection } from './connections.ts';
import type { RoomDef } from './rooms.ts';
import type { NativeWorldArtifact, NativeWorldOutput, NativeWorldBinding } from '../coop/native-world-types.ts';

/** Authored placement only. Native identities and object associations come from the generated artifact. */
export interface NativeWorldPlacement {
    /** A signal diagnostic identifies an existing wire, never a synthetic machinery binding. */
    kind?: 'signal';
    output: string;
    target: string;
    x: number;
    y: number;
}
export const WORLD_ASSEMBLY_PLACEMENTS: Partial<Record<NativeChamberId, readonly NativeWorldPlacement[]>> = {
    handshake: [
        { output: 'crossingPower', target: 'nearAnchor', x: 715, y: 690 },
        { output: 'liftPower', target: 'serviceLift', x: 1280, y: 610 },
        { output: 'relayPower', target: 'lowerRelay', x: 1630, y: 610 },
        { output: 'exitReady', target: 'exit', x: 1965, y: 610 },
    ],
    'crossfeed-vault': [
        { output: 'grappleAnchor', target: 'crossing-anchor', x: 2240, y: 1210 },
        { output: 'bridge', target: 'return-bridge', x: 2050, y: 1540 },
        { output: 'liftField', target: 'central-lift', x: 1760, y: 1165 },
        { output: 'relayGates', target: 'transfer', x: 340, y: 1320 },
        { output: 'leftRoute', target: 'left1', x: 1420, y: 405 },
        { output: 'rightRoute', target: 'right1', x: 3800, y: 235 },
        { output: 'galleryAccess', target: 'gallery-return-low', x: 3730, y: 470 },
        { output: 'vaultPower', target: 'final-left-low', x: 2500, y: 815 },
        { output: 'vaultReturn', target: 'vault-return', x: 1940, y: 800 },
        { output: 'serviceAccess', target: 'service-door', x: 900, y: 880 },
    ],
    'race-condition': [
        { output: 'topBridge', target: 'cargo-top', x: 350, y: 360 },
        { output: 'bufferBridge', target: 'cargo-buffer', x: 350, y: 495 },
        { output: 'safetyFirewall', target: 'safety-beam', x: 850, y: 1070 },
        { output: 'raceFirewall', target: 'race-beam', x: 600, y: 930 },
        { kind: 'signal', output: 'spanMaster', target: 'receiver-master', x: 740, y: 540 },
        { output: 'phaseA', target: 'span1', x: 900, y: 390 },
        { output: 'phaseB', target: 'crumbleA', x: 1420, y: 400 },
        { output: 'returnBridge', target: 'return-bridge', x: 2520, y: 760 },
        { output: 'exitDoor', target: 'exit', x: 3500, y: 570 },
    ],
    deadlock: [
        { output: 'cargoLift', target: 'cargoField', x: 760, y: 2840 },
        { output: 'shaftFirewall', target: 'shaftBeam', x: 180, y: 2320 },
        { output: 'serviceRelay', target: 'serviceUpper', x: 760, y: 740 },
        { output: 'hatchOpen', target: 'hatch', x: 250, y: 1060 },
        { output: 'payloadReady', target: 'exit', x: 1150, y: 740 },
    ],
    'use-after-free': [
        { output: 'routeA', target: 'a2', x: 690, y: 1798 },
        { output: 'routeB', target: 'b1', x: 1180, y: 1665 },
        { output: 'routeC', target: 'c1', x: 650, y: 1395 },
        { output: 'launchPower', target: 'lowerLift', x: 1390, y: 2130 },
        { output: 'assistBlocked', target: 'finalLift', x: 1450, y: 1440 },
        { output: 'exitReady', target: 'exit', x: 1430, y: 590 },
    ],
};
export type NativeWorldPlacementAssociation =
    | { output: NativeWorldOutput; binding: NativeWorldBinding; wire?: undefined }
    | { output: NativeWorldOutput; binding: undefined; wire: MachineConnection };
export function nativeWorldPlacementBinding(data: NativeWorldArtifact, placement: NativeWorldPlacement, room?: Pick<RoomDef, 'id' | 'wires'>): NativeWorldPlacementAssociation | null {
    const output = data.outputs.find(o => o.name === placement.output);
    if (!output) return null;
    if (placement.kind === 'signal') {
        // The specimen supplies the real store; the existing authored wire supplies
        // a signal association only. It is not a native block-to-platform mapping.
        if (room?.id !== data.chamber_id || !output.game_signal) return null;
        const wire = room.wires?.find(w => w.id === placement.target && w.output === output.game_signal);
        return wire ? { output, binding: undefined, wire } : null;
    }
    const binding = output.bindings.find(b => b.target === placement.target);
    return binding ? { output, binding } : null;
}
/** All manifestations of a shared signal deliberately retain the SAME store identity. */
export function nativeWorldPlatformBinding(data: NativeWorldArtifact, objectId: string): { output: NativeWorldOutput; binding: NativeWorldBinding } | null {
    const target = objectId.replace(/^draft:/, '');
    for (const output of data.outputs) {
        const binding = output.bindings.find(b => b.target === target);
        if (binding) return { output, binding };
    }
    return null;
}

/** Frozen acquisition labels remain in source JSON; only the verified campaign presentation changes. */
export function nativeWorldRegionLabel(label: string): string {
    switch (label) {
        case 'AUTHORED CO-OP / NO NATIVE EVIDENCE': return 'NATIVE x64 / STATIC OUTPUT REGIONS';
        case 'DEADLOCK / AUTHORED MOCK': return 'DEADLOCK / NATIVE x64';
        case 'AUTHORED MOCK / PROTOTYPE CRUMBLE': return 'NATIVE x64 / AUTHORED INSTABILITY';
        default: return label;
    }
}
