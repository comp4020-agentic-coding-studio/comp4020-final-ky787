#!/usr/bin/env node
/**
 * Headless play test of the chamber, adapted from the previous Binary Ninja
 * browser check. It drives real keyboard events through the Chrome DevTools
 * Protocol against a served build, asserts the core loop (carry a cable,
 * wire, run, stop on a wrong card, bridge only on input 7, carry the cube
 * across, analysis reveal), fails on console errors, and saves screenshots.
 *
 *   pnpm build && pnpm preview &   # serves on :4173
 *   node scripts/browser-check.ts [url] [screenshot-dir]
 */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const URL_BASE = process.argv[2] ?? "http://localhost:4173/";
const SHOTS = process.argv[3] ?? join(tmpdir(), "binary-ninja-shots");
const BROWSERS = ["chromium-browser", "chromium", "google-chrome", "google-chrome-stable"];
const PORT = 9334;

interface Cdp {
  send: (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  close: () => void;
  errors: string[];
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function launch(): Promise<{ kill: () => void; profile: string }> {
  const profile = mkdtempSync(join(tmpdir(), "bn-"));
  for (const bin of BROWSERS) {
    try {
      const child = spawn(
        bin,
        [
          "--headless",
          "--disable-gpu",
          "--no-sandbox",
          "--no-first-run",
          `--remote-debugging-port=${PORT}`,
          `--user-data-dir=${profile}`,
          "--window-size=1600,900",
          "about:blank",
        ],
        { stdio: "ignore" },
      );
      for (let i = 0; i < 60; i += 1) {
        await sleep(250);
        try {
          const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
          if (res.ok) return { kill: () => child.kill(), profile };
        } catch {
          /* not up yet */
        }
      }
      child.kill();
    } catch {
      /* try the next binary */
    }
  }
  throw new Error(`no usable browser found (tried ${BROWSERS.join(", ")})`);
}

async function connect(url: string): Promise<Cdp> {
  const created = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  const target = (await created.json()) as { webSocketDebuggerUrl: string };
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const pending = new Map<number, (value: Record<string, unknown>) => void>();
  const errors: string[] = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as {
      id?: number;
      method?: string;
      result?: Record<string, unknown>;
      error?: { message: string };
      params?: Record<string, unknown>;
    };
    if (message.id !== undefined) {
      pending.get(message.id)?.(message.error ? { error: message.error } : (message.result ?? {}));
      pending.delete(message.id);
      return;
    }
    if (message.method === "Runtime.exceptionThrown") {
      const details = message.params?.exceptionDetails as { text?: string; exception?: { description?: string } };
      errors.push(details?.exception?.description ?? details?.text ?? "uncaught exception");
    }
    if (message.method === "Runtime.consoleAPICalled") {
      const params = message.params as { type?: string; args?: { value?: unknown }[] };
      if (params.type === "error") errors.push(params.args?.map((a) => String(a.value)).join(" ") ?? "console error");
    }
  });
  const send: Cdp["send"] = (method, params = {}) =>
    new Promise((resolve) => {
      id += 1;
      pending.set(id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });
  await send("Runtime.enable");
  await send("Page.enable");
  return { send, close: () => socket.close(), errors };
}

async function evaluate<T>(cdp: Cdp, expression: string): Promise<T> {
  const result = (await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })) as {
    result?: { value?: T };
    exceptionDetails?: { text?: string; exception?: { description?: string } };
    error?: { message: string };
  };
  if (result.error) throw new Error(result.error.message);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? "evaluate failed");
  }
  return result.result?.value as T;
}

const KEYS: Record<string, { key: string; vk: number }> = {
  KeyA: { key: "a", vk: 65 },
  KeyD: { key: "d", vk: 68 },
  KeyE: { key: "e", vk: 69 },
  KeyH: { key: "h", vk: 72 },
  KeyI: { key: "i", vk: 73 },
  KeyF: { key: "f", vk: 70 },
  KeyR: { key: "r", vk: 82 },
  Space: { key: " ", vk: 32 },
  Enter: { key: "Enter", vk: 13 },
  Escape: { key: "Escape", vk: 27 },
  Tab: { key: "Tab", vk: 9 },
  F1: { key: "F1", vk: 112 },
  Digit1: { key: "1", vk: 49 },
  Digit2: { key: "2", vk: 50 },
  Digit3: { key: "3", vk: 51 },
};

