; ModuleID = 'E:\Workspace\binary_binja_redesign\comp4020-final-ky787\experiments\coop-controller-studies\bypass-v1\src\controller.c'
source_filename = "E:\\Workspace\\binary_binja_redesign\\comp4020-final-ky787\\experiments\\coop-controller-studies\\bypass-v1\\src\\controller.c"
target datalayout = "e-m:w-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-windows-msvc19.51.36248"

%struct.ControllerInputs = type { i32, i32, i32, i32 }
%struct.ControllerOutputs = type { i32, i32, i32, i32 }

@x = common global i32 0
@y = common global i32 0

; Function Attrs: noinline nounwind optnone uwtable
define dso_local dllexport void @bn_evaluate(ptr noundef %inputs, ptr noundef %outputs) #0 {
entry:
  %0 = load i32, ptr @x, align 4
  %1 = load i32, ptr @y, align 4
  %2 = sub i32 %0, 1
  %3 = mul i32 %0, %2
  %4 = urem i32 %3, 2
  %5 = icmp eq i32 %4, 0
  %6 = icmp slt i32 %1, 10
  %7 = or i1 %5, %6
  br i1 %7, label %originalBB, label %originalBBalteredBB

originalBB:                                       ; preds = %entry, %originalBBalteredBB
  %outputs.addr = alloca ptr, align 8
  %inputs.addr = alloca ptr, align 8
  store ptr %outputs, ptr %outputs.addr, align 8
  store ptr %inputs, ptr %inputs.addr, align 8
  %8 = load ptr, ptr %inputs.addr, align 8
  %anchorHold = getelementptr inbounds %struct.ControllerInputs, ptr %8, i32 0, i32 0
  %9 = load i32, ptr %anchorHold, align 4
  %tobool = icmp ne i32 %9, 0
  %10 = load i32, ptr @x, align 4
  %11 = load i32, ptr @y, align 4
  %12 = sub i32 %10, 1
  %13 = mul i32 %10, %12
  %14 = urem i32 %13, 2
  %15 = icmp eq i32 %14, 0
  %16 = icmp slt i32 %11, 10
  %17 = or i1 %15, %16
  br i1 %17, label %originalBBpart2, label %originalBBalteredBB

originalBBpart2:                                  ; preds = %originalBB
  br i1 %tobool, label %if.then, label %lor.lhs.false

lor.lhs.false:                                    ; preds = %originalBBpart2
  %18 = load i32, ptr @x, align 4
  %19 = load i32, ptr @y, align 4
  %20 = sub i32 %18, 1
  %21 = mul i32 %18, %20
  %22 = urem i32 %21, 2
  %23 = icmp eq i32 %22, 0
  %24 = icmp slt i32 %19, 10
  %25 = or i1 %23, %24
  br i1 %25, label %originalBB16, label %originalBB16alteredBB

originalBB16:                                     ; preds = %lor.lhs.false, %originalBB16alteredBB
  %26 = load ptr, ptr %inputs.addr, align 8
  %link = getelementptr inbounds %struct.ControllerInputs, ptr %26, i32 0, i32 1
  %27 = load i32, ptr %link, align 4
  %tobool1 = icmp ne i32 %27, 0
  %28 = load i32, ptr @x, align 4
  %29 = load i32, ptr @y, align 4
  %30 = sub i32 %28, 1
  %31 = mul i32 %28, %30
  %32 = urem i32 %31, 2
  %33 = icmp eq i32 %32, 0
  %34 = icmp slt i32 %29, 10
  %35 = or i1 %33, %34
  br i1 %35, label %originalBBpart218, label %originalBB16alteredBB

originalBBpart218:                                ; preds = %originalBB16
  br i1 %tobool1, label %if.then, label %if.else

if.then:                                          ; preds = %originalBBpart218, %originalBBpart2
  %36 = load i32, ptr @x, align 4
  %37 = load i32, ptr @y, align 4
  %38 = sub i32 %36, 1
  %39 = mul i32 %36, %38
  %40 = urem i32 %39, 2
  %41 = icmp eq i32 %40, 0
  %42 = icmp slt i32 %37, 10
  %43 = or i1 %41, %42
  br i1 %43, label %originalBB20, label %originalBB20alteredBB

