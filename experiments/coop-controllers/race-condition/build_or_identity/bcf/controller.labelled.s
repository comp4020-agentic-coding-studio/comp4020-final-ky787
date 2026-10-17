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
	sub	rsp, 96
	.seh_stackalloc 96
	lea	rbp, [rsp + 96]
	.seh_setframe rbp, 96
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
	jmp	.LBB0_162
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
	cmp	dword ptr [rax + 8], 0
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
	jmp	.LBB0_162
	.globl audit_LBB0_2
audit_LBB0_2:
.LBB0_2:                                # %originalBBpart2
	mov	cl, byte ptr [rbp - 17]         # 1-byte Reload
	xor	eax, eax
                                        # kill: def $al killed $al killed $eax
	test	cl, 1
	mov	byte ptr [rbp - 57], al         # 1-byte Spill
	jne	.LBB0_3
	jmp	.LBB0_6
	.globl audit_LBB0_3
audit_LBB0_3:
.LBB0_3:                                # %land.rhs
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
	jmp	.LBB0_163
	.globl audit_LBB0_4
audit_LBB0_4:
.LBB0_4:                                # %originalBB96
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 12], 0
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
	jmp	.LBB0_163
	.globl audit_LBB0_5
audit_LBB0_5:
.LBB0_5:                                # %originalBBpart298
	mov	al, byte ptr [rbp - 58]         # 1-byte Reload
	mov	byte ptr [rbp - 57], al         # 1-byte Spill
	jmp	.LBB0_6
	.globl audit_LBB0_6
audit_LBB0_6:
.LBB0_6:                                # %land.end
	mov	al, byte ptr [rbp - 57]         # 1-byte Reload
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
	jne	.LBB0_7
	jmp	.LBB0_164
	.globl audit_LBB0_7
audit_LBB0_7:
.LBB0_7:                                # %originalBB100
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rcx, qword ptr [rbp - 32]       # 8-byte Reload
	mov	dl, byte ptr [rbp - 59]         # 1-byte Reload
	and	dl, 1
	movzx	edx, dl
	mov	dword ptr [rcx], edx
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax], 0
	setne	al
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
	jne	.LBB0_8
	jmp	.LBB0_164
	.globl audit_LBB0_8
audit_LBB0_8:
.LBB0_8:                                # %originalBBpart2102
	mov	al, byte ptr [rbp - 60]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_12
	jmp	.LBB0_9
	.globl audit_LBB0_9
audit_LBB0_9:
.LBB0_9:                                # %if.then
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
	jmp	.LBB0_165
	.globl audit_LBB0_10
audit_LBB0_10:
.LBB0_10:                               # %originalBB104
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
	jne	.LBB0_11
	jmp	.LBB0_165
	.globl audit_LBB0_11
audit_LBB0_11:
.LBB0_11:                               # %originalBBpart2106
	jmp	.LBB0_15
	.globl audit_LBB0_12
audit_LBB0_12:
.LBB0_12:                               # %if.else
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
	jmp	.LBB0_166
	.globl audit_LBB0_13
audit_LBB0_13:
.LBB0_13:                               # %originalBB108
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
	jne	.LBB0_14
	jmp	.LBB0_166
	.globl audit_LBB0_14
audit_LBB0_14:
.LBB0_14:                               # %originalBBpart2110
	jmp	.LBB0_15
	.globl audit_LBB0_15
audit_LBB0_15:
.LBB0_15:                               # %if.end
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
	jmp	.LBB0_167
	.globl audit_LBB0_16
audit_LBB0_16:
.LBB0_16:                               # %originalBB112
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 4], 0
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
	jne	.LBB0_17
	jmp	.LBB0_167
	.globl audit_LBB0_17
audit_LBB0_17:
.LBB0_17:                               # %originalBBpart2114
	mov	al, byte ptr [rbp - 61]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_27
	jmp	.LBB0_18
	.globl audit_LBB0_18
audit_LBB0_18:
.LBB0_18:                               # %land.lhs.true
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
	jmp	.LBB0_168
	.globl audit_LBB0_19
audit_LBB0_19:
.LBB0_19:                               # %originalBB116
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 40], 0
	sete	al
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
	jne	.LBB0_20
	jmp	.LBB0_168
	.globl audit_LBB0_20
audit_LBB0_20:
.LBB0_20:                               # %originalBBpart2118
	mov	al, byte ptr [rbp - 62]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_24
	jmp	.LBB0_21
	.globl audit_LBB0_21
audit_LBB0_21:
.LBB0_21:                               # %lor.lhs.false
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
	jmp	.LBB0_169
	.globl audit_LBB0_22
audit_LBB0_22:
.LBB0_22:                               # %originalBB120
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 40], 1
	sete	al
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
	jmp	.LBB0_169
	.globl audit_LBB0_23
audit_LBB0_23:
.LBB0_23:                               # %originalBBpart2122
	mov	al, byte ptr [rbp - 63]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_24
	jmp	.LBB0_27
	.globl audit_LBB0_24
