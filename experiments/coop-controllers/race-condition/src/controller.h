#ifndef BN_RACE_CONDITION_CONTROLLER_H
#define BN_RACE_CONDITION_CONTROLLER_H
#include <stdint.h>
#include <stddef.h>

typedef struct ControllerInputs {
    uint32_t dropA;
    uint32_t dropB;
    uint32_t payloadDelivered;
    uint32_t traceOccupied;
    uint32_t phase;
    uint32_t returnOccupied;
    uint32_t finalControl;
    uint32_t exitUnlocked;
    uint32_t phaseGraceActive;
    uint32_t returnGraceActive;
    uint32_t bufferPhase;
} ControllerInputs;

typedef struct ControllerOutputs {
    uint32_t topBridge;
    uint32_t bufferBridge;
    uint32_t safetyFirewall;
    uint32_t raceFirewall;
    uint32_t spanMaster;
    uint32_t phaseA;
    uint32_t phaseB;
    uint32_t returnBridge;
    uint32_t exitDoor;
    uint32_t physicalPhaseA;
    uint32_t physicalPhaseB;
    uint32_t physicalReturnBridge;
    uint32_t exitUnlockCandidate;
} ControllerOutputs;

_Static_assert(sizeof(ControllerInputs) == 44, "Input ABI size");
_Static_assert(sizeof(ControllerOutputs) == 52, "Output ABI size");
_Static_assert(offsetof(ControllerInputs, dropA) == 0, "ControllerInputs.dropA offset");
_Static_assert(offsetof(ControllerInputs, dropB) == 4, "ControllerInputs.dropB offset");
_Static_assert(offsetof(ControllerInputs, payloadDelivered) == 8, "ControllerInputs.payloadDelivered offset");
_Static_assert(offsetof(ControllerInputs, traceOccupied) == 12, "ControllerInputs.traceOccupied offset");
_Static_assert(offsetof(ControllerInputs, phase) == 16, "ControllerInputs.phase offset");
_Static_assert(offsetof(ControllerInputs, returnOccupied) == 20, "ControllerInputs.returnOccupied offset");
_Static_assert(offsetof(ControllerInputs, finalControl) == 24, "ControllerInputs.finalControl offset");
_Static_assert(offsetof(ControllerInputs, exitUnlocked) == 28, "ControllerInputs.exitUnlocked offset");
_Static_assert(offsetof(ControllerInputs, phaseGraceActive) == 32, "ControllerInputs.phaseGraceActive offset");
_Static_assert(offsetof(ControllerInputs, returnGraceActive) == 36, "ControllerInputs.returnGraceActive offset");
_Static_assert(offsetof(ControllerInputs, bufferPhase) == 40, "ControllerInputs.bufferPhase offset");
_Static_assert(offsetof(ControllerOutputs, topBridge) == 0, "ControllerOutputs.topBridge offset");
_Static_assert(offsetof(ControllerOutputs, bufferBridge) == 4, "ControllerOutputs.bufferBridge offset");
_Static_assert(offsetof(ControllerOutputs, safetyFirewall) == 8, "ControllerOutputs.safetyFirewall offset");
_Static_assert(offsetof(ControllerOutputs, raceFirewall) == 12, "ControllerOutputs.raceFirewall offset");
_Static_assert(offsetof(ControllerOutputs, spanMaster) == 16, "ControllerOutputs.spanMaster offset");
_Static_assert(offsetof(ControllerOutputs, phaseA) == 20, "ControllerOutputs.phaseA offset");
_Static_assert(offsetof(ControllerOutputs, phaseB) == 24, "ControllerOutputs.phaseB offset");
_Static_assert(offsetof(ControllerOutputs, returnBridge) == 28, "ControllerOutputs.returnBridge offset");
_Static_assert(offsetof(ControllerOutputs, exitDoor) == 32, "ControllerOutputs.exitDoor offset");
_Static_assert(offsetof(ControllerOutputs, physicalPhaseA) == 36, "ControllerOutputs.physicalPhaseA offset");
_Static_assert(offsetof(ControllerOutputs, physicalPhaseB) == 40, "ControllerOutputs.physicalPhaseB offset");
_Static_assert(offsetof(ControllerOutputs, physicalReturnBridge) == 44, "ControllerOutputs.physicalReturnBridge offset");
_Static_assert(offsetof(ControllerOutputs, exitUnlockCandidate) == 48, "ControllerOutputs.exitUnlockCandidate offset");
__declspec(dllexport) __declspec(noinline)
void bn_evaluate(const ControllerInputs *inputs, ControllerOutputs *outputs);
#endif