originalBB20:                                     ; preds = %if.then, %originalBB20alteredBB
  %44 = load ptr, ptr %outputs.addr, align 8
  %anchorPower = getelementptr inbounds %struct.ControllerOutputs, ptr %44, i32 0, i32 0
  store i32 1, ptr %anchorPower, align 4
  %45 = load i32, ptr @x, align 4
  %46 = load i32, ptr @y, align 4
  %47 = sub i32 %45, 1
  %48 = mul i32 %45, %47
  %49 = urem i32 %48, 2
  %50 = icmp eq i32 %49, 0
  %51 = icmp slt i32 %46, 10
  %52 = or i1 %50, %51
  br i1 %52, label %originalBBpart222, label %originalBB20alteredBB

originalBBpart222:                                ; preds = %originalBB20
  br label %if.end

if.else:                                          ; preds = %originalBBpart218
  %53 = load i32, ptr @x, align 4
  %54 = load i32, ptr @y, align 4
  %55 = sub i32 %53, 1
  %56 = mul i32 %53, %55
  %57 = urem i32 %56, 2
  %58 = icmp eq i32 %57, 0
  %59 = icmp slt i32 %54, 10
  %60 = or i1 %58, %59
  br i1 %60, label %originalBB24, label %originalBB24alteredBB

originalBB24:                                     ; preds = %if.else, %originalBB24alteredBB
  %61 = load ptr, ptr %outputs.addr, align 8
  %anchorPower2 = getelementptr inbounds %struct.ControllerOutputs, ptr %61, i32 0, i32 0
  store i32 0, ptr %anchorPower2, align 4
  %62 = load i32, ptr @x, align 4
  %63 = load i32, ptr @y, align 4
  %64 = sub i32 %62, 1
  %65 = mul i32 %62, %64
  %66 = urem i32 %65, 2
  %67 = icmp eq i32 %66, 0
  %68 = icmp slt i32 %63, 10
  %69 = or i1 %67, %68
  br i1 %69, label %originalBBpart226, label %originalBB24alteredBB

originalBBpart226:                                ; preds = %originalBB24
  br label %if.end

if.end:                                           ; preds = %originalBBpart226, %originalBBpart222
  %70 = load i32, ptr @x, align 4
  %71 = load i32, ptr @y, align 4
  %72 = sub i32 %70, 1
  %73 = mul i32 %70, %72
  %74 = urem i32 %73, 2
  %75 = icmp eq i32 %74, 0
  %76 = icmp slt i32 %71, 10
  %77 = or i1 %75, %76
  br i1 %77, label %originalBB28, label %originalBB28alteredBB

originalBB28:                                     ; preds = %if.end, %originalBB28alteredBB
  %78 = load ptr, ptr %inputs.addr, align 8
  %link3 = getelementptr inbounds %struct.ControllerInputs, ptr %78, i32 0, i32 1
  %79 = load i32, ptr %link3, align 4
  %tobool4 = icmp ne i32 %79, 0
  %80 = load i32, ptr @x, align 4
  %81 = load i32, ptr @y, align 4
  %82 = sub i32 %80, 1
  %83 = mul i32 %80, %82
  %84 = urem i32 %83, 2
  %85 = icmp eq i32 %84, 0
  %86 = icmp slt i32 %81, 10
  %87 = or i1 %85, %86
  br i1 %87, label %originalBBpart230, label %originalBB28alteredBB

originalBBpart230:                                ; preds = %originalBB28
  br i1 %tobool4, label %if.then5, label %if.else6

if.then5:                                         ; preds = %originalBBpart230
  %88 = load i32, ptr @x, align 4
  %89 = load i32, ptr @y, align 4
  %90 = sub i32 %88, 1
  %91 = mul i32 %88, %90
  %92 = urem i32 %91, 2
  %93 = icmp eq i32 %92, 0
  %94 = icmp slt i32 %89, 10
  %95 = or i1 %93, %94
  br i1 %95, label %originalBB32, label %originalBB32alteredBB

originalBB32:                                     ; preds = %if.then5, %originalBB32alteredBB
  %96 = load ptr, ptr %outputs.addr, align 8
  %bridgePower = getelementptr inbounds %struct.ControllerOutputs, ptr %96, i32 0, i32 1
  store i32 1, ptr %bridgePower, align 4
  %97 = load i32, ptr @x, align 4
  %98 = load i32, ptr @y, align 4
  %99 = sub i32 %97, 1
  %100 = mul i32 %97, %99
  %101 = urem i32 %100, 2
  %102 = icmp eq i32 %101, 0
  %103 = icmp slt i32 %98, 10
  %104 = or i1 %102, %103
  br i1 %104, label %originalBBpart234, label %originalBB32alteredBB

