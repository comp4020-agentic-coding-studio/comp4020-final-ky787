/** Coordinate-free C8 mock contract. No instructions, traces or binary claims. */
export const ROOM_IDS = ["pressure", "switch", "relay"] as const;
export type RoomId = typeof ROOM_IDS[number];
export interface ControllerInputs {
    plateA: boolean;
    plateB: boolean;
    cubeOnPlate: boolean;
    cubeOnPlateB: boolean;
    switchB: boolean;
}
export interface ControllerOutputs {
    exitDoor: boolean;
    grappleAnchor: boolean;
    bridge: boolean;
    codePlatformA: boolean;
    codePlatformB: boolean;
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
        const anchor = room === "switch" ? i.switchB : room === "relay" && i.plateA;
        return { source: "mock-greybox", outputs: {
                exitDoor: room === "pressure" ? i.plateA : room === "relay" ? i.switchB && i.plateB : i.switchB,
                grappleAnchor: anchor, bridge: room === "relay" && i.switchB,
                codePlatformA: room === "relay" && i.switchB,
                codePlatformB: room === "relay" && i.switchB,
            } };
    },
};
