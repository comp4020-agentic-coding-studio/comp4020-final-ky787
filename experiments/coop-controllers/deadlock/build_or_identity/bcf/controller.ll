; ModuleID = 'E:\Workspace\binary_binja_redesign\comp4020-final-ky787\experiments\coop-controllers\deadlock\src\controller.c'
source_filename = "E:\\Workspace\\binary_binja_redesign\\comp4020-final-ky787\\experiments\\coop-controllers\\deadlock\\src\\controller.c"
target datalayout = "e-m:w-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-windows-msvc19.51.36248"

%struct.ControllerInputs = type { i32, i32, i32, i32, i32, i32 }
%struct.ControllerOutputs = type { i32, i32, i32, i32, i32 }

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
  %payloadReady = alloca i32, align 4
  store ptr %outputs, ptr %outputs.addr, align 8
  store ptr %inputs, ptr %inputs.addr, align 8
  %8 = load ptr, ptr %inputs.addr, align 8
  %payloadOne = getelementptr inbounds %struct.ControllerInputs, ptr %8, i32 0, i32 3
  %9 = load i32, ptr %payloadOne, align 4
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
  br i1 %tobool, label %land.lhs.true, label %land.end

land.lhs.true:                                    ; preds = %originalBBpart2
  %18 = load i32, ptr @x, align 4
  %19 = load i32, ptr @y, align 4
  %20 = sub i32 %18, 1
  %21 = mul i32 %18, %20
  %22 = urem i32 %21, 2
  %23 = icmp eq i32 %22, 0
  %24 = icmp slt i32 %19, 10
  %25 = or i1 %23, %24
  br i1 %25, label %originalBB34, label %originalBB34alteredBB

originalBB34:                                     ; preds = %land.lhs.true, %originalBB34alteredBB
  %26 = load ptr, ptr %inputs.addr, align 8
  %payloadTwo = getelementptr inbounds %struct.ControllerInputs, ptr %26, i32 0, i32 4
  %27 = load i32, ptr %payloadTwo, align 4
  %tobool1 = icmp ne i32 %27, 0
  %28 = load i32, ptr @x, align 4
  %29 = load i32, ptr @y, align 4
  %30 = sub i32 %28, 1
  %31 = mul i32 %28, %30
  %32 = urem i32 %31, 2
  %33 = icmp eq i32 %32, 0
  %34 = icmp slt i32 %29, 10
  %35 = or i1 %33, %34
  br i1 %35, label %originalBBpart236, label %originalBB34alteredBB

originalBBpart236:                                ; preds = %originalBB34
  br i1 %tobool1, label %land.rhs, label %land.end

land.rhs:                                         ; preds = %originalBBpart236
  %36 = load i32, ptr @x, align 4
  %37 = load i32, ptr @y, align 4
  %38 = sub i32 %36, 1
  %39 = mul i32 %36, %38
  %40 = urem i32 %39, 2
  %41 = icmp eq i32 %40, 0
  %42 = icmp slt i32 %37, 10
  %43 = or i1 %41, %42
  br i1 %43, label %originalBB38, label %originalBB38alteredBB

originalBB38:                                     ; preds = %land.rhs, %originalBB38alteredBB
  %44 = load ptr, ptr %inputs.addr, align 8
  %payloadThree = getelementptr inbounds %struct.ControllerInputs, ptr %44, i32 0, i32 5
  %45 = load i32, ptr %payloadThree, align 4
  %tobool2 = icmp ne i32 %45, 0
  %46 = load i32, ptr @x, align 4
  %47 = load i32, ptr @y, align 4
  %48 = sub i32 %46, 1
  %49 = mul i32 %46, %48
  %50 = urem i32 %49, 2
  %51 = icmp eq i32 %50, 0
  %52 = icmp slt i32 %47, 10
  %53 = or i1 %51, %52
  br i1 %53, label %originalBBpart240, label %originalBB38alteredBB

originalBBpart240:                                ; preds = %originalBB38
  br label %land.end

land.end:                                         ; preds = %originalBBpart240, %originalBBpart236, %originalBBpart2
  %54 = phi i1 [ false, %originalBBpart236 ], [ false, %originalBBpart2 ], [ %tobool2, %originalBBpart240 ]
  %55 = load i32, ptr @x, align 4
  %56 = load i32, ptr @y, align 4
  %57 = sub i32 %55, 1
  %58 = mul i32 %55, %57
  %59 = urem i32 %58, 2
  %60 = icmp eq i32 %59, 0
  %61 = icmp slt i32 %56, 10
  %62 = or i1 %60, %61
  br i1 %62, label %originalBB42, label %originalBB42alteredBB

