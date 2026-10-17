#ifndef BN_USE_AFTER_FREE_CONTROLLER_H
#define BN_USE_AFTER_FREE_CONTROLLER_H
#include <stdint.h>
#include <stddef.h>

typedef struct ControllerInputs {
    uint32_t launch;
    uint32_t plateA;
    uint32_t plateB;
    uint32_t plateC;
    uint32_t assist;
} ControllerInputs;

typedef struct ControllerOutputs {
    uint32_t launchPower;
    uint32_t routeA;
    uint32_t routeB;
    uint32_t routeC;
    uint32_t assistBlocked;
    uint32_t exitReady;
} ControllerOutputs;

_Static_assert(sizeof(ControllerInputs) == 20, "Input ABI size");
_Static_assert(sizeof(ControllerOutputs) == 24, "Output ABI size");
_Static_assert(offsetof(ControllerInputs, launch) == 0, "Input ABI offset");
_Static_assert(offsetof(ControllerInputs, plateA) == 4, "Input ABI offset");
_Static_assert(offsetof(ControllerInputs, plateB) == 8, "Input ABI offset");
_Static_assert(offsetof(ControllerInputs, plateC) == 12, "Input ABI offset");
_Static_assert(offsetof(ControllerInputs, assist) == 16, "Input ABI offset");
_Static_assert(offsetof(ControllerOutputs, launchPower) == 0, "Output ABI offset");
_Static_assert(offsetof(ControllerOutputs, routeA) == 4, "Output ABI offset");
_Static_assert(offsetof(ControllerOutputs, routeB) == 8, "Output ABI offset");
_Static_assert(offsetof(ControllerOutputs, routeC) == 12, "Output ABI offset");
_Static_assert(offsetof(ControllerOutputs, assistBlocked) == 16, "Output ABI offset");
_Static_assert(offsetof(ControllerOutputs, exitReady) == 20, "Output ABI offset");
__declspec(dllexport) __declspec(noinline)
void bn_evaluate(const ControllerInputs *inputs, ControllerOutputs *outputs);
#endif
