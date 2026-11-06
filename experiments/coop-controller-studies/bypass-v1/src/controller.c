#include "controller.h"

/* Four canonical uint32 Boolean inputs. Stateless current decisions only.
 * Commitments, body occupancy, timers, exit latching and arrivals remain game-owned.
 * Finalized BYPASS has an unconditional exit unlock request and no final scanners.
 */
__declspec(dllexport) __declspec(noinline)
void bn_evaluate(const ControllerInputs *inputs, ControllerOutputs *outputs)
{
    if (inputs->anchorHold || inputs->link) outputs->anchorPower = 1;
    else outputs->anchorPower = 0;
    if (inputs->link) outputs->bridgePower = 1;
    else outputs->bridgePower = 0;
    if (inputs->bypassHold || inputs->override) outputs->firewallActive = 0;
    else outputs->firewallActive = 1;
    outputs->exitReady = 1;
}
