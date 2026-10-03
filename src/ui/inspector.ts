/**
 * Expert inspector: the real instructions, addresses and raw-block mapping
 * behind a card, plus what the *current* run actually did there — the same
 * comparison and write objects the beginner hint and HUD were drawn from.
 *
 * Until the analysis reward is earned it hides everything that would name the
 * answer: stage ids and kinds, IR block names (BCF names clones `…alteredBB`),
 * raw classifications and proofs. Coverage across other inputs is not shown
 * either; "not executed" is never presented as evidence.
 */

import type { SpecimenIndex } from "../data/bundle.ts";
import type { Comparison, RawBlock, SemanticEvent, StageEvent } from "../data/bundle-types.ts";
import { cardName, cardTitle, escapeHtml, relationshipPhrase, stateText } from "../level/presentation.ts";
import type { Replay } from "../replay/replay.ts";

const h = escapeHtml;

export class Inspector {
  private root: HTMLElement;
  private body: HTMLElement;
  private titleEl: HTMLElement;
  stageId: string | null = null;
  /** Shows the whole-function raw block map instead of one card. */
  private mapMode = false;
  private lastKey = "";

  constructor(
    host: HTMLElement,
    private readonly specimen: SpecimenIndex,
  ) {
    this.root = document.createElement("aside");
    this.root.className = "inspector";
    this.root.setAttribute("aria-label", "Code inspector");
    this.root.innerHTML = `
      <header>
        <div><p class="hud-kicker">Inspector · real code</p><h2></h2></div>
        <div class="ins-actions">
          <button type="button" tabindex="-1" data-act="map">All raw blocks</button>
          <button type="button" tabindex="-1" data-act="close" aria-label="Close inspector">✕</button>
        </div>
      </header>
      <div class="ins-body"></div>`;
    host.append(this.root);
    this.titleEl = this.root.querySelector("h2") as HTMLElement;
    this.body = this.root.querySelector(".ins-body") as HTMLElement;
    this.root.querySelector('[data-act="close"]')?.addEventListener("click", () => this.close());
    this.root.querySelector('[data-act="map"]')?.addEventListener("click", (e) => {
      this.mapMode = !this.mapMode;
      this.lastKey = "";
      (e.currentTarget as HTMLElement).blur();
    });
  }

  get isOpen(): boolean {
    return this.root.classList.contains("is-open");
  }

  open(stageId: string): void {
    this.stageId = stageId;
    this.mapMode = false;
    this.lastKey = "";
    this.root.classList.add("is-open");
  }

  close(): void {
    this.stageId = null;
    this.root.classList.remove("is-open");
  }

  update(replay: Replay, revealed: boolean): void {
    if (!this.isOpen || !this.stageId) return;
    const key = [
      this.stageId,
      this.mapMode,
      revealed,
      replay.trace.id,
      replay.status,
      replay.cursor,
      replay.processedSemantic.length,
      replay.processedComparisons.length,
      replay.entered.length,
    ].join("|");
    if (key === this.lastKey) return;
    this.lastKey = key;
    if (this.mapMode) {
      this.titleEl.textContent = "Function raw block map";
      this.body.innerHTML = this.renderMap(revealed);
      return;
    }
    this.titleEl.textContent = cardName(this.specimen, this.stageId, revealed);
    this.body.innerHTML = this.renderCard(this.stageId, replay, revealed);
  }

  // --- one card -------------------------------------------------------------

  private renderCard(stageId: string, replay: Replay, revealed: boolean): string {
    const sp = this.specimen;
    const stage = sp.stage(stageId);
    const blocks = sp.stageBlocks(stageId);
    const parts: string[] = [];

    if (revealed) {
      parts.push(`<section><dl class="kv">
        ${kv("stage id", stage.id)}${kv("kind", stage.kind)}${kv("bundle label", stage.label)}
        ${kv("classification", stage.classification)}${kv("IR blocks", stage.ir_blocks.join(", "))}
        ${kv("description", stage.description)}</dl></section>`);
    }
    const candidate = sp.bundle.analysis_reward.candidates.find((c) => c.stage_id === stageId);
    if (revealed && candidate) parts.push(this.renderProof(candidate.id));

    parts.push(this.renderRun(stageId, replay, revealed));

    parts.push(`<section><h3>Raw blocks <small>${blocks.length} · end addresses exclusive</small></h3>`);
    const executed = new Set(
      replay.entered
        .filter((e) => e.stage_id === stageId)
        .flatMap((e) => e.raw_occurrence_indices.map((i) => replay.trace.raw_occurrences[i].block_id)),
    );
    for (const block of blocks) parts.push(this.renderBlock(block, executed.has(block.id), revealed));
    parts.push(`</section>`);

    parts.push(this.renderEdges(stageId, blocks, revealed));
    parts.push(this.renderIdentity());
    return parts.join("");
  }

