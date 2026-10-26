/** Presentation-only soundtrack choices. They never select controllers or affect rooms. */
export const MUSIC_TRACKS = {
    menu: { file: 'menu.ogg', title: 'Menu', gain: 1.2 },
    handshake: { file: 'handshake.ogg', title: 'Handshake', gain: 1 },
    // Preserve the original Celestial Harmony recording and gain for the solo rooms.
    'tutorial-relay': { file: 'tutorial-relay.ogg', title: 'Solo tutorial', gain: 1 },
    'crossfeed-vault': { file: 'crossfeed-vault.ogg', title: 'Crossfeed Vault', gain: 1 },
    'race-condition': { file: 'race-condition.ogg', title: 'Race Condition', gain: 1 },
    deadlock: { file: 'deadlock.ogg', title: 'Deadlock', gain: 1 },
    'use-after-free': { file: 'use-after-free.ogg', title: 'Use After Free', gain: 1 },
} as const;

export type MusicScene = keyof typeof MUSIC_TRACKS;

export function musicSceneForRoom(roomId: string): MusicScene {
    if (roomId === 'relay' || roomId === 'uplink') return 'tutorial-relay';
    return Object.prototype.hasOwnProperty.call(MUSIC_TRACKS, roomId) ? roomId as MusicScene : 'menu';
}
