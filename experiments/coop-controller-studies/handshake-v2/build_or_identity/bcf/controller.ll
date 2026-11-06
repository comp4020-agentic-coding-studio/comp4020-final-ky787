; ModuleID = 'E:\Workspace\binary_binja_redesign\comp4020-final-ky787\experiments\coop-controller-studies\handshake-v2\src\controller.c'
source_filename = "E:\\Workspace\\binary_binja_redesign\\comp4020-final-ky787\\experiments\\coop-controller-studies\\handshake-v2\\src\\controller.c"
target datalayout = "e-m:w-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-windows-msvc19.51.36248"

%struct.ControllerInputs = type { i32, i32, i32, i32, i32 }
%struct.ControllerOutputs = type { i32, i32, i32, i32, i32 }

@x = common global i32 0
@y = common global i32 0

; Function Attrs: noinline nounwind optnone uwtable
define dso_local dllexport void @bn_evaluate(ptr noundef %in, ptr noundef %out) #0 {
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
  %out.addr = alloca ptr, align 8
  %in.addr = alloca ptr, align 8
  store ptr %out, ptr %out.addr, align 8
  store ptr %in, ptr %in.addr, align 8
  %8 = load ptr, ptr %in.addr, align 8
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
  br i1 %25, label %originalBB22, label %originalBB22alteredBB

originalBB22:                                     ; preds = %if.then, %originalBB22alteredBB
  %26 = load ptr, ptr %out.addr, align 8
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
  br i1 %34, label %originalBBpart224, label %originalBB22alteredBB

originalBBpart224:                                ; preds = %originalBB22
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
  br i1 %42, label %originalBB26, label %originalBB26alteredBB

originalBB26:                                     ; preds = %if.else, %originalBB26alteredBB
  %43 = load ptr, ptr %out.addr, align 8
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
  br i1 %51, label %originalBBpart228, label %originalBB26alteredBB

originalBBpart228:                                ; preds = %originalBB26
  br label %if.end

if.end:                                           ; preds = %originalBBpart228, %originalBBpart224
  %52 = load i32, ptr @x, align 4
  %53 = load i32, ptr @y, align 4
  %54 = sub i32 %52, 1
  %55 = mul i32 %52, %54
  %56 = urem i32 %55, 2
  %57 = icmp eq i32 %56, 0
  %58 = icmp slt i32 %53, 10
  %59 = or i1 %57, %58
  br i1 %59, label %originalBB30, label %originalBB30alteredBB

originalBB30:                                     ; preds = %if.end, %originalBB30alteredBB
  %60 = load ptr, ptr %in.addr, align 8
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
  br i1 %69, label %originalBBpart232, label %originalBB30alteredBB

originalBBpart232:                                ; preds = %originalBB30
  br i1 %tobool2, label %if.then3, label %if.else4

if.then3:                                         ; preds = %originalBBpart232
  %70 = load i32, ptr @x, align 4
  %71 = load i32, ptr @y, align 4
  %72 = sub i32 %70, 1
  %73 = mul i32 %70, %72
  %74 = urem i32 %73, 2
  %75 = icmp eq i32 %74, 0
  %76 = icmp slt i32 %71, 10
  %77 = or i1 %75, %76
  br i1 %77, label %originalBB34, label %originalBB34alteredBB

originalBB34:                                     ; preds = %if.then3, %originalBB34alteredBB
  %78 = load ptr, ptr %out.addr, align 8
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
  br i1 %86, label %originalBBpart236, label %originalBB34alteredBB

originalBBpart236:                                ; preds = %originalBB34
  br label %if.end6

if.else4:                                         ; preds = %originalBBpart232
  %87 = load i32, ptr @x, align 4
  %88 = load i32, ptr @y, align 4
  %89 = sub i32 %87, 1
  %90 = mul i32 %87, %89
  %91 = urem i32 %90, 2
  %92 = icmp eq i32 %91, 0
  %93 = icmp slt i32 %88, 10
  %94 = or i1 %92, %93
  br i1 %94, label %originalBB38, label %originalBB38alteredBB

