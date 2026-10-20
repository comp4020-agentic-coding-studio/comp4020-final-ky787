import { JSDOM } from 'jsdom';
import { expect, it } from 'vitest';
import { COOP_CAMPAIGN } from '../src/coop/campaign.ts';
import { partyMenu } from '../src/coop/party-menu.ts';
import { newParty, selectChamber, completeParty } from '../server/party-state.ts';
import { sharedRoom } from '../server/coop-state.ts';

const host = '11111111-1111-4111-8111-111111111111';
it('lobby and pause expose chamber selection only to the host and state replay consequences', () => {
    const r = newParty('ABCD', host), room = sharedRoom(r, [true, true], [null, null]);
    const ui = (slot: 1 | 2) => new JSDOM(partyMenu(room, slot, true, 'lobby')).window.document;
    expect(ui(1).querySelectorAll('[data-select-level]')).toHaveLength(5);
    expect(ui(2).querySelectorAll('[data-select-level]')).toHaveLength(0);
    expect(ui(2).body.textContent).toContain('WAITING FOR HOST');
    const active = sharedRoom(selectChamber(r, host, 'race-condition')!, [true, true], [null, null]);
    expect(partyMenu(active, 1, true, 'choose')).toContain('resets its puzzle progress for both players');
    expect(partyMenu(active, 2, true, 'pause')).not.toContain('id="choose-chamber"');
    expect(partyMenu(active, 1, false, 'choose')).toContain('disabled');
});
it('victory has NEXT only when another chamber exists; guest status follows the original host', () => {
    const r = selectChamber(newParty('ABCD', host), host, 'crossfeed-vault')!;
    r.completed = true; completeParty(r);
    let room = sharedRoom(r, [true, true], [null, null]);
    expect(partyMenu(room, 1, true, 'victory')).toContain('id="next-chamber"');
    expect(partyMenu(room, 2, true, 'victory')).not.toContain('data-select-level');
    room.connected[0] = false;
    expect(partyMenu(room, 2, true, 'victory')).toContain('HOST DISCONNECTED — WAITING FOR RECONNECT');
    const last = selectChamber(r, host, 'use-after-free')!; last.completed = true; completeParty(last);
    expect(partyMenu(sharedRoom(last, [true, true], [null, null]), 1, true, 'victory')).not.toContain('CAMPAIGN COMPLETE');
    last.party!.completedLevels = COOP_CAMPAIGN.map(l => l.id);
    room = sharedRoom(last, [true, true], [null, null]);
    const doc = new JSDOM(partyMenu(room, 1, true, 'victory')).window.document;
    expect(doc.body.textContent).toContain('CAMPAIGN COMPLETE'); expect(doc.querySelector('#next-chamber')).toBeNull();
    expect(doc.querySelector('#choose-chamber')?.className).toBe('primary');
});

it('both perspectives retain profile colours, names, host roles and safe compact labels', async () => {
    const { characterForSlot, characterLabel } = await import('../src/character/presentation.ts');
    const r = newParty('ABCD', host); r.visitors[1] = '22222222-2222-4222-8222-222222222222';
    const room = sharedRoom(r, [true, true], [null, null]);
    room.profiles = [{ name: 'ShadowByte', colour: 'purple' }, { name: 'ZeroDay', colour: 'orange' }];
    for (const slot of [1, 2] as const) {
        const doc = new JSDOM(partyMenu(room, slot, true, 'lobby')).window.document;
        expect(doc.querySelector('[data-player-slot="1"]')?.textContent).toContain('ShadowByte');
        expect(doc.querySelector('[data-player-slot="1"]')?.textContent).toContain('P1 / HOST');
        expect(doc.querySelector('[data-player-slot="1"]')?.getAttribute('style')).toContain('#B59BFF');
        expect(doc.querySelector('[data-player-slot="2"]')?.textContent).toContain('ZeroDay');
        expect(doc.querySelector('[data-player-slot="2"]')?.textContent).toContain('P2 / GUEST');
        expect(doc.querySelector('[data-player-slot="2"]')?.getAttribute('style')).toContain('#FFAC55');
        expect(characterForSlot(room.profiles, slot)).toEqual(room.profiles[slot - 1]);
        expect(characterForSlot(room.profiles, slot === 1 ? 2 : 1)).toEqual(room.profiles[slot === 1 ? 1 : 0]);
    }
    expect(characterLabel(room.profiles[0]!, 1, true, .3)).toBe('ShadowB… / P1 · YOU');
    expect(characterLabel(room.profiles[1]!, 2, false, 1)).toBe('ZeroDay / P2');
    room.profiles[0] = { name: '<img onerror=x>', colour: 'purple' };
    const malformed = new JSDOM(partyMenu(room, 2, true, 'lobby')).window.document;
    expect(malformed.querySelector('img')).toBeNull(); expect(malformed.body.textContent).toContain('Ninja');
});
