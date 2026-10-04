/** Coordinate-free C8 mock contract. No instructions, traces or binary claims. */
export const ROOM_IDS = ["pressure", "switch", "relay", "uplink"] as const;
export type RoomId = typeof ROOM_IDS[number];
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
    source: "mock-greybox" | "validated-trace";
    outputs: ControllerOutputs;
}
export interface RoomController {
    evaluate(room: RoomId, inputs: Readonly<ControllerInputs>): ControllerFrame;
}
export const mockController: RoomController = {
    evaluate(room, i) {
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
