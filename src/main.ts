// Browser entry point. The specimen bundle is bundled with the page; nothing
// here parses or executes a binary.
import { loadSpecimen } from "./data/specimen.ts";
import { FEATURES } from "./engine/constants.ts";
import { Game } from "./game.ts";
import { CHAMBERS } from "./level/chambers.ts";

declare global {
  // Exposed so the headless browser check can read live state.
  // eslint-disable-next-line no-var
  var binaryNinja: Game | undefined;
}

const params = new URL(globalThis.location.href).searchParams;
const host = document.querySelector<HTMLElement>("#app");
const canvas = document.querySelector<HTMLCanvasElement>("#stage");

if (host && canvas) {
  try {
    const game = new Game(host, canvas, loadSpecimen(), CHAMBERS, {
      debug: params.has("debug"),
      grapple: FEATURES.grapple || params.has("grapple"),
      // `?chamber=2` starts at a later chamber, for play-testing.
      startChamber: Number(params.get("chamber") ?? 0) || 0,
    });
    globalThis.binaryNinja = game;
    game.start();
    canvas.focus();
  } catch (error) {
    host.insertAdjacentHTML(
      "beforeend",
      `<p class="fatal">Could not start the chamber: ${String((error as Error).message ?? error)}</p>`,
    );
    throw error;
  }
}
