import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function visitorCookie(req: IncomingMessage): string | null {
    const value = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('bn_visitor='))?.slice(11);
    return value && UUID.test(value) ? value : null;
}
export function ensureVisitor(req: IncomingMessage, res: ServerResponse): string {
    const existing = visitorCookie(req);
    const id = existing ?? randomUUID();
    if (!existing) res.setHeader('Set-Cookie', `bn_visitor=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`);
    return id;
}
export function sameOrigin(req: IncomingMessage): boolean {
    try { return !req.headers.origin || new URL(req.headers.origin).host === req.headers.host; }
    catch { return false; }
}
