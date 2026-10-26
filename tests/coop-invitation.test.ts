import { JSDOM } from 'jsdom';
import { afterEach, expect, it, vi } from 'vitest';
import { bindPartyInvitation, consumedInvitationUrl, invitationUrl, parseJoinInput, readInvitation } from '../src/coop/invitation.ts';
import { CoopClient } from '../src/coop/client.ts';
import { partyMenu } from '../src/coop/party-menu.ts';
import { newParty } from '../server/party-state.ts';
import { sharedRoom } from '../server/coop-state.ts';
import type { ClientMessage, ServerMessage } from '../src/coop/protocol.ts';

const origin = 'https://ninja.example';
const host = '11111111-1111-4111-8111-111111111111';
const room = (code = 'ABCD') => sharedRoom(newParty(code, host), [true, true], [null, null]);

it('builds canonical root invitation URLs without propagating developer options', () => {
    expect(invitationUrl(' 7k3m ', `${origin}/?debug=1&labs=1`)).toBe(`${origin}/?join=7K3M`);
    expect(invitationUrl('ABCD', 'http://localhost:3000')).toBe('http://localhost:3000/?join=ABCD');
    expect(() => invitationUrl('<bad>', origin)).toThrow('Invalid party code');
});

it('distinguishes missing, invalid and duplicate invitations so remembered rooms cannot take priority', () => {
    expect(readInvitation(`${origin}/?debug=1`)).toEqual({ present: false, code: null });
    expect(readInvitation(`${origin}/?join=abcd&labs=1`)).toEqual({ present: true, code: 'ABCD' });
    for (const query of ['join=', 'join=AAAAA', 'join=IIII', 'join=ABCD&join=EFGH', 'join=%3Cscript%3E'])
        expect(readInvitation(`${origin}/?${query}`)).toEqual({ present: true, code: null });
});

it('accepts a manual code or an exact first-party invitation format without navigating pasted URLs', () => {
    expect(parseJoinInput(' abcd ', origin)).toBe('ABCD');
    expect(parseJoinInput(`${origin}/?join=7K3M`, origin)).toBe('7K3M');
    for (const input of [
        'https://other.example/?join=ABCD', `${origin}.other.example/?join=ABCD`,
        `${origin}/workbench.html?join=ABCD`, `${origin}/?join=ABCD&debug=1`,
        `${origin}/?join=ABCD&join=ABCD`, `${origin}/?join=ABCD#route`,
        'https://user:pass@ninja.example/?join=ABCD', 'http://ninja.example/?join=ABCD',
        '/?join=ABCD', 'javascript:alert(1)', 'AB01',
    ]) expect(parseJoinInput(input, origin)).toBeNull();
});

it('consumes only an accepted matching invitation, preserving debug, labs and unrelated URL state', () => {
    const href = `${origin}/?debug=1&join=ABCD&labs=1#view`;
    expect(consumedInvitationUrl(href, 'EFGH')).toBeNull();
    expect(consumedInvitationUrl(href, '')).toBeNull();
    expect(consumedInvitationUrl(href, 'abcd')).toBe(`${origin}/?debug=1&labs=1#view`);
    expect(consumedInvitationUrl(`${origin}/?join=ABCD&join=EFGH`, 'ABCD')).toBeNull();
});

it('reports clipboard success only after copying and exposes a selected link when copying fails', async () => {
    const doc = new JSDOM(partyMenu(room(), 1, true, 'lobby')).window.document;
    const root = doc.body, button = root.querySelector<HTMLButtonElement>('#party-copy')!;
    let resolveCopy!: () => void;
    const writeText = vi.fn(() => new Promise<void>(resolve => { resolveCopy = resolve; }));
    bindPartyInvitation(root, 'ABCD', origin, { writeText });
    button.click();
    expect(button.textContent).toBe('COPY LINK');
    expect(button.disabled).toBe(true);
    expect(root.querySelector('#party-copy-status')!.textContent).toBe('');
    expect(writeText).toHaveBeenCalledWith(`${origin}/?join=ABCD`);
    resolveCopy(); await Promise.resolve();
    expect(button.textContent).toBe('LINK COPIED'); expect(button.disabled).toBe(false);
    writeText.mockImplementationOnce(() => Promise.reject(new Error('Permission denied')));
    button.click(); await Promise.resolve();
    const field = root.querySelector<HTMLInputElement>('#party-invite-link')!;
    expect(root.querySelector<HTMLElement>('#party-invite-fallback')!.hidden).toBe(false);
    expect(field.value).toBe(`${origin}/?join=ABCD`);
    expect(doc.activeElement).toBe(field);
    expect(field.selectionStart).toBe(0); expect(field.selectionEnd).toBe(field.value.length);
    expect(root.querySelector('#party-copy-status')!.textContent).toContain('Clipboard unavailable');
    writeText.mockImplementationOnce(async () => {});
    root.querySelector<HTMLButtonElement>('#party-copy-code')!.click(); await Promise.resolve();
    expect(writeText).toHaveBeenLastCalledWith('ABCD');
});

