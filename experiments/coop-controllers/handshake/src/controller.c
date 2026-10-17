#include "controller.h"

/* Canonical input domain: every field is 0 or 1. Each call is stateless.
 * These are raw declarative outputs. The game retains exit latching and arrivals.
 */
__declspec(dllexport) __declspec(noinline)
void bn_evaluate(const ControllerInputs *inputs, ControllerOutputs *outputs)
{
    if (inputs->crossing) outputs->crossingPower = 1;
    else outputs->crossingPower = 0;
    if (inputs->liftPlate) outputs->liftPower = 1;
    else outputs->liftPower = 0;
    if (inputs->link) outputs->relayPower = 1;
    else outputs->relayPower = 0;
    if (inputs->maintenance && inputs->exitSocket) outputs->exitReady = 1;
    else outputs->exitReady = 0;
}
