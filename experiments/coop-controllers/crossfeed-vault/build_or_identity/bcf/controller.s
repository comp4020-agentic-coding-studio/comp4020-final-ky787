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
	sub	rsp, 112
	.seh_stackalloc 112
	lea	rbp, [rsp + 112]
	.seh_setframe rbp, 112
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
	jmp	.LBB0_168
.LBB0_1:                                # %originalBB
	mov	rcx, qword ptr [rbp - 8]        # 8-byte Reload
	mov	r8, qword ptr [rbp - 16]        # 8-byte Reload
	mov	eax, 16
	mov	qword ptr [rbp - 56], rax       # 8-byte Spill
	call	__chkstk
	sub	rsp, rax
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	rdx, rsp
	mov	qword ptr [rbp - 64], rdx       # 8-byte Spill
	call	__chkstk
	sub	rsp, rax
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	r9, rsp
	mov	qword ptr [rbp - 40], r9        # 8-byte Spill
	call	__chkstk
	sub	rsp, rax
	mov	rax, qword ptr [rbp - 56]       # 8-byte Reload
	mov	r9, rsp
	mov	qword ptr [rbp - 48], r9        # 8-byte Spill
	call	__chkstk
	sub	rsp, rax
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	r9, rsp
	mov	qword ptr [rbp - 32], r9        # 8-byte Spill
	mov	qword ptr [rdx], r8
	mov	qword ptr [rax], rcx
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 4], 0
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
	jmp	.LBB0_168
.LBB0_2:                                # %originalBBpart2
	mov	cl, byte ptr [rbp - 17]         # 1-byte Reload
	xor	eax, eax
                                        # kill: def $al killed $al killed $eax
	test	cl, 1
	mov	byte ptr [rbp - 65], al         # 1-byte Spill
	jne	.LBB0_3
	jmp	.LBB0_6
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
	jmp	.LBB0_169
.LBB0_4:                                # %originalBB98
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 20], 0
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
	jne	.LBB0_5
	jmp	.LBB0_169
.LBB0_5:                                # %originalBBpart2100
	mov	al, byte ptr [rbp - 66]         # 1-byte Reload
	mov	byte ptr [rbp - 65], al         # 1-byte Spill
	jmp	.LBB0_6
.LBB0_6:                                # %land.end
	mov	al, byte ptr [rbp - 65]         # 1-byte Reload
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
	jne	.LBB0_7
	jmp	.LBB0_170
.LBB0_7:                                # %originalBB102
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rcx, qword ptr [rbp - 48]       # 8-byte Reload
	mov	dl, byte ptr [rbp - 67]         # 1-byte Reload
	and	dl, 1
	movzx	edx, dl
	mov	dword ptr [rcx], edx
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 28], 0
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
	jne	.LBB0_8
	jmp	.LBB0_170
.LBB0_8:                                # %originalBBpart2104
	mov	cl, byte ptr [rbp - 68]         # 1-byte Reload
	xor	eax, eax
                                        # kill: def $al killed $al killed $eax
	test	cl, 1
	mov	byte ptr [rbp - 69], al         # 1-byte Spill
	jne	.LBB0_9
	jmp	.LBB0_12
.LBB0_9:                                # %land.rhs3
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
	jmp	.LBB0_171
.LBB0_10:                               # %originalBB106
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 32], 0
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
	jne	.LBB0_11
	jmp	.LBB0_171
.LBB0_11:                               # %originalBBpart2108
	mov	al, byte ptr [rbp - 70]         # 1-byte Reload
	mov	byte ptr [rbp - 69], al         # 1-byte Spill
	jmp	.LBB0_12
.LBB0_12:                               # %land.end5
	mov	al, byte ptr [rbp - 69]         # 1-byte Reload
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
	jne	.LBB0_13
	jmp	.LBB0_172
.LBB0_13:                               # %originalBB110
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rcx, qword ptr [rbp - 32]       # 8-byte Reload
	mov	dl, byte ptr [rbp - 71]         # 1-byte Reload
	and	dl, 1
	movzx	edx, dl
	mov	dword ptr [rcx], edx
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
	jne	.LBB0_14
	jmp	.LBB0_172
.LBB0_14:                               # %originalBBpart2112
	mov	al, byte ptr [rbp - 72]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_15
	jmp	.LBB0_21
.LBB0_15:                               # %land.lhs.true
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
	jmp	.LBB0_173
.LBB0_16:                               # %originalBB114
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax], 0
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
	jne	.LBB0_17
	jmp	.LBB0_173
