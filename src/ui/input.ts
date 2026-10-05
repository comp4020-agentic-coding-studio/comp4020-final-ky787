/**
 * Keyboard, pointer and touch input.
 *
 * Adapted from the previous Binary Ninja game's InputManager: held keys are
 * sampled each physics step, and edge-triggered presses (jump, interact,
 * grapple) are latched here and consumed by exactly one fixed step, so
 * behaviour does not depend on frame rate. New here: interaction (E). Program
 * input and running are physical (cubes and sockets), so there are no keys
 * for them; the grapple only listens when enabled.
 */

import type { Vec2 } from "../engine/geometry.ts";
import type { InputState } from "../engine/physics.ts";
import { emptyInput } from "../engine/physics.ts";

export type ActionName = "reset" | "fast" | "inspect" | "debug" | "escape";

const GAME_KEYS = new Set([
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyS",
  "KeyE",
  "Space",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Tab",
  "F1",
]);

export class InputManager {
  readonly state: InputState = emptyInput();
  /** Pointer position in CSS pixels relative to the canvas. */
  readonly screenAim: Vec2 = { x: 0, y: 0 };
  hasPointer = false;
  /** Canvas clicks (CSS pixels), consumed by the game for card inspection. */
  clicks: Vec2[] = [];

  private pendingJump = false;
  private pendingAirGrapple = false;
  private pendingInteract = false;
  private pendingGrapple = false;
  private actions = new Set<ActionName>();
  private held = new Set<string>();
  private detach: (() => void)[] = [];
  private touchMove = 0;

  constructor(private readonly grapple: boolean) {}

  attach(canvas: HTMLCanvasElement, root: HTMLElement): void {
    const onKey = (e: KeyboardEvent, down: boolean): void => {
      // Form controls (the debug panel's wiring selects) keep their keys.
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
      const code = e.code;
      // Menu buttons keep native keyboard navigation and activation.
      if (target?.closest("button") && (code === "Tab" || code === "Space" || code === "Enter")) return;
      if (GAME_KEYS.has(code)) e.preventDefault();
      if (down && e.repeat) return;
      if (down) this.held.add(code);
      else this.held.delete(code);
      if (!down) return;

      if (code === "Space" || code === "KeyW" || code === "ArrowUp") this.pendingJump = true;
      if (code === "Space") this.pendingAirGrapple = true;
      if (code === "KeyE") this.pendingInteract = true;
      if (code === "KeyR") this.actions.add("reset");
      if (code === "KeyF") this.actions.add("fast");
      if (code === "KeyI") this.actions.add("inspect");
      if (code === "F1" || code === "Backquote") this.actions.add("debug");
      if (code === "Escape") this.actions.add("escape");
    };

    const keyDown = (e: KeyboardEvent): void => onKey(e, true);
    const keyUp = (e: KeyboardEvent): void => onKey(e, false);
    globalThis.addEventListener("keydown", keyDown);
    globalThis.addEventListener("keyup", keyUp);
    this.detach.push(() => globalThis.removeEventListener("keydown", keyDown));
    this.detach.push(() => globalThis.removeEventListener("keyup", keyUp));

    const setAim = (e: PointerEvent): void => {
      const rect = canvas.getBoundingClientRect();
      this.screenAim.x = e.clientX - rect.left;
      this.screenAim.y = e.clientY - rect.top;
      this.hasPointer = true;
    };
    const down = (e: PointerEvent): void => {
      setAim(e);
      canvas.focus();
      if (e.button !== 0) return;
      if (this.grapple) {
        canvas.setPointerCapture?.(e.pointerId);
        this.pendingGrapple = true;
        this.state.grappleHeld = true;
      } else {
        this.clicks.push({ x: this.screenAim.x, y: this.screenAim.y });
      }
    };
    const up = (e: PointerEvent): void => {
      if (e.button === 0) this.state.grappleHeld = false;
    };
    const move = (e: PointerEvent): void => setAim(e);
    const cancel = (): void => {
      this.state.grappleHeld = false;
      this.releaseAll();
    };

    canvas.addEventListener("pointerdown", down);
    globalThis.addEventListener("pointerup", up);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointercancel", cancel);
    globalThis.addEventListener("blur", cancel);
    this.detach.push(() => canvas.removeEventListener("pointerdown", down));
    this.detach.push(() => globalThis.removeEventListener("pointerup", up));
    this.detach.push(() => canvas.removeEventListener("pointermove", move));
    this.detach.push(() => canvas.removeEventListener("pointercancel", cancel));
    this.detach.push(() => globalThis.removeEventListener("blur", cancel));

    this.attachTouch(root);
  }

