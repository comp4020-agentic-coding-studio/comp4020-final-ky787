; ModuleID = 'E:\Workspace\binary_binja_redesign\comp4020-final-ky787\experiments\coop-controllers\use-after-free\src\controller.c'
source_filename = "E:\\Workspace\\binary_binja_redesign\\comp4020-final-ky787\\experiments\\coop-controllers\\use-after-free\\src\\controller.c"
target datalayout = "e-m:w-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-windows-msvc19.51.36248"

%struct.ControllerInputs = type { i32, i32, i32, i32, i32 }
%struct.ControllerOutputs = type { i32, i32, i32, i32, i32, i32 }

; Function Attrs: noinline nounwind optnone uwtable
define dso_local dllexport void @bn_evaluate(ptr noundef %inputs, ptr noundef %outputs) #0 {
entry:
  %outputs.addr = alloca ptr, align 8
  %inputs.addr = alloca ptr, align 8
  store ptr %outputs, ptr %outputs.addr, align 8
  store ptr %inputs, ptr %inputs.addr, align 8
  %0 = load ptr, ptr %inputs.addr, align 8
  %launch = getelementptr inbounds %struct.ControllerInputs, ptr %0, i32 0, i32 0
  %1 = load i32, ptr %launch, align 4
  %tobool = icmp ne i32 %1, 0
  br i1 %tobool, label %if.then, label %if.else

if.then:                                          ; preds = %entry
  %2 = load ptr, ptr %outputs.addr, align 8
  %launchPower = getelementptr inbounds %struct.ControllerOutputs, ptr %2, i32 0, i32 0
  store i32 1, ptr %launchPower, align 4
  br label %if.end

if.else:                                          ; preds = %entry
  %3 = load ptr, ptr %outputs.addr, align 8
  %launchPower1 = getelementptr inbounds %struct.ControllerOutputs, ptr %3, i32 0, i32 0
  store i32 0, ptr %launchPower1, align 4
  br label %if.end

if.end:                                           ; preds = %if.else, %if.then
  %4 = load ptr, ptr %inputs.addr, align 8
  %plateA = getelementptr inbounds %struct.ControllerInputs, ptr %4, i32 0, i32 1
  %5 = load i32, ptr %plateA, align 4
  %tobool2 = icmp ne i32 %5, 0
  br i1 %tobool2, label %if.then3, label %if.else4

if.then3:                                         ; preds = %if.end
  %6 = load ptr, ptr %outputs.addr, align 8
  %routeA = getelementptr inbounds %struct.ControllerOutputs, ptr %6, i32 0, i32 1
  store i32 1, ptr %routeA, align 4
  br label %if.end6

if.else4:                                         ; preds = %if.end
  %7 = load ptr, ptr %outputs.addr, align 8
  %routeA5 = getelementptr inbounds %struct.ControllerOutputs, ptr %7, i32 0, i32 1
  store i32 0, ptr %routeA5, align 4
  br label %if.end6

if.end6:                                          ; preds = %if.else4, %if.then3
  %8 = load ptr, ptr %inputs.addr, align 8
  %plateB = getelementptr inbounds %struct.ControllerInputs, ptr %8, i32 0, i32 2
  %9 = load i32, ptr %plateB, align 4
  %tobool7 = icmp ne i32 %9, 0
  br i1 %tobool7, label %land.lhs.true, label %if.else11

land.lhs.true:                                    ; preds = %if.end6
  %10 = load ptr, ptr %inputs.addr, align 8
  %plateA8 = getelementptr inbounds %struct.ControllerInputs, ptr %10, i32 0, i32 1
  %11 = load i32, ptr %plateA8, align 4
  %tobool9 = icmp ne i32 %11, 0
  br i1 %tobool9, label %if.else11, label %if.then10

if.then10:                                        ; preds = %land.lhs.true
  %12 = load ptr, ptr %outputs.addr, align 8
  %routeB = getelementptr inbounds %struct.ControllerOutputs, ptr %12, i32 0, i32 2
  store i32 1, ptr %routeB, align 4
  br label %if.end13

if.else11:                                        ; preds = %land.lhs.true, %if.end6
  %13 = load ptr, ptr %outputs.addr, align 8
  %routeB12 = getelementptr inbounds %struct.ControllerOutputs, ptr %13, i32 0, i32 2
  store i32 0, ptr %routeB12, align 4
  br label %if.end13

