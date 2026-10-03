/**
 * Smooth follow camera, adapted from the previous Binary Ninja game: the same
 * exponential follow, velocity look-ahead, world clamping and shake. The old
 * camera's tall-shaft and grapple-aim handling is dropped (one compact room,
 * no grapple). New here: it can frame a box — the player and the card being
 * executed during a run, or the whole room for the overview — and eases its
 * zoom in and out of that framing.
 */

import { CAMERA } from "../engine/constants.ts";
import { clamp, damp } from "../engine/geometry.ts";
import type { Box, Vec2 } from "../engine/geometry.ts";

export class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  shake = 0;
  private shakeX = 0;
  private shakeY = 0;
  private leadVelocityX = 0;

  /** Viewport size in CSS pixels, set by the renderer each frame. */
  viewW = 1280;
  viewH = 720;

  private world = { width: 1000, height: 1000 };
  /** World height kept in view while following; set per chamber. */
  private viewHeight: number = CAMERA.viewHeight;

  setWorld(width: number, height: number, viewHeight: number = CAMERA.viewHeight): void {
    this.world = { width, height };
    this.viewHeight = viewHeight;
  }

  /** The zoom the camera rests at while simply following the player. */
  baseZoom(viewW = this.viewW, viewH = this.viewH): number {
    return clamp(Math.min(viewH / this.viewHeight, viewW / CAMERA.viewWidth), CAMERA.minZoom, CAMERA.maxZoom);
  }

  snapTo(x: number, y: number): void {
    this.zoom = this.baseZoom();
    this.x = x;
    this.y = y;
    this.clampToWorld();
  }

  private clampToWorld(): void {
    const halfW = this.viewW / 2 / this.zoom;
    const halfH = this.viewH / 2 / this.zoom;
    this.x =
      this.world.width <= halfW * 2 ? this.world.width / 2 : clamp(this.x, halfW, this.world.width - halfW);
    this.y =
      this.world.height <= halfH * 2 ? this.world.height / 2 : clamp(this.y, halfH, this.world.height - halfH);
  }

  /**
   * Follows `target`, or — when `frame` is given — eases to show that whole
   * box, zooming out no further than needed and never closer than normal.
   */
  update(
    dt: number,
    target: Vec2,
    velocity: Vec2,
    viewW: number,
    viewH: number,
    frame: Box | null,
    rail: { offsetY: number; minY: number; maxY: number } | null = null,
  ): void {
    this.viewW = viewW;
    this.viewH = viewH;
    const base = this.baseZoom(viewW, viewH);

    if (frame) {
      const pad = CAMERA.framePadding;
      const fit = Math.min(viewW / (frame.w + pad * 2), viewH / (frame.h + pad * 2));
      const want = clamp(Math.min(base, fit), CAMERA.minZoom, base);
      this.zoom = damp(this.zoom, want, CAMERA.frameRate, dt);
      this.x = damp(this.x, frame.x + frame.w / 2, CAMERA.frameRate, dt);
      this.y = damp(this.y, frame.y + frame.h / 2, CAMERA.frameRate, dt);
      this.leadVelocityX = 0;
    } else {
      this.zoom = damp(this.zoom, base, CAMERA.frameRate, dt);
      this.leadVelocityX = damp(this.leadVelocityX, velocity.x, CAMERA.velocityResponse, dt);
      const wantX = target.x + clamp(this.leadVelocityX * CAMERA.velocityLead, -CAMERA.maxLead, CAMERA.maxLead);
      // Follow the room's vertical rail, but never let the player leave the
      // view: the margin wins (down in the pit, say).
      const halfVisible = viewH / 2 / this.zoom;
      const slack = Math.max(0, halfVisible - CAMERA.verticalMargin);
      const wantY = rail ? clamp(target.y + rail.offsetY, rail.minY, rail.maxY) : target.y - 60;
      this.x = damp(this.x, wantX, CAMERA.followRate, dt);
      this.y = damp(this.y, clamp(wantY, target.y - slack, target.y + slack), CAMERA.followRate * 0.85, dt);
    }
    this.clampToWorld();

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - CAMERA.shakeDecay * dt * this.shake);
      if (this.shake < 0.01) this.shake = 0;
      const mag = this.shake * 18;
      this.shakeX = (Math.random() * 2 - 1) * mag;
      this.shakeY = (Math.random() * 2 - 1) * mag;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  kick(amount: number): void {
    this.shake = Math.min(1.2, this.shake + amount);
  }

  /** Left/top of the visible world rectangle, shake included. */
  originX(): number {
    return this.x + this.shakeX - this.viewW / 2 / this.zoom;
  }

  originY(): number {
    return this.y + this.shakeY - this.viewH / 2 / this.zoom;
  }

  screenToWorld(sx: number, sy: number): Vec2 {
    return { x: this.originX() + sx / this.zoom, y: this.originY() + sy / this.zoom };
  }

  visibleBounds(pad = 200): { x0: number; y0: number; x1: number; y1: number } {
    const x0 = this.originX() - pad;
    const y0 = this.originY() - pad;
    return {
      x0,
      y0,
      x1: x0 + this.viewW / this.zoom + pad * 2,
      y1: y0 + this.viewH / this.zoom + pad * 2,
    };
  }
}
