; ModuleID = 'E:\Workspace\binary_binja_redesign\comp4020-final-ky787\experiments\coop-controllers\crossfeed-vault\src\controller.c'
source_filename = "E:\\Workspace\\binary_binja_redesign\\comp4020-final-ky787\\experiments\\coop-controllers\\crossfeed-vault\\src\\controller.c"
target datalayout = "e-m:w-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-windows-msvc19.51.36248"

%struct.ControllerInputs = type { i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32 }
%struct.ControllerOutputs = type { i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32 }

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
  %vault = alloca i32, align 4
  store ptr %outputs, ptr %outputs.addr, align 8
  store ptr %inputs, ptr %inputs.addr, align 8
  %8 = load ptr, ptr %inputs.addr, align 8
  %switchC = getelementptr inbounds %struct.ControllerInputs, ptr %8, i32 0, i32 1
  %9 = load i32, ptr %switchC, align 4
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
  br i1 %25, label %originalBB98, label %originalBB98alteredBB

originalBB98:                                     ; preds = %land.rhs, %originalBB98alteredBB
  %26 = load ptr, ptr %inputs.addr, align 8
  %routePowerOccupied = getelementptr inbounds %struct.ControllerInputs, ptr %26, i32 0, i32 5
  %27 = load i32, ptr %routePowerOccupied, align 4
  %tobool1 = icmp ne i32 %27, 0
  %28 = load i32, ptr @x, align 4
  %29 = load i32, ptr @y, align 4
  %30 = sub i32 %28, 1
  %31 = mul i32 %28, %30
  %32 = urem i32 %31, 2
  %33 = icmp eq i32 %32, 0
  %34 = icmp slt i32 %29, 10
  %35 = or i1 %33, %34
  br i1 %35, label %originalBBpart2100, label %originalBB98alteredBB

originalBBpart2100:                               ; preds = %originalBB98
  br label %land.end

land.end:                                         ; preds = %originalBBpart2100, %originalBBpart2
  %36 = phi i1 [ false, %originalBBpart2 ], [ %tobool1, %originalBBpart2100 ]
  %37 = load i32, ptr @x, align 4
  %38 = load i32, ptr @y, align 4
  %39 = sub i32 %37, 1
  %40 = mul i32 %37, %39
  %41 = urem i32 %40, 2
  %42 = icmp eq i32 %41, 0
  %43 = icmp slt i32 %38, 10
  %44 = or i1 %42, %43
  br i1 %44, label %originalBB102, label %originalBB102alteredBB

originalBB102:                                    ; preds = %land.end, %originalBB102alteredBB
  %land.ext = zext i1 %36 to i32
  store i32 %land.ext, ptr %master, align 4
  %45 = load ptr, ptr %inputs.addr, align 8
  %cubeOnFinalLeft = getelementptr inbounds %struct.ControllerInputs, ptr %45, i32 0, i32 7
  %46 = load i32, ptr %cubeOnFinalLeft, align 4
  %tobool2 = icmp ne i32 %46, 0
  %47 = load i32, ptr @x, align 4
  %48 = load i32, ptr @y, align 4
  %49 = sub i32 %47, 1
  %50 = mul i32 %47, %49
  %51 = urem i32 %50, 2
  %52 = icmp eq i32 %51, 0
  %53 = icmp slt i32 %48, 10
  %54 = or i1 %52, %53
  br i1 %54, label %originalBBpart2104, label %originalBB102alteredBB

originalBBpart2104:                               ; preds = %originalBB102
  br i1 %tobool2, label %land.rhs3, label %land.end5

land.rhs3:                                        ; preds = %originalBBpart2104
  %55 = load i32, ptr @x, align 4
  %56 = load i32, ptr @y, align 4
  %57 = sub i32 %55, 1
  %58 = mul i32 %55, %57
  %59 = urem i32 %58, 2
  %60 = icmp eq i32 %59, 0
  %61 = icmp slt i32 %56, 10
  %62 = or i1 %60, %61
  br i1 %62, label %originalBB106, label %originalBB106alteredBB

originalBB106:                                    ; preds = %land.rhs3, %originalBB106alteredBB
  %63 = load ptr, ptr %inputs.addr, align 8
  %cubeOnFinalRight = getelementptr inbounds %struct.ControllerInputs, ptr %63, i32 0, i32 8
  %64 = load i32, ptr %cubeOnFinalRight, align 4
  %tobool4 = icmp ne i32 %64, 0
  %65 = load i32, ptr @x, align 4
  %66 = load i32, ptr @y, align 4
  %67 = sub i32 %65, 1
  %68 = mul i32 %65, %67
  %69 = urem i32 %68, 2
  %70 = icmp eq i32 %69, 0
  %71 = icmp slt i32 %66, 10
  %72 = or i1 %70, %71
  br i1 %72, label %originalBBpart2108, label %originalBB106alteredBB

originalBBpart2108:                               ; preds = %originalBB106
  br label %land.end5

land.end5:                                        ; preds = %originalBBpart2108, %originalBBpart2104
  %73 = phi i1 [ false, %originalBBpart2104 ], [ %tobool4, %originalBBpart2108 ]
  %74 = load i32, ptr @x, align 4
  %75 = load i32, ptr @y, align 4
  %76 = sub i32 %74, 1
  %77 = mul i32 %74, %76
  %78 = urem i32 %77, 2
  %79 = icmp eq i32 %78, 0
  %80 = icmp slt i32 %75, 10
  %81 = or i1 %79, %80
  br i1 %81, label %originalBB110, label %originalBB110alteredBB

originalBB110:                                    ; preds = %land.end5, %originalBB110alteredBB
  %land.ext6 = zext i1 %73 to i32
  store i32 %land.ext6, ptr %vault, align 4
  %82 = load ptr, ptr %inputs.addr, align 8
  %plateAOccupied = getelementptr inbounds %struct.ControllerInputs, ptr %82, i32 0, i32 4
  %83 = load i32, ptr %plateAOccupied, align 4
  %tobool7 = icmp ne i32 %83, 0
  %84 = load i32, ptr @x, align 4
  %85 = load i32, ptr @y, align 4
  %86 = sub i32 %84, 1
  %87 = mul i32 %84, %86
  %88 = urem i32 %87, 2
  %89 = icmp eq i32 %88, 0
  %90 = icmp slt i32 %85, 10
  %91 = or i1 %89, %90
  br i1 %91, label %originalBBpart2112, label %originalBB110alteredBB

originalBBpart2112:                               ; preds = %originalBB110
  br i1 %tobool7, label %land.lhs.true, label %if.else

land.lhs.true:                                    ; preds = %originalBBpart2112
  %92 = load i32, ptr @x, align 4
  %93 = load i32, ptr @y, align 4
  %94 = sub i32 %92, 1
  %95 = mul i32 %92, %94
  %96 = urem i32 %95, 2
  %97 = icmp eq i32 %96, 0
  %98 = icmp slt i32 %93, 10
  %99 = or i1 %97, %98
  br i1 %99, label %originalBB114, label %originalBB114alteredBB

originalBB114:                                    ; preds = %land.lhs.true, %originalBB114alteredBB
  %100 = load ptr, ptr %inputs.addr, align 8
  %switchB = getelementptr inbounds %struct.ControllerInputs, ptr %100, i32 0, i32 0
  %101 = load i32, ptr %switchB, align 4
  %tobool8 = icmp ne i32 %101, 0
  %102 = load i32, ptr @x, align 4
  %103 = load i32, ptr @y, align 4
  %104 = sub i32 %102, 1
  %105 = mul i32 %102, %104
  %106 = urem i32 %105, 2
  %107 = icmp eq i32 %106, 0
  %108 = icmp slt i32 %103, 10
  %109 = or i1 %107, %108
  br i1 %109, label %originalBBpart2116, label %originalBB114alteredBB

originalBBpart2116:                               ; preds = %originalBB114
  br i1 %tobool8, label %if.else, label %if.then

if.then:                                          ; preds = %originalBBpart2116
  %110 = load i32, ptr @x, align 4
  %111 = load i32, ptr @y, align 4
  %112 = sub i32 %110, 1
  %113 = mul i32 %110, %112
  %114 = urem i32 %113, 2
  %115 = icmp eq i32 %114, 0
  %116 = icmp slt i32 %111, 10
  %117 = or i1 %115, %116
  br i1 %117, label %originalBB118, label %originalBB118alteredBB

originalBB118:                                    ; preds = %if.then, %originalBB118alteredBB
  %118 = load ptr, ptr %outputs.addr, align 8
  %grappleAnchor = getelementptr inbounds %struct.ControllerOutputs, ptr %118, i32 0, i32 0
  store i32 1, ptr %grappleAnchor, align 4
  %119 = load i32, ptr @x, align 4
  %120 = load i32, ptr @y, align 4
  %121 = sub i32 %119, 1
  %122 = mul i32 %119, %121
  %123 = urem i32 %122, 2
  %124 = icmp eq i32 %123, 0
  %125 = icmp slt i32 %120, 10
  %126 = or i1 %124, %125
  br i1 %126, label %originalBBpart2120, label %originalBB118alteredBB

originalBBpart2120:                               ; preds = %originalBB118
  br label %if.end

if.else:                                          ; preds = %originalBBpart2116, %originalBBpart2112
  %127 = load i32, ptr @x, align 4
  %128 = load i32, ptr @y, align 4
  %129 = sub i32 %127, 1
  %130 = mul i32 %127, %129
  %131 = urem i32 %130, 2
  %132 = icmp eq i32 %131, 0
  %133 = icmp slt i32 %128, 10
  %134 = or i1 %132, %133
  br i1 %134, label %originalBB122, label %originalBB122alteredBB

originalBB122:                                    ; preds = %if.else, %originalBB122alteredBB
  %135 = load ptr, ptr %outputs.addr, align 8
  %grappleAnchor9 = getelementptr inbounds %struct.ControllerOutputs, ptr %135, i32 0, i32 0
  store i32 0, ptr %grappleAnchor9, align 4
  %136 = load i32, ptr @x, align 4
  %137 = load i32, ptr @y, align 4
  %138 = sub i32 %136, 1
  %139 = mul i32 %136, %138
  %140 = urem i32 %139, 2
  %141 = icmp eq i32 %140, 0
  %142 = icmp slt i32 %137, 10
  %143 = or i1 %141, %142
  br i1 %143, label %originalBBpart2124, label %originalBB122alteredBB

originalBBpart2124:                               ; preds = %originalBB122
  br label %if.end

if.end:                                           ; preds = %originalBBpart2124, %originalBBpart2120
  %144 = load i32, ptr @x, align 4
  %145 = load i32, ptr @y, align 4
  %146 = sub i32 %144, 1
  %147 = mul i32 %144, %146
  %148 = urem i32 %147, 2
  %149 = icmp eq i32 %148, 0
  %150 = icmp slt i32 %145, 10
  %151 = or i1 %149, %150
  br i1 %151, label %originalBB126, label %originalBB126alteredBB

originalBB126:                                    ; preds = %if.end, %originalBB126alteredBB
  %152 = load ptr, ptr %inputs.addr, align 8
  %switchB10 = getelementptr inbounds %struct.ControllerInputs, ptr %152, i32 0, i32 0
  %153 = load i32, ptr %switchB10, align 4
  %tobool11 = icmp ne i32 %153, 0
  %154 = load i32, ptr @x, align 4
  %155 = load i32, ptr @y, align 4
  %156 = sub i32 %154, 1
  %157 = mul i32 %154, %156
  %158 = urem i32 %157, 2
  %159 = icmp eq i32 %158, 0
  %160 = icmp slt i32 %155, 10
  %161 = or i1 %159, %160
  br i1 %161, label %originalBBpart2128, label %originalBB126alteredBB

