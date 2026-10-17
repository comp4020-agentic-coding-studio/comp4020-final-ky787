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
	sub	rsp, 64
	.seh_stackalloc 64
	lea	rbp, [rsp + 64]
	.seh_setframe rbp, 64
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
	jmp	.LBB0_42
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
	mov	qword ptr [rbp - 40], rdx       # 8-byte Spill
	call	__chkstk
	sub	rsp, rax
	mov	rax, rsp
	mov	qword ptr [rbp - 32], rax       # 8-byte Spill
	mov	qword ptr [rdx], r8
	mov	qword ptr [rax], rcx
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax], 0
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
	jmp	.LBB0_42
	.globl audit_LBB0_2
audit_LBB0_2:
.LBB0_2:                                # %originalBBpart2
	mov	al, byte ptr [rbp - 17]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_3
	jmp	.LBB0_6
	.globl audit_LBB0_3
audit_LBB0_3:
.LBB0_3:                                # %if.then
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
	jmp	.LBB0_43
	.globl audit_LBB0_4
audit_LBB0_4:
.LBB0_4:                                # %originalBB18
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
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
	jne	.LBB0_5
	jmp	.LBB0_43
	.globl audit_LBB0_5
audit_LBB0_5:
.LBB0_5:                                # %originalBBpart220
	jmp	.LBB0_9
	.globl audit_LBB0_6
audit_LBB0_6:
.LBB0_6:                                # %if.else
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
	jmp	.LBB0_44
	.globl audit_LBB0_7
audit_LBB0_7:
.LBB0_7:                                # %originalBB22
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
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
	jne	.LBB0_8
	jmp	.LBB0_44
	.globl audit_LBB0_8
audit_LBB0_8:
.LBB0_8:                                # %originalBBpart224
	jmp	.LBB0_9
	.globl audit_LBB0_9
audit_LBB0_9:
.LBB0_9:                                # %if.end
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
	jmp	.LBB0_45
	.globl audit_LBB0_10
audit_LBB0_10:
.LBB0_10:                               # %originalBB26
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 4], 0
	setne	al
	mov	byte ptr [rbp - 49], al         # 1-byte Spill
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
	jmp	.LBB0_45
	.globl audit_LBB0_11
audit_LBB0_11:
.LBB0_11:                               # %originalBBpart228
	mov	al, byte ptr [rbp - 49]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_12
	jmp	.LBB0_15
	.globl audit_LBB0_12
audit_LBB0_12:
.LBB0_12:                               # %if.then3
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
	jmp	.LBB0_46
	.globl audit_LBB0_13
audit_LBB0_13:
.LBB0_13:                               # %originalBB30
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
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
	jne	.LBB0_14
	jmp	.LBB0_46
	.globl audit_LBB0_14
audit_LBB0_14:
.LBB0_14:                               # %originalBBpart232
	jmp	.LBB0_18
	.globl audit_LBB0_15
audit_LBB0_15:
.LBB0_15:                               # %if.else4
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
	jmp	.LBB0_47
	.globl audit_LBB0_16
audit_LBB0_16:
.LBB0_16:                               # %originalBB34
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
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
	jne	.LBB0_17
	jmp	.LBB0_47
	.globl audit_LBB0_17
audit_LBB0_17:
.LBB0_17:                               # %originalBBpart236
	jmp	.LBB0_18
	.globl audit_LBB0_18
audit_LBB0_18:
.LBB0_18:                               # %if.end6
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
	jmp	.LBB0_48
	.globl audit_LBB0_19
audit_LBB0_19:
.LBB0_19:                               # %originalBB38
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 8], 0
	setne	al
	mov	byte ptr [rbp - 50], al         # 1-byte Spill
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
	jmp	.LBB0_48
	.globl audit_LBB0_20
audit_LBB0_20:
.LBB0_20:                               # %originalBBpart240
	mov	al, byte ptr [rbp - 50]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_21
	jmp	.LBB0_24
	.globl audit_LBB0_21
audit_LBB0_21:
.LBB0_21:                               # %if.then8
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
	jmp	.LBB0_49
	.globl audit_LBB0_22
audit_LBB0_22:
.LBB0_22:                               # %originalBB42
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
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
	jne	.LBB0_23
	jmp	.LBB0_49
	.globl audit_LBB0_23
audit_LBB0_23:
.LBB0_23:                               # %originalBBpart244
	jmp	.LBB0_27
	.globl audit_LBB0_24
audit_LBB0_24:
.LBB0_24:                               # %if.else9
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
	jmp	.LBB0_50
	.globl audit_LBB0_25
audit_LBB0_25:
.LBB0_25:                               # %originalBB46
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
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
	jne	.LBB0_26
	jmp	.LBB0_50
	.globl audit_LBB0_26
audit_LBB0_26:
.LBB0_26:                               # %originalBBpart248
	jmp	.LBB0_27
	.globl audit_LBB0_27
audit_LBB0_27:
.LBB0_27:                               # %if.end11
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
	jmp	.LBB0_51
	.globl audit_LBB0_28
audit_LBB0_28:
.LBB0_28:                               # %originalBB50
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 12], 0
	setne	al
	mov	byte ptr [rbp - 51], al         # 1-byte Spill
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
	jmp	.LBB0_51
	.globl audit_LBB0_29