originalBB42:                                     ; preds = %land.end, %originalBB42alteredBB
  %land.ext = zext i1 %54 to i32
  store i32 %land.ext, ptr %payloadReady, align 4
  %63 = load ptr, ptr %inputs.addr, align 8
  %feed = getelementptr inbounds %struct.ControllerInputs, ptr %63, i32 0, i32 0
  %64 = load i32, ptr %feed, align 4
  %tobool3 = icmp ne i32 %64, 0
  %65 = load i32, ptr @x, align 4
  %66 = load i32, ptr @y, align 4
  %67 = sub i32 %65, 1
  %68 = mul i32 %65, %67
  %69 = urem i32 %68, 2
  %70 = icmp eq i32 %69, 0
  %71 = icmp slt i32 %66, 10
  %72 = or i1 %70, %71
  br i1 %72, label %originalBBpart244, label %originalBB42alteredBB

originalBBpart244:                                ; preds = %originalBB42
  br i1 %tobool3, label %land.lhs.true4, label %if.else

land.lhs.true4:                                   ; preds = %originalBBpart244
  %73 = load i32, ptr @x, align 4
  %74 = load i32, ptr @y, align 4
  %75 = sub i32 %73, 1
  %76 = mul i32 %73, %75
  %77 = urem i32 %76, 2
  %78 = icmp eq i32 %77, 0
  %79 = icmp slt i32 %74, 10
  %80 = or i1 %78, %79
  br i1 %80, label %originalBB46, label %originalBB46alteredBB

originalBB46:                                     ; preds = %land.lhs.true4, %originalBB46alteredBB
  %81 = load ptr, ptr %inputs.addr, align 8
  %safe = getelementptr inbounds %struct.ControllerInputs, ptr %81, i32 0, i32 1
  %82 = load i32, ptr %safe, align 4
  %tobool5 = icmp ne i32 %82, 0
  %83 = load i32, ptr @x, align 4
  %84 = load i32, ptr @y, align 4
  %85 = sub i32 %83, 1
  %86 = mul i32 %83, %85
  %87 = urem i32 %86, 2
  %88 = icmp eq i32 %87, 0
  %89 = icmp slt i32 %84, 10
  %90 = or i1 %88, %89
  br i1 %90, label %originalBBpart248, label %originalBB46alteredBB

originalBBpart248:                                ; preds = %originalBB46
  br i1 %tobool5, label %if.then, label %if.else

if.then:                                          ; preds = %originalBBpart248
  %91 = load i32, ptr @x, align 4
  %92 = load i32, ptr @y, align 4
  %93 = sub i32 %91, 1
  %94 = mul i32 %91, %93
  %95 = urem i32 %94, 2
  %96 = icmp eq i32 %95, 0
  %97 = icmp slt i32 %92, 10
  %98 = or i1 %96, %97
  br i1 %98, label %originalBB50, label %originalBB50alteredBB

originalBB50:                                     ; preds = %if.then, %originalBB50alteredBB
  %99 = load ptr, ptr %outputs.addr, align 8
  %cargoLift = getelementptr inbounds %struct.ControllerOutputs, ptr %99, i32 0, i32 0
  store i32 1, ptr %cargoLift, align 4
  %100 = load i32, ptr @x, align 4
  %101 = load i32, ptr @y, align 4
  %102 = sub i32 %100, 1
  %103 = mul i32 %100, %102
  %104 = urem i32 %103, 2
  %105 = icmp eq i32 %104, 0
  %106 = icmp slt i32 %101, 10
  %107 = or i1 %105, %106
  br i1 %107, label %originalBBpart252, label %originalBB50alteredBB

originalBBpart252:                                ; preds = %originalBB50
  br label %if.end

if.else:                                          ; preds = %originalBBpart248, %originalBBpart244
  %108 = load i32, ptr @x, align 4
  %109 = load i32, ptr @y, align 4
  %110 = sub i32 %108, 1
  %111 = mul i32 %108, %110
  %112 = urem i32 %111, 2
  %113 = icmp eq i32 %112, 0
  %114 = icmp slt i32 %109, 10
  %115 = or i1 %113, %114
  br i1 %115, label %originalBB54, label %originalBB54alteredBB

originalBB54:                                     ; preds = %if.else, %originalBB54alteredBB
  %116 = load ptr, ptr %outputs.addr, align 8
  %cargoLift6 = getelementptr inbounds %struct.ControllerOutputs, ptr %116, i32 0, i32 0
  store i32 0, ptr %cargoLift6, align 4
  %117 = load i32, ptr @x, align 4
  %118 = load i32, ptr @y, align 4
  %119 = sub i32 %117, 1
  %120 = mul i32 %117, %119
  %121 = urem i32 %120, 2
  %122 = icmp eq i32 %121, 0
  %123 = icmp slt i32 %118, 10
  %124 = or i1 %122, %123
  br i1 %124, label %originalBBpart256, label %originalBB54alteredBB