.LBB0_17:                               # %originalBBpart2116
	mov	al, byte ptr [rbp - 73]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_21
	jmp	.LBB0_18
.LBB0_18:                               # %if.then
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
	jmp	.LBB0_174
.LBB0_19:                               # %originalBB118
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_20
	jmp	.LBB0_174
.LBB0_20:                               # %originalBBpart2120
	jmp	.LBB0_24
.LBB0_21:                               # %if.else
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
	jmp	.LBB0_175
.LBB0_22:                               # %originalBB122
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_23
	jmp	.LBB0_175
.LBB0_23:                               # %originalBBpart2124
	jmp	.LBB0_24
.LBB0_24:                               # %if.end
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
	jmp	.LBB0_176
.LBB0_25:                               # %originalBB126
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax], 0
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
	jne	.LBB0_26
	jmp	.LBB0_176
.LBB0_26:                               # %originalBBpart2128
	mov	al, byte ptr [rbp - 74]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_27
	jmp	.LBB0_30
.LBB0_27:                               # %if.then12
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
	jmp	.LBB0_177
.LBB0_28:                               # %originalBB130
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_29
	jmp	.LBB0_177
.LBB0_29:                               # %originalBBpart2132
	jmp	.LBB0_33
.LBB0_30:                               # %if.else13
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
	jmp	.LBB0_178
.LBB0_31:                               # %originalBB134
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_32
	jmp	.LBB0_178
.LBB0_32:                               # %originalBBpart2136
	jmp	.LBB0_33
.LBB0_33:                               # %if.end15
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
	jmp	.LBB0_179
.LBB0_34:                               # %originalBB138
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 24], 0
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
	jne	.LBB0_35
	jmp	.LBB0_179
.LBB0_35:                               # %originalBBpart2140
	mov	al, byte ptr [rbp - 75]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_39
	jmp	.LBB0_36
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
	jmp	.LBB0_180
.LBB0_37:                               # %originalBB142
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 4], 0
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
	jne	.LBB0_38
	jmp	.LBB0_180
.LBB0_38:                               # %originalBBpart2144
	mov	al, byte ptr [rbp - 76]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_39
	jmp	.LBB0_42
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
	jmp	.LBB0_181
.LBB0_40:                               # %originalBB146
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jmp	.LBB0_181
.LBB0_41:                               # %originalBBpart2148
	jmp	.LBB0_45
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
	jmp	.LBB0_182
.LBB0_43:                               # %originalBB150
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jmp	.LBB0_182
.LBB0_44:                               # %originalBBpart2152
	jmp	.LBB0_45
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
	jmp	.LBB0_183
.LBB0_46:                               # %originalBB154
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 4], 0
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
	jne	.LBB0_47
	jmp	.LBB0_183
.LBB0_47:                               # %originalBBpart2156
	mov	al, byte ptr [rbp - 77]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_48
	jmp	.LBB0_51
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
	jmp	.LBB0_184
.LBB0_49:                               # %originalBB158
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jmp	.LBB0_184
.LBB0_50:                               # %originalBBpart2160
	jmp	.LBB0_54
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
	jmp	.LBB0_185
.LBB0_52:                               # %originalBB162
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jmp	.LBB0_185
.LBB0_53:                               # %originalBBpart2164
	jmp	.LBB0_54
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
	jmp	.LBB0_186
.LBB0_55:                               # %originalBB166
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 4], 0
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
	jne	.LBB0_56
	jmp	.LBB0_186
.LBB0_56:                               # %originalBBpart2168
	mov	al, byte ptr [rbp - 78]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_57
	jmp	.LBB0_63
.LBB0_57:                               # %land.lhs.true31
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
	jmp	.LBB0_187
.LBB0_58:                               # %originalBB170
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax], 0
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
	jne	.LBB0_59
	jmp	.LBB0_187
.LBB0_59:                               # %originalBBpart2172
	mov	al, byte ptr [rbp - 79]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_63
	jmp	.LBB0_60
.LBB0_60:                               # %if.then34
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
	jmp	.LBB0_188
.LBB0_61:                               # %originalBB174
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_62
	jmp	.LBB0_188
.LBB0_62:                               # %originalBBpart2176
	jmp	.LBB0_66
.LBB0_63:                               # %if.else35
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
	jmp	.LBB0_189
.LBB0_64:                               # %originalBB178
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_65
	jmp	.LBB0_189