originalBBpart234:                                ; preds = %originalBB32
  br label %if.end8

if.else6:                                         ; preds = %originalBBpart230
  %105 = load i32, ptr @x, align 4
  %106 = load i32, ptr @y, align 4
  %107 = sub i32 %105, 1
  %108 = mul i32 %105, %107
  %109 = urem i32 %108, 2
  %110 = icmp eq i32 %109, 0
  %111 = icmp slt i32 %106, 10
  %112 = or i1 %110, %111
  br i1 %112, label %originalBB36, label %originalBB36alteredBB

originalBB36:                                     ; preds = %if.else6, %originalBB36alteredBB
  %113 = load ptr, ptr %outputs.addr, align 8
  %bridgePower7 = getelementptr inbounds %struct.ControllerOutputs, ptr %113, i32 0, i32 1
  store i32 0, ptr %bridgePower7, align 4
  %114 = load i32, ptr @x, align 4
  %115 = load i32, ptr @y, align 4
  %116 = sub i32 %114, 1
  %117 = mul i32 %114, %116
  %118 = urem i32 %117, 2
  %119 = icmp eq i32 %118, 0
  %120 = icmp slt i32 %115, 10
  %121 = or i1 %119, %120
  br i1 %121, label %originalBBpart238, label %originalBB36alteredBB

originalBBpart238:                                ; preds = %originalBB36
  br label %if.end8

if.end8:                                          ; preds = %originalBBpart238, %originalBBpart234
  %122 = load i32, ptr @x, align 4
  %123 = load i32, ptr @y, align 4
  %124 = sub i32 %122, 1
  %125 = mul i32 %122, %124
  %126 = urem i32 %125, 2
  %127 = icmp eq i32 %126, 0
  %128 = icmp slt i32 %123, 10
  %129 = or i1 %127, %128
  br i1 %129, label %originalBB40, label %originalBB40alteredBB

originalBB40:                                     ; preds = %if.end8, %originalBB40alteredBB
  %130 = load ptr, ptr %inputs.addr, align 8
  %bypassHold = getelementptr inbounds %struct.ControllerInputs, ptr %130, i32 0, i32 2
  %131 = load i32, ptr %bypassHold, align 4
  %tobool9 = icmp ne i32 %131, 0
  %132 = load i32, ptr @x, align 4
  %133 = load i32, ptr @y, align 4
  %134 = sub i32 %132, 1
  %135 = mul i32 %132, %134
  %136 = urem i32 %135, 2
  %137 = icmp eq i32 %136, 0
  %138 = icmp slt i32 %133, 10
  %139 = or i1 %137, %138
  br i1 %139, label %originalBBpart242, label %originalBB40alteredBB

originalBBpart242:                                ; preds = %originalBB40
  br i1 %tobool9, label %if.then12, label %lor.lhs.false10

lor.lhs.false10:                                  ; preds = %originalBBpart242
  %140 = load i32, ptr @x, align 4
  %141 = load i32, ptr @y, align 4
  %142 = sub i32 %140, 1
  %143 = mul i32 %140, %142
  %144 = urem i32 %143, 2
  %145 = icmp eq i32 %144, 0
  %146 = icmp slt i32 %141, 10
  %147 = or i1 %145, %146
  br i1 %147, label %originalBB44, label %originalBB44alteredBB

originalBB44:                                     ; preds = %lor.lhs.false10, %originalBB44alteredBB
  %148 = load ptr, ptr %inputs.addr, align 8
  %override = getelementptr inbounds %struct.ControllerInputs, ptr %148, i32 0, i32 3
  %149 = load i32, ptr %override, align 4
  %tobool11 = icmp ne i32 %149, 0
  %150 = load i32, ptr @x, align 4
  %151 = load i32, ptr @y, align 4
  %152 = sub i32 %150, 1
  %153 = mul i32 %150, %152
  %154 = urem i32 %153, 2
  %155 = icmp eq i32 %154, 0
  %156 = icmp slt i32 %151, 10
  %157 = or i1 %155, %156
  br i1 %157, label %originalBBpart246, label %originalBB44alteredBB

