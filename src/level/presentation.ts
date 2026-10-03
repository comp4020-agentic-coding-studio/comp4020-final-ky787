/**
 * Text and colour the player sees, derived from bundle fields. The machines,
 * the HUD and the expert inspector all call these with the same objects from
 * the running replay, so they describe one retained execution.
 *
 * Comparison machines are titled by their exported branch-site `expression`;
 * their answers are the exported `branch_outcomes[].feedback.lines`, shown as
 * given. LOW / MATCH / HIGH appear only as final output labels.
 */

import type { SpecimenIndex } from "../data/bundle.ts";
import type { StateField } from "../data/bundle-types.ts";

/** Short machine names for the non-comparison stages (presentation only). */
const TITLES: Record<string, string> = {
  entry: "START",
  low: "LOW",
  high: "HIGH",
  match: "MATCH",
  end: "RETURN",
};

/** A second line some machines carry; the calculation is the bundle's own title formula. */
const SUBTITLES: Record<string, string> = {
  calculate_compare: "VALUE = INPUT × 3 + 1",
};

export function machineTitle(specimen: SpecimenIndex, stageId: string, override?: string): string {
  if (override) return override;
  const site = specimen.siteForStage(stageId);
  if (site) return `${site.expression.toUpperCase()} ?`;
  return TITLES[stageId] ?? specimen.stage(stageId).label.toUpperCase();
}

export function machineSubtitle(stageId: string): string | null {
  return SUBTITLES[stageId] ?? null;
}

/** A stage's neutral identifier: the start RVA of its first raw block. */
export function stageTag(specimen: SpecimenIndex, stageId: string): string {
  const first = specimen.stage(stageId).raw_block_ids[0];
  return specimen.blocksById.get(first)?.start_rva ?? stageId;
}

/** Title plus address tag, for the inspector and debug views. */
export function stageName(specimen: SpecimenIndex, stageId: string): string {
  return `${machineTitle(specimen, stageId)} @${stageTag(specimen, stageId)}`;
}

/** Port label as the jack shows it: TRUE / FALSE / OUT. */
export function portLabel(specimen: SpecimenIndex, portId: string): string {
  const port = specimen.port(portId);
  return port.kind === "semantic_branch" ? port.label : "OUT";
}

export type Tone = "neutral" | "compare" | "low" | "match" | "high";

export const TONE_COLOURS: Record<Tone, string> = {
  neutral: "#9fd3ff",
  compare: "#ffc857",
  low: "#5aa9ff",
  match: "#4ee0a1",
  high: "#ff8a4c",
};

export const BOOL_COLOURS = { TRUE: "#4ee0a1", FALSE: "#ff8a4c" } as const;

export function machineTone(specimen: SpecimenIndex, stageId: string): Tone {
  if (specimen.siteForStage(stageId)) return "compare";
  if (stageId === "low" || stageId === "match" || stageId === "high") return stageId;
  return "neutral";
}

/** A state field as the player reads it; the harness sentinel shows as unset. */
export function stateText(specimen: SpecimenIndex, field: StateField, value: number): string {
  if (value === specimen.bundle.state_contract.initial_sentinel) return "unset";
  if (field === "result") {
    const name = specimen.resultName(value);
    return name ? `${name} (${value})` : String(value);
  }
  return String(value);
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
