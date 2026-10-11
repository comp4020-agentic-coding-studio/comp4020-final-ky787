import { COOP_CAMPAIGN, isCampaignLevel, nextChamber } from './campaign.ts';
import type { SharedRoom, Slot } from './protocol.ts';

export type PartyView = 'lobby' | 'pause' | 'choose' | 'victory';
/** Local presentation only; the server independently checks every selection. */
export function partyMenu(room: SharedRoom, slot: Slot, connected: boolean, view: PartyView): string {
    const party = room.party!, host = slot === 1, level = COOP_CAMPAIGN.find(l => l.id === room.level)!;
    const number = COOP_CAMPAIGN.findIndex(l => l.id === room.level) + 1;
    const next = isCampaignLevel(room.level) ? nextChamber(room.level) : null;
    const selecting = view === 'lobby' || view === 'choose';
    const status = !connected ? 'RECONNECTING TO PARTY'
        : !room.connected[0] ? 'HOST DISCONNECTED — WAITING FOR RECONNECT'
        : !host ? view === 'victory' ? 'WAITING FOR HOST TO CHOOSE THE NEXT CHAMBER' : 'WAITING FOR HOST TO SELECT A CHAMBER' : '';
    return `<div class="menu-card party-card" ${view === 'victory' ? 'id="party-victory"' : 'id="party-menu"'}>
        <span class="eyebrow">${view === 'victory' ? 'CHAMBER CLEARED' : 'CO-OP CAMPAIGN'}</span>
        <h2>${view === 'victory' ? level.title : selecting ? 'Choose a chamber.' : level.title}</h2>
        ${view === 'victory' ? `<p class="victory-message">BOTH PLAYERS ESCAPED</p><p>${String(number).padStart(2, '0')} / ${String(COOP_CAMPAIGN.length).padStart(2, '0')}${!next ? ' · CAMPAIGN COMPLETE' : ''}</p>` : ''}
        <div class="party-code">PARTY / <strong>${room.code}</strong> <button id="party-copy">COPY</button><span id="party-copy-status" role="status"></span></div>
        <div class="party-members">${room.connected.map((on, i) => `<div>PLAYER ${i + 1} — ${i === 0 ? 'HOST' : 'GUEST'} <b>${on ? 'CONNECTED' : room.assigned[i] ? 'DISCONNECTED' : 'WAITING'}</b>${slot === i + 1 ? ' · YOU' : ''}</div>`).join('')}</div>
        <p id="party-status" role="status">${status}</p>
        ${selecting ? `<nav class="campaign-select" aria-label="Campaign chambers">${COOP_CAMPAIGN.map((l, i) => `<div class="campaign-chamber"><div><strong>${String(i + 1).padStart(2, '0')} — ${l.title}</strong><small>${party.completedLevels.includes(l.id) ? 'COMPLETE' : ''}${party.phase !== 'lobby' && room.level === l.id ? ' · CURRENT' : ''}</small></div>${host ? `<button data-select-level="${l.id}" ${connected ? '' : 'disabled'}>START</button>` : ''}</div>`).join('')}</nav>
        ${party.phase !== 'lobby' && host ? '<p class="fine">Starting a chamber resets its puzzle progress for both players. Completion badges stay saved.</p>' : ''}` : ''}
        ${view === 'victory' && host && next ? `<button id="next-chamber" class="primary" data-select-level="${next}" ${connected ? '' : 'disabled'}>NEXT CHAMBER</button>` : ''}
        ${!selecting && host ? `<button id="choose-chamber" class="${view === 'victory' && !next ? 'primary' : 'secondary'}">CHOOSE CHAMBER</button>` : ''}
        ${party.phase === 'playing' ? '<button id="continue" class="primary">CONTINUE</button>' : ''}
        <button id="leave-coop">LEAVE PARTY</button>
        <div id="party-audio"></div>
    </div>`;
}
