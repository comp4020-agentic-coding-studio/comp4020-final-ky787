/**
 * Game shell: the fixed-timestep loop (from the previous Binary Ninja game),
 * the tutorial chamber sequence, and the glue between sockets, the replay and
 * everything the player sees.
 *
 * Rules this file enforces between layers:
 * - a cube seated in RUN starts one fresh run (latched; no repeat firing);
 * - seating a different number cube in INPUT selects that input's retained
 *   execution and, if RUN is powered, starts it — wiring is never touched;
 * - the physical bridge follows `replay.bridgeOpen`, which only a processed
 *   `bridge_open` event sets.
 */

import type { SpecimenIndex } from "./data/bundle.ts";
import { FIXED_DT, MAX_FRAME_TIME, RUN } from "./engine/constants.ts";
import type { Box, Vec2 } from "./engine/geometry.ts";
import type { GrappleTarget } from "./engine/physics.ts";
import { findGrappleTarget } from "./engine/physics.ts";
import type { ChamberDef } from "./level/chamber.ts";
import { housing } from "./level/chamber.ts";
import { ChamberLayout } from "./level/layout.ts";
import { machineTitle, portLabel } from "./level/presentation.ts";
import { RunDirector } from "./replay/director.ts";
import type { DirectorEvent, PacingView } from "./replay/director.ts";
import { Renderer } from "./render/renderer.ts";
import { DebugPanel } from "./ui/debug-panel.ts";
import { Hud } from "./ui/hud.ts";
import { InputManager } from "./ui/input.ts";
import { Inspector } from "./ui/inspector.ts";
import { World } from "./world/world.ts";
import type { Interactable, WorldEvent } from "./world/world.ts";

export interface GameOptions {
  debug: boolean;
  grapple: boolean;
  startChamber: number;
}

export class Game {
  world!: World;
  layout!: ChamberLayout;
  director!: RunDirector;
  chamberIndex = 0;
  private renderer: Renderer;
  private input: InputManager;
  private hud: Hud;
  private inspector: Inspector;
  private debug: DebugPanel;

  private accumulator = 0;
  private last = 0;
  private time = 0;
  private fps = 60;
  private focus: Interactable | null = null;
  private grappleTarget: GrappleTarget | null = null;
  private moved = 0;
  private log: string[] = [];

  constructor(
    host: HTMLElement,
    canvas: HTMLCanvasElement,
    readonly specimen: SpecimenIndex,
    readonly chambers: ChamberDef[],
    private readonly options: GameOptions,
  ) {
    this.renderer = new Renderer(canvas);
    this.input = new InputManager(options.grapple);
    this.input.attach(canvas, host);
    this.hud = new Hud(host, () => this.loadChamber(0));
    this.inspector = new Inspector(host, specimen);
    this.debug = new DebugPanel(host, specimen, chambers, {
      chamber: (i) => this.loadChamber(i),
      input: (value) => this.debugInput(value),
      run: () => this.startRun(),
      reset: () => this.director.reset(),
      wireCorrectly: () => {
        for (const port of this.world.chamber.editablePorts) {
          this.world.connect(port, this.specimen.port(port).expected_destination_stage_id);
        }
      },
      clearCables: () => this.world.clearCables(),
      connect: (port, to) => {
        if (to) this.world.connect(port, to);
        else this.world.disconnect(port);
      },
      toggleStepMode: () => {
        this.director.stepMode = !this.director.stepMode;
      },
      step: () => this.director.stepOnce(this.wiring, this.pacing),
      toggleFast: () => {
        this.director.fast = !this.director.fast;
      },
      resetCubes: () => this.world.resetCubes(),
    });
    this.debug.setVisible(options.debug);
    this.loadChamber(Math.min(Math.max(0, options.startChamber), chambers.length - 1));
  }

  private wiring = (portId: string): string | null => this.world.connection(portId);

  private pacing: PacingView = {
    visible: (stageId) => this.layout.stages.get(stageId)?.mode === "machine",
    travel: (portId) => {
      const to = this.world.connection(portId);
      const length = to ? this.layout.pathLength(portId, to) : 0;
      return Math.min(RUN.transferMax, RUN.transferBase + length * RUN.transferPerUnit);
    },
  };

