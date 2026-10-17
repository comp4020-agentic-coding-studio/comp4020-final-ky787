#ifndef BN_CROSSFEED_VAULT_CONTROLLER_H
#define BN_CROSSFEED_VAULT_CONTROLLER_H
#include <stdint.h>
#include <stddef.h>

typedef struct ControllerInputs {
    uint32_t switchB;
    uint32_t switchC;
    uint32_t switchD;
    uint32_t routeMode;
    uint32_t plateAOccupied;
    uint32_t routePowerOccupied;
    uint32_t cubeOnLiftCargo;
    uint32_t cubeOnFinalLeft;
    uint32_t cubeOnFinalRight;
    uint32_t finalPlateLeftOccupied;
    uint32_t finalPlateRightOccupied;
    uint32_t exitUnlocked;
    uint32_t leftGraceActive;
    uint32_t rightGraceActive;
} ControllerInputs;

typedef struct ControllerOutputs {
    uint32_t grappleAnchor;
    uint32_t bridge;
    uint32_t liftField;
    uint32_t serviceAccess;
    uint32_t relayGates;
    uint32_t leftRoute;
    uint32_t rightRoute;
    uint32_t galleryAccess;
    uint32_t vaultPower;
    uint32_t vaultReturn;
    uint32_t exitDoor;
    uint32_t physicalLeftRoute;
    uint32_t physicalRightRoute;
    uint32_t exitUnlockCandidate;
} ControllerOutputs;

_Static_assert(sizeof(ControllerInputs) == 56, "Input ABI size");
_Static_assert(sizeof(ControllerOutputs) == 56, "Output ABI size");
_Static_assert(offsetof(ControllerInputs, switchB) == 0, "ControllerInputs.switchB offset");
_Static_assert(offsetof(ControllerInputs, switchC) == 4, "ControllerInputs.switchC offset");
_Static_assert(offsetof(ControllerInputs, switchD) == 8, "ControllerInputs.switchD offset");
_Static_assert(offsetof(ControllerInputs, routeMode) == 12, "ControllerInputs.routeMode offset");
_Static_assert(offsetof(ControllerInputs, plateAOccupied) == 16, "ControllerInputs.plateAOccupied offset");
_Static_assert(offsetof(ControllerInputs, routePowerOccupied) == 20, "ControllerInputs.routePowerOccupied offset");
_Static_assert(offsetof(ControllerInputs, cubeOnLiftCargo) == 24, "ControllerInputs.cubeOnLiftCargo offset");
_Static_assert(offsetof(ControllerInputs, cubeOnFinalLeft) == 28, "ControllerInputs.cubeOnFinalLeft offset");
_Static_assert(offsetof(ControllerInputs, cubeOnFinalRight) == 32, "ControllerInputs.cubeOnFinalRight offset");
_Static_assert(offsetof(ControllerInputs, finalPlateLeftOccupied) == 36, "ControllerInputs.finalPlateLeftOccupied offset");
_Static_assert(offsetof(ControllerInputs, finalPlateRightOccupied) == 40, "ControllerInputs.finalPlateRightOccupied offset");
_Static_assert(offsetof(ControllerInputs, exitUnlocked) == 44, "ControllerInputs.exitUnlocked offset");
_Static_assert(offsetof(ControllerInputs, leftGraceActive) == 48, "ControllerInputs.leftGraceActive offset");
_Static_assert(offsetof(ControllerInputs, rightGraceActive) == 52, "ControllerInputs.rightGraceActive offset");
_Static_assert(offsetof(ControllerOutputs, grappleAnchor) == 0, "ControllerOutputs.grappleAnchor offset");
_Static_assert(offsetof(ControllerOutputs, bridge) == 4, "ControllerOutputs.bridge offset");
_Static_assert(offsetof(ControllerOutputs, liftField) == 8, "ControllerOutputs.liftField offset");
_Static_assert(offsetof(ControllerOutputs, serviceAccess) == 12, "ControllerOutputs.serviceAccess offset");
_Static_assert(offsetof(ControllerOutputs, relayGates) == 16, "ControllerOutputs.relayGates offset");
_Static_assert(offsetof(ControllerOutputs, leftRoute) == 20, "ControllerOutputs.leftRoute offset");
_Static_assert(offsetof(ControllerOutputs, rightRoute) == 24, "ControllerOutputs.rightRoute offset");
_Static_assert(offsetof(ControllerOutputs, galleryAccess) == 28, "ControllerOutputs.galleryAccess offset");
_Static_assert(offsetof(ControllerOutputs, vaultPower) == 32, "ControllerOutputs.vaultPower offset");
_Static_assert(offsetof(ControllerOutputs, vaultReturn) == 36, "ControllerOutputs.vaultReturn offset");
_Static_assert(offsetof(ControllerOutputs, exitDoor) == 40, "ControllerOutputs.exitDoor offset");
_Static_assert(offsetof(ControllerOutputs, physicalLeftRoute) == 44, "ControllerOutputs.physicalLeftRoute offset");
_Static_assert(offsetof(ControllerOutputs, physicalRightRoute) == 48, "ControllerOutputs.physicalRightRoute offset");
_Static_assert(offsetof(ControllerOutputs, exitUnlockCandidate) == 52, "ControllerOutputs.exitUnlockCandidate offset");
__declspec(dllexport) __declspec(noinline)
void bn_evaluate(const ControllerInputs *inputs, ControllerOutputs *outputs);
#endif
