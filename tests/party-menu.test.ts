import { JSDOM } from 'jsdom';
import { expect, it } from 'vitest';
import { partyMenu } from '../src/coop/party-menu.ts';
import { newParty, selectChamber, completeParty } from '../server/party-state.ts';
import { sharedRoom } from '../server/coop-state.ts';

const host = '11111111-1111-4111-8111-111111111111';
it('lobby and pause expose chamber selection only to the host and state replay consequences', () => {
    const r = newParty('ABCD', host), room = sharedRoom(r, [true, true], [null, null]);
    const ui = (slot: 1 | 2) => new JSDOM(partyMenu(room, slot, true, 'lobby')).window.document;
    expect(ui(1).querySelectorAll('[data-select-level]')).toHaveLength(2);
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
    const last = selectChamber(r, host, 'race-condition')!; last.completed = true; completeParty(last);
    room = sharedRoom(last, [true, true], [null, null]);
    const doc = new JSDOM(partyMenu(room, 1, true, 'victory')).window.document;
    expect(doc.body.textContent).toContain('CAMPAIGN COMPLETE'); expect(doc.querySelector('#next-chamber')).toBeNull();
    expect(doc.querySelector('#choose-chamber')?.className).toBe('primary');
});