  loadChamber(index: number): void {
    const chamber = this.chambers[index];
    this.chamberIndex = index;
    for (const s of chamber.stages) this.specimen.stage(s.stageId);
    this.world = new World(chamber, this.specimen);
    this.layout = new ChamberLayout(chamber, this.specimen);
    this.director = new RunDirector(this.specimen, chamber.fixedInput);
    this.director.drainEvents();
    this.log = [];
    this.moved = 0;
    this.inspector.close();
    this.renderer.resetChamber();
    this.renderer.camera.setWorld(chamber.world.width, chamber.world.height, chamber.camera.viewHeight);
    const view = this.renderer.viewSize();
    this.renderer.camera.viewW = view.w;
    this.renderer.camera.viewH = view.h;
    this.renderer.camera.snapTo(this.world.player.x, this.world.player.y + chamber.camera.offsetY);
    this.hud.enterChamber(chamber.number, chamber.title);
    this.accumulator = 0;
  }

  /** Read-only live state for the browser check and the console. */
  snapshot(): Record<string, unknown> {
    const r = this.director.replay;
    const p = this.world.player;
    return {
      chamber: this.world.chamber.id,
      chamberIndex: this.chamberIndex,
      input: this.director.input,
      trace: r?.trace.id ?? null,
      status: r?.status ?? "no_input",
      cursor: r?.cursor ?? null,
      stop: r?.stop ? { at: r.stop.event.stage_id, port: r.stop.portId, proposed: r.stop.proposed, reason: r.stop.reason } : null,
      state: r ? { ...r.state } : null,
      outcomes: r?.outcomesShown.map((o) => o.feedback.lines.join(" ")) ?? [],
      litPorts: r ? [...r.activatedPorts] : [],
      bridgeOpen: r?.bridgeOpen ?? false,
      bridgeExtent: this.world.bridgeExtent,
      cables: this.world.cables(),
      held: this.world.held,
      sockets: Object.fromEntries([...this.world.sockets].map(([id, s]) => [id, s.cubeId])),
      doors: this.world.doors.map((d) => ({ id: d.def.id, openness: d.openness })),
      finishedInputs: [...this.world.finishedInputs],
      runs: this.director.runs,
      player: { x: p.x, y: p.y, grounded: p.grounded, groundId: p.groundId },
      exited: this.world.exited,
      ended: this.hud.endOpen,
      fps: this.fps,
    };
  }

  start(): void {
    this.last = performance.now();
    requestAnimationFrame(this.loop);
  }

  // --- loop ---------------------------------------------------------------

  private loop = (now: number): void => {
    requestAnimationFrame(this.loop);
    const raw = (now - this.last) / 1000;
    this.last = now;
    const dt = Math.min(MAX_FRAME_TIME, Math.max(0, raw));
    this.fps = this.fps * 0.92 + (1 / Math.max(1e-4, raw)) * 0.08;
    this.time += dt;

    this.handleActions();
    const aim = this.resolveAim();
    if (!this.hud.endOpen) this.simulate(dt, aim);
    this.handleWorldEvents(this.world.drainEvents());
    this.director.update(dt, this.wiring, this.pacing);
    this.handleDirectorEvents(this.director.drainEvents());
    this.world.bridgeTarget = this.director.replay?.bridgeOpen ?? false;

    this.renderer.particles.update(dt);
    this.updateCamera(dt);
    this.focus = this.world.focus();
    this.hud.setPrompt(this.promptText());
    this.hud.setHint(this.moved < 260);
    this.inspector.update(this.director.replay, this.wiring, (p) => this.world.isEditable(p), false);
    this.debug.update(this.director, this.world, this.fps, this.log);

    this.renderer.draw({
      world: this.world,
      layout: this.layout,
      specimen: this.specimen,
      director: this.director,
      focus: this.focus,
      time: this.time,
      dt,
      debug: this.debug.visible,
      inspected: this.inspector.isOpen ? this.inspector.stageId : null,
      grapple: this.options.grapple ? { target: this.grappleTarget, aim } : null,
    });
  };

  private handleActions(): void {
    const input = this.input;
    if (input.takeAction("escape")) this.inspector.close();
    if (input.takeAction("debug")) this.debug.setVisible(!this.debug.visible);
    if (input.takeAction("fast")) this.director.fast = !this.director.fast;
    if (input.takeAction("reset")) this.world.resetCubes();
    if (input.takeAction("inspect")) this.toggleInspector();
    for (const click of input.clicks) {
      const stageId = this.renderer.machineAt(this.world, click.x, click.y);
      if (stageId) this.inspector.open(stageId);
    }
    input.clicks = [];
    input.clearActions();
  }

  /** I: inspect the machine being used, else the nearest visible machine. */
  private toggleInspector(): void {
    if (this.inspector.isOpen) {
      this.inspector.close();
      return;
    }
    const f = this.focus;
    if (f?.kind === "jack") {
      this.inspector.open(f.jack.stageId);
      return;
    }
    const p = this.world.player;
    let best: string | null = null;
    let bestDist = 600;
    for (const s of this.world.chamber.stages) {
      if (s.mode !== "machine") continue;
      const b = housing(s);
      const d = Math.hypot(b.x + b.w / 2 - p.x, b.y + b.h / 2 - p.y);
      if (d < bestDist) {
        best = s.stageId;
        bestDist = d;
      }
    }
    if (best) this.inspector.open(best);
  }

