#include "controller.h"

/* Raw current-snapshot outputs. Binding inversion happens once in draftFrame,
 * outside this binary. Crumble, respawn and exit latch remain game systems.
 */
__declspec(dllexport) __declspec(noinline)
void bn_evaluate(const ControllerInputs *inputs, ControllerOutputs *outputs)
{
    if (inputs->launch) outputs->launchPower = 1;
    else outputs->launchPower = 0;
    if (inputs->plateA) outputs->routeA = 1;
    else outputs->routeA = 0;
    if (inputs->plateB && !inputs->plateA) outputs->routeB = 1;
    else outputs->routeB = 0;
    if (inputs->plateC && !inputs->plateB) outputs->routeC = 1;
    else outputs->routeC = 0;
    if (!(inputs->assist && !inputs->plateC)) outputs->assistBlocked = 1;
    else outputs->assistBlocked = 0;
    if (inputs->assist) outputs->exitReady = 1;
    else outputs->exitReady = 0;
}
