; ModuleID = 'E:\Workspace\binary_binja_redesign\comp4020-final-ky787\experiments\coop-controllers\race-condition\src\controller.c'
source_filename = "E:\\Workspace\\binary_binja_redesign\\comp4020-final-ky787\\experiments\\coop-controllers\\race-condition\\src\\controller.c"
target datalayout = "e-m:w-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-windows-msvc19.51.36248"

%struct.ControllerInputs = type { i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32 }
%struct.ControllerOutputs = type { i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32 }

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
  %master = alloca i32, align 4
  store ptr %outputs, ptr %outputs.addr, align 8
  store ptr %inputs, ptr %inputs.addr, align 8
  %8 = load ptr, ptr %inputs.addr, align 8
  %payloadDelivered = getelementptr inbounds %struct.ControllerInputs, ptr %8, i32 0, i32 2
  %9 = load i32, ptr %payloadDelivered, align 4
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
  br i1 %tobool, label %land.rhs, label %land.end

land.rhs:                                         ; preds = %originalBBpart2
  %18 = load i32, ptr @x, align 4
  %19 = load i32, ptr @y, align 4
  %20 = sub i32 %18, 1
  %21 = mul i32 %18, %20
  %22 = urem i32 %21, 2
  %23 = icmp eq i32 %22, 0
  %24 = icmp slt i32 %19, 10
  %25 = or i1 %23, %24
  br i1 %25, label %originalBB96, label %originalBB96alteredBB

originalBB96:                                     ; preds = %land.rhs, %originalBB96alteredBB
  %26 = load ptr, ptr %inputs.addr, align 8
  %traceOccupied = getelementptr inbounds %struct.ControllerInputs, ptr %26, i32 0, i32 3
  %27 = load i32, ptr %traceOccupied, align 4
  %tobool1 = icmp ne i32 %27, 0
  %28 = load i32, ptr @x, align 4
  %29 = load i32, ptr @y, align 4
  %30 = sub i32 %28, 1
  %31 = mul i32 %28, %30
  %32 = urem i32 %31, 2
  %33 = icmp eq i32 %32, 0
  %34 = icmp slt i32 %29, 10
  %35 = or i1 %33, %34
  br i1 %35, label %originalBBpart298, label %originalBB96alteredBB

originalBBpart298:                                ; preds = %originalBB96
  br label %land.end

land.end:                                         ; preds = %originalBBpart298, %originalBBpart2
  %36 = phi i1 [ false, %originalBBpart2 ], [ %tobool1, %originalBBpart298 ]
  %37 = load i32, ptr @x, align 4
  %38 = load i32, ptr @y, align 4
  %39 = sub i32 %37, 1
  %40 = mul i32 %37, %39
  %41 = urem i32 %40, 2
  %42 = icmp eq i32 %41, 0
  %43 = icmp slt i32 %38, 10
  %44 = or i1 %42, %43
  br i1 %44, label %originalBB100, label %originalBB100alteredBB

originalBB100:                                    ; preds = %land.end, %originalBB100alteredBB
  %land.ext = zext i1 %36 to i32
  store i32 %land.ext, ptr %master, align 4
  %45 = load ptr, ptr %inputs.addr, align 8
  %dropA = getelementptr inbounds %struct.ControllerInputs, ptr %45, i32 0, i32 0
  %46 = load i32, ptr %dropA, align 4
  %tobool2 = icmp ne i32 %46, 0
  %47 = load i32, ptr @x, align 4
  %48 = load i32, ptr @y, align 4
  %49 = sub i32 %47, 1
  %50 = mul i32 %47, %49
  %51 = urem i32 %50, 2
  %52 = icmp eq i32 %51, 0
  %53 = icmp slt i32 %48, 10
  %54 = or i1 %52, %53
  br i1 %54, label %originalBBpart2102, label %originalBB100alteredBB

originalBBpart2102:                               ; preds = %originalBB100
  br i1 %tobool2, label %if.else, label %if.then

if.then:                                          ; preds = %originalBBpart2102
  %55 = load i32, ptr @x, align 4
  %56 = load i32, ptr @y, align 4
  %57 = sub i32 %55, 1
  %58 = mul i32 %55, %57
  %59 = urem i32 %58, 2
  %60 = icmp eq i32 %59, 0
  %61 = icmp slt i32 %56, 10
  %62 = or i1 %60, %61
  br i1 %62, label %originalBB104, label %originalBB104alteredBB

originalBB104:                                    ; preds = %if.then, %originalBB104alteredBB
  %63 = load ptr, ptr %outputs.addr, align 8
  %topBridge = getelementptr inbounds %struct.ControllerOutputs, ptr %63, i32 0, i32 0
  store i32 1, ptr %topBridge, align 4
  %64 = load i32, ptr @x, align 4
  %65 = load i32, ptr @y, align 4
  %66 = sub i32 %64, 1
  %67 = mul i32 %64, %66
  %68 = urem i32 %67, 2
  %69 = icmp eq i32 %68, 0
  %70 = icmp slt i32 %65, 10
  %71 = or i1 %69, %70
  br i1 %71, label %originalBBpart2106, label %originalBB104alteredBB

originalBBpart2106:                               ; preds = %originalBB104
  br label %if.end

if.else:                                          ; preds = %originalBBpart2102
  %72 = load i32, ptr @x, align 4
  %73 = load i32, ptr @y, align 4
  %74 = sub i32 %72, 1
  %75 = mul i32 %72, %74
  %76 = urem i32 %75, 2
  %77 = icmp eq i32 %76, 0
  %78 = icmp slt i32 %73, 10
  %79 = or i1 %77, %78
  br i1 %79, label %originalBB108, label %originalBB108alteredBB

originalBB108:                                    ; preds = %if.else, %originalBB108alteredBB
  %80 = load ptr, ptr %outputs.addr, align 8
  %topBridge3 = getelementptr inbounds %struct.ControllerOutputs, ptr %80, i32 0, i32 0
  store i32 0, ptr %topBridge3, align 4
  %81 = load i32, ptr @x, align 4
  %82 = load i32, ptr @y, align 4
  %83 = sub i32 %81, 1
  %84 = mul i32 %81, %83
  %85 = urem i32 %84, 2
  %86 = icmp eq i32 %85, 0
  %87 = icmp slt i32 %82, 10
  %88 = or i1 %86, %87
  br i1 %88, label %originalBBpart2110, label %originalBB108alteredBB

originalBBpart2110:                               ; preds = %originalBB108
  br label %if.end

if.end:                                           ; preds = %originalBBpart2110, %originalBBpart2106
  %89 = load i32, ptr @x, align 4
  %90 = load i32, ptr @y, align 4
  %91 = sub i32 %89, 1
  %92 = mul i32 %89, %91
  %93 = urem i32 %92, 2
  %94 = icmp eq i32 %93, 0
  %95 = icmp slt i32 %90, 10
  %96 = or i1 %94, %95
  br i1 %96, label %originalBB112, label %originalBB112alteredBB

originalBB112:                                    ; preds = %if.end, %originalBB112alteredBB
  %97 = load ptr, ptr %inputs.addr, align 8
  %dropB = getelementptr inbounds %struct.ControllerInputs, ptr %97, i32 0, i32 1
  %98 = load i32, ptr %dropB, align 4
  %tobool4 = icmp ne i32 %98, 0
  %99 = load i32, ptr @x, align 4
  %100 = load i32, ptr @y, align 4
  %101 = sub i32 %99, 1
  %102 = mul i32 %99, %101
  %103 = urem i32 %102, 2
  %104 = icmp eq i32 %103, 0
  %105 = icmp slt i32 %100, 10
  %106 = or i1 %104, %105
  br i1 %106, label %originalBBpart2114, label %originalBB112alteredBB

originalBBpart2114:                               ; preds = %originalBB112
  br i1 %tobool4, label %if.else8, label %land.lhs.true

land.lhs.true:                                    ; preds = %originalBBpart2114
  %107 = load i32, ptr @x, align 4
  %108 = load i32, ptr @y, align 4
  %109 = sub i32 %107, 1
  %110 = mul i32 %107, %109
  %111 = urem i32 %110, 2
  %112 = icmp eq i32 %111, 0
  %113 = icmp slt i32 %108, 10
  %114 = or i1 %112, %113
  br i1 %114, label %originalBB116, label %originalBB116alteredBB

originalBB116:                                    ; preds = %land.lhs.true, %originalBB116alteredBB
  %115 = load ptr, ptr %inputs.addr, align 8
  %bufferPhase = getelementptr inbounds %struct.ControllerInputs, ptr %115, i32 0, i32 10
  %116 = load i32, ptr %bufferPhase, align 4
  %cmp = icmp eq i32 %116, 0
  %117 = load i32, ptr @x, align 4
  %118 = load i32, ptr @y, align 4
  %119 = sub i32 %117, 1
  %120 = mul i32 %117, %119
  %121 = urem i32 %120, 2
  %122 = icmp eq i32 %121, 0
  %123 = icmp slt i32 %118, 10
  %124 = or i1 %122, %123
  br i1 %124, label %originalBBpart2118, label %originalBB116alteredBB

originalBBpart2118:                               ; preds = %originalBB116
  br i1 %cmp, label %if.then7, label %lor.lhs.false

lor.lhs.false:                                    ; preds = %originalBBpart2118
  %125 = load i32, ptr @x, align 4
  %126 = load i32, ptr @y, align 4
  %127 = sub i32 %125, 1
  %128 = mul i32 %125, %127
  %129 = urem i32 %128, 2
  %130 = icmp eq i32 %129, 0
  %131 = icmp slt i32 %126, 10
  %132 = or i1 %130, %131
  br i1 %132, label %originalBB120, label %originalBB120alteredBB

originalBB120:                                    ; preds = %lor.lhs.false, %originalBB120alteredBB
  %133 = load ptr, ptr %inputs.addr, align 8
  %bufferPhase5 = getelementptr inbounds %struct.ControllerInputs, ptr %133, i32 0, i32 10
  %134 = load i32, ptr %bufferPhase5, align 4
  %cmp6 = icmp eq i32 %134, 1
  %135 = load i32, ptr @x, align 4
  %136 = load i32, ptr @y, align 4
  %137 = sub i32 %135, 1
  %138 = mul i32 %135, %137
  %139 = urem i32 %138, 2
  %140 = icmp eq i32 %139, 0
  %141 = icmp slt i32 %136, 10
  %142 = or i1 %140, %141
  br i1 %142, label %originalBBpart2122, label %originalBB120alteredBB

originalBBpart2122:                               ; preds = %originalBB120
  br i1 %cmp6, label %if.then7, label %if.else8

if.then7:                                         ; preds = %originalBBpart2122, %originalBBpart2118
  %143 = load i32, ptr @x, align 4
  %144 = load i32, ptr @y, align 4
  %145 = sub i32 %143, 1
  %146 = mul i32 %143, %145
  %147 = urem i32 %146, 2
  %148 = icmp eq i32 %147, 0
  %149 = icmp slt i32 %144, 10
  %150 = or i1 %148, %149
  br i1 %150, label %originalBB124, label %originalBB124alteredBB

