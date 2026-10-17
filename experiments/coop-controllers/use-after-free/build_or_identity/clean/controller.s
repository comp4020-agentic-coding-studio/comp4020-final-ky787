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
.LBB0_2:                                # %if.else
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax], 0
.LBB0_3:                                # %if.end
	mov	rax, qword ptr [rsp]
	cmp	dword ptr [rax + 4], 0
	je	.LBB0_5
# %bb.4:                                # %if.then3
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 4], 1
	jmp	.LBB0_6
.LBB0_5:                                # %if.else4
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 4], 0
.LBB0_6:                                # %if.end6
	mov	rax, qword ptr [rsp]
	cmp	dword ptr [rax + 8], 0
	je	.LBB0_9
# %bb.7:                                # %land.lhs.true
	mov	rax, qword ptr [rsp]
	cmp	dword ptr [rax + 4], 0
	jne	.LBB0_9
# %bb.8:                                # %if.then10
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 8], 1
	jmp	.LBB0_10
.LBB0_9:                                # %if.else11
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 8], 0
.LBB0_10:                               # %if.end13
	mov	rax, qword ptr [rsp]
	cmp	dword ptr [rax + 12], 0
	je	.LBB0_13
# %bb.11:                               # %land.lhs.true15
	mov	rax, qword ptr [rsp]
	cmp	dword ptr [rax + 8], 0
	jne	.LBB0_13
# %bb.12:                               # %if.then18
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 12], 1
	jmp	.LBB0_14
.LBB0_13:                               # %if.else19
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 12], 0
.LBB0_14:                               # %if.end21
	mov	rax, qword ptr [rsp]
	cmp	dword ptr [rax + 16], 0
	je	.LBB0_16
# %bb.15:                               # %land.lhs.true23
	mov	rax, qword ptr [rsp]
	cmp	dword ptr [rax + 12], 0
	je	.LBB0_17
.LBB0_16:                               # %if.then26
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 16], 1
	jmp	.LBB0_18
.LBB0_17:                               # %if.else27
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 16], 0
.LBB0_18:                               # %if.end29
	mov	rax, qword ptr [rsp]
	cmp	dword ptr [rax + 16], 0
	je	.LBB0_20
# %bb.19:                               # %if.then32
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 20], 1
	jmp	.LBB0_21
.LBB0_20:                               # %if.else33
	mov	rax, qword ptr [rsp + 8]
	mov	dword ptr [rax + 20], 0
.LBB0_21:                               # %if.end35
	add	rsp, 16
	ret
	.seh_endproc
                                        # -- End function
	.section	.drectve,"yni"
	.ascii	" /EXPORT:bn_evaluate"
	.addrsig
