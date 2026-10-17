; ModuleID = 'E:\Workspace\binary_binja_redesign\comp4020-final-ky787\experiments\coop-controllers\handshake\src\controller.c'
source_filename = "E:\\Workspace\\binary_binja_redesign\\comp4020-final-ky787\\experiments\\coop-controllers\\handshake\\src\\controller.c"
target datalayout = "e-m:w-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-windows-msvc19.51.36248"

%struct.ControllerInputs = type { i32, i32, i32, i32, i32 }
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
  %crossing = getelementptr inbounds %struct.ControllerInputs, ptr %8, i32 0, i32 0
  %9 = load i32, ptr %crossing, align 4
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
  br i1 %tobool, label %if.then, label %if.else

if.then:                                          ; preds = %originalBBpart2
  %18 = load i32, ptr @x, align 4
  %19 = load i32, ptr @y, align 4
  %20 = sub i32 %18, 1
  %21 = mul i32 %18, %20
  %22 = urem i32 %21, 2
  %23 = icmp eq i32 %22, 0
  %24 = icmp slt i32 %19, 10
  %25 = or i1 %23, %24
  br i1 %25, label %originalBB18, label %originalBB18alteredBB

originalBB18:                                     ; preds = %if.then, %originalBB18alteredBB
  %26 = load ptr, ptr %outputs.addr, align 8
  %crossingPower = getelementptr inbounds %struct.ControllerOutputs, ptr %26, i32 0, i32 0
  store i32 1, ptr %crossingPower, align 4
  %27 = load i32, ptr @x, align 4
  %28 = load i32, ptr @y, align 4
  %29 = sub i32 %27, 1
  %30 = mul i32 %27, %29
  %31 = urem i32 %30, 2
  %32 = icmp eq i32 %31, 0
  %33 = icmp slt i32 %28, 10
  %34 = or i1 %32, %33
  br i1 %34, label %originalBBpart220, label %originalBB18alteredBB

originalBBpart220:                                ; preds = %originalBB18
  br label %if.end

if.else:                                          ; preds = %originalBBpart2
  %35 = load i32, ptr @x, align 4
  %36 = load i32, ptr @y, align 4
  %37 = sub i32 %35, 1
  %38 = mul i32 %35, %37
  %39 = urem i32 %38, 2
  %40 = icmp eq i32 %39, 0
  %41 = icmp slt i32 %36, 10
  %42 = or i1 %40, %41
  br i1 %42, label %originalBB22, label %originalBB22alteredBB

originalBB22:                                     ; preds = %if.else, %originalBB22alteredBB
  %43 = load ptr, ptr %outputs.addr, align 8
  %crossingPower1 = getelementptr inbounds %struct.ControllerOutputs, ptr %43, i32 0, i32 0
  store i32 0, ptr %crossingPower1, align 4
  %44 = load i32, ptr @x, align 4
  %45 = load i32, ptr @y, align 4
  %46 = sub i32 %44, 1
  %47 = mul i32 %44, %46
  %48 = urem i32 %47, 2
  %49 = icmp eq i32 %48, 0
  %50 = icmp slt i32 %45, 10
  %51 = or i1 %49, %50
  br i1 %51, label %originalBBpart224, label %originalBB22alteredBB

originalBBpart224:                                ; preds = %originalBB22
  br label %if.end

if.end:                                           ; preds = %originalBBpart224, %originalBBpart220
  %52 = load i32, ptr @x, align 4
  %53 = load i32, ptr @y, align 4
  %54 = sub i32 %52, 1
  %55 = mul i32 %52, %54
  %56 = urem i32 %55, 2
  %57 = icmp eq i32 %56, 0
  %58 = icmp slt i32 %53, 10
  %59 = or i1 %57, %58
  br i1 %59, label %originalBB26, label %originalBB26alteredBB

originalBB26:                                     ; preds = %if.end, %originalBB26alteredBB
  %60 = load ptr, ptr %inputs.addr, align 8
  %liftPlate = getelementptr inbounds %struct.ControllerInputs, ptr %60, i32 0, i32 1
  %61 = load i32, ptr %liftPlate, align 4
  %tobool2 = icmp ne i32 %61, 0
  %62 = load i32, ptr @x, align 4
  %63 = load i32, ptr @y, align 4
  %64 = sub i32 %62, 1
  %65 = mul i32 %62, %64
  %66 = urem i32 %65, 2
  %67 = icmp eq i32 %66, 0
  %68 = icmp slt i32 %63, 10
  %69 = or i1 %67, %68
  br i1 %69, label %originalBBpart228, label %originalBB26alteredBB