originalBB38:                                     ; preds = %if.else4, %originalBB38alteredBB
  %95 = load ptr, ptr %out.addr, align 8
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
  br i1 %103, label %originalBBpart240, label %originalBB38alteredBB

originalBBpart240:                                ; preds = %originalBB38
  br label %if.end6

if.end6:                                          ; preds = %originalBBpart240, %originalBBpart236
  %104 = load i32, ptr @x, align 4
  %105 = load i32, ptr @y, align 4
  %106 = sub i32 %104, 1
  %107 = mul i32 %104, %106
  %108 = urem i32 %107, 2
  %109 = icmp eq i32 %108, 0
  %110 = icmp slt i32 %105, 10
  %111 = or i1 %109, %110
  br i1 %111, label %originalBB42, label %originalBB42alteredBB

originalBB42:                                     ; preds = %if.end6, %originalBB42alteredBB
  %112 = load ptr, ptr %in.addr, align 8
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
  br i1 %121, label %originalBBpart244, label %originalBB42alteredBB

originalBBpart244:                                ; preds = %originalBB42
  br i1 %tobool7, label %if.then8, label %if.else9

if.then8:                                         ; preds = %originalBBpart244
  %122 = load i32, ptr @x, align 4
  %123 = load i32, ptr @y, align 4
  %124 = sub i32 %122, 1
  %125 = mul i32 %122, %124
  %126 = urem i32 %125, 2
  %127 = icmp eq i32 %126, 0
  %128 = icmp slt i32 %123, 10
  %129 = or i1 %127, %128
  br i1 %129, label %originalBB46, label %originalBB46alteredBB

originalBB46:                                     ; preds = %if.then8, %originalBB46alteredBB
  %130 = load ptr, ptr %out.addr, align 8
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
  br i1 %138, label %originalBBpart248, label %originalBB46alteredBB

originalBBpart248:                                ; preds = %originalBB46
  br label %if.end11

if.else9:                                         ; preds = %originalBBpart244
  %139 = load i32, ptr @x, align 4
  %140 = load i32, ptr @y, align 4
  %141 = sub i32 %139, 1
  %142 = mul i32 %139, %141
  %143 = urem i32 %142, 2
  %144 = icmp eq i32 %143, 0
  %145 = icmp slt i32 %140, 10
  %146 = or i1 %144, %145
  br i1 %146, label %originalBB50, label %originalBB50alteredBB

originalBB50:                                     ; preds = %if.else9, %originalBB50alteredBB
  %147 = load ptr, ptr %out.addr, align 8
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
  br i1 %155, label %originalBBpart252, label %originalBB50alteredBB

originalBBpart252:                                ; preds = %originalBB50
  br label %if.end11

if.end11:                                         ; preds = %originalBBpart252, %originalBBpart248
  %156 = load i32, ptr @x, align 4
  %157 = load i32, ptr @y, align 4
  %158 = sub i32 %156, 1
  %159 = mul i32 %156, %158
  %160 = urem i32 %159, 2
  %161 = icmp eq i32 %160, 0
  %162 = icmp slt i32 %157, 10
  %163 = or i1 %161, %162
  br i1 %163, label %originalBB54, label %originalBB54alteredBB

originalBB54:                                     ; preds = %if.end11, %originalBB54alteredBB
  %164 = load ptr, ptr %in.addr, align 8
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
  br i1 %173, label %originalBBpart256, label %originalBB54alteredBB

originalBBpart256:                                ; preds = %originalBB54
  br i1 %tobool12, label %if.then13, label %if.else14

if.then13:                                        ; preds = %originalBBpart256
  %174 = load i32, ptr @x, align 4
  %175 = load i32, ptr @y, align 4
  %176 = sub i32 %174, 1
  %177 = mul i32 %174, %176
  %178 = urem i32 %177, 2
  %179 = icmp eq i32 %178, 0
  %180 = icmp slt i32 %175, 10
  %181 = or i1 %179, %180
  br i1 %181, label %originalBB58, label %originalBB58alteredBB