  /** What the current run did on this card: the same objects the beginner saw. */
  private renderRun(stageId: string, replay: Replay, revealed: boolean): string {
    const sp = this.specimen;
    const occurrences = replay.entered.filter((e) => e.stage_id === stageId);
    const head = `<h3>This run <small>input ${replay.input} · trace ${h(replay.trace.id)} · ${replay.status}</small></h3>`;
    if (occurrences.length === 0) {
      const note =
        replay.status === "ready"
          ? "No run in progress. Press Enter to run the selected input."
          : "Execution has not entered this card in this run. Other inputs take other paths, so this says nothing about whether the code is real.";
      return `<section>${head}<p class="muted">${note}</p></section>`;
    }
    const parts = [`<section>${head}`];
    for (const event of occurrences) {
      parts.push(this.renderOccurrence(event, replay));
      const comparisons = replay.processedComparisons.filter((c) => c.stage_event_id === event.id);
      for (const c of comparisons) parts.push(this.renderComparison(c, revealed));
      const writes = replay.processedSemantic.filter((s) => s.stage_event_id === event.id);
      if (writes.length > 0) {
        parts.push(`<h4>Committed writes</h4><table class="tbl"><tr><th>step</th><th>address</th><th>instruction</th><th>write</th><th>kind</th></tr>`);
        for (const s of writes) parts.push(writeRow(sp, s));
        parts.push(`</table>`);
      }
      const stop = replay.stop;
      if (stop && stop.event.id === event.id) {
        const proposed = stop.proposed ? cardName(sp, stop.proposed, revealed) : "nothing plugged in";
        parts.push(`<p class="bad">Stopped here: the output was wired to ${h(proposed)}, and execution did not go there.</p>`);
      }
    }
    parts.push(`</section>`);
    return parts.join("");
  }

  private renderOccurrence(event: StageEvent, replay: Replay): string {
    const raws = event.raw_occurrence_indices.map((i) => replay.trace.raw_occurrences[i]);
    const rows = raws
      .map((r) => `<tr><td>${r.trace_index}</td><td>${h(r.block_id)}</td><td>${r.visit_number}</td><td>${r.start_step}–${r.end_step}</td></tr>`)
      .join("");
    return `<dl class="kv">
        ${kv("occurrence", event.id)}${kv("visit", String(event.visit_number))}
        ${kv("instruction steps", `${event.start_step}–${event.end_step}`)}
      </dl>
      <table class="tbl"><tr><th>raw #</th><th>block</th><th>visit</th><th>steps</th></tr>${rows}</table>`;
  }

  private renderComparison(c: Comparison, revealed: boolean): string {
    const sp = this.specimen;
    const operands = c.operands
      .map((o) => `${o.kind}${o.register ? ` ${o.register}` : ""} · ${o.width}-bit · signed ${o.signed} · unsigned ${o.unsigned}`)
      .map((t) => `<li>${h(t)}</li>`)
      .join("");
    const lineage = c.lineage
      .map((l) => {
        const extra = l.boolean_value !== undefined ? `→ ${l.boolean_value}` : "";
        return `<tr><td>${l.step_index}</td><td>${h(l.instruction_address)}</td><td><code>${h(l.instruction_text)}</code></td><td>${h(l.operation)} ${extra}</td></tr>`;
      })
      .join("");
    const b = c.branch;
    const flags = Object.entries(b.flags_used)
      .filter(([k]) => k !== "eflags")
      .map(([k, v]) => `${k}=${v ? 1 : 0}`)
      .join(" ");
    const next = c.next_trace_stage_id ? cardName(sp, c.next_trace_stage_id, revealed) : "—";
    return `<div class="cmp">
      <h4>Comparison <span class="hint hint-${c.hint}">${c.hint}</span> <small>${h(relationshipPhrase(c))}</small></h4>
      <p class="muted">The beginner hint is the exported <code>relationship</code> (${c.relationship}) of the measured value to the immediate; it is not an alias for the branch.</p>
      <dl class="kv">
        ${kv("id", c.id)}${kv("site", `${c.site_id} · visit ${c.visit_number}`)}
        ${kv("instruction", `${c.instruction_address}  ${c.instruction_text}`)}
        ${kv("step", String(c.instruction_step_index))}
        ${kv("interpretation", `${c.interpretation} · ${c.operand_width_bits}-bit`)}
        ${kv("source condition", `${c.source_condition} = ${c.source_condition_result}`)}
      </dl>
      <p class="muted">Operands (${h(c.lineage_snapshot_phase)})</p><ul class="ops">${operands}</ul>
      <table class="tbl"><tr><th>step</th><th>address</th><th>instruction</th><th>role</th></tr>${lineage}</table>
      <dl class="kv">
        ${kv("decision branch", `${b.instruction_address}  ${b.instruction_text}`)}
        ${kv("condition", b.condition)}${kv("flags", flags)}
        ${kv("taken", String(b.taken))}
        ${kv("machine successor", `${b.actual_next_address} (${b.actual_next_raw_block_id})`)}
        ${kv("next card in trace", next)}
      </dl>
    </div>`;
  }

