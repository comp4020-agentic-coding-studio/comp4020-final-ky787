/**
 * The player-facing HUD, kept deliberately small: the room itself teaches.
 * A chamber title card on entry, the interaction prompt, a one-line controls
 * hint until the player has moved, occasional toasts, and the end screen.
 * No instruction modal, no memory dumps: those live in the inspector (I) and
 * the debug panel (F1).
 */

import { escapeHtml } from "../level/presentation.ts";

export type ToastTone = "good" | "bad" | "info";

export class Hud {
  private root: HTMLElement;
  private chamber: HTMLElement;
  private card: HTMLElement;
  private prompt: HTMLElement;
  private hint: HTMLElement;
  private toasts: HTMLElement;
  private end: HTMLElement;
  private cardTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(host: HTMLElement, onRestart: () => void) {
    this.root = document.createElement("div");
    this.root.className = "hud";
    this.root.innerHTML = `
      <p class="hud-chamber"></p>
      <div class="hud-card" aria-live="polite"></div>
      <p class="hud-hint"><kbd>A</kbd><kbd>D</kbd> move · <kbd>Space</kbd> jump · <kbd>E</kbd> pick up / use</p>
      <div class="hud-prompt" aria-live="polite"></div>
      <div class="hud-toasts" aria-live="polite"></div>
      <section class="hud-end" role="dialog" aria-label="Tutorial complete">
        <h2>Tutorial complete</h2>
        <p>Thanks for testing. Every run you watched was a real recorded execution of the same obfuscated program.</p>
        <button type="button" tabindex="-1" data-act="restart">Play again</button>
      </section>`;
    host.append(this.root);
    const q = (sel: string): HTMLElement => this.root.querySelector(sel) as HTMLElement;
    this.chamber = q(".hud-chamber");
    this.card = q(".hud-card");
    this.prompt = q(".hud-prompt");
    this.hint = q(".hud-hint");
    this.toasts = q(".hud-toasts");
    this.end = q(".hud-end");
    const restart = q('[data-act="restart"]') as HTMLButtonElement;
    restart.addEventListener("click", () => {
      onRestart();
      restart.blur();
    });
  }

  /** Shows the chamber name in the corner and briefly as a big title card. */
  enterChamber(number: number, title: string): void {
    this.chamber.textContent = `CHAMBER ${number} · ${title}`;
    this.card.innerHTML = `<span>CHAMBER ${number}</span><strong>${escapeHtml(title)}</strong>`;
    this.card.classList.add("is-visible");
    if (this.cardTimer) clearTimeout(this.cardTimer);
    this.cardTimer = setTimeout(() => this.card.classList.remove("is-visible"), 1800);
    this.setEnd(false);
  }

  setHint(visible: boolean): void {
    this.hint.classList.toggle("is-visible", visible);
  }

  setPrompt(text: string | null): void {
    this.prompt.textContent = text ?? "";
    this.prompt.classList.toggle("is-visible", Boolean(text));
  }

  setEnd(visible: boolean): void {
    this.end.classList.toggle("is-open", visible);
  }

  get endOpen(): boolean {
    return this.end.classList.contains("is-open");
  }

  toast(title: string, detail: string, tone: ToastTone): void {
    const el = document.createElement("div");
    el.className = `toast is-${tone}`;
    el.innerHTML = `<strong>${escapeHtml(title)}</strong>${detail ? `<span>${escapeHtml(detail)}</span>` : ""}`;
    this.toasts.prepend(el);
    while (this.toasts.childElementCount > 2) this.toasts.lastElementChild?.remove();
    setTimeout(() => el.classList.add("is-leaving"), 2600);
    setTimeout(() => el.remove(), 3100);
  }
}