class Socket {
    static OPEN = 1;
    static instances: Socket[] = [];
    readyState = 1; bufferedAmount = 0; sent: ClientMessage[] = [];
    onopen = () => {}; onclose = () => {}; onerror = () => {};
    onmessage = (_: { data: string }) => {};
    constructor() { Socket.instances.push(this); }
    send(text: string) { this.sent.push(JSON.parse(text)); }
    close() { this.readyState = 3; }
    receive(message: ServerMessage) { this.onmessage({ data: JSON.stringify(message) }); }
}
const clients: CoopClient[] = [];
afterEach(() => { clients.splice(0).forEach(client => client.leave()); vi.useRealTimers(); vi.unstubAllGlobals(); });
function clientWithMemory(code = 'EFGH') {
    Socket.instances = [];
    const storage = new Map<string, string>([['bn_coop_room', code]]);
    vi.stubGlobal('sessionStorage', { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
    vi.stubGlobal('WebSocket', Socket);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ id: host }) })));
    vi.stubGlobal('location', { href: `${origin}/?join=ABCD` });
    const client = new CoopClient(() => {}, () => {}); clients.push(client);
    return { client, storage };
}

it('an explicit invitation overrides remembered code, sends one join and remembers only the accepted snapshot', async () => {
    const { client, storage } = clientWithMemory();
    expect(client.remembered()).toBe('EFGH');
    expect(client.startInvitation('ABCD')).toBe('started');
    expect(client.startInvitation('abcd')).toBe('active');
    await vi.waitFor(() => expect(Socket.instances).toHaveLength(1));
    const ws = Socket.instances[0]; ws.onopen();
    expect(ws.sent).toEqual([{ type: 'join', code: 'ABCD' }]);
    expect(storage.get('bn_coop_room')).toBe('EFGH');
    ws.receive({ type: 'snapshot', room: room(), slot: 2 });
    expect(storage.get('bn_coop_room')).toBe('ABCD');
    expect(client.slot).toBe(2); expect(client.room?.party?.phase).toBe('lobby');
    expect(client.startInvitation('ABCD')).toBe('active');
    expect(Socket.instances).toHaveLength(1);
});

it('a different active party and a pending host connection cannot be silently abandoned by an invitation', async () => {
    const { client } = clientWithMemory();
    client.start();
    expect(client.startInvitation('ABCD')).toBe('conflict');
    await vi.waitFor(() => expect(Socket.instances).toHaveLength(1));
    const ws = Socket.instances[0]; ws.onopen();
    expect(ws.sent).toEqual([{ type: 'create-party' }]);
    ws.receive({ type: 'snapshot', room: room('EFGH'), slot: 1 });
    expect(client.startInvitation('ABCD')).toBe('conflict');
    expect(client.startInvitation('bad')).toBe('invalid');
    client.start('bad');
    expect(client.connected).toBe(true); expect(client.room?.code).toBe('EFGH');
    expect(ws.sent.some(message => message.type === 'leave')).toBe(false);
});

it('reconnect keeps the accepted invitation code and assignment without creating another room', async () => {
    const { client } = clientWithMemory();
    client.startInvitation('ABCD'); await vi.waitFor(() => expect(Socket.instances).toHaveLength(1));
    const ws = Socket.instances[0]; ws.onopen(); ws.receive({ type: 'snapshot', room: room(), slot: 2 });
    vi.useFakeTimers(); ws.close(); ws.onclose();
    expect(client.startInvitation('ABCD')).toBe('active');
    await vi.advanceTimersByTimeAsync(500);
    expect(Socket.instances).toHaveLength(2);
    const next = Socket.instances[1]; next.onopen();
    expect(next.sent).toEqual([{ type: 'join', code: 'ABCD' }]);
    next.receive({ type: 'snapshot', room: room(), slot: 2 });
    expect(client.connected).toBe(true); expect(client.slot).toBe(2);
});

it.each([
    ['ROOM_FULL', 'already has two players'], ['ROOM_NOT_FOUND', 'Party not found'], ['ROOM_EXPIRED', 'expired'],
])('failed invitation %s retains retry intent outside the connection and never creates a party', async (code, text) => {
    const { client, storage } = clientWithMemory();
    client.startInvitation('ABCD'); await vi.waitFor(() => expect(Socket.instances).toHaveLength(1));
    const ws = Socket.instances[0]; ws.onopen(); ws.receive({ type: 'error', code, message: code });
    expect(client.active).toBe(false); expect(client.status).toContain(text);
    expect(storage.get('bn_coop_room')).toBe('EFGH');
    expect(client.startInvitation('ABCD')).toBe('started');
    await vi.waitFor(() => expect(Socket.instances).toHaveLength(2)); Socket.instances[1].onopen();
    expect(Socket.instances[1].sent).toEqual([{ type: 'join', code: 'ABCD' }]);
});