audit_LBB0_29:
.LBB0_29:                               # %originalBBpart252
	mov	al, byte ptr [rbp - 51]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_30
	jmp	.LBB0_36
	.globl audit_LBB0_30
audit_LBB0_30:
.LBB0_30:                               # %land.lhs.true
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
	jmp	.LBB0_52
	.globl audit_LBB0_31
audit_LBB0_31:
.LBB0_31:                               # %originalBB54
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 16], 0
	setne	al
	mov	byte ptr [rbp - 52], al         # 1-byte Spill
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
	jmp	.LBB0_52
	.globl audit_LBB0_32
audit_LBB0_32:
.LBB0_32:                               # %originalBBpart256
	mov	al, byte ptr [rbp - 52]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_33
	jmp	.LBB0_36
	.globl audit_LBB0_33
audit_LBB0_33:
.LBB0_33:                               # %if.then14
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
	jmp	.LBB0_53
	.globl audit_LBB0_34
audit_LBB0_34:
.LBB0_34:                               # %originalBB58
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
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
	jne	.LBB0_35
	jmp	.LBB0_53
	.globl audit_LBB0_35
audit_LBB0_35:
.LBB0_35:                               # %originalBBpart260
	jmp	.LBB0_39
	.globl audit_LBB0_36
audit_LBB0_36:
.LBB0_36:                               # %if.else15
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
	jmp	.LBB0_54
	.globl audit_LBB0_37
audit_LBB0_37:
.LBB0_37:                               # %originalBB62
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
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
	jne	.LBB0_38
	jmp	.LBB0_54
	.globl audit_LBB0_38
audit_LBB0_38:
.LBB0_38:                               # %originalBBpart264
	jmp	.LBB0_39
	.globl audit_LBB0_39
audit_LBB0_39:
.LBB0_39:                               # %if.end17
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
	jmp	.LBB0_55
	.globl audit_LBB0_40
audit_LBB0_40:
.LBB0_40:                               # %originalBB66
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
	jmp	.LBB0_55
	.globl audit_LBB0_41
audit_LBB0_41:
.LBB0_41:                               # %originalBBpart268
	mov	rsp, rbp
	pop	rbp
	ret
	.globl audit_LBB0_42
audit_LBB0_42:
.LBB0_42:                               # %originalBBalteredBB
	mov	rcx, qword ptr [rbp - 8]        # 8-byte Reload
	mov	r8, qword ptr [rbp - 16]        # 8-byte Reload
	mov	eax, 16
	mov	qword ptr [rbp - 64], rax       # 8-byte Spill
	call	__chkstk
	sub	rsp, rax
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rdx, rsp
	call	__chkstk
	sub	rsp, rax
	mov	rax, rsp
	mov	qword ptr [rdx], r8
	mov	qword ptr [rax], rcx
	jmp	.LBB0_1
	.globl audit_LBB0_43
audit_LBB0_43:
.LBB0_43:                               # %originalBB18alteredBB
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax], 1
	jmp	.LBB0_4
	.globl audit_LBB0_44
audit_LBB0_44:
.LBB0_44:                               # %originalBB22alteredBB
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax], 0
	jmp	.LBB0_7
	.globl audit_LBB0_45
audit_LBB0_45:
.LBB0_45:                               # %originalBB26alteredBB
	jmp	.LBB0_10
	.globl audit_LBB0_46
audit_LBB0_46:
.LBB0_46:                               # %originalBB30alteredBB
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 4], 1
	jmp	.LBB0_13
	.globl audit_LBB0_47
audit_LBB0_47:
.LBB0_47:                               # %originalBB34alteredBB
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 4], 0
	jmp	.LBB0_16
	.globl audit_LBB0_48
audit_LBB0_48:
.LBB0_48:                               # %originalBB38alteredBB
	jmp	.LBB0_19
	.globl audit_LBB0_49
audit_LBB0_49:
.LBB0_49:                               # %originalBB42alteredBB
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 8], 1
	jmp	.LBB0_22
	.globl audit_LBB0_50
audit_LBB0_50:
.LBB0_50:                               # %originalBB46alteredBB
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 8], 0
	jmp	.LBB0_25
	.globl audit_LBB0_51
audit_LBB0_51:
.LBB0_51:                               # %originalBB50alteredBB
	jmp	.LBB0_28
	.globl audit_LBB0_52
audit_LBB0_52:
.LBB0_52:                               # %originalBB54alteredBB
	jmp	.LBB0_31
	.globl audit_LBB0_53
audit_LBB0_53:
.LBB0_53:                               # %originalBB58alteredBB
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 12], 1
	jmp	.LBB0_34
	.globl audit_LBB0_54
audit_LBB0_54:
.LBB0_54:                               # %originalBB62alteredBB
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 12], 0
	jmp	.LBB0_37
	.globl audit_LBB0_55
audit_LBB0_55:
.LBB0_55:                               # %originalBB66alteredBB
	jmp	.LBB0_40
	.seh_endproc
                                        # -- End function
	.comm	x,4,2                           # @x
	.comm	y,4,2                           # @y
	.section	.drectve,"yni"
	.ascii	" /EXPORT:bn_evaluate"
	.addrsig
	.addrsig_sym x
	.addrsig_sym y
