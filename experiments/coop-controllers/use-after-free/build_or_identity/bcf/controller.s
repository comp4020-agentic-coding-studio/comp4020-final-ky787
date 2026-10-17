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
	jmp	.LBB0_66
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
	jmp	.LBB0_66
.LBB0_2:                                # %originalBBpart2
	mov	al, byte ptr [rbp - 17]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_3
	jmp	.LBB0_6
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
	jmp	.LBB0_67
.LBB0_4:                                # %originalBB36
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
	jmp	.LBB0_67
.LBB0_5:                                # %originalBBpart238
	jmp	.LBB0_9
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
	jmp	.LBB0_68
.LBB0_7:                                # %originalBB40
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
	jmp	.LBB0_68
.LBB0_8:                                # %originalBBpart242
	jmp	.LBB0_9
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
	jmp	.LBB0_69
.LBB0_10:                               # %originalBB44
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
	jmp	.LBB0_69
.LBB0_11:                               # %originalBBpart246
	mov	al, byte ptr [rbp - 49]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_12
	jmp	.LBB0_15
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
	jmp	.LBB0_70
.LBB0_13:                               # %originalBB48
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
	jmp	.LBB0_70
.LBB0_14:                               # %originalBBpart250
	jmp	.LBB0_18
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
	jmp	.LBB0_71
.LBB0_16:                               # %originalBB52
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
	jmp	.LBB0_71
.LBB0_17:                               # %originalBBpart254
	jmp	.LBB0_18
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
	jmp	.LBB0_72
.LBB0_19:                               # %originalBB56
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
	jmp	.LBB0_72
.LBB0_20:                               # %originalBBpart258
	mov	al, byte ptr [rbp - 50]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_21
	jmp	.LBB0_27
.LBB0_21:                               # %land.lhs.true
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
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
.LBB0_22:                               # %originalBB60
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 4], 0
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
	jne	.LBB0_23
	jmp	.LBB0_73
.LBB0_23:                               # %originalBBpart262
	mov	al, byte ptr [rbp - 51]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_27
	jmp	.LBB0_24
.LBB0_24:                               # %if.then10
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
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
.LBB0_25:                               # %originalBB64
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
	jne	.LBB0_26
	jmp	.LBB0_74
.LBB0_26:                               # %originalBBpart266
	jmp	.LBB0_30
.LBB0_27:                               # %if.else11
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
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
.LBB0_28:                               # %originalBB68
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
	jne	.LBB0_29
	jmp	.LBB0_75
.LBB0_29:                               # %originalBBpart270
	jmp	.LBB0_30
.LBB0_30:                               # %if.end13
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
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
.LBB0_31:                               # %originalBB72
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 12], 0
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
	jmp	.LBB0_76
.LBB0_32:                               # %originalBBpart274
	mov	al, byte ptr [rbp - 52]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_33
	jmp	.LBB0_39
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
.LBB0_34:                               # %originalBB76
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 8], 0
	setne	al
	mov	byte ptr [rbp - 53], al         # 1-byte Spill
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
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
.LBB0_35:                               # %originalBBpart278
	mov	al, byte ptr [rbp - 53]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_39
	jmp	.LBB0_36
.LBB0_36:                               # %if.then18
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
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
.LBB0_37:                               # %originalBB80
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
	jne	.LBB0_38
	jmp	.LBB0_78
.LBB0_38:                               # %originalBBpart282
	jmp	.LBB0_42
.LBB0_39:                               # %if.else19
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
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
.LBB0_40:                               # %originalBB84
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
	jne	.LBB0_41
	jmp	.LBB0_79
.LBB0_41:                               # %originalBBpart286
	jmp	.LBB0_42
.LBB0_42:                               # %if.end21
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
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
.LBB0_43:                               # %originalBB88
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 16], 0
	setne	al
	mov	byte ptr [rbp - 54], al         # 1-byte Spill
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
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
.LBB0_44:                               # %originalBBpart290
	mov	al, byte ptr [rbp - 54]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_45
	jmp	.LBB0_48
.LBB0_45:                               # %land.lhs.true23
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
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
.LBB0_46:                               # %originalBB92
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 12], 0
	setne	al
	mov	byte ptr [rbp - 55], al         # 1-byte Spill
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
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
.LBB0_47:                               # %originalBBpart294
	mov	al, byte ptr [rbp - 55]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_48
	jmp	.LBB0_51
