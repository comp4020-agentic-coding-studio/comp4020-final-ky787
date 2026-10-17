; ModuleID = 'E:\Workspace\binary_binja_redesign\comp4020-final-ky787\experiments\coop-controllers\use-after-free\src\controller.c'
source_filename = "E:\\Workspace\\binary_binja_redesign\\comp4020-final-ky787\\experiments\\coop-controllers\\use-after-free\\src\\controller.c"
target datalayout = "e-m:w-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-windows-msvc19.51.36248"

%struct.ControllerInputs = type { i32, i32, i32, i32, i32 }
%struct.ControllerOutputs = type { i32, i32, i32, i32, i32, i32 }

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
  %launch = getelementptr inbounds %struct.ControllerInputs, ptr %8, i32 0, i32 0
  %9 = load i32, ptr %launch, align 4
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
  br i1 %25, label %originalBB36, label %originalBB36alteredBB

originalBB36:                                     ; preds = %if.then, %originalBB36alteredBB
  %26 = load ptr, ptr %outputs.addr, align 8
  %launchPower = getelementptr inbounds %struct.ControllerOutputs, ptr %26, i32 0, i32 0
  store i32 1, ptr %launchPower, align 4
  %27 = load i32, ptr @x, align 4
  %28 = load i32, ptr @y, align 4
  %29 = sub i32 %27, 1
  %30 = mul i32 %27, %29
  %31 = urem i32 %30, 2
  %32 = icmp eq i32 %31, 0
  %33 = icmp slt i32 %28, 10
  %34 = or i1 %32, %33
  br i1 %34, label %originalBBpart238, label %originalBB36alteredBB

originalBBpart238:                                ; preds = %originalBB36
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
  br i1 %42, label %originalBB40, label %originalBB40alteredBB

originalBB40:                                     ; preds = %if.else, %originalBB40alteredBB
  %43 = load ptr, ptr %outputs.addr, align 8
  %launchPower1 = getelementptr inbounds %struct.ControllerOutputs, ptr %43, i32 0, i32 0
  store i32 0, ptr %launchPower1, align 4
  %44 = load i32, ptr @x, align 4
  %45 = load i32, ptr @y, align 4
  %46 = sub i32 %44, 1
  %47 = mul i32 %44, %46
  %48 = urem i32 %47, 2
  %49 = icmp eq i32 %48, 0
  %50 = icmp slt i32 %45, 10
  %51 = or i1 %49, %50
  br i1 %51, label %originalBBpart242, label %originalBB40alteredBB

originalBBpart242:                                ; preds = %originalBB40
  br label %if.end

if.end:                                           ; preds = %originalBBpart242, %originalBBpart238
  %52 = load i32, ptr @x, align 4
  %53 = load i32, ptr @y, align 4
  %54 = sub i32 %52, 1
  %55 = mul i32 %52, %54
  %56 = urem i32 %55, 2
  %57 = icmp eq i32 %56, 0
  %58 = icmp slt i32 %53, 10
  %59 = or i1 %57, %58
  br i1 %59, label %originalBB44, label %originalBB44alteredBB

originalBB44:                                     ; preds = %if.end, %originalBB44alteredBB
  %60 = load ptr, ptr %inputs.addr, align 8
  %plateA = getelementptr inbounds %struct.ControllerInputs, ptr %60, i32 0, i32 1
  %61 = load i32, ptr %plateA, align 4
  %tobool2 = icmp ne i32 %61, 0
  %62 = load i32, ptr @x, align 4
  %63 = load i32, ptr @y, align 4
  %64 = sub i32 %62, 1
  %65 = mul i32 %62, %64
  %66 = urem i32 %65, 2
  %67 = icmp eq i32 %66, 0
  %68 = icmp slt i32 %63, 10
  %69 = or i1 %67, %68
  br i1 %69, label %originalBBpart246, label %originalBB44alteredBB

originalBBpart246:                                ; preds = %originalBB44
  br i1 %tobool2, label %if.then3, label %if.else4

if.then3:                                         ; preds = %originalBBpart246
  %70 = load i32, ptr @x, align 4
  %71 = load i32, ptr @y, align 4
  %72 = sub i32 %70, 1
  %73 = mul i32 %70, %72
  %74 = urem i32 %73, 2
  %75 = icmp eq i32 %74, 0
  %76 = icmp slt i32 %71, 10
  %77 = or i1 %75, %76
  br i1 %77, label %originalBB48, label %originalBB48alteredBB

