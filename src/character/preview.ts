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

    constructor(private readonly canvas: HTMLCanvasElement, colour: CharacterColour, private readonly variant: 'classic' | 'swing' = 'classic') {
        this.context = canvas.getContext('2d')!;
        this.colour = colour;
        const ratio = Math.min(devicePixelRatio || 1, 2);
        canvas.width = (variant === 'swing' ? 600 : 440) * ratio;
        canvas.height = (variant === 'swing' ? 560 : 270) * ratio;
        canvas.dataset.previewVariant = variant;
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
        if (this.variant === 'swing') { this.drawSwing(now); return; }
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

    /** An analytic pendulum pose, entirely separate from the grapple simulation. */
    private drawSwing(now: number): void {
        const ctx = this.context, width = 600, height = 560;
        const time = this.motion.matches ? 0 : (now - this.startedAt) / 1000;
        const accent = colourHex(this.colour);
        const anchor = { x: 300, y: 84 }, length = 276;
        const pose = (t: number): { x: number; y: number; angle: number } => {
            const angle = .16 + Math.sin(t * .82) * .43;
            return { x: anchor.x + Math.sin(angle) * length, y: anchor.y + Math.cos(angle) * length, angle };
        };
        const current = pose(time);
        ctx.setTransform(this.canvas.width / width, 0, 0, this.canvas.height / height, 0, 0);
        ctx.clearRect(0, 0, width, height);

        // A quiet schematic anchor and one short fading trajectory sell the motion.
        ctx.strokeStyle = '#46748755'; ctx.fillStyle = '#46748755'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(anchor.x - 72, anchor.y - 24); ctx.lineTo(anchor.x + 72, anchor.y - 24);
        ctx.moveTo(anchor.x, anchor.y - 24); ctx.lineTo(anchor.x, anchor.y - 10); ctx.stroke();
        for (const offset of [-72, 72]) ctx.fillRect(anchor.x + offset - 2, anchor.y - 26, 4, 4);
        if (!this.motion.matches) {
            ctx.lineWidth = 2;
            for (let segment = 16; segment > 0; segment--) {
                const from = pose(time - segment * .055), to = pose(time - (segment - 1) * .055);
                ctx.globalAlpha = (1 - segment / 18) * .17;
                ctx.strokeStyle = accent; ctx.beginPath(); ctx.moveTo(from.x, from.y + 49); ctx.lineTo(to.x, to.y + 49); ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
        ctx.strokeStyle = accent; ctx.lineWidth = 1.6; ctx.globalAlpha = .65;
        ctx.beginPath(); ctx.moveTo(anchor.x, anchor.y); ctx.lineTo(current.x - 7, current.y - 32); ctx.stroke();
        ctx.globalAlpha = .15; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(anchor.x, anchor.y, 10, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = .85; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(anchor.x, anchor.y, 10, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = accent; ctx.fillRect(anchor.x - 3, anchor.y - 3, 6, 6); ctx.globalAlpha = 1;

        const p = this.player;
        // drawNinja consumes velocity only to pose its scarf and lean, without integrating it.
        p.x = 0; p.y = 0; p.grounded = false;
        p.vx = this.motion.matches ? 0 : Math.cos(time * .82) * 190;
        p.vy = this.motion.matches ? 0 : -Math.sin(current.angle) * p.vx * .5;
        p.facing = p.vx < -15 ? -1 : 1;
        ctx.save(); ctx.translate(current.x, current.y); ctx.rotate(-current.angle * .25); ctx.scale(4.8, 4.8);
        drawNinja(ctx, p, time, accent); ctx.restore();
        this.canvas.dataset.previewAccent = accent;
        this.canvas.dataset.previewColour = this.colour;
        this.canvas.dataset.animation = this.motion.matches ? 'swing-still' : 'swing';
    }
}
