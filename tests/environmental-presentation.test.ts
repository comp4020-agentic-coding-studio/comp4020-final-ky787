import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import type { Box } from '../src/engine/geometry.ts';
import type { SharedRoom } from '../src/coop/protocol.ts';
import { crossfeedVault } from '../src/coop/crossfeed-vault.ts';
import { ENVIRONMENTAL_CHAMBERS, ENVIRONMENTAL_OUTPUTS, type EnvironmentalArtifact, type EnvironmentalChamber } from '../src/coop/environmental-types.ts';
import { EnvironmentalEvidence, environmentalAccepted } from '../src/coop/environmental-evidence.ts';
import { environmentalEvidenceDetails } from '../src/coop/environmental-inspector.ts';
import { ENVIRONMENTAL_BLOCKS } from '../src/slice/environmental-layout.ts';
import { EnvironmentalPresentation, environmentalState, selectedEnvironmentalStore } from '../src/slice/environmental-presentation.ts';
import { EnvironmentalRenderer } from '../src/slice/environmental-render.ts';
import { WORLD_ASSEMBLY_PLACEMENTS } from '../src/slice/native-world-presentation.ts';

const asset = (chamber: EnvironmentalChamber): EnvironmentalArtifact => JSON.parse(readFileSync(`public/evidence/coop/${chamber}.environment.json`, 'utf8'));
const all: Box = { x: 0, y: 0, w: 5000, h: 3500 };
const away: Box = { x: 9000, y: 9000, w: 500, h: 300 };
function room(chamber: EnvironmentalChamber, bit = false): SharedRoom {
    return { code: 'ENVIRONMENT', level: chamber, levelInstance: 1, revision: 1, exitUnlocked: bit,
        levelState: { outputs: Object.fromEntries(ENVIRONMENTAL_OUTPUTS[chamber].map(name => [name, bit])),
            physical: { leftRoute: bit, rightRoute: bit } },
    } as unknown as SharedRoom;
}
const accepted = (chamber: EnvironmentalChamber, bit = false) => environmentalAccepted(room(chamber, bit), true)!;
function evidence(chamber: EnvironmentalChamber, bit = false): EnvironmentalEvidence {
    const result = new EnvironmentalEvidence(); result.data = asset(chamber); result.state = accepted(chamber, bit); result.status = 'ready'; return result;
}
function canvas() {
    const painted: { text: string; x: number; y: number; font: string; colour: string }[] = [];
    const context = { font: '', fillStyle: '', save() {}, restore() {}, fillRect() {},
        fillText(text: string, x: number, y: number) { painted.push({ text, x, y, font: this.font, colour: this.fillStyle }); },
    };
    return { c: context as unknown as CanvasRenderingContext2D, painted };
}

