#ifndef BN_HANDSHAKE_CONTROLLER_H
#define BN_HANDSHAKE_CONTROLLER_H
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
    uint32_t exitReady;
} ControllerOutputs;

_Static_assert(sizeof(ControllerInputs) == 20, "Input ABI size");
_Static_assert(sizeof(ControllerOutputs) == 16, "Output ABI size");
_Static_assert(offsetof(ControllerInputs, exitSocket) == 16, "Input ABI offset");
_Static_assert(offsetof(ControllerOutputs, exitReady) == 12, "Output ABI offset");
__declspec(dllexport) __declspec(noinline)
void bn_evaluate(const ControllerInputs *inputs, ControllerOutputs *outputs);
#endif
