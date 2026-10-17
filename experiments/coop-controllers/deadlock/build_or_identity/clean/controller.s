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
	sub	rsp, 24
	.seh_stackalloc 24
	.seh_endprologue
	mov	qword ptr [rsp + 16], rdx
	mov	qword ptr [rsp + 8], rcx
	mov	rcx, qword ptr [rsp + 8]
	xor	eax, eax
                                        # kill: def $al killed $al killed $eax
	cmp	dword ptr [rcx + 12], 0
	mov	byte ptr [rsp + 3], al          # 1-byte Spill
	je	.LBB0_3
# %bb.1:                                # %land.lhs.true
	mov	rcx, qword ptr [rsp + 8]
	xor	eax, eax
                                        # kill: def $al killed $al killed $eax
	cmp	dword ptr [rcx + 16], 0
	mov	byte ptr [rsp + 3], al          # 1-byte Spill
	je	.LBB0_3
# %bb.2:                                # %land.rhs
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 20], 0
	setne	al
	mov	byte ptr [rsp + 3], al          # 1-byte Spill
.LBB0_3:                                # %land.end
	mov	al, byte ptr [rsp + 3]          # 1-byte Reload
	and	al, 1
	movzx	eax, al
	mov	dword ptr [rsp + 4], eax
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax], 0
	je	.LBB0_6
# %bb.4:                                # %land.lhs.true4
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 4], 0
	je	.LBB0_6
# %bb.5:                                # %if.then
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax], 1
	jmp	.LBB0_7
.LBB0_6:                                # %if.else
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax], 0
.LBB0_7:                                # %if.end
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 4], 0
	jne	.LBB0_9
# %bb.8:                                # %if.then9
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 4], 1
	jmp	.LBB0_10
.LBB0_9:                                # %if.else10
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 4], 0
.LBB0_10:                               # %if.end12
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 4], 0
	je	.LBB0_12
# %bb.11:                               # %land.lhs.true15
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax], 0
	je	.LBB0_13
.LBB0_12:                               # %lor.lhs.false
	cmp	dword ptr [rsp + 4], 0
	je	.LBB0_14
.LBB0_13:                               # %if.then19
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 8], 1
	jmp	.LBB0_15
.LBB0_14:                               # %if.else20
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 8], 0
.LBB0_15:                               # %if.end22
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 8], 0
	je	.LBB0_17
# %bb.16:                               # %if.then24
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 12], 1
	jmp	.LBB0_18
.LBB0_17:                               # %if.else25
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 12], 0
.LBB0_18:                               # %if.end27
	cmp	dword ptr [rsp + 4], 0
	je	.LBB0_20
# %bb.19:                               # %if.then29
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 16], 1
	jmp	.LBB0_21
.LBB0_20:                               # %if.else31
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 16], 0
.LBB0_21:                               # %if.end33
	add	rsp, 24
	ret
	.seh_endproc
                                        # -- End function
	.section	.drectve,"yni"
	.ascii	" /EXPORT:bn_evaluate"
	.addrsig