originalBB58:                                     ; preds = %if.then13, %originalBB58alteredBB
  %182 = load ptr, ptr %out.addr, align 8
  %firewallActive = getelementptr inbounds %struct.ControllerOutputs, ptr %182, i32 0, i32 3
  store i32 0, ptr %firewallActive, align 4
  %183 = load i32, ptr @x, align 4
  %184 = load i32, ptr @y, align 4
  %185 = sub i32 %183, 1
  %186 = mul i32 %183, %185
  %187 = urem i32 %186, 2
  %188 = icmp eq i32 %187, 0
  %189 = icmp slt i32 %184, 10
  %190 = or i1 %188, %189
  br i1 %190, label %originalBBpart260, label %originalBB58alteredBB

originalBBpart260:                                ; preds = %originalBB58
  br label %if.end16

if.else14:                                        ; preds = %originalBBpart256
  %191 = load i32, ptr @x, align 4
  %192 = load i32, ptr @y, align 4
  %193 = sub i32 %191, 1
  %194 = mul i32 %191, %193
  %195 = urem i32 %194, 2
  %196 = icmp eq i32 %195, 0
  %197 = icmp slt i32 %192, 10
  %198 = or i1 %196, %197
  br i1 %198, label %originalBB62, label %originalBB62alteredBB

originalBB62:                                     ; preds = %if.else14, %originalBB62alteredBB
  %199 = load ptr, ptr %out.addr, align 8
  %firewallActive15 = getelementptr inbounds %struct.ControllerOutputs, ptr %199, i32 0, i32 3
  store i32 1, ptr %firewallActive15, align 4
  %200 = load i32, ptr @x, align 4
  %201 = load i32, ptr @y, align 4
  %202 = sub i32 %200, 1
  %203 = mul i32 %200, %202
  %204 = urem i32 %203, 2
  %205 = icmp eq i32 %204, 0
  %206 = icmp slt i32 %201, 10
  %207 = or i1 %205, %206
  br i1 %207, label %originalBBpart264, label %originalBB62alteredBB

originalBBpart264:                                ; preds = %originalBB62
  br label %if.end16

if.end16:                                         ; preds = %originalBBpart264, %originalBBpart260
  %208 = load i32, ptr @x, align 4
  %209 = load i32, ptr @y, align 4
  %210 = sub i32 %208, 1
  %211 = mul i32 %208, %210
  %212 = urem i32 %211, 2
  %213 = icmp eq i32 %212, 0
  %214 = icmp slt i32 %209, 10
  %215 = or i1 %213, %214
  br i1 %215, label %originalBB66, label %originalBB66alteredBB

originalBB66:                                     ; preds = %if.end16, %originalBB66alteredBB
  %216 = load ptr, ptr %in.addr, align 8
  %exitSocket = getelementptr inbounds %struct.ControllerInputs, ptr %216, i32 0, i32 4
  %217 = load i32, ptr %exitSocket, align 4
  %tobool17 = icmp ne i32 %217, 0
  %218 = load i32, ptr @x, align 4
  %219 = load i32, ptr @y, align 4
  %220 = sub i32 %218, 1
  %221 = mul i32 %218, %220
  %222 = urem i32 %221, 2
  %223 = icmp eq i32 %222, 0
  %224 = icmp slt i32 %219, 10
  %225 = or i1 %223, %224
  br i1 %225, label %originalBBpart268, label %originalBB66alteredBB

originalBBpart268:                                ; preds = %originalBB66
  br i1 %tobool17, label %if.then18, label %if.else19

if.then18:                                        ; preds = %originalBBpart268
  %226 = load i32, ptr @x, align 4
  %227 = load i32, ptr @y, align 4
  %228 = sub i32 %226, 1
  %229 = mul i32 %226, %228
  %230 = urem i32 %229, 2
  %231 = icmp eq i32 %230, 0
  %232 = icmp slt i32 %227, 10
  %233 = or i1 %231, %232
  br i1 %233, label %originalBB70, label %originalBB70alteredBB

