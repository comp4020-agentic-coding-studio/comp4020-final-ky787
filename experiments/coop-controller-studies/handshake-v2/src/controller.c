#include "controller.h"

/* Snapshot decisions only. The caller owns accepted occupancy and state.
 * Explicit branches preserve distinct, genuine zero/one stores at -O0.
 * The independent oracle executes the pinned TypeScript draft evaluator. */
__declspec(dllexport) __declspec(noinline)
void bn_evaluate(const ControllerInputs *in, ControllerOutputs *out) {
    if (in->crossing) out->crossingPower = 1; else out->crossingPower = 0;
    if (in->liftPlate) out->liftPower = 1; else out->liftPower = 0;
    if (in->link) out->relayPower = 1; else out->relayPower = 0;
    if (in->maintenance) out->firewallActive = 0; else out->firewallActive = 1;
    if (in->exitSocket) out->exitReady = 1; else out->exitReady = 0;
}
