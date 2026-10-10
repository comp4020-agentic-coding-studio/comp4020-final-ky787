import { boxesOverlap, type Box } from '../engine/geometry.ts';

/** Authored gameplay hazard, never a controller output or binary evidence. */
export interface FirewallDef {
    id: string;
    /** Top-left of the lethal rectangle, excluding its decorative glow/posts. */
    x: number;
    y: number;
    orientation: 'horizontal' | 'vertical';
    length: number;
    thickness?: number;
}
export const FIREWALL_THICKNESS = 12;
export function firewallBox(def: FirewallDef): Box {
    const thickness = def.thickness ?? FIREWALL_THICKNESS;
    if (![def.x, def.y, def.length, thickness].every(Number.isFinite) || def.length <= 0 || thickness <= 0)
        throw new Error(`Invalid authored firewall: ${def.id}`);
    return { x: def.x, y: def.y, w: def.orientation === 'horizontal' ? def.length : thickness,
        h: def.orientation === 'vertical' ? def.length : thickness };
}
export interface Firewall { def: FirewallDef; box: Box }
export function touchingFirewall(firewalls: readonly Firewall[], body: Box): Firewall | undefined {
    return firewalls.find(f => boxesOverlap(body, f.box));
}
