/**
 * Developer panel (F1 / backquote, or `?debug`). Shows the replay's real
 * identifiers — chamber, input, trace, cursor, the active exit port, what it
 * is wired to and what the trace expects, the latest branch outcome,
 * processed semantic events, bridge state — and offers shortcuts for
 * play-testing quickly. Pairs with the renderer's geometry overlay. It names
 * stage ids and the expected answer, which the player UI never does.
 */

import type { SpecimenIndex } from "../data/bundle.ts";
import type { ChamberDef } from "../level/chamber.ts";
import { escapeHtml } from "../level/presentation.ts";
import type { RunDirector } from "../replay/director.ts";
import type { World } from "../world/world.ts";

export interface DebugHandlers {
  chamber: (index: number) => void;
  input: (value: number | null) => void;
  run: () => void;
  reset: () => void;
  wireCorrectly: () => void;
  clearCables: () => void;
  connect: (portId: string, to: string | null) => void;
  toggleStepMode: () => void;
  step: () => void;
  toggleFast: () => void;
  resetCubes: () => void;
}

export class DebugPanel {
  readonly root: HTMLElement;
  private rows: HTMLElement;
  private wiringBox: HTMLElement;
  private selects = new Map<string, HTMLSelectElement>();
  private stepButton: HTMLButtonElement;
  private ticks = 0;
  private wiredFor: string | null = null;

  constructor(
    host: HTMLElement,
    private readonly specimen: SpecimenIndex,
    chambers: ChamberDef[],
    private readonly handlers: DebugHandlers,
  ) {
    this.root = document.createElement("aside");
    this.root.className = "debug";
    const chamberButtons = chambers
      .map((c, i) => `<button type="button" tabindex="-1" data-chamber="${i}">${c.number} ${c.title}</button>`)
      .join("");
    const inputButtons = specimen.inputs
      .map((n) => `<button type="button" tabindex="-1" data-input="${n}">in ${n}</button>`)
      .join("");
    this.root.innerHTML = `
      <p class="debug-title">DEBUG · replay and chamber</p>
      <div class="debug-tools">${chamberButtons}</div>
      <div class="debug-tools">${inputButtons}<button type="button" tabindex="-1" data-input="">no input</button>
        <button type="button" tabindex="-1" data-act="run">Run</button>
        <button type="button" tabindex="-1" data-act="reset">Reset</button>
        <button type="button" tabindex="-1" data-act="fast">Fast</button>
        <button type="button" tabindex="-1" data-act="stepmode">Step mode</button>
        <button type="button" tabindex="-1" data-act="step">Step ▸</button></div>
      <div class="debug-tools">
        <button type="button" tabindex="-1" data-act="wire">Wire editable ports correctly</button>
        <button type="button" tabindex="-1" data-act="clear">Clear cables</button>
        <button type="button" tabindex="-1" data-act="cubes">Reset cubes</button></div>
      <div class="debug-rows"></div>
      <p class="debug-title">Wiring (port → stage)</p>
      <div class="debug-wiring"></div>`;
    host.append(this.root);
    this.rows = this.root.querySelector(".debug-rows") as HTMLElement;
    this.wiringBox = this.root.querySelector(".debug-wiring") as HTMLElement;
    this.stepButton = this.root.querySelector('[data-act="step"]') as HTMLButtonElement;

    const click = (el: Element, fn: () => void): void =>
      el.addEventListener("click", (e) => {
        fn();
        (e.currentTarget as HTMLElement).blur();
      });
    for (const el of this.root.querySelectorAll<HTMLElement>("[data-chamber]")) {
      click(el, () => handlers.chamber(Number(el.dataset.chamber)));
    }
    for (const el of this.root.querySelectorAll<HTMLElement>("[data-input]")) {
      click(el, () => handlers.input(el.dataset.input ? Number(el.dataset.input) : null));
    }
    const acts: Record<string, () => void> = {
      run: handlers.run,
      reset: handlers.reset,
      fast: handlers.toggleFast,
      stepmode: handlers.toggleStepMode,
      step: handlers.step,
      wire: handlers.wireCorrectly,
      clear: handlers.clearCables,
      cubes: handlers.resetCubes,
    };
    for (const [act, fn] of Object.entries(acts)) {
      const el = this.root.querySelector(`[data-act="${act}"]`);
      if (el) click(el, fn);
    }
  }

  get visible(): boolean {
    return this.root.classList.contains("is-open");
  }

  setVisible(open: boolean): void {
    this.root.classList.toggle("is-open", open);
    this.ticks = 0;
  }