originalBB124:                                    ; preds = %if.then7, %originalBB124alteredBB
  %151 = load ptr, ptr %outputs.addr, align 8
  %bufferBridge = getelementptr inbounds %struct.ControllerOutputs, ptr %151, i32 0, i32 1
  store i32 1, ptr %bufferBridge, align 4
  %152 = load i32, ptr @x, align 4
  %153 = load i32, ptr @y, align 4
  %154 = sub i32 %152, 1
  %155 = mul i32 %152, %154
  %156 = urem i32 %155, 2
  %157 = icmp eq i32 %156, 0
  %158 = icmp slt i32 %153, 10
  %159 = or i1 %157, %158
  br i1 %159, label %originalBBpart2126, label %originalBB124alteredBB

originalBBpart2126:                               ; preds = %originalBB124
  br label %if.end10

if.else8:                                         ; preds = %originalBBpart2122, %originalBBpart2114
  %160 = load i32, ptr @x, align 4
  %161 = load i32, ptr @y, align 4
  %162 = sub i32 %160, 1
  %163 = mul i32 %160, %162
  %164 = urem i32 %163, 2
  %165 = icmp eq i32 %164, 0
  %166 = icmp slt i32 %161, 10
  %167 = or i1 %165, %166
  br i1 %167, label %originalBB128, label %originalBB128alteredBB

originalBB128:                                    ; preds = %if.else8, %originalBB128alteredBB
  %168 = load ptr, ptr %outputs.addr, align 8
  %bufferBridge9 = getelementptr inbounds %struct.ControllerOutputs, ptr %168, i32 0, i32 1
  store i32 0, ptr %bufferBridge9, align 4
  %169 = load i32, ptr @x, align 4
  %170 = load i32, ptr @y, align 4
  %171 = sub i32 %169, 1
  %172 = mul i32 %169, %171
  %173 = urem i32 %172, 2
  %174 = icmp eq i32 %173, 0
  %175 = icmp slt i32 %170, 10
  %176 = or i1 %174, %175
  br i1 %176, label %originalBBpart2130, label %originalBB128alteredBB

originalBBpart2130:                               ; preds = %originalBB128
  br label %if.end10

if.end10:                                         ; preds = %originalBBpart2130, %originalBBpart2126
  %177 = load i32, ptr @x, align 4
  %178 = load i32, ptr @y, align 4
  %179 = sub i32 %177, 1
  %180 = mul i32 %177, %179
  %181 = urem i32 %180, 2
  %182 = icmp eq i32 %181, 0
  %183 = icmp slt i32 %178, 10
  %184 = or i1 %182, %183
  br i1 %184, label %originalBB132, label %originalBB132alteredBB

originalBB132:                                    ; preds = %if.end10, %originalBB132alteredBB
  %185 = load ptr, ptr %inputs.addr, align 8
  %dropB11 = getelementptr inbounds %struct.ControllerInputs, ptr %185, i32 0, i32 1
  %186 = load i32, ptr %dropB11, align 4
  %tobool12 = icmp ne i32 %186, 0
  %187 = load i32, ptr @x, align 4
  %188 = load i32, ptr @y, align 4
  %189 = sub i32 %187, 1
  %190 = mul i32 %187, %189
  %191 = urem i32 %190, 2
  %192 = icmp eq i32 %191, 0
  %193 = icmp slt i32 %188, 10
  %194 = or i1 %192, %193
  br i1 %194, label %originalBBpart2134, label %originalBB132alteredBB

originalBBpart2134:                               ; preds = %originalBB132
  br i1 %tobool12, label %lor.lhs.false13, label %if.then16

lor.lhs.false13:                                  ; preds = %originalBBpart2134
  %195 = load i32, ptr @x, align 4
  %196 = load i32, ptr @y, align 4
  %197 = sub i32 %195, 1
  %198 = mul i32 %195, %197
  %199 = urem i32 %198, 2
  %200 = icmp eq i32 %199, 0
  %201 = icmp slt i32 %196, 10
  %202 = or i1 %200, %201
  br i1 %202, label %originalBB136, label %originalBB136alteredBB

originalBB136:                                    ; preds = %lor.lhs.false13, %originalBB136alteredBB
  %203 = load ptr, ptr %inputs.addr, align 8
  %bufferPhase14 = getelementptr inbounds %struct.ControllerInputs, ptr %203, i32 0, i32 10
  %204 = load i32, ptr %bufferPhase14, align 4
  %cmp15 = icmp eq i32 %204, 3
  %205 = load i32, ptr @x, align 4
  %206 = load i32, ptr @y, align 4
  %207 = sub i32 %205, 1
  %208 = mul i32 %205, %207
  %209 = urem i32 %208, 2
  %210 = icmp eq i32 %209, 0
  %211 = icmp slt i32 %206, 10
  %212 = or i1 %210, %211
  br i1 %212, label %originalBBpart2138, label %originalBB136alteredBB

originalBBpart2138:                               ; preds = %originalBB136
  br i1 %cmp15, label %if.then16, label %if.else17

if.then16:                                        ; preds = %originalBBpart2138, %originalBBpart2134
  %213 = load i32, ptr @x, align 4
  %214 = load i32, ptr @y, align 4
  %215 = sub i32 %213, 1
  %216 = mul i32 %213, %215
  %217 = urem i32 %216, 2
  %218 = icmp eq i32 %217, 0
  %219 = icmp slt i32 %214, 10
  %220 = or i1 %218, %219
  br i1 %220, label %originalBB140, label %originalBB140alteredBB

originalBB140:                                    ; preds = %if.then16, %originalBB140alteredBB
  %221 = load ptr, ptr %outputs.addr, align 8
  %safetyFirewall = getelementptr inbounds %struct.ControllerOutputs, ptr %221, i32 0, i32 2
  store i32 1, ptr %safetyFirewall, align 4
  %222 = load i32, ptr @x, align 4
  %223 = load i32, ptr @y, align 4
  %224 = sub i32 %222, 1
  %225 = mul i32 %222, %224
  %226 = urem i32 %225, 2
  %227 = icmp eq i32 %226, 0
  %228 = icmp slt i32 %223, 10
  %229 = or i1 %227, %228
  br i1 %229, label %originalBBpart2142, label %originalBB140alteredBB

originalBBpart2142:                               ; preds = %originalBB140
  br label %if.end19

if.else17:                                        ; preds = %originalBBpart2138
  %230 = load i32, ptr @x, align 4
  %231 = load i32, ptr @y, align 4
  %232 = sub i32 %230, 1
  %233 = mul i32 %230, %232
  %234 = urem i32 %233, 2
  %235 = icmp eq i32 %234, 0
  %236 = icmp slt i32 %231, 10
  %237 = or i1 %235, %236
  br i1 %237, label %originalBB144, label %originalBB144alteredBB

originalBB144:                                    ; preds = %if.else17, %originalBB144alteredBB
  %238 = load ptr, ptr %outputs.addr, align 8
  %safetyFirewall18 = getelementptr inbounds %struct.ControllerOutputs, ptr %238, i32 0, i32 2
  store i32 0, ptr %safetyFirewall18, align 4
  %239 = load i32, ptr @x, align 4
  %240 = load i32, ptr @y, align 4
  %241 = sub i32 %239, 1
  %242 = mul i32 %239, %241
  %243 = urem i32 %242, 2
  %244 = icmp eq i32 %243, 0
  %245 = icmp slt i32 %240, 10
  %246 = or i1 %244, %245
  br i1 %246, label %originalBBpart2146, label %originalBB144alteredBB

originalBBpart2146:                               ; preds = %originalBB144
  br label %if.end19

if.end19:                                         ; preds = %originalBBpart2146, %originalBBpart2142
  %247 = load i32, ptr @x, align 4
  %248 = load i32, ptr @y, align 4
  %249 = sub i32 %247, 1
  %250 = mul i32 %247, %249
  %251 = urem i32 %250, 2
  %252 = icmp eq i32 %251, 0
  %253 = icmp slt i32 %248, 10
  %254 = or i1 %252, %253
  br i1 %254, label %originalBB148, label %originalBB148alteredBB

originalBB148:                                    ; preds = %if.end19, %originalBB148alteredBB
  %255 = load ptr, ptr %inputs.addr, align 8
  %dropA20 = getelementptr inbounds %struct.ControllerInputs, ptr %255, i32 0, i32 0
  %256 = load i32, ptr %dropA20, align 4
  %tobool21 = icmp ne i32 %256, 0
  %257 = load i32, ptr @x, align 4
  %258 = load i32, ptr @y, align 4
  %259 = sub i32 %257, 1
  %260 = mul i32 %257, %259
  %261 = urem i32 %260, 2
  %262 = icmp eq i32 %261, 0
  %263 = icmp slt i32 %258, 10
  %264 = or i1 %262, %263
  br i1 %264, label %originalBBpart2150, label %originalBB148alteredBB

originalBBpart2150:                               ; preds = %originalBB148
  br i1 %tobool21, label %land.lhs.true22, label %if.else26

land.lhs.true22:                                  ; preds = %originalBBpart2150
  %265 = load i32, ptr @x, align 4
  %266 = load i32, ptr @y, align 4
  %267 = sub i32 %265, 1
  %268 = mul i32 %265, %267
  %269 = urem i32 %268, 2
  %270 = icmp eq i32 %269, 0
  %271 = icmp slt i32 %266, 10
  %272 = or i1 %270, %271
  br i1 %272, label %originalBB152, label %originalBB152alteredBB

originalBB152:                                    ; preds = %land.lhs.true22, %originalBB152alteredBB
  %273 = load ptr, ptr %inputs.addr, align 8
  %dropB23 = getelementptr inbounds %struct.ControllerInputs, ptr %273, i32 0, i32 1
  %274 = load i32, ptr %dropB23, align 4
  %tobool24 = icmp ne i32 %274, 0
  %275 = load i32, ptr @x, align 4
  %276 = load i32, ptr @y, align 4
  %277 = sub i32 %275, 1
  %278 = mul i32 %275, %277
  %279 = urem i32 %278, 2
  %280 = icmp eq i32 %279, 0
  %281 = icmp slt i32 %276, 10
  %282 = or i1 %280, %281
  br i1 %282, label %originalBBpart2154, label %originalBB152alteredBB

originalBBpart2154:                               ; preds = %originalBB152
  br i1 %tobool24, label %if.then25, label %if.else26

if.then25:                                        ; preds = %originalBBpart2154
  %283 = load i32, ptr @x, align 4
  %284 = load i32, ptr @y, align 4
  %285 = sub i32 %283, 1
  %286 = mul i32 %283, %285
  %287 = urem i32 %286, 2
  %288 = icmp eq i32 %287, 0
  %289 = icmp slt i32 %284, 10
  %290 = or i1 %288, %289
  br i1 %290, label %originalBB156, label %originalBB156alteredBB

