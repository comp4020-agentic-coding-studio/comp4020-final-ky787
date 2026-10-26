import { expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { SOUNDS } from '../src/audio/game-audio.ts';
import { AudioPresentation } from '../src/slice/audio-presentation.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { roomById } from '../src/slice/rooms.ts';
import { freshProgress } from '../src/slice/progress.ts';
import { FIXED_DT, PLAYER } from '../src/engine/constants.ts';
import { emptyInput } from '../src/engine/physics.ts';

function fall(height: number, ontoPlate = false) {
    const room = roomById(ontoPlate ? 'pressure' : 'switch');
    const world = new PuzzleWorld(room, freshProgress().rooms[room.id]);
    Object.assign(world.player, { x: ontoPlate ? room.plate!.x : 130, y: 560 - PLAYER.height / 2 - height, vy: 0, grounded: false, groundId: null });
    const audio = { play: vi.fn(), setLoop: vi.fn(), stopAll: vi.fn() }, sound = new AudioPresentation(audio);
    sound.reset(world);
    for (let frame = 0; frame < 300; frame++) {
        world.step(FIXED_DT, emptyInput()); sound.observe(world, world.events.splice(0));
        if (world.player.justLanded) return { world, audio, sound };
    }
    throw new Error('Physical test fall did not land');
}

it('retains velocity-responsive landing intensity for gentle, normal and large falls', () => {
    const levels: number[] = [];
    for (const height of [6, 35, 150, 400]) {
        const { world, audio, sound } = fall(height);
        const landings = audio.play.mock.calls.filter(([cue]) => cue === 'landing');
        expect(landings).toHaveLength(1);
        const level = landings[0][1]; levels.push(level);
        expect(level).toBeCloseTo(Math.min(1, world.player.landingSpeed / 700));
        expect(level).toBeLessThanOrEqual(1);
        // Another accepted-state observation of this same physics step is silent.
        sound.observe(world, []);
        expect(audio.play.mock.calls.filter(([cue]) => cue === 'landing')).toHaveLength(1);
    }
    expect(levels[0]).toBeLessThan(levels[1]); expect(levels[1]).toBeLessThan(levels[2]);
    expect(levels[2]).toBe(1); expect(levels[3]).toBe(1);
});

it('landing on a newly activated local plate uses its preserved impact without a second footfall', () => {
    const { audio } = fall(90, true);
    expect(audio.play.mock.calls.filter(([cue]) => cue === 'plate')).toHaveLength(1);
    expect(audio.play.mock.calls.filter(([cue]) => cue === 'landing')).toHaveLength(0);
});

it('a remote or cube-driven plate transition cannot suppress a separate local landing', () => {
    const world = new PuzzleWorld(roomById('pressure'), freshProgress().rooms.pressure);
    Object.assign(world.player, { x: 130, y: 560 - PLAYER.height / 2, grounded: false });
    const audio = { play: vi.fn(), setLoop: vi.fn(), stopAll: vi.fn() }, sound = new AudioPresentation(audio);
    sound.reset(world);
    Object.assign(world.player, { grounded: true, justLanded: true, landingSpeed: 600 }); world.inputs.plateA = true;
    sound.observe(world, []);
    expect(audio.play.mock.calls.filter(([cue]) => cue === 'landing')).toHaveLength(1);
    expect(audio.play.mock.calls.filter(([cue]) => cue === 'plate')).toHaveLength(1);
});

it('pins the approved landing source, raises its measured onset about 3 dB and leaves completion untouched', async () => {
    const { assets } = JSON.parse(await readFile('public/audio/credits.json', 'utf8'));
    const landing = assets.find((a: {file: string}) => a.file === SOUNDS.landing.file);
    expect(landing.original).toBe('Audio/impactSoft_medium_000.ogg');
    expect(landing.source).toBe('https://kenney.nl/assets/impact-sounds');
    expect(landing.sourceSha256).toBe('7d3ba0bb5e60a11b5d3e558c141303dcf494256675fbf753c0d252d2cf0481e3');
    const delta = landing.onsetRms50msDbfs + 20 * Math.log10(SOUNDS.landing.gain) - (-13.133471 + 20 * Math.log10(.4));
    expect(delta).toBeGreaterThan(2.8); expect(delta).toBeLessThan(3.2);
    expect(landing.decodedPeakDbfs + 20 * Math.log10(SOUNDS.landing.gain)).toBeLessThan(-7);
    expect(landing.durationSeconds).toBeLessThanOrEqual(SOUNDS.landing.cooldown);
    const completion = await readFile('public/audio/room-complete.ogg');
    expect(createHash('sha256').update(completion).digest('hex')).toBe('96de80a6cb5015c941eee0a51f76d7548f913d10492c8a8e5b359e78fb9e2ac8');
});