audit_LBB0_24:
.LBB0_24:                               # %if.then7
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
	jmp	.LBB0_170
	.globl audit_LBB0_25
audit_LBB0_25:
.LBB0_25:                               # %originalBB124
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
	jmp	.LBB0_170
	.globl audit_LBB0_26
audit_LBB0_26:
.LBB0_26:                               # %originalBBpart2126
	jmp	.LBB0_30
	.globl audit_LBB0_27
audit_LBB0_27:
.LBB0_27:                               # %if.else8
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
	jmp	.LBB0_171
	.globl audit_LBB0_28
audit_LBB0_28:
.LBB0_28:                               # %originalBB128
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
	jmp	.LBB0_171
	.globl audit_LBB0_29
audit_LBB0_29:
.LBB0_29:                               # %originalBBpart2130
	jmp	.LBB0_30
	.globl audit_LBB0_30
audit_LBB0_30:
.LBB0_30:                               # %if.end10
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
	jmp	.LBB0_172
	.globl audit_LBB0_31
audit_LBB0_31:
.LBB0_31:                               # %originalBB132
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
	jmp	.LBB0_172
	.globl audit_LBB0_32
audit_LBB0_32:
.LBB0_32:                               # %originalBBpart2134
	mov	al, byte ptr [rbp - 64]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_33
	jmp	.LBB0_36
	.globl audit_LBB0_33
audit_LBB0_33:
.LBB0_33:                               # %lor.lhs.false13
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
	jmp	.LBB0_173
	.globl audit_LBB0_34
audit_LBB0_34:
.LBB0_34:                               # %originalBB136
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 40], 3
	sete	al
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
	jmp	.LBB0_173
	.globl audit_LBB0_35
audit_LBB0_35:
.LBB0_35:                               # %originalBBpart2138
	mov	al, byte ptr [rbp - 65]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_36
	jmp	.LBB0_39
	.globl audit_LBB0_36
audit_LBB0_36:
.LBB0_36:                               # %if.then16
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
	jmp	.LBB0_174
	.globl audit_LBB0_37
audit_LBB0_37:
.LBB0_37:                               # %originalBB140
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
	jne	.LBB0_38
	jmp	.LBB0_174
	.globl audit_LBB0_38
audit_LBB0_38:
.LBB0_38:                               # %originalBBpart2142
	jmp	.LBB0_42
	.globl audit_LBB0_39
audit_LBB0_39:
.LBB0_39:                               # %if.else17
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
	jmp	.LBB0_175
	.globl audit_LBB0_40
audit_LBB0_40:
.LBB0_40:                               # %originalBB144
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
	jne	.LBB0_41
	jmp	.LBB0_175
	.globl audit_LBB0_41
audit_LBB0_41:
.LBB0_41:                               # %originalBBpart2146
	jmp	.LBB0_42
	.globl audit_LBB0_42
audit_LBB0_42:
.LBB0_42:                               # %if.end19
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
	jmp	.LBB0_176
	.globl audit_LBB0_43
audit_LBB0_43:
.LBB0_43:                               # %originalBB148
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
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
	jne	.LBB0_44
	jmp	.LBB0_176
	.globl audit_LBB0_44
audit_LBB0_44:
.LBB0_44:                               # %originalBBpart2150
	mov	al, byte ptr [rbp - 66]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_45
	jmp	.LBB0_51
	.globl audit_LBB0_45
audit_LBB0_45:
.LBB0_45:                               # %land.lhs.true22
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
	jmp	.LBB0_177
	.globl audit_LBB0_46
audit_LBB0_46:
.LBB0_46:                               # %originalBB152
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 4], 0
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
	jmp	.LBB0_177
	.globl audit_LBB0_47
audit_LBB0_47:
.LBB0_47:                               # %originalBBpart2154
	mov	al, byte ptr [rbp - 67]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_48
	jmp	.LBB0_51
	.globl audit_LBB0_48
audit_LBB0_48:
.LBB0_48:                               # %if.then25
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
	jmp	.LBB0_178
	.globl audit_LBB0_49
audit_LBB0_49:
.LBB0_49:                               # %originalBB156
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
	jmp	.LBB0_178
	.globl audit_LBB0_50
audit_LBB0_50:
.LBB0_50:                               # %originalBBpart2158
	jmp	.LBB0_54
	.globl audit_LBB0_51
audit_LBB0_51:
.LBB0_51:                               # %if.else26
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
	jmp	.LBB0_179
	.globl audit_LBB0_52
audit_LBB0_52:
.LBB0_52:                               # %originalBB160
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
	jmp	.LBB0_179
	.globl audit_LBB0_53
audit_LBB0_53:
.LBB0_53:                               # %originalBBpart2162
	jmp	.LBB0_54
	.globl audit_LBB0_54
audit_LBB0_54:
.LBB0_54:                               # %if.end28
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
	jmp	.LBB0_180
	.globl audit_LBB0_55
