import type { ClientMessage, SharedCube, Slot } from '../src/coop/protocol.ts';

export const freshCube = (): SharedCube => ({ holder: null, physicsAuthority: null, pulling: false, epoch: 0, seq: -1, transform: null });

/** Revoke the old stream before granting another. No coordinates are manufactured here. */
export function assignCube(cube: SharedCube, slot: Slot | null): void {
    if (cube.holder && cube.transform) cube.transform = { ...cube.transform, grounded: false };
    cube.holder = null;
    cube.physicsAuthority = slot;
    cube.pulling = false;
    cube.epoch++;
    cube.seq = -1;
}

type Interaction = Extract<ClientMessage, { type: 'cube-pickup' | 'cube-pull-start' | 'cube-pull-stop' | 'cube-drop' }>;
/** Called only in the server's serialized semantic queue, with the authenticated slot. */
export function interactCube(cube: SharedCube, slot: Slot, message: Interaction): boolean {
    if (message.epoch !== cube.epoch) return false;
    if (message.type === 'cube-drop') {
        if (cube.holder !== slot) return false;
        assignCube(cube, slot);
        cube.transform = { ...message.transform, grounded: false };
    } else if (message.type === 'cube-pull-stop') {
        if (cube.physicsAuthority !== slot || !cube.pulling) return false;
        cube.pulling = false; // The same browser keeps advancing the loose body.
    } else {
        if (cube.holder !== null || cube.pulling && cube.physicsAuthority !== slot) return false;
        assignCube(cube, slot);
        if (message.type === 'cube-pickup') cube.holder = slot;
        else cube.pulling = true;
    }
    return true;
}

/** High-frequency traffic never touches the room record or the persistence queue. */
export function acceptCubeSnapshot(cube: SharedCube, slot: Slot, message: Extract<ClientMessage, { type: 'cube' }>): boolean {
    if (cube.physicsAuthority !== slot || message.epoch !== cube.epoch || message.seq <= cube.seq) return false;
    cube.seq = message.seq;
    cube.transform = { ...message.transform, grounded: cube.holder ? false : message.transform.grounded };
    return true;
}
