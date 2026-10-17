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
	push	rbp
	.seh_pushreg rbp
	sub	rsp, 80
	.seh_stackalloc 80
	lea	rbp, [rsp + 80]
	.seh_setframe rbp, 80
	.seh_endprologue
	mov	qword ptr [rbp - 16], rdx       # 8-byte Spill
	mov	qword ptr [rbp - 8], rcx        # 8-byte Spill
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_1
	jmp	.LBB0_66
	.globl audit_LBB0_1
audit_LBB0_1:
.LBB0_1:                                # %originalBB
	mov	rcx, qword ptr [rbp - 8]        # 8-byte Reload
	mov	r8, qword ptr [rbp - 16]        # 8-byte Reload
	mov	eax, 16
	mov	qword ptr [rbp - 48], rax       # 8-byte Spill
	call	__chkstk
	sub	rsp, rax
	mov	rax, qword ptr [rbp - 48]       # 8-byte Reload
	mov	rdx, rsp
	mov	qword ptr [rbp - 56], rdx       # 8-byte Spill
	call	__chkstk
	sub	rsp, rax
	mov	rax, qword ptr [rbp - 48]       # 8-byte Reload
	mov	r9, rsp
	mov	qword ptr [rbp - 40], r9        # 8-byte Spill
	call	__chkstk
	sub	rsp, rax
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	r9, rsp
	mov	qword ptr [rbp - 32], r9        # 8-byte Spill
	mov	qword ptr [rdx], r8
	mov	qword ptr [rax], rcx
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 12], 0
	setne	al
	mov	byte ptr [rbp - 17], al         # 1-byte Spill
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_2
	jmp	.LBB0_66
	.globl audit_LBB0_2
audit_LBB0_2:
.LBB0_2:                                # %originalBBpart2
	mov	cl, byte ptr [rbp - 17]         # 1-byte Reload
	xor	eax, eax
                                        # kill: def $al killed $al killed $eax
	test	cl, 1
	mov	byte ptr [rbp - 57], al         # 1-byte Spill
	jne	.LBB0_3
	jmp	.LBB0_9
	.globl audit_LBB0_3
audit_LBB0_3:
.LBB0_3:                                # %land.lhs.true
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_4
	jmp	.LBB0_67
	.globl audit_LBB0_4
audit_LBB0_4:
.LBB0_4:                                # %originalBB34
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 16], 0
	setne	al
	mov	byte ptr [rbp - 58], al         # 1-byte Spill
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_5
	jmp	.LBB0_67
	.globl audit_LBB0_5
audit_LBB0_5:
.LBB0_5:                                # %originalBBpart236
	mov	cl, byte ptr [rbp - 58]         # 1-byte Reload
	xor	eax, eax
                                        # kill: def $al killed $al killed $eax
	test	cl, 1
	mov	byte ptr [rbp - 57], al         # 1-byte Spill
	jne	.LBB0_6
	jmp	.LBB0_9
	.globl audit_LBB0_6
audit_LBB0_6:
.LBB0_6:                                # %land.rhs
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_7
	jmp	.LBB0_68
	.globl audit_LBB0_7
audit_LBB0_7:
.LBB0_7:                                # %originalBB38
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 20], 0
	setne	al
	mov	byte ptr [rbp - 59], al         # 1-byte Spill
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_8
	jmp	.LBB0_68
	.globl audit_LBB0_8
audit_LBB0_8:
.LBB0_8:                                # %originalBBpart240
	mov	al, byte ptr [rbp - 59]         # 1-byte Reload
	mov	byte ptr [rbp - 57], al         # 1-byte Spill
	jmp	.LBB0_9
	.globl audit_LBB0_9
audit_LBB0_9:
.LBB0_9:                                # %land.end
	mov	al, byte ptr [rbp - 57]         # 1-byte Reload
	mov	byte ptr [rbp - 60], al         # 1-byte Spill
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_10
	jmp	.LBB0_69
	.globl audit_LBB0_10
audit_LBB0_10:
.LBB0_10:                               # %originalBB42
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rcx, qword ptr [rbp - 32]       # 8-byte Reload
	mov	dl, byte ptr [rbp - 60]         # 1-byte Reload
	and	dl, 1
	movzx	edx, dl
	mov	dword ptr [rcx], edx
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax], 0
	setne	al
	mov	byte ptr [rbp - 61], al         # 1-byte Spill
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_11
	jmp	.LBB0_69
	.globl audit_LBB0_11
audit_LBB0_11:
.LBB0_11:                               # %originalBBpart244
	mov	al, byte ptr [rbp - 61]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_12
	jmp	.LBB0_18
	.globl audit_LBB0_12
