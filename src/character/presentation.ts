import { DEFAULT_CHARACTER_PROFILE, parseCharacterProfile, type PublicCharacterProfile } from './profile.ts';
import type { CharacterProfiles, Slot } from '../coop/protocol.ts';

/** Slots, not the viewing computer, determine the server-published appearance. */
export function characterForSlot(profiles: CharacterProfiles | undefined, slot: Slot): PublicCharacterProfile {
    return parseCharacterProfile(profiles?.[slot - 1]) ?? DEFAULT_CHARACTER_PROFILE;
}
export function characterLabel(profile: PublicCharacterProfile, slot: Slot | undefined, local: boolean, zoom: number): string {
    const name = zoom < .45 && profile.name.length > 8 ? `${profile.name.slice(0, 7)}…` : profile.name;
    return `${name} / ${slot ? `P${slot}` : ''}${local ? slot ? ' · YOU' : 'YOU' : ''}`;
}
