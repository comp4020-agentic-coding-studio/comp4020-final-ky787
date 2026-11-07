# Rendered README — 2026-11-07

`/readme` and `/readme/` now render the current root README as semantic HTML,
using the production `markdown-it` 15.0.3 dependency. The source Markdown is
unchanged. Headings have stable unique IDs; paragraphs, emphasis, lists, tables,
images and fenced code retain their structure. HEAD still returns headers only.

The standalone page uses the game's dark palette, readable prose, responsive
images, keyboard focus indicators and scrollable table/code containers. No client
JavaScript or Markdown-rendering CDN is required. Raw HTML stays escaped and the
parser's normal unsafe-URL checks remain enabled.

Relative documentation links resolve to GitHub blob/tree views; relative images
resolve to raw.githubusercontent.com because repository docs are not bundled in
the deployed static site. Existing external URLs, local anchors and root-relative
app links retain their destinations. Images therefore require GitHub availability.

Validation: 4 focused HTTP/rendering tests passed (`tests/readme.test.ts`), both
original deployed-page invariants passed, `pnpm typecheck` and `pnpm build` passed.
The existing Chromium/CDP harness passed 9 checks at 1280 and 390 pixels, including
actual loading of both README images and no document-wide horizontal overflow.
The build retains its existing bundle-size advisory.

- [Desktop page](1280-readme.png)
- [Phone controls table](390-controls.png) — horizontally scrollable inside the page
- [Browser checks](checks.txt)

No gameplay, saves, native evidence or README prose changed.