originalBB156:                                    ; preds = %if.then25, %originalBB156alteredBB
  %291 = load ptr, ptr %outputs.addr, align 8
  %raceFirewall = getelementptr inbounds %struct.ControllerOutputs, ptr %291, i32 0, i32 3
  store i32 1, ptr %raceFirewall, align 4
  %292 = load i32, ptr @x, align 4
  %293 = load i32, ptr @y, align 4
  %294 = sub i32 %292, 1
  %295 = mul i32 %292, %294
  %296 = urem i32 %295, 2
  %297 = icmp eq i32 %296, 0
  %298 = icmp slt i32 %293, 10
  %299 = or i1 %297, %298
  br i1 %299, label %originalBBpart2158, label %originalBB156alteredBB

originalBBpart2158:                               ; preds = %originalBB156
  br label %if.end28

if.else26:                                        ; preds = %originalBBpart2154, %originalBBpart2150
  %300 = load i32, ptr @x, align 4
  %301 = load i32, ptr @y, align 4
  %302 = sub i32 %300, 1
  %303 = mul i32 %300, %302
  %304 = urem i32 %303, 2
  %305 = icmp eq i32 %304, 0
  %306 = icmp slt i32 %301, 10
  %307 = or i1 %305, %306
  br i1 %307, label %originalBB160, label %originalBB160alteredBB

originalBB160:                                    ; preds = %if.else26, %originalBB160alteredBB
  %308 = load ptr, ptr %outputs.addr, align 8
  %raceFirewall27 = getelementptr inbounds %struct.ControllerOutputs, ptr %308, i32 0, i32 3
  store i32 0, ptr %raceFirewall27, align 4
  %309 = load i32, ptr @x, align 4
  %310 = load i32, ptr @y, align 4
  %311 = sub i32 %309, 1
  %312 = mul i32 %309, %311
  %313 = urem i32 %312, 2
  %314 = icmp eq i32 %313, 0
  %315 = icmp slt i32 %310, 10
  %316 = or i1 %314, %315
  br i1 %316, label %originalBBpart2162, label %originalBB160alteredBB

originalBBpart2162:                               ; preds = %originalBB160
  br label %if.end28

if.end28:                                         ; preds = %originalBBpart2162, %originalBBpart2158
  %317 = load i32, ptr @x, align 4
  %318 = load i32, ptr @y, align 4
  %319 = sub i32 %317, 1
  %320 = mul i32 %317, %319
  %321 = urem i32 %320, 2
  %322 = icmp eq i32 %321, 0
  %323 = icmp slt i32 %318, 10
  %324 = or i1 %322, %323
  br i1 %324, label %originalBB164, label %originalBB164alteredBB

originalBB164:                                    ; preds = %if.end28, %originalBB164alteredBB
  %325 = load i32, ptr %master, align 4
  %tobool29 = icmp ne i32 %325, 0
  %326 = load i32, ptr @x, align 4
  %327 = load i32, ptr @y, align 4
  %328 = sub i32 %326, 1
  %329 = mul i32 %326, %328
  %330 = urem i32 %329, 2
  %331 = icmp eq i32 %330, 0
  %332 = icmp slt i32 %327, 10
  %333 = or i1 %331, %332
  br i1 %333, label %originalBBpart2166, label %originalBB164alteredBB

originalBBpart2166:                               ; preds = %originalBB164
  br i1 %tobool29, label %if.then30, label %if.else31

if.then30:                                        ; preds = %originalBBpart2166
  %334 = load i32, ptr @x, align 4
  %335 = load i32, ptr @y, align 4
  %336 = sub i32 %334, 1
  %337 = mul i32 %334, %336
  %338 = urem i32 %337, 2
  %339 = icmp eq i32 %338, 0
  %340 = icmp slt i32 %335, 10
  %341 = or i1 %339, %340
  br i1 %341, label %originalBB168, label %originalBB168alteredBB

originalBB168:                                    ; preds = %if.then30, %originalBB168alteredBB
  %342 = load ptr, ptr %outputs.addr, align 8
  %spanMaster = getelementptr inbounds %struct.ControllerOutputs, ptr %342, i32 0, i32 4
  store i32 1, ptr %spanMaster, align 4
  %343 = load i32, ptr @x, align 4
  %344 = load i32, ptr @y, align 4
  %345 = sub i32 %343, 1
  %346 = mul i32 %343, %345
  %347 = urem i32 %346, 2
  %348 = icmp eq i32 %347, 0
  %349 = icmp slt i32 %344, 10
  %350 = or i1 %348, %349
  br i1 %350, label %originalBBpart2170, label %originalBB168alteredBB

originalBBpart2170:                               ; preds = %originalBB168
  br label %if.end33

if.else31:                                        ; preds = %originalBBpart2166
  %351 = load i32, ptr @x, align 4
  %352 = load i32, ptr @y, align 4
  %353 = sub i32 %351, 1
  %354 = mul i32 %351, %353
  %355 = urem i32 %354, 2
  %356 = icmp eq i32 %355, 0
  %357 = icmp slt i32 %352, 10
  %358 = or i1 %356, %357
  br i1 %358, label %originalBB172, label %originalBB172alteredBB

originalBB172:                                    ; preds = %if.else31, %originalBB172alteredBB
  %359 = load ptr, ptr %outputs.addr, align 8
  %spanMaster32 = getelementptr inbounds %struct.ControllerOutputs, ptr %359, i32 0, i32 4
  store i32 0, ptr %spanMaster32, align 4
  %360 = load i32, ptr @x, align 4
  %361 = load i32, ptr @y, align 4
  %362 = sub i32 %360, 1
  %363 = mul i32 %360, %362
  %364 = urem i32 %363, 2
  %365 = icmp eq i32 %364, 0
  %366 = icmp slt i32 %361, 10
  %367 = or i1 %365, %366
  br i1 %367, label %originalBBpart2174, label %originalBB172alteredBB

originalBBpart2174:                               ; preds = %originalBB172
  br label %if.end33

if.end33:                                         ; preds = %originalBBpart2174, %originalBBpart2170
  %368 = load i32, ptr @x, align 4
  %369 = load i32, ptr @y, align 4
  %370 = sub i32 %368, 1
  %371 = mul i32 %368, %370
  %372 = urem i32 %371, 2
  %373 = icmp eq i32 %372, 0
  %374 = icmp slt i32 %369, 10
  %375 = or i1 %373, %374
  br i1 %375, label %originalBB176, label %originalBB176alteredBB

originalBB176:                                    ; preds = %if.end33, %originalBB176alteredBB
  %376 = load i32, ptr %master, align 4
  %tobool34 = icmp ne i32 %376, 0
  %377 = load i32, ptr @x, align 4
  %378 = load i32, ptr @y, align 4
  %379 = sub i32 %377, 1
  %380 = mul i32 %377, %379
  %381 = urem i32 %380, 2
  %382 = icmp eq i32 %381, 0
  %383 = icmp slt i32 %378, 10
  %384 = or i1 %382, %383
  br i1 %384, label %originalBBpart2178, label %originalBB176alteredBB

originalBBpart2178:                               ; preds = %originalBB176
  br i1 %tobool34, label %land.lhs.true35, label %if.else38

land.lhs.true35:                                  ; preds = %originalBBpart2178
  %385 = load i32, ptr @x, align 4
  %386 = load i32, ptr @y, align 4
  %387 = sub i32 %385, 1
  %388 = mul i32 %385, %387
  %389 = urem i32 %388, 2
  %390 = icmp eq i32 %389, 0
  %391 = icmp slt i32 %386, 10
  %392 = or i1 %390, %391
  br i1 %392, label %originalBB180, label %originalBB180alteredBB

originalBB180:                                    ; preds = %land.lhs.true35, %originalBB180alteredBB
  %393 = load ptr, ptr %inputs.addr, align 8
  %phase = getelementptr inbounds %struct.ControllerInputs, ptr %393, i32 0, i32 4
  %394 = load i32, ptr %phase, align 4
  %tobool36 = icmp ne i32 %394, 0
  %395 = load i32, ptr @x, align 4
  %396 = load i32, ptr @y, align 4
  %397 = sub i32 %395, 1
  %398 = mul i32 %395, %397
  %399 = urem i32 %398, 2
  %400 = icmp eq i32 %399, 0
  %401 = icmp slt i32 %396, 10
  %402 = or i1 %400, %401
  br i1 %402, label %originalBBpart2182, label %originalBB180alteredBB

originalBBpart2182:                               ; preds = %originalBB180
  br i1 %tobool36, label %if.else38, label %if.then37

if.then37:                                        ; preds = %originalBBpart2182
  %403 = load i32, ptr @x, align 4
  %404 = load i32, ptr @y, align 4
  %405 = sub i32 %403, 1
  %406 = mul i32 %403, %405
  %407 = urem i32 %406, 2
  %408 = icmp eq i32 %407, 0
  %409 = icmp slt i32 %404, 10
  %410 = or i1 %408, %409
  br i1 %410, label %originalBB184, label %originalBB184alteredBB

originalBB184:                                    ; preds = %if.then37, %originalBB184alteredBB
  %411 = load ptr, ptr %outputs.addr, align 8
  %phaseA = getelementptr inbounds %struct.ControllerOutputs, ptr %411, i32 0, i32 5
  store i32 1, ptr %phaseA, align 4
  %412 = load i32, ptr @x, align 4
  %413 = load i32, ptr @y, align 4
  %414 = sub i32 %412, 1
  %415 = mul i32 %412, %414
  %416 = urem i32 %415, 2
  %417 = icmp eq i32 %416, 0
  %418 = icmp slt i32 %413, 10
  %419 = or i1 %417, %418
  br i1 %419, label %originalBBpart2186, label %originalBB184alteredBB

originalBBpart2186:                               ; preds = %originalBB184
  br label %if.end40

if.else38:                                        ; preds = %originalBBpart2182, %originalBBpart2178
  %420 = load i32, ptr @x, align 4
  %421 = load i32, ptr @y, align 4
  %422 = sub i32 %420, 1
  %423 = mul i32 %420, %422
  %424 = urem i32 %423, 2
  %425 = icmp eq i32 %424, 0
  %426 = icmp slt i32 %421, 10
  %427 = or i1 %425, %426
  br i1 %427, label %originalBB188, label %originalBB188alteredBB

originalBB188:                                    ; preds = %if.else38, %originalBB188alteredBB
  %428 = load ptr, ptr %outputs.addr, align 8
  %phaseA39 = getelementptr inbounds %struct.ControllerOutputs, ptr %428, i32 0, i32 5
  store i32 0, ptr %phaseA39, align 4
  %429 = load i32, ptr @x, align 4
  %430 = load i32, ptr @y, align 4
  %431 = sub i32 %429, 1
  %432 = mul i32 %429, %431
  %433 = urem i32 %432, 2
  %434 = icmp eq i32 %433, 0
  %435 = icmp slt i32 %430, 10
  %436 = or i1 %434, %435
  br i1 %436, label %originalBBpart2190, label %originalBB188alteredBB

originalBBpart2190:                               ; preds = %originalBB188
  br label %if.end40

if.end40:                                         ; preds = %originalBBpart2190, %originalBBpart2186
  %437 = load i32, ptr @x, align 4
  %438 = load i32, ptr @y, align 4
  %439 = sub i32 %437, 1
  %440 = mul i32 %437, %439
  %441 = urem i32 %440, 2
  %442 = icmp eq i32 %441, 0
  %443 = icmp slt i32 %438, 10
  %444 = or i1 %442, %443
  br i1 %444, label %originalBB192, label %originalBB192alteredBB

