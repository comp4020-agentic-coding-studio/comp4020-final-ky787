#include "controller.h"

/* Snapshot equivalent of current race-state.ts projection/unlock, not a clock.
 * Booleans are canonical 0/1; bufferPhase: idle=0,window=1,released=2,expired=3.
 * All outputs are assigned; no state survives a call.
 */
__declspec(dllexport) __declspec(noinline)
void bn_evaluate(const ControllerInputs *inputs, ControllerOutputs *outputs)
{
    uint32_t master = inputs->payloadDelivered && inputs->traceOccupied;
    if (!inputs->dropA) outputs->topBridge = 1;
    else outputs->topBridge = 0;
    if (!inputs->dropB && (inputs->bufferPhase == 0 || inputs->bufferPhase == 1)) outputs->bufferBridge = 1;
    else outputs->bufferBridge = 0;
    if (!inputs->dropB || inputs->bufferPhase == 3) outputs->safetyFirewall = 1;
    else outputs->safetyFirewall = 0;
    if (inputs->dropA && inputs->dropB) outputs->raceFirewall = 1;
    else outputs->raceFirewall = 0;
    if (master) outputs->spanMaster = 1;
    else outputs->spanMaster = 0;
    if (master && !inputs->phase) outputs->phaseA = 1;
    else outputs->phaseA = 0;
    if (master && inputs->phase) outputs->phaseB = 1;
    else outputs->phaseB = 0;
    if (inputs->returnOccupied) outputs->returnBridge = 1;
    else outputs->returnBridge = 0;
    if (inputs->exitUnlocked) outputs->exitDoor = 1;
    else outputs->exitDoor = 0;
    if (outputs->phaseA || (inputs->phaseGraceActive && master)) outputs->physicalPhaseA = 1;
    else outputs->physicalPhaseA = 0;
    if (outputs->phaseB || (inputs->phaseGraceActive && master)) outputs->physicalPhaseB = 1;
    else outputs->physicalPhaseB = 0;
    if (outputs->returnBridge || inputs->returnGraceActive) outputs->physicalReturnBridge = 1;
    else outputs->physicalReturnBridge = 0;
    if (inputs->finalControl && inputs->payloadDelivered) outputs->exitUnlockCandidate = 1;
    else outputs->exitUnlockCandidate = 0;
}