originalBB48:                                     ; preds = %if.then3, %originalBB48alteredBB
  %78 = load ptr, ptr %outputs.addr, align 8
  %routeA = getelementptr inbounds %struct.ControllerOutputs, ptr %78, i32 0, i32 1
  store i32 1, ptr %routeA, align 4
  %79 = load i32, ptr @x, align 4
  %80 = load i32, ptr @y, align 4
  %81 = sub i32 %79, 1
  %82 = mul i32 %79, %81
  %83 = urem i32 %82, 2
  %84 = icmp eq i32 %83, 0
  %85 = icmp slt i32 %80, 10
  %86 = or i1 %84, %85
  br i1 %86, label %originalBBpart250, label %originalBB48alteredBB

originalBBpart250:                                ; preds = %originalBB48
  br label %if.end6

if.else4:                                         ; preds = %originalBBpart246
  %87 = load i32, ptr @x, align 4
  %88 = load i32, ptr @y, align 4
  %89 = sub i32 %87, 1
  %90 = mul i32 %87, %89
  %91 = urem i32 %90, 2
  %92 = icmp eq i32 %91, 0
  %93 = icmp slt i32 %88, 10
  %94 = or i1 %92, %93
  br i1 %94, label %originalBB52, label %originalBB52alteredBB

originalBB52:                                     ; preds = %if.else4, %originalBB52alteredBB
  %95 = load ptr, ptr %outputs.addr, align 8
  %routeA5 = getelementptr inbounds %struct.ControllerOutputs, ptr %95, i32 0, i32 1
  store i32 0, ptr %routeA5, align 4
  %96 = load i32, ptr @x, align 4
  %97 = load i32, ptr @y, align 4
  %98 = sub i32 %96, 1
  %99 = mul i32 %96, %98
  %100 = urem i32 %99, 2
  %101 = icmp eq i32 %100, 0
  %102 = icmp slt i32 %97, 10
  %103 = or i1 %101, %102
  br i1 %103, label %originalBBpart254, label %originalBB52alteredBB

originalBBpart254:                                ; preds = %originalBB52
  br label %if.end6

if.end6:                                          ; preds = %originalBBpart254, %originalBBpart250
  %104 = load i32, ptr @x, align 4
  %105 = load i32, ptr @y, align 4
  %106 = sub i32 %104, 1
  %107 = mul i32 %104, %106
  %108 = urem i32 %107, 2
  %109 = icmp eq i32 %108, 0
  %110 = icmp slt i32 %105, 10
  %111 = or i1 %109, %110
  br i1 %111, label %originalBB56, label %originalBB56alteredBB

originalBB56:                                     ; preds = %if.end6, %originalBB56alteredBB
  %112 = load ptr, ptr %inputs.addr, align 8
  %plateB = getelementptr inbounds %struct.ControllerInputs, ptr %112, i32 0, i32 2
  %113 = load i32, ptr %plateB, align 4
  %tobool7 = icmp ne i32 %113, 0
  %114 = load i32, ptr @x, align 4
  %115 = load i32, ptr @y, align 4
  %116 = sub i32 %114, 1
  %117 = mul i32 %114, %116
  %118 = urem i32 %117, 2
  %119 = icmp eq i32 %118, 0
  %120 = icmp slt i32 %115, 10
  %121 = or i1 %119, %120
  br i1 %121, label %originalBBpart258, label %originalBB56alteredBB

originalBBpart258:                                ; preds = %originalBB56
  br i1 %tobool7, label %land.lhs.true, label %if.else11

land.lhs.true:                                    ; preds = %originalBBpart258
  %122 = load i32, ptr @x, align 4
  %123 = load i32, ptr @y, align 4
  %124 = sub i32 %122, 1
  %125 = mul i32 %122, %124
  %126 = urem i32 %125, 2
  %127 = icmp eq i32 %126, 0
  %128 = icmp slt i32 %123, 10
  %129 = or i1 %127, %128
  br i1 %129, label %originalBB60, label %originalBB60alteredBB

originalBB60:                                     ; preds = %land.lhs.true, %originalBB60alteredBB
  %130 = load ptr, ptr %inputs.addr, align 8
  %plateA8 = getelementptr inbounds %struct.ControllerInputs, ptr %130, i32 0, i32 1
  %131 = load i32, ptr %plateA8, align 4
  %tobool9 = icmp ne i32 %131, 0
  %132 = load i32, ptr @x, align 4
  %133 = load i32, ptr @y, align 4
  %134 = sub i32 %132, 1
  %135 = mul i32 %132, %134
  %136 = urem i32 %135, 2
  %137 = icmp eq i32 %136, 0
  %138 = icmp slt i32 %133, 10
  %139 = or i1 %137, %138
  br i1 %139, label %originalBBpart262, label %originalBB60alteredBB