originalBBpart2128:                               ; preds = %originalBB126
  br i1 %tobool11, label %if.then12, label %if.else13

if.then12:                                        ; preds = %originalBBpart2128
  %162 = load i32, ptr @x, align 4
  %163 = load i32, ptr @y, align 4
  %164 = sub i32 %162, 1
  %165 = mul i32 %162, %164
  %166 = urem i32 %165, 2
  %167 = icmp eq i32 %166, 0
  %168 = icmp slt i32 %163, 10
  %169 = or i1 %167, %168
  br i1 %169, label %originalBB130, label %originalBB130alteredBB

originalBB130:                                    ; preds = %if.then12, %originalBB130alteredBB
  %170 = load ptr, ptr %outputs.addr, align 8
  %bridge = getelementptr inbounds %struct.ControllerOutputs, ptr %170, i32 0, i32 1
  store i32 1, ptr %bridge, align 4
  %171 = load i32, ptr @x, align 4
  %172 = load i32, ptr @y, align 4
  %173 = sub i32 %171, 1
  %174 = mul i32 %171, %173
  %175 = urem i32 %174, 2
  %176 = icmp eq i32 %175, 0
  %177 = icmp slt i32 %172, 10
  %178 = or i1 %176, %177
  br i1 %178, label %originalBBpart2132, label %originalBB130alteredBB

originalBBpart2132:                               ; preds = %originalBB130
  br label %if.end15

if.else13:                                        ; preds = %originalBBpart2128
  %179 = load i32, ptr @x, align 4
  %180 = load i32, ptr @y, align 4
  %181 = sub i32 %179, 1
  %182 = mul i32 %179, %181
  %183 = urem i32 %182, 2
  %184 = icmp eq i32 %183, 0
  %185 = icmp slt i32 %180, 10
  %186 = or i1 %184, %185
  br i1 %186, label %originalBB134, label %originalBB134alteredBB

originalBB134:                                    ; preds = %if.else13, %originalBB134alteredBB
  %187 = load ptr, ptr %outputs.addr, align 8
  %bridge14 = getelementptr inbounds %struct.ControllerOutputs, ptr %187, i32 0, i32 1
  store i32 0, ptr %bridge14, align 4
  %188 = load i32, ptr @x, align 4
  %189 = load i32, ptr @y, align 4
  %190 = sub i32 %188, 1
  %191 = mul i32 %188, %190
  %192 = urem i32 %191, 2
  %193 = icmp eq i32 %192, 0
  %194 = icmp slt i32 %189, 10
  %195 = or i1 %193, %194
  br i1 %195, label %originalBBpart2136, label %originalBB134alteredBB

originalBBpart2136:                               ; preds = %originalBB134
  br label %if.end15

if.end15:                                         ; preds = %originalBBpart2136, %originalBBpart2132
  %196 = load i32, ptr @x, align 4
  %197 = load i32, ptr @y, align 4
  %198 = sub i32 %196, 1
  %199 = mul i32 %196, %198
  %200 = urem i32 %199, 2
  %201 = icmp eq i32 %200, 0
  %202 = icmp slt i32 %197, 10
  %203 = or i1 %201, %202
  br i1 %203, label %originalBB138, label %originalBB138alteredBB

originalBB138:                                    ; preds = %if.end15, %originalBB138alteredBB
  %204 = load ptr, ptr %inputs.addr, align 8
  %cubeOnLiftCargo = getelementptr inbounds %struct.ControllerInputs, ptr %204, i32 0, i32 6
  %205 = load i32, ptr %cubeOnLiftCargo, align 4
  %tobool16 = icmp ne i32 %205, 0
  %206 = load i32, ptr @x, align 4
  %207 = load i32, ptr @y, align 4
  %208 = sub i32 %206, 1
  %209 = mul i32 %206, %208
  %210 = urem i32 %209, 2
  %211 = icmp eq i32 %210, 0
  %212 = icmp slt i32 %207, 10
  %213 = or i1 %211, %212
  br i1 %213, label %originalBBpart2140, label %originalBB138alteredBB

originalBBpart2140:                               ; preds = %originalBB138
  br i1 %tobool16, label %if.then19, label %lor.lhs.false

lor.lhs.false:                                    ; preds = %originalBBpart2140
  %214 = load i32, ptr @x, align 4
  %215 = load i32, ptr @y, align 4
  %216 = sub i32 %214, 1
  %217 = mul i32 %214, %216
  %218 = urem i32 %217, 2
  %219 = icmp eq i32 %218, 0
  %220 = icmp slt i32 %215, 10
  %221 = or i1 %219, %220
  br i1 %221, label %originalBB142, label %originalBB142alteredBB

originalBB142:                                    ; preds = %lor.lhs.false, %originalBB142alteredBB
  %222 = load ptr, ptr %inputs.addr, align 8
  %switchC17 = getelementptr inbounds %struct.ControllerInputs, ptr %222, i32 0, i32 1
  %223 = load i32, ptr %switchC17, align 4
  %tobool18 = icmp ne i32 %223, 0
  %224 = load i32, ptr @x, align 4
  %225 = load i32, ptr @y, align 4
  %226 = sub i32 %224, 1
  %227 = mul i32 %224, %226
  %228 = urem i32 %227, 2
  %229 = icmp eq i32 %228, 0
  %230 = icmp slt i32 %225, 10
  %231 = or i1 %229, %230
  br i1 %231, label %originalBBpart2144, label %originalBB142alteredBB

originalBBpart2144:                               ; preds = %originalBB142
  br i1 %tobool18, label %if.then19, label %if.else20

if.then19:                                        ; preds = %originalBBpart2144, %originalBBpart2140
  %232 = load i32, ptr @x, align 4
  %233 = load i32, ptr @y, align 4
  %234 = sub i32 %232, 1
  %235 = mul i32 %232, %234
  %236 = urem i32 %235, 2
  %237 = icmp eq i32 %236, 0
  %238 = icmp slt i32 %233, 10
  %239 = or i1 %237, %238
  br i1 %239, label %originalBB146, label %originalBB146alteredBB

originalBB146:                                    ; preds = %if.then19, %originalBB146alteredBB
  %240 = load ptr, ptr %outputs.addr, align 8
  %liftField = getelementptr inbounds %struct.ControllerOutputs, ptr %240, i32 0, i32 2
  store i32 1, ptr %liftField, align 4
  %241 = load i32, ptr @x, align 4
  %242 = load i32, ptr @y, align 4
  %243 = sub i32 %241, 1
  %244 = mul i32 %241, %243
  %245 = urem i32 %244, 2
  %246 = icmp eq i32 %245, 0
  %247 = icmp slt i32 %242, 10
  %248 = or i1 %246, %247
  br i1 %248, label %originalBBpart2148, label %originalBB146alteredBB

originalBBpart2148:                               ; preds = %originalBB146
  br label %if.end22

if.else20:                                        ; preds = %originalBBpart2144
  %249 = load i32, ptr @x, align 4
  %250 = load i32, ptr @y, align 4
  %251 = sub i32 %249, 1
  %252 = mul i32 %249, %251
  %253 = urem i32 %252, 2
  %254 = icmp eq i32 %253, 0
  %255 = icmp slt i32 %250, 10
  %256 = or i1 %254, %255
  br i1 %256, label %originalBB150, label %originalBB150alteredBB

originalBB150:                                    ; preds = %if.else20, %originalBB150alteredBB
  %257 = load ptr, ptr %outputs.addr, align 8
  %liftField21 = getelementptr inbounds %struct.ControllerOutputs, ptr %257, i32 0, i32 2
  store i32 0, ptr %liftField21, align 4
  %258 = load i32, ptr @x, align 4
  %259 = load i32, ptr @y, align 4
  %260 = sub i32 %258, 1
  %261 = mul i32 %258, %260
  %262 = urem i32 %261, 2
  %263 = icmp eq i32 %262, 0
  %264 = icmp slt i32 %259, 10
  %265 = or i1 %263, %264
  br i1 %265, label %originalBBpart2152, label %originalBB150alteredBB

originalBBpart2152:                               ; preds = %originalBB150
  br label %if.end22

if.end22:                                         ; preds = %originalBBpart2152, %originalBBpart2148
  %266 = load i32, ptr @x, align 4
  %267 = load i32, ptr @y, align 4
  %268 = sub i32 %266, 1
  %269 = mul i32 %266, %268
  %270 = urem i32 %269, 2
  %271 = icmp eq i32 %270, 0
  %272 = icmp slt i32 %267, 10
  %273 = or i1 %271, %272
  br i1 %273, label %originalBB154, label %originalBB154alteredBB

originalBB154:                                    ; preds = %if.end22, %originalBB154alteredBB
  %274 = load ptr, ptr %inputs.addr, align 8
  %switchC23 = getelementptr inbounds %struct.ControllerInputs, ptr %274, i32 0, i32 1
  %275 = load i32, ptr %switchC23, align 4
  %tobool24 = icmp ne i32 %275, 0
  %276 = load i32, ptr @x, align 4
  %277 = load i32, ptr @y, align 4
  %278 = sub i32 %276, 1
  %279 = mul i32 %276, %278
  %280 = urem i32 %279, 2
  %281 = icmp eq i32 %280, 0
  %282 = icmp slt i32 %277, 10
  %283 = or i1 %281, %282
  br i1 %283, label %originalBBpart2156, label %originalBB154alteredBB

originalBBpart2156:                               ; preds = %originalBB154
  br i1 %tobool24, label %if.then25, label %if.else26

if.then25:                                        ; preds = %originalBBpart2156
  %284 = load i32, ptr @x, align 4
  %285 = load i32, ptr @y, align 4
  %286 = sub i32 %284, 1
  %287 = mul i32 %284, %286
  %288 = urem i32 %287, 2
  %289 = icmp eq i32 %288, 0
  %290 = icmp slt i32 %285, 10
  %291 = or i1 %289, %290
  br i1 %291, label %originalBB158, label %originalBB158alteredBB

originalBB158:                                    ; preds = %if.then25, %originalBB158alteredBB
  %292 = load ptr, ptr %outputs.addr, align 8
  %serviceAccess = getelementptr inbounds %struct.ControllerOutputs, ptr %292, i32 0, i32 3
  store i32 1, ptr %serviceAccess, align 4
  %293 = load i32, ptr @x, align 4
  %294 = load i32, ptr @y, align 4
  %295 = sub i32 %293, 1
  %296 = mul i32 %293, %295
  %297 = urem i32 %296, 2
  %298 = icmp eq i32 %297, 0
  %299 = icmp slt i32 %294, 10
  %300 = or i1 %298, %299
  br i1 %300, label %originalBBpart2160, label %originalBB158alteredBB

originalBBpart2160:                               ; preds = %originalBB158
  br label %if.end28

if.else26:                                        ; preds = %originalBBpart2156
  %301 = load i32, ptr @x, align 4
  %302 = load i32, ptr @y, align 4
  %303 = sub i32 %301, 1
  %304 = mul i32 %301, %303
  %305 = urem i32 %304, 2
  %306 = icmp eq i32 %305, 0
  %307 = icmp slt i32 %302, 10
  %308 = or i1 %306, %307
  br i1 %308, label %originalBB162, label %originalBB162alteredBB

