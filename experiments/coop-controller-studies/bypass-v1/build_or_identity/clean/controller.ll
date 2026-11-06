; ModuleID = 'E:\Workspace\binary_binja_redesign\comp4020-final-ky787\experiments\coop-controller-studies\bypass-v1\src\controller.c'
source_filename = "E:\\Workspace\\binary_binja_redesign\\comp4020-final-ky787\\experiments\\coop-controller-studies\\bypass-v1\\src\\controller.c"
target datalayout = "e-m:w-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-windows-msvc19.51.36248"

%struct.ControllerInputs = type { i32, i32, i32, i32 }
%struct.ControllerOutputs = type { i32, i32, i32, i32 }

; Function Attrs: noinline nounwind optnone uwtable
define dso_local dllexport void @bn_evaluate(ptr noundef %inputs, ptr noundef %outputs) #0 {
entry:
  %outputs.addr = alloca ptr, align 8
  %inputs.addr = alloca ptr, align 8
  store ptr %outputs, ptr %outputs.addr, align 8
  store ptr %inputs, ptr %inputs.addr, align 8
  %0 = load ptr, ptr %inputs.addr, align 8
  %anchorHold = getelementptr inbounds %struct.ControllerInputs, ptr %0, i32 0, i32 0
  %1 = load i32, ptr %anchorHold, align 4
  %tobool = icmp ne i32 %1, 0
  br i1 %tobool, label %if.then, label %lor.lhs.false

lor.lhs.false:                                    ; preds = %entry
  %2 = load ptr, ptr %inputs.addr, align 8
  %link = getelementptr inbounds %struct.ControllerInputs, ptr %2, i32 0, i32 1
  %3 = load i32, ptr %link, align 4
  %tobool1 = icmp ne i32 %3, 0
  br i1 %tobool1, label %if.then, label %if.else

if.then:                                          ; preds = %lor.lhs.false, %entry
  %4 = load ptr, ptr %outputs.addr, align 8
  %anchorPower = getelementptr inbounds %struct.ControllerOutputs, ptr %4, i32 0, i32 0
  store i32 1, ptr %anchorPower, align 4
  br label %if.end

if.else:                                          ; preds = %lor.lhs.false
  %5 = load ptr, ptr %outputs.addr, align 8
  %anchorPower2 = getelementptr inbounds %struct.ControllerOutputs, ptr %5, i32 0, i32 0
  store i32 0, ptr %anchorPower2, align 4
  br label %if.end

if.end:                                           ; preds = %if.else, %if.then
  %6 = load ptr, ptr %inputs.addr, align 8
  %link3 = getelementptr inbounds %struct.ControllerInputs, ptr %6, i32 0, i32 1
  %7 = load i32, ptr %link3, align 4
  %tobool4 = icmp ne i32 %7, 0
  br i1 %tobool4, label %if.then5, label %if.else6

if.then5:                                         ; preds = %if.end
  %8 = load ptr, ptr %outputs.addr, align 8
  %bridgePower = getelementptr inbounds %struct.ControllerOutputs, ptr %8, i32 0, i32 1
  store i32 1, ptr %bridgePower, align 4
  br label %if.end8

if.else6:                                         ; preds = %if.end
  %9 = load ptr, ptr %outputs.addr, align 8
  %bridgePower7 = getelementptr inbounds %struct.ControllerOutputs, ptr %9, i32 0, i32 1
  store i32 0, ptr %bridgePower7, align 4
  br label %if.end8

if.end8:                                          ; preds = %if.else6, %if.then5
  %10 = load ptr, ptr %inputs.addr, align 8
  %bypassHold = getelementptr inbounds %struct.ControllerInputs, ptr %10, i32 0, i32 2
  %11 = load i32, ptr %bypassHold, align 4
  %tobool9 = icmp ne i32 %11, 0
  br i1 %tobool9, label %if.then12, label %lor.lhs.false10

lor.lhs.false10:                                  ; preds = %if.end8
  %12 = load ptr, ptr %inputs.addr, align 8
  %override = getelementptr inbounds %struct.ControllerInputs, ptr %12, i32 0, i32 3
  %13 = load i32, ptr %override, align 4
  %tobool11 = icmp ne i32 %13, 0
  br i1 %tobool11, label %if.then12, label %if.else13

if.then12:                                        ; preds = %lor.lhs.false10, %if.end8
  %14 = load ptr, ptr %outputs.addr, align 8
  %firewallActive = getelementptr inbounds %struct.ControllerOutputs, ptr %14, i32 0, i32 2
  store i32 0, ptr %firewallActive, align 4
  br label %if.end15

if.else13:                                        ; preds = %lor.lhs.false10
  %15 = load ptr, ptr %outputs.addr, align 8
  %firewallActive14 = getelementptr inbounds %struct.ControllerOutputs, ptr %15, i32 0, i32 2
  store i32 1, ptr %firewallActive14, align 4
  br label %if.end15

if.end15:                                         ; preds = %if.else13, %if.then12
  %16 = load ptr, ptr %outputs.addr, align 8
  %exitReady = getelementptr inbounds %struct.ControllerOutputs, ptr %16, i32 0, i32 3
  store i32 1, ptr %exitReady, align 4
  ret void
}

attributes #0 = { noinline nounwind optnone uwtable "min-legal-vector-width"="0" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }

!llvm.module.flags = !{!0, !1, !2}
!llvm.ident = !{!3}

!0 = !{i32 1, !"wchar_size", i32 2}
!1 = !{i32 8, !"PIC Level", i32 2}
!2 = !{i32 7, !"uwtable", i32 2}
!3 = !{!"clang version 16.0.6 (https://github.com/llvm/llvm-project.git 7cbf1a2591520c2491aa35339f227775f4d3adf6)"}