originalBBpart262:                                ; preds = %originalBB60
  br i1 %tobool9, label %if.else11, label %if.then10

if.then10:                                        ; preds = %originalBBpart262
  %140 = load i32, ptr @x, align 4
  %141 = load i32, ptr @y, align 4
  %142 = sub i32 %140, 1
  %143 = mul i32 %140, %142
  %144 = urem i32 %143, 2
  %145 = icmp eq i32 %144, 0
  %146 = icmp slt i32 %141, 10
  %147 = or i1 %145, %146
  br i1 %147, label %originalBB64, label %originalBB64alteredBB

originalBB64:                                     ; preds = %if.then10, %originalBB64alteredBB
  %148 = load ptr, ptr %outputs.addr, align 8
  %routeB = getelementptr inbounds %struct.ControllerOutputs, ptr %148, i32 0, i32 2
  store i32 1, ptr %routeB, align 4
  %149 = load i32, ptr @x, align 4
  %150 = load i32, ptr @y, align 4
  %151 = sub i32 %149, 1
  %152 = mul i32 %149, %151
  %153 = urem i32 %152, 2
  %154 = icmp eq i32 %153, 0
  %155 = icmp slt i32 %150, 10
  %156 = or i1 %154, %155
  br i1 %156, label %originalBBpart266, label %originalBB64alteredBB

originalBBpart266:                                ; preds = %originalBB64
  br label %if.end13

if.else11:                                        ; preds = %originalBBpart262, %originalBBpart258
  %157 = load i32, ptr @x, align 4
  %158 = load i32, ptr @y, align 4
  %159 = sub i32 %157, 1
  %160 = mul i32 %157, %159
  %161 = urem i32 %160, 2
  %162 = icmp eq i32 %161, 0
  %163 = icmp slt i32 %158, 10
  %164 = or i1 %162, %163
  br i1 %164, label %originalBB68, label %originalBB68alteredBB

originalBB68:                                     ; preds = %if.else11, %originalBB68alteredBB
  %165 = load ptr, ptr %outputs.addr, align 8
  %routeB12 = getelementptr inbounds %struct.ControllerOutputs, ptr %165, i32 0, i32 2
  store i32 0, ptr %routeB12, align 4
  %166 = load i32, ptr @x, align 4
  %167 = load i32, ptr @y, align 4
  %168 = sub i32 %166, 1
  %169 = mul i32 %166, %168
  %170 = urem i32 %169, 2
  %171 = icmp eq i32 %170, 0
  %172 = icmp slt i32 %167, 10
  %173 = or i1 %171, %172
  br i1 %173, label %originalBBpart270, label %originalBB68alteredBB

originalBBpart270:                                ; preds = %originalBB68
  br label %if.end13

if.end13:                                         ; preds = %originalBBpart270, %originalBBpart266
  %174 = load i32, ptr @x, align 4
  %175 = load i32, ptr @y, align 4
  %176 = sub i32 %174, 1
  %177 = mul i32 %174, %176
  %178 = urem i32 %177, 2
  %179 = icmp eq i32 %178, 0
  %180 = icmp slt i32 %175, 10
  %181 = or i1 %179, %180
  br i1 %181, label %originalBB72, label %originalBB72alteredBB

originalBB72:                                     ; preds = %if.end13, %originalBB72alteredBB
  %182 = load ptr, ptr %inputs.addr, align 8
  %plateC = getelementptr inbounds %struct.ControllerInputs, ptr %182, i32 0, i32 3
  %183 = load i32, ptr %plateC, align 4
  %tobool14 = icmp ne i32 %183, 0
  %184 = load i32, ptr @x, align 4
  %185 = load i32, ptr @y, align 4
  %186 = sub i32 %184, 1
  %187 = mul i32 %184, %186
  %188 = urem i32 %187, 2
  %189 = icmp eq i32 %188, 0
  %190 = icmp slt i32 %185, 10
  %191 = or i1 %189, %190
  br i1 %191, label %originalBBpart274, label %originalBB72alteredBB

originalBBpart274:                                ; preds = %originalBB72
  br i1 %tobool14, label %land.lhs.true15, label %if.else19