async function key(cdp: Cdp, type: "keyDown" | "keyUp", code: string): Promise<void> {
  const k = KEYS[code];
  await cdp.send("Input.dispatchKeyEvent", {
    type: type === "keyDown" ? "rawKeyDown" : "keyUp",
    code,
    key: k.key,
    windowsVirtualKeyCode: k.vk,
    nativeVirtualKeyCode: k.vk,
  });
}

async function tap(cdp: Cdp, code: string): Promise<void> {
  await key(cdp, "keyDown", code);
  await sleep(40);
  await key(cdp, "keyUp", code);
  await sleep(60);
}

interface Snap {
  input: number;
  trace: string;
  status: string;
  cursor: number;
  stop: { at: string; proposed: string | null; reason: string } | null;
  state: { value: number; result: number; bridge_open: number };
  bridgeOpen: boolean;
  bridgeExtent: number;
  wiring: [string, string][];
  held: { kind: string; from?: string } | null;
  station: string;
  player: { x: number; y: number; grounded: boolean; groundId: string | null };
  cube: { x: number; y: number; socketed: boolean };
}

const snap = (cdp: Cdp): Promise<Snap> => evaluate<Snap>(cdp, "globalThis.binaryNinja.snapshot()");

async function waitFor(cdp: Cdp, what: string, predicate: (s: Snap) => boolean, timeoutMs = 20000): Promise<Snap> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const s = await snap(cdp);
    if (predicate(s)) return s;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}: ${JSON.stringify(s)}`);
    await sleep(80);
  }
}

/** Holds a direction key until the player's x passes `x`. */
async function walkTo(cdp: Cdp, x: number): Promise<Snap> {
  const s = await snap(cdp);
  const code = x > s.player.x ? "KeyD" : "KeyA";
  await key(cdp, "keyDown", code);
  try {
    return await waitFor(cdp, `walk to x=${x}`, (n) => (code === "KeyD" ? n.player.x >= x : n.player.x <= x), 8000);
  } finally {
    await key(cdp, "keyUp", code);
    await sleep(250);
  }
}

async function shot(cdp: Cdp, name: string): Promise<void> {
  const res = (await cdp.send("Page.captureScreenshot", { format: "png" })) as { data?: string };
  if (res.data) writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(res.data, "base64"));
}

const checks: string[] = [];
function check(label: string, ok: boolean, detail = ""): void {
  checks.push(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) throw new Error(`${label} ${detail}`);
}

/** Puts the player at a point (debug teleport; movement itself is tested separately). */
const teleport = (cdp: Cdp, x: number, y: number): Promise<unknown> =>
  evaluate(cdp, `(() => { const p = binaryNinja.world.player; p.x = ${x}; p.y = ${y}; p.vx = 0; p.vy = 0; })()`);

const wire = (cdp: Cdp, pairs: [string, string][]): Promise<unknown> =>
  evaluate(
    cdp,
    `(() => { const w = binaryNinja.world; w.clearWiring(); for (const [a, b] of ${JSON.stringify(pairs)}) w.connect(a, b); })()`,
  );

async function main(): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  const browser = await launch();
  let cdp: Cdp | null = null;
  try {
    cdp = await connect(URL_BASE);
    await waitFor(cdp, "game boot", (s) => typeof s.status === "string", 15000).catch(async () => {
      await sleep(1000);
      return snap(cdp as Cdp);
    });
    await sleep(600);
    await shot(cdp, "01-help");
    await tap(cdp, "KeyH");
    await sleep(500);
    await shot(cdp, "02-start");

    // Physically carry a cable: entry OUT -> calculate_compare IN.
    const sockets = await evaluate<Record<string, { in: { x: number } | null; out: { x: number } | null }>>(
      cdp,
      "Object.fromEntries([...binaryNinja.world.cards].map(([k, c]) => [k, { in: c.in, out: c.out }]))",
    );
    await walkTo(cdp, (sockets.entry.out?.x ?? 0) - 6);
    await tap(cdp, "KeyE");
    let s = await snap(cdp);
    check("E at an OUT socket picks up its cable", s.held?.kind === "cable" && s.held.from === "entry", JSON.stringify(s.held));
    await walkTo(cdp, (sockets.calculate_compare.in?.x ?? 0) + 4);
    await shot(cdp, "03-carrying-cable");
    await tap(cdp, "KeyE");
    s = await snap(cdp);
    check("E at an IN socket plugs it", JSON.stringify(s.wiring) === JSON.stringify([["entry", "calculate_compare"]]), JSON.stringify(s.wiring));

    // Physically jump up a ladder to the gallery.
    await walkTo(cdp, 1770);
    for (let i = 0; i < 6; i += 1) {
      await key(cdp, "keyDown", "Space");
      await sleep(380);
      await key(cdp, "keyUp", "Space");
      await sleep(250);
    }
    s = await snap(cdp);
    check("the right ladder climbs to the gallery", s.player.groundId === "gallery", `${s.player.groundId} @ ${s.player.y.toFixed(0)}`);
    await shot(cdp, "04-gallery");

    // Correct wiring for input 7: watch it run, bridge opens only at its event.
    await wire(cdp, [
      ["entry", "calculate_compare"],
      ["calculate_compare", "compare_high"],
      ["compare_high", "match"],
      ["match", "end"],
      ["low", "end"],
      ["high", "end"],
    ]);
    await teleport(cdp, 1500, 1083);
    await tap(cdp, "Digit2");
    await tap(cdp, "Enter");
    await waitFor(cdp, "first comparison", (n) => n.cursor >= 1 && n.state.value === 22, 8000);
    await sleep(500);
    await shot(cdp, "05-run7-compare");
    s = await snap(cdp);
    check("bridge still closed before the MATCH write", !s.bridgeOpen && s.state.bridge_open !== 1);
    s = await waitFor(cdp, "input 7 finished", (n) => n.status === "finished", 20000);
    check("input 7 finishes MATCH with the bridge open", s.state.result === 2 && s.bridgeOpen, JSON.stringify(s.state));
    await sleep(1200);
    await shot(cdp, "06-run7-finished");
    s = await snap(cdp);
    check("the physical bridge extended", s.bridgeExtent === 1, String(s.bridgeExtent));

    // Wrong card: the MATCH clone. The run stops and the bridge retracts.
    await wire(cdp, [
      ["entry", "calculate_compare"],
      ["calculate_compare", "compare_high"],
      ["compare_high", "decoy_match"],
      ["decoy_match", "end"],
    ]);
    await tap(cdp, "Enter");
    s = await waitFor(cdp, "stop on decoy", (n) => n.status === "stopped", 20000);
    check(
      "wiring the MATCH clone stops at compare_high",
      s.stop?.at === "compare_high" && s.stop.proposed === "decoy_match" && !s.bridgeOpen && s.state.result === -999,
      JSON.stringify(s.stop),
    );
    await sleep(900);
    await shot(cdp, "07-run7-stopped-decoy");
    s = await snap(cdp);
    check("the bridge retracted for the fresh run", s.bridgeExtent === 0, String(s.bridgeExtent));

    // The expert inspector on the MATCH clone, before any reveal: real code, no answer.
    await teleport(cdp, 1520, 1083);
    await sleep(300);
    await tap(cdp, "KeyI");
    await sleep(400);
    const inspectorText = await evaluate<string>(cdp, "document.querySelector('.inspector')?.textContent ?? ''");
    const leaks = ["decoy", "alteredBB", "bogus", "clone", "candidate"].filter((w) => inspectorText.toLowerCase().includes(w.toLowerCase()));
    check("the inspector shows the clone's real code without naming it", inspectorText.includes("bb_00001407") && leaks.length === 0, leaks.join(","));
    await shot(cdp, "07b-inspector-before-reveal");
    await tap(cdp, "KeyI");

    // Input 6: valid LOW run, bridge stays closed.
    await wire(cdp, [
      ["entry", "calculate_compare"],
      ["calculate_compare", "low"],
      ["low", "end"],
    ]);
    await tap(cdp, "Digit1");
    s = await snap(cdp);
    check("selecting input 6 gives a fresh, unstarted replay", s.input === 6 && s.status === "ready" && s.trace === "input_6");
    await tap(cdp, "KeyF");
    await tap(cdp, "Enter");
    s = await waitFor(cdp, "input 6 finished", (n) => n.status === "finished", 20000);
    check("input 6 finishes LOW with the bridge closed", s.state.result === 1 && !s.bridgeOpen);
    await tap(cdp, "KeyF");

    // Input 8 stopped by input 6's wiring at the first comparison.
    await tap(cdp, "Digit3");
    await tap(cdp, "Enter");
    s = await waitFor(cdp, "input 8 stops", (n) => n.status === "stopped", 20000);
    check("input 8 on input 6's wiring stops at calculate_compare", s.stop?.at === "calculate_compare");

    // Re-open the bridge with input 7 and carry the cube across on foot.
    await wire(cdp, [
      ["entry", "calculate_compare"],
      ["calculate_compare", "compare_high"],
      ["compare_high", "match"],
      ["match", "end"],
    ]);
    await tap(cdp, "Digit2");
    await tap(cdp, "KeyF");
    await tap(cdp, "Enter");
    await waitFor(cdp, "bridge reopened", (n) => n.bridgeExtent === 1, 20000);
    await tap(cdp, "KeyF");
    const cube = (await snap(cdp)).cube;
    await teleport(cdp, cube.x + 30, 1083);
    await sleep(300);
    await walkTo(cdp, cube.x + 6);
    await tap(cdp, "KeyE");
    s = await snap(cdp);
    check("E picks up the cube", s.held?.kind === "cube");
    await teleport(cdp, 2150, 1083);
    await sleep(200);
    const slot = await evaluate<{ x: number }>(cdp, "binaryNinja.room.station.slot");
    await walkTo(cdp, slot.x - 4);
    s = await snap(cdp);
    check("walked across the open bridge with the cube", s.player.groundId === "floor_far" && s.held?.kind === "cube", `${s.player.groundId}`);
    await tap(cdp, "KeyE");
    s = await snap(cdp);
    check("the cube powers the analysis station", s.station === "online" && s.cube.socketed);
    await walkTo(cdp, slot.x + 150);
    await tap(cdp, "KeyE");
    s = await snap(cdp);
    check("using the powered station reveals the analysis", s.station === "revealed");
    await sleep(600);
    await shot(cdp, "08-station-revealed");

    // Overview + revealed decoys.
    await key(cdp, "keyDown", "Tab");
    await sleep(1500);
    await shot(cdp, "09-overview-revealed");
    await key(cdp, "keyUp", "Tab");

    // Expert inspector on the MATCH clone, then the real MATCH card after a run.
    await teleport(cdp, 1500, 1083);
    await sleep(400);
    await evaluate(cdp, "binaryNinja.director.select(7)");
    await wire(cdp, [
      ["entry", "calculate_compare"],
      ["calculate_compare", "compare_high"],
      ["compare_high", "match"],
      ["match", "end"],
    ]);
    await tap(cdp, "KeyF");
    await tap(cdp, "Enter");
    await waitFor(cdp, "input 7 finished again", (n) => n.status === "finished", 20000);
    await tap(cdp, "KeyF");
    await teleport(cdp, 1660, 1083);
    await sleep(500);
    await tap(cdp, "KeyI");
    await sleep(400);
    await shot(cdp, "10-inspector");
    await tap(cdp, "KeyI");

    // Debug overlay.
    await tap(cdp, "F1");
    await sleep(400);
    await shot(cdp, "11-debug");
    await tap(cdp, "F1");

    check("no console errors", cdp.errors.length === 0, cdp.errors.join(" | "));
  } finally {
    console.log(checks.join("\n"));
    if (cdp?.errors.length) console.log("console errors:\n" + cdp.errors.join("\n"));
    console.log(`screenshots: ${SHOTS}`);
    cdp?.close();
    browser.kill();
    rmSync(browser.profile, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`browser check failed: ${(error as Error).message}`);
  process.exitCode = 1;
});
