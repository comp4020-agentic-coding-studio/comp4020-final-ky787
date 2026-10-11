import { decodeXor, revealXor, XOR_MESSAGES } from './xor-presentation.ts';
import type { ControllerFrame, ControllerOutputs, WorldRoomId } from './controller.ts';
export interface MachinePresentation {
    describe(room: WorldRoomId, frame: Readonly<ControllerFrame>, signal?: keyof ControllerOutputs): {
        active: boolean;
        text: string;
        label: string;
        encoded?: readonly number[];
    };
}
/** Authored text only. Replace this adapter with retained string-decoding events later. */
export const authoredPresentation: MachinePresentation = {
    describe(room, frame, signal) {
        const o = frame.outputs;
        if (room === 'crossfeed-vault') return { active: true, text: o.exitDoor ? 'VAULT OPEN' : 'CROSSFEED VAULT', label: 'MOCK MULTIPLAYER CONTROLLER / BINARY INTEGRATION PENDING' };
        if (room === 'pairing-bay') return { active: o.grappleAnchor || o.bridge || o.exitDoor,
            text: o.exitDoor ? 'EXIT UNLOCKED · REGROUP' : o.bridge ? 'TWO SIGNALS REQUIRED' : 'HOLD A · PARTNER CROSSES', label: 'MOCK MULTIPLAYER / TEST CONTROLLER' };
        if (room === 'relay-lab' || room === 'lift-lab' || room === 'crumble-lab' || room === 'boost-lab' || room === 'firewall-lab') return {
            active: true, label: 'MOCK MECHANICS LAB / TEST CONTROLLER',
            text: signal === 'liftField' ? o.exitDoor ? 'LIFT LATCHED' : 'LIFT ON' : o.exitDoor ? 'EXIT UNLOCKED · BOTH PLAYERS' : room === 'relay-lab' ? 'LATCH POWER · TRANSIT'
                : room === 'lift-lab' ? 'HOLD BELOW · LATCH ABOVE' : room === 'boost-lab' ? 'HOLD CUBE · BOOST PARTNER'
                : room === 'firewall-lab' ? 'BEAMS STAY LIVE' : 'TEST A STEP AND A HOOK',
        };
        if (room === 'uplink') {
            const key = signal ?? (o.exitDoor ? 'exitDoor' : o.codePlatformA ? 'codePlatformA' : o.liftField ? 'liftField' : 'relayGates');
            const messages: Partial<Record<keyof ControllerOutputs, readonly number[]>> = {
                grappleAnchor: XOR_MESSAGES.anchor, relayGates: XOR_MESSAGES.relay,
                liftField: frame.outputs.codePlatformA ? XOR_MESSAGES.latched : XOR_MESSAGES.lift,
                codePlatformA: o.exitDoor ? XOR_MESSAGES.ready : XOR_MESSAGES.payload,
                codePlatformB: XOR_MESSAGES.return, exitDoor: XOR_MESSAGES.ready,
            };
            const encoded = messages[key] ?? XOR_MESSAGES.ready;
            return { active: o[key], text: decodeXor(encoded), encoded, label: 'AUTHORED SINGLE-BYTE XOR / NOT BINARY EVIDENCE' };
        }
        return {
            active: room === 'pressure' ? o.exitDoor : o.grappleAnchor || o.bridge,
            text: room === 'pressure' ? 'ACCESS GRANTED' : room === 'switch' ? 'ANCHOR ENABLED'
                : o.exitDoor ? 'ACCESS GRANTED' : o.bridge ? 'BRIDGE LOCKED · CUBE TO B' : 'ANCHOR CONTROL ONLINE',
            label: 'MACHINE / MOCK SIGNAL',
        };
    },
};

export function revealMessage(feedback: ReturnType<MachinePresentation['describe']>, fraction: number): string {
    const progress = feedback.active ? fraction : 0;
    if (feedback.encoded) return revealXor(feedback.encoded, progress);
    const count = Math.floor(feedback.text.length * progress);
    return feedback.text.split('').map((ch, i) => i < count ? ch : ((i * 17) % 16).toString(16).toUpperCase()).join('');
}