originalBBpart246:                                ; preds = %originalBB44
  br i1 %tobool11, label %if.then12, label %if.else13

if.then12:                                        ; preds = %originalBBpart246, %originalBBpart242
  %158 = load i32, ptr @x, align 4
  %159 = load i32, ptr @y, align 4
  %160 = sub i32 %158, 1
  %161 = mul i32 %158, %160
  %162 = urem i32 %161, 2
  %163 = icmp eq i32 %162, 0
  %164 = icmp slt i32 %159, 10
  %165 = or i1 %163, %164
  br i1 %165, label %originalBB48, label %originalBB48alteredBB

originalBB48:                                     ; preds = %if.then12, %originalBB48alteredBB
  %166 = load ptr, ptr %outputs.addr, align 8
  %firewallActive = getelementptr inbounds %struct.ControllerOutputs, ptr %166, i32 0, i32 2
  store i32 0, ptr %firewallActive, align 4
  %167 = load i32, ptr @x, align 4
  %168 = load i32, ptr @y, align 4
  %169 = sub i32 %167, 1
  %170 = mul i32 %167, %169
  %171 = urem i32 %170, 2
  %172 = icmp eq i32 %171, 0
  %173 = icmp slt i32 %168, 10
  %174 = or i1 %172, %173
  br i1 %174, label %originalBBpart250, label %originalBB48alteredBB

originalBBpart250:                                ; preds = %originalBB48
  br label %if.end15

if.else13:                                        ; preds = %originalBBpart246
  %175 = load i32, ptr @x, align 4
  %176 = load i32, ptr @y, align 4
  %177 = sub i32 %175, 1
  %178 = mul i32 %175, %177
  %179 = urem i32 %178, 2
  %180 = icmp eq i32 %179, 0
  %181 = icmp slt i32 %176, 10
  %182 = or i1 %180, %181
  br i1 %182, label %originalBB52, label %originalBB52alteredBB

originalBB52:                                     ; preds = %if.else13, %originalBB52alteredBB
  %183 = load ptr, ptr %outputs.addr, align 8
  %firewallActive14 = getelementptr inbounds %struct.ControllerOutputs, ptr %183, i32 0, i32 2
  store i32 1, ptr %firewallActive14, align 4
  %184 = load i32, ptr @x, align 4
  %185 = load i32, ptr @y, align 4
  %186 = sub i32 %184, 1
  %187 = mul i32 %184, %186
  %188 = urem i32 %187, 2
  %189 = icmp eq i32 %188, 0
  %190 = icmp slt i32 %185, 10
  %191 = or i1 %189, %190
  br i1 %191, label %originalBBpart254, label %originalBB52alteredBB

originalBBpart254:                                ; preds = %originalBB52
  br label %if.end15

if.end15:                                         ; preds = %originalBBpart254, %originalBBpart250
  %192 = load i32, ptr @x, align 4
  %193 = load i32, ptr @y, align 4
  %194 = sub i32 %192, 1
  %195 = mul i32 %192, %194
  %196 = urem i32 %195, 2
  %197 = icmp eq i32 %196, 0
  %198 = icmp slt i32 %193, 10
  %199 = or i1 %197, %198
  br i1 %199, label %originalBB56, label %originalBB56alteredBB

originalBB56:                                     ; preds = %if.end15, %originalBB56alteredBB
  %200 = load ptr, ptr %outputs.addr, align 8
  %exitReady = getelementptr inbounds %struct.ControllerOutputs, ptr %200, i32 0, i32 3
  store i32 1, ptr %exitReady, align 4
  %201 = load i32, ptr @x, align 4
  %202 = load i32, ptr @y, align 4
  %203 = sub i32 %201, 1
  %204 = mul i32 %201, %203
  %205 = urem i32 %204, 2
  %206 = icmp eq i32 %205, 0
  %207 = icmp slt i32 %202, 10
  %208 = or i1 %206, %207
  br i1 %208, label %originalBBpart258, label %originalBB56alteredBB

originalBBpart258:                                ; preds = %originalBB56
  ret void

