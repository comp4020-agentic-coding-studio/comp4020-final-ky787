import { CHARACTER_COLOURS, colourHex } from '../character/profile.ts';
import { characterForSlot } from '../character/presentation.ts';
import { COOP_CAMPAIGN, isCampaignLevel, nextChamber } from './campaign.ts';
import type { SharedRoom, Slot } from './protocol.ts';

const escape = (value: string): string => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export type PartyView = 'lobby' | 'pause' | 'choose' | 'victory';
const invitationControls = (code: string): string => `<div class="party-invitation">
    <div class="party-code">PARTY / <strong>${escape(code)}</strong><button id="party-copy" class="secondary" type="button">COPY LINK</button><button id="party-copy-code" class="text-button" type="button">Copy code</button></div>
    <span id="party-copy-status" role="status"></span>
    <label id="party-invite-fallback" class="invite-fallback" hidden>Invitation link<input id="party-invite-link" readonly aria-label="Invitation link for manual copying"></label>
</div>`;
/** Local presentation only; the server independently checks every selection. */
export function partyMenu(room: SharedRoom, slot: Slot, connected: boolean, view: PartyView): string {
    const party = room.party!, host = slot === 1, level = COOP_CAMPAIGN.find(l => l.id === room.level)!;
    const number = COOP_CAMPAIGN.findIndex(l => l.id === room.level) + 1;
    const campaignComplete = COOP_CAMPAIGN.every(l => party.completedLevels.includes(l.id));
    const next = isCampaignLevel(room.level) ? nextChamber(room.level) : null;
    const selecting = view === 'lobby' || view === 'choose';
    const status = !connected ? 'RECONNECTING TO PARTY'
        : !room.connected[0] ? 'HOST DISCONNECTED — WAITING FOR RECONNECT'
        : !host && view !== 'pause' ? view === 'victory' ? 'WAITING FOR HOST TO CHOOSE THE NEXT CHAMBER' : 'WAITING FOR HOST TO SELECT A CHAMBER' : '';
    if (view === 'pause') return `<div class="menu-card pause-card party-pause-card" id="party-menu">
        <span class="eyebrow">CO-OP / PAUSED</span><h2>${level.title}</h2>
        <p id="party-status" role="status">${status}</p>
        <button id="continue" class="primary">RESUME</button>
        ${invitationControls(room.code)}
        ${host ? '<button id="choose-chamber" class="secondary">CHOOSE CHAMBER</button>' : ''}
        <button id="leave-coop">LEAVE PARTY / MAIN MENU</button>
        <details class="pause-settings"><summary>Sound settings</summary><div id="party-audio"></div></details>
    </div>`;
    return `<div class="menu-card party-card" ${view === 'victory' ? 'id="party-victory"' : 'id="party-menu"'}>
        <span class="eyebrow">${view === 'victory' ? 'CHAMBER CLEARED' : 'CO-OP CAMPAIGN'}</span>
        <h2>${view === 'victory' ? level.title : selecting ? 'Choose a chamber.' : level.title}</h2>
        ${view === 'victory' ? `<p class="victory-message">BOTH PLAYERS ESCAPED</p><p>${String(number).padStart(2, '0')} / ${String(COOP_CAMPAIGN.length).padStart(2, '0')}${campaignComplete ? ' · CAMPAIGN COMPLETE' : !next ? ' · FINAL CHAMBER' : ''}</p>` : ''}
        ${invitationControls(room.code)}
        <div class="party-members">${room.connected.map((on, i) => {
            const profile = characterForSlot(room.profiles, (i + 1) as Slot), colour = CHARACTER_COLOURS.find(c => c.id === profile.colour)!;
            return `<div class="party-member" data-player-slot="${i + 1}" style="--member-colour:${colourHex(profile.colour)}"><span class="party-member-role">P${i + 1} / ${i === 0 ? 'HOST' : 'GUEST'}${slot === i + 1 ? ' · YOU' : ''}</span><strong class="party-member-name"><span class="party-member-swatch" aria-hidden="true"></span>${room.assigned[i] ? escape(profile.name) : 'Awaiting ninja'}</strong><span class="party-member-state">${room.assigned[i] ? `${colour.name.toUpperCase()} · ` : ''}<b>${on ? 'CONNECTED' : room.assigned[i] ? 'DISCONNECTED' : 'WAITING'}</b></span></div>`;
        }).join('')}</div>
        <p id="party-status" role="status">${status}</p>
        ${selecting ? `<nav class="campaign-select" aria-label="Campaign chambers">${COOP_CAMPAIGN.map((l, i) => `<div class="campaign-chamber"><div><strong>${String(i + 1).padStart(2, '0')} — ${l.title}</strong><small>${party.completedLevels.includes(l.id) ? 'COMPLETE' : ''}${party.phase !== 'lobby' && room.level === l.id ? ' · CURRENT' : ''}</small></div>${host ? `<button data-select-level="${l.id}" ${connected ? '' : 'disabled'}>START</button>` : ''}</div>`).join('')}</nav>
        ${party.phase !== 'lobby' && host ? '<p class="fine">Starting a chamber resets its puzzle progress for both players. Completion badges stay saved.</p>' : ''}` : ''}
        ${view === 'victory' && host && next ? `<button id="next-chamber" class="primary" data-select-level="${next}" ${connected ? '' : 'disabled'}>NEXT CHAMBER</button>` : ''}
        ${!selecting && host ? `<button id="choose-chamber" class="${view === 'victory' && !next ? 'primary' : 'secondary'}">CHOOSE CHAMBER</button>` : ''}
        ${party.phase === 'playing' ? '<button id="continue" class="primary">RESUME</button>' : ''}
        <button id="leave-coop">LEAVE PARTY</button>
        <details class="pause-settings"><summary>Sound settings</summary><div id="party-audio"></div></details>
    </div>`;
}