  /** Thumb controls, shown only when the platform reports touch support. */
  private attachTouch(root: HTMLElement): void {
    if (typeof navigator === "undefined" || (navigator.maxTouchPoints ?? 0) === 0) return;
    const pad = document.createElement("div");
    pad.className = "touch-pad";
    pad.innerHTML = `
      <button type="button" data-touch="left" aria-label="Move left">◀</button>
      <button type="button" data-touch="right" aria-label="Move right">▶</button>
      <button type="button" data-touch="use" aria-label="Use">E</button>
      <button type="button" data-touch="jump" aria-label="Jump">JUMP</button>`;
    root.appendChild(pad);
    for (const button of pad.querySelectorAll<HTMLButtonElement>("[data-touch]")) {
      const kind = button.dataset.touch;
      const press = (e: PointerEvent): void => {
        e.preventDefault();
        if (kind === "left") this.touchMove = -1;
        else if (kind === "right") this.touchMove = 1;
        else if (kind === "use") this.pendingInteract = true;
        else this.pendingJump = true;
      };
      const release = (e: PointerEvent): void => {
        e.preventDefault();
        if (kind === "left" || kind === "right") this.touchMove = 0;
      };
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointerleave", release);
      button.addEventListener("pointercancel", release);
    }
    this.detach.push(() => pad.remove());
  }

  dispose(): void {
    for (const off of this.detach) off();
    this.detach = [];
  }

  /** Overview camera is held, not toggled. */
  get overviewHeld(): boolean {
    return this.held.has("Tab");
  }

  /** Refreshes continuous state and resolves the aim into world units. */
  sync(worldAim: Vec2): void {
    const s = this.state;
    s.left = this.held.has("KeyA") || this.held.has("ArrowLeft") || this.touchMove < 0;
    s.right = this.held.has("KeyD") || this.held.has("ArrowRight") || this.touchMove > 0;
    s.down = this.held.has("KeyS") || this.held.has("ArrowDown");
    s.jumpHeld = this.held.has("Space") || this.held.has("KeyW") || this.held.has("ArrowUp");
    s.reelIn = false;
    s.reelOut = false;
    s.aim = worldAim;
  }

  /** Consumed once per physics step; edges fire on the first step only. */
  takeEdges(): { jump: boolean; interact: boolean; grapple: boolean; airGrapple: boolean } {
    const out = { jump: this.pendingJump, interact: this.pendingInteract, grapple: this.pendingGrapple, airGrapple: this.pendingAirGrapple };
    this.pendingJump = false;
    this.pendingAirGrapple = false;
    this.pendingInteract = false;
    this.pendingGrapple = false;
    return out;
  }

  takeAction(name: ActionName): boolean {
    if (!this.actions.has(name)) return false;
    this.actions.delete(name);
    return true;
  }

  clearActions(): void {
    this.actions.clear();
  }

  releaseAll(): void {
    this.held.clear();
    this.touchMove = 0;
    this.state.grappleHeld = false;
    this.pendingJump = false;
    this.pendingAirGrapple = false;
    this.pendingInteract = false;
    this.pendingGrapple = false;
  }
}