audit_LBB0_12:
.LBB0_12:                               # %land.lhs.true4
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_13
	jmp	.LBB0_70
	.globl audit_LBB0_13
audit_LBB0_13:
.LBB0_13:                               # %originalBB46
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 4], 0
	setne	al
	mov	byte ptr [rbp - 62], al         # 1-byte Spill
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_14
	jmp	.LBB0_70
	.globl audit_LBB0_14
audit_LBB0_14:
.LBB0_14:                               # %originalBBpart248
	mov	al, byte ptr [rbp - 62]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_15
	jmp	.LBB0_18
	.globl audit_LBB0_15
audit_LBB0_15:
.LBB0_15:                               # %if.then
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_16
	jmp	.LBB0_71
	.globl audit_LBB0_16
audit_LBB0_16:
.LBB0_16:                               # %originalBB50
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax], 1
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_17
	jmp	.LBB0_71
	.globl audit_LBB0_17
audit_LBB0_17:
.LBB0_17:                               # %originalBBpart252
	jmp	.LBB0_21
	.globl audit_LBB0_18
audit_LBB0_18:
.LBB0_18:                               # %if.else
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_19
	jmp	.LBB0_72
	.globl audit_LBB0_19
audit_LBB0_19:
.LBB0_19:                               # %originalBB54
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax], 0
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_20
	jmp	.LBB0_72
	.globl audit_LBB0_20
audit_LBB0_20:
.LBB0_20:                               # %originalBBpart256
	jmp	.LBB0_21
	.globl audit_LBB0_21
audit_LBB0_21:
.LBB0_21:                               # %if.end
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_22
	jmp	.LBB0_73
	.globl audit_LBB0_22
audit_LBB0_22:
.LBB0_22:                               # %originalBB58
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 4], 0
	setne	al
	mov	byte ptr [rbp - 63], al         # 1-byte Spill
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_23
	jmp	.LBB0_73
	.globl audit_LBB0_23
audit_LBB0_23:
.LBB0_23:                               # %originalBBpart260
	mov	al, byte ptr [rbp - 63]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_27
	jmp	.LBB0_24
	.globl audit_LBB0_24
audit_LBB0_24:
.LBB0_24:                               # %if.then9
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_25
	jmp	.LBB0_74
	.globl audit_LBB0_25
audit_LBB0_25:
.LBB0_25:                               # %originalBB62
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 4], 1
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_26
	jmp	.LBB0_74
	.globl audit_LBB0_26
audit_LBB0_26:
.LBB0_26:                               # %originalBBpart264
	jmp	.LBB0_30
	.globl audit_LBB0_27
audit_LBB0_27:
.LBB0_27:                               # %if.else10
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_28
	jmp	.LBB0_75
	.globl audit_LBB0_28
audit_LBB0_28:
.LBB0_28:                               # %originalBB66
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 4], 0
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_29
	jmp	.LBB0_75
	.globl audit_LBB0_29
audit_LBB0_29:
.LBB0_29:                               # %originalBBpart268
	jmp	.LBB0_30
	.globl audit_LBB0_30
audit_LBB0_30:
.LBB0_30:                               # %if.end12
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_31
	jmp	.LBB0_76
	.globl audit_LBB0_31
audit_LBB0_31:
.LBB0_31:                               # %originalBB70
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 4], 0
	setne	al
	mov	byte ptr [rbp - 64], al         # 1-byte Spill
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_32
	jmp	.LBB0_76
	.globl audit_LBB0_32
audit_LBB0_32:
.LBB0_32:                               # %originalBBpart272
	mov	al, byte ptr [rbp - 64]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_33
	jmp	.LBB0_36
	.globl audit_LBB0_33
audit_LBB0_33:
.LBB0_33:                               # %land.lhs.true15
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_34
	jmp	.LBB0_77
	.globl audit_LBB0_34
audit_LBB0_34:
.LBB0_34:                               # %originalBB74
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax], 0
	setne	al
	mov	byte ptr [rbp - 65], al         # 1-byte Spill
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_35
	jmp	.LBB0_77
	.globl audit_LBB0_35
audit_LBB0_35:
.LBB0_35:                               # %originalBBpart276
	mov	al, byte ptr [rbp - 65]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_36
	jmp	.LBB0_39
	.globl audit_LBB0_36
audit_LBB0_36:
.LBB0_36:                               # %lor.lhs.false
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_37
	jmp	.LBB0_78
	.globl audit_LBB0_37
audit_LBB0_37:
.LBB0_37:                               # %originalBB78
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	cmp	dword ptr [rax], 0
	setne	al
	mov	byte ptr [rbp - 66], al         # 1-byte Spill
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_38
	jmp	.LBB0_78
	.globl audit_LBB0_38
