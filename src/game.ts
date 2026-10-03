/**
 * Game shell: the fixed-timestep loop (from the previous Binary Ninja game),
 * and the glue between the replay, the room and everything the player sees.
 *
 * The one rule this file enforces between layers: the physical bridge follows
 * `replay.bridgeOpen`, which only a processed `bridge_open` event sets.
 */

import type { SpecimenIndex } from "./data/bundle.ts";
import { CAMERA, FIXED_DT, MAX_FRAME_TIME } from "./engine/constants.ts";
import type { Box, Vec2 } from "./engine/geometry.ts";
import type { GrappleTarget } from "./engine/physics.ts";
import { findGrappleTarget } from "./engine/physics.ts";
import { HINT_COLOURS } from "./level/card-faces.ts";
import { cardName, cardTitle, relationshipPhrase, stateText } from "./level/presentation.ts";
import type { RoomDef } from "./level/room.ts";
import { cardPanel } from "./level/room.ts";
import { RunDirector } from "./replay/director.ts";
import type { DirectorEvent } from "./replay/director.ts";
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
}

export class Game {
  readonly world: World;
  readonly director: RunDirector;
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
  /** Seconds left to keep framing the run after it stops or finishes. */
  private linger = 0;
  private bridgeEverOpened = false;
  private stageCounter = 0;
  private seen = new Set<string>();

  constructor(
    host: HTMLElement,
    canvas: HTMLCanvasElement,
    readonly specimen: SpecimenIndex,
    readonly room: RoomDef,
    private readonly options: GameOptions,
  ) {
    if (room.specimenId !== specimen.bundle.specimen_id) {
      throw new Error(`Room ${room.id} is authored for ${room.specimenId}, not ${specimen.bundle.specimen_id}`);
    }
    this.world = new World(room, specimen);
    // Input 7 is the run that reaches the bridge; start there.
    const first = specimen.inputs.includes(7) ? 7 : specimen.inputs[0];
    this.director = new RunDirector(specimen, first);
    this.renderer = new Renderer(canvas);
    this.input = new InputManager(options.grapple);
    this.input.attach(canvas, host);

    this.hud = new Hud(host, specimen, {
      input: (i) => this.input.pushAction(`input:${i}` as "input:0"),
      run: () => this.input.pushAction("run"),
      reset: () => this.input.pushAction("reset"),
      fast: () => this.input.pushAction("fast"),
      help: () => this.input.pushAction("help"),
    });
    this.inspector = new Inspector(host, specimen);
    this.debug = new DebugPanel(host, specimen, room.cards.map((c) => c.stageId), {
      wireTrace: () => {
        this.world.clearWiring();
        for (const e of this.director.replay.trace.events) {
          if (e.next_stage_id) this.world.connect(e.stage_id, e.next_stage_id);
        }
        this.world.drainEvents();
      },
      clearWiring: () => this.world.clearWiring(),
      connect: (from, to) => {
        if (to) this.world.connect(from, to);
        else this.world.disconnect(from);
        this.world.drainEvents();
      },
      toggleStepMode: () => {
        this.director.stepMode = !this.director.stepMode;
      },
      step: () => this.director.stepOnce(this.lookup, this.cableLength),
      unlockStation: () => this.world.forceStationOnline(),
      resetCube: () => this.world.resetCube(),
    });
    this.debug.setVisible(options.debug);
    this.hud.setHelp(!options.debug);
    this.hud.logReset("Ready. Choose an input and press Enter to run.");

    this.renderer.camera.setWorld(room.world.width, room.world.height);
    const view = this.renderer.viewSize();
    this.renderer.camera.viewW = view.w;
    this.renderer.camera.viewH = view.h;
    this.renderer.camera.snapTo(this.world.player.x, this.world.player.y + room.camera.offsetY);
  }

  get revealed(): boolean {
    return this.world.station === "revealed";
  }

  private lookup = (stageId: string): string | null => this.world.connection(stageId);

  private cableLength = (from: string, to: string): number => {
    const a = this.world.cards.get(from)?.out;
    const b = this.world.cards.get(to)?.in;
    return a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
  };

