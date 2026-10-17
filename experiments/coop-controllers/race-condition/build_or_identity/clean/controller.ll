; ModuleID = 'E:\Workspace\binary_binja_redesign\comp4020-final-ky787\experiments\coop-controllers\race-condition\src\controller.c'
source_filename = "E:\\Workspace\\binary_binja_redesign\\comp4020-final-ky787\\experiments\\coop-controllers\\race-condition\\src\\controller.c"
target datalayout = "e-m:w-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-windows-msvc19.51.36248"

%struct.ControllerInputs = type { i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32 }
%struct.ControllerOutputs = type { i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32 }

; Function Attrs: noinline nounwind optnone uwtable
define dso_local dllexport void @bn_evaluate(ptr noundef %inputs, ptr noundef %outputs) #0 {
entry:
  %outputs.addr = alloca ptr, align 8
  %inputs.addr = alloca ptr, align 8
  %master = alloca i32, align 4
  store ptr %outputs, ptr %outputs.addr, align 8
  store ptr %inputs, ptr %inputs.addr, align 8
  %0 = load ptr, ptr %inputs.addr, align 8
  %payloadDelivered = getelementptr inbounds %struct.ControllerInputs, ptr %0, i32 0, i32 2
  %1 = load i32, ptr %payloadDelivered, align 4
  %tobool = icmp ne i32 %1, 0
  br i1 %tobool, label %land.rhs, label %land.end

land.rhs:                                         ; preds = %entry
  %2 = load ptr, ptr %inputs.addr, align 8
  %traceOccupied = getelementptr inbounds %struct.ControllerInputs, ptr %2, i32 0, i32 3
  %3 = load i32, ptr %traceOccupied, align 4
  %tobool1 = icmp ne i32 %3, 0
  br label %land.end

land.end:                                         ; preds = %land.rhs, %entry
  %4 = phi i1 [ false, %entry ], [ %tobool1, %land.rhs ]
  %land.ext = zext i1 %4 to i32
  store i32 %land.ext, ptr %master, align 4
  %5 = load ptr, ptr %inputs.addr, align 8
  %dropA = getelementptr inbounds %struct.ControllerInputs, ptr %5, i32 0, i32 0
  %6 = load i32, ptr %dropA, align 4
  %tobool2 = icmp ne i32 %6, 0
  br i1 %tobool2, label %if.else, label %if.then

if.then:                                          ; preds = %land.end
  %7 = load ptr, ptr %outputs.addr, align 8
  %topBridge = getelementptr inbounds %struct.ControllerOutputs, ptr %7, i32 0, i32 0
  store i32 1, ptr %topBridge, align 4
  br label %if.end

if.else:                                          ; preds = %land.end
  %8 = load ptr, ptr %outputs.addr, align 8
  %topBridge3 = getelementptr inbounds %struct.ControllerOutputs, ptr %8, i32 0, i32 0
  store i32 0, ptr %topBridge3, align 4
  br label %if.end

if.end:                                           ; preds = %if.else, %if.then
  %9 = load ptr, ptr %inputs.addr, align 8
  %dropB = getelementptr inbounds %struct.ControllerInputs, ptr %9, i32 0, i32 1
  %10 = load i32, ptr %dropB, align 4
  %tobool4 = icmp ne i32 %10, 0
  br i1 %tobool4, label %if.else8, label %land.lhs.true

land.lhs.true:                                    ; preds = %if.end
  %11 = load ptr, ptr %inputs.addr, align 8
  %bufferPhase = getelementptr inbounds %struct.ControllerInputs, ptr %11, i32 0, i32 10
  %12 = load i32, ptr %bufferPhase, align 4
  %cmp = icmp eq i32 %12, 0
  br i1 %cmp, label %if.then7, label %lor.lhs.false

lor.lhs.false:                                    ; preds = %land.lhs.true
  %13 = load ptr, ptr %inputs.addr, align 8
  %bufferPhase5 = getelementptr inbounds %struct.ControllerInputs, ptr %13, i32 0, i32 10
  %14 = load i32, ptr %bufferPhase5, align 4
  %cmp6 = icmp eq i32 %14, 1
  br i1 %cmp6, label %if.then7, label %if.else8

