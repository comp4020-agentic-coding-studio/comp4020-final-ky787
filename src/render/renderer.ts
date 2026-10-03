/**
 * Canvas renderer for the tutorial chambers. The background grid, player
 * silhouette, rope, bridge and particles are carried over from the earlier
 * renderers; machines, jacks, pipes, sockets, cubes, doors and environmental
 * signs are new. It reads game state and never changes it.
 *
 * Visual language: a readable machine is a stage; a sealed grey housing is a
 * stage the room hides; metal pipes are fixed connections; bright sagging
 * cables are the player's.
 */

import type { SpecimenIndex } from "../data/bundle.ts";
import { BRIDGE, CARRY, PLAYER } from "../engine/constants.ts";
import { clamp, damp } from "../engine/geometry.ts";
import type { Box, Vec2 } from "../engine/geometry.ts";
import type { GrappleTarget } from "../engine/physics.ts";
import { grappleBox, playerBox } from "../engine/physics.ts";
import type { ChamberSign, ChamberStage } from "../level/chamber.ts";
import { housing, inJack, polylinePoint } from "../level/chamber.ts";
import type { ChamberLayout } from "../level/layout.ts";
import { cableCurve } from "../level/layout.ts";
import {
  BOOL_COLOURS,
  TONE_COLOURS,
  machineSubtitle,
  machineTitle,
  machineTone,
  portLabel,
} from "../level/presentation.ts";
import type { RunDirector } from "../replay/director.ts";
import type { CubeRuntime, Interactable, World } from "../world/world.ts";
import { Camera } from "./camera.ts";
import { Particles } from "./fx.ts";

export interface RenderState {
  world: World;
  layout: ChamberLayout;
  specimen: SpecimenIndex;
  director: RunDirector;
  focus: Interactable | null;
  time: number;
  dt: number;
  debug: boolean;
  inspected: string | null;
  /** Only when the grapple is enabled. */
  grapple: { target: GrappleTarget | null; aim: Vec2 } | null;
}

const SANS = `"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif`;
const MONO = `ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace`;
const ACCENT = "#4ee0a1";
const FAIL = "#ff5f7a";
const CABLE = "#cfe6ff";
const POWER = "#c08cff";
const INPUT_BLUE = "#7cc4ff";

function rgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
  return `${out}…`;
}