describe('all 25 accepted environmental machinery bindings (semantic fixtures)', () => {
    it('retains every old representative target once, with independent local rectangles', () => {
        let total = 0;
        for (const chamber of ENVIRONMENTAL_CHAMBERS) {
            const places = ENVIRONMENTAL_BLOCKS[chamber], data = asset(chamber);
            expect(places.map(p => [p.output, p.target])).toEqual(WORLD_ASSEMBLY_PLACEMENTS[chamber]!.map(p => [p.output, p.target]));
            expect(new Set(places.map(p => p.output)).size).toBe(places.length);
            for (const p of places) {
                expect(data.sections.find(s => s.name === p.output)?.bindings.some(b => b.target === p.target)).toBe(true);
                for (const other of places.filter(o => o !== p)) {
                    const overlaps = p.x < other.x + other.w && p.x + p.w > other.x && p.y < other.y + other.h && p.y + p.h > other.y;
                    expect(overlaps, `${chamber}: ${p.output}/${other.output}`).toBe(false);
                }
            }
            total += places.length;
        }
        expect(total).toBe(25);
        expect(Object.keys(ENVIRONMENTAL_BLOCKS)).not.toContain('race-condition');
        expect(Object.keys(ENVIRONMENTAL_BLOCKS)).not.toContain('uplink');
    });

    it('keeps visually refined blocks clear of their actual active wire paths', () => {
        for (const [chamber, outputs] of [['handshake', ['liftPower']], ['crossfeed-vault', ['grappleAnchor']], ['use-after-free', ['routeB', 'assistBlocked']]] as const) {
            const wires = chamber === 'crossfeed-vault' ? crossfeedVault(1).wires! : JSON.parse(readFileSync(`levels/campaign/${chamber}.json`, 'utf8')).presentation.wires;
            for (const output of outputs) {
                const bounds = ENVIRONMENTAL_BLOCKS[chamber].find(p => p.output === output)!;
                for (const wire of wires as { id: string; points: { x: number; y: number }[] }[]) {
                    for (let i = 1; i < wire.points.length; i++) {
                        const a = wire.points[i - 1], b = wire.points[i];
                        const crosses = a.x === b.x
                            ? a.x >= bounds.x && a.x <= bounds.x + bounds.w && Math.max(a.y, b.y) >= bounds.y && Math.min(a.y, b.y) <= bounds.y + bounds.h
                            : a.y === b.y && a.y >= bounds.y && a.y <= bounds.y + bounds.h && Math.max(a.x, b.x) >= bounds.x && Math.min(a.x, b.x) <= bounds.x + bounds.w;
                        expect(crosses, `${chamber} ${output} / ${wire.id}`).toBe(false);
                    }
                }
            }
        }
    });

    it.each(ENVIRONMENTAL_CHAMBERS)('%s keeps real raw stores separate from machinery colour and authored messages', chamber => {
        const d = new EnvironmentalRenderer(), { c } = canvas(), e = evidence(chamber);
        for (const bit of [false, true]) {
            e.state = accepted(chamber, bit); d.draw(c, e, chamber, all, .1, false);
            expect(d.diagnostic.sections).toHaveLength(ENVIRONMENTAL_OUTPUTS[chamber].length);
            for (const value of d.diagnostic.sections) {
                const inverted = chamber === 'use-after-free' && value.output === 'assistBlocked';
                const hazard = chamber === 'deadlock' && value.output === 'shaftFirewall';
                const powered = inverted ? !bit : bit;
                expect(value.raw).toBe(bit); expect(value.powered).toBe(powered);
                expect(value.storeId).toBe(`${value.output}.write-${Number(bit)}`);
                expect(selectedEnvironmentalStore(e.data!, value.output, value.raw)?.store?.value).toBe(Number(bit));
                expect(value.colour).toBe((hazard ? !powered : powered) ? '#77ba9e' : '#ca817e');
                expect(value.revealed).toBe(value.message); expect(value.pulse).toBe(0);
                expect(value.message).not.toMatch(/RAW|SERVER|STATIC|WRITE|SOLID|SAFE|DELIVERED/);
            }
        }
    });

    it('uses CROSSFEED physical grace without changing the selected native zero-store', () => {
        const e = evidence('crossfeed-vault'), d = new EnvironmentalRenderer(), { c } = canvas();
        e.state!.physical = { physicalLeftRoute: true, physicalRightRoute: true };
        d.draw(c, e, 'crossfeed-vault', all, .1, true);
        for (const name of ['leftRoute', 'rightRoute']) {
            const value = d.diagnostic.sections.find(s => s.output === name)!;
            expect(value).toMatchObject({ raw: false, physical: true, powered: true, grace: true, colour: '#77ba9e', storeId: `${name}.write-0` });
            expect(value.message).toBe(name === 'leftRoute' ? 'LEFT ROUTE POWERED' : 'RIGHT ROUTE POWERED');
        }
        e.state!.physical = { physicalLeftRoute: false, physicalRightRoute: true };
        d.draw(c, e, 'crossfeed-vault', all, .1, true);
        expect(d.diagnostic.sections.find(s => s.output === 'leftRoute')).toMatchObject({ message: 'LEFT ROUTE IDLE', pulse: 1 });
        expect(d.diagnostic.sections.find(s => s.output === 'rightRoute')).toMatchObject({ revealed: 'RIGHT ROUTE POWERED', pulse: 0 });
    });

    it('uses persisted exit unlocks independently of native candidate bits', () => {
        for (const [chamber, output] of [['handshake', 'exitReady'], ['deadlock', 'payloadReady'], ['use-after-free', 'exitReady']] as const) {
            const data = asset(chamber), state = accepted(chamber); state.exitUnlocked = true;
            const section = data.sections.find(s => s.name === output)!;
            expect(environmentalState(state, section)).toMatchObject({ raw: false, powered: true, latched: true });
            expect(selectedEnvironmentalStore(data, output, false)?.store?.value).toBe(0);
            expect(new EnvironmentalPresentation().update(state, data, .1, true).get(output)?.message).toBe('EXIT UNLOCKED');
            state.outputs = { ...state.outputs, [output]: true }; state.exitUnlocked = false;
            expect(new EnvironmentalPresentation().update(state, data, .1, true).get(output)?.message).toBe('EXIT LOCKED');
        }
    });

    it('preserves DEADLOCK completion-enabled service power rather than recalculating controls', () => {
        const r = room('deadlock') as SharedRoom<'deadlock'>; Object.assign(r.levelState, { inputs: { feed: false, safe: false },
            outputs: { ...r.levelState.outputs, serviceRelay: true, payloadReady: true } });
        const state = environmentalAccepted(r, true)!;
        const value = new EnvironmentalPresentation().update(state, asset('deadlock'), .1, true).get('serviceRelay')!;
        expect(value).toMatchObject({ raw: true, powered: true, message: 'SERVICE RELAY AVAILABLE' });
    });

    it('keeps malformed/missing values unknown and refuses other chambers, drafts and invalid identities', () => {
        for (const chamber of ENVIRONMENTAL_CHAMBERS) {
            const r = room(chamber); Object.assign(r, { exitUnlocked: undefined }); Object.assign(r.levelState, { outputs: { [ENVIRONMENTAL_OUTPUTS[chamber][0]]: 0 }, physical: undefined });
            const state = environmentalAccepted(r, true)!;
            for (const value of new EnvironmentalPresentation().update(state, asset(chamber), .1, true).values()) {
                expect(value.raw).toBeNull(); expect(value.message).toContain('UNKNOWN'); expect(value.pulse).toBe(0);
            }
            expect(selectedEnvironmentalStore(asset(chamber), ENVIRONMENTAL_OUTPUTS[chamber][0], null)).toBeNull();
        }
        const r = room('handshake');
        for (const invalid of [null, { ...r, draft: {} }, { ...r, level: 'race-condition' }, { ...r, level: 'uplink' },
            { ...r, level: 'workbench' }, { ...r, level: 'custom' }, { ...r, code: '' }, { ...r, levelInstance: -1 }, { ...r, revision: NaN }]) {
            expect(environmentalAccepted(invalid as SharedRoom, true)).toBeNull();
        }
        const state = accepted('crossfeed-vault', true); state.physical = {};
        const value = new EnvironmentalPresentation().update(state, asset('crossfeed-vault'), .1, true).get('leftRoute')!;
        expect(value).toMatchObject({ raw: true, powered: null, message: 'LEFT ROUTE UNKNOWN', pulse: 0 });
        expect(selectedEnvironmentalStore(asset('crossfeed-vault'), 'leftRoute', value.raw)?.store?.value).toBe(1);
    });
});

