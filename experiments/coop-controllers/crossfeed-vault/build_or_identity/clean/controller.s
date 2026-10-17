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
	sub	rsp, 32
	.seh_stackalloc 32
	.seh_endprologue
	mov	qword ptr [rsp + 24], rdx
	mov	qword ptr [rsp + 16], rcx
	mov	rcx, qword ptr [rsp + 16]
	xor	eax, eax
                                        # kill: def $al killed $al killed $eax
	cmp	dword ptr [rcx + 4], 0
	mov	byte ptr [rsp + 7], al          # 1-byte Spill
	je	.LBB0_2
# %bb.1:                                # %land.rhs
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax + 20], 0
	setne	al
	mov	byte ptr [rsp + 7], al          # 1-byte Spill
.LBB0_2:                                # %land.end
	mov	al, byte ptr [rsp + 7]          # 1-byte Reload
	and	al, 1
	movzx	eax, al
	mov	dword ptr [rsp + 12], eax
	mov	rcx, qword ptr [rsp + 16]
	xor	eax, eax
                                        # kill: def $al killed $al killed $eax
	cmp	dword ptr [rcx + 28], 0
	mov	byte ptr [rsp + 6], al          # 1-byte Spill
	je	.LBB0_4
# %bb.3:                                # %land.rhs3
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax + 32], 0
	setne	al
	mov	byte ptr [rsp + 6], al          # 1-byte Spill
.LBB0_4:                                # %land.end5
	mov	al, byte ptr [rsp + 6]          # 1-byte Reload
	and	al, 1
	movzx	eax, al
	mov	dword ptr [rsp + 8], eax
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax + 16], 0
	je	.LBB0_7
# %bb.5:                                # %land.lhs.true
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax], 0
	jne	.LBB0_7
# %bb.6:                                # %if.then
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax], 1
	jmp	.LBB0_8
.LBB0_7:                                # %if.else
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax], 0
.LBB0_8:                                # %if.end
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax], 0
	je	.LBB0_10
# %bb.9:                                # %if.then12
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 4], 1
	jmp	.LBB0_11
.LBB0_10:                               # %if.else13
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 4], 0
.LBB0_11:                               # %if.end15
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax + 24], 0
	jne	.LBB0_13
# %bb.12:                               # %lor.lhs.false
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax + 4], 0
	je	.LBB0_14
.LBB0_13:                               # %if.then19
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 8], 1
	jmp	.LBB0_15
.LBB0_14:                               # %if.else20
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 8], 0
.LBB0_15:                               # %if.end22
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax + 4], 0
	je	.LBB0_17
# %bb.16:                               # %if.then25
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 12], 1
	jmp	.LBB0_18
.LBB0_17:                               # %if.else26
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 12], 0
.LBB0_18:                               # %if.end28
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax + 4], 0
	je	.LBB0_21
# %bb.19:                               # %land.lhs.true31
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax], 0
	jne	.LBB0_21
# %bb.20:                               # %if.then34
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 16], 1
	jmp	.LBB0_22
.LBB0_21:                               # %if.else35
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 16], 0
.LBB0_22:                               # %if.end37
	cmp	dword ptr [rsp + 12], 0
	je	.LBB0_25
# %bb.23:                               # %land.lhs.true39
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax + 12], 0
	jne	.LBB0_25
# %bb.24:                               # %if.then41
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 20], 1
	jmp	.LBB0_26
.LBB0_25:                               # %if.else42
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 20], 0
.LBB0_26:                               # %if.end44
	cmp	dword ptr [rsp + 12], 0
	je	.LBB0_29
# %bb.27:                               # %land.lhs.true46
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax + 12], 0
	je	.LBB0_29
# %bb.28:                               # %if.then49
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 24], 1
	jmp	.LBB0_30
.LBB0_29:                               # %if.else50
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 24], 0
.LBB0_30:                               # %if.end52
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax + 8], 0
	je	.LBB0_32
# %bb.31:                               # %if.then54
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 28], 1
	jmp	.LBB0_33
.LBB0_32:                               # %if.else55
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 28], 0
.LBB0_33:                               # %if.end57
	cmp	dword ptr [rsp + 8], 0
	je	.LBB0_35
# %bb.34:                               # %if.then59
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 32], 1
	jmp	.LBB0_36
.LBB0_35:                               # %if.else60
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 32], 0
.LBB0_36:                               # %if.end62
	cmp	dword ptr [rsp + 8], 0
	je	.LBB0_38
# %bb.37:                               # %if.then64
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 36], 1
	jmp	.LBB0_39
.LBB0_38:                               # %if.else65
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 36], 0
.LBB0_39:                               # %if.end67
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax + 44], 0
	je	.LBB0_41
# %bb.40:                               # %if.then69
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 40], 1
	jmp	.LBB0_42
.LBB0_41:                               # %if.else70
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 40], 0
.LBB0_42:                               # %if.end72
	mov	rax, qword ptr [rsp + 24]
	cmp	dword ptr [rax + 20], 0
	jne	.LBB0_44
# %bb.43:                               # %lor.lhs.false75
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax + 48], 0
	je	.LBB0_45
.LBB0_44:                               # %if.then77
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 44], 1
	jmp	.LBB0_46
.LBB0_45:                               # %if.else78
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 44], 0
.LBB0_46:                               # %if.end80
	mov	rax, qword ptr [rsp + 24]
	cmp	dword ptr [rax + 24], 0
	jne	.LBB0_48
# %bb.47:                               # %lor.lhs.false83
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax + 52], 0
	je	.LBB0_49
.LBB0_48:                               # %if.then85
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 48], 1
	jmp	.LBB0_50
.LBB0_49:                               # %if.else86
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 48], 0
.LBB0_50:                               # %if.end88
	cmp	dword ptr [rsp + 8], 0
	je	.LBB0_54
# %bb.51:                               # %land.lhs.true90
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax + 36], 0
	je	.LBB0_54
# %bb.52:                               # %land.lhs.true92
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax + 40], 0
	je	.LBB0_54
# %bb.53:                               # %if.then94
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 52], 1
	jmp	.LBB0_55
.LBB0_54:                               # %if.else95
	mov	rax, qword ptr [rsp + 24]
	mov	dword ptr [rax + 52], 0
.LBB0_55:                               # %if.end97
	add	rsp, 32
	ret
	.seh_endproc
                                        # -- End function
	.section	.drectve,"yni"
	.ascii	" /EXPORT:bn_evaluate"
	.addrsig