audit_LBB0_38:
.LBB0_38:                               # %originalBBpart280
	mov	al, byte ptr [rbp - 66]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_39
	jmp	.LBB0_42
	.globl audit_LBB0_39
audit_LBB0_39:
.LBB0_39:                               # %if.then19
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_40
	jmp	.LBB0_79
	.globl audit_LBB0_40
audit_LBB0_40:
.LBB0_40:                               # %originalBB82
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 8], 1
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_41
	jmp	.LBB0_79
	.globl audit_LBB0_41
audit_LBB0_41:
.LBB0_41:                               # %originalBBpart284
	jmp	.LBB0_45
	.globl audit_LBB0_42
audit_LBB0_42:
.LBB0_42:                               # %if.else20
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_43
	jmp	.LBB0_80
	.globl audit_LBB0_43
audit_LBB0_43:
.LBB0_43:                               # %originalBB86
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 8], 0
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_44
	jmp	.LBB0_80
	.globl audit_LBB0_44
audit_LBB0_44:
.LBB0_44:                               # %originalBBpart288
	jmp	.LBB0_45
	.globl audit_LBB0_45
audit_LBB0_45:
.LBB0_45:                               # %if.end22
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_46
	jmp	.LBB0_81
	.globl audit_LBB0_46
audit_LBB0_46:
.LBB0_46:                               # %originalBB90
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 8], 0
	setne	al
	mov	byte ptr [rbp - 67], al         # 1-byte Spill
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_47
	jmp	.LBB0_81
	.globl audit_LBB0_47
audit_LBB0_47:
.LBB0_47:                               # %originalBBpart292
	mov	al, byte ptr [rbp - 67]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_48
	jmp	.LBB0_51
	.globl audit_LBB0_48
audit_LBB0_48:
.LBB0_48:                               # %if.then24
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_49
	jmp	.LBB0_82
	.globl audit_LBB0_49
audit_LBB0_49:
.LBB0_49:                               # %originalBB94
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 12], 1
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_50
	jmp	.LBB0_82
	.globl audit_LBB0_50
audit_LBB0_50:
.LBB0_50:                               # %originalBBpart296
	jmp	.LBB0_54
	.globl audit_LBB0_51
audit_LBB0_51:
.LBB0_51:                               # %if.else25
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_52
	jmp	.LBB0_83
	.globl audit_LBB0_52
audit_LBB0_52:
.LBB0_52:                               # %originalBB98
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 12], 0
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_53
	jmp	.LBB0_83
	.globl audit_LBB0_53
audit_LBB0_53:
.LBB0_53:                               # %originalBBpart2100
	jmp	.LBB0_54
	.globl audit_LBB0_54
audit_LBB0_54:
.LBB0_54:                               # %if.end27
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_55
	jmp	.LBB0_84
	.globl audit_LBB0_55
audit_LBB0_55:
.LBB0_55:                               # %originalBB102
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	cmp	dword ptr [rax], 0
	setne	al
	mov	byte ptr [rbp - 68], al         # 1-byte Spill
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_56
	jmp	.LBB0_84
	.globl audit_LBB0_56
audit_LBB0_56:
.LBB0_56:                               # %originalBBpart2104
	mov	al, byte ptr [rbp - 68]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_57
	jmp	.LBB0_60
	.globl audit_LBB0_57
audit_LBB0_57:
.LBB0_57:                               # %if.then29
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_58
	jmp	.LBB0_85
	.globl audit_LBB0_58
audit_LBB0_58:
.LBB0_58:                               # %originalBB106
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 16], 1
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_59
	jmp	.LBB0_85
	.globl audit_LBB0_59
audit_LBB0_59:
.LBB0_59:                               # %originalBBpart2108
	jmp	.LBB0_63
	.globl audit_LBB0_60
audit_LBB0_60:
.LBB0_60:                               # %if.else31
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_61
	jmp	.LBB0_86
	.globl audit_LBB0_61
audit_LBB0_61:
.LBB0_61:                               # %originalBB110
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 16], 0
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_62
	jmp	.LBB0_86
	.globl audit_LBB0_62
audit_LBB0_62:
.LBB0_62:                               # %originalBBpart2112
	jmp	.LBB0_63
	.globl audit_LBB0_63
audit_LBB0_63:
.LBB0_63:                               # %if.end33
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_64
	jmp	.LBB0_87
	.globl audit_LBB0_64
audit_LBB0_64:
.LBB0_64:                               # %originalBB114
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
	sub	edx, 1
	imul	eax, edx
	and	eax, 1
	cmp	eax, 0
	sete	al
	cmp	ecx, 10
	setl	cl
	or	al, cl
	test	al, 1
	jne	.LBB0_65
	jmp	.LBB0_87
	.globl audit_LBB0_65