originalBBpart256:                                ; preds = %originalBB54
  br label %if.end

if.end:                                           ; preds = %originalBBpart256, %originalBBpart252
  %125 = load i32, ptr @x, align 4
  %126 = load i32, ptr @y, align 4
  %127 = sub i32 %125, 1
  %128 = mul i32 %125, %127
  %129 = urem i32 %128, 2
  %130 = icmp eq i32 %129, 0
  %131 = icmp slt i32 %126, 10
  %132 = or i1 %130, %131
  br i1 %132, label %originalBB58, label %originalBB58alteredBB

originalBB58:                                     ; preds = %if.end, %originalBB58alteredBB
  %133 = load ptr, ptr %inputs.addr, align 8
  %safe7 = getelementptr inbounds %struct.ControllerInputs, ptr %133, i32 0, i32 1
  %134 = load i32, ptr %safe7, align 4
  %tobool8 = icmp ne i32 %134, 0
  %135 = load i32, ptr @x, align 4
  %136 = load i32, ptr @y, align 4
  %137 = sub i32 %135, 1
  %138 = mul i32 %135, %137
  %139 = urem i32 %138, 2
  %140 = icmp eq i32 %139, 0
  %141 = icmp slt i32 %136, 10
  %142 = or i1 %140, %141
  br i1 %142, label %originalBBpart260, label %originalBB58alteredBB

originalBBpart260:                                ; preds = %originalBB58
  br i1 %tobool8, label %if.else10, label %if.then9

if.then9:                                         ; preds = %originalBBpart260
  %143 = load i32, ptr @x, align 4
  %144 = load i32, ptr @y, align 4
  %145 = sub i32 %143, 1
  %146 = mul i32 %143, %145
  %147 = urem i32 %146, 2
  %148 = icmp eq i32 %147, 0
  %149 = icmp slt i32 %144, 10
  %150 = or i1 %148, %149
  br i1 %150, label %originalBB62, label %originalBB62alteredBB

originalBB62:                                     ; preds = %if.then9, %originalBB62alteredBB
  %151 = load ptr, ptr %outputs.addr, align 8
  %shaftFirewall = getelementptr inbounds %struct.ControllerOutputs, ptr %151, i32 0, i32 1
  store i32 1, ptr %shaftFirewall, align 4
  %152 = load i32, ptr @x, align 4
  %153 = load i32, ptr @y, align 4
  %154 = sub i32 %152, 1
  %155 = mul i32 %152, %154
  %156 = urem i32 %155, 2
  %157 = icmp eq i32 %156, 0
  %158 = icmp slt i32 %153, 10
  %159 = or i1 %157, %158
  br i1 %159, label %originalBBpart264, label %originalBB62alteredBB

originalBBpart264:                                ; preds = %originalBB62
  br label %if.end12

if.else10:                                        ; preds = %originalBBpart260
  %160 = load i32, ptr @x, align 4
  %161 = load i32, ptr @y, align 4
  %162 = sub i32 %160, 1
  %163 = mul i32 %160, %162
  %164 = urem i32 %163, 2
  %165 = icmp eq i32 %164, 0
  %166 = icmp slt i32 %161, 10
  %167 = or i1 %165, %166
  br i1 %167, label %originalBB66, label %originalBB66alteredBB

originalBB66:                                     ; preds = %if.else10, %originalBB66alteredBB
  %168 = load ptr, ptr %outputs.addr, align 8
  %shaftFirewall11 = getelementptr inbounds %struct.ControllerOutputs, ptr %168, i32 0, i32 1
  store i32 0, ptr %shaftFirewall11, align 4
  %169 = load i32, ptr @x, align 4
  %170 = load i32, ptr @y, align 4
  %171 = sub i32 %169, 1
  %172 = mul i32 %169, %171
  %173 = urem i32 %172, 2
  %174 = icmp eq i32 %173, 0
  %175 = icmp slt i32 %170, 10
  %176 = or i1 %174, %175
  br i1 %176, label %originalBBpart268, label %originalBB66alteredBB

originalBBpart268:                                ; preds = %originalBB66
  br label %if.end12