originalBBpart228:                                ; preds = %originalBB26
  br i1 %tobool2, label %if.then3, label %if.else4

if.then3:                                         ; preds = %originalBBpart228
  %70 = load i32, ptr @x, align 4
  %71 = load i32, ptr @y, align 4
  %72 = sub i32 %70, 1
  %73 = mul i32 %70, %72
  %74 = urem i32 %73, 2
  %75 = icmp eq i32 %74, 0
  %76 = icmp slt i32 %71, 10
  %77 = or i1 %75, %76
  br i1 %77, label %originalBB30, label %originalBB30alteredBB

originalBB30:                                     ; preds = %if.then3, %originalBB30alteredBB
  %78 = load ptr, ptr %outputs.addr, align 8
  %liftPower = getelementptr inbounds %struct.ControllerOutputs, ptr %78, i32 0, i32 1
  store i32 1, ptr %liftPower, align 4
  %79 = load i32, ptr @x, align 4
  %80 = load i32, ptr @y, align 4
  %81 = sub i32 %79, 1
  %82 = mul i32 %79, %81
  %83 = urem i32 %82, 2
  %84 = icmp eq i32 %83, 0
  %85 = icmp slt i32 %80, 10
  %86 = or i1 %84, %85
  br i1 %86, label %originalBBpart232, label %originalBB30alteredBB

originalBBpart232:                                ; preds = %originalBB30
  br label %if.end6

if.else4:                                         ; preds = %originalBBpart228
  %87 = load i32, ptr @x, align 4
  %88 = load i32, ptr @y, align 4
  %89 = sub i32 %87, 1
  %90 = mul i32 %87, %89
  %91 = urem i32 %90, 2
  %92 = icmp eq i32 %91, 0
  %93 = icmp slt i32 %88, 10
  %94 = or i1 %92, %93
  br i1 %94, label %originalBB34, label %originalBB34alteredBB

originalBB34:                                     ; preds = %if.else4, %originalBB34alteredBB
  %95 = load ptr, ptr %outputs.addr, align 8
  %liftPower5 = getelementptr inbounds %struct.ControllerOutputs, ptr %95, i32 0, i32 1
  store i32 0, ptr %liftPower5, align 4
  %96 = load i32, ptr @x, align 4
  %97 = load i32, ptr @y, align 4
  %98 = sub i32 %96, 1
  %99 = mul i32 %96, %98
  %100 = urem i32 %99, 2
  %101 = icmp eq i32 %100, 0
  %102 = icmp slt i32 %97, 10
  %103 = or i1 %101, %102
  br i1 %103, label %originalBBpart236, label %originalBB34alteredBB

originalBBpart236:                                ; preds = %originalBB34
  br label %if.end6

if.end6:                                          ; preds = %originalBBpart236, %originalBBpart232
  %104 = load i32, ptr @x, align 4
  %105 = load i32, ptr @y, align 4
  %106 = sub i32 %104, 1
  %107 = mul i32 %104, %106
  %108 = urem i32 %107, 2
  %109 = icmp eq i32 %108, 0
  %110 = icmp slt i32 %105, 10
  %111 = or i1 %109, %110
  br i1 %111, label %originalBB38, label %originalBB38alteredBB

originalBB38:                                     ; preds = %if.end6, %originalBB38alteredBB
  %112 = load ptr, ptr %inputs.addr, align 8
  %link = getelementptr inbounds %struct.ControllerInputs, ptr %112, i32 0, i32 2
  %113 = load i32, ptr %link, align 4
  %tobool7 = icmp ne i32 %113, 0
  %114 = load i32, ptr @x, align 4
  %115 = load i32, ptr @y, align 4
  %116 = sub i32 %114, 1
  %117 = mul i32 %114, %116
  %118 = urem i32 %117, 2
  %119 = icmp eq i32 %118, 0
  %120 = icmp slt i32 %115, 10
  %121 = or i1 %119, %120
  br i1 %121, label %originalBBpart240, label %originalBB38alteredBB

originalBBpart240:                                ; preds = %originalBB38
  br i1 %tobool7, label %if.then8, label %if.else9

