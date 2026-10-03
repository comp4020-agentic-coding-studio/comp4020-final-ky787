/**
 * Text the player sees, derived from bundle fields. The beginner HUD, the
 * in-world hint badge and the expert inspector all call these with the same
 * comparison/semantic objects from the running replay, so they describe one
 * retained execution rather than separate explanations.
 */

import type { SpecimenIndex } from "../data/bundle.ts";
import type { Comparison, Instruction, StateField } from "../data/bundle-types.ts";
import { CARD_FACES } from "./card-faces.ts";

/** Card title: the stage label, or for a hidden candidate, the label of the stage it mirrors. */
export function cardTitle(specimen: SpecimenIndex, stageId: string, revealed: boolean): string {
  const face = CARD_FACES[stageId];
  if (face?.mirrors && !revealed) return specimen.stage(face.mirrors).label;
  return specimen.stage(stageId).label;
}

/** A card's neutral identifier: the start RVA of its first raw block. */
export function cardTag(specimen: SpecimenIndex, stageId: string): string {
  const first = specimen.stage(stageId).raw_block_ids[0];
  return specimen.blocksById.get(first)?.start_rva ?? stageId;
}

/** Title plus address tag, for places where two cards may share a title. */
export function cardName(specimen: SpecimenIndex, stageId: string, revealed: boolean): string {
  return `${cardTitle(specimen, stageId, revealed)} @${cardTag(specimen, stageId)}`;
}

export function isRevealedCandidate(specimen: SpecimenIndex, stageId: string, revealed: boolean): boolean {
  return revealed && specimen.bundle.analysis_reward.reveal_stage_ids.includes(stageId);
}

/** The excerpt instructions for a card, looked up verbatim by address. */
export function cardExcerpt(specimen: SpecimenIndex, stageId: string): Instruction[] {
  const face = CARD_FACES[stageId];
  if (!face) return [];
  return face.excerpt.flatMap((address) => {
    const hit = specimen.instructionsByAddress.get(address.toLowerCase());
    return hit ? [hit.instruction] : [];
  });
}

/** The two measured operands of a retained comparison, as signed values. */
export function comparisonValues(c: Comparison): { value: number; target: number } {
  return { value: c.operands[0].signed, target: c.operands[1].signed };
}

/** "19 is below 22" — straight from the exported relationship, never from assembly. */
export function relationshipPhrase(c: Comparison): string {
  const { value, target } = comparisonValues(c);
  switch (c.relationship) {
    case "below":
      return `${value} is below ${target}`;
    case "equal":
      return `${value} matches ${target}`;
    case "above":
      return `${value} is above ${target}`;
  }
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