function strokePolyline(ctx: CanvasRenderingContext2D, points: Vec2[]): void {
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

export class Renderer {
  readonly camera = new Camera();
  readonly particles = new Particles();
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private signAlpha = new Map<ChamberSign, number>();

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2D canvas is unavailable in this browser");
    this.ctx = ctx;
  }

  viewSize(): { w: number; h: number } {
    return { w: this.canvas.clientWidth || 1280, h: this.canvas.clientHeight || 720 };
  }

  private resize(): void {
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const { w, h } = this.viewSize();
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    this.dpr = dpr;
  }

  /** Which visible machine, if any, is under a screen point. */
  machineAt(world: World, sx: number, sy: number): string | null {
    const p = this.camera.screenToWorld(sx, sy);
    for (const s of world.chamber.stages) {
      if (s.mode !== "machine") continue;
      const b = housing(s);
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return s.stageId;
    }
    return null;
  }

  resetChamber(): void {
    this.signAlpha.clear();
    this.particles.clear();
  }

  draw(state: RenderState): void {
    this.resize();
    const ctx = this.ctx;
    const view = this.viewSize();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawBackground(ctx, view, state.time);

    ctx.save();
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.originX(), -this.camera.originY());

    this.drawRoomBack(ctx, state);
    this.drawConduits(ctx, state);
    this.drawPipes(ctx, state);
    for (const s of state.world.chamber.stages) {
      if (s.mode === "sealed") this.drawSealed(ctx, state, s);
      else this.drawMachine(ctx, state, s);
    }
    this.drawPit(ctx, state);
    this.drawSolids(ctx, state);
    this.drawDoors(ctx, state);
    this.drawSigns(ctx, state);
    this.drawBridge(ctx, state);
    this.drawSockets(ctx, state);
    this.drawCables(ctx, state);
    this.drawJacks(ctx, state);
    this.drawPulse(ctx, state);
    for (const cube of state.world.cubes.values()) if (!cube.carried) this.drawCube(ctx, cube, state.time);
    this.drawRope(ctx, state);
    this.drawPlayer(ctx, state);
    for (const cube of state.world.cubes.values()) if (cube.carried) this.drawCube(ctx, cube, state.time);
    this.drawPopups(ctx, state);
    this.drawFocus(ctx, state);
    this.particles.draw(ctx);
    if (state.grapple) this.drawReticle(ctx, state);
    if (state.debug) this.drawDebug(ctx, state);
    ctx.restore();
  }

  // --- backdrop ---------------------------------------------------------

  private drawBackground(ctx: CanvasRenderingContext2D, view: { w: number; h: number }, time: number): void {
    const grad = ctx.createLinearGradient(0, 0, 0, view.h);
    grad.addColorStop(0, "#05070d");
    grad.addColorStop(0.55, "#070a12");
    grad.addColorStop(1, "#04060a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, view.w, view.h);
    for (const [depth, alpha, step] of [
      [0.18, 0.04, 240],
      [0.42, 0.03, 96],
    ] as const) {
      const ox = -(this.camera.originX() * depth * this.camera.zoom) % step;
      const oy = -(this.camera.originY() * depth * this.camera.zoom) % step;
      ctx.strokeStyle = rgba(ACCENT, alpha);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = ox; x < view.w; x += step) {
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, view.h);
      }
      for (let y = oy; y < view.h; y += step) {
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(view.w, Math.round(y) + 0.5);
      }
      ctx.stroke();
    }
    const sheen = ((time * 0.06) % 1) * (view.h + 200) - 100;
    const sg = ctx.createLinearGradient(0, sheen - 90, 0, sheen + 90);
    sg.addColorStop(0, "rgba(255,255,255,0)");
    sg.addColorStop(0.5, rgba(ACCENT, 0.02));
    sg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(0, sheen - 90, view.w, 180);
  }

  /** The chamber's back wall: lit panels, so the room reads as a place. */
  private drawRoomBack(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const c = state.world.chamber;
    const g = ctx.createLinearGradient(0, 60, 0, 1000);
    g.addColorStop(0, "rgba(18,26,40,0.95)");
    g.addColorStop(1, "rgba(13,19,30,0.97)");
    ctx.fillStyle = g;
    ctx.fillRect(40, 60, c.world.width - 80, c.world.height - 60);
    ctx.strokeStyle = "rgba(120,160,200,0.07)";
    ctx.lineWidth = 3;
    for (let x = 240; x < c.world.width - 60; x += 400) {
      ctx.beginPath();
      ctx.moveTo(x, 60);
      ctx.lineTo(x, 1000);
      ctx.stroke();
    }
    // The exit glows, so the goal is visible from the start.
    const e = c.exit;
    const glow = ctx.createRadialGradient(e.x + e.w / 2, e.y + e.h, 20, e.x + e.w / 2, e.y + e.h, 380);
    glow.addColorStop(0, rgba(ACCENT, 0.16));
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(e.x - 300, e.y - 300, e.w + 600, e.h + 300);
    ctx.font = `700 14px ${MONO}`;
    ctx.fillStyle = "rgba(170,200,230,0.3)";
    ctx.fillText(`CHAMBER ${c.number} · ${c.title}`, 70, 100);
  }

  private signTarget(sign: ChamberSign, state: RenderState): number {
    const f = sign.fadeWhen;
    if (!f) return 1;
    const w = state.world;
    switch (f.kind) {
      case "cube_carried":
        return w.cubes.get(f.cubeId)?.everCarried ? 0 : 1;
      case "socket_filled":
        return w.sockets.get(f.socketId)?.cubeId ? 0 : 1;
      case "ports_wired":
        return f.portIds.every((p) => w.connection(p) !== null) ? 0 : 1;
      case "run_started":
        return state.director.runs > 0 ? 0 : 1;
    }
  }

  private drawSigns(ctx: CanvasRenderingContext2D, state: RenderState): void {
    for (const sign of state.world.chamber.signs) {
      const target = this.signTarget(sign, state);
      const alpha = damp(this.signAlpha.get(sign) ?? target, target, 5, state.dt);
      this.signAlpha.set(sign, alpha);
      if (alpha < 0.02) continue;
      const colour = sign.colour ?? "#dbe9f7";
      ctx.globalAlpha = alpha * 0.9;
      ctx.font = `800 ${sign.size}px ${SANS}`;
      ctx.textAlign = "center";
      ctx.letterSpacing = `${Math.round(sign.size * 0.12)}px`;
      // Painted on the room, but outlined so pipes behind never break a letter.
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(10,15,24,0.95)";
      ctx.lineWidth = sign.size * 0.22;
      ctx.strokeText(sign.text, sign.x, sign.y);
      ctx.fillStyle = colour;
      ctx.fillText(sign.text, sign.x, sign.y);
      ctx.letterSpacing = "0px";
      ctx.textAlign = "left";
      if (sign.arrowTo) {
        const bob = Math.sin(state.time * 4) * 6;
        const from = { x: sign.x, y: sign.y + 14 };
        const to = { x: sign.arrowTo.x, y: sign.arrowTo.y + bob };
        ctx.strokeStyle = colour;
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        const a = Math.atan2(to.y - from.y, to.x - from.x);
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - Math.cos(a - 0.5) * 18, to.y - Math.sin(a - 0.5) * 18);
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - Math.cos(a + 0.5) * 18, to.y - Math.sin(a + 0.5) * 18);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  private drawConduits(ctx: CanvasRenderingContext2D, state: RenderState): void {
    for (const conduit of state.world.chamber.conduits) {
      const lit = state.world.sockets.get(conduit.socketId)?.cubeId != null;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1c2838";
      ctx.lineWidth = 10;
      strokePolyline(ctx, conduit.points);
      ctx.strokeStyle = lit ? rgba(POWER, 0.85 + 0.15 * Math.sin(state.time * 6)) : "rgba(120,140,170,0.25)";
      ctx.lineWidth = 4;
      strokePolyline(ctx, conduit.points);
    }
  }

  // --- connections ------------------------------------------------------

  private drawPipes(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const visual = state.director.visual;
    for (const [portId, route] of state.layout.pipes) {
      const followed = visual.followedPorts.has(portId);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0c121b";
      ctx.lineWidth = 14;
      strokePolyline(ctx, route);
      ctx.strokeStyle = followed ? rgba(ACCENT, 0.9) : "#3a4a5f";
      ctx.lineWidth = 8;
      strokePolyline(ctx, route);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 2;
      strokePolyline(ctx, route.map((p) => ({ x: p.x - 2, y: p.y - 2 })));
    }
  }

  private strokeCable(ctx: CanvasRenderingContext2D, curve: [Vec2, Vec2, Vec2, Vec2], colour: string, width: number): void {
    ctx.beginPath();
    ctx.moveTo(curve[0].x, curve[0].y);
    ctx.bezierCurveTo(curve[1].x, curve[1].y, curve[2].x, curve[2].y, curve[3].x, curve[3].y);
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(2,4,8,0.9)";
    ctx.lineWidth = width + 4;
    ctx.stroke();
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  private drawCables(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const { world, layout, director } = state;
    const visual = director.visual;
    for (const [portId, to] of world.cables()) {
      const a = layout.portJack(portId);
      const dest = layout.stages.get(to);
      if (!a || !dest) continue;
      const followed = visual.followedPorts.has(portId);
      const failed = visual.failed?.portId === portId;
      const colour = failed ? FAIL : followed ? ACCENT : CABLE;
      this.strokeCable(ctx, cableCurve(a, inJack(dest)), colour, failed || followed ? 6 : 5);
    }
    const held = world.held;
    if (held?.kind === "cable") {
      const a = layout.portJack(held.portId);
      const p = world.player;
      if (a) {
        const hand = { x: p.x + p.facing * 9, y: p.y - 2 };
        this.strokeCable(ctx, cableCurve(a, hand), "#ffc857", 5);
        ctx.fillStyle = "#ffc857";
        ctx.beginPath();
        ctx.arc(hand.x, hand.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawJacks(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const { world, specimen, director } = state;
    const visual = director.visual;
    const holdingCable = world.held?.kind === "cable";
    for (const jack of world.jacks) {
      const port = jack.portId;
      const lit = port !== null && visual.litPorts.has(port);
      const failed = port !== null && visual.failed?.portId === port;
      const label = jack.kind === "in" ? "IN" : portLabel(specimen, port as string);
      const boolColour = label === "TRUE" ? BOOL_COLOURS.TRUE : label === "FALSE" ? BOOL_COLOURS.FALSE : CABLE;
      const invite = holdingCable && jack.kind === "in";
      const r = invite ? 16 + Math.sin(state.time * 6) * 2 : 15;
      if (lit || failed) {
        ctx.save();
        ctx.shadowColor = failed ? FAIL : boolColour;
        ctx.shadowBlur = 24;
        ctx.fillStyle = rgba(failed ? FAIL : boolColour, 0.5);
        ctx.beginPath();
        ctx.arc(jack.at.x, jack.at.y, r + 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(jack.at.x, jack.at.y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#081018";
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = invite ? "#ffffff" : failed ? FAIL : boolColour;
      ctx.stroke();
      const plugged = port !== null ? world.connection(port) !== null : false;
      ctx.fillStyle = plugged || jack.kind === "in" ? boolColour : rgba(boolColour, 0.35);
      ctx.beginPath();
      ctx.arc(jack.at.x, jack.at.y, 5, 0, Math.PI * 2);
      ctx.fill();
      // Label on the machine face, above the jack.
      ctx.font = `900 ${label.length > 3 ? 21 : 18}px ${SANS}`;
      ctx.textAlign = "center";
      ctx.fillStyle = lit ? boolColour : rgba(boolColour, 0.9);
      ctx.fillText(label, jack.at.x, jack.at.y - 26);
      ctx.textAlign = "left";
    }
  }

  private drawPulse(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const pulse = state.director.visual.pulse;
    if (!pulse) return;
    const path = state.layout.path(pulse.portId, pulse.to);
    if (!path) return;
    const t = clamp(pulse.elapsed / pulse.duration, 0, 1);
    for (let i = 6; i >= 0; i -= 1) {
      const pt = polylinePoint(path, clamp(t - i * 0.03, 0, 1));
      ctx.fillStyle = rgba(ACCENT, 0.14 + (6 - i) * 0.13);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5 + (6 - i) * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- machines -------------------------------------------------------------

  private drawSealed(ctx: CanvasRenderingContext2D, state: RenderState, s: ChamberStage): void {
    const b = housing(s);
    const active = state.director.visual.activeStageId === s.stageId && state.director.running;
    const ran = state.director.visual.executed.has(s.stageId);
    if (active) {
      ctx.save();
      ctx.shadowColor = ACCENT;
      ctx.shadowBlur = 24;
      roundRect(ctx, b.x, b.y, b.w, b.h, 8);
      ctx.fillStyle = rgba(ACCENT, 0.3);
      ctx.fill();
      ctx.restore();
    }
    roundRect(ctx, b.x, b.y, b.w, b.h, 8);
    const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    g.addColorStop(0, "#2b3646");
    g.addColorStop(1, "#1a222e");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = ran ? rgba(ACCENT, 0.6) : "rgba(150,170,195,0.3)";
    ctx.stroke();
    // Rivets and a vent: closed machinery, nothing to read.
    ctx.fillStyle = "rgba(170,190,215,0.35)";
    for (const [dx, dy] of [
      [8, 8],
      [b.w - 8, 8],
      [8, b.h - 8],
      [b.w - 8, b.h - 8],
    ]) {
      ctx.beginPath();
      ctx.arc(b.x + dx, b.y + dy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(8,12,18,0.7)";
    for (let i = 0; i < 3; i += 1) ctx.fillRect(b.x + b.w / 2 - 22, b.y + b.h / 2 - 10 + i * 9, 44, 4);
  }

  private drawMachine(ctx: CanvasRenderingContext2D, state: RenderState, s: ChamberStage): void {
    const { specimen, director } = state;
    const visual = director.visual;
    const b = housing(s);
    const tone = TONE_COLOURS[machineTone(specimen, s.stageId)];
    const active = visual.activeStageId === s.stageId && director.replay?.status !== "ready";
    const running = active && director.running;
    const executed = visual.executed.has(s.stageId);
    const failed = visual.failed?.stageId === s.stageId;
    const result = visual.results.get(s.stageId);

    if (running || result) {
      const pulse = 0.5 + 0.5 * Math.sin(state.time * 6);
      ctx.save();
      ctx.shadowColor = tone;
      ctx.shadowBlur = result ? 34 : 24 + 14 * pulse;
      roundRect(ctx, b.x, b.y, b.w, b.h, 14);
      ctx.fillStyle = rgba(tone, result ? 0.35 : 0.25);
      ctx.fill();
      ctx.restore();
    }

    // Housing: a heavy machine standing in the room.
    roundRect(ctx, b.x, b.y, b.w, b.h, 14);
    const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    g.addColorStop(0, "#273548");
    g.addColorStop(1, "#151d29");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = failed || running ? 4 : 2.5;
    ctx.strokeStyle = failed ? FAIL : running ? tone : executed ? rgba(tone, 0.8) : rgba(tone, 0.45);
    ctx.stroke();

    // Name plate.
    const plateH = Math.min(58, b.h * 0.32);
    ctx.save();
    roundRect(ctx, b.x, b.y, b.w, b.h, 14);
    ctx.clip();
    ctx.fillStyle = rgba(tone, executed ? 0.95 : 0.75);
    ctx.fillRect(b.x, b.y, b.w, plateH);
    ctx.restore();
    const title = machineTitle(specimen, s.stageId, s.title);
    ctx.font = `900 ${Math.min(38, plateH * 0.62)}px ${SANS}`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#06111c";
    ctx.fillText(fit(ctx, title, b.w - 24), b.x + b.w / 2, b.y + plateH * 0.7);

    // Screen: what this machine is doing in this run.
    const screen = { x: b.x + 16, y: b.y + plateH + 12, w: b.w - 32, h: b.h - plateH - 74 };
    if (screen.h > 24) {
      roundRect(ctx, screen.x, screen.y, screen.w, screen.h, 8);
      ctx.fillStyle = "#050a10";
      ctx.fill();
      ctx.strokeStyle = rgba(tone, 0.35);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      this.drawScreen(ctx, state, s, screen, tone);
    }

    if (failed) {
      ctx.font = `900 20px ${SANS}`;
      ctx.fillStyle = FAIL;
      ctx.fillText("✕", b.x + b.w - 20, b.y + plateH + 30);
    }
    ctx.textAlign = "left";

    if (state.inspected === s.stageId) {
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = "rgba(230,240,255,0.75)";
      ctx.lineWidth = 2;
      roundRect(ctx, b.x - 7, b.y - 7, b.w + 14, b.h + 14, 18);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /** The machine's screen, drawn from the run's processed events only. */
  private drawScreen(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    s: ChamberStage,
    box: Box,
    tone: string,
  ): void {
    const { director, world, specimen } = state;
    const visual = director.visual;
    const cx = box.x + box.w / 2;
    ctx.textAlign = "center";
    const answer = visual.answers.get(s.stageId);
    const result = visual.results.get(s.stageId);
    const replay = director.replay;

    if (answer && world.chamber.showFeedback) {
      // The exported feedback, line for line: VALUE = 19 / 19 < 22 / TRUE.
      const [valueLine, expression, verdict] = answer.feedback.lines;
      const unit = box.h / 3;
      ctx.font = `700 ${Math.min(22, unit * 0.55)}px ${MONO}`;
      ctx.fillStyle = "rgba(220,235,250,0.85)";
      ctx.fillText(valueLine, cx, box.y + unit * 0.75);
      ctx.font = `800 ${Math.min(32, unit * 0.8)}px ${MONO}`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(expression, cx, box.y + unit * 1.75);
      ctx.font = `900 ${Math.min(34, unit * 0.85)}px ${SANS}`;
      ctx.fillStyle = verdict === "TRUE" ? BOOL_COLOURS.TRUE : BOOL_COLOURS.FALSE;
      ctx.fillText(verdict, cx, box.y + unit * 2.7);
    } else if (result) {
      ctx.font = `900 ${Math.min(30, box.h * 0.45)}px ${SANS}`;
      ctx.fillStyle = tone;
      ctx.fillText(`RESULT = ${result}`, cx, box.y + box.h * 0.62);
    } else if (specimen.stage(s.stageId).kind === "entry") {
      ctx.font = `800 ${Math.min(26, box.h * 0.4)}px ${MONO}`;
      ctx.fillStyle = director.input === null ? "rgba(200,220,240,0.4)" : INPUT_BLUE;
      ctx.fillText(director.input === null ? "INPUT = ?" : `INPUT = ${director.input}`, cx, box.y + box.h * 0.62);
    } else {
      const sub = machineSubtitle(s.stageId);
      const valueWritten = replay && visual.executed.has(s.stageId) && replay.state.value !== specimen.bundle.state_contract.initial_sentinel;
      const text = sub && valueWritten ? `VALUE = ${replay.state.value}` : sub;
      if (text) {
        // Shrink to fit rather than truncate: the formula should read whole.
        let size = Math.min(26, box.h * 0.34);
        ctx.font = `800 ${size}px ${MONO}`;
        while (size > 12 && ctx.measureText(text).width > box.w - 20) {
          size -= 1;
          ctx.font = `800 ${size}px ${MONO}`;
        }
        ctx.fillStyle = valueWritten ? "#ffffff" : "rgba(210,228,245,0.75)";
        ctx.fillText(text, cx, box.y + box.h * 0.6);
      } else {
        ctx.font = `700 ${Math.min(18, box.h * 0.3)}px ${MONO}`;
        ctx.fillStyle = "rgba(200,220,240,0.25)";
        ctx.fillText("· · ·", cx, box.y + box.h * 0.6);
      }
    }
    ctx.textAlign = "left";
  }

  // --- room furniture -----------------------------------------------------

  private drawSolids(ctx: CanvasRenderingContext2D, state: RenderState): void {
    for (const s of state.world.chamber.solids) {
      if (s.oneWay) {
        ctx.fillStyle = "rgba(60,80,104,0.95)";
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = "rgba(160,200,235,0.55)";
        ctx.fillRect(s.x, s.y, s.w, 2);
        continue;
      }
      const g = ctx.createLinearGradient(0, s.y, 0, s.y + Math.min(s.h, 120));
      g.addColorStop(0, s.kind === "plinth" || s.kind === "shelf" ? "#2a3a50" : "#1b2636");
      g.addColorStop(1, "#0b111a");
      ctx.fillStyle = g;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      if (s.kind !== "wall" && s.kind !== "ceiling") {
        ctx.fillStyle = "rgba(150,190,225,0.4)";
        ctx.fillRect(s.x, s.y, s.w, 3);
      }
    }
  }

  private drawPit(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const pit = state.world.chamber.pit;
    if (!pit) return;
    const g = ctx.createLinearGradient(0, pit.y, 0, pit.y + pit.h);
    g.addColorStop(0, "rgba(4,6,10,0.4)");
    g.addColorStop(1, "rgba(2,3,6,0.95)");
    ctx.fillStyle = g;
    ctx.fillRect(pit.x, pit.y, pit.w, pit.h);
    for (const x of [pit.x - 30, pit.x + pit.w]) {
      for (let i = 0; i < 3; i += 1) {
        ctx.fillStyle = i % 2 === 0 ? "#ffc857" : "#1a1a1a";
        ctx.fillRect(x + i * 10, pit.y + 2, 10, 8);
      }
    }
  }

  private drawBridge(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const world = state.world;
    const br = world.chamber.bridge;
    if (!br) return;
    const extent = world.bridgeExtent;
    const moving = extent > 0 && extent < 1;
    const lamp = extent >= 1 ? ACCENT : moving ? "#ffc857" : FAIL;
    const hx = br.x - 60;
    const hy = br.y - 74;
    roundRect(ctx, hx, hy, 56, 74, 6);
    ctx.fillStyle = "#16202d";
    ctx.fill();
    ctx.strokeStyle = "rgba(150,190,225,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = lamp;
    ctx.shadowBlur = 18;
    ctx.fillStyle = lamp;
    ctx.beginPath();
    ctx.arc(hx + 28, hy + 20, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.font = `800 11px ${SANS}`;
    ctx.fillStyle = "rgba(200,220,240,0.8)";
    ctx.textAlign = "center";
    ctx.fillText("BRIDGE", hx + 28, hy + 48);
    ctx.fillText(extent >= 1 ? "OPEN" : moving ? "…" : "SHUT", hx + 28, hy + 63);
    ctx.textAlign = "left";
    const w = br.length * extent;
    if (w > 1) {
      ctx.fillStyle = "#2f4058";
      ctx.fillRect(br.x, br.y, w, BRIDGE.thickness);
      ctx.fillStyle = rgba(ACCENT, 0.8);
      ctx.fillRect(br.x, br.y, w, 3);
      ctx.fillStyle = "rgba(10,16,24,0.7)";
      for (let x = br.x + 14; x < br.x + w - 4; x += 28) ctx.fillRect(x, br.y + 6, 3, BRIDGE.thickness - 9);
    }
  }

  private drawDoors(ctx: CanvasRenderingContext2D, state: RenderState): void {
    for (const door of state.world.doors) {
      const d = door.def;
      const open = state.world.doorShouldOpen(door);
      // Frame, then the panel, which slides up into the frame.
      ctx.fillStyle = "#0e151f";
      ctx.fillRect(d.x - 6, d.y - 10, d.w + 12, d.h + 10);
      const panel = door.solid.h;
      if (panel > 0) {
        const g = ctx.createLinearGradient(d.x, 0, d.x + d.w, 0);
        g.addColorStop(0, "#3b4c63");
        g.addColorStop(1, "#273446");
        ctx.fillStyle = g;
        ctx.fillRect(d.x, d.y + d.h - panel, d.w, panel);
        ctx.fillStyle = open ? ACCENT : FAIL;
        ctx.fillRect(d.x + d.w / 2 - 3, d.y + d.h - panel + 12, 6, Math.max(0, panel - 24));
      }
      const rule = d.rule;
      if (rule.kind === "inputs_finished") {
        // One lamp per input that has to finish on the same wiring.
        const n = rule.inputs.length;
        rule.inputs.forEach((input, i) => {
          const lx = d.x + d.w / 2 + (i - (n - 1) / 2) * 52;
          const ly = d.y - 52;
          const lit = state.world.finishedInputs.has(input);
          ctx.save();
          if (lit) {
            ctx.shadowColor = ACCENT;
            ctx.shadowBlur = 20;
          }
          ctx.fillStyle = lit ? ACCENT : "#1d2633";
          ctx.beginPath();
          ctx.arc(lx, ly, 20, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          ctx.strokeStyle = lit ? "#ffffff" : "rgba(160,190,220,0.5)";
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.font = `900 20px ${SANS}`;
          ctx.textAlign = "center";
          ctx.fillStyle = lit ? "#06111c" : "rgba(200,220,240,0.8)";
          ctx.fillText(String(input), lx, ly + 7);
          ctx.textAlign = "left";
        });
      } else {
        const lit = open;
        ctx.save();
        ctx.shadowColor = lit ? ACCENT : FAIL;
        ctx.shadowBlur = 18;
        ctx.fillStyle = lit ? ACCENT : FAIL;
        ctx.beginPath();
        ctx.arc(d.x + d.w / 2, d.y - 30, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private drawSockets(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const director = state.director;
    for (const socket of state.world.sockets.values()) {
      const d = socket.def;
      const size = CARRY.cubeSize + 16;
      const colour = d.kind === "input" ? INPUT_BLUE : POWER;
      const filled = socket.cubeId !== null;
      const running = d.kind === "run" && director.running;
      const want = !filled && state.world.held?.kind === "cube";
      // Recessed bay with a lit rim.
      ctx.save();
      if (filled || running) {
        ctx.shadowColor = colour;
        ctx.shadowBlur = running ? 26 + 10 * Math.sin(state.time * 8) : 16;
      }
      ctx.strokeStyle = rgba(colour, filled ? 1 : want ? 0.7 + 0.3 * Math.sin(state.time * 5) : 0.6);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(d.x - size / 2, d.floorY - size);
      ctx.lineTo(d.x - size / 2, d.floorY);
      ctx.lineTo(d.x + size / 2, d.floorY);
      ctx.lineTo(d.x + size / 2, d.floorY - size);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = rgba(colour, filled ? 0.9 : 0.5);
      ctx.fillRect(d.x - size / 2 - 6, d.floorY - 4, size + 12, 4);
      // Label on the pedestal front.
      ctx.font = `900 15px ${SANS}`;
      ctx.textAlign = "center";
      ctx.fillStyle = rgba(colour, 0.95);
      ctx.fillText(d.label, d.x, d.floorY + 22);
      ctx.textAlign = "left";
    }
  }

  private drawCube(ctx: CanvasRenderingContext2D, cube: CubeRuntime, time: number): void {
    const s = CARRY.cubeSize;
    const x = cube.x - s / 2;
    const y = cube.y - s / 2;
    const isInput = cube.def.kind === "input";
    const colour = isInput ? INPUT_BLUE : POWER;
    ctx.save();
    ctx.shadowColor = colour;
    ctx.shadowBlur = 16 + 6 * Math.sin(time * 3);
    roundRect(ctx, x, y, s, s, 6);
    ctx.fillStyle = isInput ? "#12304a" : "#2a1f45";
    ctx.fill();
    ctx.restore();
    roundRect(ctx, x, y, s, s, 6);
    ctx.strokeStyle = isInput ? "#bfe2ff" : "#d9c2ff";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    if (isInput) {
      ctx.font = `900 24px ${SANS}`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(String(cube.def.value), cube.x, cube.y + 9);
      ctx.textAlign = "left";
    } else {
      // A lightning bolt: this one powers things.
      ctx.fillStyle = "#f0e2ff";
      ctx.beginPath();
      ctx.moveTo(cube.x + 3, y + 6);
      ctx.lineTo(cube.x - 8, cube.y + 2);
      ctx.lineTo(cube.x - 1, cube.y + 2);
      ctx.lineTo(cube.x - 4, y + s - 6);
      ctx.lineTo(cube.x + 8, cube.y - 3);
      ctx.lineTo(cube.x + 1, cube.y - 3);
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- player -------------------------------------------------------------

  private drawRope(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const p = state.world.player;
    const rope = p.rope;
    if (rope.phase === "idle") return;
    ctx.strokeStyle = rope.phase === "attached" ? rgba(ACCENT, 0.95) : "rgba(190,220,245,0.6)";
    ctx.lineWidth = rope.taut ? 2.4 : 1.6;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(rope.tip.x, rope.tip.y);
    ctx.stroke();
  }

  /** The previous game's silhouette: body, visor, scarf and a two-frame run. */
  private drawPlayer(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const p = state.world.player;
    const box = playerBox(p);
    const lean = clamp(p.vx / 700, -0.45, 0.45);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(lean * 0.35);
    const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
    halo.addColorStop(0, rgba(ACCENT, 0.3));
    halo.addColorStop(1, rgba(ACCENT, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(-46, -46, 92, 92);
    ctx.fillStyle = "#0d1420";
    ctx.fillRect(-box.w / 2, -box.h / 2, box.w, box.h);
    ctx.strokeStyle = rgba(ACCENT, 0.9);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-box.w / 2, -box.h / 2, box.w, box.h);
    ctx.fillStyle = rgba(ACCENT, 0.95);
    ctx.fillRect(p.facing > 0 ? 0 : -box.w / 2 + 2, -box.h / 2 + 6, box.w / 2 - 2, 4);
    ctx.strokeStyle = rgba(ACCENT, 0.55);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -box.h / 2 + 10);
    const tail = clamp(-p.vx * 0.035, -26, 26);
    const tailY = clamp(-p.vy * 0.02, -12, 14);
    ctx.quadraticCurveTo(tail * 0.5, -box.h / 2 + 14 + tailY * 0.4, tail, -box.h / 2 + 12 + tailY);
    ctx.stroke();
    if (state.world.held?.kind === "cube") {
      ctx.strokeStyle = "#0d1420";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-8, -box.h / 2 + 8);
      ctx.lineTo(-10, -box.h / 2 - 4);
      ctx.moveTo(8, -box.h / 2 + 8);
      ctx.lineTo(10, -box.h / 2 - 4);
      ctx.stroke();
    }
    ctx.strokeStyle = "#0d1420";
    ctx.lineWidth = 3.5;
    const stride = p.grounded ? Math.sin(state.time * 18) * clamp(Math.abs(p.vx) / 320, 0, 1) * 7 : 4;
    ctx.beginPath();
    ctx.moveTo(-3, box.h / 2 - 1);
    ctx.lineTo(-3 - stride, box.h / 2 + 5);
    ctx.moveTo(3, box.h / 2 - 1);
    ctx.lineTo(3 + stride, box.h / 2 + 5);
    ctx.stroke();
    ctx.restore();
  }

  // --- overlays -------------------------------------------------------------

  /** Write chips above their machine (or sealed housing), oldest first. */
  private drawPopups(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const visual = state.director.visual;
    const byStage = new Map<string, typeof visual.popups>();
    for (const popup of visual.popups) {
      const list = byStage.get(popup.stageId) ?? [];
      list.push(popup);
      byStage.set(popup.stageId, list);
    }
    for (const [stageId, popups] of byStage) {
      const stage = state.layout.stages.get(stageId);
      if (!stage) continue;
      const b = housing(stage);
      const big = (tone: string): boolean => tone === "bridge" || tone === "fail";
      const widths = popups.map((popup) => {
        ctx.font = `800 ${big(popup.tone) ? 22 : 18}px ${SANS}`;
        return ctx.measureText(popup.text).width + 22;
      });
      const total = widths.reduce((a, c) => a + c, 0) + (popups.length - 1) * 10;
      let x = b.x + b.w / 2 - total / 2;
      popups.forEach((popup, i) => {
        const fade = clamp((popup.life - popup.age) / 0.5, 0, 1);
        const intro = clamp(popup.age / 0.15, 0, 1);
        const y = b.y - 22 - (1 - intro) * 10;
        const colour =
          popup.tone === "fail"
            ? FAIL
            : popup.tone === "bridge"
              ? ACCENT
              : popup.tone === "output"
                ? (TONE_COLOURS[(popup.label?.toLowerCase() ?? "neutral") as "low"] ?? "#e8f2fb")
                : "#cfe3f5";
        ctx.globalAlpha = fade * intro;
        ctx.font = `800 ${big(popup.tone) ? 22 : 18}px ${SANS}`;
        roundRect(ctx, x, y - 26, widths[i], 36, 8);
        ctx.fillStyle = "rgba(4,8,14,0.94)";
        ctx.fill();
        ctx.strokeStyle = colour;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = colour;
        ctx.fillText(popup.text, x + 11, y - 1);
        ctx.globalAlpha = 1;
        x += widths[i] + 10;
      });
    }
  }

  private drawFocus(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const f = state.focus;
    if (!f) return;
    const r = (f.kind === "socket" ? 34 : 22) + Math.sin(state.time * 5) * 2;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(f.at.x, f.at.y, r, 0, Math.PI * 2);
    ctx.stroke();
    const kx = f.at.x;
    const ky = f.at.y - r - 22;
    roundRect(ctx, kx - 14, ky - 14, 28, 28, 5);
    ctx.fillStyle = "rgba(240,246,252,0.96)";
    ctx.fill();
    ctx.font = `900 16px ${SANS}`;
    ctx.fillStyle = "#06111c";
    ctx.textAlign = "center";
    ctx.fillText("E", kx, ky + 6);
    ctx.textAlign = "left";
  }

  private drawReticle(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const g = state.grapple;
    if (!g) return;
    if (g.target && state.world.player.rope.phase === "idle") {
      const s = grappleBox(g.target.solid);
      ctx.strokeStyle = rgba(ACCENT, 0.75);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(s.x - 3, s.y - 3, s.w + 6, s.h + 6);
    }
    ctx.strokeStyle = g.target ? rgba(ACCENT, 0.9) : "rgba(160,185,205,0.35)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(g.aim.x, g.aim.y, g.target ? 7 : 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawDebug(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const world = state.world;
    ctx.lineWidth = 1;
    ctx.font = `10px ${MONO}`;
    for (const s of world.solids) {
      if (!s.enabled) continue;
      ctx.strokeStyle = s.oneWay ? "rgba(90,240,170,0.8)" : "rgba(255,255,255,0.45)";
      ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);
      ctx.fillStyle = "rgba(220,240,255,0.75)";
      ctx.fillText(`${s.id}${s.oneWay ? " (1-way)" : ""}`, s.x + 4, s.y - 4);
    }
    for (const s of world.chamber.stages) {
      const b = housing(s);
      ctx.fillStyle = "rgba(255,220,140,0.95)";
      ctx.fillText(`${s.stageId} · ${s.mode}`, b.x, b.y + b.h + 14);
    }
    for (const jack of world.jacks) {
      ctx.fillStyle = "rgba(255,200,87,0.9)";
      ctx.fillText(jack.portId ?? `${jack.stageId}:IN`, jack.at.x - 30, jack.at.y + 30);
    }
    for (const [portId, route] of state.layout.pipes) {
      const mid = polylinePoint(route, 0.5);
      ctx.fillStyle = "rgba(160,220,255,0.85)";
      ctx.fillText(portId, mid.x - 30, mid.y - 6);
    }
    const p = world.player;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(`${p.x.toFixed(0)},${p.y.toFixed(0)}`, p.x + 16, p.y - PLAYER.height / 2 - 6);
  }
}