describe('environmental message lifecycle', () => {
    it('reveals only changed members; revisions, repeated receipts and culled time do not restart effects', () => {
        const p = new EnvironmentalPresentation(), data = asset('handshake'), s = accepted('handshake');
        p.update(s, data, .1, true);
        const on = { ...s, outputs: { ...s.outputs, crossingPower: true } };
        const first = p.update(on, data, .1, true);
        expect(first.get('crossingPower')).toMatchObject({ message: 'CROSSING POWERED', pulse: 1 });
        expect(first.get('crossingPower')?.revealed).not.toBe('CROSSING POWERED');
        expect(first.get('liftPower')).toMatchObject({ revealed: 'SERVICE LIFT INACTIVE', pulse: 0 });
        const next = p.update({ ...on, revision: 99 }, data, .1, true).get('crossingPower')!;
        expect(next.pulse).toBeLessThan(1); expect(next.revealed).not.toBe(first.get('crossingPower')?.revealed);
        for (let i = 0; i < 8; i++) p.update({ ...on, revision: 100 + i }, data, .1, true);
        expect(p.update(on, data, .1, true).get('crossingPower')).toMatchObject({ revealed: 'CROSSING POWERED', pulse: 0 });

        const e = evidence('handshake'), d = new EnvironmentalRenderer(), { c } = canvas();
        d.draw(c, e, 'handshake', all, .1, true); e.state = on;
        d.draw(c, e, 'handshake', away, .1, true);
        expect(d.diagnostic.sections.find(v => v.output === 'crossingPower')).toMatchObject({ visible: false, pulse: 1 });
        for (let i = 0; i < 8; i++) d.draw(c, e, 'handshake', away, .1, true);
        d.draw(c, e, 'handshake', all, .1, true);
        expect(d.diagnostic.sections.find(v => v.output === 'crossingPower')).toMatchObject({ visible: true, revealed: 'CROSSING POWERED', pulse: 0 });
    });

    it('stops effects on disconnect/pause/reduced motion and baselines reconnect, party and instance changes', () => {
        const p = new EnvironmentalPresentation(), data = asset('handshake'), s = accepted('handshake');
        const on = { ...s, outputs: { ...s.outputs, crossingPower: true } };
        p.update(s, data, .1, true); expect(p.update(on, data, .1, true).get('crossingPower')?.pulse).toBe(1);
        const offline = p.update({ ...on, connected: false }, data, .1, true).get('crossingPower')!;
        expect(offline).toMatchObject({ message: 'CROSSING OFFLINE', revealed: 'CROSSING OFFLINE', pulse: 0 });
        for (const state of [s, { ...on, key: 'OTHER:1:handshake' }, { ...s, key: 'OTHER:2:handshake' }]) {
            expect(p.update(state, data, .1, true).get('crossingPower')?.pulse).toBe(0);
        }
        for (const state of [on, s]) {
            const staticValue = p.update(state, data, .1, false).get('crossingPower')!;
            expect(staticValue.pulse).toBe(0); expect(staticValue.revealed).toBe(staticValue.message);
        }
        expect(p.update(on, data, .1, true).get('crossingPower')?.pulse).toBe(0);
        p.update(null, null, .1, true); expect(p.update(s, data, .1, true).get('crossingPower')?.pulse).toBe(0);
        expect(p.update(accepted('deadlock'), data, .1, true).size).toBe(0);
    });
});