.LBB0_65:                               # %originalBBpart2180
	jmp	.LBB0_66
.LBB0_66:                               # %if.end37
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
	jmp	.LBB0_190
.LBB0_67:                               # %originalBB182
	mov	rax, qword ptr [rbp - 48]       # 8-byte Reload
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
	jne	.LBB0_68
	jmp	.LBB0_190
.LBB0_68:                               # %originalBBpart2184
	mov	al, byte ptr [rbp - 80]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_69
	jmp	.LBB0_75
.LBB0_69:                               # %land.lhs.true39
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
	jmp	.LBB0_191
.LBB0_70:                               # %originalBB186
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 12], 0
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
	jne	.LBB0_71
	jmp	.LBB0_191
.LBB0_71:                               # %originalBBpart2188
	mov	al, byte ptr [rbp - 81]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_75
	jmp	.LBB0_72
.LBB0_72:                               # %if.then41
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
	jmp	.LBB0_192
.LBB0_73:                               # %originalBB190
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_74
	jmp	.LBB0_192
.LBB0_74:                               # %originalBBpart2192
	jmp	.LBB0_78
.LBB0_75:                               # %if.else42
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
	jmp	.LBB0_193
.LBB0_76:                               # %originalBB194
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_77
	jmp	.LBB0_193
.LBB0_77:                               # %originalBBpart2196
	jmp	.LBB0_78
.LBB0_78:                               # %if.end44
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
	jmp	.LBB0_194
.LBB0_79:                               # %originalBB198
	mov	rax, qword ptr [rbp - 48]       # 8-byte Reload
	cmp	dword ptr [rax], 0
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
	jne	.LBB0_80
	jmp	.LBB0_194
.LBB0_80:                               # %originalBBpart2200
	mov	al, byte ptr [rbp - 82]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_81
	jmp	.LBB0_87
.LBB0_81:                               # %land.lhs.true46
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
	jmp	.LBB0_195
.LBB0_82:                               # %originalBB202
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 12], 0
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
	jne	.LBB0_83
	jmp	.LBB0_195
.LBB0_83:                               # %originalBBpart2204
	mov	al, byte ptr [rbp - 83]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_84
	jmp	.LBB0_87
.LBB0_84:                               # %if.then49
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
	jmp	.LBB0_196
.LBB0_85:                               # %originalBB206
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_86
	jmp	.LBB0_196
.LBB0_86:                               # %originalBBpart2208
	jmp	.LBB0_90
.LBB0_87:                               # %if.else50
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
	jmp	.LBB0_197
.LBB0_88:                               # %originalBB210
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_89
	jmp	.LBB0_197
.LBB0_89:                               # %originalBBpart2212
	jmp	.LBB0_90
.LBB0_90:                               # %if.end52
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
	jmp	.LBB0_198
.LBB0_91:                               # %originalBB214
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
	jne	.LBB0_92
	jmp	.LBB0_198
.LBB0_92:                               # %originalBBpart2216
	mov	al, byte ptr [rbp - 84]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_93
	jmp	.LBB0_96
.LBB0_93:                               # %if.then54
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
	jmp	.LBB0_199
.LBB0_94:                               # %originalBB218
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_95
	jmp	.LBB0_199
.LBB0_95:                               # %originalBBpart2220
	jmp	.LBB0_99
.LBB0_96:                               # %if.else55
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
	jmp	.LBB0_200
.LBB0_97:                               # %originalBB222
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_98
	jmp	.LBB0_200
.LBB0_98:                               # %originalBBpart2224
	jmp	.LBB0_99
.LBB0_99:                               # %if.end57
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
	jmp	.LBB0_201
.LBB0_100:                              # %originalBB226
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	cmp	dword ptr [rax], 0
	setne	al
	mov	byte ptr [rbp - 85], al         # 1-byte Spill
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
	jmp	.LBB0_201
.LBB0_101:                              # %originalBBpart2228
	mov	al, byte ptr [rbp - 85]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_102
	jmp	.LBB0_105
.LBB0_102:                              # %if.then59
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
	jmp	.LBB0_202
.LBB0_103:                              # %originalBB230
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_104
	jmp	.LBB0_202
.LBB0_104:                              # %originalBBpart2232
	jmp	.LBB0_108
.LBB0_105:                              # %if.else60
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
	jmp	.LBB0_203
.LBB0_106:                              # %originalBB234
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_107
	jmp	.LBB0_203
.LBB0_107:                              # %originalBBpart2236
	jmp	.LBB0_108