if.end12:                                         ; preds = %originalBBpart268, %originalBBpart264
  %177 = load i32, ptr @x, align 4
  %178 = load i32, ptr @y, align 4
  %179 = sub i32 %177, 1
  %180 = mul i32 %177, %179
  %181 = urem i32 %180, 2
  %182 = icmp eq i32 %181, 0
  %183 = icmp slt i32 %178, 10
  %184 = or i1 %182, %183
  br i1 %184, label %originalBB70, label %originalBB70alteredBB

originalBB70:                                     ; preds = %if.end12, %originalBB70alteredBB
  %185 = load ptr, ptr %inputs.addr, align 8
  %safe13 = getelementptr inbounds %struct.ControllerInputs, ptr %185, i32 0, i32 1
  %186 = load i32, ptr %safe13, align 4
  %tobool14 = icmp ne i32 %186, 0
  %187 = load i32, ptr @x, align 4
  %188 = load i32, ptr @y, align 4
  %189 = sub i32 %187, 1
  %190 = mul i32 %187, %189
  %191 = urem i32 %190, 2
  %192 = icmp eq i32 %191, 0
  %193 = icmp slt i32 %188, 10
  %194 = or i1 %192, %193
  br i1 %194, label %originalBBpart272, label %originalBB70alteredBB

originalBBpart272:                                ; preds = %originalBB70
  br i1 %tobool14, label %land.lhs.true15, label %lor.lhs.false

land.lhs.true15:                                  ; preds = %originalBBpart272
  %195 = load i32, ptr @x, align 4
  %196 = load i32, ptr @y, align 4
  %197 = sub i32 %195, 1
  %198 = mul i32 %195, %197
  %199 = urem i32 %198, 2
  %200 = icmp eq i32 %199, 0
  %201 = icmp slt i32 %196, 10
  %202 = or i1 %200, %201
  br i1 %202, label %originalBB74, label %originalBB74alteredBB

originalBB74:                                     ; preds = %land.lhs.true15, %originalBB74alteredBB
  %203 = load ptr, ptr %inputs.addr, align 8
  %feed16 = getelementptr inbounds %struct.ControllerInputs, ptr %203, i32 0, i32 0
  %204 = load i32, ptr %feed16, align 4
  %tobool17 = icmp ne i32 %204, 0
  %205 = load i32, ptr @x, align 4
  %206 = load i32, ptr @y, align 4
  %207 = sub i32 %205, 1
  %208 = mul i32 %205, %207
  %209 = urem i32 %208, 2
  %210 = icmp eq i32 %209, 0
  %211 = icmp slt i32 %206, 10
  %212 = or i1 %210, %211
  br i1 %212, label %originalBBpart276, label %originalBB74alteredBB

originalBBpart276:                                ; preds = %originalBB74
  br i1 %tobool17, label %lor.lhs.false, label %if.then19

lor.lhs.false:                                    ; preds = %originalBBpart276, %originalBBpart272
  %213 = load i32, ptr @x, align 4
  %214 = load i32, ptr @y, align 4
  %215 = sub i32 %213, 1
  %216 = mul i32 %213, %215
  %217 = urem i32 %216, 2
  %218 = icmp eq i32 %217, 0
  %219 = icmp slt i32 %214, 10
  %220 = or i1 %218, %219
  br i1 %220, label %originalBB78, label %originalBB78alteredBB

originalBB78:                                     ; preds = %lor.lhs.false, %originalBB78alteredBB
  %221 = load i32, ptr %payloadReady, align 4
  %tobool18 = icmp ne i32 %221, 0
  %222 = load i32, ptr @x, align 4
  %223 = load i32, ptr @y, align 4
  %224 = sub i32 %222, 1
  %225 = mul i32 %222, %224
  %226 = urem i32 %225, 2
  %227 = icmp eq i32 %226, 0
  %228 = icmp slt i32 %223, 10
  %229 = or i1 %227, %228
  br i1 %229, label %originalBBpart280, label %originalBB78alteredBB

originalBBpart280:                                ; preds = %originalBB78
  br i1 %tobool18, label %if.then19, label %if.else20

if.then19:                                        ; preds = %originalBBpart280, %originalBBpart276
  %230 = load i32, ptr @x, align 4
  %231 = load i32, ptr @y, align 4
  %232 = sub i32 %230, 1
  %233 = mul i32 %230, %232
  %234 = urem i32 %233, 2
  %235 = icmp eq i32 %234, 0
  %236 = icmp slt i32 %231, 10
  %237 = or i1 %235, %236
  br i1 %237, label %originalBB82, label %originalBB82alteredBB