audit_LBB0_65:
.LBB0_65:                               # %originalBBpart2116
	mov	rsp, rbp
	pop	rbp
	ret
	.globl audit_LBB0_66
audit_LBB0_66:
.LBB0_66:                               # %originalBBalteredBB
	mov	rcx, qword ptr [rbp - 8]        # 8-byte Reload
	mov	r8, qword ptr [rbp - 16]        # 8-byte Reload
	mov	eax, 16
	mov	qword ptr [rbp - 80], rax       # 8-byte Spill
	call	__chkstk
	sub	rsp, rax
	mov	rax, qword ptr [rbp - 80]       # 8-byte Reload
	mov	rdx, rsp
	call	__chkstk
	sub	rsp, rax
	mov	rax, rsp
	mov	qword ptr [rdx], r8
	mov	qword ptr [rax], rcx
	jmp	.LBB0_1
	.globl audit_LBB0_67
audit_LBB0_67:
.LBB0_67:                               # %originalBB34alteredBB
	jmp	.LBB0_4
	.globl audit_LBB0_68
audit_LBB0_68:
.LBB0_68:                               # %originalBB38alteredBB
	jmp	.LBB0_7
	.globl audit_LBB0_69
audit_LBB0_69:
.LBB0_69:                               # %originalBB42alteredBB
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	mov	cl, byte ptr [rbp - 60]         # 1-byte Reload
	and	cl, 1
	movzx	ecx, cl
	mov	dword ptr [rax], ecx
	jmp	.LBB0_10
	.globl audit_LBB0_70
audit_LBB0_70:
.LBB0_70:                               # %originalBB46alteredBB
	jmp	.LBB0_13
	.globl audit_LBB0_71
audit_LBB0_71:
.LBB0_71:                               # %originalBB50alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax], 1
	jmp	.LBB0_16
	.globl audit_LBB0_72
audit_LBB0_72:
.LBB0_72:                               # %originalBB54alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax], 0
	jmp	.LBB0_19
	.globl audit_LBB0_73
audit_LBB0_73:
.LBB0_73:                               # %originalBB58alteredBB
	jmp	.LBB0_22
	.globl audit_LBB0_74
audit_LBB0_74:
.LBB0_74:                               # %originalBB62alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 4], 1
	jmp	.LBB0_25
	.globl audit_LBB0_75
audit_LBB0_75:
.LBB0_75:                               # %originalBB66alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 4], 0
	jmp	.LBB0_28
	.globl audit_LBB0_76
audit_LBB0_76:
.LBB0_76:                               # %originalBB70alteredBB
	jmp	.LBB0_31
	.globl audit_LBB0_77
audit_LBB0_77:
.LBB0_77:                               # %originalBB74alteredBB
	jmp	.LBB0_34
	.globl audit_LBB0_78
audit_LBB0_78:
.LBB0_78:                               # %originalBB78alteredBB
	jmp	.LBB0_37
	.globl audit_LBB0_79
audit_LBB0_79:
.LBB0_79:                               # %originalBB82alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 8], 1
	jmp	.LBB0_40
	.globl audit_LBB0_80
audit_LBB0_80:
.LBB0_80:                               # %originalBB86alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 8], 0
	jmp	.LBB0_43
	.globl audit_LBB0_81
audit_LBB0_81:
.LBB0_81:                               # %originalBB90alteredBB
	jmp	.LBB0_46
	.globl audit_LBB0_82
audit_LBB0_82:
.LBB0_82:                               # %originalBB94alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 12], 1
	jmp	.LBB0_49
	.globl audit_LBB0_83
audit_LBB0_83:
.LBB0_83:                               # %originalBB98alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 12], 0
	jmp	.LBB0_52
	.globl audit_LBB0_84
audit_LBB0_84:
.LBB0_84:                               # %originalBB102alteredBB
	jmp	.LBB0_55
	.globl audit_LBB0_85
audit_LBB0_85:
.LBB0_85:                               # %originalBB106alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 16], 1
	jmp	.LBB0_58
	.globl audit_LBB0_86
audit_LBB0_86:
.LBB0_86:                               # %originalBB110alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 16], 0
	jmp	.LBB0_61
	.globl audit_LBB0_87
audit_LBB0_87:
.LBB0_87:                               # %originalBB114alteredBB
	jmp	.LBB0_64
	.seh_endproc
                                        # -- End function
	.comm	x,4,2                           # @x
	.comm	y,4,2                           # @y
	.section	.drectve,"yni"
	.ascii	" /EXPORT:bn_evaluate"
	.addrsig
	.addrsig_sym x
	.addrsig_sym y