originalBB162:                                    ; preds = %if.else26, %originalBB162alteredBB
  %309 = load ptr, ptr %outputs.addr, align 8
  %serviceAccess27 = getelementptr inbounds %struct.ControllerOutputs, ptr %309, i32 0, i32 3
  store i32 0, ptr %serviceAccess27, align 4
  %310 = load i32, ptr @x, align 4
  %311 = load i32, ptr @y, align 4
  %312 = sub i32 %310, 1
  %313 = mul i32 %310, %312
  %314 = urem i32 %313, 2
  %315 = icmp eq i32 %314, 0
  %316 = icmp slt i32 %311, 10
  %317 = or i1 %315, %316
  br i1 %317, label %originalBBpart2164, label %originalBB162alteredBB

originalBBpart2164:                               ; preds = %originalBB162
  br label %if.end28

if.end28:                                         ; preds = %originalBBpart2164, %originalBBpart2160
  %318 = load i32, ptr @x, align 4
  %319 = load i32, ptr @y, align 4
  %320 = sub i32 %318, 1
  %321 = mul i32 %318, %320
  %322 = urem i32 %321, 2
  %323 = icmp eq i32 %322, 0
  %324 = icmp slt i32 %319, 10
  %325 = or i1 %323, %324
  br i1 %325, label %originalBB166, label %originalBB166alteredBB

originalBB166:                                    ; preds = %if.end28, %originalBB166alteredBB
  %326 = load ptr, ptr %inputs.addr, align 8
  %switchC29 = getelementptr inbounds %struct.ControllerInputs, ptr %326, i32 0, i32 1
  %327 = load i32, ptr %switchC29, align 4
  %tobool30 = icmp ne i32 %327, 0
  %328 = load i32, ptr @x, align 4
  %329 = load i32, ptr @y, align 4
  %330 = sub i32 %328, 1
  %331 = mul i32 %328, %330
  %332 = urem i32 %331, 2
  %333 = icmp eq i32 %332, 0
  %334 = icmp slt i32 %329, 10
  %335 = or i1 %333, %334
  br i1 %335, label %originalBBpart2168, label %originalBB166alteredBB

originalBBpart2168:                               ; preds = %originalBB166
  br i1 %tobool30, label %land.lhs.true31, label %if.else35

land.lhs.true31:                                  ; preds = %originalBBpart2168
  %336 = load i32, ptr @x, align 4
  %337 = load i32, ptr @y, align 4
  %338 = sub i32 %336, 1
  %339 = mul i32 %336, %338
  %340 = urem i32 %339, 2
  %341 = icmp eq i32 %340, 0
  %342 = icmp slt i32 %337, 10
  %343 = or i1 %341, %342
  br i1 %343, label %originalBB170, label %originalBB170alteredBB

originalBB170:                                    ; preds = %land.lhs.true31, %originalBB170alteredBB
  %344 = load ptr, ptr %inputs.addr, align 8
  %switchB32 = getelementptr inbounds %struct.ControllerInputs, ptr %344, i32 0, i32 0
  %345 = load i32, ptr %switchB32, align 4
  %tobool33 = icmp ne i32 %345, 0
  %346 = load i32, ptr @x, align 4
  %347 = load i32, ptr @y, align 4
  %348 = sub i32 %346, 1
  %349 = mul i32 %346, %348
  %350 = urem i32 %349, 2
  %351 = icmp eq i32 %350, 0
  %352 = icmp slt i32 %347, 10
  %353 = or i1 %351, %352
  br i1 %353, label %originalBBpart2172, label %originalBB170alteredBB

originalBBpart2172:                               ; preds = %originalBB170
  br i1 %tobool33, label %if.else35, label %if.then34

if.then34:                                        ; preds = %originalBBpart2172
  %354 = load i32, ptr @x, align 4
  %355 = load i32, ptr @y, align 4
  %356 = sub i32 %354, 1
  %357 = mul i32 %354, %356
  %358 = urem i32 %357, 2
  %359 = icmp eq i32 %358, 0
  %360 = icmp slt i32 %355, 10
  %361 = or i1 %359, %360
  br i1 %361, label %originalBB174, label %originalBB174alteredBB

originalBB174:                                    ; preds = %if.then34, %originalBB174alteredBB
  %362 = load ptr, ptr %outputs.addr, align 8
  %relayGates = getelementptr inbounds %struct.ControllerOutputs, ptr %362, i32 0, i32 4
  store i32 1, ptr %relayGates, align 4
  %363 = load i32, ptr @x, align 4
  %364 = load i32, ptr @y, align 4
  %365 = sub i32 %363, 1
  %366 = mul i32 %363, %365
  %367 = urem i32 %366, 2
  %368 = icmp eq i32 %367, 0
  %369 = icmp slt i32 %364, 10
  %370 = or i1 %368, %369
  br i1 %370, label %originalBBpart2176, label %originalBB174alteredBB

originalBBpart2176:                               ; preds = %originalBB174
  br label %if.end37

if.else35:                                        ; preds = %originalBBpart2172, %originalBBpart2168
  %371 = load i32, ptr @x, align 4
  %372 = load i32, ptr @y, align 4
  %373 = sub i32 %371, 1
  %374 = mul i32 %371, %373
  %375 = urem i32 %374, 2
  %376 = icmp eq i32 %375, 0
  %377 = icmp slt i32 %372, 10
  %378 = or i1 %376, %377
  br i1 %378, label %originalBB178, label %originalBB178alteredBB

originalBB178:                                    ; preds = %if.else35, %originalBB178alteredBB
  %379 = load ptr, ptr %outputs.addr, align 8
  %relayGates36 = getelementptr inbounds %struct.ControllerOutputs, ptr %379, i32 0, i32 4
  store i32 0, ptr %relayGates36, align 4
  %380 = load i32, ptr @x, align 4
  %381 = load i32, ptr @y, align 4
  %382 = sub i32 %380, 1
  %383 = mul i32 %380, %382
  %384 = urem i32 %383, 2
  %385 = icmp eq i32 %384, 0
  %386 = icmp slt i32 %381, 10
  %387 = or i1 %385, %386
  br i1 %387, label %originalBBpart2180, label %originalBB178alteredBB

originalBBpart2180:                               ; preds = %originalBB178
  br label %if.end37

if.end37:                                         ; preds = %originalBBpart2180, %originalBBpart2176
  %388 = load i32, ptr @x, align 4
  %389 = load i32, ptr @y, align 4
  %390 = sub i32 %388, 1
  %391 = mul i32 %388, %390
  %392 = urem i32 %391, 2
  %393 = icmp eq i32 %392, 0
  %394 = icmp slt i32 %389, 10
  %395 = or i1 %393, %394
  br i1 %395, label %originalBB182, label %originalBB182alteredBB

originalBB182:                                    ; preds = %if.end37, %originalBB182alteredBB
  %396 = load i32, ptr %master, align 4
  %tobool38 = icmp ne i32 %396, 0
  %397 = load i32, ptr @x, align 4
  %398 = load i32, ptr @y, align 4
  %399 = sub i32 %397, 1
  %400 = mul i32 %397, %399
  %401 = urem i32 %400, 2
  %402 = icmp eq i32 %401, 0
  %403 = icmp slt i32 %398, 10
  %404 = or i1 %402, %403
  br i1 %404, label %originalBBpart2184, label %originalBB182alteredBB

originalBBpart2184:                               ; preds = %originalBB182
  br i1 %tobool38, label %land.lhs.true39, label %if.else42

land.lhs.true39:                                  ; preds = %originalBBpart2184
  %405 = load i32, ptr @x, align 4
  %406 = load i32, ptr @y, align 4
  %407 = sub i32 %405, 1
  %408 = mul i32 %405, %407
  %409 = urem i32 %408, 2
  %410 = icmp eq i32 %409, 0
  %411 = icmp slt i32 %406, 10
  %412 = or i1 %410, %411
  br i1 %412, label %originalBB186, label %originalBB186alteredBB

originalBB186:                                    ; preds = %land.lhs.true39, %originalBB186alteredBB
  %413 = load ptr, ptr %inputs.addr, align 8
  %routeMode = getelementptr inbounds %struct.ControllerInputs, ptr %413, i32 0, i32 3
  %414 = load i32, ptr %routeMode, align 4
  %tobool40 = icmp ne i32 %414, 0
  %415 = load i32, ptr @x, align 4
  %416 = load i32, ptr @y, align 4
  %417 = sub i32 %415, 1
  %418 = mul i32 %415, %417
  %419 = urem i32 %418, 2
  %420 = icmp eq i32 %419, 0
  %421 = icmp slt i32 %416, 10
  %422 = or i1 %420, %421
  br i1 %422, label %originalBBpart2188, label %originalBB186alteredBB

originalBBpart2188:                               ; preds = %originalBB186
  br i1 %tobool40, label %if.else42, label %if.then41

if.then41:                                        ; preds = %originalBBpart2188
  %423 = load i32, ptr @x, align 4
  %424 = load i32, ptr @y, align 4
  %425 = sub i32 %423, 1
  %426 = mul i32 %423, %425
  %427 = urem i32 %426, 2
  %428 = icmp eq i32 %427, 0
  %429 = icmp slt i32 %424, 10
  %430 = or i1 %428, %429
  br i1 %430, label %originalBB190, label %originalBB190alteredBB

originalBB190:                                    ; preds = %if.then41, %originalBB190alteredBB
  %431 = load ptr, ptr %outputs.addr, align 8
  %leftRoute = getelementptr inbounds %struct.ControllerOutputs, ptr %431, i32 0, i32 5
  store i32 1, ptr %leftRoute, align 4
  %432 = load i32, ptr @x, align 4
  %433 = load i32, ptr @y, align 4
  %434 = sub i32 %432, 1
  %435 = mul i32 %432, %434
  %436 = urem i32 %435, 2
  %437 = icmp eq i32 %436, 0
  %438 = icmp slt i32 %433, 10
  %439 = or i1 %437, %438
  br i1 %439, label %originalBBpart2192, label %originalBB190alteredBB

originalBBpart2192:                               ; preds = %originalBB190
  br label %if.end44

if.else42:                                        ; preds = %originalBBpart2188, %originalBBpart2184
  %440 = load i32, ptr @x, align 4
  %441 = load i32, ptr @y, align 4
  %442 = sub i32 %440, 1
  %443 = mul i32 %440, %442
  %444 = urem i32 %443, 2
  %445 = icmp eq i32 %444, 0
  %446 = icmp slt i32 %441, 10
  %447 = or i1 %445, %446
  br i1 %447, label %originalBB194, label %originalBB194alteredBB

originalBB194:                                    ; preds = %if.else42, %originalBB194alteredBB
  %448 = load ptr, ptr %outputs.addr, align 8
  %leftRoute43 = getelementptr inbounds %struct.ControllerOutputs, ptr %448, i32 0, i32 5
  store i32 0, ptr %leftRoute43, align 4
  %449 = load i32, ptr @x, align 4
  %450 = load i32, ptr @y, align 4
  %451 = sub i32 %449, 1
  %452 = mul i32 %449, %451
  %453 = urem i32 %452, 2
  %454 = icmp eq i32 %453, 0
  %455 = icmp slt i32 %450, 10
  %456 = or i1 %454, %455
  br i1 %456, label %originalBBpart2196, label %originalBB194alteredBB

originalBBpart2196:                               ; preds = %originalBB194
  br label %if.end44

if.end44:                                         ; preds = %originalBBpart2196, %originalBBpart2192
  %457 = load i32, ptr @x, align 4
  %458 = load i32, ptr @y, align 4
  %459 = sub i32 %457, 1
  %460 = mul i32 %457, %459
  %461 = urem i32 %460, 2
  %462 = icmp eq i32 %461, 0
  %463 = icmp slt i32 %458, 10
  %464 = or i1 %462, %463
  br i1 %464, label %originalBB198, label %originalBB198alteredBB