audit_LBB0_55:
.LBB0_55:                               # %originalBB164
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
	jmp	.LBB0_180
	.globl audit_LBB0_56
audit_LBB0_56:
.LBB0_56:                               # %originalBBpart2166
	mov	al, byte ptr [rbp - 68]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_57
	jmp	.LBB0_60
	.globl audit_LBB0_57
audit_LBB0_57:
.LBB0_57:                               # %if.then30
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
	jmp	.LBB0_181
	.globl audit_LBB0_58
audit_LBB0_58:
.LBB0_58:                               # %originalBB168
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
	jmp	.LBB0_181
	.globl audit_LBB0_59
audit_LBB0_59:
.LBB0_59:                               # %originalBBpart2170
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
	jmp	.LBB0_182
	.globl audit_LBB0_61
audit_LBB0_61:
.LBB0_61:                               # %originalBB172
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
	jmp	.LBB0_182
	.globl audit_LBB0_62
audit_LBB0_62:
.LBB0_62:                               # %originalBBpart2174
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
	jmp	.LBB0_183
	.globl audit_LBB0_64
audit_LBB0_64:
.LBB0_64:                               # %originalBB176
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	cmp	dword ptr [rax], 0
	setne	al
	mov	byte ptr [rbp - 69], al         # 1-byte Spill
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
	jmp	.LBB0_183
	.globl audit_LBB0_65
audit_LBB0_65:
.LBB0_65:                               # %originalBBpart2178
	mov	al, byte ptr [rbp - 69]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_66
	jmp	.LBB0_72
	.globl audit_LBB0_66
audit_LBB0_66:
.LBB0_66:                               # %land.lhs.true35
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
	jne	.LBB0_67
	jmp	.LBB0_184
	.globl audit_LBB0_67
audit_LBB0_67:
.LBB0_67:                               # %originalBB180
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 16], 0
	setne	al
	mov	byte ptr [rbp - 70], al         # 1-byte Spill
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
	jne	.LBB0_68
	jmp	.LBB0_184
	.globl audit_LBB0_68
audit_LBB0_68:
.LBB0_68:                               # %originalBBpart2182
	mov	al, byte ptr [rbp - 70]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_72
	jmp	.LBB0_69
	.globl audit_LBB0_69
audit_LBB0_69:
.LBB0_69:                               # %if.then37
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
	jne	.LBB0_70
	jmp	.LBB0_185
	.globl audit_LBB0_70
audit_LBB0_70:
.LBB0_70:                               # %originalBB184
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 20], 1
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
	jne	.LBB0_71
	jmp	.LBB0_185
	.globl audit_LBB0_71
audit_LBB0_71:
.LBB0_71:                               # %originalBBpart2186
	jmp	.LBB0_75
	.globl audit_LBB0_72
audit_LBB0_72:
.LBB0_72:                               # %if.else38
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
	jne	.LBB0_73
	jmp	.LBB0_186
	.globl audit_LBB0_73
audit_LBB0_73:
.LBB0_73:                               # %originalBB188
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 20], 0
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
	jne	.LBB0_74
	jmp	.LBB0_186
	.globl audit_LBB0_74
audit_LBB0_74:
.LBB0_74:                               # %originalBBpart2190
	jmp	.LBB0_75
	.globl audit_LBB0_75
audit_LBB0_75:
.LBB0_75:                               # %if.end40
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
	jne	.LBB0_76
	jmp	.LBB0_187
	.globl audit_LBB0_76
audit_LBB0_76:
.LBB0_76:                               # %originalBB192
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	cmp	dword ptr [rax], 0
	setne	al
	mov	byte ptr [rbp - 71], al         # 1-byte Spill
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
	jne	.LBB0_77
	jmp	.LBB0_187
	.globl audit_LBB0_77
audit_LBB0_77:
.LBB0_77:                               # %originalBBpart2194
	mov	al, byte ptr [rbp - 71]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_78
	jmp	.LBB0_84
	.globl audit_LBB0_78
audit_LBB0_78:
.LBB0_78:                               # %land.lhs.true42
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
	jne	.LBB0_79
	jmp	.LBB0_188
	.globl audit_LBB0_79
audit_LBB0_79:
.LBB0_79:                               # %originalBB196
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 16], 0
	setne	al
	mov	byte ptr [rbp - 72], al         # 1-byte Spill
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
	jne	.LBB0_80
	jmp	.LBB0_188
	.globl audit_LBB0_80
audit_LBB0_80:
.LBB0_80:                               # %originalBBpart2198
	mov	al, byte ptr [rbp - 72]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_81
	jmp	.LBB0_84
	.globl audit_LBB0_81
audit_LBB0_81:
.LBB0_81:                               # %if.then45
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
	jne	.LBB0_82
	jmp	.LBB0_189
	.globl audit_LBB0_82
audit_LBB0_82:
.LBB0_82:                               # %originalBB200
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 24], 1
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
	jne	.LBB0_83
	jmp	.LBB0_189
	.globl audit_LBB0_83
