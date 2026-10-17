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
    return 0;
}
static int number(const char *text, unsigned index, uint32_t *out) {
    char *end; unsigned long value;
    if (*text < '0' || *text > '9') return 0;
    errno = 0; value = strtoul(text, &end, 10);
    if (errno || *end || !allowed(index,value)) return 0;
    *out = (uint32_t)value; return 1;
}
static void evaluate(const uint32_t values[6]) {
    ControllerInputs in; ControllerOutputs out;
    in.feed = values[0];
    in.safe = values[1];
    in.hatchToggle = values[2];
    in.payloadOne = values[3];
    in.payloadTwo = values[4];
    in.payloadThree = values[5];
    out.cargoLift = UINT32_C(0xA5A5A5A5);
    out.shaftFirewall = UINT32_C(0xA5A5A5A5);
    out.serviceRelay = UINT32_C(0xA5A5A5A5);
    out.hatchOpen = UINT32_C(0xA5A5A5A5);
    out.payloadReady = UINT32_C(0xA5A5A5A5);
    bn_evaluate(&in,&out);
    printf("{\"inputs\":{\"feed\":%u,\"safe\":%u,\"hatchToggle\":%u,\"payloadOne\":%u,\"payloadTwo\":%u,\"payloadThree\":%u},\"outputs\":{\"cargoLift\":%u,\"shaftFirewall\":%u,\"serviceRelay\":%u,\"hatchOpen\":%u,\"payloadReady\":%u}}\n", (unsigned)in.feed, (unsigned)in.safe, (unsigned)in.hatchToggle, (unsigned)in.payloadOne, (unsigned)in.payloadTwo, (unsigned)in.payloadThree, (unsigned)out.cargoLift, (unsigned)out.shaftFirewall, (unsigned)out.serviceRelay, (unsigned)out.hatchOpen, (unsigned)out.payloadReady);
}
int main(int argc,char **argv) {
    uint32_t values[6]; unsigned i;
    if (argc == 7) {
        for(i=0;i<6;i++) if(!number(argv[i+1],i,&values[i])) return 2;
        evaluate(values); return 0;
    }
    if (argc != 1) return 2;
    char line[4096];
    while(fgets(line,sizeof(line),stdin)) {
        char *p=line,*start;
        for(i=0;i<6;i++) {
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