originalBB198:                                    ; preds = %if.end44, %originalBB198alteredBB
  %465 = load i32, ptr %master, align 4
  %tobool45 = icmp ne i32 %465, 0
  %466 = load i32, ptr @x, align 4
  %467 = load i32, ptr @y, align 4
  %468 = sub i32 %466, 1
  %469 = mul i32 %466, %468
  %470 = urem i32 %469, 2
  %471 = icmp eq i32 %470, 0
  %472 = icmp slt i32 %467, 10
  %473 = or i1 %471, %472
  br i1 %473, label %originalBBpart2200, label %originalBB198alteredBB

originalBBpart2200:                               ; preds = %originalBB198
  br i1 %tobool45, label %land.lhs.true46, label %if.else50

land.lhs.true46:                                  ; preds = %originalBBpart2200
  %474 = load i32, ptr @x, align 4
  %475 = load i32, ptr @y, align 4
  %476 = sub i32 %474, 1
  %477 = mul i32 %474, %476
  %478 = urem i32 %477, 2
  %479 = icmp eq i32 %478, 0
  %480 = icmp slt i32 %475, 10
  %481 = or i1 %479, %480
  br i1 %481, label %originalBB202, label %originalBB202alteredBB

originalBB202:                                    ; preds = %land.lhs.true46, %originalBB202alteredBB
  %482 = load ptr, ptr %inputs.addr, align 8
  %routeMode47 = getelementptr inbounds %struct.ControllerInputs, ptr %482, i32 0, i32 3
  %483 = load i32, ptr %routeMode47, align 4
  %tobool48 = icmp ne i32 %483, 0
  %484 = load i32, ptr @x, align 4
  %485 = load i32, ptr @y, align 4
  %486 = sub i32 %484, 1
  %487 = mul i32 %484, %486
  %488 = urem i32 %487, 2
  %489 = icmp eq i32 %488, 0
  %490 = icmp slt i32 %485, 10
  %491 = or i1 %489, %490
  br i1 %491, label %originalBBpart2204, label %originalBB202alteredBB

originalBBpart2204:                               ; preds = %originalBB202
  br i1 %tobool48, label %if.then49, label %if.else50

if.then49:                                        ; preds = %originalBBpart2204
  %492 = load i32, ptr @x, align 4
  %493 = load i32, ptr @y, align 4
  %494 = sub i32 %492, 1
  %495 = mul i32 %492, %494
  %496 = urem i32 %495, 2
  %497 = icmp eq i32 %496, 0
  %498 = icmp slt i32 %493, 10
  %499 = or i1 %497, %498
  br i1 %499, label %originalBB206, label %originalBB206alteredBB

originalBB206:                                    ; preds = %if.then49, %originalBB206alteredBB
  %500 = load ptr, ptr %outputs.addr, align 8
  %rightRoute = getelementptr inbounds %struct.ControllerOutputs, ptr %500, i32 0, i32 6
  store i32 1, ptr %rightRoute, align 4
  %501 = load i32, ptr @x, align 4
  %502 = load i32, ptr @y, align 4
  %503 = sub i32 %501, 1
  %504 = mul i32 %501, %503
  %505 = urem i32 %504, 2
  %506 = icmp eq i32 %505, 0
  %507 = icmp slt i32 %502, 10
  %508 = or i1 %506, %507
  br i1 %508, label %originalBBpart2208, label %originalBB206alteredBB

originalBBpart2208:                               ; preds = %originalBB206
  br label %if.end52

if.else50:                                        ; preds = %originalBBpart2204, %originalBBpart2200
  %509 = load i32, ptr @x, align 4
  %510 = load i32, ptr @y, align 4
  %511 = sub i32 %509, 1
  %512 = mul i32 %509, %511
  %513 = urem i32 %512, 2
  %514 = icmp eq i32 %513, 0
  %515 = icmp slt i32 %510, 10
  %516 = or i1 %514, %515
  br i1 %516, label %originalBB210, label %originalBB210alteredBB

originalBB210:                                    ; preds = %if.else50, %originalBB210alteredBB
  %517 = load ptr, ptr %outputs.addr, align 8
  %rightRoute51 = getelementptr inbounds %struct.ControllerOutputs, ptr %517, i32 0, i32 6
  store i32 0, ptr %rightRoute51, align 4
  %518 = load i32, ptr @x, align 4
  %519 = load i32, ptr @y, align 4
  %520 = sub i32 %518, 1
  %521 = mul i32 %518, %520
  %522 = urem i32 %521, 2
  %523 = icmp eq i32 %522, 0
  %524 = icmp slt i32 %519, 10
  %525 = or i1 %523, %524
  br i1 %525, label %originalBBpart2212, label %originalBB210alteredBB

originalBBpart2212:                               ; preds = %originalBB210
  br label %if.end52

if.end52:                                         ; preds = %originalBBpart2212, %originalBBpart2208
  %526 = load i32, ptr @x, align 4
  %527 = load i32, ptr @y, align 4
  %528 = sub i32 %526, 1
  %529 = mul i32 %526, %528
  %530 = urem i32 %529, 2
  %531 = icmp eq i32 %530, 0
  %532 = icmp slt i32 %527, 10
  %533 = or i1 %531, %532
  br i1 %533, label %originalBB214, label %originalBB214alteredBB

originalBB214:                                    ; preds = %if.end52, %originalBB214alteredBB
  %534 = load ptr, ptr %inputs.addr, align 8
  %switchD = getelementptr inbounds %struct.ControllerInputs, ptr %534, i32 0, i32 2
  %535 = load i32, ptr %switchD, align 4
  %tobool53 = icmp ne i32 %535, 0
  %536 = load i32, ptr @x, align 4
  %537 = load i32, ptr @y, align 4
  %538 = sub i32 %536, 1
  %539 = mul i32 %536, %538
  %540 = urem i32 %539, 2
  %541 = icmp eq i32 %540, 0
  %542 = icmp slt i32 %537, 10
  %543 = or i1 %541, %542
  br i1 %543, label %originalBBpart2216, label %originalBB214alteredBB

originalBBpart2216:                               ; preds = %originalBB214
  br i1 %tobool53, label %if.then54, label %if.else55

if.then54:                                        ; preds = %originalBBpart2216
  %544 = load i32, ptr @x, align 4
  %545 = load i32, ptr @y, align 4
  %546 = sub i32 %544, 1
  %547 = mul i32 %544, %546
  %548 = urem i32 %547, 2
  %549 = icmp eq i32 %548, 0
  %550 = icmp slt i32 %545, 10
  %551 = or i1 %549, %550
  br i1 %551, label %originalBB218, label %originalBB218alteredBB

originalBB218:                                    ; preds = %if.then54, %originalBB218alteredBB
  %552 = load ptr, ptr %outputs.addr, align 8
  %galleryAccess = getelementptr inbounds %struct.ControllerOutputs, ptr %552, i32 0, i32 7
  store i32 1, ptr %galleryAccess, align 4
  %553 = load i32, ptr @x, align 4
  %554 = load i32, ptr @y, align 4
  %555 = sub i32 %553, 1
  %556 = mul i32 %553, %555
  %557 = urem i32 %556, 2
  %558 = icmp eq i32 %557, 0
  %559 = icmp slt i32 %554, 10
  %560 = or i1 %558, %559
  br i1 %560, label %originalBBpart2220, label %originalBB218alteredBB

originalBBpart2220:                               ; preds = %originalBB218
  br label %if.end57

if.else55:                                        ; preds = %originalBBpart2216
  %561 = load i32, ptr @x, align 4
  %562 = load i32, ptr @y, align 4
  %563 = sub i32 %561, 1
  %564 = mul i32 %561, %563
  %565 = urem i32 %564, 2
  %566 = icmp eq i32 %565, 0
  %567 = icmp slt i32 %562, 10
  %568 = or i1 %566, %567
  br i1 %568, label %originalBB222, label %originalBB222alteredBB

originalBB222:                                    ; preds = %if.else55, %originalBB222alteredBB
  %569 = load ptr, ptr %outputs.addr, align 8
  %galleryAccess56 = getelementptr inbounds %struct.ControllerOutputs, ptr %569, i32 0, i32 7
  store i32 0, ptr %galleryAccess56, align 4
  %570 = load i32, ptr @x, align 4
  %571 = load i32, ptr @y, align 4
  %572 = sub i32 %570, 1
  %573 = mul i32 %570, %572
  %574 = urem i32 %573, 2
  %575 = icmp eq i32 %574, 0
  %576 = icmp slt i32 %571, 10
  %577 = or i1 %575, %576
  br i1 %577, label %originalBBpart2224, label %originalBB222alteredBB

originalBBpart2224:                               ; preds = %originalBB222
  br label %if.end57

if.end57:                                         ; preds = %originalBBpart2224, %originalBBpart2220
  %578 = load i32, ptr @x, align 4
  %579 = load i32, ptr @y, align 4
  %580 = sub i32 %578, 1
  %581 = mul i32 %578, %580
  %582 = urem i32 %581, 2
  %583 = icmp eq i32 %582, 0
  %584 = icmp slt i32 %579, 10
  %585 = or i1 %583, %584
  br i1 %585, label %originalBB226, label %originalBB226alteredBB

originalBB226:                                    ; preds = %if.end57, %originalBB226alteredBB
  %586 = load i32, ptr %vault, align 4
  %tobool58 = icmp ne i32 %586, 0
  %587 = load i32, ptr @x, align 4
  %588 = load i32, ptr @y, align 4
  %589 = sub i32 %587, 1
  %590 = mul i32 %587, %589
  %591 = urem i32 %590, 2
  %592 = icmp eq i32 %591, 0
  %593 = icmp slt i32 %588, 10
  %594 = or i1 %592, %593
  br i1 %594, label %originalBBpart2228, label %originalBB226alteredBB

originalBBpart2228:                               ; preds = %originalBB226
  br i1 %tobool58, label %if.then59, label %if.else60

if.then59:                                        ; preds = %originalBBpart2228
  %595 = load i32, ptr @x, align 4
  %596 = load i32, ptr @y, align 4
  %597 = sub i32 %595, 1
  %598 = mul i32 %595, %597
  %599 = urem i32 %598, 2
  %600 = icmp eq i32 %599, 0
  %601 = icmp slt i32 %596, 10
  %602 = or i1 %600, %601
  br i1 %602, label %originalBB230, label %originalBB230alteredBB

originalBB230:                                    ; preds = %if.then59, %originalBB230alteredBB
  %603 = load ptr, ptr %outputs.addr, align 8
  %vaultPower = getelementptr inbounds %struct.ControllerOutputs, ptr %603, i32 0, i32 8
  store i32 1, ptr %vaultPower, align 4
  %604 = load i32, ptr @x, align 4
  %605 = load i32, ptr @y, align 4
  %606 = sub i32 %604, 1
  %607 = mul i32 %604, %606
  %608 = urem i32 %607, 2
  %609 = icmp eq i32 %608, 0
  %610 = icmp slt i32 %605, 10
  %611 = or i1 %609, %610
  br i1 %611, label %originalBBpart2232, label %originalBB230alteredBB

originalBBpart2232:                               ; preds = %originalBB230
  br label %if.end62