describe('fixed native Canvas decoration', () => {
    it.each(ENVIRONMENTAL_CHAMBERS)('%s paints genuine subsets at stable world line slots across state and view changes', chamber => {
        const e = evidence(chamber), d = new EnvironmentalRenderer(), { c, painted } = canvas();
        const dis = JSON.parse(gunzipSync(readFileSync(`experiments/coop-controllers/${chamber}/evidence/disassembly-bcf.json.gz`)).toString());
        const lineSlots = new Map<string, number[]>();
        const places = ENVIRONMENTAL_BLOCKS[chamber], focused = places.at(-1)!;
        // Overview, nearby pan, narrow view, partial edge cull and offscreen. Camera zoom is
        // the outer Canvas transform; this renderer never receives a zoom-dependent layout.
        const views = [all, { x: focused.x - 80, y: focused.y - 60, w: 1600, h: 900 },
            { x: focused.x + 50, y: focused.y, w: 1024, h: 650 }, { x: focused.x + focused.w - 1, y: focused.y, w: 1, h: 1 }, away];
        for (const bit of [false, true]) for (const view of views) {
            e.state = accepted(chamber, bit); painted.length = 0; d.draw(c, e, chamber, view, .1, false);
            expect(d.diagnostic.sections).toHaveLength(places.length);
            for (const section of d.diagnostic.sections) {
                const place = places.find(p => p.output === section.output)!;
                const bounds = { x: place.x, y: place.y, w: place.w, h: place.h };
                expect(section.bounds).toEqual(bounds);
                expect(section.visible).toBe(bounds.x < view.x + view.w && bounds.x + bounds.w > view.x && bounds.y < view.y + view.h && bounds.y + bounds.h > view.y);
                const slots = section.fragments.flatMap(f => f.instructions.map((_, i) => f.firstLineY + i * 16));
                if (!lineSlots.has(section.output)) lineSlots.set(section.output, slots);
                expect(slots).toEqual(lineSlots.get(section.output));
                expect(slots.length).toBeGreaterThanOrEqual(3); expect(slots.length).toBeLessThanOrEqual(5);
                for (const fragment of section.fragments) {
                    expect(fragment.omittedBefore).toContain('not a CFG edge');
                    const original = e.data!.fragments.find(f => f.id === fragment.id)!;
                    expect(fragment.block).toBe(original.block_id);
                    for (const [n, i] of fragment.instructions.entries()) {
                        expect(dis.instructions.find((v: { address: number }) => v.address === i.address)).toMatchObject(i);
                        if (n) expect(i.address).toBe(fragment.instructions[n - 1].address + fragment.instructions[n - 1].size);
                        // Conservative 7.5-unit advance for 12-unit monospace. The browser
                        // verifier separately measures the actual Canvas font and text.
                        expect(`${i.mnemonic} ${i.op_str}`.length * 7.5).toBeLessThanOrEqual(place.w - 24);
                        if (section.visible) expect(painted).toContainEqual({ text: `${i.mnemonic} ${i.op_str}`, x: place.x + 12,
                            y: place.y + fragment.firstLineY + n * 16, font: '12px ui-monospace, monospace',
                            colour: i.rva === section.storeRva ? section.colour : '#8398a6' });
                    }
                }
                expect(`"${section.message}"`.length * 7.5).toBeLessThanOrEqual(place.w - 24);
                if (section.visible) expect(painted).toContainEqual({ text: `"${section.message}"`, x: place.x + 12, y: place.y + 108,
                    font: '12px ui-monospace, monospace', colour: '#b8b2a1' });
            }
            expect(painted.every(v => v.font === '12px ui-monospace, monospace')).toBe(true);
            expect(painted.map(v => v.text).join('\n')).not.toMatch(/STATIC|WRITE 1|RAW |SERVER |STATE-LINKED|RVA|bb_|omitted|Evidence|ptr omitted|Hold |Release /);
            if (view === away) expect(painted).toEqual([]);
        }
    });

    it('mutes offline/unknown data and fails at fixed bounds without old panels or borrowed instructions', () => {
        const e = evidence('use-after-free'), d = new EnvironmentalRenderer(), { c, painted } = canvas();
        e.state!.connected = false; d.draw(c, e, 'use-after-free', all, .1, true);
        expect(d.diagnostic.sections.every(s => s.colour === '#627985' && s.pulse === 0 && s.message.endsWith('OFFLINE'))).toBe(true);
        const bounds = d.diagnostic.sections.map(s => s.bounds);
        for (const status of ['loading', 'unavailable'] as const) {
            e.data = null; e.status = status; painted.length = 0; d.draw(c, e, 'use-after-free', all, .1, true);
            expect(d.diagnostic.sections.map(s => s.bounds)).toEqual(bounds);
            expect(d.diagnostic.sections.every(s => !s.fragments.length && !s.storeId && s.colour === '#627985')).toBe(true);
            expect(painted.every(p => p.text === '"ASSEMBLY UNAVAILABLE"')).toBe(true);
        }
        e.data = asset('handshake'); e.status = 'ready'; painted.length = 0; d.draw(c, e, 'use-after-free', all, .1, true);
        expect(d.diagnostic.sections.every(s => !s.fragments.length)).toBe(true);
        for (const room of ['race-condition', 'uplink', 'custom', 'workbench', 'handshake']) {
            painted.length = 0; d.draw(c, e, room, all, .1, true); expect(d.diagnostic.sections).toEqual([]); expect(painted).toEqual([]);
        }
    });

    it('keeps complete alternative provenance in Evidence and authored strings distinct from PE strings', () => {
        for (const chamber of ENVIRONMENTAL_CHAMBERS) {
            const e = evidence(chamber);
            for (const section of e.data!.sections) {
                const details = environmentalEvidenceDetails(e, section.name);
                expect(details).toContain(e.data!.specimen_id); expect(details).toContain(e.data!.bcf_pe_sha256);
                expect(details).toContain('not extracted PE strings'); expect(details).toContain('NOT a direct CFG edge');
                expect(details).toContain('representative-sample distinction'); expect(details).toContain('does not show an instruction executing');
                for (const id of [...section.context, section.stores['0'], section.stores['1']]) {
                    const fragment = e.data!.fragments.find(f => f.id === id)!;
                    expect(details).toContain(id); expect(details).toContain(fragment.block_id);
                    for (const i of fragment.instructions) expect(details).toContain(i.bytes);
                }
                for (const [path, hash] of Object.entries(e.data!.sources)) { expect(details).toContain(path); expect(details).toContain(hash); }
            }
        }
    });
});