originalBB82:                                     ; preds = %if.then19, %originalBB82alteredBB
  %238 = load ptr, ptr %outputs.addr, align 8
  %serviceRelay = getelementptr inbounds %struct.ControllerOutputs, ptr %238, i32 0, i32 2
  store i32 1, ptr %serviceRelay, align 4
  %239 = load i32, ptr @x, align 4
  %240 = load i32, ptr @y, align 4
  %241 = sub i32 %239, 1
  %242 = mul i32 %239, %241
  %243 = urem i32 %242, 2
  %244 = icmp eq i32 %243, 0
  %245 = icmp slt i32 %240, 10
  %246 = or i1 %244, %245
  br i1 %246, label %originalBBpart284, label %originalBB82alteredBB

originalBBpart284:                                ; preds = %originalBB82
  br label %if.end22

if.else20:                                        ; preds = %originalBBpart280
  %247 = load i32, ptr @x, align 4
  %248 = load i32, ptr @y, align 4
  %249 = sub i32 %247, 1
  %250 = mul i32 %247, %249
  %251 = urem i32 %250, 2
  %252 = icmp eq i32 %251, 0
  %253 = icmp slt i32 %248, 10
  %254 = or i1 %252, %253
  br i1 %254, label %originalBB86, label %originalBB86alteredBB

originalBB86:                                     ; preds = %if.else20, %originalBB86alteredBB
  %255 = load ptr, ptr %outputs.addr, align 8
  %serviceRelay21 = getelementptr inbounds %struct.ControllerOutputs, ptr %255, i32 0, i32 2
  store i32 0, ptr %serviceRelay21, align 4
  %256 = load i32, ptr @x, align 4
  %257 = load i32, ptr @y, align 4
  %258 = sub i32 %256, 1
  %259 = mul i32 %256, %258
  %260 = urem i32 %259, 2
  %261 = icmp eq i32 %260, 0
  %262 = icmp slt i32 %257, 10
  %263 = or i1 %261, %262
  br i1 %263, label %originalBBpart288, label %originalBB86alteredBB

originalBBpart288:                                ; preds = %originalBB86
  br label %if.end22

if.end22:                                         ; preds = %originalBBpart288, %originalBBpart284
  %264 = load i32, ptr @x, align 4
  %265 = load i32, ptr @y, align 4
  %266 = sub i32 %264, 1
  %267 = mul i32 %264, %266
  %268 = urem i32 %267, 2
  %269 = icmp eq i32 %268, 0
  %270 = icmp slt i32 %265, 10
  %271 = or i1 %269, %270
  br i1 %271, label %originalBB90, label %originalBB90alteredBB

originalBB90:                                     ; preds = %if.end22, %originalBB90alteredBB
  %272 = load ptr, ptr %inputs.addr, align 8
  %hatchToggle = getelementptr inbounds %struct.ControllerInputs, ptr %272, i32 0, i32 2
  %273 = load i32, ptr %hatchToggle, align 4
  %tobool23 = icmp ne i32 %273, 0
  %274 = load i32, ptr @x, align 4
  %275 = load i32, ptr @y, align 4
  %276 = sub i32 %274, 1
  %277 = mul i32 %274, %276
  %278 = urem i32 %277, 2
  %279 = icmp eq i32 %278, 0
  %280 = icmp slt i32 %275, 10
  %281 = or i1 %279, %280
  br i1 %281, label %originalBBpart292, label %originalBB90alteredBB

originalBBpart292:                                ; preds = %originalBB90
  br i1 %tobool23, label %if.then24, label %if.else25

if.then24:                                        ; preds = %originalBBpart292
  %282 = load i32, ptr @x, align 4
  %283 = load i32, ptr @y, align 4
  %284 = sub i32 %282, 1
  %285 = mul i32 %282, %284
  %286 = urem i32 %285, 2
  %287 = icmp eq i32 %286, 0
  %288 = icmp slt i32 %283, 10
  %289 = or i1 %287, %288
  br i1 %289, label %originalBB94, label %originalBB94alteredBB

originalBB94:                                     ; preds = %if.then24, %originalBB94alteredBB
  %290 = load ptr, ptr %outputs.addr, align 8
  %hatchOpen = getelementptr inbounds %struct.ControllerOutputs, ptr %290, i32 0, i32 3
  store i32 1, ptr %hatchOpen, align 4
  %291 = load i32, ptr @x, align 4
  %292 = load i32, ptr @y, align 4
  %293 = sub i32 %291, 1
  %294 = mul i32 %291, %293
  %295 = urem i32 %294, 2
  %296 = icmp eq i32 %295, 0
  %297 = icmp slt i32 %292, 10
  %298 = or i1 %296, %297
  br i1 %298, label %originalBBpart296, label %originalBB94alteredBB

originalBBpart296:                                ; preds = %originalBB94
  br label %if.end27