if.else60:                                        ; preds = %originalBBpart2228
  %612 = load i32, ptr @x, align 4
  %613 = load i32, ptr @y, align 4
  %614 = sub i32 %612, 1
  %615 = mul i32 %612, %614
  %616 = urem i32 %615, 2
  %617 = icmp eq i32 %616, 0
  %618 = icmp slt i32 %613, 10
  %619 = or i1 %617, %618
  br i1 %619, label %originalBB234, label %originalBB234alteredBB

originalBB234:                                    ; preds = %if.else60, %originalBB234alteredBB
  %620 = load ptr, ptr %outputs.addr, align 8
  %vaultPower61 = getelementptr inbounds %struct.ControllerOutputs, ptr %620, i32 0, i32 8
  store i32 0, ptr %vaultPower61, align 4
  %621 = load i32, ptr @x, align 4
  %622 = load i32, ptr @y, align 4
  %623 = sub i32 %621, 1
  %624 = mul i32 %621, %623
  %625 = urem i32 %624, 2
  %626 = icmp eq i32 %625, 0
  %627 = icmp slt i32 %622, 10
  %628 = or i1 %626, %627
  br i1 %628, label %originalBBpart2236, label %originalBB234alteredBB

originalBBpart2236:                               ; preds = %originalBB234
  br label %if.end62

if.end62:                                         ; preds = %originalBBpart2236, %originalBBpart2232
  %629 = load i32, ptr @x, align 4
  %630 = load i32, ptr @y, align 4
  %631 = sub i32 %629, 1
  %632 = mul i32 %629, %631
  %633 = urem i32 %632, 2
  %634 = icmp eq i32 %633, 0
  %635 = icmp slt i32 %630, 10
  %636 = or i1 %634, %635
  br i1 %636, label %originalBB238, label %originalBB238alteredBB

originalBB238:                                    ; preds = %if.end62, %originalBB238alteredBB
  %637 = load i32, ptr %vault, align 4
  %tobool63 = icmp ne i32 %637, 0
  %638 = load i32, ptr @x, align 4
  %639 = load i32, ptr @y, align 4
  %640 = sub i32 %638, 1
  %641 = mul i32 %638, %640
  %642 = urem i32 %641, 2
  %643 = icmp eq i32 %642, 0
  %644 = icmp slt i32 %639, 10
  %645 = or i1 %643, %644
  br i1 %645, label %originalBBpart2240, label %originalBB238alteredBB

originalBBpart2240:                               ; preds = %originalBB238
  br i1 %tobool63, label %if.then64, label %if.else65

if.then64:                                        ; preds = %originalBBpart2240
  %646 = load i32, ptr @x, align 4
  %647 = load i32, ptr @y, align 4
  %648 = sub i32 %646, 1
  %649 = mul i32 %646, %648
  %650 = urem i32 %649, 2
  %651 = icmp eq i32 %650, 0
  %652 = icmp slt i32 %647, 10
  %653 = or i1 %651, %652
  br i1 %653, label %originalBB242, label %originalBB242alteredBB

originalBB242:                                    ; preds = %if.then64, %originalBB242alteredBB
  %654 = load ptr, ptr %outputs.addr, align 8
  %vaultReturn = getelementptr inbounds %struct.ControllerOutputs, ptr %654, i32 0, i32 9
  store i32 1, ptr %vaultReturn, align 4
  %655 = load i32, ptr @x, align 4
  %656 = load i32, ptr @y, align 4
  %657 = sub i32 %655, 1
  %658 = mul i32 %655, %657
  %659 = urem i32 %658, 2
  %660 = icmp eq i32 %659, 0
  %661 = icmp slt i32 %656, 10
  %662 = or i1 %660, %661
  br i1 %662, label %originalBBpart2244, label %originalBB242alteredBB

originalBBpart2244:                               ; preds = %originalBB242
  br label %if.end67

if.else65:                                        ; preds = %originalBBpart2240
  %663 = load i32, ptr @x, align 4
  %664 = load i32, ptr @y, align 4
  %665 = sub i32 %663, 1
  %666 = mul i32 %663, %665
  %667 = urem i32 %666, 2
  %668 = icmp eq i32 %667, 0
  %669 = icmp slt i32 %664, 10
  %670 = or i1 %668, %669
  br i1 %670, label %originalBB246, label %originalBB246alteredBB

originalBB246:                                    ; preds = %if.else65, %originalBB246alteredBB
  %671 = load ptr, ptr %outputs.addr, align 8
  %vaultReturn66 = getelementptr inbounds %struct.ControllerOutputs, ptr %671, i32 0, i32 9
  store i32 0, ptr %vaultReturn66, align 4
  %672 = load i32, ptr @x, align 4
  %673 = load i32, ptr @y, align 4
  %674 = sub i32 %672, 1
  %675 = mul i32 %672, %674
  %676 = urem i32 %675, 2
  %677 = icmp eq i32 %676, 0
  %678 = icmp slt i32 %673, 10
  %679 = or i1 %677, %678
  br i1 %679, label %originalBBpart2248, label %originalBB246alteredBB

originalBBpart2248:                               ; preds = %originalBB246
  br label %if.end67

if.end67:                                         ; preds = %originalBBpart2248, %originalBBpart2244
  %680 = load i32, ptr @x, align 4
  %681 = load i32, ptr @y, align 4
  %682 = sub i32 %680, 1
  %683 = mul i32 %680, %682
  %684 = urem i32 %683, 2
  %685 = icmp eq i32 %684, 0
  %686 = icmp slt i32 %681, 10
  %687 = or i1 %685, %686
  br i1 %687, label %originalBB250, label %originalBB250alteredBB

originalBB250:                                    ; preds = %if.end67, %originalBB250alteredBB
  %688 = load ptr, ptr %inputs.addr, align 8
  %exitUnlocked = getelementptr inbounds %struct.ControllerInputs, ptr %688, i32 0, i32 11
  %689 = load i32, ptr %exitUnlocked, align 4
  %tobool68 = icmp ne i32 %689, 0
  %690 = load i32, ptr @x, align 4
  %691 = load i32, ptr @y, align 4
  %692 = sub i32 %690, 1
  %693 = mul i32 %690, %692
  %694 = urem i32 %693, 2
  %695 = icmp eq i32 %694, 0
  %696 = icmp slt i32 %691, 10
  %697 = or i1 %695, %696
  br i1 %697, label %originalBBpart2252, label %originalBB250alteredBB

originalBBpart2252:                               ; preds = %originalBB250
  br i1 %tobool68, label %if.then69, label %if.else70

if.then69:                                        ; preds = %originalBBpart2252
  %698 = load i32, ptr @x, align 4
  %699 = load i32, ptr @y, align 4
  %700 = sub i32 %698, 1
  %701 = mul i32 %698, %700
  %702 = urem i32 %701, 2
  %703 = icmp eq i32 %702, 0
  %704 = icmp slt i32 %699, 10
  %705 = or i1 %703, %704
  br i1 %705, label %originalBB254, label %originalBB254alteredBB

originalBB254:                                    ; preds = %if.then69, %originalBB254alteredBB
  %706 = load ptr, ptr %outputs.addr, align 8
  %exitDoor = getelementptr inbounds %struct.ControllerOutputs, ptr %706, i32 0, i32 10
  store i32 1, ptr %exitDoor, align 4
  %707 = load i32, ptr @x, align 4
  %708 = load i32, ptr @y, align 4
  %709 = sub i32 %707, 1
  %710 = mul i32 %707, %709
  %711 = urem i32 %710, 2
  %712 = icmp eq i32 %711, 0
  %713 = icmp slt i32 %708, 10
  %714 = or i1 %712, %713
  br i1 %714, label %originalBBpart2256, label %originalBB254alteredBB

originalBBpart2256:                               ; preds = %originalBB254
  br label %if.end72

if.else70:                                        ; preds = %originalBBpart2252
  %715 = load i32, ptr @x, align 4
  %716 = load i32, ptr @y, align 4
  %717 = sub i32 %715, 1
  %718 = mul i32 %715, %717
  %719 = urem i32 %718, 2
  %720 = icmp eq i32 %719, 0
  %721 = icmp slt i32 %716, 10
  %722 = or i1 %720, %721
  br i1 %722, label %originalBB258, label %originalBB258alteredBB

originalBB258:                                    ; preds = %if.else70, %originalBB258alteredBB
  %723 = load ptr, ptr %outputs.addr, align 8
  %exitDoor71 = getelementptr inbounds %struct.ControllerOutputs, ptr %723, i32 0, i32 10
  store i32 0, ptr %exitDoor71, align 4
  %724 = load i32, ptr @x, align 4
  %725 = load i32, ptr @y, align 4
  %726 = sub i32 %724, 1
  %727 = mul i32 %724, %726
  %728 = urem i32 %727, 2
  %729 = icmp eq i32 %728, 0
  %730 = icmp slt i32 %725, 10
  %731 = or i1 %729, %730
  br i1 %731, label %originalBBpart2260, label %originalBB258alteredBB

originalBBpart2260:                               ; preds = %originalBB258
  br label %if.end72

if.end72:                                         ; preds = %originalBBpart2260, %originalBBpart2256
  %732 = load i32, ptr @x, align 4
  %733 = load i32, ptr @y, align 4
  %734 = sub i32 %732, 1
  %735 = mul i32 %732, %734
  %736 = urem i32 %735, 2
  %737 = icmp eq i32 %736, 0
  %738 = icmp slt i32 %733, 10
  %739 = or i1 %737, %738
  br i1 %739, label %originalBB262, label %originalBB262alteredBB

originalBB262:                                    ; preds = %if.end72, %originalBB262alteredBB
  %740 = load ptr, ptr %outputs.addr, align 8
  %leftRoute73 = getelementptr inbounds %struct.ControllerOutputs, ptr %740, i32 0, i32 5
  %741 = load i32, ptr %leftRoute73, align 4
  %tobool74 = icmp ne i32 %741, 0
  %742 = load i32, ptr @x, align 4
  %743 = load i32, ptr @y, align 4
  %744 = sub i32 %742, 1
  %745 = mul i32 %742, %744
  %746 = urem i32 %745, 2
  %747 = icmp eq i32 %746, 0
  %748 = icmp slt i32 %743, 10
  %749 = or i1 %747, %748
  br i1 %749, label %originalBBpart2264, label %originalBB262alteredBB

originalBBpart2264:                               ; preds = %originalBB262
  br i1 %tobool74, label %if.then77, label %lor.lhs.false75

lor.lhs.false75:                                  ; preds = %originalBBpart2264
  %750 = load i32, ptr @x, align 4
  %751 = load i32, ptr @y, align 4
  %752 = sub i32 %750, 1
  %753 = mul i32 %750, %752
  %754 = urem i32 %753, 2
  %755 = icmp eq i32 %754, 0
  %756 = icmp slt i32 %751, 10
  %757 = or i1 %755, %756
  br i1 %757, label %originalBB266, label %originalBB266alteredBB

originalBB266:                                    ; preds = %lor.lhs.false75, %originalBB266alteredBB
  %758 = load ptr, ptr %inputs.addr, align 8
  %leftGraceActive = getelementptr inbounds %struct.ControllerInputs, ptr %758, i32 0, i32 12
  %759 = load i32, ptr %leftGraceActive, align 4
  %tobool76 = icmp ne i32 %759, 0
  %760 = load i32, ptr @x, align 4
  %761 = load i32, ptr @y, align 4
  %762 = sub i32 %760, 1
  %763 = mul i32 %760, %762
  %764 = urem i32 %763, 2
  %765 = icmp eq i32 %764, 0
  %766 = icmp slt i32 %761, 10
  %767 = or i1 %765, %766
  br i1 %767, label %originalBBpart2268, label %originalBB266alteredBB

