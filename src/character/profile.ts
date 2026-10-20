/** Cosmetic identity only. The HTTP-only visitor cookie owns saves and party slots. */
export const CHARACTER_COLOURS = [
    { id: 'cyan', name: 'Cyan', hex: '#64E6D5' },
    { id: 'purple', name: 'Purple', hex: '#B59BFF' },
    { id: 'blue', name: 'Electric Blue', hex: '#55AAFF' },
    { id: 'pink', name: 'Pink', hex: '#FF70CB' },
    { id: 'orange', name: 'Orange', hex: '#FFAC55' },
    { id: 'lime', name: 'Lime', hex: '#A4F76A' },
    { id: 'red', name: 'Red', hex: '#FF647D' },
    { id: 'yellow', name: 'Yellow', hex: '#FFE078' },
] as const;

export type CharacterColour = typeof CHARACTER_COLOURS[number]['id'];
export interface PublicCharacterProfile { name: string; colour: CharacterColour }
export const DEFAULT_CHARACTER_PROFILE: Readonly<PublicCharacterProfile> = Object.freeze({ name: 'Ninja', colour: 'cyan' });
export interface ProfileRecord { profile: PublicCharacterProfile | null; revision: number }

export function isCharacterColour(value: unknown): value is CharacterColour {
    return CHARACTER_COLOURS.some(colour => colour.id === value);
}
export function colourHex(colour: CharacterColour): string {
    return CHARACTER_COLOURS.find(preset => preset.id === colour)?.hex ?? CHARACTER_COLOURS[0].hex;
}
export function validateCharacterProfile(value: unknown): { ok: true; profile: PublicCharacterProfile } | { ok: false; error: string } {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return { ok: false, error: 'Enter an operative name and choose a colour.' };
    const candidate = value as Record<string, unknown>;
    if (Object.keys(candidate).length !== 2 || !Object.hasOwn(candidate, 'name') || !Object.hasOwn(candidate, 'colour'))
        return { ok: false, error: 'A character profile contains only a name and colour.' };
    if (typeof candidate.name !== 'string')
        return { ok: false, error: 'Enter an operative name.' };
    // Reject controls before trimming: newline and tab are not cosmetic whitespace.
    if (/[\u0000-\u001f\u007f]/.test(candidate.name))
        return { ok: false, error: 'Use letters, numbers, spaces, underscores or hyphens.' };
    const name = candidate.name.trim();
    if (name.length < 2 || name.length > 16)
        return { ok: false, error: 'Operative names must be 2–16 characters.' };
    if (!/^[A-Za-z0-9 _-]+$/.test(name))
        return { ok: false, error: 'Use letters, numbers, spaces, underscores or hyphens.' };
    if (!isCharacterColour(candidate.colour))
        return { ok: false, error: 'Choose one of the available character colours.' };
    return { ok: true, profile: { name, colour: candidate.colour } };
}
export function parseCharacterProfile(value: unknown): PublicCharacterProfile | null {
    const result = validateCharacterProfile(value);
    return result.ok ? result.profile : null;
}