land.lhs.true15:                                  ; preds = %originalBBpart274
  %192 = load i32, ptr @x, align 4
  %193 = load i32, ptr @y, align 4
  %194 = sub i32 %192, 1
  %195 = mul i32 %192, %194
  %196 = urem i32 %195, 2
  %197 = icmp eq i32 %196, 0
  %198 = icmp slt i32 %193, 10
  %199 = or i1 %197, %198
  br i1 %199, label %originalBB76, label %originalBB76alteredBB

originalBB76:                                     ; preds = %land.lhs.true15, %originalBB76alteredBB
  %200 = load ptr, ptr %inputs.addr, align 8
  %plateB16 = getelementptr inbounds %struct.ControllerInputs, ptr %200, i32 0, i32 2
  %201 = load i32, ptr %plateB16, align 4
  %tobool17 = icmp ne i32 %201, 0
  %202 = load i32, ptr @x, align 4
  %203 = load i32, ptr @y, align 4
  %204 = sub i32 %202, 1
  %205 = mul i32 %202, %204
  %206 = urem i32 %205, 2
  %207 = icmp eq i32 %206, 0
  %208 = icmp slt i32 %203, 10
  %209 = or i1 %207, %208
  br i1 %209, label %originalBBpart278, label %originalBB76alteredBB

originalBBpart278:                                ; preds = %originalBB76
  br i1 %tobool17, label %if.else19, label %if.then18

if.then18:                                        ; preds = %originalBBpart278
  %210 = load i32, ptr @x, align 4
  %211 = load i32, ptr @y, align 4
  %212 = sub i32 %210, 1
  %213 = mul i32 %210, %212
  %214 = urem i32 %213, 2
  %215 = icmp eq i32 %214, 0
  %216 = icmp slt i32 %211, 10
  %217 = or i1 %215, %216
  br i1 %217, label %originalBB80, label %originalBB80alteredBB

originalBB80:                                     ; preds = %if.then18, %originalBB80alteredBB
  %218 = load ptr, ptr %outputs.addr, align 8
  %routeC = getelementptr inbounds %struct.ControllerOutputs, ptr %218, i32 0, i32 3
  store i32 1, ptr %routeC, align 4
  %219 = load i32, ptr @x, align 4
  %220 = load i32, ptr @y, align 4
  %221 = sub i32 %219, 1
  %222 = mul i32 %219, %221
  %223 = urem i32 %222, 2
  %224 = icmp eq i32 %223, 0
  %225 = icmp slt i32 %220, 10
  %226 = or i1 %224, %225
  br i1 %226, label %originalBBpart282, label %originalBB80alteredBB

originalBBpart282:                                ; preds = %originalBB80
  br label %if.end21

if.else19:                                        ; preds = %originalBBpart278, %originalBBpart274
  %227 = load i32, ptr @x, align 4
  %228 = load i32, ptr @y, align 4
  %229 = sub i32 %227, 1
  %230 = mul i32 %227, %229
  %231 = urem i32 %230, 2
  %232 = icmp eq i32 %231, 0
  %233 = icmp slt i32 %228, 10
  %234 = or i1 %232, %233
  br i1 %234, label %originalBB84, label %originalBB84alteredBB

originalBB84:                                     ; preds = %if.else19, %originalBB84alteredBB
  %235 = load ptr, ptr %outputs.addr, align 8
  %routeC20 = getelementptr inbounds %struct.ControllerOutputs, ptr %235, i32 0, i32 3
  store i32 0, ptr %routeC20, align 4
  %236 = load i32, ptr @x, align 4
  %237 = load i32, ptr @y, align 4
  %238 = sub i32 %236, 1
  %239 = mul i32 %236, %238
  %240 = urem i32 %239, 2
  %241 = icmp eq i32 %240, 0
  %242 = icmp slt i32 %237, 10
  %243 = or i1 %241, %242
  br i1 %243, label %originalBBpart286, label %originalBB84alteredBB

originalBBpart286:                                ; preds = %originalBB84
  br label %if.end21

if.end21:                                         ; preds = %originalBBpart286, %originalBBpart282
  %244 = load i32, ptr @x, align 4
  %245 = load i32, ptr @y, align 4
  %246 = sub i32 %244, 1
  %247 = mul i32 %244, %246
  %248 = urem i32 %247, 2
  %249 = icmp eq i32 %248, 0
  %250 = icmp slt i32 %245, 10
  %251 = or i1 %249, %250
  br i1 %251, label %originalBB88, label %originalBB88alteredBB

