/**
 * Beginner-facing HUD: input selection and run controls, the controller state,
 * a running log of the execution, objectives, interaction prompts and toasts.
 * Everything it says about the program comes from the replay's processed
 * events, via the same presentation helpers as the in-world hint badge.
 */

import type { SpecimenIndex } from "../data/bundle.ts";
import type { StateSnapshot } from "../data/bundle-types.ts";
import type { ReplayStatus } from "../replay/replay.ts";
import { escapeHtml, stateText } from "../level/presentation.ts";

export interface HudHandlers {
  input: (index: number) => void;
  run: () => void;
  reset: () => void;
  fast: () => void;
  help: () => void;
}

export interface HudView {
  input: number;
  status: ReplayStatus;
  statusText: string;
  fast: boolean;
  state: StateSnapshot;
  bridge: "closed" | "moving" | "open";
  objectives: { bridge: boolean; cube: boolean; analysis: boolean };
}

export type ToastTone = "good" | "bad" | "info";

export class Hud {
  private root: HTMLElement;
  private status: HTMLElement;
  private stateBox: HTMLElement;
  private log: HTMLElement;
  private prompt: HTMLElement;
  private toasts: HTMLElement;
  private goals: HTMLElement;
  private help: HTMLElement;
  private inputButtons: HTMLButtonElement[] = [];
  private fastButton: HTMLButtonElement;
  private runButton: HTMLButtonElement;
  private lastKey = "";
  private currentLine: HTMLElement | null = null;

  constructor(
    host: HTMLElement,
    private readonly specimen: SpecimenIndex,
    handlers: HudHandlers,
  ) {
    this.root = document.createElement("div");
    this.root.className = "hud";
    const inputs = specimen.inputs
      .map((n, i) => `<button type="button" tabindex="-1" data-input="${i}" title="Key ${i + 1}">${n}</button>`)
      .join("");
    this.root.innerHTML = `
      <section class="hud-panel hud-run" aria-label="Program run controls">
        <div class="hud-row">
          <span class="hud-kicker">Input</span>
          <div class="hud-inputs">${inputs}</div>
          <button type="button" tabindex="-1" data-act="run" class="primary">▶ Run <kbd>Enter</kbd></button>
          <button type="button" tabindex="-1" data-act="reset">Reset <kbd>R</kbd></button>
          <button type="button" tabindex="-1" data-act="fast">Fast <kbd>F</kbd></button>
          <button type="button" tabindex="-1" data-act="help" title="How to play">? <kbd>H</kbd></button>
        </div>
        <p class="hud-status" aria-live="polite"></p>
      </section>
      <section class="hud-panel hud-state" aria-label="Controller memory and objectives">
        <div class="hud-row hud-mem"></div>
        <ul class="hud-goals"></ul>
      </section>
      <section class="hud-panel hud-log" aria-label="Execution log"><ol></ol></section>
      <div class="hud-prompt" aria-live="polite"></div>
      <div class="hud-toasts" aria-live="polite"></div>
      <section class="hud-help" role="dialog" aria-label="How to play">
        <h2>Chamber 01 · Compare</h2>
        <p>This room is a real, obfuscated program. Each glowing card is one stage of its code.
        <strong>Wire the cards in the order the program really runs</strong>, pick an input, and run it.
        Execution follows your cables and stops at the first wrong one.</p>
        <ol>
          <li>Walk to a card's <b>OUT</b> plug and press <kbd>E</kbd> to take its cable.</li>
          <li>Carry it to another card's <b>IN</b> socket and press <kbd>E</kbd> to plug it in.</li>
          <li>Choose input <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> (6, 7 or 8) and press <kbd>Enter</kbd> to run.</li>
          <li>Watch the comparisons: is the value below, matching or above 22?</li>
          <li>When the program opens the bridge, carry the power cube across to the analysis station.</li>
        </ol>
        <p class="hud-keys"><kbd>A</kbd><kbd>D</kbd> move · <kbd>Space</kbd>/<kbd>W</kbd> jump · <kbd>S</kbd> drop through
        · <kbd>E</kbd> use · <kbd>I</kbd> inspect code · hold <kbd>Tab</kbd> overview · <kbd>H</kbd> this help
        · <kbd>F1</kbd> debug</p>
        <button type="button" tabindex="-1" data-act="help" class="primary">Start</button>
      </section>`;
    host.append(this.root);

    const q = <T extends HTMLElement>(sel: string): T => {
      const el = this.root.querySelector<T>(sel);
      if (!el) throw new Error(`HUD is missing ${sel}`);
      return el;
    };
    this.status = q(".hud-status");
    this.stateBox = q(".hud-mem");
    this.log = q(".hud-log ol");
    this.prompt = q(".hud-prompt");
    this.toasts = q(".hud-toasts");
    this.goals = q(".hud-goals");
    this.help = q(".hud-help");
    this.fastButton = q('[data-act="fast"]');
    this.runButton = q('[data-act="run"]');
    this.inputButtons = [...this.root.querySelectorAll<HTMLButtonElement>("[data-input]")];

    // Buttons never keep focus, so Space and Enter stay game keys.
    const click = (el: HTMLButtonElement, fn: () => void): void =>
      el.addEventListener("click", () => {
        fn();
        el.blur();
      });
    for (const button of this.inputButtons) click(button, () => handlers.input(Number(button.dataset.input)));
    click(this.runButton, handlers.run);
    click(q('[data-act="reset"]'), handlers.reset);
    click(this.fastButton, handlers.fast);
    for (const b of this.root.querySelectorAll<HTMLButtonElement>('[data-act="help"]')) click(b, handlers.help);
  }