originalBB192:                                    ; preds = %if.end40, %originalBB192alteredBB
  %445 = load i32, ptr %master, align 4
  %tobool41 = icmp ne i32 %445, 0
  %446 = load i32, ptr @x, align 4
  %447 = load i32, ptr @y, align 4
  %448 = sub i32 %446, 1
  %449 = mul i32 %446, %448
  %450 = urem i32 %449, 2
  %451 = icmp eq i32 %450, 0
  %452 = icmp slt i32 %447, 10
  %453 = or i1 %451, %452
  br i1 %453, label %originalBBpart2194, label %originalBB192alteredBB

originalBBpart2194:                               ; preds = %originalBB192
  br i1 %tobool41, label %land.lhs.true42, label %if.else46

land.lhs.true42:                                  ; preds = %originalBBpart2194
  %454 = load i32, ptr @x, align 4
  %455 = load i32, ptr @y, align 4
  %456 = sub i32 %454, 1
  %457 = mul i32 %454, %456
  %458 = urem i32 %457, 2
  %459 = icmp eq i32 %458, 0
  %460 = icmp slt i32 %455, 10
  %461 = or i1 %459, %460
  br i1 %461, label %originalBB196, label %originalBB196alteredBB

originalBB196:                                    ; preds = %land.lhs.true42, %originalBB196alteredBB
  %462 = load ptr, ptr %inputs.addr, align 8
  %phase43 = getelementptr inbounds %struct.ControllerInputs, ptr %462, i32 0, i32 4
  %463 = load i32, ptr %phase43, align 4
  %tobool44 = icmp ne i32 %463, 0
  %464 = load i32, ptr @x, align 4
  %465 = load i32, ptr @y, align 4
  %466 = sub i32 %464, 1
  %467 = mul i32 %464, %466
  %468 = urem i32 %467, 2
  %469 = icmp eq i32 %468, 0
  %470 = icmp slt i32 %465, 10
  %471 = or i1 %469, %470
  br i1 %471, label %originalBBpart2198, label %originalBB196alteredBB

originalBBpart2198:                               ; preds = %originalBB196
  br i1 %tobool44, label %if.then45, label %if.else46

if.then45:                                        ; preds = %originalBBpart2198
  %472 = load i32, ptr @x, align 4
  %473 = load i32, ptr @y, align 4
  %474 = sub i32 %472, 1
  %475 = mul i32 %472, %474
  %476 = urem i32 %475, 2
  %477 = icmp eq i32 %476, 0
  %478 = icmp slt i32 %473, 10
  %479 = or i1 %477, %478
  br i1 %479, label %originalBB200, label %originalBB200alteredBB

originalBB200:                                    ; preds = %if.then45, %originalBB200alteredBB
  %480 = load ptr, ptr %outputs.addr, align 8
  %phaseB = getelementptr inbounds %struct.ControllerOutputs, ptr %480, i32 0, i32 6
  store i32 1, ptr %phaseB, align 4
  %481 = load i32, ptr @x, align 4
  %482 = load i32, ptr @y, align 4
  %483 = sub i32 %481, 1
  %484 = mul i32 %481, %483
  %485 = urem i32 %484, 2
  %486 = icmp eq i32 %485, 0
  %487 = icmp slt i32 %482, 10
  %488 = or i1 %486, %487
  br i1 %488, label %originalBBpart2202, label %originalBB200alteredBB

originalBBpart2202:                               ; preds = %originalBB200
  br label %if.end48

if.else46:                                        ; preds = %originalBBpart2198, %originalBBpart2194
  %489 = load i32, ptr @x, align 4
  %490 = load i32, ptr @y, align 4
  %491 = sub i32 %489, 1
  %492 = mul i32 %489, %491
  %493 = urem i32 %492, 2
  %494 = icmp eq i32 %493, 0
  %495 = icmp slt i32 %490, 10
  %496 = or i1 %494, %495
  br i1 %496, label %originalBB204, label %originalBB204alteredBB

originalBB204:                                    ; preds = %if.else46, %originalBB204alteredBB
  %497 = load ptr, ptr %outputs.addr, align 8
  %phaseB47 = getelementptr inbounds %struct.ControllerOutputs, ptr %497, i32 0, i32 6
  store i32 0, ptr %phaseB47, align 4
  %498 = load i32, ptr @x, align 4
  %499 = load i32, ptr @y, align 4
  %500 = sub i32 %498, 1
  %501 = mul i32 %498, %500
  %502 = urem i32 %501, 2
  %503 = icmp eq i32 %502, 0
  %504 = icmp slt i32 %499, 10
  %505 = or i1 %503, %504
  br i1 %505, label %originalBBpart2206, label %originalBB204alteredBB

originalBBpart2206:                               ; preds = %originalBB204
  br label %if.end48

if.end48:                                         ; preds = %originalBBpart2206, %originalBBpart2202
  %506 = load i32, ptr @x, align 4
  %507 = load i32, ptr @y, align 4
  %508 = sub i32 %506, 1
  %509 = mul i32 %506, %508
  %510 = urem i32 %509, 2
  %511 = icmp eq i32 %510, 0
  %512 = icmp slt i32 %507, 10
  %513 = or i1 %511, %512
  br i1 %513, label %originalBB208, label %originalBB208alteredBB

originalBB208:                                    ; preds = %if.end48, %originalBB208alteredBB
  %514 = load ptr, ptr %inputs.addr, align 8
  %returnOccupied = getelementptr inbounds %struct.ControllerInputs, ptr %514, i32 0, i32 5
  %515 = load i32, ptr %returnOccupied, align 4
  %tobool49 = icmp ne i32 %515, 0
  %516 = load i32, ptr @x, align 4
  %517 = load i32, ptr @y, align 4
  %518 = sub i32 %516, 1
  %519 = mul i32 %516, %518
  %520 = urem i32 %519, 2
  %521 = icmp eq i32 %520, 0
  %522 = icmp slt i32 %517, 10
  %523 = or i1 %521, %522
  br i1 %523, label %originalBBpart2210, label %originalBB208alteredBB

originalBBpart2210:                               ; preds = %originalBB208
  br i1 %tobool49, label %if.then50, label %if.else51

if.then50:                                        ; preds = %originalBBpart2210
  %524 = load i32, ptr @x, align 4
  %525 = load i32, ptr @y, align 4
  %526 = sub i32 %524, 1
  %527 = mul i32 %524, %526
  %528 = urem i32 %527, 2
  %529 = icmp eq i32 %528, 0
  %530 = icmp slt i32 %525, 10
  %531 = or i1 %529, %530
  br i1 %531, label %originalBB212, label %originalBB212alteredBB

originalBB212:                                    ; preds = %if.then50, %originalBB212alteredBB
  %532 = load ptr, ptr %outputs.addr, align 8
  %returnBridge = getelementptr inbounds %struct.ControllerOutputs, ptr %532, i32 0, i32 7
  store i32 1, ptr %returnBridge, align 4
  %533 = load i32, ptr @x, align 4
  %534 = load i32, ptr @y, align 4
  %535 = sub i32 %533, 1
  %536 = mul i32 %533, %535
  %537 = urem i32 %536, 2
  %538 = icmp eq i32 %537, 0
  %539 = icmp slt i32 %534, 10
  %540 = or i1 %538, %539
  br i1 %540, label %originalBBpart2214, label %originalBB212alteredBB

originalBBpart2214:                               ; preds = %originalBB212
  br label %if.end53

if.else51:                                        ; preds = %originalBBpart2210
  %541 = load i32, ptr @x, align 4
  %542 = load i32, ptr @y, align 4
  %543 = sub i32 %541, 1
  %544 = mul i32 %541, %543
  %545 = urem i32 %544, 2
  %546 = icmp eq i32 %545, 0
  %547 = icmp slt i32 %542, 10
  %548 = or i1 %546, %547
  br i1 %548, label %originalBB216, label %originalBB216alteredBB

originalBB216:                                    ; preds = %if.else51, %originalBB216alteredBB
  %549 = load ptr, ptr %outputs.addr, align 8
  %returnBridge52 = getelementptr inbounds %struct.ControllerOutputs, ptr %549, i32 0, i32 7
  store i32 0, ptr %returnBridge52, align 4
  %550 = load i32, ptr @x, align 4
  %551 = load i32, ptr @y, align 4
  %552 = sub i32 %550, 1
  %553 = mul i32 %550, %552
  %554 = urem i32 %553, 2
  %555 = icmp eq i32 %554, 0
  %556 = icmp slt i32 %551, 10
  %557 = or i1 %555, %556
  br i1 %557, label %originalBBpart2218, label %originalBB216alteredBB

originalBBpart2218:                               ; preds = %originalBB216
  br label %if.end53

if.end53:                                         ; preds = %originalBBpart2218, %originalBBpart2214
  %558 = load i32, ptr @x, align 4
  %559 = load i32, ptr @y, align 4
  %560 = sub i32 %558, 1
  %561 = mul i32 %558, %560
  %562 = urem i32 %561, 2
  %563 = icmp eq i32 %562, 0
  %564 = icmp slt i32 %559, 10
  %565 = or i1 %563, %564
  br i1 %565, label %originalBB220, label %originalBB220alteredBB

originalBB220:                                    ; preds = %if.end53, %originalBB220alteredBB
  %566 = load ptr, ptr %inputs.addr, align 8
  %exitUnlocked = getelementptr inbounds %struct.ControllerInputs, ptr %566, i32 0, i32 7
  %567 = load i32, ptr %exitUnlocked, align 4
  %tobool54 = icmp ne i32 %567, 0
  %568 = load i32, ptr @x, align 4
  %569 = load i32, ptr @y, align 4
  %570 = sub i32 %568, 1
  %571 = mul i32 %568, %570
  %572 = urem i32 %571, 2
  %573 = icmp eq i32 %572, 0
  %574 = icmp slt i32 %569, 10
  %575 = or i1 %573, %574
  br i1 %575, label %originalBBpart2222, label %originalBB220alteredBB

originalBBpart2222:                               ; preds = %originalBB220
  br i1 %tobool54, label %if.then55, label %if.else56

if.then55:                                        ; preds = %originalBBpart2222
  %576 = load i32, ptr @x, align 4
  %577 = load i32, ptr @y, align 4
  %578 = sub i32 %576, 1
  %579 = mul i32 %576, %578
  %580 = urem i32 %579, 2
  %581 = icmp eq i32 %580, 0
  %582 = icmp slt i32 %577, 10
  %583 = or i1 %581, %582
  br i1 %583, label %originalBB224, label %originalBB224alteredBB

originalBB224:                                    ; preds = %if.then55, %originalBB224alteredBB
  %584 = load ptr, ptr %outputs.addr, align 8
  %exitDoor = getelementptr inbounds %struct.ControllerOutputs, ptr %584, i32 0, i32 8
  store i32 1, ptr %exitDoor, align 4
  %585 = load i32, ptr @x, align 4
  %586 = load i32, ptr @y, align 4
  %587 = sub i32 %585, 1
  %588 = mul i32 %585, %587
  %589 = urem i32 %588, 2
  %590 = icmp eq i32 %589, 0
  %591 = icmp slt i32 %586, 10
  %592 = or i1 %590, %591
  br i1 %592, label %originalBBpart2226, label %originalBB224alteredBB

