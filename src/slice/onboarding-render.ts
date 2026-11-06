import { heroMaterials } from './hero-render.ts';

const { line, panel, text } = heroMaterials;
const ink = '#a0b7bf', trace = '#567880', accent = '#8cc5c1', dark = '#0c1b24';

/** Quiet wall lettering; fixed world size/position, with no interactive surface. */
function hint(c: CanvasRenderingContext2D, lines: readonly string[], x: number, y: number): void {
    c.save();
    line(c, x - 12, y - 12, x - 12, y + (lines.length - 1) * 22 + 2, trace, 1.5);
    for (const [i, label] of lines.entries()) text(c, label, x, y + i * 22, 14, ink, 'left');
    c.restore();
}

/** Flat pictogram derived from the playable ninja's visor, scarf and silhouette.
 * It deliberately has no player halo, name, animation or physical state. */
function ninjaIcon(c: CanvasRenderingContext2D, x: number, y: number, holding: boolean): void {
    panel(c, x - 10, y - 17, 20, 31, dark, accent, 3);
    line(c, x + 1, y - 10, x + 7, y - 10, accent, 3);
    line(c, x - 10, y - 7, x - 20, y - 11, trace, 3);
    line(c, x - 4, y + 14, x - 7, y + 23, accent, 2);
    line(c, x + 4, y + 14, x + 8, y + 23, accent, 2);
    if (holding) {
        // Arms visibly meet the overhead payload's lower corners.
        line(c, x - 10, y - 2, x - 18, y - 12, accent, 2);
        line(c, x - 18, y - 12, x - 15, y - 20, accent, 2);
        line(c, x + 10, y - 2, x + 18, y - 12, accent, 2);
        line(c, x + 18, y - 12, x + 15, y - 20, accent, 2);
    } else {
        line(c, x + 10, y - 1, x + 20, y - 10, accent, 2);
    }
}

function boostGuide(c: CanvasRenderingContext2D): void {
    c.save();
    // Left of the actual boost takeoff, above avatar/cube/nameplate traffic.
    // The existing upper ledge begins at x=1840; this sign stops at x=1780.
    ninjaIcon(c, 1650, 364, true);
    panel(c, 1635, 314, 30, 30, '#182733', '#a79ac0', 4);
    panel(c, 1644, 323, 12, 12, dark, '#a79ac0', 2);
    ninjaIcon(c, 1654, 291, false);
    line(c, 1618, 391, 1685, 391, trace, 1.5);
    // A single rising step arrow leads to a tiny shelf, not another game object.
    line(c, 1700, 370, 1700, 334, accent, 2);
    line(c, 1700, 334, 1740, 294, accent, 2);
    line(c, 1740, 294, 1729, 298, accent, 2);
    line(c, 1740, 294, 1736, 305, accent, 2);
    line(c, 1749, 314, 1780, 314, trace, 2);
    text(c, 'BOOST YOUR PARTNER', 1690, 416, 14, ink);
    c.restore();
}

/** Authored onboarding decoration only. Call in world space behind machinery
 * and players. It does not observe/change controls, progression or evidence. */
export function drawOnboardingHints(c: CanvasRenderingContext2D, roomId: string): void {
    if (roomId === 'pressure') hint(c, ['PRESS E TO PICK UP CUBE'], 250, 385);
    else if (roomId === 'switch') hint(c, ['PRESS SPACE TO JUMP', 'PRESS AND HOLD SPACE AGAIN TO SWING'], 260, 380);
    else if (roomId === 'handshake') boostGuide(c);
}
