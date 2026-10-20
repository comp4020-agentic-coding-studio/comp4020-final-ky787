import { createPlayer } from '../engine/physics.ts';
import { drawNinja } from '../render/ninja.ts';
import { colourHex, type CharacterColour } from './profile.ts';

/** A presentation-only animation. It never steps a game world or changes physics. */
export class NinjaPreview {
    private readonly context: CanvasRenderingContext2D;
    private readonly motion = matchMedia('(prefers-reduced-motion: reduce)');
    private readonly player = createPlayer(0, 0);
    private frame = 0;
    private active = true;
    private startedAt = performance.now();
    private colour: CharacterColour;
    private readonly visibilityChanged = (): void => this.schedule();
    private readonly motionChanged = (): void => this.schedule();

    constructor(private readonly canvas: HTMLCanvasElement, colour: CharacterColour) {
        this.context = canvas.getContext('2d')!;
        this.colour = colour;
        const ratio = Math.min(devicePixelRatio || 1, 2);
        canvas.width = 440 * ratio;
        canvas.height = 270 * ratio;
        document.addEventListener('visibilitychange', this.visibilityChanged);
        this.motion.addEventListener('change', this.motionChanged);
        this.schedule();
    }

    setColour(colour: CharacterColour): void {
        this.colour = colour;
        // Input previews repaint synchronously, including reduced-motion mode.
        if (this.active && !document.hidden) this.draw(performance.now());
    }

    dispose(): void {
        this.active = false;
        cancelAnimationFrame(this.frame);
        document.removeEventListener('visibilitychange', this.visibilityChanged);
        this.motion.removeEventListener('change', this.motionChanged);
    }

    private schedule(): void {
        cancelAnimationFrame(this.frame);
        if (!this.active || document.hidden) return;
        this.draw(performance.now());
        if (!this.motion.matches) this.frame = requestAnimationFrame(this.tick);
    }

    private readonly tick = (now: number): void => {
        if (!this.active || document.hidden || !this.canvas.isConnected || this.canvas.closest('[hidden]')) return;
        this.draw(now);
        this.frame = requestAnimationFrame(this.tick);
    };

    private draw(now: number): void {
        const ctx = this.context;
        const width = 440, height = 270, floor = 230;
        const time = this.motion.matches ? 0 : (now - this.startedAt) / 1000;
        const cycle = time % 6.4;
        const running = cycle >= 1.7 && cycle < 3.1;
        const jumping = cycle >= 3.1 && cycle < 4.1;
        const jump = jumping ? (cycle - 3.1) : 0;
        const p = this.player;
        p.vx = running ? 230 : jumping ? 110 : 0;
        p.vy = jumping ? -140 * Math.cos(jump * Math.PI) : 0;
        p.grounded = !jumping;
        p.x = running ? Math.sin((cycle - 1.7) / 1.4 * Math.PI) * 2 : 0;
        p.y = jumping ? -Math.sin(jump * Math.PI) * 12 : 0;
        const accent = colourHex(this.colour);
        ctx.setTransform(this.canvas.width / width, 0, 0, this.canvas.height / height, 0, 0);
        ctx.clearRect(0, 0, width, height);

        // Quiet calibration grid and a floor give the existing stride/jump context.
        ctx.strokeStyle = '#263c4638';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 20; x < width; x += 25) { ctx.moveTo(x, 22); ctx.lineTo(x, floor); }
        for (let y = 30; y < floor; y += 25) { ctx.moveTo(20, y); ctx.lineTo(width - 20, y); }
        ctx.stroke();
        ctx.strokeStyle = '#47616d';
        ctx.beginPath(); ctx.moveTo(80, floor); ctx.lineTo(width - 80, floor); ctx.stroke();
        ctx.fillStyle = '#314853';
        for (let x = 85; x < width - 80; x += 10) ctx.fillRect(x, floor + 5, 3, 1);

        ctx.save();
        ctx.translate(width / 2, floor - 22 * 4);
        ctx.scale(4, 4);
        drawNinja(ctx, p, time, accent);
        ctx.restore();
        // This is evidence of the actual completed renderer call, not a CSS preview.
        this.canvas.dataset.previewAccent = accent;
        this.canvas.dataset.previewColour = this.colour;
        this.canvas.dataset.animation = jumping ? 'jump' : running ? 'run' : 'idle';
    }
}