originalBBpart2226:                               ; preds = %originalBB224
  br label %if.end58

if.else56:                                        ; preds = %originalBBpart2222
  %593 = load i32, ptr @x, align 4
  %594 = load i32, ptr @y, align 4
  %595 = sub i32 %593, 1
  %596 = mul i32 %593, %595
  %597 = urem i32 %596, 2
  %598 = icmp eq i32 %597, 0
  %599 = icmp slt i32 %594, 10
  %600 = or i1 %598, %599
  br i1 %600, label %originalBB228, label %originalBB228alteredBB

originalBB228:                                    ; preds = %if.else56, %originalBB228alteredBB
  %601 = load ptr, ptr %outputs.addr, align 8
  %exitDoor57 = getelementptr inbounds %struct.ControllerOutputs, ptr %601, i32 0, i32 8
  store i32 0, ptr %exitDoor57, align 4
  %602 = load i32, ptr @x, align 4
  %603 = load i32, ptr @y, align 4
  %604 = sub i32 %602, 1
  %605 = mul i32 %602, %604
  %606 = urem i32 %605, 2
  %607 = icmp eq i32 %606, 0
  %608 = icmp slt i32 %603, 10
  %609 = or i1 %607, %608
  br i1 %609, label %originalBBpart2230, label %originalBB228alteredBB

originalBBpart2230:                               ; preds = %originalBB228
  br label %if.end58

if.end58:                                         ; preds = %originalBBpart2230, %originalBBpart2226
  %610 = load i32, ptr @x, align 4
  %611 = load i32, ptr @y, align 4
  %612 = sub i32 %610, 1
  %613 = mul i32 %610, %612
  %614 = urem i32 %613, 2
  %615 = icmp eq i32 %614, 0
  %616 = icmp slt i32 %611, 10
  %617 = or i1 %615, %616
  br i1 %617, label %originalBB232, label %originalBB232alteredBB

originalBB232:                                    ; preds = %if.end58, %originalBB232alteredBB
  %618 = load ptr, ptr %outputs.addr, align 8
  %phaseA59 = getelementptr inbounds %struct.ControllerOutputs, ptr %618, i32 0, i32 5
  %619 = load i32, ptr %phaseA59, align 4
  %tobool60 = icmp ne i32 %619, 0
  %620 = load i32, ptr @x, align 4
  %621 = load i32, ptr @y, align 4
  %622 = sub i32 %620, 1
  %623 = mul i32 %620, %622
  %624 = urem i32 %623, 2
  %625 = icmp eq i32 %624, 0
  %626 = icmp slt i32 %621, 10
  %627 = or i1 %625, %626
  br i1 %627, label %originalBBpart2234, label %originalBB232alteredBB

originalBBpart2234:                               ; preds = %originalBB232
  br i1 %tobool60, label %if.then65, label %lor.lhs.false61

lor.lhs.false61:                                  ; preds = %originalBBpart2234
  %628 = load i32, ptr @x, align 4
  %629 = load i32, ptr @y, align 4
  %630 = sub i32 %628, 1
  %631 = mul i32 %628, %630
  %632 = urem i32 %631, 2
  %633 = icmp eq i32 %632, 0
  %634 = icmp slt i32 %629, 10
  %635 = or i1 %633, %634
  br i1 %635, label %originalBB236, label %originalBB236alteredBB

originalBB236:                                    ; preds = %lor.lhs.false61, %originalBB236alteredBB
  %636 = load ptr, ptr %inputs.addr, align 8
  %phaseGraceActive = getelementptr inbounds %struct.ControllerInputs, ptr %636, i32 0, i32 8
  %637 = load i32, ptr %phaseGraceActive, align 4
  %tobool62 = icmp ne i32 %637, 0
  %638 = load i32, ptr @x, align 4
  %639 = load i32, ptr @y, align 4
  %640 = sub i32 %638, 1
  %641 = mul i32 %638, %640
  %642 = urem i32 %641, 2
  %643 = icmp eq i32 %642, 0
  %644 = icmp slt i32 %639, 10
  %645 = or i1 %643, %644
  br i1 %645, label %originalBBpart2238, label %originalBB236alteredBB

originalBBpart2238:                               ; preds = %originalBB236
  br i1 %tobool62, label %land.lhs.true63, label %if.else66

land.lhs.true63:                                  ; preds = %originalBBpart2238
  %646 = load i32, ptr @x, align 4
  %647 = load i32, ptr @y, align 4
  %648 = sub i32 %646, 1
  %649 = mul i32 %646, %648
  %650 = urem i32 %649, 2
  %651 = icmp eq i32 %650, 0
  %652 = icmp slt i32 %647, 10
  %653 = or i1 %651, %652
  br i1 %653, label %originalBB240, label %originalBB240alteredBB

originalBB240:                                    ; preds = %land.lhs.true63, %originalBB240alteredBB
  %654 = load i32, ptr %master, align 4
  %tobool64 = icmp ne i32 %654, 0
  %655 = load i32, ptr @x, align 4
  %656 = load i32, ptr @y, align 4
  %657 = sub i32 %655, 1
  %658 = mul i32 %655, %657
  %659 = urem i32 %658, 2
  %660 = icmp eq i32 %659, 0
  %661 = icmp slt i32 %656, 10
  %662 = or i1 %660, %661
  br i1 %662, label %originalBBpart2242, label %originalBB240alteredBB

originalBBpart2242:                               ; preds = %originalBB240
  br i1 %tobool64, label %if.then65, label %if.else66

if.then65:                                        ; preds = %originalBBpart2242, %originalBBpart2234
  %663 = load i32, ptr @x, align 4
  %664 = load i32, ptr @y, align 4
  %665 = sub i32 %663, 1
  %666 = mul i32 %663, %665
  %667 = urem i32 %666, 2
  %668 = icmp eq i32 %667, 0
  %669 = icmp slt i32 %664, 10
  %670 = or i1 %668, %669
  br i1 %670, label %originalBB244, label %originalBB244alteredBB

originalBB244:                                    ; preds = %if.then65, %originalBB244alteredBB
  %671 = load ptr, ptr %outputs.addr, align 8
  %physicalPhaseA = getelementptr inbounds %struct.ControllerOutputs, ptr %671, i32 0, i32 9
  store i32 1, ptr %physicalPhaseA, align 4
  %672 = load i32, ptr @x, align 4
  %673 = load i32, ptr @y, align 4
  %674 = sub i32 %672, 1
  %675 = mul i32 %672, %674
  %676 = urem i32 %675, 2
  %677 = icmp eq i32 %676, 0
  %678 = icmp slt i32 %673, 10
  %679 = or i1 %677, %678
  br i1 %679, label %originalBBpart2246, label %originalBB244alteredBB

originalBBpart2246:                               ; preds = %originalBB244
  br label %if.end68

if.else66:                                        ; preds = %originalBBpart2242, %originalBBpart2238
  %680 = load i32, ptr @x, align 4
  %681 = load i32, ptr @y, align 4
  %682 = sub i32 %680, 1
  %683 = mul i32 %680, %682
  %684 = urem i32 %683, 2
  %685 = icmp eq i32 %684, 0
  %686 = icmp slt i32 %681, 10
  %687 = or i1 %685, %686
  br i1 %687, label %originalBB248, label %originalBB248alteredBB

originalBB248:                                    ; preds = %if.else66, %originalBB248alteredBB
  %688 = load ptr, ptr %outputs.addr, align 8
  %physicalPhaseA67 = getelementptr inbounds %struct.ControllerOutputs, ptr %688, i32 0, i32 9
  store i32 0, ptr %physicalPhaseA67, align 4
  %689 = load i32, ptr @x, align 4
  %690 = load i32, ptr @y, align 4
  %691 = sub i32 %689, 1
  %692 = mul i32 %689, %691
  %693 = urem i32 %692, 2
  %694 = icmp eq i32 %693, 0
  %695 = icmp slt i32 %690, 10
  %696 = or i1 %694, %695
  br i1 %696, label %originalBBpart2250, label %originalBB248alteredBB

originalBBpart2250:                               ; preds = %originalBB248
  br label %if.end68

if.end68:                                         ; preds = %originalBBpart2250, %originalBBpart2246
  %697 = load i32, ptr @x, align 4
  %698 = load i32, ptr @y, align 4
  %699 = sub i32 %697, 1
  %700 = mul i32 %697, %699
  %701 = urem i32 %700, 2
  %702 = icmp eq i32 %701, 0
  %703 = icmp slt i32 %698, 10
  %704 = or i1 %702, %703
  br i1 %704, label %originalBB252, label %originalBB252alteredBB

originalBB252:                                    ; preds = %if.end68, %originalBB252alteredBB
  %705 = load ptr, ptr %outputs.addr, align 8
  %phaseB69 = getelementptr inbounds %struct.ControllerOutputs, ptr %705, i32 0, i32 6
  %706 = load i32, ptr %phaseB69, align 4
  %tobool70 = icmp ne i32 %706, 0
  %707 = load i32, ptr @x, align 4
  %708 = load i32, ptr @y, align 4
  %709 = sub i32 %707, 1
  %710 = mul i32 %707, %709
  %711 = urem i32 %710, 2
  %712 = icmp eq i32 %711, 0
  %713 = icmp slt i32 %708, 10
  %714 = or i1 %712, %713
  br i1 %714, label %originalBBpart2254, label %originalBB252alteredBB

originalBBpart2254:                               ; preds = %originalBB252
  br i1 %tobool70, label %if.then76, label %lor.lhs.false71

lor.lhs.false71:                                  ; preds = %originalBBpart2254
  %715 = load i32, ptr @x, align 4
  %716 = load i32, ptr @y, align 4
  %717 = sub i32 %715, 1
  %718 = mul i32 %715, %717
  %719 = urem i32 %718, 2
  %720 = icmp eq i32 %719, 0
  %721 = icmp slt i32 %716, 10
  %722 = or i1 %720, %721
  br i1 %722, label %originalBB256, label %originalBB256alteredBB

originalBB256:                                    ; preds = %lor.lhs.false71, %originalBB256alteredBB
  %723 = load ptr, ptr %inputs.addr, align 8
  %phaseGraceActive72 = getelementptr inbounds %struct.ControllerInputs, ptr %723, i32 0, i32 8
  %724 = load i32, ptr %phaseGraceActive72, align 4
  %tobool73 = icmp ne i32 %724, 0
  %725 = load i32, ptr @x, align 4
  %726 = load i32, ptr @y, align 4
  %727 = sub i32 %725, 1
  %728 = mul i32 %725, %727
  %729 = urem i32 %728, 2
  %730 = icmp eq i32 %729, 0
  %731 = icmp slt i32 %726, 10
  %732 = or i1 %730, %731
  br i1 %732, label %originalBBpart2258, label %originalBB256alteredBB

originalBBpart2258:                               ; preds = %originalBB256
  br i1 %tobool73, label %land.lhs.true74, label %if.else77

