#ifndef BN_BYPASS_CONTROLLER_H
#define BN_BYPASS_CONTROLLER_H
#include <stdint.h>
#include <stddef.h>

typedef struct ControllerInputs {
    uint32_t anchorHold;
    uint32_t link;
    uint32_t bypassHold;
    uint32_t override;
} ControllerInputs;
typedef struct ControllerOutputs {
    uint32_t anchorPower;
    uint32_t bridgePower;
    uint32_t firewallActive;
    uint32_t exitReady;
} ControllerOutputs;

_Static_assert(sizeof(ControllerInputs) == 16, "Input ABI size");
_Static_assert(sizeof(ControllerOutputs) == 16, "Output ABI size");
_Static_assert(offsetof(ControllerInputs, anchorHold) == 0, "anchorHold offset");
_Static_assert(offsetof(ControllerInputs, link) == 4, "link offset");
_Static_assert(offsetof(ControllerInputs, bypassHold) == 8, "bypassHold offset");
_Static_assert(offsetof(ControllerInputs, override) == 12, "override offset");
_Static_assert(offsetof(ControllerOutputs, anchorPower) == 0, "anchorPower offset");
_Static_assert(offsetof(ControllerOutputs, bridgePower) == 4, "bridgePower offset");
_Static_assert(offsetof(ControllerOutputs, firewallActive) == 8, "firewallActive offset");
_Static_assert(offsetof(ControllerOutputs, exitReady) == 12, "exitReady offset");
__declspec(dllexport) __declspec(noinline)
void bn_evaluate(const ControllerInputs *inputs, ControllerOutputs *outputs);
#endif