  get helpOpen(): boolean {
    return this.help.classList.contains("is-open");
  }

  setHelp(open: boolean): void {
    this.help.classList.toggle("is-open", open);
  }

  update(view: HudView): void {
    const key = JSON.stringify(view);
    if (key === this.lastKey) return;
    this.lastKey = key;

    this.inputButtons.forEach((b, i) => b.classList.toggle("is-selected", this.specimen.inputs[i] === view.input));
    this.fastButton.classList.toggle("is-on", view.fast);
    this.runButton.innerHTML = view.status === "running" ? "⟲ Restart <kbd>Enter</kbd>" : "▶ Run <kbd>Enter</kbd>";
    this.status.textContent = view.statusText;
    this.status.dataset.status = view.status;

    const field = (label: string, value: string, cls = ""): string =>
      `<span class="mem ${cls}"><small>${label}</small> ${escapeHtml(value)}</span>`;
    const s = view.state;
    const value = stateText(this.specimen, "value", s.value);
    const result = stateText(this.specimen, "result", s.result);
    const bridgeOpen = stateText(this.specimen, "bridge_open", s.bridge_open);
    this.stateBox.innerHTML = `
      <span class="hud-kicker">Memory</span>
      ${field("value", value, value === "unset" ? "unset" : "")}
      ${field("result", result, result === "unset" ? "unset" : `result-${result.split(" ")[0]}`)}
      ${field("bridge_open", bridgeOpen, bridgeOpen === "unset" ? "unset" : s.bridge_open === 1 ? "on" : "")}
      <span class="hud-bridge is-${view.bridge}">bridge ${view.bridge}</span>`;

    const goal = (done: boolean, text: string): string =>
      `<li class="${done ? "is-done" : ""}">${done ? "✓" : "○"} ${text}</li>`;
    this.goals.innerHTML = `
      ${goal(view.objectives.bridge, "open the bridge")}
      ${goal(view.objectives.cube, "deliver the cube")}
      ${goal(view.objectives.analysis, "run the analysis")}`;
  }

  setPrompt(text: string | null): void {
    this.prompt.textContent = text ?? "";
    this.prompt.classList.toggle("is-visible", Boolean(text));
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

  // --- execution log ------------------------------------------------------

  logReset(header: string): void {
    this.log.innerHTML = `<li class="log-head">${escapeHtml(header)}</li>`;
    this.currentLine = null;
  }

  logLine(html: string, cls = ""): void {
    const li = document.createElement("li");
    li.className = cls;
    li.innerHTML = html;
    this.log.append(li);
    this.currentLine = li;
    this.log.parentElement?.scrollTo({ top: this.log.scrollHeight });
  }

  /** Adds a chip (a write or a hint) to the current stage's log line. */
  logChip(text: string, colour: string | null = null): void {
    if (!this.currentLine) this.logLine("");
    const chip = document.createElement("span");
    chip.className = "chip";
    if (colour) chip.style.setProperty("--chip", colour);
    chip.textContent = text;
    this.currentLine?.append(chip);
  }
}