originalBB88:                                     ; preds = %if.end21, %originalBB88alteredBB
  %252 = load ptr, ptr %inputs.addr, align 8
  %assist = getelementptr inbounds %struct.ControllerInputs, ptr %252, i32 0, i32 4
  %253 = load i32, ptr %assist, align 4
  %tobool22 = icmp ne i32 %253, 0
  %254 = load i32, ptr @x, align 4
  %255 = load i32, ptr @y, align 4
  %256 = sub i32 %254, 1
  %257 = mul i32 %254, %256
  %258 = urem i32 %257, 2
  %259 = icmp eq i32 %258, 0
  %260 = icmp slt i32 %255, 10
  %261 = or i1 %259, %260
  br i1 %261, label %originalBBpart290, label %originalBB88alteredBB

originalBBpart290:                                ; preds = %originalBB88
  br i1 %tobool22, label %land.lhs.true23, label %if.then26

land.lhs.true23:                                  ; preds = %originalBBpart290
  %262 = load i32, ptr @x, align 4
  %263 = load i32, ptr @y, align 4
  %264 = sub i32 %262, 1
  %265 = mul i32 %262, %264
  %266 = urem i32 %265, 2
  %267 = icmp eq i32 %266, 0
  %268 = icmp slt i32 %263, 10
  %269 = or i1 %267, %268
  br i1 %269, label %originalBB92, label %originalBB92alteredBB

originalBB92:                                     ; preds = %land.lhs.true23, %originalBB92alteredBB
  %270 = load ptr, ptr %inputs.addr, align 8
  %plateC24 = getelementptr inbounds %struct.ControllerInputs, ptr %270, i32 0, i32 3
  %271 = load i32, ptr %plateC24, align 4
  %tobool25 = icmp ne i32 %271, 0
  %272 = load i32, ptr @x, align 4
  %273 = load i32, ptr @y, align 4
  %274 = sub i32 %272, 1
  %275 = mul i32 %272, %274
  %276 = urem i32 %275, 2
  %277 = icmp eq i32 %276, 0
  %278 = icmp slt i32 %273, 10
  %279 = or i1 %277, %278
  br i1 %279, label %originalBBpart294, label %originalBB92alteredBB

originalBBpart294:                                ; preds = %originalBB92
  br i1 %tobool25, label %if.then26, label %if.else27

if.then26:                                        ; preds = %originalBBpart294, %originalBBpart290
  %280 = load i32, ptr @x, align 4
  %281 = load i32, ptr @y, align 4
  %282 = sub i32 %280, 1
  %283 = mul i32 %280, %282
  %284 = urem i32 %283, 2
  %285 = icmp eq i32 %284, 0
  %286 = icmp slt i32 %281, 10
  %287 = or i1 %285, %286
  br i1 %287, label %originalBB96, label %originalBB96alteredBB

originalBB96:                                     ; preds = %if.then26, %originalBB96alteredBB
  %288 = load ptr, ptr %outputs.addr, align 8
  %assistBlocked = getelementptr inbounds %struct.ControllerOutputs, ptr %288, i32 0, i32 4
  store i32 1, ptr %assistBlocked, align 4
  %289 = load i32, ptr @x, align 4
  %290 = load i32, ptr @y, align 4
  %291 = sub i32 %289, 1
  %292 = mul i32 %289, %291
  %293 = urem i32 %292, 2
  %294 = icmp eq i32 %293, 0
  %295 = icmp slt i32 %290, 10
  %296 = or i1 %294, %295
  br i1 %296, label %originalBBpart298, label %originalBB96alteredBB

originalBBpart298:                                ; preds = %originalBB96
  br label %if.end29

if.else27:                                        ; preds = %originalBBpart294
  %297 = load i32, ptr @x, align 4
  %298 = load i32, ptr @y, align 4
  %299 = sub i32 %297, 1
  %300 = mul i32 %297, %299
  %301 = urem i32 %300, 2
  %302 = icmp eq i32 %301, 0
  %303 = icmp slt i32 %298, 10
  %304 = or i1 %302, %303
  br i1 %304, label %originalBB100, label %originalBB100alteredBB