land.lhs.true74:                                  ; preds = %originalBBpart2258
  %733 = load i32, ptr @x, align 4
  %734 = load i32, ptr @y, align 4
  %735 = sub i32 %733, 1
  %736 = mul i32 %733, %735
  %737 = urem i32 %736, 2
  %738 = icmp eq i32 %737, 0
  %739 = icmp slt i32 %734, 10
  %740 = or i1 %738, %739
  br i1 %740, label %originalBB260, label %originalBB260alteredBB

originalBB260:                                    ; preds = %land.lhs.true74, %originalBB260alteredBB
  %741 = load i32, ptr %master, align 4
  %tobool75 = icmp ne i32 %741, 0
  %742 = load i32, ptr @x, align 4
  %743 = load i32, ptr @y, align 4
  %744 = sub i32 %742, 1
  %745 = mul i32 %742, %744
  %746 = urem i32 %745, 2
  %747 = icmp eq i32 %746, 0
  %748 = icmp slt i32 %743, 10
  %749 = or i1 %747, %748
  br i1 %749, label %originalBBpart2262, label %originalBB260alteredBB

originalBBpart2262:                               ; preds = %originalBB260
  br i1 %tobool75, label %if.then76, label %if.else77

if.then76:                                        ; preds = %originalBBpart2262, %originalBBpart2254
  %750 = load i32, ptr @x, align 4
  %751 = load i32, ptr @y, align 4
  %752 = sub i32 %750, 1
  %753 = mul i32 %750, %752
  %754 = urem i32 %753, 2
  %755 = icmp eq i32 %754, 0
  %756 = icmp slt i32 %751, 10
  %757 = or i1 %755, %756
  br i1 %757, label %originalBB264, label %originalBB264alteredBB

originalBB264:                                    ; preds = %if.then76, %originalBB264alteredBB
  %758 = load ptr, ptr %outputs.addr, align 8
  %physicalPhaseB = getelementptr inbounds %struct.ControllerOutputs, ptr %758, i32 0, i32 10
  store i32 1, ptr %physicalPhaseB, align 4
  %759 = load i32, ptr @x, align 4
  %760 = load i32, ptr @y, align 4
  %761 = sub i32 %759, 1
  %762 = mul i32 %759, %761
  %763 = urem i32 %762, 2
  %764 = icmp eq i32 %763, 0
  %765 = icmp slt i32 %760, 10
  %766 = or i1 %764, %765
  br i1 %766, label %originalBBpart2266, label %originalBB264alteredBB

originalBBpart2266:                               ; preds = %originalBB264
  br label %if.end79

if.else77:                                        ; preds = %originalBBpart2262, %originalBBpart2258
  %767 = load i32, ptr @x, align 4
  %768 = load i32, ptr @y, align 4
  %769 = sub i32 %767, 1
  %770 = mul i32 %767, %769
  %771 = urem i32 %770, 2
  %772 = icmp eq i32 %771, 0
  %773 = icmp slt i32 %768, 10
  %774 = or i1 %772, %773
  br i1 %774, label %originalBB268, label %originalBB268alteredBB

originalBB268:                                    ; preds = %if.else77, %originalBB268alteredBB
  %775 = load ptr, ptr %outputs.addr, align 8
  %physicalPhaseB78 = getelementptr inbounds %struct.ControllerOutputs, ptr %775, i32 0, i32 10
  store i32 0, ptr %physicalPhaseB78, align 4
  %776 = load i32, ptr @x, align 4
  %777 = load i32, ptr @y, align 4
  %778 = sub i32 %776, 1
  %779 = mul i32 %776, %778
  %780 = urem i32 %779, 2
  %781 = icmp eq i32 %780, 0
  %782 = icmp slt i32 %777, 10
  %783 = or i1 %781, %782
  br i1 %783, label %originalBBpart2270, label %originalBB268alteredBB

originalBBpart2270:                               ; preds = %originalBB268
  br label %if.end79

if.end79:                                         ; preds = %originalBBpart2270, %originalBBpart2266
  %784 = load i32, ptr @x, align 4
  %785 = load i32, ptr @y, align 4
  %786 = sub i32 %784, 1
  %787 = mul i32 %784, %786
  %788 = urem i32 %787, 2
  %789 = icmp eq i32 %788, 0
  %790 = icmp slt i32 %785, 10
  %791 = or i1 %789, %790
  br i1 %791, label %originalBB272, label %originalBB272alteredBB

originalBB272:                                    ; preds = %if.end79, %originalBB272alteredBB
  %792 = load ptr, ptr %outputs.addr, align 8
  %returnBridge80 = getelementptr inbounds %struct.ControllerOutputs, ptr %792, i32 0, i32 7
  %793 = load i32, ptr %returnBridge80, align 4
  %tobool81 = icmp ne i32 %793, 0
  %794 = load i32, ptr @x, align 4
  %795 = load i32, ptr @y, align 4
  %796 = sub i32 %794, 1
  %797 = mul i32 %794, %796
  %798 = urem i32 %797, 2
  %799 = icmp eq i32 %798, 0
  %800 = icmp slt i32 %795, 10
  %801 = or i1 %799, %800
  br i1 %801, label %originalBBpart2274, label %originalBB272alteredBB

originalBBpart2274:                               ; preds = %originalBB272
  br i1 %tobool81, label %if.then84, label %lor.lhs.false82

lor.lhs.false82:                                  ; preds = %originalBBpart2274
  %802 = load i32, ptr @x, align 4
  %803 = load i32, ptr @y, align 4
  %804 = sub i32 %802, 1
  %805 = mul i32 %802, %804
  %806 = urem i32 %805, 2
  %807 = icmp eq i32 %806, 0
  %808 = icmp slt i32 %803, 10
  %809 = or i1 %807, %808
  br i1 %809, label %originalBB276, label %originalBB276alteredBB

originalBB276:                                    ; preds = %lor.lhs.false82, %originalBB276alteredBB
  %810 = load ptr, ptr %inputs.addr, align 8
  %returnGraceActive = getelementptr inbounds %struct.ControllerInputs, ptr %810, i32 0, i32 9
  %811 = load i32, ptr %returnGraceActive, align 4
  %tobool83 = icmp ne i32 %811, 0
  %812 = load i32, ptr @x, align 4
  %813 = load i32, ptr @y, align 4
  %814 = sub i32 %812, 1
  %815 = mul i32 %812, %814
  %816 = urem i32 %815, 2
  %817 = icmp eq i32 %816, 0
  %818 = icmp slt i32 %813, 10
  %819 = or i1 %817, %818
  br i1 %819, label %originalBBpart2278, label %originalBB276alteredBB

originalBBpart2278:                               ; preds = %originalBB276
  br i1 %tobool83, label %if.then84, label %if.else85

if.then84:                                        ; preds = %originalBBpart2278, %originalBBpart2274
  %820 = load i32, ptr @x, align 4
  %821 = load i32, ptr @y, align 4
  %822 = sub i32 %820, 1
  %823 = mul i32 %820, %822
  %824 = urem i32 %823, 2
  %825 = icmp eq i32 %824, 0
  %826 = icmp slt i32 %821, 10
  %827 = or i1 %825, %826
  br i1 %827, label %originalBB280, label %originalBB280alteredBB

originalBB280:                                    ; preds = %if.then84, %originalBB280alteredBB
  %828 = load ptr, ptr %outputs.addr, align 8
  %physicalReturnBridge = getelementptr inbounds %struct.ControllerOutputs, ptr %828, i32 0, i32 11
  store i32 1, ptr %physicalReturnBridge, align 4
  %829 = load i32, ptr @x, align 4
  %830 = load i32, ptr @y, align 4
  %831 = sub i32 %829, 1
  %832 = mul i32 %829, %831
  %833 = urem i32 %832, 2
  %834 = icmp eq i32 %833, 0
  %835 = icmp slt i32 %830, 10
  %836 = or i1 %834, %835
  br i1 %836, label %originalBBpart2282, label %originalBB280alteredBB

originalBBpart2282:                               ; preds = %originalBB280
  br label %if.end87

if.else85:                                        ; preds = %originalBBpart2278
  %837 = load i32, ptr @x, align 4
  %838 = load i32, ptr @y, align 4
  %839 = sub i32 %837, 1
  %840 = mul i32 %837, %839
  %841 = urem i32 %840, 2
  %842 = icmp eq i32 %841, 0
  %843 = icmp slt i32 %838, 10
  %844 = or i1 %842, %843
  br i1 %844, label %originalBB284, label %originalBB284alteredBB

originalBB284:                                    ; preds = %if.else85, %originalBB284alteredBB
  %845 = load ptr, ptr %outputs.addr, align 8
  %physicalReturnBridge86 = getelementptr inbounds %struct.ControllerOutputs, ptr %845, i32 0, i32 11
  store i32 0, ptr %physicalReturnBridge86, align 4
  %846 = load i32, ptr @x, align 4
  %847 = load i32, ptr @y, align 4
  %848 = sub i32 %846, 1
  %849 = mul i32 %846, %848
  %850 = urem i32 %849, 2
  %851 = icmp eq i32 %850, 0
  %852 = icmp slt i32 %847, 10
  %853 = or i1 %851, %852
  br i1 %853, label %originalBBpart2286, label %originalBB284alteredBB

originalBBpart2286:                               ; preds = %originalBB284
  br label %if.end87

if.end87:                                         ; preds = %originalBBpart2286, %originalBBpart2282
  %854 = load i32, ptr @x, align 4
  %855 = load i32, ptr @y, align 4
  %856 = sub i32 %854, 1
  %857 = mul i32 %854, %856
  %858 = urem i32 %857, 2
  %859 = icmp eq i32 %858, 0
  %860 = icmp slt i32 %855, 10
  %861 = or i1 %859, %860
  br i1 %861, label %originalBB288, label %originalBB288alteredBB

originalBB288:                                    ; preds = %if.end87, %originalBB288alteredBB
  %862 = load ptr, ptr %inputs.addr, align 8
  %finalControl = getelementptr inbounds %struct.ControllerInputs, ptr %862, i32 0, i32 6
  %863 = load i32, ptr %finalControl, align 4
  %tobool88 = icmp ne i32 %863, 0
  %864 = load i32, ptr @x, align 4
  %865 = load i32, ptr @y, align 4
  %866 = sub i32 %864, 1
  %867 = mul i32 %864, %866
  %868 = urem i32 %867, 2
  %869 = icmp eq i32 %868, 0
  %870 = icmp slt i32 %865, 10
  %871 = or i1 %869, %870
  br i1 %871, label %originalBBpart2290, label %originalBB288alteredBB

originalBBpart2290:                               ; preds = %originalBB288
  br i1 %tobool88, label %land.lhs.true89, label %if.else93

land.lhs.true89:                                  ; preds = %originalBBpart2290
  %872 = load i32, ptr @x, align 4
  %873 = load i32, ptr @y, align 4
  %874 = sub i32 %872, 1
  %875 = mul i32 %872, %874
  %876 = urem i32 %875, 2
  %877 = icmp eq i32 %876, 0
  %878 = icmp slt i32 %873, 10
  %879 = or i1 %877, %878
  br i1 %879, label %originalBB292, label %originalBB292alteredBB

