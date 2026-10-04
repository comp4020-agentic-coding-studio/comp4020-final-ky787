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
    private last = 0;
    private accumulated = 0;
    private menu: HTMLElement;
    private debugView: HTMLElement;
    private status: HTMLElement;
    private roomTitle: HTMLElement;
    private memory = '';
    constructor(readonly host: HTMLElement, readonly canvas: HTMLCanvasElement) {
        this.renderer = new PuzzleRenderer(canvas);
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
            void this.store.flush();
        } });
        window.addEventListener('pagehide', () => void this.store.flush());
    }
    async start(): Promise<void> {
        requestAnimationFrame(t => this.frame(t));
        await this.store.load();
        this.loadRoom();
        this.showMenu();
    }
    private loadRoom(): void {
        const id = this.store.progress.currentRoom;
        this.world = new PuzzleWorld(roomById(id), this.store.progress.rooms[id]);
        this.renderer.room(this.world);
        this.memory = JSON.stringify(this.world.memory());
        this.input.releaseAll();
        this.accumulated = 0;
        this.roomTitle.textContent = `0${ROOMS.findIndex(r => r.id === id) + 1} / ${id.toUpperCase()}`;
    }
    private showMenu(): void {
        this.started = false;
        this.input.releaseAll();
        this.menu.hidden = false;
        const p = this.store.progress, saved = this.store.updatedAt;
        this.menu.innerHTML = `<div class="menu-card"><span class="eyebrow">BINARY NINJA / C8 PLAYTEST</span>
      <h2>${this.ended ? 'Relay complete.' : 'Small inputs.<br>Big changes.'}</h2>
      <p>${this.ended ? 'Three rooms explored. Ready for a human playtest.' : 'A cube. A switch. A way across.<br>Three physical puzzles for one player.'}</p>
      <div class="save-summary"><span>${saved ? 'RETURNING VISITOR' : 'YOUR PROGRESS'}</span><strong>${p.currentRoom.toUpperCase()} · ${p.completedRooms.length} / 3 rooms complete</strong><small>${saved ? `Server save · ${new Date(saved).toLocaleString()}` : this.store.status}</small></div>
      <button id="continue" class="primary">${!this.store.ready ? 'PLAY UNSAVED —' : this.ended ? 'REVISIT' : saved || this.world.elapsed > 0 ? 'CONTINUE —' : 'START —'} ${p.currentRoom.toUpperCase()}</button>
      ${!this.store.ready ? '<button id="retry-save">Retry save connection</button>' : ''}
      ${this.ended ? '<button id="new-run">Start a new run</button>' : ''}
      <p class="fine">A / D move · Space jump · E interact<br>Hold left click to grapple · R checkpoint · Tab overview</p>
      <p class="prototype-note">Greybox · mock controllers and string effects.<br>Crumble is a gameplay prototype, not binary evidence.</p></div>`;
        this.menu.querySelector('#continue')!.addEventListener('click', () => {
            if (this.ended) {
                this.loadRoom();
                this.ended = false;
            }
            this.started = true;
            this.menu.hidden = true;
            this.input.releaseAll();
            this.canvas.focus();
        });
        this.menu.querySelector('#retry-save')?.addEventListener('click', async () => { await this.store.load(); this.loadRoom(); this.showMenu(); });
        this.menu.querySelector('#new-run')?.addEventListener('click', () => { this.store.progress = freshProgress(); this.store.save(this.store.progress); this.ended = false; this.loadRoom(); this.showMenu(); });
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
            source: this.world.frame.source, platforms: this.world.platforms.map(p => ({ id: p.def.id, enabled: p.solid.enabled, grappleable: p.solid.grappleable, fuse: p.fuse, respawn: p.respawn })),
            checkpoint: this.world.checkpoint, deaths: this.world.deaths, pullingCube: this.world.pullingCube, ended: this.ended, started: this.started,
            progress: this.store.progress, persistence: { status: this.store.status, visitor: this.store.visitor, revision: this.store.revision, updatedAt: this.store.updatedAt } };
    }
    private frame(now: number): void {
        const dt = Math.min(MAX_FRAME_TIME, this.last ? (now - this.last) / 1000 : 0);
        this.last = now;
        if (this.input.takeAction('debug'))
            this.debug = !this.debug;
        if (this.input.takeAction('escape')) {
            if (this.started)
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
        this.status.textContent = this.store.status;
        this.debugView.hidden = !this.debug;
        if (this.debug)
            this.debugView.querySelector('pre')!.textContent = JSON.stringify(this.snapshot(), null, 2);
        requestAnimationFrame(t => this.frame(t));
    }
}
