#include "controller.h"

/* Snapshot equivalent of the current crossfeed-state.ts projection and unlock.
 * Canonical uint32 fields are Boolean. Server owns grace clocks and persistence.
 * The existing exit latch and this instant's unlock candidate stay separate.
 */
__declspec(dllexport) __declspec(noinline)
void bn_evaluate(const ControllerInputs *inputs, ControllerOutputs *outputs)
{
    uint32_t master = inputs->switchC && inputs->routePowerOccupied;
    uint32_t vault = inputs->cubeOnFinalLeft && inputs->cubeOnFinalRight;
    if (inputs->plateAOccupied && !inputs->switchB) outputs->grappleAnchor = 1;
    else outputs->grappleAnchor = 0;
    if (inputs->switchB) outputs->bridge = 1;
    else outputs->bridge = 0;
    if (inputs->cubeOnLiftCargo || inputs->switchC) outputs->liftField = 1;
    else outputs->liftField = 0;
    if (inputs->switchC) outputs->serviceAccess = 1;
    else outputs->serviceAccess = 0;
    if (inputs->switchC && !inputs->switchB) outputs->relayGates = 1;
    else outputs->relayGates = 0;
    if (master && !inputs->routeMode) outputs->leftRoute = 1;
    else outputs->leftRoute = 0;
    if (master && inputs->routeMode) outputs->rightRoute = 1;
    else outputs->rightRoute = 0;
    if (inputs->switchD) outputs->galleryAccess = 1;
    else outputs->galleryAccess = 0;
    if (vault) outputs->vaultPower = 1;
    else outputs->vaultPower = 0;
    if (vault) outputs->vaultReturn = 1;
    else outputs->vaultReturn = 0;
    if (inputs->exitUnlocked) outputs->exitDoor = 1;
    else outputs->exitDoor = 0;
    if (outputs->leftRoute || inputs->leftGraceActive) outputs->physicalLeftRoute = 1;
    else outputs->physicalLeftRoute = 0;
    if (outputs->rightRoute || inputs->rightGraceActive) outputs->physicalRightRoute = 1;
    else outputs->physicalRightRoute = 0;
    if (vault && inputs->finalPlateLeftOccupied && inputs->finalPlateRightOccupied) outputs->exitUnlockCandidate = 1;
    else outputs->exitUnlockCandidate = 0;
}
