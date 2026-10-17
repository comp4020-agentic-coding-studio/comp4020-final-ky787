#include "controller.h"

/* Raw current-snapshot signals. Exit latch, cargo transport and manual catch
 * persistence remain server/game responsibilities. Inputs are canonical 0/1.
 */
__declspec(dllexport) __declspec(noinline)
void bn_evaluate(const ControllerInputs *inputs, ControllerOutputs *outputs)
{
    uint32_t payloadReady = inputs->payloadOne && inputs->payloadTwo && inputs->payloadThree;
    if (inputs->feed && inputs->safe) outputs->cargoLift = 1;
    else outputs->cargoLift = 0;
    if (!inputs->safe) outputs->shaftFirewall = 1;
    else outputs->shaftFirewall = 0;
    if ((inputs->safe && !inputs->feed) || payloadReady) outputs->serviceRelay = 1;
    else outputs->serviceRelay = 0;
    if (inputs->hatchToggle) outputs->hatchOpen = 1;
    else outputs->hatchOpen = 0;
    if (payloadReady) outputs->payloadReady = 1;
    else outputs->payloadReady = 0;
}
