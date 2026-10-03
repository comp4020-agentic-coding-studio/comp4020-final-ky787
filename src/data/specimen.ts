/**
 * The one specimen this prototype plays: the bundled, byte-identical copy of
 * the workspace export (see `game_data/SOURCE.md`).
 */

import raw from "../../game_data/level01_compare_bcf_v2.json";
import { parseBundle, SpecimenIndex } from "./bundle.ts";

export function loadSpecimen(): SpecimenIndex {
  return new SpecimenIndex(parseBundle(raw));
}
