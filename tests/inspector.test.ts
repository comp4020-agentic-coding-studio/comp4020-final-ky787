// @vitest-environment jsdom
/**
 * The expert inspector shows real code, ports and the run's actual branch
 * outcome — but before an analysis reward it names nothing about bogus
 * code: no clone names, classifications or proofs.
 */

import { describe, expect, it } from "vitest";
import { loadSpecimen } from "../src/data/specimen.ts";
import { Replay } from "../src/replay/replay.ts";
import { Inspector } from "../src/ui/inspector.ts";

const specimen = loadSpecimen();
const CORRECT = new Map(specimen.bundle.output_ports.map((p) => [p.id, p.expected_destination_stage_id]));
const GIVEAWAYS = ["decoy", "alteredBB", "bogus", "candidate", "clone", "proven", "classification"];

function render(stageId: string, replay: Replay | null, revealed = false, map = false): string {
  const host = document.createElement("div");
  const inspector = new Inspector(host, specimen);
  inspector.open(stageId);
  if (map) (host.querySelector('[data-act="map"]') as HTMLButtonElement).click();
  inspector.update(replay, (p) => CORRECT.get(p) ?? null, (p) => p.startsWith("cmp_000010a2"), revealed);
  return host.textContent ?? "";
}

function finished(input: number): Replay {
  const replay = new Replay(specimen, input);
  replay.start();
  for (let i = 0; i < 500 && replay.status === "running"; i += 1) replay.step((p) => CORRECT.get(p) ?? null);
  return replay;
}

describe("expert inspector", () => {
  it.each(["calculate_compare", "compare_high", "low", "match"])("hides every bogus-code giveaway on %s", (stageId) => {
    const text = render(stageId, finished(7));
    for (const word of GIVEAWAYS) expect(text.toLowerCase(), word).not.toContain(word.toLowerCase());
    for (const id of specimen.stage(stageId).raw_block_ids) expect(text).toContain(id);
  });

  it("describes the same branch outcome the machine showed", () => {
    const text = render("calculate_compare", finished(6));
    expect(text).toContain("VALUE = 19 · 19 < 22 · TRUE");
    expect(text).toContain("cmp_000010a2:TRUE");
    expect(text).toContain("your cable");
    expect(text).not.toContain("MATCH ·");
  });

  it("works with no input seated", () => {
    expect(render("low", null)).toContain("No input is seated");
  });

  it("hides classifications in the whole-function map", () => {
    const text = render("low", null, false, true);
    expect(text).not.toContain("proven_bogus_clone");
    expect(text).toContain("bb_00001374");
  });
});
