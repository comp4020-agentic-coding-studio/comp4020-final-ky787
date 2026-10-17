; ModuleID = 'E:\Workspace\binary_binja_redesign\comp4020-final-ky787\experiments\coop-controllers\deadlock\src\controller.c'
source_filename = "E:\\Workspace\\binary_binja_redesign\\comp4020-final-ky787\\experiments\\coop-controllers\\deadlock\\src\\controller.c"
target datalayout = "e-m:w-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-windows-msvc19.51.36248"

%struct.ControllerInputs = type { i32, i32, i32, i32, i32, i32 }
%struct.ControllerOutputs = type { i32, i32, i32, i32, i32 }

; Function Attrs: noinline nounwind optnone uwtable
define dso_local dllexport void @bn_evaluate(ptr noundef %inputs, ptr noundef %outputs) #0 {
entry:
  %outputs.addr = alloca ptr, align 8
  %inputs.addr = alloca ptr, align 8
  %payloadReady = alloca i32, align 4
  store ptr %outputs, ptr %outputs.addr, align 8
  store ptr %inputs, ptr %inputs.addr, align 8
  %0 = load ptr, ptr %inputs.addr, align 8
  %payloadOne = getelementptr inbounds %struct.ControllerInputs, ptr %0, i32 0, i32 3
  %1 = load i32, ptr %payloadOne, align 4
  %tobool = icmp ne i32 %1, 0
  br i1 %tobool, label %land.lhs.true, label %land.end

land.lhs.true:                                    ; preds = %entry
  %2 = load ptr, ptr %inputs.addr, align 8
  %payloadTwo = getelementptr inbounds %struct.ControllerInputs, ptr %2, i32 0, i32 4
  %3 = load i32, ptr %payloadTwo, align 4
  %tobool1 = icmp ne i32 %3, 0
  br i1 %tobool1, label %land.rhs, label %land.end

land.rhs:                                         ; preds = %land.lhs.true
  %4 = load ptr, ptr %inputs.addr, align 8
  %payloadThree = getelementptr inbounds %struct.ControllerInputs, ptr %4, i32 0, i32 5
  %5 = load i32, ptr %payloadThree, align 4
  %tobool2 = icmp ne i32 %5, 0
  br label %land.end

land.end:                                         ; preds = %land.rhs, %land.lhs.true, %entry
  %6 = phi i1 [ false, %land.lhs.true ], [ false, %entry ], [ %tobool2, %land.rhs ]
  %land.ext = zext i1 %6 to i32
  store i32 %land.ext, ptr %payloadReady, align 4
  %7 = load ptr, ptr %inputs.addr, align 8
  %feed = getelementptr inbounds %struct.ControllerInputs, ptr %7, i32 0, i32 0
  %8 = load i32, ptr %feed, align 4
  %tobool3 = icmp ne i32 %8, 0
  br i1 %tobool3, label %land.lhs.true4, label %if.else

land.lhs.true4:                                   ; preds = %land.end
  %9 = load ptr, ptr %inputs.addr, align 8
  %safe = getelementptr inbounds %struct.ControllerInputs, ptr %9, i32 0, i32 1
  %10 = load i32, ptr %safe, align 4
  %tobool5 = icmp ne i32 %10, 0
  br i1 %tobool5, label %if.then, label %if.else

if.then:                                          ; preds = %land.lhs.true4
  %11 = load ptr, ptr %outputs.addr, align 8
  %cargoLift = getelementptr inbounds %struct.ControllerOutputs, ptr %11, i32 0, i32 0
  store i32 1, ptr %cargoLift, align 4
  br label %if.end

if.else:                                          ; preds = %land.lhs.true4, %land.end
  %12 = load ptr, ptr %outputs.addr, align 8
  %cargoLift6 = getelementptr inbounds %struct.ControllerOutputs, ptr %12, i32 0, i32 0
  store i32 0, ptr %cargoLift6, align 4
  br label %if.end

if.end:                                           ; preds = %if.else, %if.then
  %13 = load ptr, ptr %inputs.addr, align 8
  %safe7 = getelementptr inbounds %struct.ControllerInputs, ptr %13, i32 0, i32 1
  %14 = load i32, ptr %safe7, align 4
  %tobool8 = icmp ne i32 %14, 0
  br i1 %tobool8, label %if.else10, label %if.then9

if.then9:                                         ; preds = %if.end
  %15 = load ptr, ptr %outputs.addr, align 8
  %shaftFirewall = getelementptr inbounds %struct.ControllerOutputs, ptr %15, i32 0, i32 1
  store i32 1, ptr %shaftFirewall, align 4
  br label %if.end12