.LBB0_108:                              # %if.end62
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
	jmp	.LBB0_204
.LBB0_109:                              # %originalBB238
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	cmp	dword ptr [rax], 0
	setne	al
	mov	byte ptr [rbp - 86], al         # 1-byte Spill
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
	jmp	.LBB0_204
.LBB0_110:                              # %originalBBpart2240
	mov	al, byte ptr [rbp - 86]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_111
	jmp	.LBB0_114
.LBB0_111:                              # %if.then64
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
	jmp	.LBB0_205
.LBB0_112:                              # %originalBB242
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_113
	jmp	.LBB0_205
.LBB0_113:                              # %originalBBpart2244
	jmp	.LBB0_117
.LBB0_114:                              # %if.else65
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
	jmp	.LBB0_206
.LBB0_115:                              # %originalBB246
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_116
	jmp	.LBB0_206
.LBB0_116:                              # %originalBBpart2248
	jmp	.LBB0_117
.LBB0_117:                              # %if.end67
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
	jmp	.LBB0_207
.LBB0_118:                              # %originalBB250
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 44], 0
	setne	al
	mov	byte ptr [rbp - 87], al         # 1-byte Spill
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
	jmp	.LBB0_207
.LBB0_119:                              # %originalBBpart2252
	mov	al, byte ptr [rbp - 87]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_120
	jmp	.LBB0_123
.LBB0_120:                              # %if.then69
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
	jmp	.LBB0_208
.LBB0_121:                              # %originalBB254
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_122
	jmp	.LBB0_208
.LBB0_122:                              # %originalBBpart2256
	jmp	.LBB0_126
.LBB0_123:                              # %if.else70
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
	jmp	.LBB0_209
.LBB0_124:                              # %originalBB258
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_125
	jmp	.LBB0_209
.LBB0_125:                              # %originalBBpart2260
	jmp	.LBB0_126
.LBB0_126:                              # %if.end72
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
	jmp	.LBB0_210
.LBB0_127:                              # %originalBB262
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 20], 0
	setne	al
	mov	byte ptr [rbp - 88], al         # 1-byte Spill
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
	jmp	.LBB0_210
.LBB0_128:                              # %originalBBpart2264
	mov	al, byte ptr [rbp - 88]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_132
	jmp	.LBB0_129
.LBB0_129:                              # %lor.lhs.false75
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
	jmp	.LBB0_211
.LBB0_130:                              # %originalBB266
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 48], 0
	setne	al
	mov	byte ptr [rbp - 89], al         # 1-byte Spill
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
	jmp	.LBB0_211
.LBB0_131:                              # %originalBBpart2268
	mov	al, byte ptr [rbp - 89]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_132
	jmp	.LBB0_135
.LBB0_132:                              # %if.then77
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
	jmp	.LBB0_212
.LBB0_133:                              # %originalBB270
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_134
	jmp	.LBB0_212
.LBB0_134:                              # %originalBBpart2272
	jmp	.LBB0_138
.LBB0_135:                              # %if.else78
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
	jmp	.LBB0_213
.LBB0_136:                              # %originalBB274
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_137
	jmp	.LBB0_213
.LBB0_137:                              # %originalBBpart2276
	jmp	.LBB0_138
.LBB0_138:                              # %if.end80
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
	jmp	.LBB0_214
.LBB0_139:                              # %originalBB278
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 24], 0
	setne	al
	mov	byte ptr [rbp - 90], al         # 1-byte Spill
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
	jmp	.LBB0_214
.LBB0_140:                              # %originalBBpart2280
	mov	al, byte ptr [rbp - 90]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_144
	jmp	.LBB0_141
.LBB0_141:                              # %lor.lhs.false83
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
	jmp	.LBB0_215
.LBB0_142:                              # %originalBB282
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 52], 0
	setne	al
	mov	byte ptr [rbp - 91], al         # 1-byte Spill
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
	jmp	.LBB0_215
.LBB0_143:                              # %originalBBpart2284
	mov	al, byte ptr [rbp - 91]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_144
	jmp	.LBB0_147
.LBB0_144:                              # %if.then85
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
	jmp	.LBB0_216
.LBB0_145:                              # %originalBB286
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_146
	jmp	.LBB0_216
.LBB0_146:                              # %originalBBpart2288
	jmp	.LBB0_150
.LBB0_147:                              # %if.else86
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
	jmp	.LBB0_217
.LBB0_148:                              # %originalBB290
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
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
	jne	.LBB0_149
	jmp	.LBB0_217