  private resolveAim(): Vec2 {
    const p = this.world.player;
    if (!this.input.hasPointer) return { x: p.x + p.facing * 300, y: p.y - 150 };
    return this.renderer.camera.screenToWorld(this.input.screenAim.x, this.input.screenAim.y);
  }

  private simulate(dt: number, aim: Vec2): void {
    this.accumulator += dt;
    let steps = 0;
    const before = this.world.player.x;
    while (this.accumulator >= FIXED_DT && steps < 8) {
      this.input.sync(aim);
      const edges = this.input.takeEdges();
      this.input.state.jumpPressed = edges.jump;
      this.input.state.grapplePressed = this.options.grapple && edges.grapple;
      this.world.step(this.input.state, edges.interact, FIXED_DT);
      this.input.state.jumpPressed = false;
      this.input.state.grapplePressed = false;
      this.accumulator -= FIXED_DT;
      steps += 1;
    }
    if (steps >= 8) this.accumulator = 0;
    this.moved += Math.abs(this.world.player.x - before);
    if (this.options.grapple) {
      const p = this.world.player;
      this.grappleTarget =
        p.rope.phase === "attached" ? null : findGrappleTarget({ x: p.x, y: p.y }, aim, this.world.solids, p.groundId);
    }
  }

  // --- sockets drive the machine ------------------------------------------

  private socketKind(socketId: string): string | undefined {
    return this.world.sockets.get(socketId)?.def.kind;
  }

  private runPowered(): boolean {
    return [...this.world.sockets.values()].some((s) => s.def.kind === "run" && s.cubeId !== null);
  }

  private startRun(): void {
    if (this.director.run()) return;
    this.hud.toast("NO INPUT", "", "bad");
  }

  /** Developer shortcut: seat (or clear) the input as if a cube were placed. */
  private debugInput(value: number | null): void {
    const socket = [...this.world.sockets.values()].find((s) => s.def.kind === "input");
    const cube = [...this.world.cubes.values()].find((c) => c.def.kind === "input" && c.def.value === value);
    if (socket && cube) {
      if (socket.cubeId) this.world.resetCubes();
      this.world.insert(cube.def.id, socket.def.id);
    } else {
      this.director.select(value);
    }
  }

  private handleWorldEvents(events: WorldEvent[]): void {
    const fx = this.renderer.particles;
    for (const e of events) {
      switch (e.kind) {
        case "socket_filled": {
          const kind = this.socketKind(e.socketId);
          const s = this.world.sockets.get(e.socketId)?.def;
          if (s) fx.burst(s.x, s.floorY - 20, 22, kind === "input" ? "#7cc4ff" : "#c08cff", 220);
          if (kind === "input") {
            this.director.select(this.world.cubes.get(e.cubeId)?.def.value ?? null);
            if (this.runPowered()) this.startRun();
          } else if (kind === "run") {
            this.startRun();
          }
          break;
        }
        case "socket_emptied":
          if (this.socketKind(e.socketId) === "input") this.director.select(null);
          break;
        case "connected": {
          const at = this.layout.stages.get(e.to);
          if (at) fx.burst(at.x + 34, at.floorY - 26, 14, "#cfe6ff", 160);
          break;
        }
        case "door_opened": {
          const door = this.world.doors.find((d) => d.def.id === e.doorId);
          if (door) fx.burst(door.def.x + door.def.w / 2, door.def.y, 26, "#4ee0a1", 240);
          this.renderer.camera.kick(0.2);
          break;
        }
        case "exited":
          if (this.chamberIndex + 1 < this.chambers.length) this.loadChamber(this.chamberIndex + 1);
          else this.hud.setEnd(true);
          return;
        case "denied":
          this.hud.toast(e.message, "", "bad");
          break;
        case "cube_respawned":
          this.hud.toast("Cube returned", "", "info");
          break;
        case "landed":
          if (e.speed > 700) fx.burst(e.x, e.y + 17, 5, "#8fb6d6", 90);
          break;
        default:
          break;
      }
    }
  }

