#!/usr/bin/env node
/** Real keyboard/mouse C8 playthrough against the Node-served production build.
 * No teleports, input injection, or controller overrides in the main route.
 * pnpm build; DATA_DIR=/tmp/bn-playtest pnpm start
 * pnpm check:browser [url] [screenshot-directory]
 */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const URL_BASE = process.argv[2] ?? "http://localhost:8080/";
const SHOTS = process.argv[3] ?? join(tmpdir(), "binary-ninja-shots");
const BROWSERS = ["chromium-browser", "chromium", "google-chrome", "google-chrome-stable"];
const PORT = 9334;
interface Cdp {
    send: (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    close: () => void;
    errors: string[];
}
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
async function launch(): Promise<{
    kill: () => void;
    profile: string;
}> {
    const profile = mkdtempSync(join(tmpdir(), "bn-"));
    for (const bin of BROWSERS) {
        try {
            const child = spawn(bin, [
                "--headless",
                "--disable-gpu",
                "--no-sandbox",
                "--no-first-run",
                `--remote-debugging-port=${PORT}`,
                `--user-data-dir=${profile}`,
                "--window-size=1600,900",
                "about:blank",
            ], { stdio: "ignore" });
            for (let i = 0; i < 60; i += 1) {
                await sleep(250);
                try {
                    const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
                    if (res.ok)
                        return { kill: () => child.kill(), profile };
                }
                catch {
                    /* not up yet */
                }
            }
            child.kill();
        }
        catch {
            /* try the next binary */
        }
    }
    throw new Error(`no usable browser found (tried ${BROWSERS.join(", ")})`);
}
async function connect(url: string): Promise<Cdp> {
    const created = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
    const target = (await created.json()) as {
        webSocketDebuggerUrl: string;
    };
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
            error?: {
                message: string;
            };
            params?: Record<string, unknown>;
        };
        if (message.id !== undefined) {
            pending.get(message.id)?.(message.error ? { error: message.error } : (message.result ?? {}));
            pending.delete(message.id);
            return;
        }
        if (message.method === "Runtime.exceptionThrown") {
            const details = message.params?.exceptionDetails as {
                text?: string;
                exception?: {
                    description?: string;
                };
            };
            errors.push(details?.exception?.description ?? details?.text ?? "uncaught exception");
        }
        if (message.method === "Runtime.consoleAPICalled") {
            const params = message.params as {
                type?: string;
                args?: {
                    value?: unknown;
                }[];
            };
            if (params.type === "error")
                errors.push(params.args?.map((a) => String(a.value)).join(" ") ?? "console error");
        }
    });
    const send: Cdp["send"] = (method, params = {}) => new Promise((resolve) => {
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
        result?: {
            value?: T;
        };
        exceptionDetails?: {
            text?: string;
            exception?: {
                description?: string;
            };
        };
        error?: {
            message: string;
        };
    };
    if (result.error)
        throw new Error(result.error.message);
    if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? "evaluate failed");
    }
    return result.result?.value as T;
}
const KEYS: Record<string, {
    key: string;
    vk: number;
}> = {
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
    room: string;
    player: {
        x: number;
        y: number;
        grounded: boolean;
        groundId: string | null;
        rope: {
            phase: string;
        };
        vx: number;
        vy: number;
    };
    cube: {
        x: number;
        y: number;
        carried: boolean;
    } | null;
    inputs: {
        plateA: boolean;
        cubeOnPlate: boolean;
        switchB: boolean;
    };
    outputs: {
        exitDoor: boolean;
        grappleAnchor: boolean;
        bridge: boolean;
    };
    source: string;
    checkpoint: string;
    deaths: number;
    pullingCube: boolean;
    ended: boolean;
    started: boolean;
    progress: {
        completedRooms: string[];
        currentRoom: string;
        mechanics: string[];
    };
    platforms: {
        id: string;
        enabled: boolean;
        grappleable: boolean;
        fuse: number;
        respawn: number;
    }[];
    persistence: {
        status: string;
        visitor: string;
        revision: number;
    };
}
const snap = (cdp: Cdp): Promise<Snap> => evaluate(cdp, 'binaryNinja.snapshot()');
async function waitFor(cdp: Cdp, what: string, predicate: (s: Snap) => boolean, timeoutMs = 10000): Promise<Snap> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        if (!await evaluate(cdp, '!!globalThis.binaryNinja')) {
            if (Date.now() > deadline)
                throw new Error('App did not initialize');
            await sleep(50);
            continue;
        }
        const s = await snap(cdp);
        if (predicate(s))
            return s;
        if (Date.now() > deadline)
            throw new Error(`Timed out: ${what}: ${JSON.stringify(s)}`);
        await sleep(25);
    }
}
async function walkTo(cdp: Cdp, x: number, hop = false): Promise<Snap> {
    const s = await snap(cdp), code = x > s.player.x ? 'KeyD' : 'KeyA';
    await key(cdp, 'keyDown', code);
    if (hop)
        await key(cdp, 'keyDown', 'Space');
    try {
        return await waitFor(cdp, `walk ${x}`, n => code === 'KeyD' ? n.player.x >= x : n.player.x <= x);
    }
    finally {
        await key(cdp, 'keyUp', code);
        if (hop)
            await key(cdp, 'keyUp', 'Space');
        await sleep(180);
    }
}
async function shot(cdp: Cdp, name: string): Promise<void> { const res = await cdp.send('Page.captureScreenshot', { format: 'png' }) as {
    data?: string;
}; if (res.data)
    writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(res.data, 'base64')); }