originalBB292:                                    ; preds = %land.lhs.true89, %originalBB292alteredBB
  %880 = load ptr, ptr %inputs.addr, align 8
  %payloadDelivered90 = getelementptr inbounds %struct.ControllerInputs, ptr %880, i32 0, i32 2
  %881 = load i32, ptr %payloadDelivered90, align 4
  %tobool91 = icmp ne i32 %881, 0
  %882 = load i32, ptr @x, align 4
  %883 = load i32, ptr @y, align 4
  %884 = sub i32 %882, 1
  %885 = mul i32 %882, %884
  %886 = urem i32 %885, 2
  %887 = icmp eq i32 %886, 0
  %888 = icmp slt i32 %883, 10
  %889 = or i1 %887, %888
  br i1 %889, label %originalBBpart2294, label %originalBB292alteredBB

originalBBpart2294:                               ; preds = %originalBB292
  br i1 %tobool91, label %if.then92, label %if.else93

if.then92:                                        ; preds = %originalBBpart2294
  %890 = load i32, ptr @x, align 4
  %891 = load i32, ptr @y, align 4
  %892 = sub i32 %890, 1
  %893 = mul i32 %890, %892
  %894 = urem i32 %893, 2
  %895 = icmp eq i32 %894, 0
  %896 = icmp slt i32 %891, 10
  %897 = or i1 %895, %896
  br i1 %897, label %originalBB296, label %originalBB296alteredBB

originalBB296:                                    ; preds = %if.then92, %originalBB296alteredBB
  %898 = load ptr, ptr %outputs.addr, align 8
  %exitUnlockCandidate = getelementptr inbounds %struct.ControllerOutputs, ptr %898, i32 0, i32 12
  store i32 1, ptr %exitUnlockCandidate, align 4
  %899 = load i32, ptr @x, align 4
  %900 = load i32, ptr @y, align 4
  %901 = sub i32 %899, 1
  %902 = mul i32 %899, %901
  %903 = urem i32 %902, 2
  %904 = icmp eq i32 %903, 0
  %905 = icmp slt i32 %900, 10
  %906 = or i1 %904, %905
  br i1 %906, label %originalBBpart2298, label %originalBB296alteredBB

originalBBpart2298:                               ; preds = %originalBB296
  br label %if.end95

if.else93:                                        ; preds = %originalBBpart2294, %originalBBpart2290
  %907 = load i32, ptr @x, align 4
  %908 = load i32, ptr @y, align 4
  %909 = sub i32 %907, 1
  %910 = mul i32 %907, %909
  %911 = urem i32 %910, 2
  %912 = icmp eq i32 %911, 0
  %913 = icmp slt i32 %908, 10
  %914 = or i1 %912, %913
  br i1 %914, label %originalBB300, label %originalBB300alteredBB

originalBB300:                                    ; preds = %if.else93, %originalBB300alteredBB
  %915 = load ptr, ptr %outputs.addr, align 8
  %exitUnlockCandidate94 = getelementptr inbounds %struct.ControllerOutputs, ptr %915, i32 0, i32 12
  store i32 0, ptr %exitUnlockCandidate94, align 4
  %916 = load i32, ptr @x, align 4
  %917 = load i32, ptr @y, align 4
  %918 = sub i32 %916, 1
  %919 = mul i32 %916, %918
  %920 = urem i32 %919, 2
  %921 = icmp eq i32 %920, 0
  %922 = icmp slt i32 %917, 10
  %923 = or i1 %921, %922
  br i1 %923, label %originalBBpart2302, label %originalBB300alteredBB

originalBBpart2302:                               ; preds = %originalBB300
  br label %if.end95

if.end95:                                         ; preds = %originalBBpart2302, %originalBBpart2298
  %924 = load i32, ptr @x, align 4
  %925 = load i32, ptr @y, align 4
  %926 = sub i32 %924, 1
  %927 = mul i32 %924, %926
  %928 = urem i32 %927, 2
  %929 = icmp eq i32 %928, 0
  %930 = icmp slt i32 %925, 10
  %931 = or i1 %929, %930
  br i1 %931, label %originalBB304, label %originalBB304alteredBB

originalBB304:                                    ; preds = %if.end95, %originalBB304alteredBB
  %932 = load i32, ptr @x, align 4
  %933 = load i32, ptr @y, align 4
  %934 = sub i32 %932, 1
  %935 = mul i32 %932, %934
  %936 = urem i32 %935, 2
  %937 = icmp eq i32 %936, 0
  %938 = icmp slt i32 %933, 10
  %939 = or i1 %937, %938
  br i1 %939, label %originalBBpart2306, label %originalBB304alteredBB

originalBBpart2306:                               ; preds = %originalBB304
  ret void

originalBBalteredBB:                              ; preds = %originalBB, %entry
  %outputs.addralteredBB = alloca ptr, align 8
  %inputs.addralteredBB = alloca ptr, align 8
  %masteralteredBB = alloca i32, align 4
  store ptr %outputs, ptr %outputs.addralteredBB, align 8
  store ptr %inputs, ptr %inputs.addralteredBB, align 8
  %940 = load ptr, ptr %inputs.addralteredBB, align 8
  %payloadDeliveredalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %940, i32 0, i32 2
  %941 = load i32, ptr %payloadDeliveredalteredBB, align 4
  %toboolalteredBB = icmp ne i32 %941, 0
  br label %originalBB

originalBB96alteredBB:                            ; preds = %originalBB96, %land.rhs
  %942 = load ptr, ptr %inputs.addr, align 8
  %traceOccupiedalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %942, i32 0, i32 3
  %943 = load i32, ptr %traceOccupiedalteredBB, align 4
  %tobool1alteredBB = icmp ne i32 %943, 0
  br label %originalBB96

originalBB100alteredBB:                           ; preds = %originalBB100, %land.end
  %land.extalteredBB = zext i1 %36 to i32
  store i32 %land.extalteredBB, ptr %master, align 4
  %944 = load ptr, ptr %inputs.addr, align 8
  %dropAalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %944, i32 0, i32 0
  %945 = load i32, ptr %dropAalteredBB, align 4
  %tobool2alteredBB = icmp ne i32 %945, 0
  br label %originalBB100

originalBB104alteredBB:                           ; preds = %originalBB104, %if.then
  %946 = load ptr, ptr %outputs.addr, align 8
  %topBridgealteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %946, i32 0, i32 0
  store i32 1, ptr %topBridgealteredBB, align 4
  br label %originalBB104

originalBB108alteredBB:                           ; preds = %originalBB108, %if.else
  %947 = load ptr, ptr %outputs.addr, align 8
  %topBridge3alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %947, i32 0, i32 0
  store i32 0, ptr %topBridge3alteredBB, align 4
  br label %originalBB108

originalBB112alteredBB:                           ; preds = %originalBB112, %if.end
  %948 = load ptr, ptr %inputs.addr, align 8
  %dropBalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %948, i32 0, i32 1
  %949 = load i32, ptr %dropBalteredBB, align 4
  %tobool4alteredBB = icmp ne i32 %949, 0
  br label %originalBB112

originalBB116alteredBB:                           ; preds = %originalBB116, %land.lhs.true
  %950 = load ptr, ptr %inputs.addr, align 8
  %bufferPhasealteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %950, i32 0, i32 10
  %951 = load i32, ptr %bufferPhasealteredBB, align 4
  %cmpalteredBB = icmp eq i32 %951, 0
  br label %originalBB116

originalBB120alteredBB:                           ; preds = %originalBB120, %lor.lhs.false
  %952 = load ptr, ptr %inputs.addr, align 8
  %bufferPhase5alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %952, i32 0, i32 10
  %953 = load i32, ptr %bufferPhase5alteredBB, align 4
  %cmp6alteredBB = icmp eq i32 %953, 1
  br label %originalBB120

originalBB124alteredBB:                           ; preds = %originalBB124, %if.then7
  %954 = load ptr, ptr %outputs.addr, align 8
  %bufferBridgealteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %954, i32 0, i32 1
  store i32 1, ptr %bufferBridgealteredBB, align 4
  br label %originalBB124

originalBB128alteredBB:                           ; preds = %originalBB128, %if.else8
  %955 = load ptr, ptr %outputs.addr, align 8
  %bufferBridge9alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %955, i32 0, i32 1
  store i32 0, ptr %bufferBridge9alteredBB, align 4
  br label %originalBB128

originalBB132alteredBB:                           ; preds = %originalBB132, %if.end10
  %956 = load ptr, ptr %inputs.addr, align 8
  %dropB11alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %956, i32 0, i32 1
  %957 = load i32, ptr %dropB11alteredBB, align 4
  %tobool12alteredBB = icmp ne i32 %957, 0
  br label %originalBB132

originalBB136alteredBB:                           ; preds = %originalBB136, %lor.lhs.false13
  %958 = load ptr, ptr %inputs.addr, align 8
  %bufferPhase14alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %958, i32 0, i32 10
  %959 = load i32, ptr %bufferPhase14alteredBB, align 4
  %cmp15alteredBB = icmp eq i32 %959, 3
  br label %originalBB136

originalBB140alteredBB:                           ; preds = %originalBB140, %if.then16
  %960 = load ptr, ptr %outputs.addr, align 8
  %safetyFirewallalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %960, i32 0, i32 2
  store i32 1, ptr %safetyFirewallalteredBB, align 4
  br label %originalBB140

originalBB144alteredBB:                           ; preds = %originalBB144, %if.else17
  %961 = load ptr, ptr %outputs.addr, align 8
  %safetyFirewall18alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %961, i32 0, i32 2
  store i32 0, ptr %safetyFirewall18alteredBB, align 4
  br label %originalBB144

originalBB148alteredBB:                           ; preds = %originalBB148, %if.end19
  %962 = load ptr, ptr %inputs.addr, align 8
  %dropA20alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %962, i32 0, i32 0
  %963 = load i32, ptr %dropA20alteredBB, align 4
  %tobool21alteredBB = icmp ne i32 %963, 0
  br label %originalBB148

originalBB152alteredBB:                           ; preds = %originalBB152, %land.lhs.true22
  %964 = load ptr, ptr %inputs.addr, align 8
  %dropB23alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %964, i32 0, i32 1
  %965 = load i32, ptr %dropB23alteredBB, align 4
  %tobool24alteredBB = icmp ne i32 %965, 0
  br label %originalBB152

originalBB156alteredBB:                           ; preds = %originalBB156, %if.then25
  %966 = load ptr, ptr %outputs.addr, align 8
  %raceFirewallalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %966, i32 0, i32 3
  store i32 1, ptr %raceFirewallalteredBB, align 4
  br label %originalBB156

originalBB160alteredBB:                           ; preds = %originalBB160, %if.else26
  %967 = load ptr, ptr %outputs.addr, align 8
  %raceFirewall27alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %967, i32 0, i32 3
  store i32 0, ptr %raceFirewall27alteredBB, align 4
  br label %originalBB160

originalBB164alteredBB:                           ; preds = %originalBB164, %if.end28
  %968 = load i32, ptr %master, align 4
  %tobool29alteredBB = icmp ne i32 %968, 0
  br label %originalBB164

