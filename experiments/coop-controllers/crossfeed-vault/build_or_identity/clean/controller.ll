; ModuleID = 'E:\Workspace\binary_binja_redesign\comp4020-final-ky787\experiments\coop-controllers\crossfeed-vault\src\controller.c'
source_filename = "E:\\Workspace\\binary_binja_redesign\\comp4020-final-ky787\\experiments\\coop-controllers\\crossfeed-vault\\src\\controller.c"
target datalayout = "e-m:w-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-windows-msvc19.51.36248"

%struct.ControllerInputs = type { i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32 }
%struct.ControllerOutputs = type { i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32 }

; Function Attrs: noinline nounwind optnone uwtable
define dso_local dllexport void @bn_evaluate(ptr noundef %inputs, ptr noundef %outputs) #0 {
entry:
  %outputs.addr = alloca ptr, align 8
  %inputs.addr = alloca ptr, align 8
  %master = alloca i32, align 4
  %vault = alloca i32, align 4
  store ptr %outputs, ptr %outputs.addr, align 8
  store ptr %inputs, ptr %inputs.addr, align 8
  %0 = load ptr, ptr %inputs.addr, align 8
  %switchC = getelementptr inbounds %struct.ControllerInputs, ptr %0, i32 0, i32 1
  %1 = load i32, ptr %switchC, align 4
  %tobool = icmp ne i32 %1, 0
  br i1 %tobool, label %land.rhs, label %land.end

land.rhs:                                         ; preds = %entry
  %2 = load ptr, ptr %inputs.addr, align 8
  %routePowerOccupied = getelementptr inbounds %struct.ControllerInputs, ptr %2, i32 0, i32 5
  %3 = load i32, ptr %routePowerOccupied, align 4
  %tobool1 = icmp ne i32 %3, 0
  br label %land.end

land.end:                                         ; preds = %land.rhs, %entry
  %4 = phi i1 [ false, %entry ], [ %tobool1, %land.rhs ]
  %land.ext = zext i1 %4 to i32
  store i32 %land.ext, ptr %master, align 4
  %5 = load ptr, ptr %inputs.addr, align 8
  %cubeOnFinalLeft = getelementptr inbounds %struct.ControllerInputs, ptr %5, i32 0, i32 7
  %6 = load i32, ptr %cubeOnFinalLeft, align 4
  %tobool2 = icmp ne i32 %6, 0
  br i1 %tobool2, label %land.rhs3, label %land.end5

land.rhs3:                                        ; preds = %land.end
  %7 = load ptr, ptr %inputs.addr, align 8
  %cubeOnFinalRight = getelementptr inbounds %struct.ControllerInputs, ptr %7, i32 0, i32 8
  %8 = load i32, ptr %cubeOnFinalRight, align 4
  %tobool4 = icmp ne i32 %8, 0
  br label %land.end5

land.end5:                                        ; preds = %land.rhs3, %land.end
  %9 = phi i1 [ false, %land.end ], [ %tobool4, %land.rhs3 ]
  %land.ext6 = zext i1 %9 to i32
  store i32 %land.ext6, ptr %vault, align 4
  %10 = load ptr, ptr %inputs.addr, align 8
  %plateAOccupied = getelementptr inbounds %struct.ControllerInputs, ptr %10, i32 0, i32 4
  %11 = load i32, ptr %plateAOccupied, align 4
  %tobool7 = icmp ne i32 %11, 0
  br i1 %tobool7, label %land.lhs.true, label %if.else

land.lhs.true:                                    ; preds = %land.end5
  %12 = load ptr, ptr %inputs.addr, align 8
  %switchB = getelementptr inbounds %struct.ControllerInputs, ptr %12, i32 0, i32 0
  %13 = load i32, ptr %switchB, align 4
  %tobool8 = icmp ne i32 %13, 0
  br i1 %tobool8, label %if.else, label %if.then

if.then:                                          ; preds = %land.lhs.true
  %14 = load ptr, ptr %outputs.addr, align 8
  %grappleAnchor = getelementptr inbounds %struct.ControllerOutputs, ptr %14, i32 0, i32 0
  store i32 1, ptr %grappleAnchor, align 4
  br label %if.end

