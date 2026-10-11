import type { Firewall } from './firewall.ts';

/** Crit 5's hot orange core/mesh/posts, with no timed state or moving geometry. */
export function drawFirewalls(c: CanvasRenderingContext2D, firewalls: readonly Firewall[], time: number): void {
    for (const { def, box, enabled } of firewalls) {
        c.save(); c.translate(box.x, box.y);
        // Draw once along a local horizontal axis for either authored orientation.
        const thickness = def.orientation === 'horizontal' ? box.h : box.w;
        if (def.orientation === 'vertical') { c.translate(thickness, 0); c.rotate(Math.PI / 2); }
        if (enabled === false) {
            c.globalAlpha = .25; c.strokeStyle = '#ffc16d'; c.setLineDash([3, 12]);
            c.strokeRect(0, 0, def.length, thickness); c.restore(); continue;
        }
        c.shadowColor = '#ff6c27'; c.shadowBlur = 12;
        c.fillStyle = '#ff6c27'; c.fillRect(0, 0, def.length, thickness);
        c.shadowBlur = 0;
        c.fillStyle = `rgba(255,239,188,${.78 + .12 * Math.sin(time * 19)})`;
        c.fillRect(0, thickness * .3, def.length, thickness * .4);
        c.beginPath(); c.rect(0, 0, def.length, thickness); c.clip();
        c.strokeStyle = '#b93b26'; c.lineWidth = 1;
        for (let x = -thickness + (time * 22) % 14; x < def.length; x += 14) {
            c.beginPath(); c.moveTo(x, 0); c.lineTo(x + thickness, thickness); c.stroke();
        }
        c.restore();
        c.save(); c.fillStyle = '#ffc16d';
        if (def.orientation === 'horizontal') {
            c.fillRect(box.x - 3, box.y - 3, 3, box.h + 6); c.fillRect(box.x + box.w, box.y - 3, 3, box.h + 6);
        } else {
            c.fillRect(box.x - 3, box.y - 3, box.w + 6, 3); c.fillRect(box.x - 3, box.y + box.h, box.w + 6, 3);
        }
        c.restore();
    }
}
