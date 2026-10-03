/**
 * Canvas renderer for the chamber. The background grid, player silhouette,
 * rope and particles are carried over from the previous Binary Ninja
 * renderer; cards, cables, the bridge and the station are new. It reads game
 * state and never changes it.
 */

import type { SpecimenIndex } from "../data/bundle.ts";
import type { Comparison } from "../data/bundle-types.ts";
import { BRIDGE, CARRY, PLAYER } from "../engine/constants.ts";
import { clamp } from "../engine/geometry.ts";
import type { Box, Vec2 } from "../engine/geometry.ts";
import type { GrappleTarget } from "../engine/physics.ts";
import { grappleBox, playerBox } from "../engine/physics.ts";
import { CARD_FACES, HINT_COLOURS, TONE_COLOURS } from "../level/card-faces.ts";
import {
  cardExcerpt,
  cardTag,
  cardTitle,
  comparisonValues,
  isRevealedCandidate,
  relationshipPhrase,
  stateText,
} from "../level/presentation.ts";
import { cardPanel } from "../level/room.ts";
import type { RunDirector } from "../replay/director.ts";
import { connectionKey } from "../replay/director.ts";
import type { CardRuntime, Interactable, World } from "../world/world.ts";
import { Camera } from "./camera.ts";
import { Particles } from "./fx.ts";

export interface RenderState {
  world: World;
  specimen: SpecimenIndex;
  director: RunDirector;
  revealed: boolean;
  focus: Interactable | null;
  time: number;
  debug: boolean;
  inspected: string | null;
  /** Only when the grapple is enabled. */
  grapple: { target: GrappleTarget | null; aim: Vec2 } | null;
}

const SANS = `"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif`;
const MONO = `ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace`;
const ACCENT = "#4ee0a1";
const FAIL = "#ff5f7a";
const CABLE = "rgba(150,196,232,0.85)";

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

/** Cubic cable path from an output socket to an input socket, with cosmetic sag. */
export function cablePath(a: Vec2, b: Vec2): [Vec2, Vec2, Vec2, Vec2] {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const reach = Math.max(70, Math.abs(b.x - a.x) * 0.25);
  const sag = 26 + dist * 0.1;
  return [a, { x: a.x + reach, y: a.y + sag }, { x: b.x - reach, y: b.y + sag }, b];
}

function cubicPoint(p: [Vec2, Vec2, Vec2, Vec2], t: number): Vec2 {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x,
    y: a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y,
  };
}

export class Renderer {
  readonly camera = new Camera();
  readonly particles = new Particles();
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;

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