.LBB0_149:                              # %originalBBpart2292
	jmp	.LBB0_150
.LBB0_150:                              # %if.end88
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
	jmp	.LBB0_218
.LBB0_151:                              # %originalBB294
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	cmp	dword ptr [rax], 0
	setne	al
	mov	byte ptr [rbp - 92], al         # 1-byte Spill
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
	jmp	.LBB0_218
.LBB0_152:                              # %originalBBpart2296
	mov	al, byte ptr [rbp - 92]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_153
	jmp	.LBB0_162
.LBB0_153:                              # %land.lhs.true90
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
	jmp	.LBB0_219
.LBB0_154:                              # %originalBB298
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 36], 0
	setne	al
	mov	byte ptr [rbp - 93], al         # 1-byte Spill
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
	jmp	.LBB0_219
.LBB0_155:                              # %originalBBpart2300
	mov	al, byte ptr [rbp - 93]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_156
	jmp	.LBB0_162
.LBB0_156:                              # %land.lhs.true92
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
	jmp	.LBB0_220
.LBB0_157:                              # %originalBB302
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 40], 0
	setne	al
	mov	byte ptr [rbp - 94], al         # 1-byte Spill
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
	jmp	.LBB0_220
.LBB0_158:                              # %originalBBpart2304
	mov	al, byte ptr [rbp - 94]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_159
	jmp	.LBB0_162
.LBB0_159:                              # %if.then94
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
	jmp	.LBB0_221
.LBB0_160:                              # %originalBB306
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 52], 1
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
	jmp	.LBB0_221
.LBB0_161:                              # %originalBBpart2308
	jmp	.LBB0_165
.LBB0_162:                              # %if.else95
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
	jne	.LBB0_163
	jmp	.LBB0_222
.LBB0_163:                              # %originalBB310
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 52], 0
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
	jne	.LBB0_164
	jmp	.LBB0_222
.LBB0_164:                              # %originalBBpart2312
	jmp	.LBB0_165
.LBB0_165:                              # %if.end97
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
	jne	.LBB0_166
	jmp	.LBB0_223
.LBB0_166:                              # %originalBB314
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
	jne	.LBB0_167
	jmp	.LBB0_223
.LBB0_167:                              # %originalBBpart2316
	mov	rsp, rbp
	pop	rbp
	ret
.LBB0_168:                              # %originalBBalteredBB
	mov	rcx, qword ptr [rbp - 8]        # 8-byte Reload
	mov	r8, qword ptr [rbp - 16]        # 8-byte Reload
	mov	eax, 16
	mov	qword ptr [rbp - 104], rax      # 8-byte Spill
	call	__chkstk
	sub	rsp, rax
	mov	rax, qword ptr [rbp - 104]      # 8-byte Reload
	mov	rdx, rsp
	call	__chkstk
	sub	rsp, rax
	mov	rax, rsp
	mov	qword ptr [rdx], r8
	mov	qword ptr [rax], rcx
	jmp	.LBB0_1
.LBB0_169:                              # %originalBB98alteredBB
	jmp	.LBB0_4
.LBB0_170:                              # %originalBB102alteredBB
	mov	rax, qword ptr [rbp - 48]       # 8-byte Reload
	mov	cl, byte ptr [rbp - 67]         # 1-byte Reload
	and	cl, 1
	movzx	ecx, cl
	mov	dword ptr [rax], ecx
	jmp	.LBB0_7
.LBB0_171:                              # %originalBB106alteredBB
	jmp	.LBB0_10
.LBB0_172:                              # %originalBB110alteredBB
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	mov	cl, byte ptr [rbp - 71]         # 1-byte Reload
	and	cl, 1
	movzx	ecx, cl
	mov	dword ptr [rax], ecx
	jmp	.LBB0_13
.LBB0_173:                              # %originalBB114alteredBB
	jmp	.LBB0_16
.LBB0_174:                              # %originalBB118alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax], 1
	jmp	.LBB0_19
.LBB0_175:                              # %originalBB122alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax], 0
	jmp	.LBB0_22
.LBB0_176:                              # %originalBB126alteredBB
	jmp	.LBB0_25
.LBB0_177:                              # %originalBB130alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 4], 1
	jmp	.LBB0_28
.LBB0_178:                              # %originalBB134alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 4], 0
	jmp	.LBB0_31
.LBB0_179:                              # %originalBB138alteredBB
	jmp	.LBB0_34