if.then8:                                         ; preds = %originalBBpart240
  %122 = load i32, ptr @x, align 4
  %123 = load i32, ptr @y, align 4
  %124 = sub i32 %122, 1
  %125 = mul i32 %122, %124
  %126 = urem i32 %125, 2
  %127 = icmp eq i32 %126, 0
  %128 = icmp slt i32 %123, 10
  %129 = or i1 %127, %128
  br i1 %129, label %originalBB42, label %originalBB42alteredBB

originalBB42:                                     ; preds = %if.then8, %originalBB42alteredBB
  %130 = load ptr, ptr %outputs.addr, align 8
  %relayPower = getelementptr inbounds %struct.ControllerOutputs, ptr %130, i32 0, i32 2
  store i32 1, ptr %relayPower, align 4
  %131 = load i32, ptr @x, align 4
  %132 = load i32, ptr @y, align 4
  %133 = sub i32 %131, 1
  %134 = mul i32 %131, %133
  %135 = urem i32 %134, 2
  %136 = icmp eq i32 %135, 0
  %137 = icmp slt i32 %132, 10
  %138 = or i1 %136, %137
  br i1 %138, label %originalBBpart244, label %originalBB42alteredBB

originalBBpart244:                                ; preds = %originalBB42
  br label %if.end11

if.else9:                                         ; preds = %originalBBpart240
  %139 = load i32, ptr @x, align 4
  %140 = load i32, ptr @y, align 4
  %141 = sub i32 %139, 1
  %142 = mul i32 %139, %141
  %143 = urem i32 %142, 2
  %144 = icmp eq i32 %143, 0
  %145 = icmp slt i32 %140, 10
  %146 = or i1 %144, %145
  br i1 %146, label %originalBB46, label %originalBB46alteredBB

originalBB46:                                     ; preds = %if.else9, %originalBB46alteredBB
  %147 = load ptr, ptr %outputs.addr, align 8
  %relayPower10 = getelementptr inbounds %struct.ControllerOutputs, ptr %147, i32 0, i32 2
  store i32 0, ptr %relayPower10, align 4
  %148 = load i32, ptr @x, align 4
  %149 = load i32, ptr @y, align 4
  %150 = sub i32 %148, 1
  %151 = mul i32 %148, %150
  %152 = urem i32 %151, 2
  %153 = icmp eq i32 %152, 0
  %154 = icmp slt i32 %149, 10
  %155 = or i1 %153, %154
  br i1 %155, label %originalBBpart248, label %originalBB46alteredBB

originalBBpart248:                                ; preds = %originalBB46
  br label %if.end11

if.end11:                                         ; preds = %originalBBpart248, %originalBBpart244
  %156 = load i32, ptr @x, align 4
  %157 = load i32, ptr @y, align 4
  %158 = sub i32 %156, 1
  %159 = mul i32 %156, %158
  %160 = urem i32 %159, 2
  %161 = icmp eq i32 %160, 0
  %162 = icmp slt i32 %157, 10
  %163 = or i1 %161, %162
  br i1 %163, label %originalBB50, label %originalBB50alteredBB

originalBB50:                                     ; preds = %if.end11, %originalBB50alteredBB
  %164 = load ptr, ptr %inputs.addr, align 8
  %maintenance = getelementptr inbounds %struct.ControllerInputs, ptr %164, i32 0, i32 3
  %165 = load i32, ptr %maintenance, align 4
  %tobool12 = icmp ne i32 %165, 0
  %166 = load i32, ptr @x, align 4
  %167 = load i32, ptr @y, align 4
  %168 = sub i32 %166, 1
  %169 = mul i32 %166, %168
  %170 = urem i32 %169, 2
  %171 = icmp eq i32 %170, 0
  %172 = icmp slt i32 %167, 10
  %173 = or i1 %171, %172
  br i1 %173, label %originalBBpart252, label %originalBB50alteredBB

originalBBpart252:                                ; preds = %originalBB50
  br i1 %tobool12, label %land.lhs.true, label %if.else15

land.lhs.true:                                    ; preds = %originalBBpart252
  %174 = load i32, ptr @x, align 4
  %175 = load i32, ptr @y, align 4
  %176 = sub i32 %174, 1
  %177 = mul i32 %174, %176
  %178 = urem i32 %177, 2
  %179 = icmp eq i32 %178, 0
  %180 = icmp slt i32 %175, 10
  %181 = or i1 %179, %180
  br i1 %181, label %originalBB54, label %originalBB54alteredBB