originalBB100:                                    ; preds = %if.else27, %originalBB100alteredBB
  %305 = load ptr, ptr %outputs.addr, align 8
  %assistBlocked28 = getelementptr inbounds %struct.ControllerOutputs, ptr %305, i32 0, i32 4
  store i32 0, ptr %assistBlocked28, align 4
  %306 = load i32, ptr @x, align 4
  %307 = load i32, ptr @y, align 4
  %308 = sub i32 %306, 1
  %309 = mul i32 %306, %308
  %310 = urem i32 %309, 2
  %311 = icmp eq i32 %310, 0
  %312 = icmp slt i32 %307, 10
  %313 = or i1 %311, %312
  br i1 %313, label %originalBBpart2102, label %originalBB100alteredBB

originalBBpart2102:                               ; preds = %originalBB100
  br label %if.end29

if.end29:                                         ; preds = %originalBBpart2102, %originalBBpart298
  %314 = load i32, ptr @x, align 4
  %315 = load i32, ptr @y, align 4
  %316 = sub i32 %314, 1
  %317 = mul i32 %314, %316
  %318 = urem i32 %317, 2
  %319 = icmp eq i32 %318, 0
  %320 = icmp slt i32 %315, 10
  %321 = or i1 %319, %320
  br i1 %321, label %originalBB104, label %originalBB104alteredBB

originalBB104:                                    ; preds = %if.end29, %originalBB104alteredBB
  %322 = load ptr, ptr %inputs.addr, align 8
  %assist30 = getelementptr inbounds %struct.ControllerInputs, ptr %322, i32 0, i32 4
  %323 = load i32, ptr %assist30, align 4
  %tobool31 = icmp ne i32 %323, 0
  %324 = load i32, ptr @x, align 4
  %325 = load i32, ptr @y, align 4
  %326 = sub i32 %324, 1
  %327 = mul i32 %324, %326
  %328 = urem i32 %327, 2
  %329 = icmp eq i32 %328, 0
  %330 = icmp slt i32 %325, 10
  %331 = or i1 %329, %330
  br i1 %331, label %originalBBpart2106, label %originalBB104alteredBB

originalBBpart2106:                               ; preds = %originalBB104
  br i1 %tobool31, label %if.then32, label %if.else33

if.then32:                                        ; preds = %originalBBpart2106
  %332 = load i32, ptr @x, align 4
  %333 = load i32, ptr @y, align 4
  %334 = sub i32 %332, 1
  %335 = mul i32 %332, %334
  %336 = urem i32 %335, 2
  %337 = icmp eq i32 %336, 0
  %338 = icmp slt i32 %333, 10
  %339 = or i1 %337, %338
  br i1 %339, label %originalBB108, label %originalBB108alteredBB

originalBB108:                                    ; preds = %if.then32, %originalBB108alteredBB
  %340 = load ptr, ptr %outputs.addr, align 8
  %exitReady = getelementptr inbounds %struct.ControllerOutputs, ptr %340, i32 0, i32 5
  store i32 1, ptr %exitReady, align 4
  %341 = load i32, ptr @x, align 4
  %342 = load i32, ptr @y, align 4
  %343 = sub i32 %341, 1
  %344 = mul i32 %341, %343
  %345 = urem i32 %344, 2
  %346 = icmp eq i32 %345, 0
  %347 = icmp slt i32 %342, 10
  %348 = or i1 %346, %347
  br i1 %348, label %originalBBpart2110, label %originalBB108alteredBB

originalBBpart2110:                               ; preds = %originalBB108
  br label %if.end35

if.else33:                                        ; preds = %originalBBpart2106
  %349 = load i32, ptr @x, align 4
  %350 = load i32, ptr @y, align 4
  %351 = sub i32 %349, 1
  %352 = mul i32 %349, %351
  %353 = urem i32 %352, 2
  %354 = icmp eq i32 %353, 0
  %355 = icmp slt i32 %350, 10
  %356 = or i1 %354, %355
  br i1 %356, label %originalBB112, label %originalBB112alteredBB

originalBB112:                                    ; preds = %if.else33, %originalBB112alteredBB
  %357 = load ptr, ptr %outputs.addr, align 8
  %exitReady34 = getelementptr inbounds %struct.ControllerOutputs, ptr %357, i32 0, i32 5
  store i32 0, ptr %exitReady34, align 4
  %358 = load i32, ptr @x, align 4
  %359 = load i32, ptr @y, align 4
  %360 = sub i32 %358, 1
  %361 = mul i32 %358, %360
  %362 = urem i32 %361, 2
  %363 = icmp eq i32 %362, 0
  %364 = icmp slt i32 %359, 10
  %365 = or i1 %363, %364
  br i1 %365, label %originalBBpart2114, label %originalBB112alteredBB