audit_LBB0_83:
.LBB0_83:                               # %originalBBpart2202
	jmp	.LBB0_87
	.globl audit_LBB0_84
audit_LBB0_84:
.LBB0_84:                               # %if.else46
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
	jne	.LBB0_85
	jmp	.LBB0_190
	.globl audit_LBB0_85
audit_LBB0_85:
.LBB0_85:                               # %originalBB204
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 24], 0
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
	jne	.LBB0_86
	jmp	.LBB0_190
	.globl audit_LBB0_86
audit_LBB0_86:
.LBB0_86:                               # %originalBBpart2206
	jmp	.LBB0_87
	.globl audit_LBB0_87
audit_LBB0_87:
.LBB0_87:                               # %if.end48
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
	jne	.LBB0_88
	jmp	.LBB0_191
	.globl audit_LBB0_88
audit_LBB0_88:
.LBB0_88:                               # %originalBB208
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 20], 0
	setne	al
	mov	byte ptr [rbp - 73], al         # 1-byte Spill
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
	jne	.LBB0_89
	jmp	.LBB0_191
	.globl audit_LBB0_89
audit_LBB0_89:
.LBB0_89:                               # %originalBBpart2210
	mov	al, byte ptr [rbp - 73]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_90
	jmp	.LBB0_93
	.globl audit_LBB0_90
audit_LBB0_90:
.LBB0_90:                               # %if.then50
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
	jne	.LBB0_91
	jmp	.LBB0_192
	.globl audit_LBB0_91
audit_LBB0_91:
.LBB0_91:                               # %originalBB212
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 28], 1
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
	jne	.LBB0_92
	jmp	.LBB0_192
	.globl audit_LBB0_92
audit_LBB0_92:
.LBB0_92:                               # %originalBBpart2214
	jmp	.LBB0_96
	.globl audit_LBB0_93
audit_LBB0_93:
.LBB0_93:                               # %if.else51
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
	jne	.LBB0_94
	jmp	.LBB0_193
	.globl audit_LBB0_94
audit_LBB0_94:
.LBB0_94:                               # %originalBB216
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 28], 0
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
	jne	.LBB0_95
	jmp	.LBB0_193
	.globl audit_LBB0_95
audit_LBB0_95:
.LBB0_95:                               # %originalBBpart2218
	jmp	.LBB0_96
	.globl audit_LBB0_96
audit_LBB0_96:
.LBB0_96:                               # %if.end53
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
	jne	.LBB0_97
	jmp	.LBB0_194
	.globl audit_LBB0_97
audit_LBB0_97:
.LBB0_97:                               # %originalBB220
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 28], 0
	setne	al
	mov	byte ptr [rbp - 74], al         # 1-byte Spill
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
	jne	.LBB0_98
	jmp	.LBB0_194
	.globl audit_LBB0_98
audit_LBB0_98:
.LBB0_98:                               # %originalBBpart2222
	mov	al, byte ptr [rbp - 74]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_99
	jmp	.LBB0_102
	.globl audit_LBB0_99
audit_LBB0_99:
.LBB0_99:                               # %if.then55
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
	jne	.LBB0_100
	jmp	.LBB0_195
	.globl audit_LBB0_100
audit_LBB0_100:
.LBB0_100:                              # %originalBB224
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 32], 1
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
	jne	.LBB0_101
	jmp	.LBB0_195
	.globl audit_LBB0_101
audit_LBB0_101:
.LBB0_101:                              # %originalBBpart2226
	jmp	.LBB0_105
	.globl audit_LBB0_102
audit_LBB0_102:
.LBB0_102:                              # %if.else56
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
	jne	.LBB0_103
	jmp	.LBB0_196
	.globl audit_LBB0_103
audit_LBB0_103:
.LBB0_103:                              # %originalBB228
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 32], 0
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
	jne	.LBB0_104
	jmp	.LBB0_196
	.globl audit_LBB0_104
audit_LBB0_104:
.LBB0_104:                              # %originalBBpart2230
	jmp	.LBB0_105
	.globl audit_LBB0_105
audit_LBB0_105:
.LBB0_105:                              # %if.end58
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
	jne	.LBB0_106
	jmp	.LBB0_197
	.globl audit_LBB0_106
audit_LBB0_106:
.LBB0_106:                              # %originalBB232
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 20], 0
	setne	al
	mov	byte ptr [rbp - 75], al         # 1-byte Spill
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
	jne	.LBB0_107
	jmp	.LBB0_197
	.globl audit_LBB0_107
audit_LBB0_107:
.LBB0_107:                              # %originalBBpart2234
	mov	al, byte ptr [rbp - 75]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_114
	jmp	.LBB0_108
	.globl audit_LBB0_108
audit_LBB0_108:
.LBB0_108:                              # %lor.lhs.false61
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
	jne	.LBB0_109
	jmp	.LBB0_198
	.globl audit_LBB0_109