originalBB168alteredBB:                           ; preds = %originalBB168, %if.then30
  %969 = load ptr, ptr %outputs.addr, align 8
  %spanMasteralteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %969, i32 0, i32 4
  store i32 1, ptr %spanMasteralteredBB, align 4
  br label %originalBB168

originalBB172alteredBB:                           ; preds = %originalBB172, %if.else31
  %970 = load ptr, ptr %outputs.addr, align 8
  %spanMaster32alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %970, i32 0, i32 4
  store i32 0, ptr %spanMaster32alteredBB, align 4
  br label %originalBB172

originalBB176alteredBB:                           ; preds = %originalBB176, %if.end33
  %971 = load i32, ptr %master, align 4
  %tobool34alteredBB = icmp ne i32 %971, 0
  br label %originalBB176

originalBB180alteredBB:                           ; preds = %originalBB180, %land.lhs.true35
  %972 = load ptr, ptr %inputs.addr, align 8
  %phasealteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %972, i32 0, i32 4
  %973 = load i32, ptr %phasealteredBB, align 4
  %tobool36alteredBB = icmp ne i32 %973, 0
  br label %originalBB180

originalBB184alteredBB:                           ; preds = %originalBB184, %if.then37
  %974 = load ptr, ptr %outputs.addr, align 8
  %phaseAalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %974, i32 0, i32 5
  store i32 1, ptr %phaseAalteredBB, align 4
  br label %originalBB184

originalBB188alteredBB:                           ; preds = %originalBB188, %if.else38
  %975 = load ptr, ptr %outputs.addr, align 8
  %phaseA39alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %975, i32 0, i32 5
  store i32 0, ptr %phaseA39alteredBB, align 4
  br label %originalBB188

originalBB192alteredBB:                           ; preds = %originalBB192, %if.end40
  %976 = load i32, ptr %master, align 4
  %tobool41alteredBB = icmp ne i32 %976, 0
  br label %originalBB192

originalBB196alteredBB:                           ; preds = %originalBB196, %land.lhs.true42
  %977 = load ptr, ptr %inputs.addr, align 8
  %phase43alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %977, i32 0, i32 4
  %978 = load i32, ptr %phase43alteredBB, align 4
  %tobool44alteredBB = icmp ne i32 %978, 0
  br label %originalBB196

originalBB200alteredBB:                           ; preds = %originalBB200, %if.then45
  %979 = load ptr, ptr %outputs.addr, align 8
  %phaseBalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %979, i32 0, i32 6
  store i32 1, ptr %phaseBalteredBB, align 4
  br label %originalBB200

originalBB204alteredBB:                           ; preds = %originalBB204, %if.else46
  %980 = load ptr, ptr %outputs.addr, align 8
  %phaseB47alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %980, i32 0, i32 6
  store i32 0, ptr %phaseB47alteredBB, align 4
  br label %originalBB204

originalBB208alteredBB:                           ; preds = %originalBB208, %if.end48
  %981 = load ptr, ptr %inputs.addr, align 8
  %returnOccupiedalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %981, i32 0, i32 5
  %982 = load i32, ptr %returnOccupiedalteredBB, align 4
  %tobool49alteredBB = icmp ne i32 %982, 0
  br label %originalBB208

originalBB212alteredBB:                           ; preds = %originalBB212, %if.then50
  %983 = load ptr, ptr %outputs.addr, align 8
  %returnBridgealteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %983, i32 0, i32 7
  store i32 1, ptr %returnBridgealteredBB, align 4
  br label %originalBB212

originalBB216alteredBB:                           ; preds = %originalBB216, %if.else51
  %984 = load ptr, ptr %outputs.addr, align 8
  %returnBridge52alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %984, i32 0, i32 7
  store i32 0, ptr %returnBridge52alteredBB, align 4
  br label %originalBB216

originalBB220alteredBB:                           ; preds = %originalBB220, %if.end53
  %985 = load ptr, ptr %inputs.addr, align 8
  %exitUnlockedalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %985, i32 0, i32 7
  %986 = load i32, ptr %exitUnlockedalteredBB, align 4
  %tobool54alteredBB = icmp ne i32 %986, 0
  br label %originalBB220

originalBB224alteredBB:                           ; preds = %originalBB224, %if.then55
  %987 = load ptr, ptr %outputs.addr, align 8
  %exitDooralteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %987, i32 0, i32 8
  store i32 1, ptr %exitDooralteredBB, align 4
  br label %originalBB224

originalBB228alteredBB:                           ; preds = %originalBB228, %if.else56
  %988 = load ptr, ptr %outputs.addr, align 8
  %exitDoor57alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %988, i32 0, i32 8
  store i32 0, ptr %exitDoor57alteredBB, align 4
  br label %originalBB228

originalBB232alteredBB:                           ; preds = %originalBB232, %if.end58
  %989 = load ptr, ptr %outputs.addr, align 8
  %phaseA59alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %989, i32 0, i32 5
  %990 = load i32, ptr %phaseA59alteredBB, align 4
  %tobool60alteredBB = icmp ne i32 %990, 0
  br label %originalBB232

originalBB236alteredBB:                           ; preds = %originalBB236, %lor.lhs.false61
  %991 = load ptr, ptr %inputs.addr, align 8
  %phaseGraceActivealteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %991, i32 0, i32 8
  %992 = load i32, ptr %phaseGraceActivealteredBB, align 4
  %tobool62alteredBB = icmp ne i32 %992, 0
  br label %originalBB236

originalBB240alteredBB:                           ; preds = %originalBB240, %land.lhs.true63
  %993 = load i32, ptr %master, align 4
  %tobool64alteredBB = icmp ne i32 %993, 0
  br label %originalBB240

originalBB244alteredBB:                           ; preds = %originalBB244, %if.then65
  %994 = load ptr, ptr %outputs.addr, align 8
  %physicalPhaseAalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %994, i32 0, i32 9
  store i32 1, ptr %physicalPhaseAalteredBB, align 4
  br label %originalBB244

originalBB248alteredBB:                           ; preds = %originalBB248, %if.else66
  %995 = load ptr, ptr %outputs.addr, align 8
  %physicalPhaseA67alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %995, i32 0, i32 9
  store i32 0, ptr %physicalPhaseA67alteredBB, align 4
  br label %originalBB248

originalBB252alteredBB:                           ; preds = %originalBB252, %if.end68
  %996 = load ptr, ptr %outputs.addr, align 8
  %phaseB69alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %996, i32 0, i32 6
  %997 = load i32, ptr %phaseB69alteredBB, align 4
  %tobool70alteredBB = icmp ne i32 %997, 0
  br label %originalBB252

originalBB256alteredBB:                           ; preds = %originalBB256, %lor.lhs.false71
  %998 = load ptr, ptr %inputs.addr, align 8
  %phaseGraceActive72alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %998, i32 0, i32 8
  %999 = load i32, ptr %phaseGraceActive72alteredBB, align 4
  %tobool73alteredBB = icmp ne i32 %999, 0
  br label %originalBB256

originalBB260alteredBB:                           ; preds = %originalBB260, %land.lhs.true74
  %1000 = load i32, ptr %master, align 4
  %tobool75alteredBB = icmp ne i32 %1000, 0
  br label %originalBB260

originalBB264alteredBB:                           ; preds = %originalBB264, %if.then76
  %1001 = load ptr, ptr %outputs.addr, align 8
  %physicalPhaseBalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1001, i32 0, i32 10
  store i32 1, ptr %physicalPhaseBalteredBB, align 4
  br label %originalBB264

originalBB268alteredBB:                           ; preds = %originalBB268, %if.else77
  %1002 = load ptr, ptr %outputs.addr, align 8
  %physicalPhaseB78alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1002, i32 0, i32 10
  store i32 0, ptr %physicalPhaseB78alteredBB, align 4
  br label %originalBB268

originalBB272alteredBB:                           ; preds = %originalBB272, %if.end79
  %1003 = load ptr, ptr %outputs.addr, align 8
  %returnBridge80alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1003, i32 0, i32 7
  %1004 = load i32, ptr %returnBridge80alteredBB, align 4
  %tobool81alteredBB = icmp ne i32 %1004, 0
  br label %originalBB272

originalBB276alteredBB:                           ; preds = %originalBB276, %lor.lhs.false82
  %1005 = load ptr, ptr %inputs.addr, align 8
  %returnGraceActivealteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %1005, i32 0, i32 9
  %1006 = load i32, ptr %returnGraceActivealteredBB, align 4
  %tobool83alteredBB = icmp ne i32 %1006, 0
  br label %originalBB276

originalBB280alteredBB:                           ; preds = %originalBB280, %if.then84
  %1007 = load ptr, ptr %outputs.addr, align 8
  %physicalReturnBridgealteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1007, i32 0, i32 11
  store i32 1, ptr %physicalReturnBridgealteredBB, align 4
  br label %originalBB280

originalBB284alteredBB:                           ; preds = %originalBB284, %if.else85
  %1008 = load ptr, ptr %outputs.addr, align 8
  %physicalReturnBridge86alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1008, i32 0, i32 11
  store i32 0, ptr %physicalReturnBridge86alteredBB, align 4
  br label %originalBB284

originalBB288alteredBB:                           ; preds = %originalBB288, %if.end87
  %1009 = load ptr, ptr %inputs.addr, align 8
  %finalControlalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %1009, i32 0, i32 6
  %1010 = load i32, ptr %finalControlalteredBB, align 4
  %tobool88alteredBB = icmp ne i32 %1010, 0
  br label %originalBB288

originalBB292alteredBB:                           ; preds = %originalBB292, %land.lhs.true89
  %1011 = load ptr, ptr %inputs.addr, align 8
  %payloadDelivered90alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %1011, i32 0, i32 2
  %1012 = load i32, ptr %payloadDelivered90alteredBB, align 4
  %tobool91alteredBB = icmp ne i32 %1012, 0
  br label %originalBB292

originalBB296alteredBB:                           ; preds = %originalBB296, %if.then92
  %1013 = load ptr, ptr %outputs.addr, align 8
  %exitUnlockCandidatealteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1013, i32 0, i32 12
  store i32 1, ptr %exitUnlockCandidatealteredBB, align 4
  br label %originalBB296

originalBB300alteredBB:                           ; preds = %originalBB300, %if.else93
  %1014 = load ptr, ptr %outputs.addr, align 8
  %exitUnlockCandidate94alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1014, i32 0, i32 12
  store i32 0, ptr %exitUnlockCandidate94alteredBB, align 4
  br label %originalBB300

originalBB304alteredBB:                           ; preds = %originalBB304, %if.end95
  br label %originalBB304
}

attributes #0 = { noinline nounwind optnone uwtable "min-legal-vector-width"="0" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }

!llvm.module.flags = !{!0, !1, !2}
!llvm.ident = !{!3}

!0 = !{i32 1, !"wchar_size", i32 2}
!1 = !{i32 8, !"PIC Level", i32 2}
!2 = !{i32 7, !"uwtable", i32 2}
!3 = !{!"clang version 16.0.6 (https://github.com/llvm/llvm-project.git 7cbf1a2591520c2491aa35339f227775f4d3adf6)"}
