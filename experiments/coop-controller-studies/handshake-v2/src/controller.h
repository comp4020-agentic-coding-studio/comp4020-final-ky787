#ifndef BN_HANDSHAKE_V2_CONTROLLER_H
#define BN_HANDSHAKE_V2_CONTROLLER_H
#include <stdint.h>
#include <stddef.h>

typedef struct ControllerInputs {
    uint32_t crossing;
    uint32_t liftPlate;
    uint32_t link;
    uint32_t maintenance;
    uint32_t exitSocket;
} ControllerInputs;

typedef struct ControllerOutputs {
    uint32_t crossingPower;
    uint32_t liftPower;
    uint32_t relayPower;
    uint32_t firewallActive;
    uint32_t exitReady;
} ControllerOutputs;

_Static_assert(sizeof(ControllerInputs) == 20, "Input ABI size");
_Static_assert(sizeof(ControllerOutputs) == 20, "Output ABI size");
_Static_assert(_Alignof(ControllerInputs) == 4, "Input ABI alignment");
_Static_assert(_Alignof(ControllerOutputs) == 4, "Output ABI alignment");
_Static_assert(offsetof(ControllerInputs, crossing) == 0, "crossing offset");
_Static_assert(offsetof(ControllerInputs, liftPlate) == 4, "liftPlate offset");
_Static_assert(offsetof(ControllerInputs, link) == 8, "link offset");
_Static_assert(offsetof(ControllerInputs, maintenance) == 12, "maintenance offset");
_Static_assert(offsetof(ControllerInputs, exitSocket) == 16, "exitSocket offset");
_Static_assert(offsetof(ControllerOutputs, crossingPower) == 0, "crossingPower offset");
_Static_assert(offsetof(ControllerOutputs, liftPower) == 4, "liftPower offset");
_Static_assert(offsetof(ControllerOutputs, relayPower) == 8, "relayPower offset");
_Static_assert(offsetof(ControllerOutputs, firewallActive) == 12, "firewallActive offset");
_Static_assert(offsetof(ControllerOutputs, exitReady) == 16, "exitReady offset");

__declspec(dllexport) __declspec(noinline)
void bn_evaluate(const ControllerInputs *inputs, ControllerOutputs *outputs);
#endif