.LBB0_48:                               # %if.then26
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
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
.LBB0_49:                               # %originalBB96
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
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
	jne	.LBB0_50
	jmp	.LBB0_82
.LBB0_50:                               # %originalBBpart298
	jmp	.LBB0_54
.LBB0_51:                               # %if.else27
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
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
.LBB0_52:                               # %originalBB100
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
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
	jne	.LBB0_53
	jmp	.LBB0_83
.LBB0_53:                               # %originalBBpart2102
	jmp	.LBB0_54
.LBB0_54:                               # %if.end29
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
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
.LBB0_55:                               # %originalBB104
	mov	rax, qword ptr [rbp - 32]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	cmp	dword ptr [rax + 16], 0
	setne	al
	mov	byte ptr [rbp - 56], al         # 1-byte Spill
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
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
.LBB0_56:                               # %originalBBpart2106
	mov	al, byte ptr [rbp - 56]         # 1-byte Reload
	test	al, 1
	jne	.LBB0_57
	jmp	.LBB0_60
.LBB0_57:                               # %if.then32
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
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
.LBB0_58:                               # %originalBB108
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
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
	jne	.LBB0_59
	jmp	.LBB0_85
.LBB0_59:                               # %originalBBpart2110
	jmp	.LBB0_63
.LBB0_60:                               # %if.else33
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
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
.LBB0_61:                               # %originalBB112
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
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
	jne	.LBB0_62
	jmp	.LBB0_86
.LBB0_62:                               # %originalBBpart2114
	jmp	.LBB0_63
.LBB0_63:                               # %if.end35
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
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
.LBB0_64:                               # %originalBB116
	mov	eax, dword ptr [rip + x]
	mov	ecx, dword ptr [rip + y]
	mov	edx, eax
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
.LBB0_65:                               # %originalBBpart2118
	mov	rsp, rbp
	pop	rbp
	ret
.LBB0_66:                               # %originalBBalteredBB
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
.LBB0_67:                               # %originalBB36alteredBB
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax], 1
	jmp	.LBB0_4
.LBB0_68:                               # %originalBB40alteredBB
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax], 0
	jmp	.LBB0_7
.LBB0_69:                               # %originalBB44alteredBB
	jmp	.LBB0_10
.LBB0_70:                               # %originalBB48alteredBB
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 4], 1
	jmp	.LBB0_13
.LBB0_71:                               # %originalBB52alteredBB
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 4], 0
	jmp	.LBB0_16
.LBB0_72:                               # %originalBB56alteredBB
	jmp	.LBB0_19
.LBB0_73:                               # %originalBB60alteredBB
	jmp	.LBB0_22
.LBB0_74:                               # %originalBB64alteredBB
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 8], 1
	jmp	.LBB0_25
.LBB0_75:                               # %originalBB68alteredBB
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 8], 0
	jmp	.LBB0_28
.LBB0_76:                               # %originalBB72alteredBB
	jmp	.LBB0_31
.LBB0_77:                               # %originalBB76alteredBB
	jmp	.LBB0_34
.LBB0_78:                               # %originalBB80alteredBB
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 12], 1
	jmp	.LBB0_37
.LBB0_79:                               # %originalBB84alteredBB
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 12], 0
	jmp	.LBB0_40
.LBB0_80:                               # %originalBB88alteredBB
	jmp	.LBB0_43
.LBB0_81:                               # %originalBB92alteredBB
	jmp	.LBB0_46
.LBB0_82:                               # %originalBB96alteredBB
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 16], 1
	jmp	.LBB0_49
.LBB0_83:                               # %originalBB100alteredBB
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 16], 0
	jmp	.LBB0_52
.LBB0_84:                               # %originalBB104alteredBB
	jmp	.LBB0_55
.LBB0_85:                               # %originalBB108alteredBB
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 20], 1
	jmp	.LBB0_58
.LBB0_86:                               # %originalBB112alteredBB
	mov	rax, qword ptr [rbp - 40]       # 8-byte Reload
	mov	rax, qword ptr [rax]
	mov	dword ptr [rax + 20], 0
	jmp	.LBB0_61
.LBB0_87:                               # %originalBB116alteredBB
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
