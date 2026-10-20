import { afterEach, expect, it, vi } from 'vitest';
import { CharacterProfileClient } from '../src/character/client.ts';

const cyan = { name: 'ShadowByte', colour: 'cyan' } as const;
const purple = { name: 'ZeroDay', colour: 'purple' } as const;
const response = (profile: unknown, revision: number) => ({ ok: true, status: 200, json: async () => ({ profile, revision }) });
afterEach(() => vi.unstubAllGlobals());

it('distinguishes first-time visitors from restored persistent profiles', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(null, 0)).mockResolvedValueOnce(response(purple, 3));
    vi.stubGlobal('fetch', fetch);
    const client = new CharacterProfileClient();
    expect(await client.load()).toBeNull();
    expect(client.ready).toBe(true);
    expect(client.persisted).toBe(false);
    expect(await client.load()).toEqual(purple);
    expect(client.revision).toBe(3);
    expect(client.persisted).toBe(true);
    expect(fetch.mock.calls.every(call => call[0] === '/api/profile')).toBe(true);
});

it('stores only a validated profile and the server revision, separately from game progress', async () => {
    const fetch = vi.fn().mockResolvedValue(response(cyan, 5));
    vi.stubGlobal('fetch', fetch);
    const client = new CharacterProfileClient();
    client.ready = true; client.revision = 4;
    expect(await client.save({ ...cyan, name: ' ShadowByte ' })).toEqual(cyan);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ profile: cyan, revision: 4 });
    expect(client.profile).toEqual(cyan);
    expect(client.persisted).toBe(true);
    expect(client.revision).toBe(5);
});

it('keeps an explicitly unsaved guest local, and retries loading a revision before saving', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce(response(null, 0)).mockResolvedValueOnce(response(purple, 1));
    vi.stubGlobal('fetch', fetch);
    const client = new CharacterProfileClient();
    await expect(client.load()).rejects.toThrow('unavailable');
    client.useGuest(purple);
    expect(client.profile).toEqual(purple);
    expect(client.persisted).toBe(false);
    expect(client.ready).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await client.save(purple)).toEqual(purple);
    expect(client.persisted).toBe(true);
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ profile: purple, revision: 0 });
});

it('reports another-tab conflicts without automatically overwriting its version', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({
        ok: false, status: 409, json: async () => ({ error: 'conflict', record: { profile: purple, revision: 2 } }),
    }).mockResolvedValueOnce(response(cyan, 3));
    vi.stubGlobal('fetch', fetch);
    const client = new CharacterProfileClient();
    client.ready = true; client.profile = cyan; client.revision = 1; client.persisted = true;
    await expect(client.save(cyan)).rejects.toThrow('another tab');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(client.profile).toEqual(purple);
    expect(client.revision).toBe(2);
    // An explicit second save acknowledges the visible conflict.
    await client.save(cyan);
    expect(JSON.parse(fetch.mock.calls[1][1].body).revision).toBe(2);
});

it('never claims a failed update or malformed response was saved', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce(response({ name: '<script>', colour: 'cyan' }, 2));
    vi.stubGlobal('fetch', fetch);
    const client = new CharacterProfileClient();
    client.ready = true; client.profile = cyan; client.persisted = true; client.revision = 1;
    await expect(client.save(purple)).rejects.toThrow('could not be saved');
    expect(client.profile).toEqual(cyan);
    expect(client.revision).toBe(1);
    await expect(client.load()).rejects.toThrow('unavailable');
    expect(client.profile).toEqual(cyan);
    expect(client.ready).toBe(false);
});

it('rejects invalid input before contacting the profile API', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const client = new CharacterProfileClient();
    await expect(client.save({ name: '<img onerror=x>', colour: 'cyan' })).rejects.toThrow('valid operative name');
    expect(fetch).not.toHaveBeenCalled();
});