if.else25:                                        ; preds = %originalBBpart292
  %299 = load i32, ptr @x, align 4
  %300 = load i32, ptr @y, align 4
  %301 = sub i32 %299, 1
  %302 = mul i32 %299, %301
  %303 = urem i32 %302, 2
  %304 = icmp eq i32 %303, 0
  %305 = icmp slt i32 %300, 10
  %306 = or i1 %304, %305
  br i1 %306, label %originalBB98, label %originalBB98alteredBB

originalBB98:                                     ; preds = %if.else25, %originalBB98alteredBB
  %307 = load ptr, ptr %outputs.addr, align 8
  %hatchOpen26 = getelementptr inbounds %struct.ControllerOutputs, ptr %307, i32 0, i32 3
  store i32 0, ptr %hatchOpen26, align 4
  %308 = load i32, ptr @x, align 4
  %309 = load i32, ptr @y, align 4
  %310 = sub i32 %308, 1
  %311 = mul i32 %308, %310
  %312 = urem i32 %311, 2
  %313 = icmp eq i32 %312, 0
  %314 = icmp slt i32 %309, 10
  %315 = or i1 %313, %314
  br i1 %315, label %originalBBpart2100, label %originalBB98alteredBB

originalBBpart2100:                               ; preds = %originalBB98
  br label %if.end27

if.end27:                                         ; preds = %originalBBpart2100, %originalBBpart296
  %316 = load i32, ptr @x, align 4
  %317 = load i32, ptr @y, align 4
  %318 = sub i32 %316, 1
  %319 = mul i32 %316, %318
  %320 = urem i32 %319, 2
  %321 = icmp eq i32 %320, 0
  %322 = icmp slt i32 %317, 10
  %323 = or i1 %321, %322
  br i1 %323, label %originalBB102, label %originalBB102alteredBB

originalBB102:                                    ; preds = %if.end27, %originalBB102alteredBB
  %324 = load i32, ptr %payloadReady, align 4
  %tobool28 = icmp ne i32 %324, 0
  %325 = load i32, ptr @x, align 4
  %326 = load i32, ptr @y, align 4
  %327 = sub i32 %325, 1
  %328 = mul i32 %325, %327
  %329 = urem i32 %328, 2
  %330 = icmp eq i32 %329, 0
  %331 = icmp slt i32 %326, 10
  %332 = or i1 %330, %331
  br i1 %332, label %originalBBpart2104, label %originalBB102alteredBB

originalBBpart2104:                               ; preds = %originalBB102
  br i1 %tobool28, label %if.then29, label %if.else31

if.then29:                                        ; preds = %originalBBpart2104
  %333 = load i32, ptr @x, align 4
  %334 = load i32, ptr @y, align 4
  %335 = sub i32 %333, 1
  %336 = mul i32 %333, %335
  %337 = urem i32 %336, 2
  %338 = icmp eq i32 %337, 0
  %339 = icmp slt i32 %334, 10
  %340 = or i1 %338, %339
  br i1 %340, label %originalBB106, label %originalBB106alteredBB

originalBB106:                                    ; preds = %if.then29, %originalBB106alteredBB
  %341 = load ptr, ptr %outputs.addr, align 8
  %payloadReady30 = getelementptr inbounds %struct.ControllerOutputs, ptr %341, i32 0, i32 4
  store i32 1, ptr %payloadReady30, align 4
  %342 = load i32, ptr @x, align 4
  %343 = load i32, ptr @y, align 4
  %344 = sub i32 %342, 1
  %345 = mul i32 %342, %344
  %346 = urem i32 %345, 2
  %347 = icmp eq i32 %346, 0
  %348 = icmp slt i32 %343, 10
  %349 = or i1 %347, %348
  br i1 %349, label %originalBBpart2108, label %originalBB106alteredBB

originalBBpart2108:                               ; preds = %originalBB106
  br label %if.end33

if.else31:                                        ; preds = %originalBBpart2104
  %350 = load i32, ptr @x, align 4
  %351 = load i32, ptr @y, align 4
  %352 = sub i32 %350, 1
  %353 = mul i32 %350, %352
  %354 = urem i32 %353, 2
  %355 = icmp eq i32 %354, 0
  %356 = icmp slt i32 %351, 10
  %357 = or i1 %355, %356
  br i1 %357, label %originalBB110, label %originalBB110alteredBB