if.else:                                          ; preds = %land.lhs.true, %land.end5
  %15 = load ptr, ptr %outputs.addr, align 8
  %grappleAnchor9 = getelementptr inbounds %struct.ControllerOutputs, ptr %15, i32 0, i32 0
  store i32 0, ptr %grappleAnchor9, align 4
  br label %if.end

if.end:                                           ; preds = %if.else, %if.then
  %16 = load ptr, ptr %inputs.addr, align 8
  %switchB10 = getelementptr inbounds %struct.ControllerInputs, ptr %16, i32 0, i32 0
  %17 = load i32, ptr %switchB10, align 4
  %tobool11 = icmp ne i32 %17, 0
  br i1 %tobool11, label %if.then12, label %if.else13

if.then12:                                        ; preds = %if.end
  %18 = load ptr, ptr %outputs.addr, align 8
  %bridge = getelementptr inbounds %struct.ControllerOutputs, ptr %18, i32 0, i32 1
  store i32 1, ptr %bridge, align 4
  br label %if.end15

if.else13:                                        ; preds = %if.end
  %19 = load ptr, ptr %outputs.addr, align 8
  %bridge14 = getelementptr inbounds %struct.ControllerOutputs, ptr %19, i32 0, i32 1
  store i32 0, ptr %bridge14, align 4
  br label %if.end15

if.end15:                                         ; preds = %if.else13, %if.then12
  %20 = load ptr, ptr %inputs.addr, align 8
  %cubeOnLiftCargo = getelementptr inbounds %struct.ControllerInputs, ptr %20, i32 0, i32 6
  %21 = load i32, ptr %cubeOnLiftCargo, align 4
  %tobool16 = icmp ne i32 %21, 0
  br i1 %tobool16, label %if.then19, label %lor.lhs.false

lor.lhs.false:                                    ; preds = %if.end15
  %22 = load ptr, ptr %inputs.addr, align 8
  %switchC17 = getelementptr inbounds %struct.ControllerInputs, ptr %22, i32 0, i32 1
  %23 = load i32, ptr %switchC17, align 4
  %tobool18 = icmp ne i32 %23, 0
  br i1 %tobool18, label %if.then19, label %if.else20

if.then19:                                        ; preds = %lor.lhs.false, %if.end15
  %24 = load ptr, ptr %outputs.addr, align 8
  %liftField = getelementptr inbounds %struct.ControllerOutputs, ptr %24, i32 0, i32 2
  store i32 1, ptr %liftField, align 4
  br label %if.end22

if.else20:                                        ; preds = %lor.lhs.false
  %25 = load ptr, ptr %outputs.addr, align 8
  %liftField21 = getelementptr inbounds %struct.ControllerOutputs, ptr %25, i32 0, i32 2
  store i32 0, ptr %liftField21, align 4
  br label %if.end22

if.end22:                                         ; preds = %if.else20, %if.then19
  %26 = load ptr, ptr %inputs.addr, align 8
  %switchC23 = getelementptr inbounds %struct.ControllerInputs, ptr %26, i32 0, i32 1
  %27 = load i32, ptr %switchC23, align 4
  %tobool24 = icmp ne i32 %27, 0
  br i1 %tobool24, label %if.then25, label %if.else26

if.then25:                                        ; preds = %if.end22
  %28 = load ptr, ptr %outputs.addr, align 8
  %serviceAccess = getelementptr inbounds %struct.ControllerOutputs, ptr %28, i32 0, i32 3
  store i32 1, ptr %serviceAccess, align 4
  br label %if.end28

if.else26:                                        ; preds = %if.end22
  %29 = load ptr, ptr %outputs.addr, align 8
  %serviceAccess27 = getelementptr inbounds %struct.ControllerOutputs, ptr %29, i32 0, i32 3
  store i32 0, ptr %serviceAccess27, align 4
  br label %if.end28

if.end28:                                         ; preds = %if.else26, %if.then25
  %30 = load ptr, ptr %inputs.addr, align 8
  %switchC29 = getelementptr inbounds %struct.ControllerInputs, ptr %30, i32 0, i32 1
  %31 = load i32, ptr %switchC29, align 4
  %tobool30 = icmp ne i32 %31, 0
  br i1 %tobool30, label %land.lhs.true31, label %if.else35