if.then7:                                         ; preds = %lor.lhs.false, %land.lhs.true
  %15 = load ptr, ptr %outputs.addr, align 8
  %bufferBridge = getelementptr inbounds %struct.ControllerOutputs, ptr %15, i32 0, i32 1
  store i32 1, ptr %bufferBridge, align 4
  br label %if.end10

if.else8:                                         ; preds = %lor.lhs.false, %if.end
  %16 = load ptr, ptr %outputs.addr, align 8
  %bufferBridge9 = getelementptr inbounds %struct.ControllerOutputs, ptr %16, i32 0, i32 1
  store i32 0, ptr %bufferBridge9, align 4
  br label %if.end10

if.end10:                                         ; preds = %if.else8, %if.then7
  %17 = load ptr, ptr %inputs.addr, align 8
  %dropB11 = getelementptr inbounds %struct.ControllerInputs, ptr %17, i32 0, i32 1
  %18 = load i32, ptr %dropB11, align 4
  %tobool12 = icmp ne i32 %18, 0
  br i1 %tobool12, label %lor.lhs.false13, label %if.then16

lor.lhs.false13:                                  ; preds = %if.end10
  %19 = load ptr, ptr %inputs.addr, align 8
  %bufferPhase14 = getelementptr inbounds %struct.ControllerInputs, ptr %19, i32 0, i32 10
  %20 = load i32, ptr %bufferPhase14, align 4
  %cmp15 = icmp eq i32 %20, 3
  br i1 %cmp15, label %if.then16, label %if.else17

if.then16:                                        ; preds = %lor.lhs.false13, %if.end10
  %21 = load ptr, ptr %outputs.addr, align 8
  %safetyFirewall = getelementptr inbounds %struct.ControllerOutputs, ptr %21, i32 0, i32 2
  store i32 1, ptr %safetyFirewall, align 4
  br label %if.end19

if.else17:                                        ; preds = %lor.lhs.false13
  %22 = load ptr, ptr %outputs.addr, align 8
  %safetyFirewall18 = getelementptr inbounds %struct.ControllerOutputs, ptr %22, i32 0, i32 2
  store i32 0, ptr %safetyFirewall18, align 4
  br label %if.end19

if.end19:                                         ; preds = %if.else17, %if.then16
  %23 = load ptr, ptr %inputs.addr, align 8
  %dropA20 = getelementptr inbounds %struct.ControllerInputs, ptr %23, i32 0, i32 0
  %24 = load i32, ptr %dropA20, align 4
  %tobool21 = icmp ne i32 %24, 0
  br i1 %tobool21, label %land.lhs.true22, label %if.else26

land.lhs.true22:                                  ; preds = %if.end19
  %25 = load ptr, ptr %inputs.addr, align 8
  %dropB23 = getelementptr inbounds %struct.ControllerInputs, ptr %25, i32 0, i32 1
  %26 = load i32, ptr %dropB23, align 4
  %tobool24 = icmp ne i32 %26, 0
  br i1 %tobool24, label %if.then25, label %if.else26

if.then25:                                        ; preds = %land.lhs.true22
  %27 = load ptr, ptr %outputs.addr, align 8
  %raceFirewall = getelementptr inbounds %struct.ControllerOutputs, ptr %27, i32 0, i32 3
  store i32 1, ptr %raceFirewall, align 4
  br label %if.end28

if.else26:                                        ; preds = %land.lhs.true22, %if.end19
  %28 = load ptr, ptr %outputs.addr, align 8
  %raceFirewall27 = getelementptr inbounds %struct.ControllerOutputs, ptr %28, i32 0, i32 3
  store i32 0, ptr %raceFirewall27, align 4
  br label %if.end28

if.end28:                                         ; preds = %if.else26, %if.then25
  %29 = load i32, ptr %master, align 4
  %tobool29 = icmp ne i32 %29, 0
  br i1 %tobool29, label %if.then30, label %if.else31

if.then30:                                        ; preds = %if.end28
  %30 = load ptr, ptr %outputs.addr, align 8
  %spanMaster = getelementptr inbounds %struct.ControllerOutputs, ptr %30, i32 0, i32 4
  store i32 1, ptr %spanMaster, align 4
  br label %if.end33