originalBB110:                                    ; preds = %if.else31, %originalBB110alteredBB
  %358 = load ptr, ptr %outputs.addr, align 8
  %payloadReady32 = getelementptr inbounds %struct.ControllerOutputs, ptr %358, i32 0, i32 4
  store i32 0, ptr %payloadReady32, align 4
  %359 = load i32, ptr @x, align 4
  %360 = load i32, ptr @y, align 4
  %361 = sub i32 %359, 1
  %362 = mul i32 %359, %361
  %363 = urem i32 %362, 2
  %364 = icmp eq i32 %363, 0
  %365 = icmp slt i32 %360, 10
  %366 = or i1 %364, %365
  br i1 %366, label %originalBBpart2112, label %originalBB110alteredBB

originalBBpart2112:                               ; preds = %originalBB110
  br label %if.end33

if.end33:                                         ; preds = %originalBBpart2112, %originalBBpart2108
  %367 = load i32, ptr @x, align 4
  %368 = load i32, ptr @y, align 4
  %369 = sub i32 %367, 1
  %370 = mul i32 %367, %369
  %371 = urem i32 %370, 2
  %372 = icmp eq i32 %371, 0
  %373 = icmp slt i32 %368, 10
  %374 = or i1 %372, %373
  br i1 %374, label %originalBB114, label %originalBB114alteredBB

originalBB114:                                    ; preds = %if.end33, %originalBB114alteredBB
  %375 = load i32, ptr @x, align 4
  %376 = load i32, ptr @y, align 4
  %377 = sub i32 %375, 1
  %378 = mul i32 %375, %377
  %379 = urem i32 %378, 2
  %380 = icmp eq i32 %379, 0
  %381 = icmp slt i32 %376, 10
  %382 = or i1 %380, %381
  br i1 %382, label %originalBBpart2116, label %originalBB114alteredBB

originalBBpart2116:                               ; preds = %originalBB114
  ret void

originalBBalteredBB:                              ; preds = %originalBB, %entry
  %outputs.addralteredBB = alloca ptr, align 8
  %inputs.addralteredBB = alloca ptr, align 8
  %payloadReadyalteredBB = alloca i32, align 4
  store ptr %outputs, ptr %outputs.addralteredBB, align 8
  store ptr %inputs, ptr %inputs.addralteredBB, align 8
  %383 = load ptr, ptr %inputs.addralteredBB, align 8
  %payloadOnealteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %383, i32 0, i32 3
  %384 = load i32, ptr %payloadOnealteredBB, align 4
  %toboolalteredBB = icmp ne i32 %384, 0
  br label %originalBB

originalBB34alteredBB:                            ; preds = %originalBB34, %land.lhs.true
  %385 = load ptr, ptr %inputs.addr, align 8
  %payloadTwoalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %385, i32 0, i32 4
  %386 = load i32, ptr %payloadTwoalteredBB, align 4
  %tobool1alteredBB = icmp ne i32 %386, 0
  br label %originalBB34

originalBB38alteredBB:                            ; preds = %originalBB38, %land.rhs
  %387 = load ptr, ptr %inputs.addr, align 8
  %payloadThreealteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %387, i32 0, i32 5
  %388 = load i32, ptr %payloadThreealteredBB, align 4
  %tobool2alteredBB = icmp ne i32 %388, 0
  br label %originalBB38

originalBB42alteredBB:                            ; preds = %originalBB42, %land.end
  %land.extalteredBB = zext i1 %54 to i32
  store i32 %land.extalteredBB, ptr %payloadReady, align 4
  %389 = load ptr, ptr %inputs.addr, align 8
  %feedalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %389, i32 0, i32 0
  %390 = load i32, ptr %feedalteredBB, align 4
  %tobool3alteredBB = icmp ne i32 %390, 0
  br label %originalBB42

originalBB46alteredBB:                            ; preds = %originalBB46, %land.lhs.true4
  %391 = load ptr, ptr %inputs.addr, align 8
  %safealteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %391, i32 0, i32 1
  %392 = load i32, ptr %safealteredBB, align 4
  %tobool5alteredBB = icmp ne i32 %392, 0
  br label %originalBB46

originalBB50alteredBB:                            ; preds = %originalBB50, %if.then
  %393 = load ptr, ptr %outputs.addr, align 8
  %cargoLiftalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %393, i32 0, i32 0
  store i32 1, ptr %cargoLiftalteredBB, align 4
  br label %originalBB50

originalBB54alteredBB:                            ; preds = %originalBB54, %if.else
  %394 = load ptr, ptr %outputs.addr, align 8
  %cargoLift6alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %394, i32 0, i32 0
  store i32 0, ptr %cargoLift6alteredBB, align 4
  br label %originalBB54

originalBB58alteredBB:                            ; preds = %originalBB58, %if.end
  %395 = load ptr, ptr %inputs.addr, align 8
  %safe7alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %395, i32 0, i32 1
  %396 = load i32, ptr %safe7alteredBB, align 4
  %tobool8alteredBB = icmp ne i32 %396, 0
  br label %originalBB58