originalBB70:                                     ; preds = %if.then18, %originalBB70alteredBB
  %234 = load ptr, ptr %out.addr, align 8
  %exitReady = getelementptr inbounds %struct.ControllerOutputs, ptr %234, i32 0, i32 4
  store i32 1, ptr %exitReady, align 4
  %235 = load i32, ptr @x, align 4
  %236 = load i32, ptr @y, align 4
  %237 = sub i32 %235, 1
  %238 = mul i32 %235, %237
  %239 = urem i32 %238, 2
  %240 = icmp eq i32 %239, 0
  %241 = icmp slt i32 %236, 10
  %242 = or i1 %240, %241
  br i1 %242, label %originalBBpart272, label %originalBB70alteredBB

originalBBpart272:                                ; preds = %originalBB70
  br label %if.end21

if.else19:                                        ; preds = %originalBBpart268
  %243 = load i32, ptr @x, align 4
  %244 = load i32, ptr @y, align 4
  %245 = sub i32 %243, 1
  %246 = mul i32 %243, %245
  %247 = urem i32 %246, 2
  %248 = icmp eq i32 %247, 0
  %249 = icmp slt i32 %244, 10
  %250 = or i1 %248, %249
  br i1 %250, label %originalBB74, label %originalBB74alteredBB

originalBB74:                                     ; preds = %if.else19, %originalBB74alteredBB
  %251 = load ptr, ptr %out.addr, align 8
  %exitReady20 = getelementptr inbounds %struct.ControllerOutputs, ptr %251, i32 0, i32 4
  store i32 0, ptr %exitReady20, align 4
  %252 = load i32, ptr @x, align 4
  %253 = load i32, ptr @y, align 4
  %254 = sub i32 %252, 1
  %255 = mul i32 %252, %254
  %256 = urem i32 %255, 2
  %257 = icmp eq i32 %256, 0
  %258 = icmp slt i32 %253, 10
  %259 = or i1 %257, %258
  br i1 %259, label %originalBBpart276, label %originalBB74alteredBB

originalBBpart276:                                ; preds = %originalBB74
  br label %if.end21

if.end21:                                         ; preds = %originalBBpart276, %originalBBpart272
  %260 = load i32, ptr @x, align 4
  %261 = load i32, ptr @y, align 4
  %262 = sub i32 %260, 1
  %263 = mul i32 %260, %262
  %264 = urem i32 %263, 2
  %265 = icmp eq i32 %264, 0
  %266 = icmp slt i32 %261, 10
  %267 = or i1 %265, %266
  br i1 %267, label %originalBB78, label %originalBB78alteredBB

originalBB78:                                     ; preds = %if.end21, %originalBB78alteredBB
  %268 = load i32, ptr @x, align 4
  %269 = load i32, ptr @y, align 4
  %270 = sub i32 %268, 1
  %271 = mul i32 %268, %270
  %272 = urem i32 %271, 2
  %273 = icmp eq i32 %272, 0
  %274 = icmp slt i32 %269, 10
  %275 = or i1 %273, %274
  br i1 %275, label %originalBBpart280, label %originalBB78alteredBB

originalBBpart280:                                ; preds = %originalBB78
  ret void

originalBBalteredBB:                              ; preds = %originalBB, %entry
  %out.addralteredBB = alloca ptr, align 8
  %in.addralteredBB = alloca ptr, align 8
  store ptr %out, ptr %out.addralteredBB, align 8
  store ptr %in, ptr %in.addralteredBB, align 8
  %276 = load ptr, ptr %in.addralteredBB, align 8
  %crossingalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %276, i32 0, i32 0
  %277 = load i32, ptr %crossingalteredBB, align 4
  %toboolalteredBB = icmp ne i32 %277, 0
  br label %originalBB

originalBB22alteredBB:                            ; preds = %originalBB22, %if.then
  %278 = load ptr, ptr %out.addr, align 8
  %crossingPoweralteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %278, i32 0, i32 0
  store i32 1, ptr %crossingPoweralteredBB, align 4
  br label %originalBB22

originalBB26alteredBB:                            ; preds = %originalBB26, %if.else
  %279 = load ptr, ptr %out.addr, align 8
  %crossingPower1alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %279, i32 0, i32 0
  store i32 0, ptr %crossingPower1alteredBB, align 4
  br label %originalBB26

