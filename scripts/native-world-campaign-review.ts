/** Observe canonical real-input routes without camera changes or extra movement waits. */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ENVIRONMENTAL_BLOCKS } from '../src/slice/environmental-layout.ts';
import { nativeWorldBindingState, type NativeWorldArtifact } from '../src/coop/native-world-evidence.ts';
import type { NativeEvidence } from '../src/coop/native-evidence.ts';
import type { coopBrowser, GameSnapshot } from './coop-browser.ts';

export function reviewNativeWorldCampaign(h: Awaited<ReturnType<typeof coopBrowser>>) {
    const originalShot = h.shot, originalSnapshot = h.snapshot;
    const observations: unknown[] = [], transitions: unknown[] = [], seen = new Set<string>();
    const combinations = new Set<string>(), values = new Map<string, Set<boolean>>();
    const sources = new Map<string, { world: NativeWorldArtifact; evidence: NativeEvidence }>();
    const remember = (state: GameSnapshot, label: string) => {
        const assembly = state.environmentalAssembly;
        if (assembly.availability !== 'ready' || assembly.chamber !== state.room || assembly.lastKnown) return;
        for (const section of assembly.sections) {
            const id = `${state.room}/${section.output}`, known = values.get(id) ?? new Set<boolean>();
            if (section.raw !== null) known.add(section.raw);
            values.set(id, known);
            const key = `${id}:${section.raw}:${section.physical}:${section.grace}:${section.latched}`;
            if (combinations.has(key)) continue;
            combinations.add(key);
            transitions.push({ label, chamber: state.room, output: section.output, raw: section.raw, physical: section.physical,
                grace: section.grace, inverted: section.inverted, latched: section.latched, message: section.message,
                colour: section.colour, storeId: section.storeId, storeRva: section.storeRva,
                acceptedOutputs: state.nativeWorld.outputs, acceptedPhysical: state.nativeWorld.physical,
                exitUnlocked: state.multiplayer?.shared?.exitUnlocked });
        }
    };
    // Reuse reads already made by the route; do not add polling/IPC during a swing.
    h.snapshot = async page => { const state = await originalSnapshot(page); remember(state, 'ordinary route observation'); return state; };
    h.shot = async (page, name) => {
        await originalShot(page, name);
        const state = await originalSnapshot(page), view = state.nativeWorld;
        remember(state, name);
        if (!view || view.status !== 'ready' || view.chamber !== state.room) return;
        if (state.room === 'race-condition') {
            const cargo = state.raceCargo, machinery = state.raceMachinery;
            h.check(`${name}: all nine RACE blocks retain accepted output selection`, view.panels.length === 0
                && cargo.availability === 'ready' && machinery.availability === 'ready' && cargo.sections.length === 4 && machinery.sections.length === 5
                && [...cargo.sections, ...machinery.sections].every(section => section.raw === view.outputs[section.output]));
            seen.add(state.room);
            observations.push({ name, chamber: state.room, camera: state.camera, cargo, machinery });
            return;
        }
        if (!(state.room in ENVIRONMENTAL_BLOCKS)) return;
        const assembly = state.environmentalAssembly, places = ENVIRONMENTAL_BLOCKS[state.room as keyof typeof ENVIRONMENTAL_BLOCKS];
        let source = sources.get(state.room);
        if (!source) {
            source = { world: JSON.parse(await readFile(`public/evidence/coop/${state.room}.world.json`, 'utf8')),
                evidence: JSON.parse(await readFile(`public/evidence/coop/${state.room}.evidence.json`, 'utf8')) };
            sources.set(state.room, source);
        }
        h.check(`${name}: every local environmental block follows the accepted native result`, assembly.availability === 'ready'
            && assembly.sections.length === places.length && view.panels.length === 0 && assembly.sections.every(section => {
                const output = source.evidence.outputs.find(output => output.name === section.output);
                return section.raw === (view.outputs[section.output] ?? null)
                    && output?.store_sites.some(site => site.instruction_rva === section.storeRva && site.observed_values.includes(Number(section.raw)));
            }));
        h.check(`${name}: messages retain accepted physical, inversion, grace and latch semantics`, assembly.sections.every((section, index) => {
            const output = source.world.outputs.find(output => output.name === section.output)!;
            const binding = output.bindings.find(binding => binding.target === section.target);
            const expected = nativeWorldBindingState({ chamber: source.evidence.chamber_id, connected: true, revision: 0, levelInstance: 0,
                outputs: view.outputs, physical: view.physical, exitUnlocked: state.multiplayer?.shared?.exitUnlocked ?? null }, output, binding);
            const place = places[index];
            return section.physical === expected.physical && section.inverted === expected.inverted && section.grace === expected.grace
                && section.latched === expected.latched && section.powered === expected.physical
                && section.bounds.x === place.x && section.bounds.y === place.y && section.bounds.w === place.w && section.bounds.h === place.h;
        }));
        seen.add(state.room);
        observations.push({ name, chamber: state.room, started: state.started, overview: state.overviewVisible,
            connected: state.multiplayer?.shared?.connected, completed: state.multiplayer?.shared?.completed,
            camera: state.camera, assembly, confirmedOutputs: view.outputs, confirmedPhysical: view.physical });
    };
    return async () => {
        h.check('full physical campaign route rendered each chamber’s own native assembly',
            ['handshake', 'crossfeed-vault', 'race-condition', 'deadlock', 'use-after-free'].every(chamber => seen.has(chamber)));
        const coverage = Object.entries(ENVIRONMENTAL_BLOCKS).flatMap(([chamber, places]) => places.map(place => ({
            chamber, output: place.output, values: [...(values.get(`${chamber}/${place.output}`) ?? [])].sort(),
        })));
        h.check('all 25 replacements were observed during ordinary two-visitor play', coverage.length === 25 && coverage.every(entry => entry.values.length > 0));
        await writeFile(join(h.shots, 'native-world-physical-route.json'), JSON.stringify({
            scope: 'Existing five-chamber real-input solve; existing route reads and screenshot points; no camera or gameplay writes',
            chambers: [...seen], coverage, transitions, observations,
        }, null, 2) + '\n');
    };
}