audit_LBB0_109:
.LBB0_109:                              # %originalBB236
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 32], 0
	setne	al
	mov	byte ptr [rbp - 76], al         # 1-byte Spill
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
	jne	.LBB0_110
	jmp	.LBB0_198
	.globl audit_LBB0_110
audit_LBB0_110:
.LBB0_110:                              # %originalBBpart2238
	mov	al, byte ptr [rbp - 76]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_111
	jmp	.LBB0_117
	.globl audit_LBB0_111
audit_LBB0_111:
.LBB0_111:                              # %land.lhs.true63
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
	jne	.LBB0_112
	jmp	.LBB0_199
	.globl audit_LBB0_112
audit_LBB0_112:
.LBB0_112:                              # %originalBB240
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	cmp	dword ptr [rax], 0
	setne	al
	mov	byte ptr [rbp - 77], al         # 1-byte Spill
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
	jne	.LBB0_113
	jmp	.LBB0_199
	.globl audit_LBB0_113
audit_LBB0_113:
.LBB0_113:                              # %originalBBpart2242
	mov	al, byte ptr [rbp - 77]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_114
	jmp	.LBB0_117
	.globl audit_LBB0_114
audit_LBB0_114:
.LBB0_114:                              # %if.then65
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
	jne	.LBB0_115
	jmp	.LBB0_200
	.globl audit_LBB0_115
audit_LBB0_115:
.LBB0_115:                              # %originalBB244
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 36], 1
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
	jne	.LBB0_116
	jmp	.LBB0_200
	.globl audit_LBB0_116
audit_LBB0_116:
.LBB0_116:                              # %originalBBpart2246
	jmp	.LBB0_120
	.globl audit_LBB0_117
audit_LBB0_117:
.LBB0_117:                              # %if.else66
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
	jne	.LBB0_118
	jmp	.LBB0_201
	.globl audit_LBB0_118
audit_LBB0_118:
.LBB0_118:                              # %originalBB248
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 36], 0
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
	jne	.LBB0_119
	jmp	.LBB0_201
	.globl audit_LBB0_119
audit_LBB0_119:
.LBB0_119:                              # %originalBBpart2250
	jmp	.LBB0_120
	.globl audit_LBB0_120
audit_LBB0_120:
.LBB0_120:                              # %if.end68
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
	jne	.LBB0_121
	jmp	.LBB0_202
	.globl audit_LBB0_121
audit_LBB0_121:
.LBB0_121:                              # %originalBB252
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 24], 0
	setne	al
	mov	byte ptr [rbp - 78], al         # 1-byte Spill
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
	jne	.LBB0_122
	jmp	.LBB0_202
	.globl audit_LBB0_122
audit_LBB0_122:
.LBB0_122:                              # %originalBBpart2254
	mov	al, byte ptr [rbp - 78]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_129
	jmp	.LBB0_123
	.globl audit_LBB0_123
audit_LBB0_123:
.LBB0_123:                              # %lor.lhs.false71
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
	jne	.LBB0_124
	jmp	.LBB0_203
	.globl audit_LBB0_124
audit_LBB0_124:
.LBB0_124:                              # %originalBB256
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 32], 0
	setne	al
	mov	byte ptr [rbp - 79], al         # 1-byte Spill
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
	jne	.LBB0_125
	jmp	.LBB0_203
	.globl audit_LBB0_125
audit_LBB0_125:
.LBB0_125:                              # %originalBBpart2258
	mov	al, byte ptr [rbp - 79]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_126
	jmp	.LBB0_132
	.globl audit_LBB0_126
audit_LBB0_126:
.LBB0_126:                              # %land.lhs.true74
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
	jne	.LBB0_127
	jmp	.LBB0_204
	.globl audit_LBB0_127
audit_LBB0_127:
.LBB0_127:                              # %originalBB260
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	cmp	dword ptr [rax], 0
	setne	al
	mov	byte ptr [rbp - 80], al         # 1-byte Spill
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
	jne	.LBB0_128
	jmp	.LBB0_204
	.globl audit_LBB0_128
audit_LBB0_128:
.LBB0_128:                              # %originalBBpart2262
	mov	al, byte ptr [rbp - 80]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_129
	jmp	.LBB0_132
	.globl audit_LBB0_129
audit_LBB0_129:
.LBB0_129:                              # %if.then76
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
	jne	.LBB0_130
	jmp	.LBB0_205
	.globl audit_LBB0_130
audit_LBB0_130:
.LBB0_130:                              # %originalBB264
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 40], 1
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
	jne	.LBB0_131
	jmp	.LBB0_205
	.globl audit_LBB0_131
audit_LBB0_131:
.LBB0_131:                              # %originalBBpart2266
	jmp	.LBB0_135
	.globl audit_LBB0_132
audit_LBB0_132:
.LBB0_132:                              # %if.else77
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
	jne	.LBB0_133
	jmp	.LBB0_206
	.globl audit_LBB0_133
audit_LBB0_133:
.LBB0_133:                              # %originalBB268
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 40], 0
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
	jne	.LBB0_134
	jmp	.LBB0_206
	.globl audit_LBB0_134
