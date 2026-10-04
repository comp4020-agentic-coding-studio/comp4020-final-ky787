import type { ControllerFrame, ControllerOutputs, RoomId } from './controller.ts';
export interface MachinePresentation {
    describe(room: RoomId, frame: Readonly<ControllerFrame>, signal?: keyof ControllerOutputs): {
        active: boolean;
        text: string;
        label: string;
    };
}
/** Authored text only. Replace this adapter with retained string-decoding events later. */
export const mockPresentation: MachinePresentation = {
    describe(room, frame, signal) {
        const o = frame.outputs;
        if (room === 'uplink') {
            const key = signal ?? (o.exitDoor ? 'exitDoor' : o.codePlatformA ? 'codePlatformA' : o.liftField ? 'liftField' : 'relayGates');
            const messages: Partial<Record<keyof ControllerOutputs, string>> = {
                relayGates: 'RELAY LINK ESTABLISHED', liftField: 'LIFT FIELD ONLINE',
                codePlatformA: 'ROUTE UNLOCKED', exitDoor: 'UPLINK READY',
            };
            return { active: o[key], text: messages[key] ?? 'SIGNAL ONLINE', label: 'MACHINE / MOCK SIGNAL' };
        }
        return {
            active: room === 'pressure' ? o.exitDoor : o.grappleAnchor || o.bridge,
            text: room === 'pressure' ? 'ACCESS GRANTED' : room === 'switch' ? 'ANCHOR ENABLED'
                : o.exitDoor ? 'ACCESS GRANTED' : o.bridge ? 'BRIDGE LOCKED · CUBE TO B' : 'ANCHOR CONTROL ONLINE',
            label: 'MACHINE / MOCK SIGNAL',
        };
    },
};