.LBB0_180:                              # %originalBB142alteredBB
	jmp	.LBB0_37
.LBB0_181:                              # %originalBB146alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 8], 1
	jmp	.LBB0_40
.LBB0_182:                              # %originalBB150alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 8], 0
	jmp	.LBB0_43
.LBB0_183:                              # %originalBB154alteredBB
	jmp	.LBB0_46
.LBB0_184:                              # %originalBB158alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 12], 1
	jmp	.LBB0_49
.LBB0_185:                              # %originalBB162alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 12], 0
	jmp	.LBB0_52
.LBB0_186:                              # %originalBB166alteredBB
	jmp	.LBB0_55
.LBB0_187:                              # %originalBB170alteredBB
	jmp	.LBB0_58
.LBB0_188:                              # %originalBB174alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 16], 1
	jmp	.LBB0_61
.LBB0_189:                              # %originalBB178alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 16], 0
	jmp	.LBB0_64
.LBB0_190:                              # %originalBB182alteredBB
	jmp	.LBB0_67
.LBB0_191:                              # %originalBB186alteredBB
	jmp	.LBB0_70
.LBB0_192:                              # %originalBB190alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 20], 1
	jmp	.LBB0_73
.LBB0_193:                              # %originalBB194alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 20], 0
	jmp	.LBB0_76
.LBB0_194:                              # %originalBB198alteredBB
	jmp	.LBB0_79
.LBB0_195:                              # %originalBB202alteredBB
	jmp	.LBB0_82
.LBB0_196:                              # %originalBB206alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 24], 1
	jmp	.LBB0_85
.LBB0_197:                              # %originalBB210alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 24], 0
	jmp	.LBB0_88
.LBB0_198:                              # %originalBB214alteredBB
	jmp	.LBB0_91
.LBB0_199:                              # %originalBB218alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 28], 1
	jmp	.LBB0_94
.LBB0_200:                              # %originalBB222alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 28], 0
	jmp	.LBB0_97
.LBB0_201:                              # %originalBB226alteredBB
	jmp	.LBB0_100
.LBB0_202:                              # %originalBB230alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 32], 1
	jmp	.LBB0_103
.LBB0_203:                              # %originalBB234alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 32], 0
	jmp	.LBB0_106
.LBB0_204:                              # %originalBB238alteredBB
	jmp	.LBB0_109
.LBB0_205:                              # %originalBB242alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 36], 1
	jmp	.LBB0_112
.LBB0_206:                              # %originalBB246alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 36], 0
	jmp	.LBB0_115
.LBB0_207:                              # %originalBB250alteredBB
	jmp	.LBB0_118
.LBB0_208:                              # %originalBB254alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 40], 1
	jmp	.LBB0_121
.LBB0_209:                              # %originalBB258alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 40], 0
	jmp	.LBB0_124
.LBB0_210:                              # %originalBB262alteredBB
	jmp	.LBB0_127
.LBB0_211:                              # %originalBB266alteredBB
	jmp	.LBB0_130
.LBB0_212:                              # %originalBB270alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 44], 1
	jmp	.LBB0_133
.LBB0_213:                              # %originalBB274alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 44], 0
	jmp	.LBB0_136
.LBB0_214:                              # %originalBB278alteredBB
	jmp	.LBB0_139
.LBB0_215:                              # %originalBB282alteredBB
	jmp	.LBB0_142
.LBB0_216:                              # %originalBB286alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 48], 1
	jmp	.LBB0_145
.LBB0_217:                              # %originalBB290alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 48], 0
	jmp	.LBB0_148
.LBB0_218:                              # %originalBB294alteredBB
	jmp	.LBB0_151
.LBB0_219:                              # %originalBB298alteredBB
	jmp	.LBB0_154
.LBB0_220:                              # %originalBB302alteredBB
	jmp	.LBB0_157
.LBB0_221:                              # %originalBB306alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 52], 1
	jmp	.LBB0_160
.LBB0_222:                              # %originalBB310alteredBB
	mov	rax, qword ptr [rbp - 64]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 52], 0
	jmp	.LBB0_163
.LBB0_223:                              # %originalBB314alteredBB
	jmp	.LBB0_166
	.seh_endproc
                                        # -- End function
	.comm	x,4,2                           # @x
	.comm	y,4,2                           # @y
	.section	.drectve,"yni"
	.ascii	" /EXPORT:bn_evaluate"
	.addrsig
	.addrsig_sym x
	.addrsig_sym y
