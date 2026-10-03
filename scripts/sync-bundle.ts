#!/usr/bin/env node
/**
 * Copies the validated browser bundle from the shared evidence workspace into
 * `game_data/`, byte for byte. The deployed game must not depend on the
 * workspace at runtime, so it ships this copy; `tests/bundle.test.ts` fails if
 * the two ever drift while the workspace is mounted.
 *
 *   node scripts/sync-bundle.ts
 */
import { createHash } from "node:crypto";
import { copyFileSync, readFileSync } from "node:fs";

const SOURCE = "Workspace/binary_binja_redesign/game_data/level01_compare_bcf_v2.json";
const TARGET = "game_data/level01_compare_bcf_v2.json";

const sha256 = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

const before = (() => {
  try {
    return sha256(TARGET);
  } catch {
    return null;
  }
})();
copyFileSync(SOURCE, TARGET);
const after = sha256(TARGET);
console.log(`${TARGET}\n  sha256 ${after}${before === after ? " (unchanged)" : before ? ` (was ${before})` : ""}`);
