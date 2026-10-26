import { expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { MUSIC_TRACKS } from '../src/audio/music-catalogue.ts';

it('ships exactly the six scene tracks with verified provenance, hashes and bounded encoded size', async () => {
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