  private renderBlock(block: RawBlock, executed: boolean, revealed: boolean): string {
    const meta = [`${block.start_rva}–${block.end_rva_exclusive}`, block.start_va];
    if (revealed) {
      meta.push(`IR ${block.ir_block ?? "—"}`, block.classification);
      if (block.infeasible_guard_id) meta.push(block.infeasible_guard_id);
      if (block.clone_proof_id) meta.push(block.clone_proof_id);
    }
    const rows = block.instructions
      .map((i) => `<tr><td>${h(i.address)}</td><td class="bytes">${h(i.bytes)}</td><td><code>${h(i.text)}</code></td></tr>`)
      .join("");
    return `<details class="blk${executed ? " is-run" : ""}" ${executed ? "open" : ""}>
      <summary><b>${h(block.id)}</b> <small>${h(meta.join(" · "))} · ${block.instructions.length} instr</small>${executed ? ' <span class="tag">ran this run</span>' : ""}</summary>
      <table class="tbl asm">${rows}</table>
    </details>`;
  }

  private renderEdges(stageId: string, blocks: RawBlock[], revealed: boolean): string {
    const sp = this.specimen;
    const own = new Set(blocks.map((b) => b.id));
    const where = (blockId: string): string => {
      const sid = sp.blocksById.get(blockId)?.stage_id;
      if (!sid) return `${blockId} (no card)`;
      return sid === stageId ? `${blockId} (this card)` : `${blockId} (${cardName(sp, sid, revealed)})`;
    };
    const edges = sp.bundle.raw.edges.filter((e) => own.has(e.source) !== own.has(e.target));
    const rows = edges
      .map((e) => {
        const dir = own.has(e.source) ? "out" : "in";
        return `<tr><td>${dir}</td><td>${h(where(e.source))}</td><td>${h(where(e.target))}</td><td>${h(e.kind)}</td><td>${h(e.evidence_instruction)}</td></tr>`;
      })
      .join("");
    return `<section><h3>Static CFG edges leaving/entering this card</h3>
      <p class="muted">The static graph includes paths guarded by opaque predicates that can never be taken. It is not the run's answer key: only the retained trace decides where execution went.</p>
      <table class="tbl"><tr><th></th><th>from</th><th>to</th><th>kind</th><th>at</th></tr>${rows}</table></section>`;
  }

  private renderProof(candidateId: string): string {
    const r = this.specimen.bundle.analysis_reward;
    const c = r.candidates.find((x) => x.id === candidateId);
    if (!c) return "";
    const assumptions = r.assumptions.map((a) => `<li>${h(a)}</li>`).join("");
    return `<section class="proof"><h3>Analysis reward · proven bogus clone</h3>
      <dl class="kv">
        ${kv("candidate", c.id)}${kv("classification", `${c.classification} (${c.confidence})`)}
        ${kv("IR / label", `${c.ir_block} · ${c.assembly_label} · ${c.symbol}`)}
        ${kv("range", `${c.start_rva}–${c.end_rva_exclusive}`)}
        ${kv("guards", c.guard_ids.join(", "))}
        ${kv("proof", c.proof)}${kv("reachability", c.reachability_basis)}
        ${kv("opaque predicate", r.predicate)}
        ${kv("proof artifact", `${r.proof_artifact} · sha256 ${r.proof_sha256}`)}
      </dl>
      <p class="muted">Assumptions</p><ul>${assumptions}</ul></section>`;
  }

  private renderIdentity(): string {
    const b = this.specimen.bundle.binary;
    return `<section class="identity"><dl class="kv">
      ${kv("binary", `${b.format} ${b.architecture} · base ${b.preferred_image_base}`)}
      ${kv("sha256", b.sha256)}
      ${kv("function", `${b.target_function.name} · ${b.target_function.boundary_source}`)}
    </dl></section>`;
  }

  // --- whole function -------------------------------------------------------

  private renderMap(revealed: boolean): string {
    const sp = this.specimen;
    const rows = sp.bundle.raw.blocks
      .map((b) => {
        const card = b.stage_id ? cardTitle(sp, b.stage_id, revealed) : "— (inspector only)";
        const cls = revealed ? `<td>${h(b.classification)}</td>` : "";
        return `<tr><td>${h(b.id)}</td><td>${h(b.start_rva)}–${h(b.end_rva_exclusive)}</td><td>${b.instructions.length}</td><td>${h(card)}</td>${cls}</tr>`;
      })
      .join("");
    return `<section><p class="muted">${h(sp.bundle.raw.cfg_convention)}</p>
      <table class="tbl"><tr><th>block</th><th>RVA</th><th>instr</th><th>card</th>${revealed ? "<th>classification</th>" : ""}</tr>${rows}</table>
      ${revealed ? "" : '<p class="muted">Classifications are hidden until the analysis station has run.</p>'}
      </section>${this.renderIdentity()}`;
  }
}

function kv(label: string, value: string): string {
  return `<div><dt>${h(label)}</dt><dd>${h(value)}</dd></div>`;
}

function writeRow(sp: SpecimenIndex, s: SemanticEvent): string {
  const value = stateText(sp, s.field, s.value);
  return `<tr><td>${s.instruction_step_index}</td><td>${h(s.instruction_address)}</td><td><code>${h(s.instruction_text)}</code></td><td>${h(s.field)} ← ${h(value)}</td><td>${h(s.kind)}</td></tr>`;
}