  /** Rebuilds the wiring editor when the chamber changes. */
  private buildWiring(world: World): void {
    this.wiringBox.innerHTML = "";
    this.selects.clear();
    const targets = world.jacks.filter((j) => j.kind === "in").map((j) => j.stageId);
    for (const [portId] of world.wiring().concat(world.chamber.editablePorts.map((p) => [p, ""] as [string, string]))) {
      if (this.selects.has(portId)) continue;
      const label = document.createElement("label");
      label.textContent = `${portId}${world.isEditable(portId) ? "" : " (fixed)"}`;
      const select = document.createElement("select");
      select.disabled = !world.isEditable(portId);
      const options = world.isEditable(portId) ? targets : [world.connection(portId) ?? ""];
      select.innerHTML = `<option value="">—</option>${options.map((t) => `<option value="${t}">${t}</option>`).join("")}`;
      select.addEventListener("change", () => {
        this.handlers.connect(portId, select.value || null);
        select.blur();
      });
      label.append(select);
      this.wiringBox.append(label);
      this.selects.set(portId, select);
    }
    this.wiredFor = world.chamber.id;
  }

  update(director: RunDirector, world: World, fps: number, log: string[]): void {
    if (!this.visible) return;
    if (this.wiredFor !== world.chamber.id) this.buildWiring(world);
    this.ticks += 1;
    if (this.ticks > 1 && this.ticks % 6 !== 0) return;

    const replay = director.replay;
    const event = replay?.currentEvent ?? null;
    const exitPort = event?.exit_port_id ?? null;
    const wired = exitPort ? world.connection(exitPort) : null;
    const expected = exitPort ? this.specimen.port(exitPort).expected_destination_stage_id : null;
    const verdict =
      exitPort === null ? "" : wired === null ? "✕ unplugged" : wired === expected && wired === event?.next_stage_id ? "✓ matches" : "✕ differs";
    const outcome = replay?.lastOutcome ?? null;
    const p = world.player;
    const pending = replay?.pendingSteps.map((e) => `${e.kind}@${e.step_index}`).join(", ") || "—";

    const rows: [string, string][] = [
      ["chamber", `${world.chamber.id} · fixed input ${world.chamber.fixedInput ?? "—"}`],
      ["selected input", String(director.input ?? "none")],
      ["trace id", replay ? `${replay.trace.id} (${replay.trace.events.length} occurrences)` : "—"],
      ["status", `${replay?.status ?? "no input"}${director.stepMode ? " · step mode" : ""}${director.fast ? " · fast" : ""}`],
      ["cursor", replay ? `${replay.cursor} / ${replay.trace.events.length - 1}` : "—"],
      ["event", event ? `${event.id} · ${event.stage_id} · visit ${event.visit_number}` : "—"],
      ["pending", pending],
      ["exit port", exitPort ?? (event ? "(final: none)" : "—")],
      ["expected next", event ? `${event.next_stage_id ?? "(end)"} · port expects ${expected ?? "—"}` : "—"],
      ["wired (proposed)", `${wired ?? "—"} ${verdict}`],
      ["branch outcome", outcome ? `${outcome.id} · ${outcome.feedback.lines.join(" / ")} · port ${outcome.selected_port_id}` : "—"],
      ["semantic", replay?.processedSemantic.map((s) => `${s.id} ${s.kind} ${s.field}=${s.value}`).join("\n") || "—"],
      ["state", replay ? `value ${replay.state.value} · result ${replay.state.result} · bridge_open ${replay.state.bridge_open}` : "—"],
      [
        "bridge",
        `${replay?.bridgeOpen ? "OPEN" : "closed"}${replay?.bridgeEvent ? ` by ${replay.bridgeEvent.id} @ ${replay.bridgeEvent.instruction_address}` : ""} · physical ${(world.bridgeExtent * 100).toFixed(0)}%`,
      ],
      [
        "stop",
        replay?.stop
          ? `${replay.stop.reason} at ${replay.stop.event.stage_id} port ${replay.stop.portId}: wired ${replay.stop.proposed ?? "null"}, expected ${replay.stop.expected ?? "null"}`
          : "—",
      ],
      ["finished inputs", [...world.finishedInputs].join(", ") || "—"],
      ["sockets", [...world.sockets.values()].map((s) => `${s.def.id}=${s.cubeId ?? "empty"}`).join(" · ")],
      ["held", world.held ? (world.held.kind === "cable" ? `cable ${world.held.portId}` : `cube ${world.held.cubeId}`) : "—"],
      ["player", `${p.x.toFixed(0)}, ${p.y.toFixed(0)} · ${p.grounded ? `on ${p.groundId}` : "air"}`],
      ["fps", fps.toFixed(0)],
      ["run log", log.slice(-14).join("\n") || "—"],
    ];
    this.rows.innerHTML = `<dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`).join("")}</dl>`;
    this.stepButton.disabled = !director.stepMode;
    for (const [portId, select] of this.selects) {
      if (document.activeElement === select) continue;
      select.value = world.connection(portId) ?? "";
    }
  }
}
