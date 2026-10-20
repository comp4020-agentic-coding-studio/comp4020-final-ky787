/** Consume complete NDJSON lines: stdout chunks need not align with log records. */
export function serverStarted(onPort: (port: number) => void): (chunk: unknown) => void {
    let pending = '', done = false;
    return chunk => {
        if (done) return;
        pending += String(chunk);
        let end: number;
        while ((end = pending.indexOf('\n')) >= 0) {
            const line = pending.slice(0, end); pending = pending.slice(end + 1);
            try {
                const value = JSON.parse(line);
                if (value.event === 'server_started' && Number.isInteger(value.port) && value.port > 0 && value.port <= 65535) {
                    done = true; onPort(value.port); return;
                }
            } catch { /* Other development output is not a readiness signal. */ }
        }
        if (pending.length > 65536) pending = '';
    };
}