originalBB62alteredBB:                            ; preds = %originalBB62, %if.then9
  %397 = load ptr, ptr %outputs.addr, align 8
  %shaftFirewallalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %397, i32 0, i32 1
  store i32 1, ptr %shaftFirewallalteredBB, align 4
  br label %originalBB62

originalBB66alteredBB:                            ; preds = %originalBB66, %if.else10
  %398 = load ptr, ptr %outputs.addr, align 8
  %shaftFirewall11alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %398, i32 0, i32 1
  store i32 0, ptr %shaftFirewall11alteredBB, align 4
  br label %originalBB66

originalBB70alteredBB:                            ; preds = %originalBB70, %if.end12
  %399 = load ptr, ptr %inputs.addr, align 8
  %safe13alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %399, i32 0, i32 1
  %400 = load i32, ptr %safe13alteredBB, align 4
  %tobool14alteredBB = icmp ne i32 %400, 0
  br label %originalBB70

originalBB74alteredBB:                            ; preds = %originalBB74, %land.lhs.true15
  %401 = load ptr, ptr %inputs.addr, align 8
  %feed16alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %401, i32 0, i32 0
  %402 = load i32, ptr %feed16alteredBB, align 4
  %tobool17alteredBB = icmp ne i32 %402, 0
  br label %originalBB74

originalBB78alteredBB:                            ; preds = %originalBB78, %lor.lhs.false
  %403 = load i32, ptr %payloadReady, align 4
  %tobool18alteredBB = icmp ne i32 %403, 0
  br label %originalBB78

originalBB82alteredBB:                            ; preds = %originalBB82, %if.then19
  %404 = load ptr, ptr %outputs.addr, align 8
  %serviceRelayalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %404, i32 0, i32 2
  store i32 1, ptr %serviceRelayalteredBB, align 4
  br label %originalBB82

originalBB86alteredBB:                            ; preds = %originalBB86, %if.else20
  %405 = load ptr, ptr %outputs.addr, align 8
  %serviceRelay21alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %405, i32 0, i32 2
  store i32 0, ptr %serviceRelay21alteredBB, align 4
  br label %originalBB86

originalBB90alteredBB:                            ; preds = %originalBB90, %if.end22
  %406 = load ptr, ptr %inputs.addr, align 8
  %hatchTogglealteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %406, i32 0, i32 2
  %407 = load i32, ptr %hatchTogglealteredBB, align 4
  %tobool23alteredBB = icmp ne i32 %407, 0
  br label %originalBB90

originalBB94alteredBB:                            ; preds = %originalBB94, %if.then24
  %408 = load ptr, ptr %outputs.addr, align 8
  %hatchOpenalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %408, i32 0, i32 3
  store i32 1, ptr %hatchOpenalteredBB, align 4
  br label %originalBB94

originalBB98alteredBB:                            ; preds = %originalBB98, %if.else25
  %409 = load ptr, ptr %outputs.addr, align 8
  %hatchOpen26alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %409, i32 0, i32 3
  store i32 0, ptr %hatchOpen26alteredBB, align 4
  br label %originalBB98

originalBB102alteredBB:                           ; preds = %originalBB102, %if.end27
  %410 = load i32, ptr %payloadReady, align 4
  %tobool28alteredBB = icmp ne i32 %410, 0
  br label %originalBB102

originalBB106alteredBB:                           ; preds = %originalBB106, %if.then29
  %411 = load ptr, ptr %outputs.addr, align 8
  %payloadReady30alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %411, i32 0, i32 4
  store i32 1, ptr %payloadReady30alteredBB, align 4
  br label %originalBB106

originalBB110alteredBB:                           ; preds = %originalBB110, %if.else31
  %412 = load ptr, ptr %outputs.addr, align 8
  %payloadReady32alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %412, i32 0, i32 4
  store i32 0, ptr %payloadReady32alteredBB, align 4
  br label %originalBB110

originalBB114alteredBB:                           ; preds = %originalBB114, %if.end33
  br label %originalBB114
}

attributes #0 = { noinline nounwind optnone uwtable "min-legal-vector-width"="0" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }

!llvm.module.flags = !{!0, !1, !2}
!llvm.ident = !{!3}

!0 = !{i32 1, !"wchar_size", i32 2}
!1 = !{i32 8, !"PIC Level", i32 2}
!2 = !{i32 7, !"uwtable", i32 2}
!3 = !{!"clang version 16.0.6 (https://github.com/llvm/llvm-project.git 7cbf1a2591520c2491aa35339f227775f4d3adf6)"}