const checks: string[] = [];
function check(label: string, ok: boolean, detail = ''): void { checks.push(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ' — ' + detail : ''}`); if (!ok)
    throw new Error(label + ' ' + detail); }
async function click(cdp: Cdp, selector: string) { await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)}).click()`); await sleep(150); }
async function mouseAt(cdp: Cdp, x: number, y: number, type = 'mousePressed') {
    const at = await evaluate<{
        x: number;
        y: number;
    }>(cdp, `(()=>{const c=binaryNinja.renderer.camera,r=binaryNinja.canvas.getBoundingClientRect();return {x:(${x}-c.originX())*c.zoom+r.left,y:(${y}-c.originY())*c.zoom+r.top};})()`);
    await cdp.send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
}
async function cross(cdp: Cdp, anchorX: number) {
    const before = (await snap(cdp)).deaths;
    await key(cdp, 'keyDown', 'KeyD');
    await mouseAt(cdp, anchorX, 226);
    await waitFor(cdp, 'hook attachment', s => s.player.rope.phase === 'attached');
    await sleep(700);
    await shot(cdp, `swing-${(await snap(cdp)).room}`);
    await mouseAt(cdp, anchorX, 226, 'mouseReleased');
    await waitFor(cdp, 'far bank', s => s.player.x > 965 && s.player.grounded);
    await key(cdp, 'keyUp', 'KeyD');
    await sleep(150);
    const s = await snap(cdp);
    check(`${s.room} physical grapple crossing`, s.deaths === before && s.player.x > 920, `x=${Math.round(s.player.x)}`);
}
async function exitRoom(cdp: Cdp, next: string | undefined) {
    await key(cdp, 'keyDown', 'KeyD');
    try {
        await waitFor(cdp, 'room exit', s => next ? s.room === next : s.ended);
    }
    finally {
        await key(cdp, 'keyUp', 'KeyD');
        await sleep(150);
    }
}
async function main() {
    mkdirSync(SHOTS, { recursive: true });
    const browser = await launch();
    let cdp: Cdp | undefined;
    try {
        cdp = await connect(URL_BASE);
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
        await waitFor(cdp, 'save API', s => s.persistence.visitor !== '');
        await shot(cdp, 'start');
        check('new visitor starts at pressure', (await snap(cdp)).room === 'pressure');
        await click(cdp, '#continue');
        await walkTo(cdp, 280);
        await tap(cdp, 'KeyE');
        check('cube carried', (await snap(cdp)).cube?.carried === true);
        await walkTo(cdp, 560);
        await tap(cdp, 'KeyE');
        await waitFor(cdp, 'cube on plate', s => s.inputs.cubeOnPlate);
        await walkTo(cdp, 735);
        check('cube holds plate after player leaves', (await snap(cdp)).outputs.exitDoor);
        await shot(cdp, 'pressure');
        await exitRoom(cdp, 'switch');
        check('inactive anchor has no collision or hook', (await snap(cdp)).platforms.some(p => p.id === 'anchor' && !p.enabled && !p.grappleable));
        await walkTo(cdp, 275);
        await tap(cdp, 'KeyE');
        check('switch enables anchor immediately', (await snap(cdp)).outputs.grappleAnchor);
        await tap(cdp, 'KeyE');
        check('switch can be turned off', !(await snap(cdp)).outputs.grappleAnchor);
        await tap(cdp, 'KeyE');
        await shot(cdp, 'switch');
        await walkTo(cdp, 415);
        await key(cdp, 'keyDown', 'KeyD');
        await key(cdp, 'keyDown', 'Space');
        await waitFor(cdp, 'unjumpable pit respawn', s => s.deaths === 1);
        await key(cdp, 'keyUp', 'Space');
        await key(cdp, 'keyUp', 'KeyD');
        await sleep(150);
        check('pit respawns quickly without losing switch progress', (await snap(cdp)).outputs.grappleAnchor);
        await walkTo(cdp, 415);
        await cross(cdp, 770);
        await exitRoom(cdp, 'relay');
        // Cube grapple is a physical pull, not a swing anchor.
        await mouseAt(cdp, 260, 542);
        await sleep(260);
        let s = await snap(cdp);
        check('cube pulls toward player without attaching player', s.pullingCube && s.cube!.x < 240 && s.player.rope.phase !== 'attached');
        await mouseAt(cdp, 260, 542, 'mouseReleased');
        await tap(cdp, 'KeyE');
        check('pulled cube can be carried', (await snap(cdp)).cube?.carried === true);
        await walkTo(cdp, 325);
        await tap(cdp, 'KeyE');
        await waitFor(cdp, 'relay plate', s => s.inputs.cubeOnPlate);
        await walkTo(cdp, 430);
        await cross(cdp, 780);
        await walkTo(cdp, 1050);
        await tap(cdp, 'KeyE');
        s = await snap(cdp);
        check('Switch B restores bridge and sets checkpoint', s.outputs.bridge && s.checkpoint === 'relay');
        // Walk the bridge back: future second-player route is actually traversable.
        await walkTo(cdp, 850);
        check('return bridge supports player', (await snap(cdp)).player.groundId === 'bridge');
        await walkTo(cdp, 1080);
        await tap(cdp, 'KeyR');
        check('checkpoint reset keeps solved machinery', (await snap(cdp)).outputs.bridge);
        await waitFor(cdp, 'server save', s => s.persistence.status === 'Saved on server');
        const visitor = (await snap(cdp)).persistence.visitor;
        await cdp.send('Page.reload');
        await sleep(600);
        await waitFor(cdp, 'returning save', s => s.persistence.visitor === visitor);
        check('reload offers CONTINUE — RELAY', await evaluate(cdp, "document.querySelector('#continue').textContent.includes('CONTINUE — RELAY')"));
        s = await snap(cdp);
        check('reload restores checkpoint, plate and bridge', s.checkpoint === 'relay' && s.inputs.cubeOnPlate && s.outputs.bridge && s.player.x === 1050);
        await shot(cdp, 'continue-relay');
        await click(cdp, '#continue');
        await walkTo(cdp, 1125);
        await walkTo(cdp, 1240, true);
        await waitFor(cdp, 'step a landing', s => s.player.groundId === 'step-a');
        // Tempting lower platform crumbles into the recovery floor, not a death pit.
        await walkTo(cdp, 1380);
        await waitFor(cdp, 'crumble armed', s => s.platforms.some(p => p.id === 'crumble' && p.fuse > 0));
        await shot(cdp, 'crumble-warning');
        await waitFor(cdp, 'safe recovery', s => s.player.groundId === 'recovery');
        check('crumble does not kill player', (await snap(cdp)).deaths === 0);
        await walkTo(cdp, 1315);
        await walkTo(cdp, 1250, true);
        await waitFor(cdp, 'recovery step', s => s.player.groundId === 'recovery-step');
        await tap(cdp, 'Space');
        await waitFor(cdp, 'back on step a', s => s.player.groundId === 'step-a');
        await walkTo(cdp, 1310);
        await walkTo(cdp, 1490, true);
        await waitFor(cdp, 'step b landing', s => s.player.groundId === 'step-b');
        await walkTo(cdp, 1560);
        await walkTo(cdp, 1720, true);
        await waitFor(cdp, 'exit shelf landing', s => s.player.groundId === 'exit-shelf');
        await shot(cdp, 'relay');
        await tap(cdp, 'F1');
        check('debug exposes mock inputs and persistence', await evaluate(cdp, "!document.querySelector('#debug').hidden && document.querySelector('#debug pre').textContent.includes('mock-greybox')"));
        await shot(cdp, 'debug');
        await tap(cdp, 'F1');
        await exitRoom(cdp, undefined);
        await waitFor(cdp, 'final save', s => s.persistence.status === 'Saved on server');
        check('three-room completion saved', (await snap(cdp)).progress.completedRooms.length === 3);
        await shot(cdp, 'end');
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 960, height: 640, deviceScaleFactor: 1, mobile: false });
        await sleep(300);
        await shot(cdp, 'compact-menu');
        check('no console errors', cdp.errors.length === 0, cdp.errors.join(' | '));
    }
    finally {
        console.log(checks.join('\n'));
        if (cdp)
            await shot(cdp, 'last-state');
        console.log(`screenshots: ${SHOTS}`);
        cdp?.close();
        browser.kill();
        rmSync(browser.profile, { recursive: true, force: true });
    }
}
main().catch(error => { console.error(`browser check failed: ${(error as Error).message}`); process.exitCode = 1; });