originalBBalteredBB:                              ; preds = %originalBB, %entry
  %outputs.addralteredBB = alloca ptr, align 8
  %inputs.addralteredBB = alloca ptr, align 8
  store ptr %outputs, ptr %outputs.addralteredBB, align 8
  store ptr %inputs, ptr %inputs.addralteredBB, align 8
  %209 = load ptr, ptr %inputs.addralteredBB, align 8
  %anchorHoldalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %209, i32 0, i32 0
  %210 = load i32, ptr %anchorHoldalteredBB, align 4
  %toboolalteredBB = icmp ne i32 %210, 0
  br label %originalBB

originalBB16alteredBB:                            ; preds = %originalBB16, %lor.lhs.false
  %211 = load ptr, ptr %inputs.addr, align 8
  %linkalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %211, i32 0, i32 1
  %212 = load i32, ptr %linkalteredBB, align 4
  %tobool1alteredBB = icmp ne i32 %212, 0
  br label %originalBB16

originalBB20alteredBB:                            ; preds = %originalBB20, %if.then
  %213 = load ptr, ptr %outputs.addr, align 8
  %anchorPoweralteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %213, i32 0, i32 0
  store i32 1, ptr %anchorPoweralteredBB, align 4
  br label %originalBB20

originalBB24alteredBB:                            ; preds = %originalBB24, %if.else
  %214 = load ptr, ptr %outputs.addr, align 8
  %anchorPower2alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %214, i32 0, i32 0
  store i32 0, ptr %anchorPower2alteredBB, align 4
  br label %originalBB24

originalBB28alteredBB:                            ; preds = %originalBB28, %if.end
  %215 = load ptr, ptr %inputs.addr, align 8
  %link3alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %215, i32 0, i32 1
  %216 = load i32, ptr %link3alteredBB, align 4
  %tobool4alteredBB = icmp ne i32 %216, 0
  br label %originalBB28

originalBB32alteredBB:                            ; preds = %originalBB32, %if.then5
  %217 = load ptr, ptr %outputs.addr, align 8
  %bridgePoweralteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %217, i32 0, i32 1
  store i32 1, ptr %bridgePoweralteredBB, align 4
  br label %originalBB32

originalBB36alteredBB:                            ; preds = %originalBB36, %if.else6
  %218 = load ptr, ptr %outputs.addr, align 8
  %bridgePower7alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %218, i32 0, i32 1
  store i32 0, ptr %bridgePower7alteredBB, align 4
  br label %originalBB36

originalBB40alteredBB:                            ; preds = %originalBB40, %if.end8
  %219 = load ptr, ptr %inputs.addr, align 8
  %bypassHoldalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %219, i32 0, i32 2
  %220 = load i32, ptr %bypassHoldalteredBB, align 4
  %tobool9alteredBB = icmp ne i32 %220, 0
  br label %originalBB40

originalBB44alteredBB:                            ; preds = %originalBB44, %lor.lhs.false10
  %221 = load ptr, ptr %inputs.addr, align 8
  %overridealteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %221, i32 0, i32 3
  %222 = load i32, ptr %overridealteredBB, align 4
  %tobool11alteredBB = icmp ne i32 %222, 0
  br label %originalBB44

originalBB48alteredBB:                            ; preds = %originalBB48, %if.then12
  %223 = load ptr, ptr %outputs.addr, align 8
  %firewallActivealteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %223, i32 0, i32 2
  store i32 0, ptr %firewallActivealteredBB, align 4
  br label %originalBB48

originalBB52alteredBB:                            ; preds = %originalBB52, %if.else13
  %224 = load ptr, ptr %outputs.addr, align 8
  %firewallActive14alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %224, i32 0, i32 2
  store i32 1, ptr %firewallActive14alteredBB, align 4
  br label %originalBB52

originalBB56alteredBB:                            ; preds = %originalBB56, %if.end15
  %225 = load ptr, ptr %outputs.addr, align 8
  %exitReadyalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %225, i32 0, i32 3
  store i32 1, ptr %exitReadyalteredBB, align 4
  br label %originalBB56
}

attributes #0 = { noinline nounwind optnone uwtable "min-legal-vector-width"="0" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }

!llvm.module.flags = !{!0, !1, !2}
!llvm.ident = !{!3}

!0 = !{i32 1, !"wchar_size", i32 2}
!1 = !{i32 8, !"PIC Level", i32 2}
!2 = !{i32 7, !"uwtable", i32 2}
!3 = !{!"clang version 16.0.6 (https://github.com/llvm/llvm-project.git 7cbf1a2591520c2491aa35339f227775f4d3adf6)"}
