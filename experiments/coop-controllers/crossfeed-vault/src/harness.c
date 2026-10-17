#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <errno.h>
#include "controller.h"
/* Clean harness only: parse canonical vectors, invoke actual target, print fields.
 * No expected outputs, timer scheduling or gameplay expressions are computed here. */
static int allowed(unsigned index, unsigned long value) {
    if (index == 0) return value == 0u || value == 1u;
    if (index == 1) return value == 0u || value == 1u;
    if (index == 2) return value == 0u || value == 1u;
    if (index == 3) return value == 0u || value == 1u;
    if (index == 4) return value == 0u || value == 1u;
    if (index == 5) return value == 0u || value == 1u;
    if (index == 6) return value == 0u || value == 1u;
    if (index == 7) return value == 0u || value == 1u;
    if (index == 8) return value == 0u || value == 1u;
    if (index == 9) return value == 0u || value == 1u;
    if (index == 10) return value == 0u || value == 1u;
    if (index == 11) return value == 0u || value == 1u;
    if (index == 12) return value == 0u || value == 1u;
    if (index == 13) return value == 0u || value == 1u;
    return 0;
}
static int number(const char *text, unsigned index, uint32_t *out) {
    char *end; unsigned long value;
    if (*text < '0' || *text > '9') return 0;
    errno = 0; value = strtoul(text, &end, 10);
    if (errno || *end || !allowed(index,value)) return 0;
    *out = (uint32_t)value; return 1;
}
static void evaluate(const uint32_t values[14]) {
    ControllerInputs in; ControllerOutputs out;
    in.switchB = values[0];
    in.switchC = values[1];
    in.switchD = values[2];
    in.routeMode = values[3];
    in.plateAOccupied = values[4];
    in.routePowerOccupied = values[5];
    in.cubeOnLiftCargo = values[6];
    in.cubeOnFinalLeft = values[7];
    in.cubeOnFinalRight = values[8];
    in.finalPlateLeftOccupied = values[9];
    in.finalPlateRightOccupied = values[10];
    in.exitUnlocked = values[11];
    in.leftGraceActive = values[12];
    in.rightGraceActive = values[13];
    out.grappleAnchor = UINT32_C(0xA5A5A5A5);
    out.bridge = UINT32_C(0xA5A5A5A5);
    out.liftField = UINT32_C(0xA5A5A5A5);
    out.serviceAccess = UINT32_C(0xA5A5A5A5);
    out.relayGates = UINT32_C(0xA5A5A5A5);
    out.leftRoute = UINT32_C(0xA5A5A5A5);
    out.rightRoute = UINT32_C(0xA5A5A5A5);
    out.galleryAccess = UINT32_C(0xA5A5A5A5);
    out.vaultPower = UINT32_C(0xA5A5A5A5);
    out.vaultReturn = UINT32_C(0xA5A5A5A5);
    out.exitDoor = UINT32_C(0xA5A5A5A5);
    out.physicalLeftRoute = UINT32_C(0xA5A5A5A5);
    out.physicalRightRoute = UINT32_C(0xA5A5A5A5);
    out.exitUnlockCandidate = UINT32_C(0xA5A5A5A5);
    bn_evaluate(&in,&out);
    printf("{\"inputs\":{\"switchB\":%u,\"switchC\":%u,\"switchD\":%u,\"routeMode\":%u,\"plateAOccupied\":%u,\"routePowerOccupied\":%u,\"cubeOnLiftCargo\":%u,\"cubeOnFinalLeft\":%u,\"cubeOnFinalRight\":%u,\"finalPlateLeftOccupied\":%u,\"finalPlateRightOccupied\":%u,\"exitUnlocked\":%u,\"leftGraceActive\":%u,\"rightGraceActive\":%u},\"outputs\":{\"grappleAnchor\":%u,\"bridge\":%u,\"liftField\":%u,\"serviceAccess\":%u,\"relayGates\":%u,\"leftRoute\":%u,\"rightRoute\":%u,\"galleryAccess\":%u,\"vaultPower\":%u,\"vaultReturn\":%u,\"exitDoor\":%u,\"physicalLeftRoute\":%u,\"physicalRightRoute\":%u,\"exitUnlockCandidate\":%u}}\n", (unsigned)in.switchB, (unsigned)in.switchC, (unsigned)in.switchD, (unsigned)in.routeMode, (unsigned)in.plateAOccupied, (unsigned)in.routePowerOccupied, (unsigned)in.cubeOnLiftCargo, (unsigned)in.cubeOnFinalLeft, (unsigned)in.cubeOnFinalRight, (unsigned)in.finalPlateLeftOccupied, (unsigned)in.finalPlateRightOccupied, (unsigned)in.exitUnlocked, (unsigned)in.leftGraceActive, (unsigned)in.rightGraceActive, (unsigned)out.grappleAnchor, (unsigned)out.bridge, (unsigned)out.liftField, (unsigned)out.serviceAccess, (unsigned)out.relayGates, (unsigned)out.leftRoute, (unsigned)out.rightRoute, (unsigned)out.galleryAccess, (unsigned)out.vaultPower, (unsigned)out.vaultReturn, (unsigned)out.exitDoor, (unsigned)out.physicalLeftRoute, (unsigned)out.physicalRightRoute, (unsigned)out.exitUnlockCandidate);
}
int main(int argc,char **argv) {
    uint32_t values[14]; unsigned i;
    if (argc == 15) {
        for(i=0;i<14;i++) if(!number(argv[i+1],i,&values[i])) return 2;
        evaluate(values); return 0;
    }
    if (argc != 1) return 2;
    char line[4096];
    while(fgets(line,sizeof(line),stdin)) {
        char *p=line,*start;
        for(i=0;i<14;i++) {
            while(*p==' ' || *p=='\t') p++;
            start=p; while(*p && *p!=' ' && *p!='\t' && *p!='\n' && *p!='\r') p++;
            if(p==start) return 2;
            if(*p) *p++='\0';
            if(!number(start,i,&values[i])) return 2;
        }
        while(*p==' ' || *p=='\t' || *p=='\r' || *p=='\n') p++;
        if(*p) return 2;
        evaluate(values);
    }
    return ferror(stdin) ? 3 : 0;
}