  private handleDirectorEvents(events: DirectorEvent[]): void {
    const fx = this.renderer.particles;
    for (const ev of events) {
      if (ev.kind === "reset") {
        this.log.push(`reset · input ${ev.input ?? "none"}`);
        continue;
      }
      if (ev.kind === "started") {
        this.log.push(`run · input ${ev.input} · ${ev.traceId}`);
        continue;
      }
      const step = ev.step;
      switch (step.kind) {
        case "enter":
          this.log.push(`enter ${step.event.id} (${step.event.stage_id})`);
          break;
        case "feedback":
          this.log.push(`  answer ${step.outcome.feedback.lines.join(" / ")}`);
          break;
        case "activation":
          this.log.push(`  port lit ${step.outcome.selected_port_id}`);
          break;
        case "semantic":
          this.log.push(`  ${step.semantic.kind} ${step.semantic.field}=${step.semantic.value}`);
          if (step.semantic.kind === "bridge_open") {
            const br = this.world.chamber.bridge;
            this.renderer.camera.kick(0.35);
            if (br) fx.burst(br.x - 30, br.y - 50, 30, "#4ee0a1", 240);
          }
          break;
        case "advance":
          this.log.push(`  via ${step.portId} → ${step.to.stage_id}`);
          break;
        case "stopped": {
          this.log.push(`stopped: ${step.stop.reason} at ${step.stop.portId ?? "—"}`);
          const at = step.stop.portId ? this.layout.portJack(step.stop.portId) : null;
          if (at && this.world.isEditable(step.stop.portId ?? "")) fx.burst(at.x, at.y, 26, "#ff5f7a", 220);
          this.renderer.camera.kick(0.25);
          break;
        }
        case "finished": {
          this.log.push(`finished · result ${this.director.replay?.state.result}`);
          const input = this.director.input;
          const rule = this.world.doors.find((d) => d.def.rule.kind === "inputs_finished")?.def.rule;
          if (input !== null && rule?.kind === "inputs_finished" && rule.inputs.includes(input)) {
            this.world.finishedInputs.add(input);
          }
          break;
        }
        case "comparison":
          break;
      }
    }
  }

  // --- views --------------------------------------------------------------

  private updateCamera(dt: number): void {
    const view = this.renderer.viewSize();
    const p = this.world.player;
    let frame: Box | null = null;
    if (this.input.overviewHeld) {
      frame = { x: 0, y: 0, w: this.world.chamber.world.width, h: this.world.chamber.world.height };
    } else if (this.director.running) {
      frame = this.runFrame();
    }
    this.renderer.camera.update(dt, { x: p.x, y: p.y }, { x: p.vx, y: p.vy }, view.w, view.h, frame, this.world.chamber.camera);
  }

  /** During a run: the player and the visible machine executing (sealed ones don't pull the view). */
  private runFrame(): Box | null {
    const id = this.director.visual.pulse?.to ?? this.director.visual.activeStageId;
    const stage = id ? this.layout.stages.get(id) : undefined;
    if (!stage || stage.mode !== "machine") return null;
    const p = this.world.player;
    const b = housing(stage);
    const x0 = Math.min(p.x - 60, b.x);
    const x1 = Math.max(p.x + 60, b.x + b.w);
    const y0 = Math.min(p.y - 80, b.y - 60);
    const y1 = Math.max(p.y + 40, b.y + b.h + 20);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  private promptText(): string | null {
    const f = this.focus;
    const w = this.world;
    const held = w.held;
    const sp = this.specimen;
    const cubeName = (cubeId: string): string => {
      const c = w.cubes.get(cubeId)?.def;
      return c?.kind === "input" ? `cube ${c.value}` : "power cube";
    };
    if (held?.kind === "cube") {
      if (f?.kind === "socket") {
        const seated = w.socketCube(f.socketId);
        const label = w.sockets.get(f.socketId)?.def.label;
        return seated
          ? `E · swap ${cubeName(held.cubeId)} for ${cubeName(seated.def.id)} in ${label}`
          : `E · place ${cubeName(held.cubeId)} in ${label}`;
      }
      return "E · put down";
    }
    if (held?.kind === "cable") {
      const label = portLabel(sp, held.portId);
      if (f?.kind === "jack" && f.jack.kind === "in") return `E · connect ${label} → ${machineTitle(sp, f.jack.stageId)}`;
      return `E · drop the ${label} cable`;
    }
    if (!f) return null;
    switch (f.kind) {
      case "jack": {
        if (f.jack.kind === "in") return "E · pull a cable out";
        const port = f.jack.portId as string;
        const to = w.connection(port);
        return to ? `E · unplug ${portLabel(sp, port)} (→ ${machineTitle(sp, to)})` : `E · take the ${portLabel(sp, port)} cable`;
      }
      case "cube":
        return `E · pick up ${cubeName(f.cubeId)}`;
      case "socket": {
        const cube = w.socketCube(f.socketId);
        return cube ? `E · take ${cubeName(cube.def.id)} out` : null;
      }
    }
  }
}
