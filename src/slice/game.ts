import { CharacterProfileClient } from '../character/client.ts';
import { CharacterCreator } from '../character/creator.ts';
import { DEFAULT_CHARACTER_PROFILE, colourHex, type PublicCharacterProfile } from '../character/profile.ts';
import { COOP_CAMPAIGN, isCampaignLevel } from '../coop/campaign.ts';
import { partyMenu, type PartyView } from '../coop/party-menu.ts';
import { cubeEntries } from '../coop/protocol.ts';
import { EvidenceInspector } from './evidence-inspector.ts';
import { NativeEvidenceInspector, nativeInspectorView } from '../coop/native-inspector.ts';
import { isNativeChamber } from '../coop/native-evidence.ts';
import { FIXED_DT, MAX_FRAME_TIME } from '../engine/constants.ts';
import { InputManager } from '../ui/input.ts';
import { PuzzleRenderer } from './render.ts';
import { PuzzleWorld } from './world.ts';
import { ROOMS, roomById } from './rooms.ts';
import { freshProgress, tutorialProgress, restartRoomProgress } from './progress.ts';
import { ProgressStore } from './storage.ts';
import { connectionPowered } from './connections.ts';
import { GameAudio } from '../audio/game-audio.ts';
import { MusicPlayer } from '../audio/music-player.ts';
import { musicSceneForRoom } from '../audio/music-catalogue.ts';
import { AudioPresentation } from './audio-presentation.ts';
import { CoopClient } from '../coop/client.ts';
import { createCoopAuthority, type CoopAuthority } from '../coop/lab-authority.ts';
import { COOP_LABS } from '../coop/labs.ts';
import { isCoopLevel, type CoopLevelId, type SharedRoom } from '../coop/protocol.ts';
import { NinjaPreview } from '../character/preview.ts';
import { homeMenu, coopMenu, joinMenu, builderMenu, aboutMenu, settingsMenu, soloPauseMenu, connectionMenu } from '../menu/views.ts';
import { readInvitation, parseJoinInput, consumedInvitationUrl, bindPartyInvitation } from '../coop/invitation.ts';
type AppView = 'loading' | 'character' | 'home' | 'coop' | 'join' | 'builder' | 'about' | 'settings' | 'connecting' | 'pause' | 'coop-pause' | 'lobby' | 'choose' | 'victory' | 'playing';
export class SliceGame {
    store = new ProgressStore();
    profiles = new CharacterProfileClient();
    private character!: CharacterCreator;
    private characterReady = false;
    private view: AppView = 'loading';
    private homePreview: NinjaPreview | null = null;
    private invitation = readInvitation(location.href);
    private joinCode: string | undefined;
    private joiningLevel: CoopLevelId | undefined;
    private settingsReturn: 'home' | 'pause' = 'home';
    world = new PuzzleWorld(ROOMS[0], freshProgress().rooms.pressure);
    renderer: PuzzleRenderer;
    input = new InputManager(true);
    audio = new GameAudio();
    private music = new MusicPlayer();
    private completionMusicUntil = 0;
    private sound = new AudioPresentation(this.audio);
    started = false;
    overviewVisible = false;
    private overviewPending = false;
    private startButton = document.querySelector<HTMLButtonElement>('#start-room')!;
    ended = false;
    debug = false;
    private inspector: EvidenceInspector;
    private nativeInspector!: NativeEvidenceInspector;
    private nativeInspectorOpen = false;
    private resumeAfterInspector = false;
    private sourceBadge = document.querySelector<HTMLElement>('#controller-source')!;
    private traceView = document.querySelector<HTMLElement>('#trace-status')!;
    private traceLabel = document.createElement('div');
    private traceCommits = document.createElement('div');
    private traceId = '';
    private evidenceButton = document.querySelector<HTMLButtonElement>('#evidence-toggle')!;
    private last = 0;
    private accumulated = 0;
    private menu: HTMLElement;
    private debugView: HTMLElement;
    private status: HTMLElement;
    private roomTitle: HTMLElement;
    private memory = '';
    coop = new CoopClient((room, initial) => this.applyCoop(room, initial), () => this.coopStatus());
    private coopMode = false;
    private coopPaused = false;
    private partyView: PartyView = 'lobby';
    private partyMenuKey = '';
    private authority: CoopAuthority | null = null;
    private coopHud = document.createElement('aside');
    constructor(readonly host: HTMLElement, readonly canvas: HTMLCanvasElement) {
        this.music.setPreferences(this.audio.getPreferences());
        const unlock = () => { void this.audio.unlock(); void this.music.unlock(); };
        // Also stop a completion chime that is allowed on the already-paused menu.
        const silence = () => { this.audio.setActive(false); this.audio.stopAll(); };
        document.addEventListener('pointerdown', unlock, { capture: true, passive: true });
        document.addEventListener('keydown', unlock, { capture: true });
        this.sound.reset(this.world);
        this.traceView.append(this.traceLabel, this.traceCommits);
        this.traceCommits.className = 'trace-commits';
        this.renderer = new PuzzleRenderer(canvas);
        this.inspector = new EvidenceInspector(() => this.closeInspector(), show => { this.renderer.revealBogus = show; });
        this.nativeInspector = new NativeEvidenceInspector(() => this.closeInspector());
        this.evidenceButton.addEventListener('click', () => {
            if (!this.inspector.element.hidden) { this.closeInspector(); return; }
            // Co-op native-backed chambers use the dedicated native evidence inspector.
            const nativeView = this.coopMode ? nativeInspectorView(this.coop.room, this.renderer.raceCargo, this.renderer.raceMachinery, this.renderer.environmental) : null;
            if (nativeView) {
                this.resumeAfterInspector = this.started; this.started = false;
                this.audio.setActive(false);
                this.world.cancelGrapple(); this.input.releaseAll();
                this.nativeInspectorOpen = true;
                void this.nativeInspector.open(nativeView);
                return;
            }
            this.resumeAfterInspector = this.started; this.started = false;
            this.audio.setActive(false);
            this.world.cancelGrapple(); this.input.releaseAll();
            this.inspector.element.hidden = false;
        });
        this.renderer.room(this.world);
        this.input.attach(canvas, host);
        this.menu = document.querySelector('#menu')!;
        this.character = new CharacterCreator(this.menu);
        this.debugView = document.querySelector('#debug')!;
        this.status = document.querySelector('#save-status')!;
        this.roomTitle = document.querySelector('#room-title')!;
        this.coopHud.id = 'coop-hud'; this.coopHud.hidden = true;
        this.coopHud.setAttribute('aria-label', 'Co-op session'); host.appendChild(this.coopHud);
        document.querySelector('#pause')!.addEventListener('click', () => this.showMenu());
        this.menu.addEventListener('click', event => {
            if (event.target === this.menu && (this.view === 'pause' || this.view === 'coop-pause')) {
                event.preventDefault(); event.stopPropagation(); this.resumeRoom();
            }
        });
        this.menu.addEventListener('keydown', event => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.escapeMenu(); }
        });
        window.addEventListener('popstate', () => {
            const invitation = readInvitation(location.href);
            if (invitation.present) { this.invitation = invitation; if (this.characterReady) this.acceptInvitation(); }
        });
        this.startButton.addEventListener('click', () => {
            if (!this.overviewVisible || !this.inspector.element.hidden || !this.menu.hidden) return;
            this.overviewPending = false;
            this.overviewVisible = false;
            this.startButton.hidden = true;
            this.started = true;
            this.input.setEnabled(true);
            this.input.releaseAll(); this.input.clearActions();
            this.canvas.focus();
        });
        document.querySelector('#debug-toggle')!.addEventListener('click', () => { this.debug = !this.debug; });
        document.querySelector('#return-cube')!.addEventListener('click', () => { this.world.returnCube(); this.canvas.focus(); });
        this.debug = new URL(location.href).searchParams.has('debug');
        document.addEventListener('visibilitychange', () => { if (document.hidden) {
            silence();
            this.input.releaseAll();
            this.world.cancelGrapple();
            void this.store.flush();
        } });
        window.addEventListener('blur', () => { this.world.cancelGrapple(); silence(); });
        window.addEventListener('pagehide', event => { this.music.setActive(false); if (!event.persisted) this.music.dispose(); this.character.close(); this.homePreview?.dispose(); this.homePreview = null; silence(); void this.store.flush(); this.coop.leave(false); });
        window.addEventListener('pageshow', event => {
            this.music.setActive(true);
            if (event.persisted && !this.characterReady) { void this.loadCharacter(); return; }
            if (event.persisted && (this.menu.querySelector('#character-form') || this.view === 'home')) this.showHome();
            if (event.persisted && this.coopMode) {
                const code = this.coop.remembered();
                if (code) {
                    // BFCache retains application pause/overview state and authority.
                    // Reconnect the transport without treating this as a new session.
                    this.joinCode = code; this.joiningLevel = undefined; this.coop.start(code);
                } else this.leaveCoop();
            }
        });
    }
    async start(): Promise<void> {
        requestAnimationFrame(t => this.frame(t));
        await this.store.load();
        this.loadRoom();
        await this.loadCharacter();
    }
    private async loadCharacter(): Promise<void> {
        this.setView('loading');
        this.menu.innerHTML = '<div class="menu-card character-loading" role="status"><span class="eyebrow">BINARY NINJA</span><h2>Loading your ninja…</h2><p>Connecting to your saved character.</p></div>';
        try {
            const profile = await this.profiles.load();
            if (profile) this.finishCharacter();
            else this.openCharacter(false);
        } catch {
            this.menu.innerHTML = '<div class="menu-card character-loading"><span class="eyebrow">CHARACTER CONNECTION</span><h2>Your ninja is offline.</h2><p>Your saved character could not be loaded. Retry, or create a temporary ninja for this visit. A guest character is not saved.</p><button id="retry-profile" class="primary">RETRY CONNECTION</button><button id="guest-profile">CREATE GUEST NINJA</button></div>';
            this.menu.querySelector('#retry-profile')!.addEventListener('click', () => { void this.loadCharacter(); });
            this.menu.querySelector('#guest-profile')!.addEventListener('click', () => this.openCharacter(false, true));
        }
    }
    private finishCharacter(): void {
        const first = !this.characterReady;
        this.character.close(); this.characterReady = true;
        this.renderer.profile = this.profiles.profile ?? DEFAULT_CHARACTER_PROFILE;
        this.input.releaseAll(); this.input.clearActions();
        this.partyMenuKey = ''; this.showHome();
        if (first) {
            if (this.invitation.present) this.acceptInvitation();
            else { const code = this.coop.remembered(); if (code) this.enterCoop(code); }
        }
    }
    private openCharacter(customize: boolean, guest = false): void {
        this.setView('character');
        this.started = false; this.audio.setActive(false);
        this.input.releaseAll(); this.input.clearActions(); this.world.cancelGrapple();
        if (this.coopMode) { this.coopPaused = true; this.coop.occupy(null); }
        this.menu.hidden = false;
        const useGuest = (profile: PublicCharacterProfile) => { this.profiles.useGuest(profile); this.finishCharacter(); };
        this.character.open({ mode: customize ? 'customize' : 'initialize', profile: this.profiles.profile ?? undefined,
            persistent: !guest && (this.profiles.persisted || this.profiles.ready),
            onSave: async profile => {
                if (guest) this.profiles.useGuest(profile);
                else await this.profiles.save(profile);
                this.finishCharacter();
            },
            ...(!customize || !this.profiles.persisted ? { onGuest: useGuest } : {}),
            ...(customize ? { onCancel: () => { this.character.close(); this.renderer.profile = this.profiles.profile ?? DEFAULT_CHARACTER_PROFILE; this.input.releaseAll(); this.input.clearActions(); this.partyMenuKey = ''; this.showHome(); } } : {}),
        });
    }
    private acceptInvitation(): void {
        this.menu.querySelector('#invite-conflict')?.remove();
        this.menu.querySelector('#accept-other-invite')?.remove();
        if (!this.invitation.code) {
            if (this.coop.active) {
                this.showCoopMenu();
                const note = document.createElement('p'); note.id = 'invite-conflict'; note.setAttribute('role', 'status');
                note.textContent = 'This invitation is invalid. Your current party is unchanged.';
                this.menu.querySelector('#invite-conflict')?.remove();
                this.menu.querySelector('h2')?.after(note);
            } else this.showJoin('This invitation is invalid. Enter a four-character party code or ask your friend for a new link.');
            return;
        }
        if (this.coop.active && this.coop.targetCode !== this.invitation.code) {
            this.showCoopMenu();
            const note = document.createElement('p'); note.id = 'invite-conflict'; note.setAttribute('role', 'status');
            note.textContent = 'You are already in a party. Leave this party before joining the new invitation.';
            const join = document.createElement('button'); join.id = 'accept-other-invite'; join.textContent = 'LEAVE PARTY & JOIN INVITATION';
            join.onclick = () => { const code = this.invitation.code!; this.leaveCoop(); this.enterCoop(code, undefined, true); };
            const card = this.menu.querySelector('.menu-card,.menu-destination') ?? this.menu;
            const heading = card.querySelector('h2');
            if (heading) heading.after(note, join); else card.prepend(note, join);
            join.focus({ preventScroll: true });
            return;
        }
        if (this.coop.active && this.coop.targetCode === this.invitation.code) {
            if (this.coop.connected) this.consumeInvitation(this.invitation.code);
            return;
        }
        this.enterCoop(this.invitation.code, undefined, true);
    }
    private consumeInvitation(code: string): void {
        const clean = consumedInvitationUrl(location.href, code);
        if (clean) { history.replaceState(history.state, '', clean); this.invitation = { present: false, code: null }; }
    }
    private enterCoop(code?: string, level?: CoopLevelId, invitation = false): void {
        this.started = false; this.coopMode = true; this.coopPaused = false; this.authority = null;
        this.joinCode = code; this.joiningLevel = level;
        this.overviewVisible = false; this.overviewPending = false; this.startButton.hidden = true;
        this.inspector.element.hidden = true; this.evidenceButton.hidden = true;
        this.world.cancelGrapple(); this.audio.setActive(false);
        this.setView('connecting'); this.menu.innerHTML = connectionMenu(); this.bindConnection();
        this.coopHud.hidden = true; this.host.classList.add('coop-mode');
        if (invitation) this.coop.startInvitation(code!); else this.coop.start(code, level);
    }
    private bindConnection(): void {
        this.menu.querySelector('#back-main')?.addEventListener('click', () => { this.leaveCoop(); this.showCoopEntry(); });
        this.menu.querySelector('#retry-join')?.addEventListener('click', () => this.enterCoop(this.joinCode, this.joiningLevel));
    }
    private applyCoop(room: SharedRoom, initial: boolean): void {
        if (!this.coopMode || !this.coop.slot) return;
        this.consumeInvitation(room.code);
        if (room.draft || room.level === 'workbench') { this.coop.leave(false); location.assign(`/custom-level.html?code=${room.code}`); return; }
        let completedNow = false;
        const wasVictory = this.authority?.room.party?.phase === 'victory';
        const pausedView = this.partyView;
        const sameChamber = initial && this.authority?.room.code === room.code
            && this.authority.room.levelInstance === room.levelInstance && this.authority.room.level === room.level;
        const previousOverviewPending = this.overviewPending;
        const restorePause = sameChamber && this.coopPaused;
        if (initial) {
            this.started = false; this.coopPaused = restorePause; this.setView('playing'); this.partyMenuKey = ''; this.partyView = 'pause';
            this.world.cancelGrapple(); this.input.releaseAll(); this.input.clearActions(); this.audio.stopAll();
            this.authority = createCoopAuthority(room, this.coop);
            this.world = new PuzzleWorld(COOP_LABS[room.level].room(this.coop.slot), { switchB: false, cubeOnPlate: false, cubeOnPlateB: false,
                checkpoint: this.authority.checkpoint }, undefined, this.authority);
            this.renderer.room(this.world, room.completed); this.sound.reset(this.world);
            this.input.releaseAll(); this.accumulated = 0;
            const native = isNativeChamber(room.level);
            this.roomTitle.textContent = `CO-OP / ${COOP_LABS[room.level].title}`;
            this.sourceBadge.textContent = native ? 'VALIDATED OLLVM BCF' : 'mock-multiplayer';
            this.evidenceButton.hidden = !native;
            this.overviewPending = sameChamber ? previousOverviewPending : isCampaignLevel(room.level) && room.checkpoint === 'entry';
            this.overviewVisible = this.overviewPending && !restorePause; this.startButton.hidden = !this.overviewVisible;
            this.started = this.coop.playing && !this.coopPaused && !this.overviewVisible; this.canvas.focus();
            this.audio.setActive(this.started && !document.hidden && document.hasFocus());
        } else if (this.authority) {
            const previous = this.authority.room;
            const switchWasVisible = this.world.inputs.switchB;
            this.authority.room = room; this.world.syncAuthority();
            if (this.nativeInspectorOpen) { const v = nativeInspectorView(room, this.renderer.raceCargo, this.renderer.raceMachinery, this.renderer.environmental); if (v) this.nativeInspector.update(v); }
            const events = this.world.events.splice(0);
            if (room.level !== 'race-condition' && room.level !== 'crossfeed-vault' && !switchWasVisible && this.world.inputs.switchB) events.push({ kind: 'switch', at: this.world.room.lever ?? this.world.room.controls?.find(c => c.id === 'switchB')?.at ?? this.world.player });
            if (previous.checkpoint !== room.checkpoint) events.push({ kind: 'checkpoint', at: this.world.checkpointPosition() });
            if (previous.level === 'lift-lab' && room.level === 'lift-lab' && !previous.levelState.liftLatched && room.levelState.liftLatched)
                events.push({ kind: 'lift-latch', at: this.world.room.upperLever! });
            this.sound.observe(this.world, events);
            for (const event of events) {
                if (event.kind === 'crumble') this.renderer.particles.shatter(event.at.x, event.at.y, 140, 32, '#f9ba68');
                if (event.kind === 'cube-firewall') this.renderer.particles.burst(event.at.x, event.at.y, 14, '#ff943e', 170);
            }
            if (!previous.completed && room.completed) completedNow = true;
            else if (room.reachedExit.some((arrived, i) => arrived && !previous.reachedExit[i])) this.audio.play('latch', .35);
        }
        if (restorePause && room.party?.phase === 'playing') { this.partyMenuKey = ''; this.showPartyMenu(pausedView); }
        else if (restorePause && !room.party) this.showCoopMenu();
        if (this.character.active) { this.started = false; this.coopPaused = true; this.menu.hidden = false; return; }
        if (room.party && room.party.phase !== 'playing') {
            this.started = false; this.overviewVisible = false; this.overviewPending = false; this.startButton.hidden = true;
            this.input.releaseAll(); this.input.clearActions(); this.world.cancelGrapple();
            this.showPartyMenu(wasVictory && !initial && this.partyView === 'choose' ? 'choose' : room.party.phase === 'victory' ? 'victory' : 'lobby');
        }
        // Entering victory stops gameplay voices. Start its stinger after that transition.
        if (completedNow && !document.hidden && document.hasFocus()) this.completionSound();
    }
    private coopStatus(): void {
        if (!this.coopMode) return;
        if (!this.coop.room || !this.coop.active) {
            if (this.view !== 'connecting') { this.setView('connecting'); this.menu.innerHTML = connectionMenu(); this.bindConnection(); }
            this.menu.querySelector('#connection-status')!.textContent = this.coop.status;
            const retry = this.menu.querySelector<HTMLButtonElement>('#retry-join')!;
            retry.hidden = this.coop.active; this.coopHud.hidden = true;
            if (!this.coop.active) {
                this.menu.querySelector('#destination-title')!.textContent = 'Unable to join this party.';
                this.menu.querySelector('.destination-heading p')!.textContent = 'Check the invitation or ask your friend for a new link.';
            }
            return;
        }
        if (!this.coop.connected) { this.started = false; this.world.cancelGrapple(); this.world.syncAuthority(); this.sound.reset(this.world); this.input.releaseAll(); }
        const r = this.coop.room;
        const slots = r ? r.connected.map((on, i) => `${r.profiles?.[i]?.name ?? 'Ninja'} / P${i + 1}   ${on ? 'CONNECTED' : r.assigned[i] ? 'DISCONNECTED' : 'WAITING FOR PARTNER'}${r.reachedExit[i] ? ' · ARRIVED' : ''}`).join('\n') : '';
        const partner = r && this.coop.slot ? this.coop.slot === 1 ? 1 : 0 : 1;
        const status = !this.coop.connected ? this.coop.status
            : r?.party && this.coop.slot === 2 && !r.connected[0] ? 'HOST DISCONNECTED — WAITING FOR RECONNECT'
            : r && !r.connected[partner] ? r.assigned[partner] ? 'PARTNER DISCONNECTED' : 'WAITING FOR PARTNER'
            : r?.completed ? r.level === 'race-condition' ? 'TRACE COMPLETE' : r.level === 'crossfeed-vault' ? 'VAULT COMPLETE' : isCampaignLevel(r.level) ? 'CHAMBER COMPLETE' : r.level === 'pairing-bay' ? 'PAIRING COMPLETE' : 'LAB COMPLETE'
            : r?.exitUnlocked ? 'EXIT UNLOCKED · REGROUP'
            : 'PARTNER CONNECTED · PLAY TOGETHER';
        this.coopHud.replaceChildren();
        const label = document.createElement('small'); label.textContent = `${r && isCoopLevel(r.level) ? COOP_LABS[r.level].title : 'CO-OP CAMPAIGN'} / PARTY CODE`;
        const code = document.createElement('strong'); code.id = 'room-code'; code.textContent = r?.code ?? '····';
        const codeRow = document.createElement('div'); codeRow.className = 'room-code-row';
        const copy = document.createElement('button'); copy.id = 'copy-room-code'; copy.type = 'button';
        copy.textContent = 'COPY CODE'; copy.disabled = !r; copy.setAttribute('aria-label', 'Copy room code to clipboard');
        const copied = document.createElement('small'); copied.id = 'copy-room-status'; copied.setAttribute('role', 'status');
        copy.addEventListener('click', async () => {
            if (!r) return;
            copy.textContent = 'COPY CODE'; copied.textContent = '';
            try {
                await navigator.clipboard.writeText(r.code);
                copy.textContent = 'COPIED'; copied.textContent = 'Room code copied.';
            } catch {
                copied.textContent = 'Copy unavailable. Select the code and copy it manually.';
            }
        });
        codeRow.append(code, copy);
        const who = document.createElement('span'); who.textContent = this.coop.slot ? `${r?.profiles?.[this.coop.slot - 1]?.name ?? 'Ninja'} / YOU · P${this.coop.slot}` : 'CONNECTING TO SESSION';
        const list = document.createElement('pre'); list.textContent = slots;
        const state = document.createElement('b'); state.id = 'coop-state'; state.setAttribute('role', 'status'); state.textContent = status;
        this.coopHud.append(label, codeRow, copied, who, list, state);
        if (r?.exitUnlocked) {
            const arrivals = document.createElement('small'); arrivals.id = 'exit-arrivals'; arrivals.setAttribute('role', 'status');
            arrivals.textContent = `EXIT · ${r.reachedExit.filter(Boolean).length} / 2 ARRIVED${r.completed ? '' : ' · BOTH PLAYERS REQUIRED'}`;
            this.coopHud.append(arrivals);
        }
        if (r?.party && (r.party.phase !== 'playing' || this.coopPaused)) this.showPartyMenu(this.partyView);
        this.coopHud.hidden = !!r?.party && !this.menu.hidden;
        if (!this.coop.active) {
            const back = document.createElement('button'); back.textContent = 'Back to menu'; back.onclick = () => this.leaveCoop(); this.coopHud.append(back);
        }
    }
    private leaveCoop(): void {
        this.coop.leave(); this.coopMode = false; this.coopPaused = false; this.coopHud.hidden = true; this.authority = null;
        this.host.classList.remove('coop-mode');
        this.ended = false; this.loadRoom(); this.showHome();
    }
    private showPartyMenu(view: PartyView): void {
        if (!this.characterReady || this.character.active) return;
        const r = this.coop.room;
        if (!r?.party || !this.coop.slot) return;
        if (r.party.phase === 'lobby') view = 'lobby';
        if (r.party.phase === 'victory' && view !== 'choose') view = 'victory';
        const key = JSON.stringify([view, r.code, r.levelInstance, r.party, r.connected, r.assigned, r.profiles, this.coop.status]);
        if (this.partyMenuKey === key && !this.menu.hidden) return;
        this.nativeInspector.element.hidden = true; this.nativeInspectorOpen = false;
        this.partyView = view; this.partyMenuKey = key; this.coopPaused = true; this.started = false;
        this.coop.occupy(null); this.world.cancelGrapple(); this.input.releaseAll(); this.input.clearActions();
        this.audio.setActive(false); this.overviewVisible = false; this.startButton.hidden = true;
        this.setView(view === 'pause' ? 'coop-pause' : view); this.coopHud.hidden = true;
        this.menu.innerHTML = partyMenu(r, this.coop.slot, this.coop.connected, view);
        this.menu.querySelector('#party-audio')!.innerHTML = this.audioMenu(); this.bindAudio();
        bindPartyInvitation(this.menu, r.code);
        for (const button of this.menu.querySelectorAll<HTMLButtonElement>('[data-select-level]')) button.addEventListener('click', () => {
            const level = COOP_CAMPAIGN.find(l => l.id === button.dataset.selectLevel);
            if (level && this.coop.selectLevel(level.id)) for (const b of this.menu.querySelectorAll<HTMLButtonElement>('[data-select-level]')) b.disabled = true;
        });
        this.menu.querySelector('#choose-chamber')?.addEventListener('click', () => this.showPartyMenu('choose'));
        this.menu.querySelector('#continue')?.addEventListener('click', () => this.resumeRoom());
        this.menu.querySelector('#leave-coop')!.addEventListener('click', () => this.leaveCoop());
        this.menu.querySelector('h2')?.setAttribute('tabindex', '-1');
        this.focusMenu(view === 'pause' ? '#continue' : view === 'victory' && this.coop.slot === 1 ? '#next-chamber, #choose-chamber' : 'h2');
    }
    private showCoopMenu(): void {
        if (!this.characterReady || this.character.active) return;
        if (!this.coop.room) return;
        if (this.coop.room?.party) { this.showPartyMenu('pause'); return; }
        this.nativeInspector.element.hidden = true; this.nativeInspectorOpen = false;
        this.coopPaused = true; this.started = false; this.coop.occupy(null);
        this.audio.setActive(false); this.world.cancelGrapple(); this.input.releaseAll();
        this.setView('coop-pause');
        this.menu.innerHTML = `<div class="menu-card pause-card"><span class="eyebrow">CO-OP / MOCK TEST CHAMBER</span><h2>${this.world.room.title}</h2><p>Room ${this.coop.room?.code ?? 'connecting'} · You are Player ${this.coop.slot ?? '…'}</p><p>Your slot and shared checkpoint stay saved when you leave.</p><button id="continue" class="primary">CONTINUE ${this.world.room.title}</button><button id="leave-coop">LEAVE ROOM / SINGLE PLAYER</button><p class="fine">A / D move · Space jump · E interact<br>Hold click to hook · R resets only you</p></div>`;
        this.menu.querySelector('#continue')!.addEventListener('click', () => this.resumeRoom());
        this.menu.querySelector('#leave-coop')!.addEventListener('click', () => this.leaveCoop());
        this.menu.querySelector<HTMLButtonElement>('#continue')!.focus();
    }
    private closeInspector(): void {
        this.inspector.element.hidden = true; this.nativeInspector.element.hidden = true; this.nativeInspectorOpen = false;
        this.started = this.resumeAfterInspector;
        this.input.releaseAll();
        if (this.overviewVisible) this.startButton.focus();
        else this.canvas.focus();
    }
    private loadRoom(): void {
        const id = this.store.progress.currentRoom;
        this.world = new PuzzleWorld(roomById(id), this.store.progress.rooms[id]);
        this.sound.reset(this.world);
        this.overviewPending = id === 'uplink' && this.world.checkpoint === 'entry';
        this.overviewVisible = false;
        this.startButton.hidden = true;
        this.renderer.room(this.world, false, this.store.progress.mechanics);
        this.sourceBadge.textContent = this.world.frame.source;
        this.evidenceButton.hidden = id !== 'uplink';
        this.traceView.hidden = id !== 'uplink' || !this.debug;
        this.memory = JSON.stringify(this.world.memory());
        this.input.releaseAll();
        this.accumulated = 0;
        this.roomTitle.textContent = `0${ROOMS.findIndex(r => r.id === id) + 1} / ${roomById(id).title}`;
    }
    /** View changes own presentation lifetime and never leave buffered physical input. */
    private setView(view: AppView): void {
        this.homePreview?.dispose(); this.homePreview = null;
        this.view = view; this.menu.dataset.view = view;
        const full = ['loading', 'character', 'home', 'coop', 'join', 'builder', 'about', 'settings', 'connecting'].includes(view);
        document.body.classList.toggle('menu-screen', full);
        this.menu.hidden = view === 'playing';
        this.input.setEnabled(view === 'playing');
        if (view !== 'playing') {
            this.started = false; this.audio.setActive(false); this.audio.stopAll();
            this.overviewVisible = false; this.startButton.hidden = true;
            this.world.cancelGrapple(); this.inspector.element.hidden = true;
            this.nativeInspector.element.hidden = true; this.nativeInspectorOpen = false;
        }
    }
    private focusMenu(selector: string): void { this.menu.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true }); }
    private bindBack(): void { this.menu.querySelector('#back-main')?.addEventListener('click', () => this.showHome()); }
    private showHome(): void {
        if (!this.characterReady || this.character.active) return;
        this.setView('home'); this.coopHud.hidden = true;
        const progress = this.store.progress, profile = this.profiles.profile ?? DEFAULT_CHARACTER_PROFILE;
        this.menu.innerHTML = homeMenu(this.store.updatedAt || this.world.elapsed > 0 ? `CONTINUE — ${roomById(progress.currentRoom).title}` : undefined);
        this.menu.style.setProperty('--home-accent', colourHex(profile.colour));
        this.menu.querySelector('#home-profile-name')!.textContent = profile.name;
        this.menu.querySelector('#home-profile-status')!.textContent = this.profiles.persisted ? 'YOUR NINJA' : 'GUEST NINJA · NOT SAVED';
        this.menu.querySelector('#home-progress')!.textContent = `${progress.completedRooms.length} / 4 tutorial rooms complete · ${this.store.status}`;
        this.homePreview = new NinjaPreview(this.menu.querySelector<HTMLCanvasElement>('#home-ninja-preview')!, profile.colour, 'swing');
        this.menu.querySelector('#tutorial')!.addEventListener('click', () => { this.store.save(tutorialProgress(this.store.progress)); this.ended = false; this.loadRoom(); this.resumeRoom(); });
        this.menu.querySelector('#continue')?.addEventListener('click', () => this.resumeRoom());
        this.menu.querySelector('#play-coop')!.addEventListener('click', () => this.showCoopEntry());
        this.menu.querySelector('#level-builder')!.addEventListener('click', () => this.showBuilder());
        this.menu.querySelector('#customize-ninja')!.addEventListener('click', () => this.openCharacter(true));
        this.menu.querySelector('#about')!.addEventListener('click', () => { this.setView('about'); this.menu.innerHTML = aboutMenu(); this.bindBack(); this.focusMenu('#back-main'); });
        this.menu.querySelector('#settings')!.addEventListener('click', () => this.showSettings('home'));
        this.focusMenu('#tutorial');
    }
    private showCoopEntry(): void {
        this.setView('coop');
        const labs = new URL(location.href).searchParams.get('labs') === '1'
            ? `<details class="internal-labs"><summary>INTERNAL REGRESSION ROOMS</summary><div class="coop-labs">${Object.entries(COOP_LABS).map(([id, lab]) => `<div class="coop-lab"><strong>${lab.title}</strong><button ${id === 'pairing-bay' ? 'id="create-room"' : ''} data-create-lab="${id}">CREATE</button></div>`).join('')}</div></details>` : '';
        this.menu.innerHTML = coopMenu(labs); this.bindBack();
        this.menu.querySelector('#create-party')!.addEventListener('click', () => this.enterCoop());
        this.menu.querySelector('#show-join')!.addEventListener('click', () => this.showJoin());
        for (const button of this.menu.querySelectorAll<HTMLButtonElement>('[data-create-lab]')) button.addEventListener('click', () => this.enterCoop(undefined, button.dataset.createLab as CoopLevelId));
        this.focusMenu('#create-party');
    }
    private showJoin(error = ''): void {
        this.setView('join'); this.menu.innerHTML = joinMenu();
        this.menu.querySelector('#join-error')!.textContent = error;
        this.menu.querySelector<HTMLElement>('#join-error')!.hidden = !error;
        this.menu.querySelector('#back-main')!.addEventListener('click', () => this.showCoopEntry());
        this.menu.querySelector('#join-room-form')!.addEventListener('submit', event => {
            event.preventDefault();
            const code = parseJoinInput(this.menu.querySelector<HTMLInputElement>('#join-code')!.value, location.origin);
            if (!code) { this.menu.querySelector<HTMLElement>('#join-error')!.hidden = false; this.menu.querySelector('#join-error')!.textContent = 'Enter a four-character party code or an invitation link from this game.'; return; }
            if (readInvitation(location.href).present) {
                const corrected = new URL(location.href); corrected.searchParams.set('join', code);
                history.replaceState(history.state, '', corrected.href); this.invitation = { present: true, code };
            }
            if (this.coop.active && this.coop.targetCode !== code) {
                this.invitation = { present: true, code }; this.acceptInvitation();
            } else this.enterCoop(code);
        });
        this.focusMenu('#join-code');
    }
    private showBuilder(): void {
        this.setView('builder'); this.menu.innerHTML = builderMenu(); this.bindBack();
        const builderUrl = import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
            ? import.meta.env.VITE_WORKBENCH_URL ?? '/workbench.html' : '/workbench.html';
        for (const [selector, url, name] of [['#open-workbench', builderUrl, 'Level Builder'], ['#my-levels', '/my-levels.html', 'My Levels']]) {
            const link = this.menu.querySelector<HTMLAnchorElement>(selector)!; link.href = url;
            link.addEventListener('click', async event => {
                event.preventDefault(); if (link.getAttribute('aria-disabled') === 'true') return;
                link.setAttribute('aria-disabled', 'true');
                try { if (await this.store.flush() || confirm(`${this.store.status}. Open ${name} and leave this unsaved progress?`)) location.assign(url); }
                finally { link.removeAttribute('aria-disabled'); }
            });
        }
        this.focusMenu('#open-workbench');
    }
    private showSettings(from: 'home' | 'pause'): void {
        this.settingsReturn = from; this.setView('settings');
        const reset = `<div class="progress-reset"><button id="reset-progress" ${!this.store.ready || this.store.conflict ? 'disabled' : ''}>Reset all progress…</button>
            <p id="settings-save-status" role="status"></p><button id="retry-save">Reload saved progress</button>
            <div id="reset-confirmation" role="group" aria-labelledby="reset-question" hidden><p id="reset-question">Reset every tutorial room and return to PRESSURE?</p>
            <p class="fine">This clears tutorial checkpoints, completed rooms, discovered mechanics and activity. This cannot be undone. Your ninja and co-op progress stay saved.</p>
            <div class="reset-actions"><button id="cancel-reset">Cancel</button><button id="confirm-reset" class="danger">Reset all progress</button></div></div></div>`;
        const developer = new URL(location.href).searchParams.has('debug') || new URL(location.href).searchParams.get('labs') === '1';
        const rooms = developer ? `<details class="internal-labs"><summary>DEVELOPER / ROOM SELECT</summary><nav class="level-select">${ROOMS.map(r => `<button data-room="${r.id}">${r.title}</button>`).join('')}</nav></details>` : '';
        this.menu.innerHTML = settingsMenu(this.audioMenu(), reset, rooms); this.bindAudio();
        this.menu.querySelector('#settings-save-status')!.textContent = this.store.status;
        this.menu.querySelector('#back-main')!.addEventListener('click', () => from === 'pause' ? this.showMenu() : this.showHome());
        this.menu.querySelector('#retry-save')!.addEventListener('click', async () => { await this.store.flush(); if (await this.store.load()) { this.store.conflict = false; this.loadRoom(); } this.showSettings(from); });
        const button = this.menu.querySelector<HTMLButtonElement>('#reset-progress')!, confirmation = this.menu.querySelector<HTMLElement>('#reset-confirmation')!;
        button.addEventListener('click', () => { button.hidden = true; confirmation.hidden = false; this.focusMenu('#cancel-reset'); });
        this.menu.querySelector('#cancel-reset')!.addEventListener('click', () => { confirmation.hidden = true; button.hidden = false; button.focus(); });
        this.menu.querySelector('#confirm-reset')!.addEventListener('click', () => {
            if (!this.store.ready || this.store.conflict) return;
            this.store.save(freshProgress()); this.ended = false; this.loadRoom(); this.showSettings(from);
        });
        for (const button of this.menu.querySelectorAll<HTMLButtonElement>('[data-room]')) button.addEventListener('click', () => {
            this.save([]); const p = this.store.progress; p.currentRoom = button.dataset.room as typeof p.currentRoom;
            this.store.save(p); this.ended = false; this.loadRoom(); this.resumeRoom();
        });
        this.focusMenu('#back-main');
    }
    private showMenu(): void {
        if (!this.characterReady || this.character.active) return;
        if (this.coopMode) { this.showCoopMenu(); return; }
        if (this.view === 'home') return;
        void this.store.flush();
        if (this.ended) {
            this.setView('victory');
            this.menu.innerHTML = '<div class="menu-card pause-card"><span class="eyebrow">TUTORIAL COMPLETE</span><h2>Control Spine cleared.</h2><p>Ready to team up? Five cooperative chambers await.</p><button id="main-menu" class="primary">MAIN MENU</button><button id="play-coop">PLAY CO-OP</button></div>';
            this.menu.querySelector('#main-menu')!.addEventListener('click', () => this.showHome());
            this.menu.querySelector('#play-coop')!.addEventListener('click', () => this.showCoopEntry());
            this.focusMenu('#main-menu'); return;
        }
        this.setView('pause'); this.menu.innerHTML = soloPauseMenu(this.world.room.title, this.audioMenu()); this.bindAudio();
        this.menu.querySelector('#continue')!.addEventListener('click', () => this.resumeRoom());
        this.menu.querySelector('#restart-room')!.addEventListener('click', () => { this.store.save(restartRoomProgress(this.store.progress)); this.loadRoom(); this.resumeRoom(); });
        this.menu.querySelector('#main-menu')!.addEventListener('click', () => { void this.store.flush(); this.showHome(); });
        this.focusMenu('#continue');
    }
    private escapeMenu(): void {
        if (this.character.active) { this.menu.querySelector<HTMLButtonElement>('#cancel-character')?.click(); return; }
        if (this.menu.querySelector('#reset-confirmation:not([hidden])')) { this.menu.querySelector<HTMLButtonElement>('#cancel-reset')!.click(); return; }
        if (this.view === 'pause' || this.view === 'coop-pause') this.resumeRoom();
        else if (this.view === 'join') this.showCoopEntry();
        else if (this.view === 'settings') this.settingsReturn === 'pause' ? this.showMenu() : this.showHome();
        else if (['coop', 'builder', 'about'].includes(this.view)) this.showHome();
    }
    private audioMenu(): string {
        return `<fieldset class="audio-settings"><legend>SOUND</legend>
        <button id="audio-mute" type="button" aria-pressed="${this.audio.getPreferences().muted}">${this.audio.getPreferences().muted ? 'Sound off' : 'Sound on'}</button>
        <label for="audio-volume">Effects <output id="audio-volume-value">${Math.round(this.audio.getPreferences().volume * 100)}%</output></label>
        <input id="audio-volume" type="range" min="0" max="100" value="${Math.round(this.audio.getPreferences().volume * 100)}">
        <label for="music-volume">Music <output id="music-volume-value">${Math.round(this.audio.getPreferences().musicVolume * 100)}%</output></label>
        <input id="music-volume" type="range" min="0" max="100" value="${Math.round(this.audio.getPreferences().musicVolume * 100)}">
      </fieldset>`;
    }
    private bindAudio(): void {
        this.menu.querySelector<HTMLButtonElement>('#audio-mute')!.addEventListener('click', e => {
            this.audio.setPreferences({ muted: !this.audio.getPreferences().muted });
            this.music.setPreferences(this.audio.getPreferences());
            const button = e.currentTarget as HTMLButtonElement;
            button.textContent = this.audio.getPreferences().muted ? 'Sound off' : 'Sound on';
            button.setAttribute('aria-pressed', String(this.audio.getPreferences().muted));
        });
        this.menu.querySelector<HTMLInputElement>('#audio-volume')!.addEventListener('input', e => {
            const value = (e.currentTarget as HTMLInputElement).valueAsNumber;
            this.audio.setPreferences({ volume: value / 100 });
            this.music.setPreferences(this.audio.getPreferences());
            this.menu.querySelector('#audio-volume-value')!.textContent = `${value}%`;
        });
        this.menu.querySelector<HTMLInputElement>('#music-volume')!.addEventListener('input', e => {
            const value = (e.currentTarget as HTMLInputElement).valueAsNumber;
            this.audio.setPreferences({ musicVolume: value / 100 });
            this.music.setPreferences(this.audio.getPreferences());
            this.menu.querySelector('#music-volume-value')!.textContent = `${value}%`;
        });
    }
    private completionSound(): void {
        this.completionMusicUntil = performance.now() + this.audio.completionDurationMs();
        this.music.setDucked('complete');
        this.audio.play('complete');
    }
    /** Scene identity depends on navigation/chamber, never on replicated frame revisions. */
    private syncMusic(): void {
        const room = this.coopMode ? this.coop.room ?? this.authority?.room ?? null : null;
        const chamber = !!room && room.party?.phase !== 'lobby';
        const solo = !this.coopMode && (['playing', 'pause', 'victory'].includes(this.view)
            || this.view === 'settings' && this.settingsReturn === 'pause');
        this.music.setScene(chamber ? musicSceneForRoom(room.level) : solo ? musicSceneForRoom(this.world.room.id) : 'menu');
        this.music.setDucked(performance.now() < this.completionMusicUntil ? 'complete'
            : (solo || chamber) && !this.started ? 'pause' : solo ? 'tutorial' : 'none');
    }
    private resumeRoom(): void {
        if (this.coopMode) {
            if (!this.coop.playing) return;
            this.coopPaused = false; this.partyMenuKey = ''; this.partyView = 'pause'; this.started = !this.overviewPending;
            this.overviewVisible = this.overviewPending; this.startButton.hidden = !this.overviewVisible;
            this.setView('playing'); this.coopHud.hidden = false; this.input.releaseAll(); this.input.clearActions(); this.canvas.focus(); return;
        }
        if (this.ended) {
            this.loadRoom();
            this.ended = false;
        }
        this.started = !this.overviewPending;
        this.overviewVisible = this.overviewPending;
        this.startButton.hidden = !this.overviewVisible;
        this.setView('playing');
        this.input.releaseAll(); this.input.clearActions();
        if (this.overviewVisible) this.startButton.focus();
        else this.canvas.focus();
    }
    private save(events: string[]): void {
        const p = this.store.progress, id = this.world.room.id;
        if (isCoopLevel(id) || id === 'workbench') return;
        p.rooms[id] = this.world.memory();
        for (const event of events) {
            if (!p.mechanics.includes(event) && event !== 'death')
                p.mechanics.push(event);
            p.history.push({ room: id, event, at: new Date().toISOString() });
        }
        p.history = p.history.slice(-40);
        this.store.save(p);
    }
    private advance(): void {
        const p = this.store.progress, id = this.world.room.id, index = ROOMS.findIndex(r => r.id === id);
        if (isCoopLevel(id) || id === 'workbench') return;
        if (!p.completedRooms.includes(id))
            p.completedRooms.push(id);
        if (index < ROOMS.length - 1) {
            p.currentRoom = ROOMS[index + 1].id;
            this.store.save(p);
            this.loadRoom();
            this.resumeRoom();
        }
        else {
            this.store.save(p);
            this.ended = true;
            this.showMenu();
        }
    }
    snapshot() {
        return { view: this.view, switchOnboarding: this.renderer.switchOnboarding.snapshot(), character: { profile: this.profiles.profile, persisted: this.profiles.persisted, ready: this.characterReady, editing: this.character.active }, room: this.world.room.id, player: this.world.player, cube: this.world.cube, cubes: this.world.cubes, inputs: this.world.inputs, outputs: this.world.frame.outputs,
            multiplayer: this.coopMode ? { ...this.coop.diagnostics(), ...this.supportDiagnostics(), shared: this.coop.room, remote: this.coop.remote.sample(performance.now()) } : null,
            source: this.world.frame.source, signals: this.world.frame.signals, controllerStatus: this.coopMode ? this.renderer.nativeWorld.state ? 'server-authoritative native-verified lookup / static world excerpts' : 'authored mock multiplayer controller' : undefined, evidence: this.world.frame.evidence, trace: this.renderer.replay.snapshot(), stringPresentation: this.world.room.id === 'uplink' ? 'authored single-byte XOR presentation / not OLLVM evidence' : 'authored mock text', platforms: this.world.platforms.map(p => ({ id: p.def.id, signal: p.def.signal, assemblyBinding: p.def.assemblyBinding, manifestation: p.def.label, enabled: p.solid.enabled, grappleable: p.solid.grappleable, fuse: p.fuse, respawn: p.respawn, evidenceId: p.def.evidenceId })),
            lifts: this.world.lifts.map(l => ({ id: l.def.id, enabled: l.enabled })),
            gates: this.world.gates.map(g => ({ id: g.def.id, enabled: g.enabled, playerCooldown: g.cooldown('player'), cubeCooldown: g.cooldown('cube') })),
            cubeTransferred: this.world.cubeTransferred,
            firewalls: this.world.firewalls.map(f => ({ id: f.def.id, ...f.box })), lastDeath: this.world.lastDeath, cubeResetting: this.world.cubeResetting, resettingCubes: cubeEntries(this.world.cubes).filter(([id]) => this.world.cubeIsResetting(id)).map(([id]) => id),
            connections: this.renderer.connections.map(c => ({ id: c.id, input: c.input, output: c.output, powered: connectionPowered(c, this.world) })),
            checkpoint: this.world.checkpoint, deaths: this.world.deaths, pullingCube: this.world.pullingCube, keyboardGrapple: this.world.keyboardGrapple, ended: this.ended, started: this.started, overviewVisible: this.overviewVisible,
            audio: this.audio.snapshot(), music: this.music.snapshot(),
            heroAssets: this.renderer.heroes.snapshot(),
            nativeWorld: { ...this.renderer.nativeWorld.snapshot(), panels: this.renderer.nativeWorldDisplay.panels },
            raceCargo: this.renderer.raceCargoDisplay.diagnostic,
            raceMachinery: this.renderer.raceMachineryDisplay.diagnostic,
            environmentalAssembly: this.renderer.environmentalDisplay.diagnostic,
            camera: { ...this.renderer.cameraReveals.selection, x: this.renderer.camera.x, y: this.renderer.camera.y, zoom: this.renderer.camera.zoom },
            progress: this.store.progress, persistence: { status: this.store.status, visitor: this.store.visitor, revision: this.store.revision, updatedAt: this.store.updatedAt } };
    }
    private supportDiagnostics() {
        const support = this.world.partnerCubeSupport;
        return { partnerCubeSupportActive: !!support, supportCubeId: support?.cubeId ?? null, supportCarrierSlot: support?.carrier ?? null,
            supportPosition: support ? { x: support.surface.x, y: support.surface.y } : null,
            groundedOnPartnerCube: this.world.groundedOnPartnerCube };
    }
    private frame(now: number): void {
        const dt = Math.min(MAX_FRAME_TIME, this.last ? (now - this.last) / 1000 : 0);
        this.last = now;
        if (this.input.takeAction('debug'))
            this.debug = !this.debug;
        if (this.input.takeAction('escape')) {
            if (!this.menu.hidden) this.escapeMenu();
            else if (!this.inspector.element.hidden || this.nativeInspectorOpen) this.closeInspector();
            else if (this.started || this.overviewVisible) this.showMenu();
        }
        if (this.started && this.input.takeAction('reset'))
            this.world.respawn();
        const aim = this.renderer.camera.screenToWorld(this.input.screenAim.x, this.input.screenAim.y);
        this.input.sync(aim);
        if (this.overviewVisible && this.inspector.element.hidden) {
            const edges = this.input.takeEdges();
            if (edges.airGrapple || edges.jump) this.startButton.click();
        }
        const audible = this.started && !document.hidden && document.hasFocus();
        this.audio.setActive(audible);
        if (this.started) {
            this.accumulated += dt;
            while (this.accumulated >= FIXED_DT) {
                const e = this.input.takeEdges();
                this.input.state.jumpPressed = e.jump;
                this.input.state.airGrapplePressed = e.airGrapple;
                this.input.state.grapplePressed = e.grapple;
                this.world.step(FIXED_DT, this.input.state, e.interact);
                this.accumulated -= FIXED_DT;
                const events = this.world.events.splice(0);
                this.sound.observe(this.world, events);
                for (const event of events) {
                    if (event.kind === 'crumble')
                        this.renderer.particles.shatter(event.at.x, event.at.y, 140, 32, '#f9ba68');
                    else if (event.cause === 'firewall' || event.kind === 'cube-firewall')
                        this.renderer.particles.burst(event.at.x, event.at.y, 14, '#ff943e', 170);
                    else
                        this.renderer.particles.burst(event.at.x, event.at.y, 10, '#64e6d5', 120);
                }
                const memory = JSON.stringify(this.world.memory());
                if (!this.coopMode && (events.length || memory !== this.memory)) {
                    this.memory = memory;
                    this.save(events.map(e => e.kind));
                }
                if (this.world.exited) {
                    this.advance();
                    if (audible) this.completionSound();
                    break;
                }
            }
        }
        else
            this.accumulated = 0;
        this.sound.ambience(this.world, this.started && !document.hidden && document.hasFocus());
        this.audio.meter();
        this.syncMusic();
        if (this.coopMode && this.coop.playing) {
            this.world.syncAuthority();
            this.sound.observe(this.world, this.coop.takeMachineryEvents());
            this.coop.publish(this.world.player, now);
            for (const [id, cube] of cubeEntries(this.world.cubes)) if (!this.world.cubeIsResetting(id)) this.coop.publishCube(cube, now, id);
        }
        this.renderer.nativeWorld.update(this.coopMode ? this.coop.room : null, this.coop.connected);
        this.renderer.raceCargo.update(this.coopMode ? this.coop.room : null, this.coop.connected, this.coop.roomReceivedAt);
        this.renderer.raceMachinery.update(this.coopMode ? this.coop.room : null, this.coop.connected, this.coop.roomReceivedAt);
        this.renderer.environmental.update(this.coopMode ? this.coop.room : null, this.coop.connected, this.coop.roomReceivedAt);
        if (this.nativeInspectorOpen) { const v = nativeInspectorView(this.coop.room, this.renderer.raceCargo, this.renderer.raceMachinery, this.renderer.environmental); if (v) this.nativeInspector.update(v); }
        const heroCues = this.renderer.draw(this.world, dt, aim, this.input.overviewHeld || this.overviewVisible,
            this.coopMode && this.coop.slot ? { localSlot: this.coop.slot, profiles: this.coop.room?.profiles, connected: this.coop.connected, remote: this.coop.remote.sample(now),
                reachedExit: this.coop.room?.reachedExit ?? [false, false], completed: this.coop.room?.completed ?? false,
                remotePullingCubes: cubeEntries(this.coop.room?.cubes ?? {}).filter(([id, c]) => c.pulling && !this.coop.ownsCubeFor(id)).map(([id]) => id) } : undefined, this.started);
        for (const { cue, at } of heroCues) this.audio.play(cue, Math.max(0, 1 - Math.hypot(at.x - this.world.player.x, at.y - this.world.player.y) / 1100));
        this.coopHud.classList.toggle('camera-reveal', this.coopMode && this.renderer.cameraReveals.selection.kind !== 'follow');
        this.inspector.update(this.renderer.replay);
        const replay = this.renderer.replay;
        if (replay.trace) {
            if (this.traceId !== replay.trace.id) {
                this.traceId = replay.trace.id;
                this.traceCommits.replaceChildren(...replay.trace.semantic_events.map(e => {
                    const node = document.createElement('span');
                    node.textContent = `${e.output} ← ${e.value}`;
                    node.title = `${e.id} · step ${e.step_index} · ${e.raw_occurrence_id}`;
                    return node;
                }));
            }
            this.traceLabel.textContent = `RETAINED ${replay.trace.id} · ${replay.step + 1}/${replay.trace.instruction_count} · ${replay.occurrence ? `${replay.occurrence.block_id} visit ${replay.occurrence.visit_number}` : 'linked helper'} | outputs immediate · strings authored`;
            [...this.traceCommits.children].forEach((node, index) => node.classList.toggle('committed', replay.trace!.semantic_events[index].step_index <= replay.step));
        }
        if (this.view === 'home') {
            const summary = this.menu.querySelector('#home-progress');
            const text = `${this.store.progress.completedRooms.length} / 4 tutorial rooms complete · ${this.store.status}`;
            if (summary && summary.textContent !== text) summary.textContent = text;
        }
        this.status.textContent = this.coopMode ? `${this.coop.status} · CO-OP SESSION` : `${this.store.status}${this.characterReady && !this.profiles.persisted ? ' · GUEST NINJA NOT SAVED' : ''}`;
        this.debugView.hidden = !this.debug;
        document.querySelector<HTMLElement>('#return-cube')!.hidden = this.coopMode;
        this.traceView.hidden = this.world.room.id !== 'uplink' || !this.debug;
        if (this.debug)
            this.debugView.querySelector('pre')!.textContent = JSON.stringify(this.coopMode
                ? { controller: 'mock multiplayer controller / binary integration pending', signals: this.world.frame.signals, multiplayer: { ...this.coop.diagnostics(), ...this.supportDiagnostics() }, checkpoint: this.coop.room?.checkpoint, completed: this.coop.room?.completed,
                    player: { x: this.world.player.x, y: this.world.player.y, rope: this.world.player.rope.phase },
                    firewalls: this.world.firewalls, lastDeath: this.world.lastDeath }
                : this.snapshot(), null, 2);
        requestAnimationFrame(t => this.frame(t));
    }
}