if.else10:                                        ; preds = %if.end
  %16 = load ptr, ptr %outputs.addr, align 8
  %shaftFirewall11 = getelementptr inbounds %struct.ControllerOutputs, ptr %16, i32 0, i32 1
  store i32 0, ptr %shaftFirewall11, align 4
  br label %if.end12

if.end12:                                         ; preds = %if.else10, %if.then9
  %17 = load ptr, ptr %inputs.addr, align 8
  %safe13 = getelementptr inbounds %struct.ControllerInputs, ptr %17, i32 0, i32 1
  %18 = load i32, ptr %safe13, align 4
  %tobool14 = icmp ne i32 %18, 0
  br i1 %tobool14, label %land.lhs.true15, label %lor.lhs.false

land.lhs.true15:                                  ; preds = %if.end12
  %19 = load ptr, ptr %inputs.addr, align 8
  %feed16 = getelementptr inbounds %struct.ControllerInputs, ptr %19, i32 0, i32 0
  %20 = load i32, ptr %feed16, align 4
  %tobool17 = icmp ne i32 %20, 0
  br i1 %tobool17, label %lor.lhs.false, label %if.then19

lor.lhs.false:                                    ; preds = %land.lhs.true15, %if.end12
  %21 = load i32, ptr %payloadReady, align 4
  %tobool18 = icmp ne i32 %21, 0
  br i1 %tobool18, label %if.then19, label %if.else20

if.then19:                                        ; preds = %lor.lhs.false, %land.lhs.true15
  %22 = load ptr, ptr %outputs.addr, align 8
  %serviceRelay = getelementptr inbounds %struct.ControllerOutputs, ptr %22, i32 0, i32 2
  store i32 1, ptr %serviceRelay, align 4
  br label %if.end22

if.else20:                                        ; preds = %lor.lhs.false
  %23 = load ptr, ptr %outputs.addr, align 8
  %serviceRelay21 = getelementptr inbounds %struct.ControllerOutputs, ptr %23, i32 0, i32 2
  store i32 0, ptr %serviceRelay21, align 4
  br label %if.end22

if.end22:                                         ; preds = %if.else20, %if.then19
  %24 = load ptr, ptr %inputs.addr, align 8
  %hatchToggle = getelementptr inbounds %struct.ControllerInputs, ptr %24, i32 0, i32 2
  %25 = load i32, ptr %hatchToggle, align 4
  %tobool23 = icmp ne i32 %25, 0
  br i1 %tobool23, label %if.then24, label %if.else25

if.then24:                                        ; preds = %if.end22
  %26 = load ptr, ptr %outputs.addr, align 8
  %hatchOpen = getelementptr inbounds %struct.ControllerOutputs, ptr %26, i32 0, i32 3
  store i32 1, ptr %hatchOpen, align 4
  br label %if.end27

if.else25:                                        ; preds = %if.end22
  %27 = load ptr, ptr %outputs.addr, align 8
  %hatchOpen26 = getelementptr inbounds %struct.ControllerOutputs, ptr %27, i32 0, i32 3
  store i32 0, ptr %hatchOpen26, align 4
  br label %if.end27

if.end27:                                         ; preds = %if.else25, %if.then24
  %28 = load i32, ptr %payloadReady, align 4
  %tobool28 = icmp ne i32 %28, 0
  br i1 %tobool28, label %if.then29, label %if.else31

if.then29:                                        ; preds = %if.end27
  %29 = load ptr, ptr %outputs.addr, align 8
  %payloadReady30 = getelementptr inbounds %struct.ControllerOutputs, ptr %29, i32 0, i32 4
  store i32 1, ptr %payloadReady30, align 4
  br label %if.end33

if.else31:                                        ; preds = %if.end27
  %30 = load ptr, ptr %outputs.addr, align 8
  %payloadReady32 = getelementptr inbounds %struct.ControllerOutputs, ptr %30, i32 0, i32 4
  store i32 0, ptr %payloadReady32, align 4
  br label %if.end33

if.end33:                                         ; preds = %if.else31, %if.then29
  ret void
}

attributes #0 = { noinline nounwind optnone uwtable "min-legal-vector-width"="0" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }

!llvm.module.flags = !{!0, !1, !2}
!llvm.ident = !{!3}

!0 = !{i32 1, !"wchar_size", i32 2}
!1 = !{i32 8, !"PIC Level", i32 2}
!2 = !{i32 7, !"uwtable", i32 2}
!3 = !{!"clang version 16.0.6 (https://github.com/llvm/llvm-project.git 7cbf1a2591520c2491aa35339f227775f4d3adf6)"}