land.lhs.true31:                                  ; preds = %if.end28
  %32 = load ptr, ptr %inputs.addr, align 8
  %switchB32 = getelementptr inbounds %struct.ControllerInputs, ptr %32, i32 0, i32 0
  %33 = load i32, ptr %switchB32, align 4
  %tobool33 = icmp ne i32 %33, 0
  br i1 %tobool33, label %if.else35, label %if.then34

if.then34:                                        ; preds = %land.lhs.true31
  %34 = load ptr, ptr %outputs.addr, align 8
  %relayGates = getelementptr inbounds %struct.ControllerOutputs, ptr %34, i32 0, i32 4
  store i32 1, ptr %relayGates, align 4
  br label %if.end37

if.else35:                                        ; preds = %land.lhs.true31, %if.end28
  %35 = load ptr, ptr %outputs.addr, align 8
  %relayGates36 = getelementptr inbounds %struct.ControllerOutputs, ptr %35, i32 0, i32 4
  store i32 0, ptr %relayGates36, align 4
  br label %if.end37

if.end37:                                         ; preds = %if.else35, %if.then34
  %36 = load i32, ptr %master, align 4
  %tobool38 = icmp ne i32 %36, 0
  br i1 %tobool38, label %land.lhs.true39, label %if.else42

land.lhs.true39:                                  ; preds = %if.end37
  %37 = load ptr, ptr %inputs.addr, align 8
  %routeMode = getelementptr inbounds %struct.ControllerInputs, ptr %37, i32 0, i32 3
  %38 = load i32, ptr %routeMode, align 4
  %tobool40 = icmp ne i32 %38, 0
  br i1 %tobool40, label %if.else42, label %if.then41

if.then41:                                        ; preds = %land.lhs.true39
  %39 = load ptr, ptr %outputs.addr, align 8
  %leftRoute = getelementptr inbounds %struct.ControllerOutputs, ptr %39, i32 0, i32 5
  store i32 1, ptr %leftRoute, align 4
  br label %if.end44

if.else42:                                        ; preds = %land.lhs.true39, %if.end37
  %40 = load ptr, ptr %outputs.addr, align 8
  %leftRoute43 = getelementptr inbounds %struct.ControllerOutputs, ptr %40, i32 0, i32 5
  store i32 0, ptr %leftRoute43, align 4
  br label %if.end44

if.end44:                                         ; preds = %if.else42, %if.then41
  %41 = load i32, ptr %master, align 4
  %tobool45 = icmp ne i32 %41, 0
  br i1 %tobool45, label %land.lhs.true46, label %if.else50

land.lhs.true46:                                  ; preds = %if.end44
  %42 = load ptr, ptr %inputs.addr, align 8
  %routeMode47 = getelementptr inbounds %struct.ControllerInputs, ptr %42, i32 0, i32 3
  %43 = load i32, ptr %routeMode47, align 4
  %tobool48 = icmp ne i32 %43, 0
  br i1 %tobool48, label %if.then49, label %if.else50

if.then49:                                        ; preds = %land.lhs.true46
  %44 = load ptr, ptr %outputs.addr, align 8
  %rightRoute = getelementptr inbounds %struct.ControllerOutputs, ptr %44, i32 0, i32 6
  store i32 1, ptr %rightRoute, align 4
  br label %if.end52

if.else50:                                        ; preds = %land.lhs.true46, %if.end44
  %45 = load ptr, ptr %outputs.addr, align 8
  %rightRoute51 = getelementptr inbounds %struct.ControllerOutputs, ptr %45, i32 0, i32 6
  store i32 0, ptr %rightRoute51, align 4
  br label %if.end52

if.end52:                                         ; preds = %if.else50, %if.then49
  %46 = load ptr, ptr %inputs.addr, align 8
  %switchD = getelementptr inbounds %struct.ControllerInputs, ptr %46, i32 0, i32 2
  %47 = load i32, ptr %switchD, align 4
  %tobool53 = icmp ne i32 %47, 0
  br i1 %tobool53, label %if.then54, label %if.else55

if.then54:                                        ; preds = %if.end52
  %48 = load ptr, ptr %outputs.addr, align 8
  %galleryAccess = getelementptr inbounds %struct.ControllerOutputs, ptr %48, i32 0, i32 7
  store i32 1, ptr %galleryAccess, align 4
  br label %if.end57