originalBBpart2114:                               ; preds = %originalBB112
  br label %if.end35

if.end35:                                         ; preds = %originalBBpart2114, %originalBBpart2110
  %366 = load i32, ptr @x, align 4
  %367 = load i32, ptr @y, align 4
  %368 = sub i32 %366, 1
  %369 = mul i32 %366, %368
  %370 = urem i32 %369, 2
  %371 = icmp eq i32 %370, 0
  %372 = icmp slt i32 %367, 10
  %373 = or i1 %371, %372
  br i1 %373, label %originalBB116, label %originalBB116alteredBB

originalBB116:                                    ; preds = %if.end35, %originalBB116alteredBB
  %374 = load i32, ptr @x, align 4
  %375 = load i32, ptr @y, align 4
  %376 = sub i32 %374, 1
  %377 = mul i32 %374, %376
  %378 = urem i32 %377, 2
  %379 = icmp eq i32 %378, 0
  %380 = icmp slt i32 %375, 10
  %381 = or i1 %379, %380
  br i1 %381, label %originalBBpart2118, label %originalBB116alteredBB

originalBBpart2118:                               ; preds = %originalBB116
  ret void

originalBBalteredBB:                              ; preds = %originalBB, %entry
  %outputs.addralteredBB = alloca ptr, align 8
  %inputs.addralteredBB = alloca ptr, align 8
  store ptr %outputs, ptr %outputs.addralteredBB, align 8
  store ptr %inputs, ptr %inputs.addralteredBB, align 8
  %382 = load ptr, ptr %inputs.addralteredBB, align 8
  %launchalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %382, i32 0, i32 0
  %383 = load i32, ptr %launchalteredBB, align 4
  %toboolalteredBB = icmp ne i32 %383, 0
  br label %originalBB

originalBB36alteredBB:                            ; preds = %originalBB36, %if.then
  %384 = load ptr, ptr %outputs.addr, align 8
  %launchPoweralteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %384, i32 0, i32 0
  store i32 1, ptr %launchPoweralteredBB, align 4
  br label %originalBB36

originalBB40alteredBB:                            ; preds = %originalBB40, %if.else
  %385 = load ptr, ptr %outputs.addr, align 8
  %launchPower1alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %385, i32 0, i32 0
  store i32 0, ptr %launchPower1alteredBB, align 4
  br label %originalBB40

originalBB44alteredBB:                            ; preds = %originalBB44, %if.end
  %386 = load ptr, ptr %inputs.addr, align 8
  %plateAalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %386, i32 0, i32 1
  %387 = load i32, ptr %plateAalteredBB, align 4
  %tobool2alteredBB = icmp ne i32 %387, 0
  br label %originalBB44

originalBB48alteredBB:                            ; preds = %originalBB48, %if.then3
  %388 = load ptr, ptr %outputs.addr, align 8
  %routeAalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %388, i32 0, i32 1
  store i32 1, ptr %routeAalteredBB, align 4
  br label %originalBB48

originalBB52alteredBB:                            ; preds = %originalBB52, %if.else4
  %389 = load ptr, ptr %outputs.addr, align 8
  %routeA5alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %389, i32 0, i32 1
  store i32 0, ptr %routeA5alteredBB, align 4
  br label %originalBB52

originalBB56alteredBB:                            ; preds = %originalBB56, %if.end6
  %390 = load ptr, ptr %inputs.addr, align 8
  %plateBalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %390, i32 0, i32 2
  %391 = load i32, ptr %plateBalteredBB, align 4
  %tobool7alteredBB = icmp ne i32 %391, 0
  br label %originalBB56

originalBB60alteredBB:                            ; preds = %originalBB60, %land.lhs.true
  %392 = load ptr, ptr %inputs.addr, align 8
  %plateA8alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %392, i32 0, i32 1
  %393 = load i32, ptr %plateA8alteredBB, align 4
  %tobool9alteredBB = icmp ne i32 %393, 0
  br label %originalBB60

originalBB64alteredBB:                            ; preds = %originalBB64, %if.then10
  %394 = load ptr, ptr %outputs.addr, align 8
  %routeBalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %394, i32 0, i32 2
  store i32 1, ptr %routeBalteredBB, align 4
  br label %originalBB64

