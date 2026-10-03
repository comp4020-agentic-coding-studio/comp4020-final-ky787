// @vitest-environment jsdom
/**
 * The expert inspector shows real code from the start, but nothing that names
 * the answer until the analysis reward is earned: no stage ids or kinds, no
 * BCF clone names, no classifications or proofs. Afterwards it shows the
 * bundle's proof for the revealed candidates.
 */

import { describe, expect, it } from "vitest";
import { loadSpecimen } from "../src/data/specimen.ts";
import { Replay } from "../src/replay/replay.ts";
import { Inspector } from "../src/ui/inspector.ts";

const specimen = loadSpecimen();
const GIVEAWAYS = ["decoy", "alteredBB", "bogus", "candidate", "clone", "proven", "analysis_candidate", "classification"];

function render(stageId: string, revealed: boolean, map = false): string {
  const host = document.createElement("div");
  const inspector = new Inspector(host, specimen);
  inspector.open(stageId);
  if (map) (host.querySelector('[data-act="map"]') as HTMLButtonElement).click();
  inspector.update(new Replay(specimen, 7), revealed);
  return host.textContent ?? "";
}

describe("expert inspector", () => {
  it.each(["decoy_low", "decoy_match", "match", "low"])("hides the answer on %s before the reveal", (stageId) => {
    const text = render(stageId, false);
    for (const word of GIVEAWAYS) expect(text.toLowerCase(), word).not.toContain(word.toLowerCase());
    // Real instructions are still there for an expert to read.
    for (const id of specimen.stage(stageId).raw_block_ids) expect(text).toContain(id);
  });

  it("hides classifications in the whole-function map before the reveal", () => {
    const text = render("entry", false, true);
    expect(text).not.toContain("proven_bogus_clone");
    expect(text).not.toContain("proven_infeasible_trampoline");
    expect(text).toContain("bb_00001374");
  });

  it("shows the bundle's proof for a revealed candidate", () => {
    const text = render("decoy_match", true);
    const candidate = specimen.bundle.analysis_reward.candidates.find((c) => c.stage_id === "decoy_match");
    expect(text).toContain(candidate?.id);
    expect(text).toContain(candidate?.proof);
    expect(text).toContain(specimen.bundle.analysis_reward.predicate);
  });

  it("never marks a legitimate stage as bogus after the reveal", () => {
    const text = render("high", true);
    expect(text).not.toContain("Analysis reward");
    expect(text).toContain("legitimate_stage");
  });
});