audit_LBB0_134:
.LBB0_134:                              # %originalBBpart2270
	jmp	.LBB0_135
	.globl audit_LBB0_135
audit_LBB0_135:
.LBB0_135:                              # %if.end79
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
	jne	.LBB0_136
	jmp	.LBB0_207
	.globl audit_LBB0_136
audit_LBB0_136:
.LBB0_136:                              # %originalBB272
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 28], 0
	setne	al
	mov	byte ptr [rbp - 81], al         # 1-byte Spill
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
	jne	.LBB0_137
	jmp	.LBB0_207
	.globl audit_LBB0_137
audit_LBB0_137:
.LBB0_137:                              # %originalBBpart2274
	mov	al, byte ptr [rbp - 81]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_141
	jmp	.LBB0_138
	.globl audit_LBB0_138
audit_LBB0_138:
.LBB0_138:                              # %lor.lhs.false82
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
	jne	.LBB0_139
	jmp	.LBB0_208
	.globl audit_LBB0_139
audit_LBB0_139:
.LBB0_139:                              # %originalBB276
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 36], 0
	setne	al
	mov	byte ptr [rbp - 82], al         # 1-byte Spill
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
	jne	.LBB0_140
	jmp	.LBB0_208
	.globl audit_LBB0_140
audit_LBB0_140:
.LBB0_140:                              # %originalBBpart2278
	mov	al, byte ptr [rbp - 82]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_141
	jmp	.LBB0_144
	.globl audit_LBB0_141
audit_LBB0_141:
.LBB0_141:                              # %if.then84
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
	jne	.LBB0_142
	jmp	.LBB0_209
	.globl audit_LBB0_142
audit_LBB0_142:
.LBB0_142:                              # %originalBB280
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 44], 1
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
	jne	.LBB0_143
	jmp	.LBB0_209
	.globl audit_LBB0_143
audit_LBB0_143:
.LBB0_143:                              # %originalBBpart2282
	jmp	.LBB0_147
	.globl audit_LBB0_144
audit_LBB0_144:
.LBB0_144:                              # %if.else85
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
	jne	.LBB0_145
	jmp	.LBB0_210
	.globl audit_LBB0_145
audit_LBB0_145:
.LBB0_145:                              # %originalBB284
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 44], 0
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
	jne	.LBB0_146
	jmp	.LBB0_210
	.globl audit_LBB0_146
audit_LBB0_146:
.LBB0_146:                              # %originalBBpart2286
	jmp	.LBB0_147
	.globl audit_LBB0_147
audit_LBB0_147:
.LBB0_147:                              # %if.end87
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
	jne	.LBB0_148
	jmp	.LBB0_211
	.globl audit_LBB0_148
audit_LBB0_148:
.LBB0_148:                              # %originalBB288
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 24], 0
	setne	al
	mov	byte ptr [rbp - 83], al         # 1-byte Spill
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
	jne	.LBB0_149
	jmp	.LBB0_211
	.globl audit_LBB0_149
audit_LBB0_149:
.LBB0_149:                              # %originalBBpart2290
	mov	al, byte ptr [rbp - 83]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_150
	jmp	.LBB0_156
	.globl audit_LBB0_150
audit_LBB0_150:
.LBB0_150:                              # %land.lhs.true89
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
	jne	.LBB0_151
	jmp	.LBB0_212
	.globl audit_LBB0_151
audit_LBB0_151:
.LBB0_151:                              # %originalBB292
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 8], 0
	setne	al
	mov	byte ptr [rbp - 84], al         # 1-byte Spill
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
	jne	.LBB0_152
	jmp	.LBB0_212
	.globl audit_LBB0_152
audit_LBB0_152:
.LBB0_152:                              # %originalBBpart2294
	mov	al, byte ptr [rbp - 84]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_153
	jmp	.LBB0_156
	.globl audit_LBB0_153
audit_LBB0_153:
.LBB0_153:                              # %if.then92
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
	jne	.LBB0_154
	jmp	.LBB0_213
	.globl audit_LBB0_154
audit_LBB0_154:
.LBB0_154:                              # %originalBB296
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 48], 1
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
	jne	.LBB0_155
	jmp	.LBB0_213
	.globl audit_LBB0_155
audit_LBB0_155:
.LBB0_155:                              # %originalBBpart2298
	jmp	.LBB0_159
	.globl audit_LBB0_156
audit_LBB0_156:
.LBB0_156:                              # %if.else93
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
	jne	.LBB0_157
	jmp	.LBB0_214
	.globl audit_LBB0_157
audit_LBB0_157:
.LBB0_157:                              # %originalBB300
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 48], 0
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
	jne	.LBB0_158
	jmp	.LBB0_214
	.globl audit_LBB0_158
audit_LBB0_158:
.LBB0_158:                              # %originalBBpart2302
	jmp	.LBB0_159
	.globl audit_LBB0_159
