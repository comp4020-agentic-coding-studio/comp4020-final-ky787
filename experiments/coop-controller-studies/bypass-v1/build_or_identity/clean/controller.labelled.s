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
	jne	.LBB0_2
# %bb.1:                                # %lor.lhs.false
	mov	rax, qword ptr [rsp]
	cmp	dword ptr [rax + 4], 0
	je	.LBB0_3
	.globl audit_LBB0_2
audit_LBB0_2:
.LBB0_2:                                # %if.then
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax], 1
	jmp	.LBB0_4
	.globl audit_LBB0_3
audit_LBB0_3:
.LBB0_3:                                # %if.else
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax], 0
	.globl audit_LBB0_4
audit_LBB0_4:
.LBB0_4:                                # %if.end
	mov	rax, qword ptr [rsp]
	cmp	dword ptr [rax + 4], 0
	je	.LBB0_6
# %bb.5:                                # %if.then5
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 4], 1
	jmp	.LBB0_7
	.globl audit_LBB0_6
audit_LBB0_6:
.LBB0_6:                                # %if.else6
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 4], 0
	.globl audit_LBB0_7
audit_LBB0_7:
.LBB0_7:                                # %if.end8
	mov	rax, qword ptr [rsp]
	cmp	dword ptr [rax + 8], 0
	jne	.LBB0_9
# %bb.8:                                # %lor.lhs.false10
	mov	rax, qword ptr [rsp]
	cmp	dword ptr [rax + 12], 0
	je	.LBB0_10
	.globl audit_LBB0_9
audit_LBB0_9:
.LBB0_9:                                # %if.then12
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 8], 0
	jmp	.LBB0_11
	.globl audit_LBB0_10
audit_LBB0_10:
.LBB0_10:                               # %if.else13
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 8], 1
	.globl audit_LBB0_11
audit_LBB0_11:
.LBB0_11:                               # %if.end15
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 12], 1
	add	rsp, 16
	ret
	.seh_endproc
                                        # -- End function
	.section	.drectve,"yni"
	.ascii	" /EXPORT:bn_evaluate"
	.addrsig
