/**
 * Developer panel (F1 / backquote, or `?debug`). Shows the replay's real
 * identifiers — trace, cursor, expected next stage, the player's proposed
 * connection, the current comparison, processed semantic events, bridge state
 * — and offers shortcuts for validating the prototype quickly. Pairs with the
 * renderer's geometry overlay. It is a developer view: it names stage ids and
 * the expected answer, which the player UI never does.
 */

import type { SpecimenIndex } from "../data/bundle.ts";
import type { RunDirector } from "../replay/director.ts";
import type { World } from "../world/world.ts";
import { escapeHtml } from "../level/presentation.ts";

export interface DebugHandlers {
  wireTrace: () => void;
  clearWiring: () => void;
  connect: (from: string, to: string | null) => void;
  toggleStepMode: () => void;
  step: () => void;
  unlockStation: () => void;
  resetCube: () => void;
}

export class DebugPanel {
  readonly root: HTMLElement;
  private rows: HTMLElement;
  private selects = new Map<string, HTMLSelectElement>();
  private stepButton: HTMLButtonElement;
  private ticks = 0;

  constructor(
    host: HTMLElement,
    specimen: SpecimenIndex,
    stageIds: string[],
    handlers: DebugHandlers,
  ) {
    this.root = document.createElement("aside");
    this.root.className = "debug";
    this.root.innerHTML = `
      <p class="debug-title">DEBUG · replay and room</p>
      <div class="debug-rows"></div>
      <div class="debug-tools">
        <button type="button" tabindex="-1" data-act="wire">Wire this input's trace</button>
        <button type="button" tabindex="-1" data-act="clear">Clear wiring</button>
        <button type="button" tabindex="-1" data-act="stepmode">Step mode</button>
        <button type="button" tabindex="-1" data-act="step">Step ▸</button>
        <button type="button" tabindex="-1" data-act="unlock">Power station</button>
        <button type="button" tabindex="-1" data-act="cube">Reset cube</button>
      </div>
      <p class="debug-title">Wiring (output → input)</p>
      <div class="debug-wiring"></div>`;
    host.append(this.root);
    this.rows = this.root.querySelector(".debug-rows") as HTMLElement;
    this.stepButton = this.root.querySelector('[data-act="step"]') as HTMLButtonElement;

    const on = (act: string, fn: () => void): void =>
      this.root.querySelector(`[data-act="${act}"]`)?.addEventListener("click", (e) => {
        fn();
        (e.currentTarget as HTMLElement).blur();
      });
    on("wire", handlers.wireTrace);
    on("clear", handlers.clearWiring);
    on("stepmode", handlers.toggleStepMode);
    on("step", handlers.step);
    on("unlock", handlers.unlockStation);
    on("cube", handlers.resetCube);

    const wiring = this.root.querySelector(".debug-wiring") as HTMLElement;
    for (const from of stageIds) {
      if (specimen.stage(from).kind === "end") continue;
      const label = document.createElement("label");
      label.textContent = from;
      const select = document.createElement("select");
      select.innerHTML =
        `<option value="">—</option>` +
        stageIds
          .filter((to) => to !== from && specimen.stage(to).kind !== "entry")
          .map((to) => `<option value="${to}">${to}</option>`)
          .join("");
      select.addEventListener("change", () => {
        handlers.connect(from, select.value || null);
        select.blur();
      });
      label.append(select);
      wiring.append(label);
      this.selects.set(from, select);
    }
  }

  get visible(): boolean {
    return this.root.classList.contains("is-open");
  }

  setVisible(open: boolean): void {
    this.root.classList.toggle("is-open", open);
    this.ticks = 0;
  }

  update(director: RunDirector, world: World, fps: number): void {
    if (!this.visible) return;
    this.ticks += 1;
    if (this.ticks > 1 && this.ticks % 6 !== 0) return;

    const replay = director.replay;
    const event = replay.currentEvent;
    const cmp = replay.lastComparison;
    const proposed = event ? world.connection(event.stage_id) : null;
    const expected = event?.next_stage_id ?? null;
    const match = event && event.next_event_id !== null ? (proposed === expected ? "✓ matches" : "✕ differs") : "";
    const p = world.player;
    const pending = replay.pendingEntries.map((e) => `${e.kind}@${e.step_index}`).join(", ") || "—";

    const rows: [string, string][] = [
      ["selected input", String(director.selectedInput)],
      ["trace id", `${replay.trace.id} (${replay.trace.events.length} occurrences)`],
      ["status", `${replay.status}${director.stepMode ? " · step mode" : ""}${director.fast ? " · fast" : ""}`],
      ["cursor", `${replay.cursor} / ${replay.trace.events.length - 1}`],
      ["event", event ? `${event.id} · ${event.stage_id} · visit ${event.visit_number}` : "—"],
      ["in stage", `${replay.isInStage} · pending ${pending}`],
      ["expected next", event ? `${expected ?? "(end: null)"} via ${event.next_event_id ?? "null"}` : "—"],
      ["proposed next", `${proposed ?? "(unplugged)"} ${match}`],
      [
        "comparison",
        cmp
          ? `${cmp.id} · ${cmp.relationship}/${cmp.hint} · ${cmp.source_condition}=${cmp.source_condition_result} · jne taken=${cmp.branch.taken}`
          : "—",
      ],
      ["semantic", replay.processedSemantic.map((s) => `${s.id} ${s.kind} ${s.field}=${s.value}`).join("\n") || "—"],
      ["state", `value ${replay.state.value} · result ${replay.state.result} · bridge_open ${replay.state.bridge_open}`],
      [
        "bridge",
        `${replay.bridgeOpen ? "OPEN" : "closed"}${replay.bridgeEvent ? ` by ${replay.bridgeEvent.id} @ ${replay.bridgeEvent.instruction_address}` : ""} · physical ${(world.bridgeExtent * 100).toFixed(0)}%`,
      ],
      [
        "stop",
        replay.stop
          ? `${replay.stop.reason} at ${replay.stop.event.stage_id}: proposed ${replay.stop.proposed ?? "null"}, expected ${replay.stop.expected ?? "null"}`
          : "—",
      ],
      ["runs", String(director.runs)],
      ["player", `${p.x.toFixed(0)}, ${p.y.toFixed(0)} · v ${p.vx.toFixed(0)}, ${p.vy.toFixed(0)} · ${p.grounded ? `on ${p.groundId}` : "air"}`],
      ["held", world.held ? (world.held.kind === "cable" ? `cable from ${world.held.from}` : "cube") : "—"],
      ["cube", `${world.cube.x.toFixed(0)}, ${world.cube.y.toFixed(0)}${world.cube.socketed ? " · socketed" : ""}`],
      ["station", world.station],
      ["fps", fps.toFixed(0)],
    ];
    this.rows.innerHTML = `<dl>${rows
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`)
      .join("")}</dl>`;
    this.stepButton.disabled = !director.stepMode;

    for (const [from, select] of this.selects) {
      if (document.activeElement === select) continue;
      select.value = world.connection(from) ?? "";
    }
  }
}
