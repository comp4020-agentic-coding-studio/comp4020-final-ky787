/** Coordinate-free physical controller contract. Evidence belongs to the selected adapter. */
export const ROOM_IDS = ["pressure", "switch", "relay", "uplink"] as const;
export type RoomId = typeof ROOM_IDS[number];
/** Campaign IDs deliberately exclude the separate co-op session. */
export type WorldRoomId = RoomId | 'pairing-bay';
export interface ControllerInputs {
    plateA: boolean;
    plateB: boolean;
    cubeOnPlate: boolean;
    cubeOnPlateB: boolean;
    switchB: boolean;
    switchC: boolean;
    plateC: boolean;
    cubeOnPlateC: boolean;
}
export interface ControllerOutputs {
    exitDoor: boolean;
    grappleAnchor: boolean;
    bridge: boolean;
    codePlatformA: boolean;
    codePlatformB: boolean;
    relayGates: boolean;
    liftField: boolean;
}
export interface ControllerFrame {
    source: "mock-greybox" | "validated-trace" | "mock-multiplayer";
    outputs: ControllerOutputs;
    evidence?: { stateId: number; traceId: string; specimenId: string; binarySha256: string };
}
export interface RoomController {
    evaluate(room: WorldRoomId, inputs: Readonly<ControllerInputs>): ControllerFrame;
}
export const mockController: RoomController = {
    evaluate(room, i) {
        if (room === 'pairing-bay') throw new Error('PAIRING BAY requires server authority');
        const uplink = room === 'uplink';
        const anchor = room === "switch" ? i.switchB : (room === "relay" || uplink) && i.plateA;
        return { source: "mock-greybox", outputs: {
                exitDoor: uplink ? i.switchC && i.cubeOnPlateC : room === "pressure" ? i.plateA : room === "relay" ? i.switchB && i.plateB : i.switchB,
                grappleAnchor: anchor, bridge: room === "relay" && i.switchB,
                codePlatformA: uplink ? i.switchC : room === "relay" && i.switchB,
                codePlatformB: uplink ? i.switchC && i.cubeOnPlateC : room === "relay" && i.switchB,
                relayGates: uplink && i.switchB,
                liftField: uplink && (i.plateB || i.switchC),
            } };
    },
};
