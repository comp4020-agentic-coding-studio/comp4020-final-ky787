; ModuleID = 'E:\Workspace\binary_binja_redesign\comp4020-final-ky787\experiments\coop-controllers\handshake\src\controller.c'
source_filename = "E:\\Workspace\\binary_binja_redesign\\comp4020-final-ky787\\experiments\\coop-controllers\\handshake\\src\\controller.c"
target datalayout = "e-m:w-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-windows-msvc19.51.36248"

%struct.ControllerInputs = type { i32, i32, i32, i32, i32 }
%struct.ControllerOutputs = type { i32, i32, i32, i32 }

; Function Attrs: noinline nounwind optnone uwtable
define dso_local dllexport void @bn_evaluate(ptr noundef %inputs, ptr noundef %outputs) #0 {
entry:
  %outputs.addr = alloca ptr, align 8
  %inputs.addr = alloca ptr, align 8
  store ptr %outputs, ptr %outputs.addr, align 8
  store ptr %inputs, ptr %inputs.addr, align 8
  %0 = load ptr, ptr %inputs.addr, align 8
  %crossing = getelementptr inbounds %struct.ControllerInputs, ptr %0, i32 0, i32 0
  %1 = load i32, ptr %crossing, align 4
  %tobool = icmp ne i32 %1, 0
  br i1 %tobool, label %if.then, label %if.else

if.then:                                          ; preds = %entry
  %2 = load ptr, ptr %outputs.addr, align 8
  %crossingPower = getelementptr inbounds %struct.ControllerOutputs, ptr %2, i32 0, i32 0
  store i32 1, ptr %crossingPower, align 4
  br label %if.end

if.else:                                          ; preds = %entry
  %3 = load ptr, ptr %outputs.addr, align 8
  %crossingPower1 = getelementptr inbounds %struct.ControllerOutputs, ptr %3, i32 0, i32 0
  store i32 0, ptr %crossingPower1, align 4
  br label %if.end

if.end:                                           ; preds = %if.else, %if.then
  %4 = load ptr, ptr %inputs.addr, align 8
  %liftPlate = getelementptr inbounds %struct.ControllerInputs, ptr %4, i32 0, i32 1
  %5 = load i32, ptr %liftPlate, align 4
  %tobool2 = icmp ne i32 %5, 0
  br i1 %tobool2, label %if.then3, label %if.else4

if.then3:                                         ; preds = %if.end
  %6 = load ptr, ptr %outputs.addr, align 8
  %liftPower = getelementptr inbounds %struct.ControllerOutputs, ptr %6, i32 0, i32 1
  store i32 1, ptr %liftPower, align 4
  br label %if.end6

if.else4:                                         ; preds = %if.end
  %7 = load ptr, ptr %outputs.addr, align 8
  %liftPower5 = getelementptr inbounds %struct.ControllerOutputs, ptr %7, i32 0, i32 1
  store i32 0, ptr %liftPower5, align 4
  br label %if.end6

if.end6:                                          ; preds = %if.else4, %if.then3
  %8 = load ptr, ptr %inputs.addr, align 8
  %link = getelementptr inbounds %struct.ControllerInputs, ptr %8, i32 0, i32 2
  %9 = load i32, ptr %link, align 4
  %tobool7 = icmp ne i32 %9, 0
  br i1 %tobool7, label %if.then8, label %if.else9

if.then8:                                         ; preds = %if.end6
  %10 = load ptr, ptr %outputs.addr, align 8
  %relayPower = getelementptr inbounds %struct.ControllerOutputs, ptr %10, i32 0, i32 2
  store i32 1, ptr %relayPower, align 4
  br label %if.end11

if.else9:                                         ; preds = %if.end6
  %11 = load ptr, ptr %outputs.addr, align 8
  %relayPower10 = getelementptr inbounds %struct.ControllerOutputs, ptr %11, i32 0, i32 2
  store i32 0, ptr %relayPower10, align 4
  br label %if.end11

if.end11:                                         ; preds = %if.else9, %if.then8
  %12 = load ptr, ptr %inputs.addr, align 8
  %maintenance = getelementptr inbounds %struct.ControllerInputs, ptr %12, i32 0, i32 3
  %13 = load i32, ptr %maintenance, align 4
  %tobool12 = icmp ne i32 %13, 0
  br i1 %tobool12, label %land.lhs.true, label %if.else15

land.lhs.true:                                    ; preds = %if.end11
  %14 = load ptr, ptr %inputs.addr, align 8
  %exitSocket = getelementptr inbounds %struct.ControllerInputs, ptr %14, i32 0, i32 4
  %15 = load i32, ptr %exitSocket, align 4
  %tobool13 = icmp ne i32 %15, 0
  br i1 %tobool13, label %if.then14, label %if.else15

if.then14:                                        ; preds = %land.lhs.true
  %16 = load ptr, ptr %outputs.addr, align 8
  %exitReady = getelementptr inbounds %struct.ControllerOutputs, ptr %16, i32 0, i32 3
  store i32 1, ptr %exitReady, align 4
  br label %if.end17

if.else15:                                        ; preds = %land.lhs.true, %if.end11
  %17 = load ptr, ptr %outputs.addr, align 8
  %exitReady16 = getelementptr inbounds %struct.ControllerOutputs, ptr %17, i32 0, i32 3
  store i32 0, ptr %exitReady16, align 4
  br label %if.end17

if.end17:                                         ; preds = %if.else15, %if.then14
  ret void
}

attributes #0 = { noinline nounwind optnone uwtable "min-legal-vector-width"="0" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }

!llvm.module.flags = !{!0, !1, !2}
!llvm.ident = !{!3}

!0 = !{i32 1, !"wchar_size", i32 2}
!1 = !{i32 8, !"PIC Level", i32 2}
!2 = !{i32 7, !"uwtable", i32 2}
!3 = !{!"clang version 16.0.6 (https://github.com/llvm/llvm-project.git 7cbf1a2591520c2491aa35339f227775f4d3adf6)"}