if.else31:                                        ; preds = %if.end28
  %31 = load ptr, ptr %outputs.addr, align 8
  %spanMaster32 = getelementptr inbounds %struct.ControllerOutputs, ptr %31, i32 0, i32 4
  store i32 0, ptr %spanMaster32, align 4
  br label %if.end33

if.end33:                                         ; preds = %if.else31, %if.then30
  %32 = load i32, ptr %master, align 4
  %tobool34 = icmp ne i32 %32, 0
  br i1 %tobool34, label %land.lhs.true35, label %if.else38

land.lhs.true35:                                  ; preds = %if.end33
  %33 = load ptr, ptr %inputs.addr, align 8
  %phase = getelementptr inbounds %struct.ControllerInputs, ptr %33, i32 0, i32 4
  %34 = load i32, ptr %phase, align 4
  %tobool36 = icmp ne i32 %34, 0
  br i1 %tobool36, label %if.else38, label %if.then37

if.then37:                                        ; preds = %land.lhs.true35
  %35 = load ptr, ptr %outputs.addr, align 8
  %phaseA = getelementptr inbounds %struct.ControllerOutputs, ptr %35, i32 0, i32 5
  store i32 1, ptr %phaseA, align 4
  br label %if.end40

if.else38:                                        ; preds = %land.lhs.true35, %if.end33
  %36 = load ptr, ptr %outputs.addr, align 8
  %phaseA39 = getelementptr inbounds %struct.ControllerOutputs, ptr %36, i32 0, i32 5
  store i32 0, ptr %phaseA39, align 4
  br label %if.end40

if.end40:                                         ; preds = %if.else38, %if.then37
  %37 = load i32, ptr %master, align 4
  %tobool41 = icmp ne i32 %37, 0
  br i1 %tobool41, label %land.lhs.true42, label %if.else46

land.lhs.true42:                                  ; preds = %if.end40
  %38 = load ptr, ptr %inputs.addr, align 8
  %phase43 = getelementptr inbounds %struct.ControllerInputs, ptr %38, i32 0, i32 4
  %39 = load i32, ptr %phase43, align 4
  %tobool44 = icmp ne i32 %39, 0
  br i1 %tobool44, label %if.then45, label %if.else46

if.then45:                                        ; preds = %land.lhs.true42
  %40 = load ptr, ptr %outputs.addr, align 8
  %phaseB = getelementptr inbounds %struct.ControllerOutputs, ptr %40, i32 0, i32 6
  store i32 1, ptr %phaseB, align 4
  br label %if.end48

if.else46:                                        ; preds = %land.lhs.true42, %if.end40
  %41 = load ptr, ptr %outputs.addr, align 8
  %phaseB47 = getelementptr inbounds %struct.ControllerOutputs, ptr %41, i32 0, i32 6
  store i32 0, ptr %phaseB47, align 4
  br label %if.end48

if.end48:                                         ; preds = %if.else46, %if.then45
  %42 = load ptr, ptr %inputs.addr, align 8
  %returnOccupied = getelementptr inbounds %struct.ControllerInputs, ptr %42, i32 0, i32 5
  %43 = load i32, ptr %returnOccupied, align 4
  %tobool49 = icmp ne i32 %43, 0
  br i1 %tobool49, label %if.then50, label %if.else51

if.then50:                                        ; preds = %if.end48
  %44 = load ptr, ptr %outputs.addr, align 8
  %returnBridge = getelementptr inbounds %struct.ControllerOutputs, ptr %44, i32 0, i32 7
  store i32 1, ptr %returnBridge, align 4
  br label %if.end53

if.else51:                                        ; preds = %if.end48
  %45 = load ptr, ptr %outputs.addr, align 8
  %returnBridge52 = getelementptr inbounds %struct.ControllerOutputs, ptr %45, i32 0, i32 7
  store i32 0, ptr %returnBridge52, align 4
  br label %if.end53