originalBB54:                                     ; preds = %land.lhs.true, %originalBB54alteredBB
  %182 = load ptr, ptr %inputs.addr, align 8
  %exitSocket = getelementptr inbounds %struct.ControllerInputs, ptr %182, i32 0, i32 4
  %183 = load i32, ptr %exitSocket, align 4
  %tobool13 = icmp ne i32 %183, 0
  %184 = load i32, ptr @x, align 4
  %185 = load i32, ptr @y, align 4
  %186 = sub i32 %184, 1
  %187 = mul i32 %184, %186
  %188 = urem i32 %187, 2
  %189 = icmp eq i32 %188, 0
  %190 = icmp slt i32 %185, 10
  %191 = or i1 %189, %190
  br i1 %191, label %originalBBpart256, label %originalBB54alteredBB

originalBBpart256:                                ; preds = %originalBB54
  br i1 %tobool13, label %if.then14, label %if.else15

if.then14:                                        ; preds = %originalBBpart256
  %192 = load i32, ptr @x, align 4
  %193 = load i32, ptr @y, align 4
  %194 = sub i32 %192, 1
  %195 = mul i32 %192, %194
  %196 = urem i32 %195, 2
  %197 = icmp eq i32 %196, 0
  %198 = icmp slt i32 %193, 10
  %199 = or i1 %197, %198
  br i1 %199, label %originalBB58, label %originalBB58alteredBB

originalBB58:                                     ; preds = %if.then14, %originalBB58alteredBB
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
  br i1 %208, label %originalBBpart260, label %originalBB58alteredBB

originalBBpart260:                                ; preds = %originalBB58
  br label %if.end17

if.else15:                                        ; preds = %originalBBpart256, %originalBBpart252
  %209 = load i32, ptr @x, align 4
  %210 = load i32, ptr @y, align 4
  %211 = sub i32 %209, 1
  %212 = mul i32 %209, %211
  %213 = urem i32 %212, 2
  %214 = icmp eq i32 %213, 0
  %215 = icmp slt i32 %210, 10
  %216 = or i1 %214, %215
  br i1 %216, label %originalBB62, label %originalBB62alteredBB

originalBB62:                                     ; preds = %if.else15, %originalBB62alteredBB
  %217 = load ptr, ptr %outputs.addr, align 8
  %exitReady16 = getelementptr inbounds %struct.ControllerOutputs, ptr %217, i32 0, i32 3
  store i32 0, ptr %exitReady16, align 4
  %218 = load i32, ptr @x, align 4
  %219 = load i32, ptr @y, align 4
  %220 = sub i32 %218, 1
  %221 = mul i32 %218, %220
  %222 = urem i32 %221, 2
  %223 = icmp eq i32 %222, 0
  %224 = icmp slt i32 %219, 10
  %225 = or i1 %223, %224
  br i1 %225, label %originalBBpart264, label %originalBB62alteredBB

originalBBpart264:                                ; preds = %originalBB62
  br label %if.end17

if.end17:                                         ; preds = %originalBBpart264, %originalBBpart260
  %226 = load i32, ptr @x, align 4
  %227 = load i32, ptr @y, align 4
  %228 = sub i32 %226, 1
  %229 = mul i32 %226, %228
  %230 = urem i32 %229, 2
  %231 = icmp eq i32 %230, 0
  %232 = icmp slt i32 %227, 10
  %233 = or i1 %231, %232
  br i1 %233, label %originalBB66, label %originalBB66alteredBB

originalBB66:                                     ; preds = %if.end17, %originalBB66alteredBB
  %234 = load i32, ptr @x, align 4
  %235 = load i32, ptr @y, align 4
  %236 = sub i32 %234, 1
  %237 = mul i32 %234, %236
  %238 = urem i32 %237, 2
  %239 = icmp eq i32 %238, 0
  %240 = icmp slt i32 %235, 10
  %241 = or i1 %239, %240
  br i1 %241, label %originalBBpart268, label %originalBB66alteredBB

originalBBpart268:                                ; preds = %originalBB66
  ret void

originalBBalteredBB:                              ; preds = %originalBB, %entry
  %outputs.addralteredBB = alloca ptr, align 8
  %inputs.addralteredBB = alloca ptr, align 8
  store ptr %outputs, ptr %outputs.addralteredBB, align 8
  store ptr %inputs, ptr %inputs.addralteredBB, align 8
  %242 = load ptr, ptr %inputs.addralteredBB, align 8
  %crossingalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %242, i32 0, i32 0
  %243 = load i32, ptr %crossingalteredBB, align 4
  %toboolalteredBB = icmp ne i32 %243, 0
  br label %originalBB

