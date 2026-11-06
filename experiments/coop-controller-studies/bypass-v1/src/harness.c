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
    return 0;
}
static int number(const char *text, unsigned index, uint32_t *out) {
    char *end; unsigned long value;
    if (*text < '0' || *text > '9') return 0;
    errno = 0; value = strtoul(text, &end, 10);
    if (errno || *end || !allowed(index,value)) return 0;
    *out = (uint32_t)value; return 1;
}
static void evaluate(const uint32_t values[4]) {
    ControllerInputs in; ControllerOutputs out;
    in.anchorHold = values[0];
    in.link = values[1];
    in.bypassHold = values[2];
    in.override = values[3];
    out.anchorPower = UINT32_C(0xA5A5A5A5);
    out.bridgePower = UINT32_C(0xA5A5A5A5);
    out.firewallActive = UINT32_C(0xA5A5A5A5);
    out.exitReady = UINT32_C(0xA5A5A5A5);
    bn_evaluate(&in,&out);
    printf("{\"inputs\":{\"anchorHold\":%u,\"link\":%u,\"bypassHold\":%u,\"override\":%u},\"outputs\":{\"anchorPower\":%u,\"bridgePower\":%u,\"firewallActive\":%u,\"exitReady\":%u}}\n", (unsigned)in.anchorHold, (unsigned)in.link, (unsigned)in.bypassHold, (unsigned)in.override, (unsigned)out.anchorPower, (unsigned)out.bridgePower, (unsigned)out.firewallActive, (unsigned)out.exitReady);
}
int main(int argc,char **argv) {
    uint32_t values[4]; unsigned i;
    if (argc == 5) {
        for(i=0;i<4;i++) if(!number(argv[i+1],i,&values[i])) return 2;
        evaluate(values); return 0;
    }
    if (argc != 1) return 2;
    char line[4096];
    while(fgets(line,sizeof(line),stdin)) {
        char *p=line,*start;
        for(i=0;i<4;i++) {
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