if.end53:                                         ; preds = %if.else51, %if.then50
  %46 = load ptr, ptr %inputs.addr, align 8
  %exitUnlocked = getelementptr inbounds %struct.ControllerInputs, ptr %46, i32 0, i32 7
  %47 = load i32, ptr %exitUnlocked, align 4
  %tobool54 = icmp ne i32 %47, 0
  br i1 %tobool54, label %if.then55, label %if.else56

if.then55:                                        ; preds = %if.end53
  %48 = load ptr, ptr %outputs.addr, align 8
  %exitDoor = getelementptr inbounds %struct.ControllerOutputs, ptr %48, i32 0, i32 8
  store i32 1, ptr %exitDoor, align 4
  br label %if.end58

if.else56:                                        ; preds = %if.end53
  %49 = load ptr, ptr %outputs.addr, align 8
  %exitDoor57 = getelementptr inbounds %struct.ControllerOutputs, ptr %49, i32 0, i32 8
  store i32 0, ptr %exitDoor57, align 4
  br label %if.end58

if.end58:                                         ; preds = %if.else56, %if.then55
  %50 = load ptr, ptr %outputs.addr, align 8
  %phaseA59 = getelementptr inbounds %struct.ControllerOutputs, ptr %50, i32 0, i32 5
  %51 = load i32, ptr %phaseA59, align 4
  %tobool60 = icmp ne i32 %51, 0
  br i1 %tobool60, label %if.then65, label %lor.lhs.false61

lor.lhs.false61:                                  ; preds = %if.end58
  %52 = load ptr, ptr %inputs.addr, align 8
  %phaseGraceActive = getelementptr inbounds %struct.ControllerInputs, ptr %52, i32 0, i32 8
  %53 = load i32, ptr %phaseGraceActive, align 4
  %tobool62 = icmp ne i32 %53, 0
  br i1 %tobool62, label %land.lhs.true63, label %if.else66

land.lhs.true63:                                  ; preds = %lor.lhs.false61
  %54 = load i32, ptr %master, align 4
  %tobool64 = icmp ne i32 %54, 0
  br i1 %tobool64, label %if.then65, label %if.else66

if.then65:                                        ; preds = %land.lhs.true63, %if.end58
  %55 = load ptr, ptr %outputs.addr, align 8
  %physicalPhaseA = getelementptr inbounds %struct.ControllerOutputs, ptr %55, i32 0, i32 9
  store i32 1, ptr %physicalPhaseA, align 4
  br label %if.end68

if.else66:                                        ; preds = %land.lhs.true63, %lor.lhs.false61
  %56 = load ptr, ptr %outputs.addr, align 8
  %physicalPhaseA67 = getelementptr inbounds %struct.ControllerOutputs, ptr %56, i32 0, i32 9
  store i32 0, ptr %physicalPhaseA67, align 4
  br label %if.end68

if.end68:                                         ; preds = %if.else66, %if.then65
  %57 = load ptr, ptr %outputs.addr, align 8
  %phaseB69 = getelementptr inbounds %struct.ControllerOutputs, ptr %57, i32 0, i32 6
  %58 = load i32, ptr %phaseB69, align 4
  %tobool70 = icmp ne i32 %58, 0
  br i1 %tobool70, label %if.then76, label %lor.lhs.false71

lor.lhs.false71:                                  ; preds = %if.end68
  %59 = load ptr, ptr %inputs.addr, align 8
  %phaseGraceActive72 = getelementptr inbounds %struct.ControllerInputs, ptr %59, i32 0, i32 8
  %60 = load i32, ptr %phaseGraceActive72, align 4
  %tobool73 = icmp ne i32 %60, 0
  br i1 %tobool73, label %land.lhs.true74, label %if.else77

land.lhs.true74:                                  ; preds = %lor.lhs.false71
  %61 = load i32, ptr %master, align 4
  %tobool75 = icmp ne i32 %61, 0
  br i1 %tobool75, label %if.then76, label %if.else77

if.then76:                                        ; preds = %land.lhs.true74, %if.end68
  %62 = load ptr, ptr %outputs.addr, align 8
  %physicalPhaseB = getelementptr inbounds %struct.ControllerOutputs, ptr %62, i32 0, i32 10
  store i32 1, ptr %physicalPhaseB, align 4
  br label %if.end79

