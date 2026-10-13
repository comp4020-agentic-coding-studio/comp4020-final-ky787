import { parseArgs } from 'node:util';
import { startWorkbench } from './service.ts';
const { values } = parseArgs({ options: { port: { type: 'string', default: '4174' }, help: { type: 'boolean' } } });
if (values.help) console.log('pnpm workbench [--port 4174]\nLoopback editor; canonical drafts: levels/drafts; recovery/session data: .workbench');
else {
    const port = Number(values.port);
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('--port must be 0..65535');
    const app = await startWorkbench({ port });
    console.log(`Binary Ninja Level Workbench: ${app.origin}/`);
    console.log(`Draft files: ${app.storage.root}\nRecovery, sessions and reports: ${app.dataDir}`);
    for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app.close().catch(error => { console.error(error); process.exitCode = 1; }); });
}
