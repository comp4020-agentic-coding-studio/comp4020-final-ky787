import type { ControllerFrame, RoomId } from './controller.ts';
export interface MachinePresentation {
    describe(room: RoomId, frame: Readonly<ControllerFrame>): {
        active: boolean;
        text: string;
        label: string;
    };
}
/** Authored text only. Replace this adapter with retained string-decoding events later. */
export const mockPresentation: MachinePresentation = {
    describe(room, frame) {
        const o = frame.outputs;
        return {
            active: room === 'pressure' ? o.exitDoor : o.grappleAnchor || o.bridge,
            text: room === 'pressure' ? 'ACCESS GRANTED' : room === 'switch' ? 'ANCHOR ENABLED'
                : o.bridge ? 'BRIDGE ENABLED' : 'ANCHOR CONTROL ONLINE',
            label: 'MACHINE / MOCK SIGNAL',
        };
    },
};