originalBBpart2268:                               ; preds = %originalBB266
  br i1 %tobool76, label %if.then77, label %if.else78

if.then77:                                        ; preds = %originalBBpart2268, %originalBBpart2264
  %768 = load i32, ptr @x, align 4
  %769 = load i32, ptr @y, align 4
  %770 = sub i32 %768, 1
  %771 = mul i32 %768, %770
  %772 = urem i32 %771, 2
  %773 = icmp eq i32 %772, 0
  %774 = icmp slt i32 %769, 10
  %775 = or i1 %773, %774
  br i1 %775, label %originalBB270, label %originalBB270alteredBB

originalBB270:                                    ; preds = %if.then77, %originalBB270alteredBB
  %776 = load ptr, ptr %outputs.addr, align 8
  %physicalLeftRoute = getelementptr inbounds %struct.ControllerOutputs, ptr %776, i32 0, i32 11
  store i32 1, ptr %physicalLeftRoute, align 4
  %777 = load i32, ptr @x, align 4
  %778 = load i32, ptr @y, align 4
  %779 = sub i32 %777, 1
  %780 = mul i32 %777, %779
  %781 = urem i32 %780, 2
  %782 = icmp eq i32 %781, 0
  %783 = icmp slt i32 %778, 10
  %784 = or i1 %782, %783
  br i1 %784, label %originalBBpart2272, label %originalBB270alteredBB

originalBBpart2272:                               ; preds = %originalBB270
  br label %if.end80

if.else78:                                        ; preds = %originalBBpart2268
  %785 = load i32, ptr @x, align 4
  %786 = load i32, ptr @y, align 4
  %787 = sub i32 %785, 1
  %788 = mul i32 %785, %787
  %789 = urem i32 %788, 2
  %790 = icmp eq i32 %789, 0
  %791 = icmp slt i32 %786, 10
  %792 = or i1 %790, %791
  br i1 %792, label %originalBB274, label %originalBB274alteredBB

originalBB274:                                    ; preds = %if.else78, %originalBB274alteredBB
  %793 = load ptr, ptr %outputs.addr, align 8
  %physicalLeftRoute79 = getelementptr inbounds %struct.ControllerOutputs, ptr %793, i32 0, i32 11
  store i32 0, ptr %physicalLeftRoute79, align 4
  %794 = load i32, ptr @x, align 4
  %795 = load i32, ptr @y, align 4
  %796 = sub i32 %794, 1
  %797 = mul i32 %794, %796
  %798 = urem i32 %797, 2
  %799 = icmp eq i32 %798, 0
  %800 = icmp slt i32 %795, 10
  %801 = or i1 %799, %800
  br i1 %801, label %originalBBpart2276, label %originalBB274alteredBB

originalBBpart2276:                               ; preds = %originalBB274
  br label %if.end80

if.end80:                                         ; preds = %originalBBpart2276, %originalBBpart2272
  %802 = load i32, ptr @x, align 4
  %803 = load i32, ptr @y, align 4
  %804 = sub i32 %802, 1
  %805 = mul i32 %802, %804
  %806 = urem i32 %805, 2
  %807 = icmp eq i32 %806, 0
  %808 = icmp slt i32 %803, 10
  %809 = or i1 %807, %808
  br i1 %809, label %originalBB278, label %originalBB278alteredBB

originalBB278:                                    ; preds = %if.end80, %originalBB278alteredBB
  %810 = load ptr, ptr %outputs.addr, align 8
  %rightRoute81 = getelementptr inbounds %struct.ControllerOutputs, ptr %810, i32 0, i32 6
  %811 = load i32, ptr %rightRoute81, align 4
  %tobool82 = icmp ne i32 %811, 0
  %812 = load i32, ptr @x, align 4
  %813 = load i32, ptr @y, align 4
  %814 = sub i32 %812, 1
  %815 = mul i32 %812, %814
  %816 = urem i32 %815, 2
  %817 = icmp eq i32 %816, 0
  %818 = icmp slt i32 %813, 10
  %819 = or i1 %817, %818
  br i1 %819, label %originalBBpart2280, label %originalBB278alteredBB

originalBBpart2280:                               ; preds = %originalBB278
  br i1 %tobool82, label %if.then85, label %lor.lhs.false83

lor.lhs.false83:                                  ; preds = %originalBBpart2280
  %820 = load i32, ptr @x, align 4
  %821 = load i32, ptr @y, align 4
  %822 = sub i32 %820, 1
  %823 = mul i32 %820, %822
  %824 = urem i32 %823, 2
  %825 = icmp eq i32 %824, 0
  %826 = icmp slt i32 %821, 10
  %827 = or i1 %825, %826
  br i1 %827, label %originalBB282, label %originalBB282alteredBB

originalBB282:                                    ; preds = %lor.lhs.false83, %originalBB282alteredBB
  %828 = load ptr, ptr %inputs.addr, align 8
  %rightGraceActive = getelementptr inbounds %struct.ControllerInputs, ptr %828, i32 0, i32 13
  %829 = load i32, ptr %rightGraceActive, align 4
  %tobool84 = icmp ne i32 %829, 0
  %830 = load i32, ptr @x, align 4
  %831 = load i32, ptr @y, align 4
  %832 = sub i32 %830, 1
  %833 = mul i32 %830, %832
  %834 = urem i32 %833, 2
  %835 = icmp eq i32 %834, 0
  %836 = icmp slt i32 %831, 10
  %837 = or i1 %835, %836
  br i1 %837, label %originalBBpart2284, label %originalBB282alteredBB

originalBBpart2284:                               ; preds = %originalBB282
  br i1 %tobool84, label %if.then85, label %if.else86

if.then85:                                        ; preds = %originalBBpart2284, %originalBBpart2280
  %838 = load i32, ptr @x, align 4
  %839 = load i32, ptr @y, align 4
  %840 = sub i32 %838, 1
  %841 = mul i32 %838, %840
  %842 = urem i32 %841, 2
  %843 = icmp eq i32 %842, 0
  %844 = icmp slt i32 %839, 10
  %845 = or i1 %843, %844
  br i1 %845, label %originalBB286, label %originalBB286alteredBB

originalBB286:                                    ; preds = %if.then85, %originalBB286alteredBB
  %846 = load ptr, ptr %outputs.addr, align 8
  %physicalRightRoute = getelementptr inbounds %struct.ControllerOutputs, ptr %846, i32 0, i32 12
  store i32 1, ptr %physicalRightRoute, align 4
  %847 = load i32, ptr @x, align 4
  %848 = load i32, ptr @y, align 4
  %849 = sub i32 %847, 1
  %850 = mul i32 %847, %849
  %851 = urem i32 %850, 2
  %852 = icmp eq i32 %851, 0
  %853 = icmp slt i32 %848, 10
  %854 = or i1 %852, %853
  br i1 %854, label %originalBBpart2288, label %originalBB286alteredBB

originalBBpart2288:                               ; preds = %originalBB286
  br label %if.end88

if.else86:                                        ; preds = %originalBBpart2284
  %855 = load i32, ptr @x, align 4
  %856 = load i32, ptr @y, align 4
  %857 = sub i32 %855, 1
  %858 = mul i32 %855, %857
  %859 = urem i32 %858, 2
  %860 = icmp eq i32 %859, 0
  %861 = icmp slt i32 %856, 10
  %862 = or i1 %860, %861
  br i1 %862, label %originalBB290, label %originalBB290alteredBB

originalBB290:                                    ; preds = %if.else86, %originalBB290alteredBB
  %863 = load ptr, ptr %outputs.addr, align 8
  %physicalRightRoute87 = getelementptr inbounds %struct.ControllerOutputs, ptr %863, i32 0, i32 12
  store i32 0, ptr %physicalRightRoute87, align 4
  %864 = load i32, ptr @x, align 4
  %865 = load i32, ptr @y, align 4
  %866 = sub i32 %864, 1
  %867 = mul i32 %864, %866
  %868 = urem i32 %867, 2
  %869 = icmp eq i32 %868, 0
  %870 = icmp slt i32 %865, 10
  %871 = or i1 %869, %870
  br i1 %871, label %originalBBpart2292, label %originalBB290alteredBB

originalBBpart2292:                               ; preds = %originalBB290
  br label %if.end88

if.end88:                                         ; preds = %originalBBpart2292, %originalBBpart2288
  %872 = load i32, ptr @x, align 4
  %873 = load i32, ptr @y, align 4
  %874 = sub i32 %872, 1
  %875 = mul i32 %872, %874
  %876 = urem i32 %875, 2
  %877 = icmp eq i32 %876, 0
  %878 = icmp slt i32 %873, 10
  %879 = or i1 %877, %878
  br i1 %879, label %originalBB294, label %originalBB294alteredBB

originalBB294:                                    ; preds = %if.end88, %originalBB294alteredBB
  %880 = load i32, ptr %vault, align 4
  %tobool89 = icmp ne i32 %880, 0
  %881 = load i32, ptr @x, align 4
  %882 = load i32, ptr @y, align 4
  %883 = sub i32 %881, 1
  %884 = mul i32 %881, %883
  %885 = urem i32 %884, 2
  %886 = icmp eq i32 %885, 0
  %887 = icmp slt i32 %882, 10
  %888 = or i1 %886, %887
  br i1 %888, label %originalBBpart2296, label %originalBB294alteredBB

originalBBpart2296:                               ; preds = %originalBB294
  br i1 %tobool89, label %land.lhs.true90, label %if.else95

land.lhs.true90:                                  ; preds = %originalBBpart2296
  %889 = load i32, ptr @x, align 4
  %890 = load i32, ptr @y, align 4
  %891 = sub i32 %889, 1
  %892 = mul i32 %889, %891
  %893 = urem i32 %892, 2
  %894 = icmp eq i32 %893, 0
  %895 = icmp slt i32 %890, 10
  %896 = or i1 %894, %895
  br i1 %896, label %originalBB298, label %originalBB298alteredBB

originalBB298:                                    ; preds = %land.lhs.true90, %originalBB298alteredBB
  %897 = load ptr, ptr %inputs.addr, align 8
  %finalPlateLeftOccupied = getelementptr inbounds %struct.ControllerInputs, ptr %897, i32 0, i32 9
  %898 = load i32, ptr %finalPlateLeftOccupied, align 4
  %tobool91 = icmp ne i32 %898, 0
  %899 = load i32, ptr @x, align 4
  %900 = load i32, ptr @y, align 4
  %901 = sub i32 %899, 1
  %902 = mul i32 %899, %901
  %903 = urem i32 %902, 2
  %904 = icmp eq i32 %903, 0
  %905 = icmp slt i32 %900, 10
  %906 = or i1 %904, %905
  br i1 %906, label %originalBBpart2300, label %originalBB298alteredBB

originalBBpart2300:                               ; preds = %originalBB298
  br i1 %tobool91, label %land.lhs.true92, label %if.else95

land.lhs.true92:                                  ; preds = %originalBBpart2300
  %907 = load i32, ptr @x, align 4
  %908 = load i32, ptr @y, align 4
  %909 = sub i32 %907, 1
  %910 = mul i32 %907, %909
  %911 = urem i32 %910, 2
  %912 = icmp eq i32 %911, 0
  %913 = icmp slt i32 %908, 10
  %914 = or i1 %912, %913
  br i1 %914, label %originalBB302, label %originalBB302alteredBB