originalBB68alteredBB:                            ; preds = %originalBB68, %if.else11
  %395 = load ptr, ptr %outputs.addr, align 8
  %routeB12alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %395, i32 0, i32 2
  store i32 0, ptr %routeB12alteredBB, align 4
  br label %originalBB68

originalBB72alteredBB:                            ; preds = %originalBB72, %if.end13
  %396 = load ptr, ptr %inputs.addr, align 8
  %plateCalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %396, i32 0, i32 3
  %397 = load i32, ptr %plateCalteredBB, align 4
  %tobool14alteredBB = icmp ne i32 %397, 0
  br label %originalBB72

originalBB76alteredBB:                            ; preds = %originalBB76, %land.lhs.true15
  %398 = load ptr, ptr %inputs.addr, align 8
  %plateB16alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %398, i32 0, i32 2
  %399 = load i32, ptr %plateB16alteredBB, align 4
  %tobool17alteredBB = icmp ne i32 %399, 0
  br label %originalBB76

originalBB80alteredBB:                            ; preds = %originalBB80, %if.then18
  %400 = load ptr, ptr %outputs.addr, align 8
  %routeCalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %400, i32 0, i32 3
  store i32 1, ptr %routeCalteredBB, align 4
  br label %originalBB80

originalBB84alteredBB:                            ; preds = %originalBB84, %if.else19
  %401 = load ptr, ptr %outputs.addr, align 8
  %routeC20alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %401, i32 0, i32 3
  store i32 0, ptr %routeC20alteredBB, align 4
  br label %originalBB84

originalBB88alteredBB:                            ; preds = %originalBB88, %if.end21
  %402 = load ptr, ptr %inputs.addr, align 8
  %assistalteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %402, i32 0, i32 4
  %403 = load i32, ptr %assistalteredBB, align 4
  %tobool22alteredBB = icmp ne i32 %403, 0
  br label %originalBB88

originalBB92alteredBB:                            ; preds = %originalBB92, %land.lhs.true23
  %404 = load ptr, ptr %inputs.addr, align 8
  %plateC24alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %404, i32 0, i32 3
  %405 = load i32, ptr %plateC24alteredBB, align 4
  %tobool25alteredBB = icmp ne i32 %405, 0
  br label %originalBB92

originalBB96alteredBB:                            ; preds = %originalBB96, %if.then26
  %406 = load ptr, ptr %outputs.addr, align 8
  %assistBlockedalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %406, i32 0, i32 4
  store i32 1, ptr %assistBlockedalteredBB, align 4
  br label %originalBB96

originalBB100alteredBB:                           ; preds = %originalBB100, %if.else27
  %407 = load ptr, ptr %outputs.addr, align 8
  %assistBlocked28alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %407, i32 0, i32 4
  store i32 0, ptr %assistBlocked28alteredBB, align 4
  br label %originalBB100

originalBB104alteredBB:                           ; preds = %originalBB104, %if.end29
  %408 = load ptr, ptr %inputs.addr, align 8
  %assist30alteredBB = getelementptr inbounds %struct.ControllerInputs, ptr %408, i32 0, i32 4
  %409 = load i32, ptr %assist30alteredBB, align 4
  %tobool31alteredBB = icmp ne i32 %409, 0
  br label %originalBB104

originalBB108alteredBB:                           ; preds = %originalBB108, %if.then32
  %410 = load ptr, ptr %outputs.addr, align 8
  %exitReadyalteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %410, i32 0, i32 5
  store i32 1, ptr %exitReadyalteredBB, align 4
  br label %originalBB108

originalBB112alteredBB:                           ; preds = %originalBB112, %if.else33
  %411 = load ptr, ptr %outputs.addr, align 8
  %exitReady34alteredBB = getelementptr inbounds %struct.ControllerOutputs, ptr %411, i32 0, i32 5
  store i32 0, ptr %exitReady34alteredBB, align 4
  br label %originalBB112

originalBB116alteredBB:                           ; preds = %originalBB116, %if.end35
  br label %originalBB116
}

attributes #0 = { noinline nounwind optnone uwtable "min-legal-vector-width"="0" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }

!llvm.module.flags = !{!0, !1, !2}
!llvm.ident = !{!3}

!0 = !{i32 1, !"wchar_size", i32 2}
!1 = !{i32 8, !"PIC Level", i32 2}
!2 = !{i32 7, !"uwtable", i32 2}
!3 = !{!"clang version 16.0.6 (https://github.com/llvm/llvm-project.git 7cbf1a2591520c2491aa35339f227775f4d3adf6)"}