originalBB30alteredBB:                            ; preds = %originalBB30, %if.end
  %280 = load ptr, ptr %in.addr, align 8
  %liftPlatealteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %280, i32 0, i32 1
  %281 = load i32, ptr %liftPlatealteredBB, align 4
  %tobool2alteredBB = icmp ne i32 %281, 0
  br label %originalBB30

originalBB34alteredBB:                            ; preds = %originalBB34, %if.then3
  %282 = load ptr, ptr %out.addr, align 8
  %liftPoweralteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %282, i32 0, i32 1
  store i32 1, ptr %liftPoweralteredBB, align 4
  br label %originalBB34

originalBB38alteredBB:                            ; preds = %originalBB38, %if.else4
  %283 = load ptr, ptr %out.addr, align 8
  %liftPower5alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %283, i32 0, i32 1
  store i32 0, ptr %liftPower5alteredBB, align 4
  br label %originalBB38

originalBB42alteredBB:                            ; preds = %originalBB42, %if.end6
  %284 = load ptr, ptr %in.addr, align 8
  %linkalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %284, i32 0, i32 2
  %285 = load i32, ptr %linkalteredBB, align 4
  %tobool7alteredBB = icmp ne i32 %285, 0
  br label %originalBB42

originalBB46alteredBB:                            ; preds = %originalBB46, %if.then8
  %286 = load ptr, ptr %out.addr, align 8
  %relayPoweralteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %286, i32 0, i32 2
  store i32 1, ptr %relayPoweralteredBB, align 4
  br label %originalBB46

originalBB50alteredBB:                            ; preds = %originalBB50, %if.else9
  %287 = load ptr, ptr %out.addr, align 8
  %relayPower10alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %287, i32 0, i32 2
  store i32 0, ptr %relayPower10alteredBB, align 4
  br label %originalBB50

originalBB54alteredBB:                            ; preds = %originalBB54, %if.end11
  %288 = load ptr, ptr %in.addr, align 8
  %maintenancealteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %288, i32 0, i32 3
  %289 = load i32, ptr %maintenancealteredBB, align 4
  %tobool12alteredBB = icmp ne i32 %289, 0
  br label %originalBB54

originalBB58alteredBB:                            ; preds = %originalBB58, %if.then13
  %290 = load ptr, ptr %out.addr, align 8
  %firewallActivealteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %290, i32 0, i32 3
  store i32 0, ptr %firewallActivealteredBB, align 4
  br label %originalBB58

originalBB62alteredBB:                            ; preds = %originalBB62, %if.else14
  %291 = load ptr, ptr %out.addr, align 8
  %firewallActive15alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %291, i32 0, i32 3
  store i32 1, ptr %firewallActive15alteredBB, align 4
  br label %originalBB62

originalBB66alteredBB:                            ; preds = %originalBB66, %if.end16
  %292 = load ptr, ptr %in.addr, align 8
  %exitSocketalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %292, i32 0, i32 4
  %293 = load i32, ptr %exitSocketalteredBB, align 4
  %tobool17alteredBB = icmp ne i32 %293, 0
  br label %originalBB66

originalBB70alteredBB:                            ; preds = %originalBB70, %if.then18
  %294 = load ptr, ptr %out.addr, align 8
  %exitReadyalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %294, i32 0, i32 4
  store i32 1, ptr %exitReadyalteredBB, align 4
  br label %originalBB70

originalBB74alteredBB:                            ; preds = %originalBB74, %if.else19
  %295 = load ptr, ptr %out.addr, align 8
  %exitReady20alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %295, i32 0, i32 4
  store i32 0, ptr %exitReady20alteredBB, align 4
  br label %originalBB74

originalBB78alteredBB:                            ; preds = %originalBB78, %if.end21
  br label %originalBB78
}

attributes #0 = { noinline nounwind optnone uwtable "min-legal-vector-width"="0" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }

!llvm.module.flags = !{!0, !1, !2}
!llvm.ident = !{!3}

!0 = !{i32 1, !"wchar_size", i32 2}
!1 = !{i32 8, !"PIC Level", i32 2}
!2 = !{i32 7, !"uwtable", i32 2}
!3 = !{!"clang version 16.0.6 (https://github.com/llvm/llvm-project.git 7cbf1a2591520c2491aa35339f227775f4d3adf6)"}
