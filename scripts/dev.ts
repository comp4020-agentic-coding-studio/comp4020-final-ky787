/** One development command: the real API/WS server plus Vite, in one Node process. */
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createApp } from '../server/app.ts';

function port(value: string, name: string): number {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n > 65535) throw new Error(`${name} must be a port between 0 and 65535`);
    return n;
}

async function main() {
    const raw = process.argv.slice(2).filter(arg => arg !== '--');
    // Match Vite's useful bare --host shorthand without adding a CLI dependency.
    const args = raw.map((arg, i) => arg === '--host' && (!raw[i + 1] || raw[i + 1].startsWith('-')) ? '--host=0.0.0.0' : arg);
    const { values } = parseArgs({ args, options: {
        host: { type: 'string', default: 'localhost' }, port: { type: 'string', default: '5173' },
        strictPort: { type: 'boolean' }, open: { type: 'boolean' }, force: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
    } });
    if (values.help) {
        console.log('pnpm dev [--host [address]] [--port 5173] [--strictPort] [--open] [--force]\nStarts the API/WebSocket server too. DATA_DIR defaults to .local-data; DEV_API_PORT defaults to 8080.');
        return;
    }
    const apiPort = port(process.env.DEV_API_PORT ?? '8080', 'DEV_API_PORT');
    const frontendPort = port(values.port!, '--port');
    const api = await createApp(resolve(process.env.DATA_DIR ?? '.local-data'));
    let vite: ViteDevServer | undefined;
    let backendStarted = false;
    let apiClosing: Promise<void> | undefined;
    const closeApi = () => apiClosing ??= new Promise<void>(resolve => {
        api.emit('shutdown');
        api.close(() => resolve());
    });
    let closing: Promise<void> | undefined;
    const close = () => closing ??= (async () => {
        await Promise.all([closeApi(), vite?.close()]);
    })();
    try {
        await new Promise<void>((resolve, reject) => {
            api.once('error', reject);
            api.listen(apiPort, '127.0.0.1', () => { api.off('error', reject); resolve(); });
        });
        backendStarted = true;
        const backend = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
        vite = await createViteServer({
            plugins: [{ name: 'binary-ninja-dev-lifecycle',
                // Vite also handles SIGTERM/stdin end. Await the API before it exits,
                // but keep the backend alive during ordinary Vite config restarts.
                closeServer: ({ reason }) => reason === 'close' ? closeApi() : undefined,
            }],
            server: { host: values.host, port: frontendPort, strictPort: values.strictPort, open: values.open,
                // Keep the browser's Host so the API's same-origin write check still applies.
                proxy: { '/api': { target: backend, changeOrigin: false }, '/readme': { target: backend, changeOrigin: false },
                    '/ws': { target: backend.replace('http:', 'ws:'), ws: true, changeOrigin: false } } },
            optimizeDeps: { force: values.force },
        });
        await vite.listen();
        console.log(`Binary Ninja API + WebSocket ready: ${backend}`);
        vite.printUrls();
        console.log('Ctrl+C stops both servers. Local saves use DATA_DIR or .local-data.');
        for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => {
            process.exitCode ??= 0;
            void close().catch(error => { console.error(error); process.exitCode = 1; });
        });
    } catch (error) {
        await close();
        if (!backendStarted && (error as NodeJS.ErrnoException).code === 'EADDRINUSE')
            throw new Error(`Port ${apiPort} is already in use. Stop the existing backend, or use pnpm dev:client with it.`);
        throw error;
    }
}
main().catch(error => { console.error((error as Error).message); process.exitCode = 1; });