originalBB302:                                    ; preds = %land.lhs.true92, %originalBB302alteredBB
  %915 = load ptr, ptr %inputs.addr, align 8
  %finalPlateRightOccupied = getelementptr inbounds %struct.ControllerInputs, ptr %915, i32 0, i32 10
  %916 = load i32, ptr %finalPlateRightOccupied, align 4
  %tobool93 = icmp ne i32 %916, 0
  %917 = load i32, ptr @x, align 4
  %918 = load i32, ptr @y, align 4
  %919 = sub i32 %917, 1
  %920 = mul i32 %917, %919
  %921 = urem i32 %920, 2
  %922 = icmp eq i32 %921, 0
  %923 = icmp slt i32 %918, 10
  %924 = or i1 %922, %923
  br i1 %924, label %originalBBpart2304, label %originalBB302alteredBB

originalBBpart2304:                               ; preds = %originalBB302
  br i1 %tobool93, label %if.then94, label %if.else95

if.then94:                                        ; preds = %originalBBpart2304
  %925 = load i32, ptr @x, align 4
  %926 = load i32, ptr @y, align 4
  %927 = sub i32 %925, 1
  %928 = mul i32 %925, %927
  %929 = urem i32 %928, 2
  %930 = icmp eq i32 %929, 0
  %931 = icmp slt i32 %926, 10
  %932 = or i1 %930, %931
  br i1 %932, label %originalBB306, label %originalBB306alteredBB

originalBB306:                                    ; preds = %if.then94, %originalBB306alteredBB
  %933 = load ptr, ptr %outputs.addr, align 8
  %exitUnlockCandidate = getelementptr inbounds %struct.ControllerOutputs, ptr %933, i32 0, i32 13
  store i32 1, ptr %exitUnlockCandidate, align 4
  %934 = load i32, ptr @x, align 4
  %935 = load i32, ptr @y, align 4
  %936 = sub i32 %934, 1
  %937 = mul i32 %934, %936
  %938 = urem i32 %937, 2
  %939 = icmp eq i32 %938, 0
  %940 = icmp slt i32 %935, 10
  %941 = or i1 %939, %940
  br i1 %941, label %originalBBpart2308, label %originalBB306alteredBB

originalBBpart2308:                               ; preds = %originalBB306
  br label %if.end97

if.else95:                                        ; preds = %originalBBpart2304, %originalBBpart2300, %originalBBpart2296
  %942 = load i32, ptr @x, align 4
  %943 = load i32, ptr @y, align 4
  %944 = sub i32 %942, 1
  %945 = mul i32 %942, %944
  %946 = urem i32 %945, 2
  %947 = icmp eq i32 %946, 0
  %948 = icmp slt i32 %943, 10
  %949 = or i1 %947, %948
  br i1 %949, label %originalBB310, label %originalBB310alteredBB

originalBB310:                                    ; preds = %if.else95, %originalBB310alteredBB
  %950 = load ptr, ptr %outputs.addr, align 8
  %exitUnlockCandidate96 = getelementptr inbounds %struct.ControllerOutputs, ptr %950, i32 0, i32 13
  store i32 0, ptr %exitUnlockCandidate96, align 4
  %951 = load i32, ptr @x, align 4
  %952 = load i32, ptr @y, align 4
  %953 = sub i32 %951, 1
  %954 = mul i32 %951, %953
  %955 = urem i32 %954, 2
  %956 = icmp eq i32 %955, 0
  %957 = icmp slt i32 %952, 10
  %958 = or i1 %956, %957
  br i1 %958, label %originalBBpart2312, label %originalBB310alteredBB

originalBBpart2312:                               ; preds = %originalBB310
  br label %if.end97

if.end97:                                         ; preds = %originalBBpart2312, %originalBBpart2308
  %959 = load i32, ptr @x, align 4
  %960 = load i32, ptr @y, align 4
  %961 = sub i32 %959, 1
  %962 = mul i32 %959, %961
  %963 = urem i32 %962, 2
  %964 = icmp eq i32 %963, 0
  %965 = icmp slt i32 %960, 10
  %966 = or i1 %964, %965
  br i1 %966, label %originalBB314, label %originalBB314alteredBB

originalBB314:                                    ; preds = %if.end97, %originalBB314alteredBB
  %967 = load i32, ptr @x, align 4
  %968 = load i32, ptr @y, align 4
  %969 = sub i32 %967, 1
  %970 = mul i32 %967, %969
  %971 = urem i32 %970, 2
  %972 = icmp eq i32 %971, 0
  %973 = icmp slt i32 %968, 10
  %974 = or i1 %972, %973
  br i1 %974, label %originalBBpart2316, label %originalBB314alteredBB

originalBBpart2316:                               ; preds = %originalBB314
  ret void

originalBBalteredBB:                              ; preds = %originalBB, %entry
  %outputs.addralteredBB = alloca ptr, align 8
  %inputs.addralteredBB = alloca ptr, align 8
  %masteralteredBB = alloca i32, align 4
  %vaultalteredBB = alloca i32, align 4
  store ptr %outputs, ptr %outputs.addralteredBB, align 8
  store ptr %inputs, ptr %inputs.addralteredBB, align 8
  %975 = load ptr, ptr %inputs.addralteredBB, align 8
  %switchCalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %975, i32 0, i32 1
  %976 = load i32, ptr %switchCalteredBB, align 4
  %toboolalteredBB = icmp ne i32 %976, 0
  br label %originalBB

originalBB98alteredBB:                            ; preds = %originalBB98, %land.rhs
  %977 = load ptr, ptr %inputs.addr, align 8
  %routePowerOccupiedalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %977, i32 0, i32 5
  %978 = load i32, ptr %routePowerOccupiedalteredBB, align 4
  %tobool1alteredBB = icmp ne i32 %978, 0
  br label %originalBB98

originalBB102alteredBB:                           ; preds = %originalBB102, %land.end
  %land.extalteredBB = zext i1 %36 to i32
  store i32 %land.extalteredBB, ptr %master, align 4
  %979 = load ptr, ptr %inputs.addr, align 8
  %cubeOnFinalLeftalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %979, i32 0, i32 7
  %980 = load i32, ptr %cubeOnFinalLeftalteredBB, align 4
  %tobool2alteredBB = icmp ne i32 %980, 0
  br label %originalBB102

originalBB106alteredBB:                           ; preds = %originalBB106, %land.rhs3
  %981 = load ptr, ptr %inputs.addr, align 8
  %cubeOnFinalRightalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %981, i32 0, i32 8
  %982 = load i32, ptr %cubeOnFinalRightalteredBB, align 4
  %tobool4alteredBB = icmp ne i32 %982, 0
  br label %originalBB106

originalBB110alteredBB:                           ; preds = %originalBB110, %land.end5
  %land.ext6alteredBB = zext i1 %73 to i32
  store i32 %land.ext6alteredBB, ptr %vault, align 4
  %983 = load ptr, ptr %inputs.addr, align 8
  %plateAOccupiedalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %983, i32 0, i32 4
  %984 = load i32, ptr %plateAOccupiedalteredBB, align 4
  %tobool7alteredBB = icmp ne i32 %984, 0
  br label %originalBB110

originalBB114alteredBB:                           ; preds = %originalBB114, %land.lhs.true
  %985 = load ptr, ptr %inputs.addr, align 8
  %switchBalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %985, i32 0, i32 0
  %986 = load i32, ptr %switchBalteredBB, align 4
  %tobool8alteredBB = icmp ne i32 %986, 0
  br label %originalBB114

originalBB118alteredBB:                           ; preds = %originalBB118, %if.then
  %987 = load ptr, ptr %outputs.addr, align 8
  %grappleAnchoralteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %987, i32 0, i32 0
  store i32 1, ptr %grappleAnchoralteredBB, align 4
  br label %originalBB118

originalBB122alteredBB:                           ; preds = %originalBB122, %if.else
  %988 = load ptr, ptr %outputs.addr, align 8
  %grappleAnchor9alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %988, i32 0, i32 0
  store i32 0, ptr %grappleAnchor9alteredBB, align 4
  br label %originalBB122

originalBB126alteredBB:                           ; preds = %originalBB126, %if.end
  %989 = load ptr, ptr %inputs.addr, align 8
  %switchB10alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %989, i32 0, i32 0
  %990 = load i32, ptr %switchB10alteredBB, align 4
  %tobool11alteredBB = icmp ne i32 %990, 0
  br label %originalBB126

originalBB130alteredBB:                           ; preds = %originalBB130, %if.then12
  %991 = load ptr, ptr %outputs.addr, align 8
  %bridgealteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %991, i32 0, i32 1
  store i32 1, ptr %bridgealteredBB, align 4
  br label %originalBB130

originalBB134alteredBB:                           ; preds = %originalBB134, %if.else13
  %992 = load ptr, ptr %outputs.addr, align 8
  %bridge14alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %992, i32 0, i32 1
  store i32 0, ptr %bridge14alteredBB, align 4
  br label %originalBB134

originalBB138alteredBB:                           ; preds = %originalBB138, %if.end15
  %993 = load ptr, ptr %inputs.addr, align 8
  %cubeOnLiftCargoalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %993, i32 0, i32 6
  %994 = load i32, ptr %cubeOnLiftCargoalteredBB, align 4
  %tobool16alteredBB = icmp ne i32 %994, 0
  br label %originalBB138

originalBB142alteredBB:                           ; preds = %originalBB142, %lor.lhs.false
  %995 = load ptr, ptr %inputs.addr, align 8
  %switchC17alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %995, i32 0, i32 1
  %996 = load i32, ptr %switchC17alteredBB, align 4
  %tobool18alteredBB = icmp ne i32 %996, 0
  br label %originalBB142

originalBB146alteredBB:                           ; preds = %originalBB146, %if.then19
  %997 = load ptr, ptr %outputs.addr, align 8
  %liftFieldalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %997, i32 0, i32 2
  store i32 1, ptr %liftFieldalteredBB, align 4
  br label %originalBB146

originalBB150alteredBB:                           ; preds = %originalBB150, %if.else20
  %998 = load ptr, ptr %outputs.addr, align 8
  %liftField21alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %998, i32 0, i32 2
  store i32 0, ptr %liftField21alteredBB, align 4
  br label %originalBB150

originalBB154alteredBB:                           ; preds = %originalBB154, %if.end22
  %999 = load ptr, ptr %inputs.addr, align 8
  %switchC23alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %999, i32 0, i32 1
  %1000 = load i32, ptr %switchC23alteredBB, align 4
  %tobool24alteredBB = icmp ne i32 %1000, 0
  br label %originalBB154

originalBB158alteredBB:                           ; preds = %originalBB158, %if.then25
  %1001 = load ptr, ptr %outputs.addr, align 8
  %serviceAccessalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1001, i32 0, i32 3
  store i32 1, ptr %serviceAccessalteredBB, align 4
  br label %originalBB158

originalBB162alteredBB:                           ; preds = %originalBB162, %if.else26
  %1002 = load ptr, ptr %outputs.addr, align 8
  %serviceAccess27alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1002, i32 0, i32 3
  store i32 0, ptr %serviceAccess27alteredBB, align 4
  br label %originalBB162

originalBB166alteredBB:                           ; preds = %originalBB166, %if.end28
  %1003 = load ptr, ptr %inputs.addr, align 8
  %switchC29alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %1003, i32 0, i32 1
  %1004 = load i32, ptr %switchC29alteredBB, align 4
  %tobool30alteredBB = icmp ne i32 %1004, 0
  br label %originalBB166

originalBB170alteredBB:                           ; preds = %originalBB170, %land.lhs.true31
  %1005 = load ptr, ptr %inputs.addr, align 8
  %switchB32alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %1005, i32 0, i32 0
  %1006 = load i32, ptr %switchB32alteredBB, align 4
  %tobool33alteredBB = icmp ne i32 %1006, 0
  br label %originalBB170

