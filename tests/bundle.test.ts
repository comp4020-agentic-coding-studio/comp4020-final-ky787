/**
 * The bundled specimen is the validated workspace export, untouched, and the
 * loader enforces the contract the replay depends on.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BundleError, parseBundle, SpecimenIndex } from "../src/data/bundle.ts";
import { loadSpecimen } from "../src/data/specimen.ts";

const COPY = "game_data/level01_compare_bcf_v1.json";
const SOURCE = "Workspace/binary_binja_redesign/game_data/level01_compare_bcf_v1.json";
const sha256 = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

describe("bundled specimen", () => {
  it.runIf(existsSync(SOURCE))("is byte-identical to the workspace export", () => {
    expect(sha256(COPY), "run `pnpm sync:bundle` after a re-export").toBe(sha256(SOURCE));
  });

  it("is the BCF specimen bound to the recorded PE identity", () => {
    const specimen = loadSpecimen();
    const b = specimen.bundle;
    expect(b.schema).toBe("binary-binja-specimen/v1");
    expect(b.specimen_id).toBe("level01_compare_bcf_v1");
    expect(b.binary.sha256).toBe("f4fbc58c25921fcf990374bca6182a4c45f42f7f51dc6c3d1534ef4f6b4d3235");
    expect(b.allowed_inputs).toEqual([6, 7, 8]);
    expect(b.stages).toHaveLength(9);
    for (const trace of b.traces) expect(trace.binary_sha256).toBe(b.binary.sha256);
  });

  it("rejects an unsupported schema version", () => {
    const raw = JSON.parse(readFileSync(COPY, "utf8"));
    raw.schema = "binary-binja-specimen/v2";
    expect(() => parseBundle(raw)).toThrow(BundleError);
  });

  it("rejects a trace whose next-stage links do not chain", () => {
    const raw = JSON.parse(readFileSync(COPY, "utf8"));
    raw.traces[1].events[1].next_stage_id = "match";
    expect(() => parseBundle(raw)).toThrow(/next_stage_id/);
  });

  it("orders each stage's timeline by instruction step", () => {
    const specimen = new SpecimenIndex(parseBundle(JSON.parse(readFileSync(COPY, "utf8"))));
    for (const trace of specimen.bundle.traces) {
      for (const event of trace.events) {
        const steps = specimen.stageTimeline(trace, event).map((e) => e.step_index);
        expect(steps).toEqual([...steps].sort((a, b) => a - b));
        for (const step of steps) {
          expect(step).toBeGreaterThanOrEqual(event.start_step);
          expect(step).toBeLessThanOrEqual(event.end_step);
        }
      }
    }
  });
});