originalBB18alteredBB:                            ; preds = %originalBB18, %if.then
  %244 = load ptr, ptr %outputs.addr, align 8
  %crossingPoweralteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %244, i32 0, i32 0
  store i32 1, ptr %crossingPoweralteredBB, align 4
  br label %originalBB18

originalBB22alteredBB:                            ; preds = %originalBB22, %if.else
  %245 = load ptr, ptr %outputs.addr, align 8
  %crossingPower1alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %245, i32 0, i32 0
  store i32 0, ptr %crossingPower1alteredBB, align 4
  br label %originalBB22

originalBB26alteredBB:                            ; preds = %originalBB26, %if.end
  %246 = load ptr, ptr %inputs.addr, align 8
  %liftPlatealteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %246, i32 0, i32 1
  %247 = load i32, ptr %liftPlatealteredBB, align 4
  %tobool2alteredBB = icmp ne i32 %247, 0
  br label %originalBB26

originalBB30alteredBB:                            ; preds = %originalBB30, %if.then3
  %248 = load ptr, ptr %outputs.addr, align 8
  %liftPoweralteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %248, i32 0, i32 1
  store i32 1, ptr %liftPoweralteredBB, align 4
  br label %originalBB30

originalBB34alteredBB:                            ; preds = %originalBB34, %if.else4
  %249 = load ptr, ptr %outputs.addr, align 8
  %liftPower5alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %249, i32 0, i32 1
  store i32 0, ptr %liftPower5alteredBB, align 4
  br label %originalBB34

originalBB38alteredBB:                            ; preds = %originalBB38, %if.end6
  %250 = load ptr, ptr %inputs.addr, align 8
  %linkalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %250, i32 0, i32 2
  %251 = load i32, ptr %linkalteredBB, align 4
  %tobool7alteredBB = icmp ne i32 %251, 0
  br label %originalBB38

originalBB42alteredBB:                            ; preds = %originalBB42, %if.then8
  %252 = load ptr, ptr %outputs.addr, align 8
  %relayPoweralteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %252, i32 0, i32 2
  store i32 1, ptr %relayPoweralteredBB, align 4
  br label %originalBB42

originalBB46alteredBB:                            ; preds = %originalBB46, %if.else9
  %253 = load ptr, ptr %outputs.addr, align 8
  %relayPower10alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %253, i32 0, i32 2
  store i32 0, ptr %relayPower10alteredBB, align 4
  br label %originalBB46

originalBB50alteredBB:                            ; preds = %originalBB50, %if.end11
  %254 = load ptr, ptr %inputs.addr, align 8
  %maintenancealteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %254, i32 0, i32 3
  %255 = load i32, ptr %maintenancealteredBB, align 4
  %tobool12alteredBB = icmp ne i32 %255, 0
  br label %originalBB50

originalBB54alteredBB:                            ; preds = %originalBB54, %land.lhs.true
  %256 = load ptr, ptr %inputs.addr, align 8
  %exitSocketalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %256, i32 0, i32 4
  %257 = load i32, ptr %exitSocketalteredBB, align 4
  %tobool13alteredBB = icmp ne i32 %257, 0
  br label %originalBB54

originalBB58alteredBB:                            ; preds = %originalBB58, %if.then14
  %258 = load ptr, ptr %outputs.addr, align 8
  %exitReadyalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %258, i32 0, i32 3
  store i32 1, ptr %exitReadyalteredBB, align 4
  br label %originalBB58

originalBB62alteredBB:                            ; preds = %originalBB62, %if.else15
  %259 = load ptr, ptr %outputs.addr, align 8
  %exitReady16alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %259, i32 0, i32 3
  store i32 0, ptr %exitReady16alteredBB, align 4
  br label %originalBB62

originalBB66alteredBB:                            ; preds = %originalBB66, %if.end17
  br label %originalBB66
}

attributes #0 = { noinline nounwind optnone uwtable "min-legal-vector-width"="0" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }

!llvm.module.flags = !{!0, !1, !2}
!llvm.ident = !{!3}

!0 = !{i32 1, !"wchar_size", i32 2}
!1 = !{i32 8, !"PIC Level", i32 2}
!2 = !{i32 7, !"uwtable", i32 2}
!3 = !{!"clang version 16.0.6 (https://github.com/llvm/llvm-project.git 7cbf1a2591520c2491aa35339f227775f4d3adf6)"}
