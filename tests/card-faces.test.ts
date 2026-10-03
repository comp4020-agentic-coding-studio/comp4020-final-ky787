/**
 * Card faces are presentation over real data: every excerpt line is a real
 * instruction of that card's own raw blocks, and a hidden candidate wears the
 * face of the stage it was actually cloned from — and only the proven
 * candidates the analysis reward names are disguised at all.
 */

import { describe, expect, it } from "vitest";
import { loadSpecimen } from "../src/data/specimen.ts";
import { CARD_FACES } from "../src/level/card-faces.ts";
import { cardExcerpt, cardTitle, isRevealedCandidate } from "../src/level/presentation.ts";

const specimen = loadSpecimen();
const reward = specimen.bundle.analysis_reward;

describe("card faces", () => {
  it("cover exactly the specimen's stages", () => {
    expect(Object.keys(CARD_FACES).sort()).toEqual(specimen.bundle.stages.map((s) => s.id).sort());
  });

  it("only excerpt instructions from the card's own raw blocks", () => {
    for (const [stageId, face] of Object.entries(CARD_FACES)) {
      const own = new Set(specimen.stageBlocks(stageId).flatMap((b) => b.instructions.map((i) => i.address)));
      for (const address of face.excerpt) expect(own.has(address), `${stageId} ${address}`).toBe(true);
      expect(cardExcerpt(specimen, stageId)).toHaveLength(face.excerpt.length);
    }
  });

  it("disguise only the revealed candidates, each as the stage it was cloned from", () => {
    const disguised = Object.entries(CARD_FACES).filter(([, f]) => f.mirrors).map(([id]) => id).sort();
    expect(disguised).toEqual([...reward.reveal_stage_ids].sort());
    for (const stageId of disguised) {
      const mirrored = CARD_FACES[stageId].mirrors as string;
      const candidate = reward.candidates.find((c) => c.stage_id === stageId);
      expect(candidate?.classification).toBe("obfuscator_generated_bogus");
      expect(specimen.stage(mirrored).classification).toBe("legitimate_stage");
      // BCF names an altered clone after its original block.
      expect(specimen.stage(mirrored).ir_blocks).toContain(candidate?.ir_block.replace(/alteredBB$/, ""));
    }
  });

  it("show the bundle's own label once the analysis is revealed", () => {
    expect(cardTitle(specimen, "decoy_match", false)).toBe(specimen.stage("match").label);
    expect(cardTitle(specimen, "decoy_match", true)).toBe(specimen.stage("decoy_match").label);
    expect(isRevealedCandidate(specimen, "decoy_match", false)).toBe(false);
    expect(isRevealedCandidate(specimen, "decoy_match", true)).toBe(true);
    // Never-executed legitimate stages are not candidates.
    expect(isRevealedCandidate(specimen, "high", true)).toBe(false);
  });
});