audit_LBB0_159:
.LBB0_159:                              # %if.end95
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
	jne	.LBB0_160
	jmp	.LBB0_215
	.globl audit_LBB0_160
audit_LBB0_160:
.LBB0_160:                              # %originalBB304
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
	jne	.LBB0_161
	jmp	.LBB0_215
	.globl audit_LBB0_161
audit_LBB0_161:
.LBB0_161:                              # %originalBBpart2306
	mov	rsp, rbp
	pop	rbp
	ret
	.globl audit_LBB0_162
audit_LBB0_162:
.LBB0_162:                              # %originalBBalteredBB
	mov	rcx, qword ptr [rbp - 8]        # 8-byte Reload
	mov	r8, qword ptr [rbp - 16]        # 8-byte Reload
	mov	eax, 16
	mov	qword ptr [rbp - 96], rax       # 8-byte Spill
	call	__chkstk
	sub	rsp, rax
	mov	rax, qword ptr [rbp - 96]       # 8-byte Reload
	mov	rdx, rsp
	call	__chkstk
	sub	rsp, rax
	mov	rax, rsp
	mov	qword ptr [rdx], r8
	mov	qword ptr [rax], rcx
	jmp	.LBB0_1
	.globl audit_LBB0_163
audit_LBB0_163:
.LBB0_163:                              # %originalBB96alteredBB
	jmp	.LBB0_4
	.globl audit_LBB0_164
audit_LBB0_164:
.LBB0_164:                              # %originalBB100alteredBB
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	mov	cl, byte ptr [rbp - 59]         # 1-byte Reload
	and	cl, 1
	movzx	ecx, cl
	mov	dword ptr [rax], ecx
	jmp	.LBB0_7
	.globl audit_LBB0_165
audit_LBB0_165:
.LBB0_165:                              # %originalBB104alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax], 1
	jmp	.LBB0_10
	.globl audit_LBB0_166
audit_LBB0_166:
.LBB0_166:                              # %originalBB108alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax], 0
	jmp	.LBB0_13
	.globl audit_LBB0_167
audit_LBB0_167:
.LBB0_167:                              # %originalBB112alteredBB
	jmp	.LBB0_16
	.globl audit_LBB0_168
audit_LBB0_168:
.LBB0_168:                              # %originalBB116alteredBB
	jmp	.LBB0_19
	.globl audit_LBB0_169
audit_LBB0_169:
.LBB0_169:                              # %originalBB120alteredBB
	jmp	.LBB0_22
	.globl audit_LBB0_170
audit_LBB0_170:
.LBB0_170:                              # %originalBB124alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 4], 1
	jmp	.LBB0_25
	.globl audit_LBB0_171
audit_LBB0_171:
.LBB0_171:                              # %originalBB128alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 4], 0
	jmp	.LBB0_28
	.globl audit_LBB0_172
audit_LBB0_172:
.LBB0_172:                              # %originalBB132alteredBB
	jmp	.LBB0_31
	.globl audit_LBB0_173
audit_LBB0_173:
.LBB0_173:                              # %originalBB136alteredBB
	jmp	.LBB0_34
	.globl audit_LBB0_174
audit_LBB0_174:
.LBB0_174:                              # %originalBB140alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 8], 1
	jmp	.LBB0_37
	.globl audit_LBB0_175
audit_LBB0_175:
.LBB0_175:                              # %originalBB144alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 8], 0
	jmp	.LBB0_40
	.globl audit_LBB0_176
audit_LBB0_176:
.LBB0_176:                              # %originalBB148alteredBB
	jmp	.LBB0_43
	.globl audit_LBB0_177
audit_LBB0_177:
.LBB0_177:                              # %originalBB152alteredBB
	jmp	.LBB0_46
	.globl audit_LBB0_178
audit_LBB0_178:
.LBB0_178:                              # %originalBB156alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 12], 1
	jmp	.LBB0_49
	.globl audit_LBB0_179
audit_LBB0_179:
.LBB0_179:                              # %originalBB160alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 12], 0
	jmp	.LBB0_52
	.globl audit_LBB0_180
audit_LBB0_180:
.LBB0_180:                              # %originalBB164alteredBB
	jmp	.LBB0_55
	.globl audit_LBB0_181
audit_LBB0_181:
.LBB0_181:                              # %originalBB168alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 16], 1
	jmp	.LBB0_58
	.globl audit_LBB0_182
audit_LBB0_182:
.LBB0_182:                              # %originalBB172alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 16], 0
	jmp	.LBB0_61
	.globl audit_LBB0_183
audit_LBB0_183:
.LBB0_183:                              # %originalBB176alteredBB
	jmp	.LBB0_64
	.globl audit_LBB0_184
audit_LBB0_184:
.LBB0_184:                              # %originalBB180alteredBB
	jmp	.LBB0_67
	.globl audit_LBB0_185
audit_LBB0_185:
.LBB0_185:                              # %originalBB184alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 20], 1
	jmp	.LBB0_70
	.globl audit_LBB0_186