  /** Which card panel, if any, is under a screen point. */
  cardAt(world: World, sx: number, sy: number): string | null {
    const p = this.camera.screenToWorld(sx, sy);
    for (const [stageId, c] of world.cards) {
      const b = cardPanel(c.card);
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return stageId;
    }
    return null;
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
    this.drawStateBoard(ctx, state);
    for (const [stageId, c] of state.world.cards) this.drawCard(ctx, state, stageId, c);
    this.drawStation(ctx, state);
    this.drawPit(ctx, state);
    this.drawSolids(ctx, state);
    this.drawBridge(ctx, state);
    this.drawCables(ctx, state);
    for (const [stageId, c] of state.world.cards) this.drawSockets(ctx, state, stageId, c);
    this.drawCube(ctx, state);
    this.drawRope(ctx, state);
    this.drawPlayer(ctx, state);
    this.drawRunOverlays(ctx, state);
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

    // Two parallax grids, from the previous game.
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

  /** The chamber's back wall: a lit interior with a few structural ribs. */
  private drawRoomBack(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const room = state.world.room;
    const g = ctx.createLinearGradient(0, 60, 0, 1100);
    g.addColorStop(0, "rgba(16,24,36,0.92)");
    g.addColorStop(1, "rgba(12,18,28,0.96)");
    ctx.fillStyle = g;
    ctx.fillRect(40, 60, room.world.width - 80, room.world.height - 60);

    ctx.strokeStyle = "rgba(120,160,200,0.06)";
    ctx.lineWidth = 2;
    for (let x = 160; x < room.world.width - 40; x += 380) {
      ctx.beginPath();
      ctx.moveTo(x, 60);
      ctx.lineTo(x, 1100);
      ctx.stroke();
    }
    // Far-side alcove glow, so the objective reads from across the pit.
    const far = room.farSide;
    const alcove = ctx.createRadialGradient(far.x + far.w * 0.6, far.y + far.h, 40, far.x + far.w * 0.6, far.y + far.h, 520);
    alcove.addColorStop(0, rgba(state.world.station === "locked" ? "#c08cff" : ACCENT, 0.12));
    alcove.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = alcove;
    ctx.fillRect(far.x - 200, far.y - 300, far.w + 200, far.h + 300);

    ctx.font = `600 13px ${MONO}`;
    ctx.fillStyle = "rgba(170,200,230,0.32)";
    ctx.fillText(room.name.toUpperCase(), 64, 100);
  }

  private drawStateBoard(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const { specimen, director } = state;
    const b = state.world.room.stateBoard;
    const replay = director.replay;
    roundRect(ctx, b.x, b.y, b.w, b.h, 10);
    ctx.fillStyle = "rgba(6,10,16,0.92)";
    ctx.fill();
    ctx.strokeStyle = "rgba(130,170,210,0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Hanging cables to the ceiling.
    ctx.strokeStyle = "rgba(130,170,210,0.25)";
    ctx.beginPath();
    ctx.moveTo(b.x + 40, 60);
    ctx.lineTo(b.x + 40, b.y);
    ctx.moveTo(b.x + b.w - 40, 60);
    ctx.lineTo(b.x + b.w - 40, b.y);
    ctx.stroke();

    ctx.font = `600 15px ${MONO}`;
    ctx.fillStyle = "rgba(200,225,245,0.85)";
    ctx.fillText(`${specimen.bundle.binary.target_function.name}(input = ${director.selectedInput})`, b.x + 22, b.y + 34);
    const status = replay.status.toUpperCase();
    ctx.font = `600 12px ${MONO}`;
    ctx.fillStyle =
      replay.status === "stopped" ? FAIL : replay.status === "finished" ? ACCENT : replay.status === "running" ? "#ffc857" : "rgba(170,200,230,0.6)";
    ctx.textAlign = "right";
    ctx.fillText(status, b.x + b.w - 22, b.y + 34);
    ctx.textAlign = "left";

    const fields = [
      ["value", replay.state.value],
      ["result", replay.state.result],
      ["bridge_open", replay.state.bridge_open],
    ] as const;
    const colW = (b.w - 44) / 3;
    fields.forEach(([field, value], i) => {
      const x = b.x + 22 + colW * i;
      ctx.font = `12px ${MONO}`;
      ctx.fillStyle = "rgba(160,190,215,0.65)";
      ctx.fillText(field, x, b.y + 74);
      const text = stateText(specimen, field, value);
      const unset = text === "unset";
      let colour = unset ? "rgba(160,190,215,0.35)" : "#e8f2fb";
      if (field === "result" && !unset) colour = HINT_COLOURS[specimen.resultName(value) ?? ""] ?? colour;
      if (field === "bridge_open" && value === 1) colour = ACCENT;
      ctx.font = `700 ${unset ? 22 : 30}px ${SANS}`;
      ctx.fillStyle = colour;
      ctx.fillText(text, x, b.y + 116);
    });
    ctx.font = `12px ${SANS}`;
    ctx.fillStyle = "rgba(170,200,230,0.55)";
    ctx.fillText(
      `Controller memory as written by the retained run · trace ${replay.trace.id}`,
      b.x + 22,
      b.y + b.h - 24,
    );
  }

  // --- cards ------------------------------------------------------------

  private drawCard(ctx: CanvasRenderingContext2D, state: RenderState, stageId: string, c: CardRuntime): void {
    const { specimen, director, revealed } = state;
    const visual = director.visual;
    const face = CARD_FACES[stageId];
    const tone = TONE_COLOURS[face?.tone ?? "entry"];
    const p = cardPanel(c.card);
    const active = visual.activeStageId === stageId && director.replay.status !== "ready";
    const executed = visual.executed.has(stageId);
    const failed = visual.failed?.from === stageId;
    const bogus = isRevealedCandidate(specimen, stageId, revealed);

    // Glow for the executing card.
    if (active && director.replay.status === "running") {
      const pulse = 0.5 + 0.5 * Math.sin(state.time * 6);
      ctx.save();
      ctx.shadowColor = tone;
      ctx.shadowBlur = 26 + 14 * pulse;
      roundRect(ctx, p.x, p.y, p.w, p.h, 9);
      ctx.fillStyle = rgba(tone, 0.25);
      ctx.fill();
      ctx.restore();
    }

    roundRect(ctx, p.x, p.y, p.w, p.h, 9);
    ctx.fillStyle = executed ? "rgba(12,22,32,0.97)" : "rgba(9,15,24,0.95)";
    ctx.fill();
    ctx.lineWidth = active || failed ? 2.5 : 1.2;
    ctx.strokeStyle = failed ? FAIL : active ? tone : executed ? rgba(tone, 0.7) : "rgba(130,170,210,0.28)";
    ctx.stroke();

    // Tone stripe and title.
    ctx.save();
    roundRect(ctx, p.x, p.y, p.w, p.h, 9);
    ctx.clip();
    ctx.fillStyle = rgba(tone, executed ? 0.95 : 0.7);
    ctx.fillRect(p.x, p.y, p.w, 4);
    ctx.restore();

    const title = cardTitle(specimen, stageId, revealed).toUpperCase();
    const tag = cardTag(specimen, stageId);
    ctx.font = `10.5px ${MONO}`;
    const tagW = ctx.measureText(tag).width;
    ctx.fillStyle = "rgba(170,200,225,0.55)";
    ctx.textAlign = "right";
    ctx.fillText(tag, p.x + p.w - 12, p.y + 27);
    ctx.textAlign = "left";
    ctx.font = `700 15px ${SANS}`;
    ctx.fillStyle = "#e8f2fb";
    ctx.fillText(fit(ctx, title, p.w - 38 - tagW), p.x + 14, p.y + 28);

    let y = p.y + 54;
    if (specimen.stage(stageId).kind === "entry") {
      this.drawInputChips(ctx, state, p.x + 14, p.y + 40);
      y = p.y + 96;
    } else {
      ctx.font = `15px ${SANS}`;
      ctx.fillStyle = "rgba(225,238,250,0.93)";
      for (const line of face?.lines ?? []) {
        ctx.fillText(fit(ctx, line, p.w - 28), p.x + 14, y);
        y += 20;
      }
      y = Math.max(y, p.y + 92) + 4;
    }
    ctx.fillStyle = "rgba(130,170,210,0.16)";
    ctx.fillRect(p.x + 14, y - 14, p.w - 28, 1);

    for (const ins of cardExcerpt(specimen, stageId)) {
      ctx.font = `11px ${MONO}`;
      ctx.fillStyle = "rgba(150,178,204,0.55)";
      ctx.fillText(ins.rva, p.x + 14, y + 2);
      ctx.fillStyle = "rgba(214,232,248,0.9)";
      ctx.fillText(fit(ctx, ins.text, p.w - 86), p.x + 62, y + 2);
      y += 15;
    }

    if (specimen.stage(stageId).kind === "entry") this.drawRunPlate(ctx, state, p);

    // Socket captions.
    ctx.font = `600 9.5px ${MONO}`;
    ctx.fillStyle = "rgba(170,200,225,0.5)";
    if (c.in) ctx.fillText("IN", p.x + 12, p.y + p.h - 10);
    if (c.out) {
      ctx.textAlign = "right";
      ctx.fillText("OUT", p.x + p.w - 14, p.y + p.h - 10);
      ctx.textAlign = "left";
    }

    if (bogus) this.drawBogusStamp(ctx, p, state);
    if (failed) {
      ctx.font = `700 13px ${SANS}`;
      ctx.fillStyle = FAIL;
      ctx.textAlign = "right";
      ctx.fillText("✕ STOPPED HERE", p.x + p.w - 12, p.y + p.h - 26);
      ctx.textAlign = "left";
    }
    if (state.inspected === stageId) {
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = "rgba(230,240,255,0.7)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, p.x - 5, p.y - 5, p.w + 10, p.h + 10, 12);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private drawInputChips(ctx: CanvasRenderingContext2D, state: RenderState, x: number, y: number): void {
    const inputs = state.specimen.inputs;
    ctx.font = `12px ${SANS}`;
    ctx.fillStyle = "rgba(190,215,235,0.7)";
    ctx.fillText("input", x, y + 22);
    inputs.forEach((input, i) => {
      const cx = x + 48 + i * 52;
      const selected = state.director.selectedInput === input;
      roundRect(ctx, cx, y + 2, 42, 32, 6);
      ctx.fillStyle = selected ? rgba(TONE_COLOURS.entry, 0.9) : "rgba(30,44,60,0.9)";
      ctx.fill();
      ctx.strokeStyle = selected ? "#ffffff" : "rgba(130,170,210,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = `700 19px ${SANS}`;
      ctx.fillStyle = selected ? "#06111c" : "rgba(200,220,240,0.75)";
      ctx.textAlign = "center";
      ctx.fillText(String(input), cx + 21, y + 25);
      ctx.textAlign = "left";
    });
  }

  private drawRunPlate(ctx: CanvasRenderingContext2D, state: RenderState, p: Box): void {
    const status = state.director.replay.status;
    const w = 112;
    const x = p.x + p.w / 2 - w / 2;
    const y = p.y + p.h - 34;
    roundRect(ctx, x, y, w, 24, 5);
    ctx.fillStyle = status === "running" ? "rgba(255,200,87,0.85)" : rgba(ACCENT, 0.85);
    ctx.fill();
    ctx.font = `700 12px ${SANS}`;
    ctx.fillStyle = "#06111c";
    ctx.textAlign = "center";
    ctx.fillText(status === "running" ? "RUNNING…" : "▶ RUN  (Enter)", x + w / 2, y + 16);
    ctx.textAlign = "left";
  }

  private drawBogusStamp(ctx: CanvasRenderingContext2D, p: Box, state: RenderState): void {
    ctx.save();
    roundRect(ctx, p.x, p.y, p.w, p.h, 9);
    ctx.clip();
    ctx.fillStyle = "rgba(255,70,110,0.12)";
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = "rgba(255,90,130,0.22)";
    ctx.lineWidth = 6;
    for (let i = -p.h; i < p.w; i += 22) {
      ctx.beginPath();
      ctx.moveTo(p.x + i, p.y + p.h);
      ctx.lineTo(p.x + i + p.h, p.y);
      ctx.stroke();
    }
    ctx.restore();
    const pulse = 0.85 + 0.15 * Math.sin(state.time * 3);
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2 + 8);
    ctx.rotate(-0.12);
    ctx.font = `800 17px ${SANS}`;
    const label = "PROVEN BOGUS CLONE";
    const w = ctx.measureText(label).width + 24;
    roundRect(ctx, -w / 2, -18, w, 34, 5);
    ctx.fillStyle = `rgba(30,6,14,${0.9 * pulse})`;
    ctx.fill();
    ctx.strokeStyle = FAIL;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = FAIL;
    ctx.textAlign = "center";
    ctx.fillText(label, 0, 5);
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = "rgba(255,170,190,0.9)";
    ctx.fillText("unreachable clone · inspect (I) for the proof", 0, 30);
    ctx.restore();
  }

  // --- sockets and cables -----------------------------------------------

  private drawSockets(ctx: CanvasRenderingContext2D, state: RenderState, stageId: string, c: CardRuntime): void {
    const tone = TONE_COLOURS[CARD_FACES[stageId]?.tone ?? "entry"];
    const holdingCable = state.world.held?.kind === "cable";
    for (const side of ["in", "out"] as const) {
      const at = c[side];
      if (!at) continue;
      const plugged = side === "out" ? state.world.connection(stageId) !== null : false;
      const invite = holdingCable && side === "in";
      ctx.beginPath();
      ctx.arc(at.x, at.y, invite ? 11 + Math.sin(state.time * 6) * 1.5 : 10, 0, Math.PI * 2);
      ctx.fillStyle = "#0a121c";
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = invite ? "#ffffff" : rgba(tone, 0.9);
      ctx.stroke();
      if (side === "out") {
        // Arrow pointing out of the card.
        ctx.fillStyle = plugged ? rgba(tone, 1) : rgba(tone, 0.55);
        ctx.beginPath();
        ctx.moveTo(at.x - 3, at.y - 5);
        ctx.lineTo(at.x + 5, at.y);
        ctx.lineTo(at.x - 3, at.y + 5);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = rgba(tone, 0.6);
        ctx.beginPath();
        ctx.arc(at.x, at.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private socket(state: RenderState, stageId: string, side: "in" | "out"): Vec2 | null {
    return state.world.cards.get(stageId)?.[side] ?? null;
  }

  private strokeCable(ctx: CanvasRenderingContext2D, path: [Vec2, Vec2, Vec2, Vec2], colour: string, width: number): void {
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    ctx.bezierCurveTo(path[1].x, path[1].y, path[2].x, path[2].y, path[3].x, path[3].y);
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(2,4,8,0.85)";
    ctx.lineWidth = width + 3;
    ctx.stroke();
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  private drawCables(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const visual = state.director.visual;
    for (const [from, to] of state.world.wiring()) {
      const a = this.socket(state, from, "out");
      const b = this.socket(state, to, "in");
      if (!a || !b) continue;
      const path = cablePath(a, b);
      const followed = visual.followed.has(connectionKey(from, to));
      const failed = visual.failed?.from === from && visual.failed.to === to;
      const colour = failed ? FAIL : followed ? ACCENT : CABLE;
      this.strokeCable(ctx, path, colour, failed || followed ? 4 : 3);
      // Plug heads at both ends.
      for (const end of [a, b]) {
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.arc(end.x, end.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const held = state.world.held;
    if (held?.kind === "cable") {
      const a = this.socket(state, held.from, "out");
      const p = state.world.player;
      if (a) {
        const hand = { x: p.x + p.facing * 9, y: p.y - 2 };
        this.strokeCable(ctx, cablePath(a, hand), "#ffc857", 3);
        ctx.fillStyle = "#ffc857";
        ctx.beginPath();
        ctx.arc(hand.x, hand.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const pulse = visual.pulse;
    if (pulse) {
      const a = this.socket(state, pulse.from, "out");
      const b = this.socket(state, pulse.to, "in");
      if (a && b) {
        const path = cablePath(a, b);
        const t = clamp(pulse.elapsed / pulse.duration, 0, 1);
        for (let i = 6; i >= 0; i -= 1) {
          const pt = cubicPoint(path, clamp(t - i * 0.025, 0, 1));
          ctx.fillStyle = rgba(ACCENT, 0.12 + (6 - i) * 0.12);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4 + (6 - i) * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // A stop with nothing plugged in: a red stub out of the socket.
    const failed = visual.failed;
    if (failed && failed.to === null) {
      const a = this.socket(state, failed.from, "out");
      if (a) {
        ctx.strokeStyle = FAIL;
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x + 40, a.y + 16);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  // --- room furniture -----------------------------------------------------

  private drawSolids(ctx: CanvasRenderingContext2D, state: RenderState): void {
    for (const s of state.world.room.solids) {
      if (s.kind === "catwalk" || s.kind === "rung" || s.kind === "step") {
        ctx.fillStyle = "rgba(60,80,104,0.95)";
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = "rgba(160,200,235,0.55)";
        ctx.fillRect(s.x, s.y, s.w, 2);
        if (s.kind === "catwalk") {
          // Railing posts under the walkway, so it reads as a gallery.
          ctx.fillStyle = "rgba(60,80,104,0.6)";
          for (let x = s.x + 20; x < s.x + s.w; x += 120) ctx.fillRect(x, s.y + s.h, 4, 22);
        }
        continue;
      }
      const g = ctx.createLinearGradient(0, s.y, 0, s.y + Math.min(s.h, 120));
      g.addColorStop(0, "#1b2636");
      g.addColorStop(1, "#0b111a");
      ctx.fillStyle = g;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = "rgba(150,190,225,0.35)";
      if (s.kind === "floor") ctx.fillRect(s.x, s.y, s.w, 2);
    }
  }

  private drawPit(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const pit = state.world.room.pit;
    const g = ctx.createLinearGradient(0, pit.y, 0, pit.y + pit.h);
    g.addColorStop(0, "rgba(4,6,10,0.4)");
    g.addColorStop(1, "rgba(2,3,6,0.95)");
    ctx.fillStyle = g;
    ctx.fillRect(pit.x, pit.y, pit.w, pit.h);
    // Hazard striping on the lips of the pit.
    for (const x of [pit.x - 26, pit.x + pit.w]) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, pit.y + 2, 26, 8);
      ctx.clip();
      for (let i = -10; i < 40; i += 10) {
        ctx.fillStyle = (i / 10) % 2 === 0 ? "#ffc857" : "#1a1a1a";
        ctx.beginPath();
        ctx.moveTo(x + i, pit.y + 10);
        ctx.lineTo(x + i + 5, pit.y + 2);
        ctx.lineTo(x + i + 10, pit.y + 2);
        ctx.lineTo(x + i + 5, pit.y + 10);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawBridge(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const world = state.world;
    const br = world.room.bridge;
    const extent = world.bridgeExtent;
    const moving = extent > 0 && extent < 1;
    const lamp = extent >= 1 ? ACCENT : moving ? "#ffc857" : FAIL;

    // Motor housing on the near lip.
    const hx = br.x - 58;
    const hy = br.y - 70;
    roundRect(ctx, hx, hy, 52, 70, 5);
    ctx.fillStyle = "#16202d";
    ctx.fill();
    ctx.strokeStyle = "rgba(150,190,225,0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = lamp;
    ctx.shadowBlur = 16;
    ctx.fillStyle = lamp;
    ctx.beginPath();
    ctx.arc(hx + 26, hy + 18, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.font = `600 8.5px ${MONO}`;
    ctx.fillStyle = "rgba(190,215,235,0.7)";
    ctx.textAlign = "center";
    ctx.fillText("BRIDGE", hx + 26, hy + 42);
    ctx.fillText(extent >= 1 ? "OPEN" : moving ? "MOVING" : "CLOSED", hx + 26, hy + 55);
    ctx.textAlign = "left";

    const w = br.length * extent;
    if (w > 1) {
      ctx.fillStyle = "#2b3a4e";
      ctx.fillRect(br.x, br.y, w, BRIDGE.thickness);
      ctx.fillStyle = rgba(ACCENT, 0.75);
      ctx.fillRect(br.x, br.y, w, 2);
      ctx.fillStyle = "rgba(10,16,24,0.7)";
      for (let x = br.x + 14; x < br.x + w - 4; x += 28) ctx.fillRect(x, br.y + 5, 3, BRIDGE.thickness - 8);
      if (moving) {
        ctx.fillStyle = rgba("#ffc857", 0.9);
        ctx.fillRect(br.x + w - 4, br.y - 2, 4, BRIDGE.thickness + 4);
      }
    }
  }

  private drawStation(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const st = state.world.room.station;
    const status = state.world.station;
    const x = st.x;
    const y = st.floorY - 8 - st.height;
    const colour = status === "locked" ? "#c08cff" : status === "online" ? "#ffc857" : ACCENT;
    roundRect(ctx, x, y, st.width, st.height, 10);
    ctx.fillStyle = status === "locked" ? "rgba(14,12,24,0.95)" : "rgba(10,18,26,0.97)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = rgba(colour, status === "locked" ? 0.5 : 0.9);
    ctx.stroke();

    ctx.font = `700 15px ${SANS}`;
    ctx.fillStyle = "#e8f2fb";
    ctx.fillText("ANALYSIS STATION", x + 16, y + 30);
    ctx.font = `600 11px ${MONO}`;
    ctx.fillStyle = colour;
    ctx.fillText(status === "locked" ? "OFFLINE" : status === "online" ? "ONLINE" : "ANALYSIS COMPLETE", x + 16, y + 50);

    if (status === "locked") {
      // Padlock.
      const lx = x + st.width - 56;
      const ly = y + 70;
      ctx.strokeStyle = colour;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(lx + 20, ly + 16, 13, Math.PI, 0);
      ctx.stroke();
      roundRect(ctx, lx, ly + 16, 40, 32, 5);
      ctx.fillStyle = colour;
      ctx.fill();
    }

    const lines =
      status === "locked"
        ? ["Reveals which code is fake:", "proof-backed bogus clones.", "Needs power: bring the cube."]
        : status === "online"
          ? ["Power restored.", "Press E here to run the", "bogus-clone analysis."]
          : [
              `${state.specimen.bundle.analysis_reward.reveal_stage_ids.length} proven clones marked.`,
              "Inspect a marked card (I)",
              "to read its proof.",
            ];
    ctx.font = `14px ${SANS}`;
    ctx.fillStyle = "rgba(220,232,245,0.85)";
    lines.forEach((line, i) => ctx.fillText(line, x + 16, y + 90 + i * 20));

    // The cube slot.
    const slot = st.slot;
    const size = CARRY.cubeSize + 10;
    const want = status === "locked";
    ctx.setLineDash(want ? [6, 5] : []);
    ctx.strokeStyle = rgba(colour, want ? 0.6 + 0.3 * Math.sin(state.time * 4) : 0.8);
    ctx.lineWidth = 2;
    ctx.strokeRect(slot.x - size / 2, slot.y - size / 2, size, size);
    ctx.setLineDash([]);
    if (want) {
      ctx.font = `600 9px ${MONO}`;
      ctx.fillStyle = rgba(colour, 0.85);
      ctx.textAlign = "center";
      ctx.fillText("POWER SLOT", slot.x, slot.y - size / 2 - 8);
      ctx.textAlign = "left";
    }
  }

  private drawCube(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const cube = state.world.cube;
    const s = CARRY.cubeSize;
    const x = cube.x - s / 2;
    const y = cube.y - s / 2;
    ctx.save();
    ctx.shadowColor = "#c08cff";
    ctx.shadowBlur = 18 + 6 * Math.sin(state.time * 3);
    roundRect(ctx, x, y, s, s, 6);
    ctx.fillStyle = "#2a1f45";
    ctx.fill();
    ctx.restore();
    roundRect(ctx, x, y, s, s, 6);
    ctx.strokeStyle = "#d9c2ff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(217,194,255,0.6)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 9, y + 9, s - 18, s - 18);
    ctx.fillStyle = "#d9c2ff";
    ctx.fillRect(cube.x - 3, cube.y - 3, 6, 6);
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

    // Arms up while carrying the cube.
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

  // --- execution overlays -------------------------------------------------

  private drawRunOverlays(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const visual = state.director.visual;
    if (visual.comparison) this.drawHintBadge(ctx, state, visual.comparison);

    const byStage = new Map<string, typeof visual.popups>();
    for (const popup of visual.popups) {
      const list = byStage.get(popup.stageId) ?? [];
      list.push(popup);
      byStage.set(popup.stageId, list);
    }
    // Writes appear as a row of chips just above their card, oldest first.
    for (const [stageId, popups] of byStage) {
      const card = state.world.cards.get(stageId);
      if (!card) continue;
      const p = cardPanel(card.card);
      const big = (tone: string): boolean => tone === "bridge" || tone === "fail";
      const widths = popups.map((popup) => {
        ctx.font = `700 ${big(popup.tone) ? 16 : 14}px ${SANS}`;
        return ctx.measureText(popup.text).width + 18;
      });
      const total = widths.reduce((a, b) => a + b, 0) + (popups.length - 1) * 8;
      let x = p.x + p.w / 2 - total / 2;
      popups.forEach((popup, i) => {
        const fade = clamp((popup.life - popup.age) / 0.5, 0, 1);
        const intro = clamp(popup.age / 0.15, 0, 1);
        const y = p.y - 14 - (1 - intro) * 8;
        const colour =
          popup.tone === "fail"
            ? FAIL
            : popup.tone === "bridge"
              ? ACCENT
              : popup.tone === "done"
                ? TONE_COLOURS.end
                : popup.tone === "output"
                  ? (HINT_COLOURS[popup.label ?? ""] ?? "#e8f2fb")
                  : "#cfe3f5";
        ctx.globalAlpha = fade * intro;
        ctx.font = `700 ${big(popup.tone) ? 16 : 14}px ${SANS}`;
        roundRect(ctx, x, y - 20, widths[i], 28, 6);
        ctx.fillStyle = "rgba(4,8,14,0.94)";
        ctx.fill();
        ctx.strokeStyle = colour;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = colour;
        ctx.fillText(popup.text, x + 9, y - 1);
        ctx.globalAlpha = 1;
        x += widths[i] + 8;
      });
    }
  }

  /**
   * The beginner hint: a number line around the comparison target with the
   * measured value marked, coloured by the exported hint. Values are the
   * comparison's measured operands; the words are its exported relationship.
   */
  private drawHintBadge(ctx: CanvasRenderingContext2D, state: RenderState, c: Comparison): void {
    const card = state.world.cards.get(c.stage_id);
    if (!card) return;
    const p = cardPanel(card.card);
    const { value, target } = comparisonValues(c);
    const colour = HINT_COLOURS[c.hint] ?? "#ffffff";
    const w = 360;
    const h = 124;
    const x = p.x + p.w / 2 - w / 2;
    const y = p.y - h - 46;

    roundRect(ctx, x, y, w, h, 10);
    ctx.fillStyle = "rgba(4,8,14,0.96)";
    ctx.fill();
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = `700 21px ${SANS}`;
    ctx.fillStyle = "#e8f2fb";
    ctx.fillText(relationshipPhrase(c), x + 16, y + 32);
    ctx.font = `800 21px ${SANS}`;
    ctx.fillStyle = colour;
    ctx.textAlign = "right";
    ctx.fillText(c.hint, x + w - 16, y + 32);
    ctx.textAlign = "left";

    // Number line: LOW | MATCH | HIGH around the target, value marked below.
    const span = 8;
    const lx = x + 22;
    const lw = w - 44;
    const ly = y + 58;
    const at = (v: number): number => lx + ((clamp(v, target - span, target + span) - (target - span)) / (span * 2)) * lw;
    const zone = (from: number, to: number, hex: string, active: boolean): void => {
      ctx.fillStyle = rgba(hex, active ? 0.9 : 0.22);
      ctx.fillRect(from, ly - 6, to - from, 12);
    };
    zone(lx, at(target - 0.5), HINT_COLOURS.LOW, c.hint === "LOW");
    zone(at(target - 0.5), at(target + 0.5), HINT_COLOURS.MATCH, c.hint === "MATCH");
    zone(at(target + 0.5), lx + lw, HINT_COLOURS.HIGH, c.hint === "HIGH");
    ctx.font = `700 10px ${SANS}`;
    ctx.fillStyle = "rgba(6,12,20,0.85)";
    ctx.fillText("LOW", lx + 6, ly + 4);
    ctx.textAlign = "right";
    ctx.fillText("HIGH", lx + lw - 6, ly + 4);
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(200,220,240,0.75)";
    ctx.fillText(String(target), at(target), ly - 10);

    const mx = at(value);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(mx, ly + 8);
    ctx.lineTo(mx - 8, ly + 20);
    ctx.lineTo(mx + 8, ly + 20);
    ctx.closePath();
    ctx.fill();
    ctx.font = `700 12px ${SANS}`;
    ctx.fillText(`value ${value}`, mx, ly + 34);
    ctx.textAlign = "left";

    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = "rgba(170,200,225,0.55)";
    ctx.fillText(`${c.instruction_rva}  ${c.instruction_text}`, x + 16, y + h - 9);
  }

  private drawFocus(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const f = state.focus;
    if (!f) return;
    const r = f.kind === "station" ? 0 : 17 + Math.sin(state.time * 5) * 2;
    if (r > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.at.x, f.at.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Key cap above the target.
    const kx = f.at.x;
    const ky = f.at.y - (f.kind === "station" ? 70 : 34);
    roundRect(ctx, kx - 11, ky - 11, 22, 22, 4);
    ctx.fillStyle = "rgba(240,246,252,0.95)";
    ctx.fill();
    ctx.font = `800 13px ${SANS}`;
    ctx.fillStyle = "#06111c";
    ctx.textAlign = "center";
    ctx.fillText("E", kx, ky + 5);
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

  // --- developer overlay ----------------------------------------------------

  private drawDebug(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const world = state.world;
    ctx.lineWidth = 1;
    ctx.font = `9.5px ${MONO}`;
    for (const s of world.solids) {
      if (!s.enabled) continue;
      ctx.strokeStyle = s.oneWay ? "rgba(90,240,170,0.8)" : "rgba(255,255,255,0.45)";
      ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);
      ctx.fillStyle = "rgba(220,240,255,0.75)";
      ctx.fillText(`${s.id}${s.oneWay ? " (1-way)" : ""}`, s.x + 4, s.y - 4);
    }
    for (const it of world.interactables()) {
      if (Math.hypot(it.at.x - world.player.x, it.at.y - world.player.y) > 320) continue;
      ctx.strokeStyle = "rgba(255,200,87,0.35)";
      ctx.beginPath();
      ctx.arc(it.at.x, it.at.y, it.kind === "station" ? 150 : CARRY.reach, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const [stageId, c] of world.cards) {
      const p = cardPanel(c.card);
      ctx.fillStyle = "rgba(255,220,140,0.95)";
      ctx.fillText(`stage ${stageId} · kind ${state.specimen.stage(stageId).kind}`, p.x, p.y + p.h + 30);
    }
    const p = world.player;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(`${p.x.toFixed(0)},${p.y.toFixed(0)}`, p.x + 16, p.y - PLAYER.height / 2 - 6);
  }
}