if.else77:                                        ; preds = %land.lhs.true74, %lor.lhs.false71
  %63 = load ptr, ptr %outputs.addr, align 8
  %physicalPhaseB78 = getelementptr inbounds %struct.ControllerOutputs, ptr %63, i32 0, i32 10
  store i32 0, ptr %physicalPhaseB78, align 4
  br label %if.end79

if.end79:                                         ; preds = %if.else77, %if.then76
  %64 = load ptr, ptr %outputs.addr, align 8
  %returnBridge80 = getelementptr inbounds %struct.ControllerOutputs, ptr %64, i32 0, i32 7
  %65 = load i32, ptr %returnBridge80, align 4
  %tobool81 = icmp ne i32 %65, 0
  br i1 %tobool81, label %if.then84, label %lor.lhs.false82

lor.lhs.false82:                                  ; preds = %if.end79
  %66 = load ptr, ptr %inputs.addr, align 8
  %returnGraceActive = getelementptr inbounds %struct.ControllerInputs, ptr %66, i32 0, i32 9
  %67 = load i32, ptr %returnGraceActive, align 4
  %tobool83 = icmp ne i32 %67, 0
  br i1 %tobool83, label %if.then84, label %if.else85

if.then84:                                        ; preds = %lor.lhs.false82, %if.end79
  %68 = load ptr, ptr %outputs.addr, align 8
  %physicalReturnBridge = getelementptr inbounds %struct.ControllerOutputs, ptr %68, i32 0, i32 11
  store i32 1, ptr %physicalReturnBridge, align 4
  br label %if.end87

if.else85:                                        ; preds = %lor.lhs.false82
  %69 = load ptr, ptr %outputs.addr, align 8
  %physicalReturnBridge86 = getelementptr inbounds %struct.ControllerOutputs, ptr %69, i32 0, i32 11
  store i32 0, ptr %physicalReturnBridge86, align 4
  br label %if.end87

if.end87:                                         ; preds = %if.else85, %if.then84
  %70 = load ptr, ptr %inputs.addr, align 8
  %finalControl = getelementptr inbounds %struct.ControllerInputs, ptr %70, i32 0, i32 6
  %71 = load i32, ptr %finalControl, align 4
  %tobool88 = icmp ne i32 %71, 0
  br i1 %tobool88, label %land.lhs.true89, label %if.else93

land.lhs.true89:                                  ; preds = %if.end87
  %72 = load ptr, ptr %inputs.addr, align 8
  %payloadDelivered90 = getelementptr inbounds %struct.ControllerInputs, ptr %72, i32 0, i32 2
  %73 = load i32, ptr %payloadDelivered90, align 4
  %tobool91 = icmp ne i32 %73, 0
  br i1 %tobool91, label %if.then92, label %if.else93

if.then92:                                        ; preds = %land.lhs.true89
  %74 = load ptr, ptr %outputs.addr, align 8
  %exitUnlockCandidate = getelementptr inbounds %struct.ControllerOutputs, ptr %74, i32 0, i32 12
  store i32 1, ptr %exitUnlockCandidate, align 4
  br label %if.end95

if.else93:                                        ; preds = %land.lhs.true89, %if.end87
  %75 = load ptr, ptr %outputs.addr, align 8
  %exitUnlockCandidate94 = getelementptr inbounds %struct.ControllerOutputs, ptr %75, i32 0, i32 12
  store i32 0, ptr %exitUnlockCandidate94, align 4
  br label %if.end95

if.end95:                                         ; preds = %if.else93, %if.then92
  ret void
}

attributes #0 = { noinline nounwind optnone uwtable "min-legal-vector-width"="0" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }

!llvm.module.flags = !{!0, !1, !2}
!llvm.ident = !{!3}

!0 = !{i32 1, !"wchar_size", i32 2}
!1 = !{i32 8, !"PIC Level", i32 2}
!2 = !{i32 7, !"uwtable", i32 2}
!3 = !{!"clang version 16.0.6 (https://github.com/llvm/llvm-project.git 7cbf1a2591520c2491aa35339f227775f4d3adf6)"}
