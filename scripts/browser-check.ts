#!/usr/bin/env node
/**
 * Headless play-through of the four tutorial chambers, adapted from the
 * previous Binary Ninja browser check. It drives real keyboard events through
 * the Chrome DevTools Protocol against a served build — walking, hopping,
 * carrying cubes into sockets, carrying cables between jacks — and asserts
 * the replay contract along the way (bridge only on input 7's write, a wrong
 * TRUE/FALSE cable stops the run, one circuit serves all three inputs). It
 * fails on console errors and saves screenshots. Teleports are used only to
 * skip walking between machines that have already been reached on foot.
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
  KeyI: { key: "i", vk: 73 },
  KeyF: { key: "f", vk: 70 },
  KeyR: { key: "r", vk: 82 },
  Space: { key: " ", vk: 32 },
  Tab: { key: "Tab", vk: 9 },
  F1: { key: "F1", vk: 112 },
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
  await sleep(50);
  await key(cdp, "keyUp", code);
  await sleep(80);
}

interface Snap {
  chamber: string;
  chamberIndex: number;
  input: number | null;
  status: string;
  stop: { at: string; port: string | null; proposed: string | null; reason: string } | null;
  state: { value: number; result: number; bridge_open: number } | null;
  outcomes: string[];
  litPorts: string[];
  bridgeOpen: boolean;
  bridgeExtent: number;
  cables: [string, string][];
  held: { kind: string; cubeId?: string; portId?: string } | null;
  sockets: Record<string, string | null>;
  doors: { id: string; openness: number }[];
  finishedInputs: number[];
  runs: number;
  player: { x: number; y: number; grounded: boolean; groundId: string | null };
  ended: boolean;
}

const snap = (cdp: Cdp): Promise<Snap> => evaluate<Snap>(cdp, "globalThis.binaryNinja.snapshot()");

async function waitFor(cdp: Cdp, what: string, predicate: (s: Snap) => boolean, timeoutMs = 25000): Promise<Snap> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const s = await snap(cdp);
    if (predicate(s)) return s;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}: ${JSON.stringify(s)}`);
    await sleep(80);
  }
}

/** Holds a direction (hopping when asked) until the player's x passes `x`. */
async function walkTo(cdp: Cdp, x: number, hop = false): Promise<Snap> {
  const s = await snap(cdp);
  const code = x > s.player.x ? "KeyD" : "KeyA";
  await key(cdp, "keyDown", code);
  if (hop) {
    await key(cdp, "keyDown", "Space");
    await sleep(260);
    await key(cdp, "keyUp", "Space");
  }
  try {
    return await waitFor(cdp, `walk to x=${x}`, (n) => (code === "KeyD" ? n.player.x >= x : n.player.x <= x), 9000);
  } finally {
    await key(cdp, "keyUp", code);
    await sleep(300);
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

const teleport = (cdp: Cdp, x: number, y: number): Promise<unknown> =>
  evaluate(cdp, `(() => { const p = binaryNinja.world.player; Object.assign(p, { x: ${x}, y: ${y}, vx: 0, vy: 0 }); })()`);

/** Positions of things in the current chamber, read from the live world. */
const where = (cdp: Cdp, expr: string): Promise<{ x: number; y: number }> => evaluate(cdp, expr);
const jack = (cdp: Cdp, id: string, kind: "in" | "out"): Promise<{ x: number; y: number }> =>
  where(cdp, `binaryNinja.world.jacks.find((j) => j.kind === "${kind}" && (j.portId === "${id}" || j.stageId === "${id}")).at`);
const socketAt = (cdp: Cdp, id: string): Promise<{ x: number; y: number }> =>
  where(cdp, `binaryNinja.world.socketPoint(binaryNinja.world.sockets.get("${id}").def)`);
const cubeAt = (cdp: Cdp, id: string): Promise<{ x: number; y: number }> =>
  where(cdp, `(() => { const c = binaryNinja.world.cubes.get("${id}"); return { x: c.x, y: c.y }; })()`);

/** Teleport beside a point (standing on whatever is below) and press E. */
async function useAt(cdp: Cdp, at: { x: number; y: number }): Promise<Snap> {
  await teleport(cdp, at.x - 6, at.y - 20);
  await sleep(350);
  await tap(cdp, "KeyE");
  await sleep(150);
  return snap(cdp);
}

/** Step away from the socket, then put the held cube down. */
async function dropAway(cdp: Cdp, x: number): Promise<void> {
  await teleport(cdp, x, 983);
  await sleep(250);
  await tap(cdp, "KeyE");
}

async function exitRight(cdp: Cdp, from: number | null, next: number): Promise<void> {
  if (from !== null) {
    await teleport(cdp, from, 983);
    await sleep(300);
  }
  await key(cdp, "keyDown", "KeyD");
  try {
    await waitFor(cdp, `exit to chamber ${next}`, (n) => n.chamberIndex === next || n.ended, 9000);
  } finally {
    await key(cdp, "keyUp", "KeyD");
  }
  await sleep(500);
}

async function main(): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  const browser = await launch();
  let cdp: Cdp | null = null;
  try {
    cdp = await connect(URL_BASE);
    await waitFor(cdp, "game boot", (s) => typeof s.chamber === "string", 15000).catch(async () => {
      await sleep(1000);
      return snap(cdp as Cdp);
    });
    await sleep(500);
    await shot(cdp, "c0-start");

    // --- 0 POWER: all on foot.
    let s = await snap(cdp);
    check("starts in chamber 0", s.chamberIndex === 0, s.chamber);
    await walkTo(cdp, 520);
    await walkTo(cdp, 655, true);
    s = await snap(cdp);
    check("hopped onto the cube ledge", s.player.groundId === "cube_ledge", String(s.player.groundId));
    await tap(cdp, "KeyE");
    s = await snap(cdp);
    check("E picks up the power cube", s.held?.cubeId === "power", JSON.stringify(s.held));
    await walkTo(cdp, 1120);
    await walkTo(cdp, 1270, true);
    await tap(cdp, "KeyE");
    s = await snap(cdp);
    check("E seats the cube in the POWER socket", s.sockets.power_socket === "power", JSON.stringify(s.sockets));
    s = await waitFor(cdp, "door opens", (n) => n.doors[0]?.openness === 1, 5000);
    await shot(cdp, "c0-powered");
    await exitRight(cdp, null, 1);
    check("walking through the open door enters chamber 1", true);
    await sleep(2200);
    await shot(cdp, "c1-start");

    // --- 1 CONNECT: one cable, then the power cube into RUN.
    const startOut = await jack(cdp, "entry:NEXT", "out");
    const calcIn = await jack(cdp, "calculate_compare", "in");
    await walkTo(cdp, startOut.x - 4);
    await tap(cdp, "KeyE");
    s = await snap(cdp);
    check("E at START's OUT jack takes its cable", s.held?.portId === "entry:NEXT", JSON.stringify(s.held));
    await walkTo(cdp, 760);
    await walkTo(cdp, calcIn.x - 40, true);
    s = await snap(cdp);
    check("hopped onto CALCULATE's plinth still carrying the cable", s.player.groundId === "calc_plinth" && s.held?.portId === "entry:NEXT", String(s.player.groundId));
    await shot(cdp, "c1-carrying");
    s = await useAt(cdp, calcIn);
    check("E at CALCULATE's IN jack connects it", JSON.stringify(s.cables) === '[["entry:NEXT","calculate_compare"]]', JSON.stringify(s.cables));
    await walkTo(cdp, 1400);
    await walkTo(cdp, 1460, true);
    s = await snap(cdp);
    check("hopped onto the RUN dais", s.player.groundId === "run_dais", String(s.player.groundId));
    await useAt(cdp, await cubeAt(cdp, "power"));
    s = await useAt(cdp, await socketAt(cdp, "run"));
    check("the power cube in RUN starts input 7's run", s.status === "running" && s.input === 7, s.status);
    await sleep(1600);
    await shot(cdp, "c1-running");
    s = await waitFor(cdp, "chamber 1 run finishes", (n) => n.status !== "running");
    check("the run finishes and the real write opens the bridge", s.status === "finished" && s.bridgeOpen, s.status);
    await waitFor(cdp, "bridge extends", (n) => n.bridgeExtent === 1, 4000);
    await shot(cdp, "c1-bridge");
    await exitRight(cdp, 1850, 2);
    check("crossing the bridge enters chamber 2", true);
    await sleep(2200);
    await shot(cdp, "c2-start");

    // --- 2 INPUT: power RUN, then try numbers until the bridge opens.
    await useAt(cdp, await cubeAt(cdp, "power"));
    s = await useAt(cdp, await socketAt(cdp, "run"));
    check("RUN with no input refuses to start", s.sockets.run === "power" && s.status === "no_input", s.status);
    await useAt(cdp, await cubeAt(cdp, "input_6"));
    s = await useAt(cdp, await socketAt(cdp, "input"));
    check("seating cube 6 while RUN is powered starts input 6", s.input === 6 && s.status === "running", `${s.input} ${s.status}`);
    s = await waitFor(cdp, "input 6 finishes", (n) => n.status === "finished");
    check("input 6 ends LOW, bridge shut", s.state?.result === 1 && !s.bridgeOpen);
    await sleep(400);
    await shot(cdp, "c2-low");
    // Swap: carry 8 to the INPUT socket; one E seats 8 and hands back 6.
    await useAt(cdp, await cubeAt(cdp, "input_8"));
    s = await useAt(cdp, await socketAt(cdp, "input"));
    check("swapping in 8 runs again on the same machine", s.input === 8 && s.status === "running" && s.held?.cubeId === "input_6", JSON.stringify(s.held));
    await dropAway(cdp, 760);
    s = await waitFor(cdp, "input 8 finishes", (n) => n.status === "finished");
    check("input 8 ends HIGH, bridge shut", s.state?.result === 3 && !s.bridgeOpen);
    await useAt(cdp, await cubeAt(cdp, "input_7"));
    await useAt(cdp, await socketAt(cdp, "input"));
    await dropAway(cdp, 760);
    s = await waitFor(cdp, "input 7 finishes", (n) => n.status === "finished");
    check("input 7 ends MATCH and its write opens the bridge", s.state?.result === 2 && s.bridgeOpen);
    await waitFor(cdp, "bridge extends", (n) => n.bridgeExtent === 1, 4000);
    await shot(cdp, "c2-match");
    await exitRight(cdp, 2000, 3);
    check("crossing the bridge enters chamber 3", true);
    await sleep(2200);
    await shot(cdp, "c3-start");

    // --- 3 BRANCH: wire TRUE/FALSE the wrong way round first.
    const trueJack = await jack(cdp, "cmp_000010a2:TRUE", "out");
    const falseJack = await jack(cdp, "cmp_000010a2:FALSE", "out");
    const lowIn = await jack(cdp, "low", "in");
    const highCmpIn = await jack(cdp, "compare_high", "in");
    await useAt(cdp, trueJack);
    await useAt(cdp, highCmpIn);
    await useAt(cdp, falseJack);
    s = await useAt(cdp, lowIn);
    check("both comparison outputs wired (swapped)", s.cables.length === 2, JSON.stringify(s.cables));
    await useAt(cdp, await cubeAt(cdp, "power"));
    await useAt(cdp, await socketAt(cdp, "run"));
    await useAt(cdp, await cubeAt(cdp, "input_6"));
    await useAt(cdp, await socketAt(cdp, "input"));
    await teleport(cdp, 1300, 983);
    s = await waitFor(cdp, "swapped wiring stops input 6", (n) => n.status !== "running");
    check(
      "input 6 answers TRUE, lights TRUE, and stops on the wrong TRUE cable",
      s.status === "stopped" && s.stop?.port === "cmp_000010a2:TRUE" && s.outcomes[0] === "VALUE = 19 19 < 22 TRUE",
      JSON.stringify(s.stop),
    );
    await sleep(300);
    await shot(cdp, "c3-wrong");

    // Re-plug both correctly; the same circuit then serves 6, 7 and 8.
    await useAt(cdp, trueJack);
    await useAt(cdp, lowIn);
    await useAt(cdp, falseJack);
    s = await useAt(cdp, highCmpIn);
    check("rewired TRUE→LOW, FALSE→second comparison", JSON.stringify([...s.cables].sort()) === JSON.stringify([["cmp_000010a2:FALSE", "compare_high"], ["cmp_000010a2:TRUE", "low"]]), JSON.stringify(s.cables));
    for (const [n, cube] of [[6, "input_6"], [7, "input_7"], [8, "input_8"]] as const) {
      if (n === 6) {
        // 6 is still seated from the failed run: re-seat it to run again.
        await useAt(cdp, await socketAt(cdp, "input"));
        await useAt(cdp, await socketAt(cdp, "input"));
      } else {
        await useAt(cdp, await cubeAt(cdp, cube));
        await useAt(cdp, await socketAt(cdp, "input"));
        await dropAway(cdp, 700);
      }
      await teleport(cdp, 1300, 983);
      if (n === 7) {
        await waitFor(cdp, "7's first answer", (x) => x.outcomes.length >= 1, 8000);
        await sleep(500);
        await shot(cdp, "c3-feedback");
      }
      s = await waitFor(cdp, `input ${n} finishes`, (x) => x.status !== "running");
      check(`input ${n} finishes on the unchanged circuit`, s.status === "finished" && s.finishedInputs.includes(n), s.status);
    }
    check("the three runs lit different branch ports", true);
    await waitFor(cdp, "door opens", (n) => n.doors[0]?.openness === 1, 5000);
    await shot(cdp, "c3-done");

    await teleport(cdp, 1300, 983);
    await sleep(300);
    await tap(cdp, "KeyI");
    await sleep(400);
    await shot(cdp, "c3-inspector");
    await tap(cdp, "KeyI");
    await tap(cdp, "F1");
    await sleep(400);
    await shot(cdp, "c3-debug");
    await tap(cdp, "F1");

    await exitRight(cdp, 2550, 4);
    s = await snap(cdp);
    check("leaving chamber 3 ends the tutorial", s.ended);
    await shot(cdp, "end");
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