  /** Read-only live state for the browser check and the console. */
  snapshot(): Record<string, unknown> {
    const r = this.director.replay;
    const p = this.world.player;
    return {
      input: this.director.selectedInput,
      trace: r.trace.id,
      status: r.status,
      cursor: r.cursor,
      stop: r.stop ? { at: r.stop.event.stage_id, proposed: r.stop.proposed, reason: r.stop.reason } : null,
      state: { ...r.state },
      bridgeOpen: r.bridgeOpen,
      bridgeExtent: this.world.bridgeExtent,
      wiring: this.world.wiring(),
      held: this.world.held,
      station: this.world.station,
      player: { x: p.x, y: p.y, grounded: p.grounded, groundId: p.groundId },
      cube: { x: this.world.cube.x, y: this.world.cube.y, socketed: this.world.cube.socketed },
      focus: this.focus,
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
    if (!this.hud.helpOpen) this.simulate(dt, aim);
    this.handleWorldEvents(this.world.drainEvents());

    this.director.update(dt, this.lookup, this.cableLength);
    this.handleDirectorEvents(this.director.drainEvents());
    this.world.bridgeTarget = this.director.replay.bridgeOpen;
    if (this.director.replay.bridgeOpen) this.bridgeEverOpened = true;

    this.renderer.particles.update(dt);
    this.updateCamera(dt);
    this.focus = this.world.focus();
    this.hud.setPrompt(this.promptText());
    this.hud.update(this.hudView());
    this.inspector.update(this.director.replay, this.revealed);
    this.debug.update(this.director, this.world, this.fps);

    this.renderer.draw({
      world: this.world,
      specimen: this.specimen,
      director: this.director,
      revealed: this.revealed,
      focus: this.focus,
      time: this.time,
      debug: this.debug.visible,
      inspected: this.inspector.isOpen ? this.inspector.stageId : null,
      grapple: this.options.grapple ? { target: this.grappleTarget, aim } : null,
    });
  };

  private handleActions(): void {
    const input = this.input;
    if (input.takeAction("help")) this.hud.setHelp(!this.hud.helpOpen);
    if (input.takeAction("escape")) {
      if (this.hud.helpOpen) this.hud.setHelp(false);
      else if (this.inspector.isOpen) this.inspector.close();
    }
    if (input.takeAction("debug")) this.debug.setVisible(!this.debug.visible);
    for (let i = 0; i < this.specimen.inputs.length; i += 1) {
      if (input.takeAction(`input:${i}` as "input:0")) this.director.select(this.specimen.inputs[i]);
    }
    if (input.takeAction("run")) {
      this.hud.setHelp(false);
      this.director.run();
    }
    if (input.takeAction("reset")) this.director.reset();
    if (input.takeAction("fast")) this.director.fast = !this.director.fast;
    if (input.takeAction("inspect")) this.toggleInspector();

    for (const click of input.clicks) {
      const stageId = this.renderer.cardAt(this.world, click.x, click.y);
      if (stageId) this.inspector.open(stageId);
    }
    input.clicks = [];
    input.clearActions();
  }

  /** I: inspect the card being used, else the nearest card in view. */
  private toggleInspector(): void {
    if (this.inspector.isOpen) {
      this.inspector.close();
      return;
    }
    const f = this.focus;
    if (f && (f.kind === "in" || f.kind === "out")) {
      this.inspector.open(f.stageId);
      return;
    }
    const p = this.world.player;
    let best: string | null = null;
    let bestDist = 520;
    for (const [stageId, c] of this.world.cards) {
      const b = cardPanel(c.card);
      const d = Math.hypot(b.x + b.w / 2 - p.x, b.y + b.h / 2 - p.y);
      if (d < bestDist) {
        best = stageId;
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
    if (this.options.grapple) {
      const p = this.world.player;
      this.grappleTarget =
        p.rope.phase === "attached" ? null : findGrappleTarget({ x: p.x, y: p.y }, aim, this.world.solids, p.groundId);
    }
  }

  // --- events -------------------------------------------------------------

  private once(key: string): boolean {
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    return true;
  }

  private name(stageId: string): string {
    return cardTitle(this.specimen, stageId, this.revealed);
  }

  private handleWorldEvents(events: WorldEvent[]): void {
    const fx = this.renderer.particles;
    for (const e of events) {
      switch (e.kind) {
        case "connected": {
          const at = this.world.cards.get(e.to)?.in;
          if (at) fx.burst(at.x, at.y, 14, "#9fd3ff", 160);
          break;
        }
        case "dropped_cable":
          this.hud.toast("Cable dropped", `${this.name(e.from)} is now unplugged`, "info");
          break;
        case "took_cable":
          if (this.once("took_cable")) {
            this.hud.toast("Carrying a cable", "Walk to another card's IN socket and press E", "info");
          }
          break;
        case "picked_cube":
          if (this.once("picked_cube")) {
            this.hud.toast("Power cube", "The analysis station is across the pit", "info");
          }
          break;
        case "cube_socketed":
          this.hud.toast("Analysis station powered", "Press E at the station to run the analysis", "good");
          fx.burst(this.room.station.slot.x, this.room.station.slot.y, 40, "#c08cff", 280);
          this.renderer.camera.kick(0.3);
          break;
        case "analysis_revealed":
          this.hud.toast(
            "Analysis complete",
            `${this.specimen.bundle.analysis_reward.reveal_stage_ids.length} cards are proven bogus clones — inspect them (I)`,
            "good",
          );
          for (const id of this.specimen.bundle.analysis_reward.reveal_stage_ids) {
            const c = this.world.cards.get(id);
            if (c) {
              const b = cardPanel(c.card);
              fx.shatter(b.x, b.y, b.w, b.h, "#ff6f88");
            }
          }
          this.renderer.camera.kick(0.4);
          break;
        case "cube_respawned":
          this.hud.toast("Cube returned", "It fell out of the room", "info");
          break;
        case "denied":
          this.hud.toast("Not here", e.message, "bad");
          break;
        case "run_requested":
          this.hud.setHelp(false);
          this.director.run();
          break;
        case "landed":
          if (e.speed > 700) fx.burst(e.x, e.y + 17, 5, "#8fb6d6", 90);
          break;
        case "bridge_settled":
        case "unplugged":
          break;
      }
    }
  }

  private handleDirectorEvents(events: DirectorEvent[]): void {
    const fx = this.renderer.particles;
    for (const ev of events) {
      if (ev.kind === "reset") {
        this.hud.logReset(`Ready · input ${ev.input}. Press Enter to run.`);
        this.linger = 0;
        continue;
      }
      if (ev.kind === "started") {
        this.stageCounter = 0;
        this.hud.logReset(`Run · input ${ev.input} · ${ev.traceId}`);
        continue;
      }
      const step = ev.step;
      switch (step.kind) {
        case "enter":
          this.stageCounter += 1;
          this.hud.logLine(`<b>${this.stageCounter}.</b> ${this.name(step.event.stage_id)}`);
          break;
        case "semantic": {
          const s = step.semantic;
          const shown = s.label ? s.label : stateText(this.specimen, s.field, s.value);
          this.hud.logChip(`${s.field} ← ${shown}`, s.kind === "bridge_open" ? "#4ee0a1" : s.label ? HINT_COLOURS[s.label] : null);
          if (s.kind === "bridge_open") {
            this.renderer.camera.kick(0.35);
            fx.burst(this.room.bridge.x - 30, this.room.bridge.y - 50, 30, "#4ee0a1", 240);
          }
          break;
        }
        case "comparison": {
          const c = step.comparison;
          this.hud.logChip(`${relationshipPhrase(c)} → ${c.hint}`, HINT_COLOURS[c.hint]);
          break;
        }
        case "advance":
          break;
        case "stopped": {
          const stop = step.stop;
          const from = this.name(stop.event.stage_id);
          const detail =
            stop.reason === "no_connection"
              ? `Nothing is plugged into ${from}'s output.`
              : `From ${from}, execution did not go to ${stop.proposed ? cardName(this.specimen, stop.proposed, this.revealed) : "that card"}.`;
          this.hud.logLine(`✕ Stopped. ${detail}`, "log-bad");
          this.hud.toast("Run stopped", `${detail} Re-wire and run again.`, "bad");
          this.renderer.camera.kick(0.3);
          const at = this.world.cards.get(stop.event.stage_id)?.out;
          if (at) fx.burst(at.x, at.y, 26, "#ff5f7a", 220);
          this.linger = CAMERA.frameLinger;
          break;
        }
        case "finished": {
          const r = this.director.replay;
          const result = stateText(this.specimen, "result", r.state.result);
          const bridge = r.bridgeOpen ? "the bridge is open" : "the bridge stays closed";
          this.hud.logLine(`✓ Returned ${result}; ${bridge}.`, "log-good");
          this.hud.toast(`Program finished: ${result}`, `A complete, valid run of input ${r.input} — ${bridge}.`, "good");
          this.linger = CAMERA.frameLinger;
          break;
        }
      }
    }
  }

  // --- views --------------------------------------------------------------

  private updateCamera(dt: number): void {
    const view = this.renderer.viewSize();
    const p = this.world.player;
    this.linger = Math.max(0, this.linger - dt);
    let frame: Box | null = null;
    if (this.input.overviewHeld) {
      frame = { x: 0, y: 0, w: this.room.world.width, h: this.room.world.height };
    } else if (this.director.running || this.linger > 0) {
      frame = this.runFrame();
    }
    this.renderer.camera.update(dt, { x: p.x, y: p.y }, { x: p.vx, y: p.vy }, view.w, view.h, frame, this.room.camera);
  }

  /** The player plus the card being executed (and the one a pulse is heading to). */
  private runFrame(): Box {
    const p = this.world.player;
    let x0 = p.x - 40;
    let y0 = p.y - 60;
    let x1 = p.x + 40;
    let y1 = p.y + 40;
    const visual = this.director.visual;
    const include = (id: string | null | undefined): void => {
      const c = id ? this.world.cards.get(id) : undefined;
      if (!c) return;
      const b = cardPanel(c.card);
      x0 = Math.min(x0, b.x);
      y0 = Math.min(y0, b.y - (visual.comparison?.stage_id === id ? 180 : 50));
      x1 = Math.max(x1, b.x + b.w);
      y1 = Math.max(y1, b.y + b.h + 30);
    };
    include(visual.activeStageId);
    include(visual.pulse?.to);
    if (this.director.replay.bridgeEvent) {
      x1 = Math.max(x1, this.room.bridge.x + this.room.bridge.length);
      y1 = Math.max(y1, this.room.bridge.y + 40);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  private promptText(): string | null {
    const f = this.focus;
    const held = this.world.held;
    const sp = this.specimen;
    if (held?.kind === "cube") {
      return f?.kind === "slot" ? "E · insert the power cube" : "E · put the cube down";
    }
    if (held?.kind === "cable") {
      if (f?.kind === "in") {
        return f.stageId === held.from
          ? "A card can't feed its own input"
          : `E · plug ${this.name(held.from)} → ${cardName(sp, f.stageId, this.revealed)}`;
      }
      return `Carrying ${this.name(held.from)}'s cable · E on an IN socket to plug · E elsewhere drops it`;
    }
    if (!f) return null;
    switch (f.kind) {
      case "out": {
        const to = this.world.connection(f.stageId);
        return to
          ? `E · unplug ${this.name(f.stageId)} → ${this.name(to)} and carry it`
          : `E · take the output cable of ${cardName(sp, f.stageId, this.revealed)}`;
      }
      case "in":
        return `E · pull a cable out of ${this.name(f.stageId)}'s input`;
      case "cube":
        return "E · pick up the power cube";
      case "run":
        return `E · run the program with input ${this.director.selectedInput}`;
      case "station":
        return this.world.station === "locked"
          ? "Analysis station · locked — bring the power cube"
          : this.world.station === "online"
            ? "E · run the bogus-clone analysis"
            : "Analysis complete — marked cards are proven fake";
      case "slot":
        return null;
    }
  }

  private hudView(): Parameters<Hud["update"]>[0] {
    const r = this.director.replay;
    const extent = this.world.bridgeExtent;
    const at = (id: string | undefined): string => (id ? this.name(id) : "");
    const statusText =
      r.status === "ready"
        ? `Ready · input ${r.input}. Press Enter to run.`
        : r.status === "running"
          ? `Running input ${r.input} · at ${at(r.currentEvent?.stage_id)}`
          : r.status === "stopped"
            ? `Stopped at ${at(r.stop?.event.stage_id)} · re-wire and run again`
            : `Finished · returned ${stateText(this.specimen, "result", r.state.result)}`;
    return {
      input: this.director.selectedInput,
      status: r.status,
      statusText,
      fast: this.director.fast,
      state: { ...r.state },
      bridge: extent >= 1 ? "open" : extent > 0 ? "moving" : "closed",
      objectives: {
        bridge: this.bridgeEverOpened,
        cube: this.world.station !== "locked",
        analysis: this.world.station === "revealed",
      },
    };
  }
}
