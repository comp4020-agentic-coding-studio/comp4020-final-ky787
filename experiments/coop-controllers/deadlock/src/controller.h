#ifndef BN_DEADLOCK_CONTROLLER_H
#define BN_DEADLOCK_CONTROLLER_H
#include <stdint.h>
#include <stddef.h>

typedef struct ControllerInputs {
    uint32_t feed;
    uint32_t safe;
    uint32_t hatchToggle;
    uint32_t payloadOne;
    uint32_t payloadTwo;
    uint32_t payloadThree;
} ControllerInputs;

typedef struct ControllerOutputs {
    uint32_t cargoLift;
    uint32_t shaftFirewall;
    uint32_t serviceRelay;
    uint32_t hatchOpen;
    uint32_t payloadReady;
} ControllerOutputs;

_Static_assert(sizeof(ControllerInputs) == 24, "Input ABI size");
_Static_assert(sizeof(ControllerOutputs) == 20, "Output ABI size");
_Static_assert(offsetof(ControllerInputs, feed) == 0, "Input ABI offset");
_Static_assert(offsetof(ControllerInputs, safe) == 4, "Input ABI offset");
_Static_assert(offsetof(ControllerInputs, hatchToggle) == 8, "Input ABI offset");
_Static_assert(offsetof(ControllerInputs, payloadOne) == 12, "Input ABI offset");
_Static_assert(offsetof(ControllerInputs, payloadTwo) == 16, "Input ABI offset");
_Static_assert(offsetof(ControllerInputs, payloadThree) == 20, "Input ABI offset");
_Static_assert(offsetof(ControllerOutputs, cargoLift) == 0, "Output ABI offset");
_Static_assert(offsetof(ControllerOutputs, shaftFirewall) == 4, "Output ABI offset");
_Static_assert(offsetof(ControllerOutputs, serviceRelay) == 8, "Output ABI offset");
_Static_assert(offsetof(ControllerOutputs, hatchOpen) == 12, "Output ABI offset");
_Static_assert(offsetof(ControllerOutputs, payloadReady) == 16, "Output ABI offset");
__declspec(dllexport) __declspec(noinline)
void bn_evaluate(const ControllerInputs *inputs, ControllerOutputs *outputs);
#endif
