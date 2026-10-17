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
    if (index == 10) return value == 0u || value == 1u || value == 2u || value == 3u;
    return 0;
}
static int number(const char *text, unsigned index, uint32_t *out) {
    char *end; unsigned long value;
    if (*text < '0' || *text > '9') return 0;
    errno = 0; value = strtoul(text, &end, 10);
    if (errno || *end || !allowed(index,value)) return 0;
    *out = (uint32_t)value; return 1;
}
static void evaluate(const uint32_t values[11]) {
    ControllerInputs in; ControllerOutputs out;
    in.dropA = values[0];
    in.dropB = values[1];
    in.payloadDelivered = values[2];
    in.traceOccupied = values[3];
    in.phase = values[4];
    in.returnOccupied = values[5];
    in.finalControl = values[6];
    in.exitUnlocked = values[7];
    in.phaseGraceActive = values[8];
    in.returnGraceActive = values[9];
    in.bufferPhase = values[10];
    out.topBridge = UINT32_C(0xA5A5A5A5);
    out.bufferBridge = UINT32_C(0xA5A5A5A5);
    out.safetyFirewall = UINT32_C(0xA5A5A5A5);
    out.raceFirewall = UINT32_C(0xA5A5A5A5);
    out.spanMaster = UINT32_C(0xA5A5A5A5);
    out.phaseA = UINT32_C(0xA5A5A5A5);
    out.phaseB = UINT32_C(0xA5A5A5A5);
    out.returnBridge = UINT32_C(0xA5A5A5A5);
    out.exitDoor = UINT32_C(0xA5A5A5A5);
    out.physicalPhaseA = UINT32_C(0xA5A5A5A5);
    out.physicalPhaseB = UINT32_C(0xA5A5A5A5);
    out.physicalReturnBridge = UINT32_C(0xA5A5A5A5);
    out.exitUnlockCandidate = UINT32_C(0xA5A5A5A5);
    bn_evaluate(&in,&out);
    printf("{\"inputs\":{\"dropA\":%u,\"dropB\":%u,\"payloadDelivered\":%u,\"traceOccupied\":%u,\"phase\":%u,\"returnOccupied\":%u,\"finalControl\":%u,\"exitUnlocked\":%u,\"phaseGraceActive\":%u,\"returnGraceActive\":%u,\"bufferPhase\":%u},\"outputs\":{\"topBridge\":%u,\"bufferBridge\":%u,\"safetyFirewall\":%u,\"raceFirewall\":%u,\"spanMaster\":%u,\"phaseA\":%u,\"phaseB\":%u,\"returnBridge\":%u,\"exitDoor\":%u,\"physicalPhaseA\":%u,\"physicalPhaseB\":%u,\"physicalReturnBridge\":%u,\"exitUnlockCandidate\":%u}}\n", (unsigned)in.dropA, (unsigned)in.dropB, (unsigned)in.payloadDelivered, (unsigned)in.traceOccupied, (unsigned)in.phase, (unsigned)in.returnOccupied, (unsigned)in.finalControl, (unsigned)in.exitUnlocked, (unsigned)in.phaseGraceActive, (unsigned)in.returnGraceActive, (unsigned)in.bufferPhase, (unsigned)out.topBridge, (unsigned)out.bufferBridge, (unsigned)out.safetyFirewall, (unsigned)out.raceFirewall, (unsigned)out.spanMaster, (unsigned)out.phaseA, (unsigned)out.phaseB, (unsigned)out.returnBridge, (unsigned)out.exitDoor, (unsigned)out.physicalPhaseA, (unsigned)out.physicalPhaseB, (unsigned)out.physicalReturnBridge, (unsigned)out.exitUnlockCandidate);
}
int main(int argc,char **argv) {
    uint32_t values[11]; unsigned i;
    if (argc == 12) {
        for(i=0;i<11;i++) if(!number(argv[i+1],i,&values[i])) return 2;
        evaluate(values); return 0;
    }
    if (argc != 1) return 2;
    char line[4096];
    while(fgets(line,sizeof(line),stdin)) {
        char *p=line,*start;
        for(i=0;i<11;i++) {
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