audit_LBB0_186:
.LBB0_186:                              # %originalBB188alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 20], 0
	jmp	.LBB0_73
	.globl audit_LBB0_187
audit_LBB0_187:
.LBB0_187:                              # %originalBB192alteredBB
	jmp	.LBB0_76
	.globl audit_LBB0_188
audit_LBB0_188:
.LBB0_188:                              # %originalBB196alteredBB
	jmp	.LBB0_79
	.globl audit_LBB0_189
audit_LBB0_189:
.LBB0_189:                              # %originalBB200alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 24], 1
	jmp	.LBB0_82
	.globl audit_LBB0_190
audit_LBB0_190:
.LBB0_190:                              # %originalBB204alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 24], 0
	jmp	.LBB0_85
	.globl audit_LBB0_191
audit_LBB0_191:
.LBB0_191:                              # %originalBB208alteredBB
	jmp	.LBB0_88
	.globl audit_LBB0_192
audit_LBB0_192:
.LBB0_192:                              # %originalBB212alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 28], 1
	jmp	.LBB0_91
	.globl audit_LBB0_193
audit_LBB0_193:
.LBB0_193:                              # %originalBB216alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 28], 0
	jmp	.LBB0_94
	.globl audit_LBB0_194
audit_LBB0_194:
.LBB0_194:                              # %originalBB220alteredBB
	jmp	.LBB0_97
	.globl audit_LBB0_195
audit_LBB0_195:
.LBB0_195:                              # %originalBB224alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 32], 1
	jmp	.LBB0_100
	.globl audit_LBB0_196
audit_LBB0_196:
.LBB0_196:                              # %originalBB228alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 32], 0
	jmp	.LBB0_103
	.globl audit_LBB0_197
audit_LBB0_197:
.LBB0_197:                              # %originalBB232alteredBB
	jmp	.LBB0_106
	.globl audit_LBB0_198
audit_LBB0_198:
.LBB0_198:                              # %originalBB236alteredBB
	jmp	.LBB0_109
	.globl audit_LBB0_199
audit_LBB0_199:
.LBB0_199:                              # %originalBB240alteredBB
	jmp	.LBB0_112
	.globl audit_LBB0_200
audit_LBB0_200:
.LBB0_200:                              # %originalBB244alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 36], 1
	jmp	.LBB0_115
	.globl audit_LBB0_201
audit_LBB0_201:
.LBB0_201:                              # %originalBB248alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 36], 0
	jmp	.LBB0_118
	.globl audit_LBB0_202
audit_LBB0_202:
.LBB0_202:                              # %originalBB252alteredBB
	jmp	.LBB0_121
	.globl audit_LBB0_203
audit_LBB0_203:
.LBB0_203:                              # %originalBB256alteredBB
	jmp	.LBB0_124
	.globl audit_LBB0_204
audit_LBB0_204:
.LBB0_204:                              # %originalBB260alteredBB
	jmp	.LBB0_127
	.globl audit_LBB0_205
audit_LBB0_205:
.LBB0_205:                              # %originalBB264alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 40], 1
	jmp	.LBB0_130
	.globl audit_LBB0_206
audit_LBB0_206:
.LBB0_206:                              # %originalBB268alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 40], 0
	jmp	.LBB0_133
	.globl audit_LBB0_207
audit_LBB0_207:
.LBB0_207:                              # %originalBB272alteredBB
	jmp	.LBB0_136
	.globl audit_LBB0_208
audit_LBB0_208:
.LBB0_208:                              # %originalBB276alteredBB
	jmp	.LBB0_139
	.globl audit_LBB0_209
audit_LBB0_209:
.LBB0_209:                              # %originalBB280alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 44], 1
	jmp	.LBB0_142
	.globl audit_LBB0_210
audit_LBB0_210:
.LBB0_210:                              # %originalBB284alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 44], 0
	jmp	.LBB0_145
	.globl audit_LBB0_211
audit_LBB0_211:
.LBB0_211:                              # %originalBB288alteredBB
	jmp	.LBB0_148
	.globl audit_LBB0_212
audit_LBB0_212:
.LBB0_212:                              # %originalBB292alteredBB
	jmp	.LBB0_151
	.globl audit_LBB0_213
audit_LBB0_213:
.LBB0_213:                              # %originalBB296alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 48], 1
	jmp	.LBB0_154
	.globl audit_LBB0_214
audit_LBB0_214:
.LBB0_214:                              # %originalBB300alteredBB
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 48], 0
	jmp	.LBB0_157
	.globl audit_LBB0_215
audit_LBB0_215:
.LBB0_215:                              # %originalBB304alteredBB
	jmp	.LBB0_160
	.seh_endproc
                                        # -- End function
	.comm	x,4,2                           # @x
	.comm	y,4,2                           # @y
	.section	.drectve,"yni"
	.ascii	" /EXPORT:bn_evaluate"
	.addrsig
	.addrsig_sym x
	.addrsig_sym y
