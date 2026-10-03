/**
 * The bundled specimen is the validated v2 workspace export, untouched, and
 * the loader enforces the contract the replay depends on.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BundleError, parseBundle } from "../src/data/bundle.ts";
import { loadSpecimen } from "../src/data/specimen.ts";

const COPY = "game_data/level01_compare_bcf_v2.json";
const SOURCE = "Workspace/binary_binja_redesign/game_data/level01_compare_bcf_v2.json";
const sha256 = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");
const fresh = (): Record<string, any> => JSON.parse(readFileSync(COPY, "utf8"));

describe("bundled specimen", () => {
  it.runIf(existsSync(SOURCE))("is byte-identical to the workspace export", () => {
    expect(sha256(COPY), "run `pnpm sync:bundle` after a re-export").toBe(sha256(SOURCE));
  });

  it("is the v2 contract over the frozen BCF specimen", () => {
    const b = loadSpecimen().bundle;
    expect(b.schema).toBe("binary-binja-specimen/v2");
    expect(b.specimen_id).toBe("level01_compare_bcf_v1");
    expect(b.frontend_contract_id).toBe("level01_compare_bcf_v2");
    expect(b.binary.sha256).toBe("f4fbc58c25921fcf990374bca6182a4c45f42f7f51dc6c3d1534ef4f6b4d3235");
    expect(b.allowed_inputs).toEqual([6, 7, 8]);
    for (const trace of b.traces) expect(trace.binary_sha256).toBe(b.binary.sha256);
  });

  it("exposes the stable TRUE/FALSE ports and their verified destinations", () => {
    const sp = loadSpecimen();
    expect(sp.port("cmp_000010a2:TRUE").expected_destination_stage_id).toBe("low");
    expect(sp.port("cmp_000010a2:FALSE").expected_destination_stage_id).toBe("compare_high");
    expect(sp.port("cmp_00001183:TRUE").expected_destination_stage_id).toBe("high");
    expect(sp.port("cmp_00001183:FALSE").expected_destination_stage_id).toBe("match");
    expect(sp.siteForStage("calculate_compare")?.expression).toBe("value < 22");
    expect(sp.stagePorts("end")).toEqual([]);
    expect(sp.stagePorts("decoy_match")).toEqual([]);
  });

  it("rejects the v1 schema", () => {
    const raw = fresh();
    raw.schema = "binary-binja-specimen/v1";
    expect(() => parseBundle(raw)).toThrow(BundleError);
  });

  it("rejects an occurrence whose exit disagrees with its branch outcome", () => {
    const raw = fresh();
    raw.traces[1].events[1].exit_port_id = "cmp_000010a2:TRUE";
    expect(() => parseBundle(raw)).toThrow(/exit disagrees/);
  });

  it("orders each occurrence's steps by instruction step, with feedback before activation", () => {
    const sp = loadSpecimen();
    for (const trace of sp.bundle.traces) {
      for (const event of trace.events) {
        const steps = sp.stageTimeline(trace, event);
        const indices = steps.map((s) => s.step_index);
        expect(indices).toEqual([...indices].sort((a, b) => a - b));
        for (const i of indices) {
          expect(i).toBeGreaterThanOrEqual(event.start_step);
          expect(i).toBeLessThanOrEqual(event.end_step);
        }
        const kinds = steps.map((s) => s.kind);
        if (event.branch_outcome_event_id) {
          expect(kinds.indexOf("comparison")).toBeLessThan(kinds.indexOf("feedback"));
          expect(kinds.indexOf("feedback")).toBeLessThan(kinds.indexOf("activation"));
        } else {
          expect(kinds).not.toContain("feedback");
        }
      }
    }
  });
});
