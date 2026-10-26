import { expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { MUSIC_TRACKS, musicSceneForRoom } from '../src/audio/music-catalogue.ts';

// Human-approved recordings from 9e33207: a targeted revision must not remaster them.
const APPROVED = {
    menu: '94271d7fac43f54c4240c354b7415ee26b94bcbe93346aed83108a3cca73679e',
    'race-condition': '028f5d98da1a3d1f3d396abd66ac94bca37194316e85b90895a228c59b1073c1',
    deadlock: 'f31f389b69d48b9bbb386ccd40f8cbbae6075034ff5a8a04bdffc35621dd4648',
    'use-after-free': 'd6f35d5d59662380eaa5b6cb1a9cd594d519041b79bbf4165afa5b80ca07e3b9',
} as const;

it('retains the four approved recordings, gains and scene assignments exactly', async () => {
    for (const [scene, hash] of Object.entries(APPROVED)) {
        const selected = musicSceneForRoom(scene), track = MUSIC_TRACKS[selected];
        expect(selected).toBe(scene);
        expect(track.file).toBe(`${scene}.ogg`);
        expect(track.gain).toBe(scene === 'menu' ? 1.2 : 1);
        const bytes = await readFile(`public/audio/music/${track.file}`);
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash);
    }
});

it('preserves the original Celestial Harmony bytes and level only for RELAY and CONTROL SPINE', async () => {
    for (const room of ['relay', 'uplink']) {
        const track = MUSIC_TRACKS[musicSceneForRoom(room)];
        expect(track).toMatchObject({ file: 'tutorial-relay.ogg', gain: 1 });
        const bytes = await readFile(`public/audio/music/${track.file}`);
        expect(createHash('sha256').update(bytes).digest('hex')).toBe('06557728c1d6dfd813857807f1c6fd7fe6eedfbe0ff8b0bf6a91b5b444dd69ab');
    }
    for (const room of ['pressure', 'switch']) expect(musicSceneForRoom(room)).toBe('menu');
});

it('ships exactly the seven scene tracks with verified provenance, hashes and bounded encoded size', async () => {
    const catalogue = JSON.parse(await readFile('public/audio/music/catalogue.json', 'utf8'));
    expect(catalogue.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Set(catalogue.assets.map((a: {file: string}) => a.file))).toEqual(new Set(Object.values(MUSIC_TRACKS).map(t => t.file)));
    let total = 0;
    for (const asset of catalogue.assets) {
        const path = `public/audio/music/${asset.file}`, bytes = await readFile(path);
        expect(bytes.subarray(0, 4).toString()).toBe('OggS');
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);
        expect((await stat(path)).size).toBe(asset.bytes); total += asset.bytes;
        expect(asset.license).toBe('CC0-1.0'); expect(asset.licenseUrl).toBe('https://creativecommons.org/publicdomain/zero/1.0/');
        expect(asset.source).toMatch(/^https:\/\/opengameart.org\/content\//);
        expect(asset.download).toMatch(/^https:\/\/opengameart.org\/sites\/default\/files\//);
        expect(asset.sourceSha256).toMatch(/^[a-f0-9]{64}$/); expect(asset.author.length).toBeGreaterThan(2);
        expect(asset.processing.length).toBeGreaterThan(30); expect(asset.duration).toBeGreaterThanOrEqual(90);
        expect(asset.duration).toBeLessThanOrEqual(240); expect(asset.truePeakDbtp).toBeLessThan(-6);
        expect(asset.integratedLufs).toBeGreaterThan(-24); expect(asset.integratedLufs).toBeLessThan(-22);
        expect(asset.loopAnalysis.longestSilenceBelowMinus60DbSeconds).toBe(0);
    }
    expect(total).toBe(catalogue.totalBytes); expect(total).toBeLessThan(18_000_000);
});