if.else55:                                        ; preds = %if.end52
  %49 = load ptr, ptr %outputs.addr, align 8
  %galleryAccess56 = getelementptr inbounds %struct.ControllerOutputs, ptr %49, i32 0, i32 7
  store i32 0, ptr %galleryAccess56, align 4
  br label %if.end57

if.end57:                                         ; preds = %if.else55, %if.then54
  %50 = load i32, ptr %vault, align 4
  %tobool58 = icmp ne i32 %50, 0
  br i1 %tobool58, label %if.then59, label %if.else60

if.then59:                                        ; preds = %if.end57
  %51 = load ptr, ptr %outputs.addr, align 8
  %vaultPower = getelementptr inbounds %struct.ControllerOutputs, ptr %51, i32 0, i32 8
  store i32 1, ptr %vaultPower, align 4
  br label %if.end62

if.else60:                                        ; preds = %if.end57
  %52 = load ptr, ptr %outputs.addr, align 8
  %vaultPower61 = getelementptr inbounds %struct.ControllerOutputs, ptr %52, i32 0, i32 8
  store i32 0, ptr %vaultPower61, align 4
  br label %if.end62

if.end62:                                         ; preds = %if.else60, %if.then59
  %53 = load i32, ptr %vault, align 4
  %tobool63 = icmp ne i32 %53, 0
  br i1 %tobool63, label %if.then64, label %if.else65

if.then64:                                        ; preds = %if.end62
  %54 = load ptr, ptr %outputs.addr, align 8
  %vaultReturn = getelementptr inbounds %struct.ControllerOutputs, ptr %54, i32 0, i32 9
  store i32 1, ptr %vaultReturn, align 4
  br label %if.end67

if.else65:                                        ; preds = %if.end62
  %55 = load ptr, ptr %outputs.addr, align 8
  %vaultReturn66 = getelementptr inbounds %struct.ControllerOutputs, ptr %55, i32 0, i32 9
  store i32 0, ptr %vaultReturn66, align 4
  br label %if.end67

if.end67:                                         ; preds = %if.else65, %if.then64
  %56 = load ptr, ptr %inputs.addr, align 8
  %exitUnlocked = getelementptr inbounds %struct.ControllerInputs, ptr %56, i32 0, i32 11
  %57 = load i32, ptr %exitUnlocked, align 4
  %tobool68 = icmp ne i32 %57, 0
  br i1 %tobool68, label %if.then69, label %if.else70

if.then69:                                        ; preds = %if.end67
  %58 = load ptr, ptr %outputs.addr, align 8
  %exitDoor = getelementptr inbounds %struct.ControllerOutputs, ptr %58, i32 0, i32 10
  store i32 1, ptr %exitDoor, align 4
  br label %if.end72

if.else70:                                        ; preds = %if.end67
  %59 = load ptr, ptr %outputs.addr, align 8
  %exitDoor71 = getelementptr inbounds %struct.ControllerOutputs, ptr %59, i32 0, i32 10
  store i32 0, ptr %exitDoor71, align 4
  br label %if.end72

if.end72:                                         ; preds = %if.else70, %if.then69
  %60 = load ptr, ptr %outputs.addr, align 8
  %leftRoute73 = getelementptr inbounds %struct.ControllerOutputs, ptr %60, i32 0, i32 5
  %61 = load i32, ptr %leftRoute73, align 4
  %tobool74 = icmp ne i32 %61, 0
  br i1 %tobool74, label %if.then77, label %lor.lhs.false75

lor.lhs.false75:                                  ; preds = %if.end72
  %62 = load ptr, ptr %inputs.addr, align 8
  %leftGraceActive = getelementptr inbounds %struct.ControllerInputs, ptr %62, i32 0, i32 12
  %63 = load i32, ptr %leftGraceActive, align 4
  %tobool76 = icmp ne i32 %63, 0
  br i1 %tobool76, label %if.then77, label %if.else78

if.then77:                                        ; preds = %lor.lhs.false75, %if.end72
  %64 = load ptr, ptr %outputs.addr, align 8
  %physicalLeftRoute = getelementptr inbounds %struct.ControllerOutputs, ptr %64, i32 0, i32 11
  store i32 1, ptr %physicalLeftRoute, align 4
  br label %if.end80

