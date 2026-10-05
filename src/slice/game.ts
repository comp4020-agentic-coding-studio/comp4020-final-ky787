import { EvidenceInspector } from './evidence-inspector.ts';
import { FIXED_DT, MAX_FRAME_TIME } from '../engine/constants.ts';
import { InputManager } from '../ui/input.ts';
import { PuzzleRenderer } from './render.ts';
import { PuzzleWorld } from './world.ts';
import { ROOMS, roomById } from './rooms.ts';
import { freshProgress } from './progress.ts';
import { ProgressStore } from './storage.ts';
export class SliceGame {
    store = new ProgressStore();
    world = new PuzzleWorld(ROOMS[0], freshProgress().rooms.pressure);
    renderer: PuzzleRenderer;
    input = new InputManager(true);
    started = false;
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
    constructor(readonly host: HTMLElement, readonly canvas: HTMLCanvasElement) {
        this.traceView.append(this.traceLabel, this.traceCommits);
        this.traceCommits.className = 'trace-commits';
        this.renderer = new PuzzleRenderer(canvas);
        this.inspector = new EvidenceInspector(() => this.closeInspector(), show => { this.renderer.revealBogus = show; });
        this.evidenceButton.addEventListener('click', () => {
            if (!this.inspector.element.hidden) { this.closeInspector(); return; }
            this.resumeAfterInspector = this.started; this.started = false;
            this.world.cancelGrapple(); this.input.releaseAll();
            this.inspector.element.hidden = false;
        });
        this.renderer.room(this.world);
        this.input.attach(canvas, host);
        this.menu = document.querySelector('#menu')!;
        this.debugView = document.querySelector('#debug')!;
        this.status = document.querySelector('#save-status')!;
        this.roomTitle = document.querySelector('#room-title')!;
        document.querySelector('#pause')!.addEventListener('click', () => this.showMenu());
        document.querySelector('#debug-toggle')!.addEventListener('click', () => { this.debug = !this.debug; });
        document.querySelector('#return-cube')!.addEventListener('click', () => { this.world.returnCube(); this.canvas.focus(); });
        this.debug = new URL(location.href).searchParams.has('debug');
        document.addEventListener('visibilitychange', () => { if (document.hidden) {
            this.input.releaseAll();
            this.world.cancelGrapple();
            void this.store.flush();
        } });
        window.addEventListener('blur', () => this.world.cancelGrapple());
        window.addEventListener('pagehide', () => void this.store.flush());
    }
    async start(): Promise<void> {
        requestAnimationFrame(t => this.frame(t));
        await this.store.load();
        this.loadRoom();
        this.showMenu();
    }
    private closeInspector(): void {
        this.inspector.element.hidden = true; this.started = this.resumeAfterInspector;
        this.input.releaseAll(); this.canvas.focus();
    }
    private loadRoom(): void {
        const id = this.store.progress.currentRoom;
        this.world = new PuzzleWorld(roomById(id), this.store.progress.rooms[id]);
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
        this.started = false;
        this.inspector.element.hidden = true;
        this.world.cancelGrapple();
        this.input.releaseAll();
        this.menu.hidden = false;
        const p = this.store.progress, saved = this.store.updatedAt;
        this.menu.innerHTML = `<div class="menu-card"><span class="eyebrow">BINARY NINJA / C8 PLAYTEST</span>
      <h2>${this.ended ? 'Control Spine complete.' : 'Small inputs.<br>Big changes.'}</h2>
      <p>${this.ended ? p.completedRooms.length === ROOMS.length ? 'Four rooms explored. Ready for a human playtest.' : 'Choose another room, or revisit this chamber.' : 'Three tutorials. One bigger puzzle.<br>Route the payload to the core node.'}</p>
      <div class="save-summary"><span>${saved ? 'RETURNING VISITOR' : 'YOUR PROGRESS'}</span><strong>${roomById(p.currentRoom).title} · ${p.completedRooms.length} / ${ROOMS.length} rooms complete</strong><small>${saved ? `Server save · ${new Date(saved).toLocaleString()}` : this.store.status}</small></div>
      <button id="continue" class="primary">${!this.store.ready ? 'PLAY UNSAVED —' : this.ended ? 'REVISIT' : saved || this.world.elapsed > 0 ? 'CONTINUE —' : 'START —'} ${roomById(p.currentRoom).title}</button>
      ${!this.store.ready ? '<button id="retry-save">Retry save connection</button>' : ''}
      <nav class="level-select" aria-label="Level select">
        <span class="eyebrow">CHOOSE A ROOM</span>
        <div class="level-grid">${ROOMS.map((room, index) => `<button data-room="${room.id}" ${room.id === p.currentRoom ? 'aria-current="true"' : ''}><strong>0${index + 1} / ${room.title}</strong><small>${room.id === p.currentRoom ? 'CURRENT' : p.completedRooms.includes(room.id) ? 'COMPLETE' : 'PLAY'}</small></button>`).join('')}</div>
        <small>All rooms available · keeps each room’s saved progress</small>
      </nav>
      <div class="progress-reset">
        <button id="reset-progress" ${!this.store.ready || this.store.conflict ? 'disabled' : ''}>Reset all progress…</button>
        ${!this.store.ready ? '<small>Connect to the save server to reset saved progress.</small>' : this.store.conflict ? '<small>Reload the latest save before resetting progress.</small>' : ''}
        <div id="reset-confirmation" role="group" aria-labelledby="reset-question" hidden>
          <p id="reset-question">Reset every room and return to PRESSURE?</p>
          <p class="fine">This clears all checkpoints, completed rooms, discovered mechanics and activity. This cannot be undone.</p>
          <div class="reset-actions"><button id="cancel-reset">Cancel</button><button id="confirm-reset" class="danger">Reset all progress</button></div>
        </div>
      </div>
      <p class="fine">A / D move · Space jump · E interact<br>Airborne Space: hook / release · Hold click also hooks<br>R checkpoint · Tab overview</p>
      <p class="prototype-note">CONTROL SPINE: validated OLLVM controller + real assembly.<br>Its strings use authored single-byte XOR; tutorials remain mock.<br>Platform physics and crumble timing are game abstractions.</p></div>`;
        this.menu.querySelector<HTMLButtonElement>('#continue')!.focus({ preventScroll: true });
        this.menu.querySelector('#continue')!.addEventListener('click', () => this.resumeRoom());
        for (const button of this.menu.querySelectorAll<HTMLButtonElement>('[data-room]')) {
            button.addEventListener('click', () => {
                const room = ROOMS.find(r => r.id === button.dataset.room);
                if (!room) return;
                if (room.id !== this.world.room.id) {
                    // Save logical state before switching. Merely visiting never completes a room.
                    p.rooms[this.world.room.id] = this.world.memory();
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
        if (this.ended) {
            this.loadRoom();
            this.ended = false;
        }
        this.started = true;
        this.menu.hidden = true;
        this.input.releaseAll();
        this.canvas.focus();
    }
    private save(events: string[]): void {
        const p = this.store.progress, id = this.world.room.id;
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
        if (!p.completedRooms.includes(id))
            p.completedRooms.push(id);
        if (index < ROOMS.length - 1) {
            p.currentRoom = ROOMS[index + 1].id;
            this.store.save(p);
            this.loadRoom();
        }
        else {
            this.store.save(p);
            this.ended = true;
            this.showMenu();
        }
    }
    snapshot() {
        return { room: this.world.room.id, player: this.world.player, cube: this.world.cube, inputs: this.world.inputs, outputs: this.world.frame.outputs,
            source: this.world.frame.source, evidence: this.world.frame.evidence, trace: this.renderer.replay.snapshot(), stringPresentation: this.world.room.id === 'uplink' ? 'authored single-byte XOR presentation / not OLLVM evidence' : 'authored mock text', platforms: this.world.platforms.map(p => ({ id: p.def.id, signal: p.def.signal, assemblyBinding: p.def.assemblyBinding, manifestation: p.def.label, enabled: p.solid.enabled, grappleable: p.solid.grappleable, fuse: p.fuse, respawn: p.respawn, evidenceId: p.def.evidenceId })),
            lifts: this.world.lifts.map(l => ({ id: l.def.id, enabled: l.enabled })),
            gates: this.world.gates.map(g => ({ id: g.def.id, enabled: g.enabled, playerCooldown: g.cooldown('player'), cubeCooldown: g.cooldown('cube') })),
            cubeTransferred: this.world.cubeTransferred,
            checkpoint: this.world.checkpoint, deaths: this.world.deaths, pullingCube: this.world.pullingCube, keyboardGrapple: this.world.keyboardGrapple, ended: this.ended, started: this.started,
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
            else if (this.started)
                this.showMenu();
            else
                (this.menu.querySelector('#continue') as HTMLButtonElement | null)?.click();
        }
        if (this.started && this.input.takeAction('reset'))
            this.world.respawn();
        const aim = this.renderer.camera.screenToWorld(this.input.screenAim.x, this.input.screenAim.y);
        this.input.sync(aim);
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
                for (const event of events) {
                    if (event.kind === 'crumble')
                        this.renderer.particles.shatter(event.at.x, event.at.y, 140, 32, '#f9ba68');
                    else
                        this.renderer.particles.burst(event.at.x, event.at.y, 10, '#64e6d5', 120);
                }
                const memory = JSON.stringify(this.world.memory());
                if (events.length || memory !== this.memory) {
                    this.memory = memory;
                    this.save(events.map(e => e.kind));
                }
                if (this.world.exited) {
                    this.advance();
                    break;
                }
            }
        }
        else
            this.accumulated = 0;
        this.renderer.draw(this.world, dt, aim, this.input.overviewHeld);
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
        this.status.textContent = this.store.status;
        this.debugView.hidden = !this.debug;
        this.traceView.hidden = this.world.room.id !== 'uplink' || !this.debug;
        if (this.debug)
            this.debugView.querySelector('pre')!.textContent = JSON.stringify(this.snapshot(), null, 2);
        requestAnimationFrame(t => this.frame(t));
    }
}
