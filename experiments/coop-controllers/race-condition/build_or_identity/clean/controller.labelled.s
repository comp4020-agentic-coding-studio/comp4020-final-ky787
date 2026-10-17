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
	cmp	dword ptr [rcx + 8], 0
	mov	byte ptr [rsp + 3], al          # 1-byte Spill
	je	.LBB0_2
# %bb.1:                                # %land.rhs
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 12], 0
	setne	al
	mov	byte ptr [rsp + 3], al          # 1-byte Spill
	.globl audit_LBB0_2
audit_LBB0_2:
.LBB0_2:                                # %land.end
	mov	al, byte ptr [rsp + 3]          # 1-byte Reload
	and	al, 1
	movzx	eax, al
	mov	dword ptr [rsp + 4], eax
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax], 0
	jne	.LBB0_4
# %bb.3:                                # %if.then
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax], 1
	jmp	.LBB0_5
	.globl audit_LBB0_4
audit_LBB0_4:
.LBB0_4:                                # %if.else
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax], 0
	.globl audit_LBB0_5
audit_LBB0_5:
.LBB0_5:                                # %if.end
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 4], 0
	jne	.LBB0_9
# %bb.6:                                # %land.lhs.true
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 40], 0
	je	.LBB0_8
# %bb.7:                                # %lor.lhs.false
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 40], 1
	jne	.LBB0_9
	.globl audit_LBB0_8
audit_LBB0_8:
.LBB0_8:                                # %if.then7
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 4], 1
	jmp	.LBB0_10
	.globl audit_LBB0_9
audit_LBB0_9:
.LBB0_9:                                # %if.else8
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 4], 0
	.globl audit_LBB0_10
audit_LBB0_10:
.LBB0_10:                               # %if.end10
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 4], 0
	je	.LBB0_12
# %bb.11:                               # %lor.lhs.false13
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 40], 3
	jne	.LBB0_13
	.globl audit_LBB0_12
audit_LBB0_12:
.LBB0_12:                               # %if.then16
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 8], 1
	jmp	.LBB0_14
	.globl audit_LBB0_13
audit_LBB0_13:
.LBB0_13:                               # %if.else17
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 8], 0
	.globl audit_LBB0_14
audit_LBB0_14:
.LBB0_14:                               # %if.end19
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax], 0
	je	.LBB0_17
# %bb.15:                               # %land.lhs.true22
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 4], 0
	je	.LBB0_17
# %bb.16:                               # %if.then25
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 12], 1
	jmp	.LBB0_18
	.globl audit_LBB0_17
audit_LBB0_17:
.LBB0_17:                               # %if.else26
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 12], 0
	.globl audit_LBB0_18
audit_LBB0_18:
.LBB0_18:                               # %if.end28
	cmp	dword ptr [rsp + 4], 0
	je	.LBB0_20
# %bb.19:                               # %if.then30
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 16], 1
	jmp	.LBB0_21
	.globl audit_LBB0_20
audit_LBB0_20:
.LBB0_20:                               # %if.else31
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 16], 0
	.globl audit_LBB0_21
audit_LBB0_21:
.LBB0_21:                               # %if.end33
	cmp	dword ptr [rsp + 4], 0
	je	.LBB0_24
# %bb.22:                               # %land.lhs.true35
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 16], 0
	jne	.LBB0_24
# %bb.23:                               # %if.then37
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 20], 1
	jmp	.LBB0_25
	.globl audit_LBB0_24
audit_LBB0_24:
.LBB0_24:                               # %if.else38
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 20], 0
	.globl audit_LBB0_25
audit_LBB0_25:
.LBB0_25:                               # %if.end40
	cmp	dword ptr [rsp + 4], 0
	je	.LBB0_28
# %bb.26:                               # %land.lhs.true42
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 16], 0
	je	.LBB0_28
# %bb.27:                               # %if.then45
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 24], 1
	jmp	.LBB0_29
	.globl audit_LBB0_28
audit_LBB0_28:
.LBB0_28:                               # %if.else46
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 24], 0
	.globl audit_LBB0_29
audit_LBB0_29:
.LBB0_29:                               # %if.end48
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 20], 0
	je	.LBB0_31
# %bb.30:                               # %if.then50
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 28], 1
	jmp	.LBB0_32
	.globl audit_LBB0_31
audit_LBB0_31:
.LBB0_31:                               # %if.else51
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 28], 0
	.globl audit_LBB0_32
audit_LBB0_32:
.LBB0_32:                               # %if.end53
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 28], 0
	je	.LBB0_34
# %bb.33:                               # %if.then55
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 32], 1
	jmp	.LBB0_35
	.globl audit_LBB0_34
audit_LBB0_34:
.LBB0_34:                               # %if.else56
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 32], 0
	.globl audit_LBB0_35
audit_LBB0_35:
.LBB0_35:                               # %if.end58
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax + 20], 0
	jne	.LBB0_38
# %bb.36:                               # %lor.lhs.false61
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 32], 0
	je	.LBB0_39
# %bb.37:                               # %land.lhs.true63
	cmp	dword ptr [rsp + 4], 0
	je	.LBB0_39
	.globl audit_LBB0_38
audit_LBB0_38:
.LBB0_38:                               # %if.then65
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 36], 1
	jmp	.LBB0_40
	.globl audit_LBB0_39
audit_LBB0_39:
.LBB0_39:                               # %if.else66
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 36], 0
	.globl audit_LBB0_40
audit_LBB0_40:
.LBB0_40:                               # %if.end68
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax + 24], 0
	jne	.LBB0_43
# %bb.41:                               # %lor.lhs.false71
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 32], 0
	je	.LBB0_44
# %bb.42:                               # %land.lhs.true74
	cmp	dword ptr [rsp + 4], 0
	je	.LBB0_44
	.globl audit_LBB0_43
audit_LBB0_43:
.LBB0_43:                               # %if.then76
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 40], 1
	jmp	.LBB0_45
	.globl audit_LBB0_44
audit_LBB0_44:
.LBB0_44:                               # %if.else77
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 40], 0
	.globl audit_LBB0_45
audit_LBB0_45:
.LBB0_45:                               # %if.end79
	mov	rax, qword ptr [rsp + 16]
	cmp	dword ptr [rax + 28], 0
	jne	.LBB0_47
# %bb.46:                               # %lor.lhs.false82
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 36], 0
	je	.LBB0_48
	.globl audit_LBB0_47
audit_LBB0_47:
.LBB0_47:                               # %if.then84
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 44], 1
	jmp	.LBB0_49
	.globl audit_LBB0_48
audit_LBB0_48:
.LBB0_48:                               # %if.else85
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 44], 0
	.globl audit_LBB0_49
audit_LBB0_49:
.LBB0_49:                               # %if.end87
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 24], 0
	je	.LBB0_52
# %bb.50:                               # %land.lhs.true89
	mov	rax, qword ptr [rsp + 8]
	cmp	dword ptr [rax + 8], 0
	je	.LBB0_52
# %bb.51:                               # %if.then92
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 48], 1
	jmp	.LBB0_53
	.globl audit_LBB0_52
audit_LBB0_52:
.LBB0_52:                               # %if.else93
	mov	rax, qword ptr [rsp + 16]
	mov	dword ptr [rax + 48], 0
	.globl audit_LBB0_53
audit_LBB0_53:
.LBB0_53:                               # %if.end95
	add	rsp, 24
	ret
	.seh_endproc
                                        # -- End function
	.section	.drectve,"yni"
	.ascii	" /EXPORT:bn_evaluate"
	.addrsig
