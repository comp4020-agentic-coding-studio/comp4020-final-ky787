/**
 * Beginner-facing card faces for the level 01 specimen. Presentation only:
 * titles come from the bundle's stage labels, and the code excerpt on each
 * card is a hand-picked list of instruction *addresses* whose text is looked
 * up verbatim in `raw.blocks` — no instruction text is written here.
 *
 * The two analysis candidates must look plausible until the analysis reward
 * reveals them, and the bundle's own labels ("Analysis candidate A/B") would
 * give them away. So a candidate wears the face of the legitimate stage it was
 * cloned from (`mirrors`), and its excerpt shows its own real stores:
 *
 * - decoy_low is `originalBB14alteredBB`, BCF's altered copy of
 *   `originalBB14`, which belongs to the `low` stage. Its bytes store 1 into
 *   `result`, the same store LOW makes.
 * - decoy_match is `originalBB26alteredBB`, the altered copy of `originalBB26`
 *   in the `match` stage. Its bytes store 2 into `result` and 1 into
 *   `bridge_open`.
 *
 * The experiment README describes them the same way ("a LOW result store and
 * a MATCH/bridge-open store"). The face describes what the bytes say; it
 * claims nothing about reachability, and the replay never emits an event for
 * either card. `tests/card-faces.test.ts` checks every address and mirror.
 */

export type CardTone = "entry" | "compare" | "low" | "match" | "high" | "end";

export interface CardFace {
  /** Short plain-language lines for someone with no reverse-engineering background. */
  lines: string[];
  /** Instruction addresses (full VA) shown verbatim on the card, in order. */
  excerpt: string[];
  tone: CardTone;
  /** For an analysis candidate: the stage whose face it wears until revealed. */
  mirrors?: string;
}

export const CARD_FACES: Record<string, CardFace> = {
  entry: {
    lines: ["The program starts here", "with the input you choose."],
    excerpt: ["0x140001000", "0x14000100e"],
    tone: "entry",
  },
  calculate_compare: {
    lines: ["value = input × 3 + 1", "then compare value with 22"],
    excerpt: ["0x140001087", "0x14000108a", "0x1400010a2", "0x1400010a5"],
    tone: "compare",
  },
  compare_high: {
    lines: ["compare value with 22 again"],
    excerpt: ["0x140001183", "0x140001186"],
    tone: "compare",
  },
  low: {
    lines: ["result ← LOW"],
    excerpt: ["0x140001117"],
    tone: "low",
  },
  high: {
    lines: ["result ← HIGH"],
    excerpt: ["0x1400011f8"],
    tone: "high",
  },
  match: {
    lines: ["result ← MATCH", "bridge_open ← 1"],
    excerpt: ["0x140001264", "0x14000126e"],
    tone: "match",
  },
  end: {
    lines: ["return the result"],
    excerpt: ["0x140001338", "0x140001373"],
    tone: "end",
  },
  decoy_low: {
    lines: ["result ← LOW"],
    excerpt: ["0x1400013e3"],
    tone: "low",
    mirrors: "low",
  },
  decoy_match: {
    lines: ["result ← MATCH", "bridge_open ← 1"],
    excerpt: ["0x14000140e", "0x140001418"],
    tone: "match",
    mirrors: "match",
  },
};

export const TONE_COLOURS: Record<CardTone, string> = {
  entry: "#9fd3ff",
  compare: "#ffc857",
  low: "#5aa9ff",
  match: "#4ee0a1",
  high: "#ff8a4c",
  end: "#c3b5ff",
};

/** Colours for comparison hints, shared by the in-world badge and the HUD. */
export const HINT_COLOURS: Record<string, string> = {
  LOW: TONE_COLOURS.low,
  MATCH: TONE_COLOURS.match,
  HIGH: TONE_COLOURS.high,
};
