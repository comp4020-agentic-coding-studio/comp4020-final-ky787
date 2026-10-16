/** Pure, bounded presentation values. No gameplay or shared state lives here. */
export const PAYLOAD_COLOURS = {
    free: { primary: '#b65cff', bright: '#dfabff', deep: '#6932b8', core: '#f3deff' },
    connected: { primary: '#59ff86', bright: '#bcffb2', deep: '#146b48', core: '#e5ffdc' },
    waiting: '#f9ba68',
} as const;
export const ENERGY_CYCLE = 2.6;
export const ENERGY_CONNECT = .68;
export const energyEase = (n: number) => { const t = Math.max(0, Math.min(1, n)); return t * t * (3 - 2 * t); };
/** Stable ID phase, including adjacent A/B/C IDs; no random or network clocks. */
export function energyPhase(id: string): number {
    let hash = 2166136261;
    for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
    hash = Math.imul(hash ^ hash >>> 16, 0x45d9f3b); hash ^= hash >>> 16;
    return (hash >>> 0) / 4294967296;
}
function mix(a: string, b: string, t: number): string {
    return '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
}
/** null = unconnected (including carried or waiting for a clear docking bay).
 * Infinity = restored powered idle. Reduced motion settles colours immediately. */
export function payloadEnergy(id: string, time: number, connectionAge: number | null, motion = true) {
    const seed = energyPhase(id), t = motion ? time / ENERGY_CYCLE + seed : seed;
    const connected = connectionAge !== null;
    const green = connected ? motion ? energyEase((connectionAge - .04) / (ENERGY_CONNECT - .04)) : 1 : 0;
    const surge = connected && motion && connectionAge < ENERGY_CONNECT ? Math.sin(Math.max(0, connectionAge) / ENERGY_CONNECT * Math.PI) : 0;
    const palette = green === 0 ? PAYLOAD_COLOURS.free : green === 1 ? PAYLOAD_COLOURS.connected : Object.fromEntries(Object.entries(PAYLOAD_COLOURS.free).map(([k, v]) =>
        [k, mix(v, PAYLOAD_COLOURS.connected[k as keyof typeof PAYLOAD_COLOURS.free], green)])) as Record<keyof typeof PAYLOAD_COLOURS.free, string>;
    return { ...palette, connected, green, surge,
        breath: motion ? .66 + .22 * Math.sin(t * Math.PI * 2) : .8,
        contour: motion ? .34 + .2 * Math.sin((t + .32) * Math.PI * 2) : .45,
        perimeter: motion ? (t * .85) % 1 : seed,
        electric: motion ? Math.sin((t + .61) * Math.PI * 2) * 1.4 : 0,
    };
}