if.else78:                                        ; preds = %lor.lhs.false75
  %65 = load ptr, ptr %outputs.addr, align 8
  %physicalLeftRoute79 = getelementptr inbounds %struct.ControllerOutputs, ptr %65, i32 0, i32 11
  store i32 0, ptr %physicalLeftRoute79, align 4
  br label %if.end80

if.end80:                                         ; preds = %if.else78, %if.then77
  %66 = load ptr, ptr %outputs.addr, align 8
  %rightRoute81 = getelementptr inbounds %struct.ControllerOutputs, ptr %66, i32 0, i32 6
  %67 = load i32, ptr %rightRoute81, align 4
  %tobool82 = icmp ne i32 %67, 0
  br i1 %tobool82, label %if.then85, label %lor.lhs.false83

lor.lhs.false83:                                  ; preds = %if.end80
  %68 = load ptr, ptr %inputs.addr, align 8
  %rightGraceActive = getelementptr inbounds %struct.ControllerInputs, ptr %68, i32 0, i32 13
  %69 = load i32, ptr %rightGraceActive, align 4
  %tobool84 = icmp ne i32 %69, 0
  br i1 %tobool84, label %if.then85, label %if.else86

if.then85:                                        ; preds = %lor.lhs.false83, %if.end80
  %70 = load ptr, ptr %outputs.addr, align 8
  %physicalRightRoute = getelementptr inbounds %struct.ControllerOutputs, ptr %70, i32 0, i32 12
  store i32 1, ptr %physicalRightRoute, align 4
  br label %if.end88

if.else86:                                        ; preds = %lor.lhs.false83
  %71 = load ptr, ptr %outputs.addr, align 8
  %physicalRightRoute87 = getelementptr inbounds %struct.ControllerOutputs, ptr %71, i32 0, i32 12
  store i32 0, ptr %physicalRightRoute87, align 4
  br label %if.end88

if.end88:                                         ; preds = %if.else86, %if.then85
  %72 = load i32, ptr %vault, align 4
  %tobool89 = icmp ne i32 %72, 0
  br i1 %tobool89, label %land.lhs.true90, label %if.else95

land.lhs.true90:                                  ; preds = %if.end88
  %73 = load ptr, ptr %inputs.addr, align 8
  %finalPlateLeftOccupied = getelementptr inbounds %struct.ControllerInputs, ptr %73, i32 0, i32 9
  %74 = load i32, ptr %finalPlateLeftOccupied, align 4
  %tobool91 = icmp ne i32 %74, 0
  br i1 %tobool91, label %land.lhs.true92, label %if.else95

land.lhs.true92:                                  ; preds = %land.lhs.true90
  %75 = load ptr, ptr %inputs.addr, align 8
  %finalPlateRightOccupied = getelementptr inbounds %struct.ControllerInputs, ptr %75, i32 0, i32 10
  %76 = load i32, ptr %finalPlateRightOccupied, align 4
  %tobool93 = icmp ne i32 %76, 0
  br i1 %tobool93, label %if.then94, label %if.else95

if.then94:                                        ; preds = %land.lhs.true92
  %77 = load ptr, ptr %outputs.addr, align 8
  %exitUnlockCandidate = getelementptr inbounds %struct.ControllerOutputs, ptr %77, i32 0, i32 13
  store i32 1, ptr %exitUnlockCandidate, align 4
  br label %if.end97

if.else95:                                        ; preds = %land.lhs.true92, %land.lhs.true90, %if.end88
  %78 = load ptr, ptr %outputs.addr, align 8
  %exitUnlockCandidate96 = getelementptr inbounds %struct.ControllerOutputs, ptr %78, i32 0, i32 13
  store i32 0, ptr %exitUnlockCandidate96, align 4
  br label %if.end97

if.end97:                                         ; preds = %if.else95, %if.then94
  ret void
}

attributes #0 = { noinline nounwind optnone uwtable "min-legal-vector-width"="0" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }

!llvm.module.flags = !{!0, !1, !2}
!llvm.ident = !{!3}

!0 = !{i32 1, !"wchar_size", i32 2}
!1 = !{i32 8, !"PIC Level", i32 2}
!2 = !{i32 7, !"uwtable", i32 2}
!3 = !{!"clang version 16.0.6 (https://github.com/llvm/llvm-project.git 7cbf1a2591520c2491aa35339f227775f4d3adf6)"}