if.end13:                                         ; preds = %if.else11, %if.then10
  %14 = load ptr, ptr %inputs.addr, align 8
  %plateC = getelementptr inbounds %struct.ControllerInputs, ptr %14, i32 0, i32 3
  %15 = load i32, ptr %plateC, align 4
  %tobool14 = icmp ne i32 %15, 0
  br i1 %tobool14, label %land.lhs.true15, label %if.else19

land.lhs.true15:                                  ; preds = %if.end13
  %16 = load ptr, ptr %inputs.addr, align 8
  %plateB16 = getelementptr inbounds %struct.ControllerInputs, ptr %16, i32 0, i32 2
  %17 = load i32, ptr %plateB16, align 4
  %tobool17 = icmp ne i32 %17, 0
  br i1 %tobool17, label %if.else19, label %if.then18

if.then18:                                        ; preds = %land.lhs.true15
  %18 = load ptr, ptr %outputs.addr, align 8
  %routeC = getelementptr inbounds %struct.ControllerOutputs, ptr %18, i32 0, i32 3
  store i32 1, ptr %routeC, align 4
  br label %if.end21

if.else19:                                        ; preds = %land.lhs.true15, %if.end13
  %19 = load ptr, ptr %outputs.addr, align 8
  %routeC20 = getelementptr inbounds %struct.ControllerOutputs, ptr %19, i32 0, i32 3
  store i32 0, ptr %routeC20, align 4
  br label %if.end21

if.end21:                                         ; preds = %if.else19, %if.then18
  %20 = load ptr, ptr %inputs.addr, align 8
  %assist = getelementptr inbounds %struct.ControllerInputs, ptr %20, i32 0, i32 4
  %21 = load i32, ptr %assist, align 4
  %tobool22 = icmp ne i32 %21, 0
  br i1 %tobool22, label %land.lhs.true23, label %if.then26

land.lhs.true23:                                  ; preds = %if.end21
  %22 = load ptr, ptr %inputs.addr, align 8
  %plateC24 = getelementptr inbounds %struct.ControllerInputs, ptr %22, i32 0, i32 3
  %23 = load i32, ptr %plateC24, align 4
  %tobool25 = icmp ne i32 %23, 0
  br i1 %tobool25, label %if.then26, label %if.else27

if.then26:                                        ; preds = %land.lhs.true23, %if.end21
  %24 = load ptr, ptr %outputs.addr, align 8
  %assistBlocked = getelementptr inbounds %struct.ControllerOutputs, ptr %24, i32 0, i32 4
  store i32 1, ptr %assistBlocked, align 4
  br label %if.end29

if.else27:                                        ; preds = %land.lhs.true23
  %25 = load ptr, ptr %outputs.addr, align 8
  %assistBlocked28 = getelementptr inbounds %struct.ControllerOutputs, ptr %25, i32 0, i32 4
  store i32 0, ptr %assistBlocked28, align 4
  br label %if.end29

if.end29:                                         ; preds = %if.else27, %if.then26
  %26 = load ptr, ptr %inputs.addr, align 8
  %assist30 = getelementptr inbounds %struct.ControllerInputs, ptr %26, i32 0, i32 4
  %27 = load i32, ptr %assist30, align 4
  %tobool31 = icmp ne i32 %27, 0
  br i1 %tobool31, label %if.then32, label %if.else33

if.then32:                                        ; preds = %if.end29
  %28 = load ptr, ptr %outputs.addr, align 8
  %exitReady = getelementptr inbounds %struct.ControllerOutputs, ptr %28, i32 0, i32 5
  store i32 1, ptr %exitReady, align 4
  br label %if.end35

if.else33:                                        ; preds = %if.end29
  %29 = load ptr, ptr %outputs.addr, align 8
  %exitReady34 = getelementptr inbounds %struct.ControllerOutputs, ptr %29, i32 0, i32 5
  store i32 0, ptr %exitReady34, align 4
  br label %if.end35

if.end35:                                         ; preds = %if.else33, %if.then32
  ret void
}

attributes #0 = { noinline nounwind optnone uwtable "min-legal-vector-width"="0" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }

!llvm.module.flags = !{!0, !1, !2}
!llvm.ident = !{!3}

!0 = !{i32 1, !"wchar_size", i32 2}
!1 = !{i32 8, !"PIC Level", i32 2}
!2 = !{i32 7, !"uwtable", i32 2}
!3 = !{!"clang version 16.0.6 (https://github.com/llvm/llvm-project.git 7cbf1a2591520c2491aa35339f227775f4d3adf6)"}
