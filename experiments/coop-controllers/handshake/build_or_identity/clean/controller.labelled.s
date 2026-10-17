	.text
	.def	@feat.00;
	.scl	3;
	.type	0;
	.endef
	.globl	@feat.00
.set @feat.00, 0
	.intel_syntax noprefix
	.file	"controller.c"
	.def	bn_evaluate;
	.scl	2;
	.type	32;
	.endef
	.globl	bn_evaluate                     # -- Begin function bn_evaluate
	.p2align	4, 0x90
bn_evaluate:                            # @bn_evaluate
.seh_proc bn_evaluate
# %bb.0:                                # %entry
	sub	rsp, 16
	.seh_stackalloc 16
	.seh_endprologue
	mov	qword ptr [rsp + 8], rdx
	mov	qword ptr [rsp], rcx
	mov	rax, qword ptr [rsp]
	cmp	dword ptr [rax], 0
	je	.LBB0_2
# %bb.1:                                # %if.then
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax], 1
	jmp	.LBB0_3
	.globl audit_LBB0_2
audit_LBB0_2:
.LBB0_2:                                # %if.else
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax], 0
	.globl audit_LBB0_3
audit_LBB0_3:
.LBB0_3:                                # %if.end
	mov	rax, qword ptr [rsp]
	cmp	dword ptr [rax + 4], 0
	je	.LBB0_5
# %bb.4:                                # %if.then3
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 4], 1
	jmp	.LBB0_6
	.globl audit_LBB0_5
audit_LBB0_5:
.LBB0_5:                                # %if.else4
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 4], 0
	.globl audit_LBB0_6
audit_LBB0_6:
.LBB0_6:                                # %if.end6
	mov	rax, qword ptr [rsp]
	cmp	dword ptr [rax + 8], 0
	je	.LBB0_8
# %bb.7:                                # %if.then8
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 8], 1
	jmp	.LBB0_9
	.globl audit_LBB0_8
audit_LBB0_8:
.LBB0_8:                                # %if.else9
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 8], 0
	.globl audit_LBB0_9
audit_LBB0_9:
.LBB0_9:                                # %if.end11
	mov	rax, qword ptr [rsp]
	cmp	dword ptr [rax + 12], 0
	je	.LBB0_12
# %bb.10:                               # %land.lhs.true
	mov	rax, qword ptr [rsp]
	cmp	dword ptr [rax + 16], 0
	je	.LBB0_12
# %bb.11:                               # %if.then14
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 12], 1
	jmp	.LBB0_13
	.globl audit_LBB0_12
audit_LBB0_12:
.LBB0_12:                               # %if.else15
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 12], 0
	.globl audit_LBB0_13
audit_LBB0_13:
.LBB0_13:                               # %if.end17
	add	rsp, 16
	ret
	.seh_endproc
                                        # -- End function
	.section	.drectve,"yni"
	.ascii	" /EXPORT:bn_evaluate"
	.addrsig
