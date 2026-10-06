import { EvidenceInspector } from './evidence-inspector.ts';
import { FIXED_DT, MAX_FRAME_TIME } from '../engine/constants.ts';
import { InputManager } from '../ui/input.ts';
import { PuzzleRenderer } from './render.ts';
import { PuzzleWorld } from './world.ts';
import { ROOMS, roomById } from './rooms.ts';
import { freshProgress } from './progress.ts';
import { ProgressStore } from './storage.ts';
import { connectionPowered } from './connections.ts';
import { GameAudio } from '../audio/game-audio.ts';
import { AudioPresentation } from './audio-presentation.ts';
import { CoopClient } from '../coop/client.ts';
import { PairingAuthority } from '../coop/authority.ts';
import { SharedCubeAuthority } from '../coop/cube.ts';
import { pairingBay } from '../coop/pairing-bay.ts';
import { normalizeCode, type SharedRoom } from '../coop/protocol.ts';
export class SliceGame {
    store = new ProgressStore();
    world = new PuzzleWorld(ROOMS[0], freshProgress().rooms.pressure);
    renderer: PuzzleRenderer;
    input = new InputManager(true);
    audio = new GameAudio();
    private sound = new AudioPresentation(this.audio);
    started = false;
    overviewVisible = false;
    private overviewPending = false;
    private startButton = document.querySelector<HTMLButtonElement>('#start-room')!;
    ended = false;
    debug = false;
    private inspector: EvidenceInspector;
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
    private authority: PairingAuthority | null = null;
    private coopHud = document.createElement('aside');
    constructor(readonly host: HTMLElement, readonly canvas: HTMLCanvasElement) {
        const unlock = () => { void this.audio.unlock(); };
        // Also stop a completion chime that is allowed on the already-paused menu.
        const silence = () => { this.audio.setActive(false); this.audio.stopAll(); };
        document.addEventListener('pointerdown', unlock, { capture: true, passive: true });
        document.addEventListener('keydown', unlock, { capture: true });
        this.sound.reset(this.world);
        this.traceView.append(this.traceLabel, this.traceCommits);
        this.traceCommits.className = 'trace-commits';
        this.renderer = new PuzzleRenderer(canvas);
        this.inspector = new EvidenceInspector(() => this.closeInspector(), show => { this.renderer.revealBogus = show; });
        this.evidenceButton.addEventListener('click', () => {
            if (!this.inspector.element.hidden) { this.closeInspector(); return; }
            this.resumeAfterInspector = this.started; this.started = false;
            this.audio.setActive(false);
            this.world.cancelGrapple(); this.input.releaseAll();
            this.inspector.element.hidden = false;
        });
        this.renderer.room(this.world);
        this.input.attach(canvas, host);
        this.menu = document.querySelector('#menu')!;
        this.debugView = document.querySelector('#debug')!;
        this.status = document.querySelector('#save-status')!;
        this.roomTitle = document.querySelector('#room-title')!;
        this.coopHud.id = 'coop-hud'; this.coopHud.hidden = true;
        this.coopHud.setAttribute('aria-label', 'Co-op session'); host.appendChild(this.coopHud);
        document.querySelector('#pause')!.addEventListener('click', () => this.showMenu());
        this.startButton.addEventListener('click', () => {
            if (!this.overviewVisible || !this.inspector.element.hidden || !this.menu.hidden) return;
            this.overviewPending = false;
            this.overviewVisible = false;
            this.startButton.hidden = true;
            this.started = true;
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
        window.addEventListener('pagehide', () => { silence(); void this.store.flush(); this.coop.leave(false); });
        window.addEventListener('pageshow', event => {
            if (event.persisted && this.coopMode) {
                const code = this.coop.remembered();
                if (code) this.enterCoop(code); else this.leaveCoop();
            }
        });
    }
    async start(): Promise<void> {
        requestAnimationFrame(t => this.frame(t));
        await this.store.load();
        this.loadRoom();
        this.showMenu();
        const code = this.coop.remembered();
        if (code) this.enterCoop(code);
    }
    private enterCoop(code?: string): void {
        this.started = false; this.coopMode = true; this.coopPaused = false; this.authority = null;
        this.overviewVisible = false; this.overviewPending = false; this.startButton.hidden = true;
        this.inspector.element.hidden = true; this.evidenceButton.hidden = true;
        this.menu.hidden = true; this.input.releaseAll(); this.world.cancelGrapple();
        this.coopHud.hidden = false; this.coop.start(code);
        this.host.classList.add('coop-mode');
    }
    private applyCoop(room: SharedRoom, initial: boolean): void {
        if (!this.coopMode || !this.coop.slot) return;
        if (initial) {
            this.authority = new PairingAuthority(room, this.coop.slot, plate => this.coop.occupy(plate), () => this.coop.switchB(), () => this.coop.reachExit(), new SharedCubeAuthority(this.coop), this.coop.prediction);
            this.world = new PuzzleWorld(pairingBay(this.coop.slot), { switchB: room.inputs.switchB, cubeOnPlate: false, cubeOnPlateB: false,
                checkpoint: this.authority.checkpoint }, undefined, this.authority);
            this.renderer.room(this.world); this.sound.reset(this.world);
            this.input.releaseAll(); this.accumulated = 0;
            this.roomTitle.textContent = 'CO-OP / PAIRING BAY'; this.sourceBadge.textContent = 'mock-multiplayer';
            this.started = !this.coopPaused; this.canvas.focus();
            this.audio.setActive(this.started && !document.hidden && document.hasFocus());
            this.audio.play('latch', .45);
        } else if (this.authority) {
            const previous = this.authority.room;
            const switchWasVisible = this.world.inputs.switchB;
            this.authority.room = room; this.world.syncAuthority();
            const events = this.world.events.splice(0);
            if (!switchWasVisible && room.inputs.switchB) events.push({ kind: 'switch', at: this.world.room.lever! });
            this.sound.observe(this.world, events);
            if (!previous.completed && room.completed) this.audio.play('complete');
            else if (room.reachedExit.some((arrived, i) => arrived && !previous.reachedExit[i])) this.audio.play('latch', .35);
        }
    }
    private coopStatus(): void {
        if (!this.coopMode) return;
        if (!this.coop.connected) { this.started = false; this.world.cancelGrapple(); this.world.syncAuthority(); this.sound.reset(this.world); this.input.releaseAll(); }
        const r = this.coop.room;
        const slots = r ? r.connected.map((on, i) => `PLAYER ${i + 1}   ${on ? 'CONNECTED' : r.assigned[i] ? 'DISCONNECTED' : 'WAITING FOR PARTNER'}${r.reachedExit[i] ? ' · ARRIVED' : ''}`).join('\n') : '';
        const partner = r && this.coop.slot ? this.coop.slot === 1 ? 1 : 0 : 1;
        const status = !this.coop.connected ? this.coop.status
            : r && !r.connected[partner] ? r.assigned[partner] ? 'PARTNER DISCONNECTED' : 'WAITING FOR PARTNER'
            : r?.completed ? 'PAIRING COMPLETE'
            : r?.exitUnlocked ? 'EXIT UNLOCKED · REGROUP'
            : 'PARTNER CONNECTED · PLAY TOGETHER';
        this.coopHud.replaceChildren();
        const label = document.createElement('small'); label.textContent = 'PAIRING BAY / ROOM CODE';
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
        const who = document.createElement('span'); who.textContent = this.coop.slot ? `YOU — PLAYER ${this.coop.slot}` : 'CONNECTING TO SESSION';
        const list = document.createElement('pre'); list.textContent = slots;
        const state = document.createElement('b'); state.id = 'coop-state'; state.setAttribute('role', 'status'); state.textContent = status;
        this.coopHud.append(label, codeRow, copied, who, list, state);
        if (r?.exitUnlocked) {
            const arrivals = document.createElement('small'); arrivals.id = 'exit-arrivals'; arrivals.setAttribute('role', 'status');
            arrivals.textContent = `EXIT · ${r.reachedExit.filter(Boolean).length} / 2 ARRIVED${r.completed ? '' : ' · BOTH PLAYERS REQUIRED'}`;
            this.coopHud.append(arrivals);
        }
        if (!this.coop.active) {
            const back = document.createElement('button'); back.textContent = 'Back to menu'; back.onclick = () => this.leaveCoop(); this.coopHud.append(back);
        }
    }
    private leaveCoop(): void {
        this.coop.leave(); this.coopMode = false; this.coopPaused = false; this.coopHud.hidden = true; this.authority = null;
        this.host.classList.remove('coop-mode');
        this.ended = false; this.loadRoom(); this.showMenu();
    }
    private showCoopMenu(): void {
        this.coopPaused = true; this.started = false; this.coop.occupy(null);
        this.audio.setActive(false); this.world.cancelGrapple(); this.input.releaseAll();
        this.menu.hidden = false;
        this.menu.innerHTML = `<div class="menu-card"><span class="eyebrow">CO-OP / MOCK TEST CHAMBER</span><h2>PAIRING BAY</h2><p>Room ${this.coop.room?.code ?? 'connecting'} · You are Player ${this.coop.slot ?? '…'}</p><p>Your slot and shared checkpoint stay saved when you leave.</p><button id="continue" class="primary">CONTINUE PAIRING BAY</button><button id="leave-coop">LEAVE ROOM / SINGLE PLAYER</button><p class="fine">A / D move · Space jump · E switch<br>Hold click + D to cross · R shared checkpoint</p></div>`;
        this.menu.querySelector('#continue')!.addEventListener('click', () => this.resumeRoom());
        this.menu.querySelector('#leave-coop')!.addEventListener('click', () => this.leaveCoop());
        this.menu.querySelector<HTMLButtonElement>('#continue')!.focus();
    }
    private closeInspector(): void {
        this.inspector.element.hidden = true; this.started = this.resumeAfterInspector;
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
        this.renderer.room(this.world);
        this.sourceBadge.textContent = this.world.frame.source;
        this.evidenceButton.hidden = id !== 'uplink';
        this.traceView.hidden = id !== 'uplink' || !this.debug;
        this.memory = JSON.stringify(this.world.memory());
        this.input.releaseAll();
        this.accumulated = 0;
        this.roomTitle.textContent = `0${ROOMS.findIndex(r => r.id === id) + 1} / ${roomById(id).title}`;
    }
    private showMenu(): void {
        if (this.coopMode) { this.showCoopMenu(); return; }
        this.started = false;
        this.audio.setActive(false);
        this.overviewVisible = false;
        this.startButton.hidden = true;
        this.inspector.element.hidden = true;
        this.world.cancelGrapple();
        this.input.releaseAll();
        this.menu.hidden = false;
        const p = this.store.progress, saved = this.store.updatedAt;
        this.menu.innerHTML = `<div class="menu-card"><span class="eyebrow">BINARY NINJA / CAMPAIGN + CO-OP</span>
      <h2>${this.ended ? 'Control Spine complete.' : 'Small inputs.<br>Big changes.'}</h2>
      <p>${this.ended ? p.completedRooms.length === ROOMS.length ? 'Four rooms explored. Ready for a human playtest.' : 'Choose another room, or revisit this chamber.' : 'Three tutorials. One bigger puzzle.<br>Route the payload to the core node.'}</p>
      <div class="save-summary"><span>${saved ? 'RETURNING VISITOR' : 'YOUR PROGRESS'}</span><strong>${roomById(p.currentRoom).title} · ${p.completedRooms.length} / ${ROOMS.length} rooms complete</strong><small>${saved ? `Server save · ${new Date(saved).toLocaleString()}` : this.store.status}</small></div>
      <button id="continue" class="primary">${!this.store.ready ? 'PLAY UNSAVED —' : this.ended ? 'REVISIT' : saved || this.world.elapsed > 0 ? 'CONTINUE —' : 'START —'} ${roomById(p.currentRoom).title}</button>
      ${!this.store.ready ? '<button id="retry-save">Retry save connection</button>' : ''}
      <nav class="level-select" aria-label="Level select">
        <span class="eyebrow">SINGLE PLAYER / CHOOSE A ROOM</span>
        <div class="level-grid">${ROOMS.map((room, index) => `<button data-room="${room.id}" ${room.id === p.currentRoom ? 'aria-current="true"' : ''}><strong>0${index + 1} / ${room.title}</strong><small>${room.id === p.currentRoom ? 'CURRENT' : p.completedRooms.includes(room.id) ? 'COMPLETE' : 'PLAY'}</small></button>`).join('')}</div>
        <small>All rooms available · keeps each room’s saved progress</small>
      </nav>
      <section class="coop-entry" aria-label="Co-op">
        <span class="eyebrow">CO-OP / PAIRING BAY</span>
        <p class="fine">Two players. One shared chamber. Mock test controller.</p>
        <button id="create-room">CREATE ROOM</button>
        <form id="join-room-form"><label for="join-code">ROOM CODE</label><input id="join-code" name="code" maxlength="8" placeholder="7K3M" autocomplete="off" autocapitalize="characters" spellcheck="false" required><button id="join-room" type="submit">JOIN ROOM</button></form>
        <p id="join-error" role="status"></p>
      </section>
      <div class="progress-reset">
        <button id="reset-progress" ${!this.store.ready || this.store.conflict ? 'disabled' : ''}>Reset all progress…</button>
        ${!this.store.ready ? '<small>Connect to the save server to reset saved progress.</small>' : this.store.conflict ? '<small>Reload the latest save before resetting progress.</small>' : ''}
        <div id="reset-confirmation" role="group" aria-labelledby="reset-question" hidden>
          <p id="reset-question">Reset every room and return to PRESSURE?</p>
          <p class="fine">This clears all checkpoints, completed rooms, discovered mechanics and activity. This cannot be undone.</p>
          <div class="reset-actions"><button id="cancel-reset">Cancel</button><button id="confirm-reset" class="danger">Reset all progress</button></div>
        </div>
      </div>
      <fieldset class="audio-settings"><legend>SOUND</legend>
        <button id="audio-mute" type="button" aria-pressed="${this.audio.getPreferences().muted}">${this.audio.getPreferences().muted ? 'Sound off' : 'Sound on'}</button>
        <label for="audio-volume">Volume <output id="audio-volume-value">${Math.round(this.audio.getPreferences().volume * 100)}%</output></label>
        <input id="audio-volume" type="range" min="0" max="100" value="${Math.round(this.audio.getPreferences().volume * 100)}">
      </fieldset>
      <p class="fine">A / D move · Space jump · E interact<br>Airborne Space: hook · Attached Space: jump off<br>Hold click also hooks · R checkpoint · Tab overview</p>
      <p class="prototype-note">CONTROL SPINE: validated OLLVM controller + real assembly.<br>Its strings use authored single-byte XOR; tutorials remain mock.<br>Platform physics and crumble timing are game abstractions.</p></div>`;
        this.menu.querySelector<HTMLButtonElement>('#continue')!.focus({ preventScroll: true });
        this.menu.querySelector('#create-room')!.addEventListener('click', () => this.enterCoop());
        this.menu.querySelector('#join-room-form')!.addEventListener('submit', event => {
            event.preventDefault();
            const code = normalizeCode(this.menu.querySelector<HTMLInputElement>('#join-code')!.value);
            if (!code) { this.menu.querySelector('#join-error')!.textContent = 'ENTER A FOUR-CHARACTER ROOM CODE'; return; }
            this.enterCoop(code);
        });
        this.menu.querySelector<HTMLButtonElement>('#audio-mute')!.addEventListener('click', e => {
            this.audio.setPreferences({ muted: !this.audio.getPreferences().muted });
            const button = e.currentTarget as HTMLButtonElement;
            button.textContent = this.audio.getPreferences().muted ? 'Sound off' : 'Sound on';
            button.setAttribute('aria-pressed', String(this.audio.getPreferences().muted));
        });
        this.menu.querySelector<HTMLInputElement>('#audio-volume')!.addEventListener('input', e => {
            const value = (e.currentTarget as HTMLInputElement).valueAsNumber;
            this.audio.setPreferences({ volume: value / 100 });
            this.menu.querySelector('#audio-volume-value')!.textContent = `${value}%`;
        });
        this.menu.querySelector('#continue')!.addEventListener('click', () => this.resumeRoom());
        for (const button of this.menu.querySelectorAll<HTMLButtonElement>('[data-room]')) {
            button.addEventListener('click', () => {
                const room = ROOMS.find(r => r.id === button.dataset.room);
                if (!room) return;
                if (room.id !== this.world.room.id) {
                    // Save logical state before switching. Merely visiting never completes a room.
                    if (this.world.room.id !== 'pairing-bay') p.rooms[this.world.room.id] = this.world.memory();
                    p.currentRoom = room.id;
                    this.store.save(p);
                    this.ended = false;
                    this.loadRoom();
                }
                this.resumeRoom();
            });
        }
        this.menu.querySelector('#retry-save')?.addEventListener('click', async () => { await this.store.load(); this.loadRoom(); this.showMenu(); });
        const reset = this.menu.querySelector<HTMLButtonElement>('#reset-progress')!;
        const confirmation = this.menu.querySelector<HTMLElement>('#reset-confirmation')!;
        const cancel = this.menu.querySelector<HTMLButtonElement>('#cancel-reset')!;
        reset.addEventListener('click', () => {
            reset.hidden = true;
            confirmation.hidden = false;
            cancel.focus();
        });
        cancel.addEventListener('click', () => {
            confirmation.hidden = true;
            reset.hidden = false;
            reset.focus();
        });
        this.menu.querySelector('#confirm-reset')!.addEventListener('click', () => {
            // Use the normal revision-aware save queue, preserving visitor identity.
            if (!this.store.ready || this.store.conflict) { this.showMenu(); return; }
            this.store.save(freshProgress());
            this.ended = false;
            this.input.clearActions();
            this.loadRoom();
            this.showMenu();
        });
    }
    private resumeRoom(): void {
        if (this.coopMode) {
            this.coopPaused = false; this.started = this.coop.connected; this.menu.hidden = true; this.input.releaseAll(); this.canvas.focus(); return;
        }
        if (this.ended) {
            this.loadRoom();
            this.ended = false;
        }
        this.started = !this.overviewPending;
        this.overviewVisible = this.overviewPending;
        this.startButton.hidden = !this.overviewVisible;
        this.menu.hidden = true;
        this.input.releaseAll();
        if (this.overviewVisible) this.startButton.focus();
        else this.canvas.focus();
    }
    private save(events: string[]): void {
        const p = this.store.progress, id = this.world.room.id;
        if (id === 'pairing-bay') return;
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
        if (id === 'pairing-bay') return;
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
        return { room: this.world.room.id, player: this.world.player, cube: this.world.cube, inputs: this.world.inputs, outputs: this.world.frame.outputs,
            multiplayer: this.coopMode ? { ...this.coop.diagnostics(), shared: this.coop.room, remote: this.coop.remote.sample(performance.now()) } : null,
            source: this.world.frame.source, evidence: this.world.frame.evidence, trace: this.renderer.replay.snapshot(), stringPresentation: this.world.room.id === 'uplink' ? 'authored single-byte XOR presentation / not OLLVM evidence' : 'authored mock text', platforms: this.world.platforms.map(p => ({ id: p.def.id, signal: p.def.signal, assemblyBinding: p.def.assemblyBinding, manifestation: p.def.label, enabled: p.solid.enabled, grappleable: p.solid.grappleable, fuse: p.fuse, respawn: p.respawn, evidenceId: p.def.evidenceId })),
            lifts: this.world.lifts.map(l => ({ id: l.def.id, enabled: l.enabled })),
            gates: this.world.gates.map(g => ({ id: g.def.id, enabled: g.enabled, playerCooldown: g.cooldown('player'), cubeCooldown: g.cooldown('cube') })),
            cubeTransferred: this.world.cubeTransferred,
            connections: this.renderer.connections.map(c => ({ id: c.id, input: c.input, output: c.output, powered: connectionPowered(c, this.world) })),
            checkpoint: this.world.checkpoint, deaths: this.world.deaths, pullingCube: this.world.pullingCube, keyboardGrapple: this.world.keyboardGrapple, ended: this.ended, started: this.started, overviewVisible: this.overviewVisible,
            audio: this.audio.snapshot(),
            progress: this.store.progress, persistence: { status: this.store.status, visitor: this.store.visitor, revision: this.store.revision, updatedAt: this.store.updatedAt } };
    }
    private frame(now: number): void {
        const dt = Math.min(MAX_FRAME_TIME, this.last ? (now - this.last) / 1000 : 0);
        this.last = now;
        if (this.input.takeAction('debug'))
            this.debug = !this.debug;
        if (this.input.takeAction('escape')) {
            if (!this.inspector.element.hidden) this.closeInspector();
            else if (!this.menu.hidden && this.menu.querySelector('#reset-confirmation:not([hidden])'))
                this.menu.querySelector<HTMLButtonElement>('#cancel-reset')!.click();
            else if (this.started || this.overviewVisible)
                this.showMenu();
            else
                (this.menu.querySelector('#continue') as HTMLButtonElement | null)?.click();
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
                    if (audible) this.audio.play('complete');
                    break;
                }
            }
        }
        else
            this.accumulated = 0;
        this.sound.ambience(this.world, this.started && !document.hidden && document.hasFocus());
        this.audio.meter();
        if (this.coopMode) {
            this.authority?.cube?.sync(this.world);
            this.coop.publish(this.world.player, now);
            if (this.world.cube) this.coop.publishCube(this.world.cube, now);
        }
        this.renderer.draw(this.world, dt, aim, this.input.overviewHeld || this.overviewVisible,
            this.coopMode && this.coop.slot ? { localSlot: this.coop.slot, remote: this.coop.remote.sample(now),
                reachedExit: this.coop.room?.reachedExit ?? [false, false], completed: this.coop.room?.completed ?? false,
                remotePullingCube: !!this.coop.room?.cube.pulling && !this.coop.ownsCube } : undefined);
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
        this.status.textContent = this.coopMode ? `${this.coop.status} · CO-OP SESSION` : this.store.status;
        this.debugView.hidden = !this.debug;
        document.querySelector<HTMLElement>('#return-cube')!.hidden = this.coopMode;
        this.traceView.hidden = this.world.room.id !== 'uplink' || !this.debug;
        if (this.debug)
            this.debugView.querySelector('pre')!.textContent = JSON.stringify(this.coopMode
                ? { multiplayer: this.coop.diagnostics(), checkpoint: this.coop.room?.checkpoint, completed: this.coop.room?.completed,
                    player: { x: this.world.player.x, y: this.world.player.y, rope: this.world.player.rope.phase } }
                : this.snapshot(), null, 2);
        requestAnimationFrame(t => this.frame(t));
    }
}