originalBB174alteredBB:                           ; preds = %originalBB174, %if.then34
  %1007 = load ptr, ptr %outputs.addr, align 8
  %relayGatesalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1007, i32 0, i32 4
  store i32 1, ptr %relayGatesalteredBB, align 4
  br label %originalBB174

originalBB178alteredBB:                           ; preds = %originalBB178, %if.else35
  %1008 = load ptr, ptr %outputs.addr, align 8
  %relayGates36alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1008, i32 0, i32 4
  store i32 0, ptr %relayGates36alteredBB, align 4
  br label %originalBB178

originalBB182alteredBB:                           ; preds = %originalBB182, %if.end37
  %1009 = load i32, ptr %master, align 4
  %tobool38alteredBB = icmp ne i32 %1009, 0
  br label %originalBB182

originalBB186alteredBB:                           ; preds = %originalBB186, %land.lhs.true39
  %1010 = load ptr, ptr %inputs.addr, align 8
  %routeModealteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %1010, i32 0, i32 3
  %1011 = load i32, ptr %routeModealteredBB, align 4
  %tobool40alteredBB = icmp ne i32 %1011, 0
  br label %originalBB186

originalBB190alteredBB:                           ; preds = %originalBB190, %if.then41
  %1012 = load ptr, ptr %outputs.addr, align 8
  %leftRoutealteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1012, i32 0, i32 5
  store i32 1, ptr %leftRoutealteredBB, align 4
  br label %originalBB190

originalBB194alteredBB:                           ; preds = %originalBB194, %if.else42
  %1013 = load ptr, ptr %outputs.addr, align 8
  %leftRoute43alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1013, i32 0, i32 5
  store i32 0, ptr %leftRoute43alteredBB, align 4
  br label %originalBB194

originalBB198alteredBB:                           ; preds = %originalBB198, %if.end44
  %1014 = load i32, ptr %master, align 4
  %tobool45alteredBB = icmp ne i32 %1014, 0
  br label %originalBB198

originalBB202alteredBB:                           ; preds = %originalBB202, %land.lhs.true46
  %1015 = load ptr, ptr %inputs.addr, align 8
  %routeMode47alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %1015, i32 0, i32 3
  %1016 = load i32, ptr %routeMode47alteredBB, align 4
  %tobool48alteredBB = icmp ne i32 %1016, 0
  br label %originalBB202

originalBB206alteredBB:                           ; preds = %originalBB206, %if.then49
  %1017 = load ptr, ptr %outputs.addr, align 8
  %rightRoutealteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1017, i32 0, i32 6
  store i32 1, ptr %rightRoutealteredBB, align 4
  br label %originalBB206

originalBB210alteredBB:                           ; preds = %originalBB210, %if.else50
  %1018 = load ptr, ptr %outputs.addr, align 8
  %rightRoute51alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1018, i32 0, i32 6
  store i32 0, ptr %rightRoute51alteredBB, align 4
  br label %originalBB210

originalBB214alteredBB:                           ; preds = %originalBB214, %if.end52
  %1019 = load ptr, ptr %inputs.addr, align 8
  %switchDalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %1019, i32 0, i32 2
  %1020 = load i32, ptr %switchDalteredBB, align 4
  %tobool53alteredBB = icmp ne i32 %1020, 0
  br label %originalBB214

originalBB218alteredBB:                           ; preds = %originalBB218, %if.then54
  %1021 = load ptr, ptr %outputs.addr, align 8
  %galleryAccessalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1021, i32 0, i32 7
  store i32 1, ptr %galleryAccessalteredBB, align 4
  br label %originalBB218

originalBB222alteredBB:                           ; preds = %originalBB222, %if.else55
  %1022 = load ptr, ptr %outputs.addr, align 8
  %galleryAccess56alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1022, i32 0, i32 7
  store i32 0, ptr %galleryAccess56alteredBB, align 4
  br label %originalBB222

originalBB226alteredBB:                           ; preds = %originalBB226, %if.end57
  %1023 = load i32, ptr %vault, align 4
  %tobool58alteredBB = icmp ne i32 %1023, 0
  br label %originalBB226

originalBB230alteredBB:                           ; preds = %originalBB230, %if.then59
  %1024 = load ptr, ptr %outputs.addr, align 8
  %vaultPoweralteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1024, i32 0, i32 8
  store i32 1, ptr %vaultPoweralteredBB, align 4
  br label %originalBB230

originalBB234alteredBB:                           ; preds = %originalBB234, %if.else60
  %1025 = load ptr, ptr %outputs.addr, align 8
  %vaultPower61alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1025, i32 0, i32 8
  store i32 0, ptr %vaultPower61alteredBB, align 4
  br label %originalBB234

originalBB238alteredBB:                           ; preds = %originalBB238, %if.end62
  %1026 = load i32, ptr %vault, align 4
  %tobool63alteredBB = icmp ne i32 %1026, 0
  br label %originalBB238

originalBB242alteredBB:                           ; preds = %originalBB242, %if.then64
  %1027 = load ptr, ptr %outputs.addr, align 8
  %vaultReturnalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1027, i32 0, i32 9
  store i32 1, ptr %vaultReturnalteredBB, align 4
  br label %originalBB242

originalBB246alteredBB:                           ; preds = %originalBB246, %if.else65
  %1028 = load ptr, ptr %outputs.addr, align 8
  %vaultReturn66alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1028, i32 0, i32 9
  store i32 0, ptr %vaultReturn66alteredBB, align 4
  br label %originalBB246

originalBB250alteredBB:                           ; preds = %originalBB250, %if.end67
  %1029 = load ptr, ptr %inputs.addr, align 8
  %exitUnlockedalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %1029, i32 0, i32 11
  %1030 = load i32, ptr %exitUnlockedalteredBB, align 4
  %tobool68alteredBB = icmp ne i32 %1030, 0
  br label %originalBB250

originalBB254alteredBB:                           ; preds = %originalBB254, %if.then69
  %1031 = load ptr, ptr %outputs.addr, align 8
  %exitDooralteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1031, i32 0, i32 10
  store i32 1, ptr %exitDooralteredBB, align 4
  br label %originalBB254

originalBB258alteredBB:                           ; preds = %originalBB258, %if.else70
  %1032 = load ptr, ptr %outputs.addr, align 8
  %exitDoor71alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1032, i32 0, i32 10
  store i32 0, ptr %exitDoor71alteredBB, align 4
  br label %originalBB258

originalBB262alteredBB:                           ; preds = %originalBB262, %if.end72
  %1033 = load ptr, ptr %outputs.addr, align 8
  %leftRoute73alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1033, i32 0, i32 5
  %1034 = load i32, ptr %leftRoute73alteredBB, align 4
  %tobool74alteredBB = icmp ne i32 %1034, 0
  br label %originalBB262

originalBB266alteredBB:                           ; preds = %originalBB266, %lor.lhs.false75
  %1035 = load ptr, ptr %inputs.addr, align 8
  %leftGraceActivealteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %1035, i32 0, i32 12
  %1036 = load i32, ptr %leftGraceActivealteredBB, align 4
  %tobool76alteredBB = icmp ne i32 %1036, 0
  br label %originalBB266

originalBB270alteredBB:                           ; preds = %originalBB270, %if.then77
  %1037 = load ptr, ptr %outputs.addr, align 8
  %physicalLeftRoutealteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1037, i32 0, i32 11
  store i32 1, ptr %physicalLeftRoutealteredBB, align 4
  br label %originalBB270

originalBB274alteredBB:                           ; preds = %originalBB274, %if.else78
  %1038 = load ptr, ptr %outputs.addr, align 8
  %physicalLeftRoute79alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1038, i32 0, i32 11
  store i32 0, ptr %physicalLeftRoute79alteredBB, align 4
  br label %originalBB274

originalBB278alteredBB:                           ; preds = %originalBB278, %if.end80
  %1039 = load ptr, ptr %outputs.addr, align 8
  %rightRoute81alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1039, i32 0, i32 6
  %1040 = load i32, ptr %rightRoute81alteredBB, align 4
  %tobool82alteredBB = icmp ne i32 %1040, 0
  br label %originalBB278

originalBB282alteredBB:                           ; preds = %originalBB282, %lor.lhs.false83
  %1041 = load ptr, ptr %inputs.addr, align 8
  %rightGraceActivealteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %1041, i32 0, i32 13
  %1042 = load i32, ptr %rightGraceActivealteredBB, align 4
  %tobool84alteredBB = icmp ne i32 %1042, 0
  br label %originalBB282

originalBB286alteredBB:                           ; preds = %originalBB286, %if.then85
  %1043 = load ptr, ptr %outputs.addr, align 8
  %physicalRightRoutealteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1043, i32 0, i32 12
  store i32 1, ptr %physicalRightRoutealteredBB, align 4
  br label %originalBB286

originalBB290alteredBB:                           ; preds = %originalBB290, %if.else86
  %1044 = load ptr, ptr %outputs.addr, align 8
  %physicalRightRoute87alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1044, i32 0, i32 12
  store i32 0, ptr %physicalRightRoute87alteredBB, align 4
  br label %originalBB290

originalBB294alteredBB:                           ; preds = %originalBB294, %if.end88
  %1045 = load i32, ptr %vault, align 4
  %tobool89alteredBB = icmp ne i32 %1045, 0
  br label %originalBB294

originalBB298alteredBB:                           ; preds = %originalBB298, %land.lhs.true90
  %1046 = load ptr, ptr %inputs.addr, align 8
  %finalPlateLeftOccupiedalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %1046, i32 0, i32 9
  %1047 = load i32, ptr %finalPlateLeftOccupiedalteredBB, align 4
  %tobool91alteredBB = icmp ne i32 %1047, 0
  br label %originalBB298

originalBB302alteredBB:                           ; preds = %originalBB302, %land.lhs.true92
  %1048 = load ptr, ptr %inputs.addr, align 8
  %finalPlateRightOccupiedalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %1048, i32 0, i32 10
  %1049 = load i32, ptr %finalPlateRightOccupiedalteredBB, align 4
  %tobool93alteredBB = icmp ne i32 %1049, 0
  br label %originalBB302

originalBB306alteredBB:                           ; preds = %originalBB306, %if.then94
  %1050 = load ptr, ptr %outputs.addr, align 8
  %exitUnlockCandidatealteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1050, i32 0, i32 13
  store i32 1, ptr %exitUnlockCandidatealteredBB, align 4
  br label %originalBB306

originalBB310alteredBB:                           ; preds = %originalBB310, %if.else95
  %1051 = load ptr, ptr %outputs.addr, align 8
  %exitUnlockCandidate96alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %1051, i32 0, i32 13
  store i32 0, ptr %exitUnlockCandidate96alteredBB, align 4
  br label %originalBB310

originalBB314alteredBB:                           ; preds = %originalBB314, %if.end97
  br label %originalBB314
}

attributes #0 = { noinline nounwind optnone uwtable "min-legal-vector-width"="0" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }

!llvm.module.flags = !{!0, !1, !2}
!llvm.ident = !{!3}

!0 = !{i32 1, !"wchar_size", i32 2}
!1 = !{i32 8, !"PIC Level", i32 2}
!2 = !{i32 7, !"uwtable", i32 2}
!3 = !{!"clang version 16.0.6 (https://github.com/llvm/llvm-project.git 7cbf1a2591520c2491aa35339f227775f4d3adf6)"}
