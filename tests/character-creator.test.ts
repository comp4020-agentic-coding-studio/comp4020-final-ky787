// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CharacterCreator } from '../src/character/creator.ts';
import { type CharacterColour } from '../src/character/profile.ts';

const previews = vi.hoisted(() => ({ colour: '', disposed: 0 }));
vi.mock('../src/character/preview.ts', () => ({
    NinjaPreview: class {
        constructor(_canvas: HTMLCanvasElement, colour: CharacterColour) { previews.colour = colour; }
        setColour(colour: CharacterColour): void { previews.colour = colour; }
        dispose(): void { previews.disposed++; }
    },
}));
let host: HTMLElement;
let creator: CharacterCreator;
beforeEach(() => {
    document.body.innerHTML = '<section id="menu"></section>';
    host = document.querySelector('#menu')!;
    creator = new CharacterCreator(host);
    previews.colour = ''; previews.disposed = 0;
});
afterEach(() => creator.dispose());
const swatch = (colour: string): HTMLButtonElement => host.querySelector(`[data-colour="${colour}"]`)!;
const pointer = (element: HTMLElement, type: string): void => {
    const event = new Event(type);
    Object.defineProperty(event, 'pointerType', { value: 'mouse' });
    element.dispatchEvent(event);
};
const submit = (): void => { host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };

it('initializes with one click using the suggested name and default colour', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    creator.open({ mode: 'initialize', onSave });
    const name = host.querySelector<HTMLInputElement>('#operative-name')!.value;
    expect(name).toMatch(/^Ninja-\d{4}$/);
    expect(host.querySelector('#character-preview-name')!.textContent).toBe(name);
    expect(swatch('cyan').getAttribute('aria-pressed')).toBe('true');
    host.querySelector<HTMLButtonElement>('#initialize-ninja')!.click();
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledExactlyOnceWith({ name, colour: 'cyan' }));
});

it('keeps the suggestion and subsequent edits stable through colour preview and selection', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    creator.open({ mode: 'initialize', onSave });
    const name = host.querySelector<HTMLInputElement>('#operative-name')!;
    const suggestion = name.value;
    pointer(swatch('orange'), 'pointerenter');
    pointer(swatch('orange'), 'pointerleave');
    swatch('purple').focus(); swatch('purple').click();
    expect(name.value).toBe(suggestion);
    name.value = 'My Ninja'; name.dispatchEvent(new Event('input'));
    swatch('cyan').focus(); swatch('cyan').click();
    expect(name.value).toBe('My Ninja');
    expect(host.querySelector('#character-preview-name')!.textContent).toBe('My Ninja');
    submit();
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledWith({ name: 'My Ninja', colour: 'cyan' }));
});

it.each(['initialize', 'customize'] as const)('%s always displays a supplied saved name', mode => {
    creator.open({ mode, profile: { name: 'Saved Operative', colour: 'lime' }, onSave: vi.fn() });
    expect(host.querySelector<HTMLInputElement>('#operative-name')!.value).toBe('Saved Operative');
    expect(host.querySelector('#character-preview-name')!.textContent).toBe('Saved Operative');
    expect(swatch('lime').getAttribute('aria-pressed')).toBe('true');
});

it('keeps saved, selected and temporary colour separate when submitting', async () => {
    const saved = { name: 'ShadowByte', colour: 'cyan' } as const;
    const onSave = vi.fn().mockResolvedValue(undefined);
    creator.open({ mode: 'customize', profile: saved, onSave });
    expect(previews.colour).toBe('cyan');
    swatch('purple').click();
    pointer(swatch('orange'), 'pointerenter');
    expect(previews.colour).toBe('orange');
    submit();
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledWith({ name: 'ShadowByte', colour: 'purple' }));
    expect(saved).toEqual({ name: 'ShadowByte', colour: 'cyan' });
});

it('reverts transient pointer and keyboard focus previews, including pointer-retained focus', () => {
    creator.open({ mode: 'customize', profile: { name: 'Ninja', colour: 'cyan' }, onSave: vi.fn() });
    pointer(swatch('purple'), 'pointerenter');
    expect(previews.colour).toBe('purple');
    pointer(swatch('purple'), 'pointerleave');
    expect(previews.colour).toBe('cyan');
    swatch('purple').focus();
    expect(previews.colour).toBe('purple');
    swatch('purple').blur();
    expect(previews.colour).toBe('cyan');
    pointer(swatch('orange'), 'pointerdown');
    swatch('orange').focus();
    swatch('orange').click();
    pointer(swatch('purple'), 'pointerenter');
    expect(previews.colour).toBe('purple');
    pointer(swatch('purple'), 'pointerleave');
    expect(previews.colour).toBe('orange');
});

it('cancel discards unsaved changes and stops the preview when the caller closes', () => {
    const saved = { name: 'ShadowByte', colour: 'cyan' } as const;
    const onSave = vi.fn();
    creator.open({ mode: 'customize', profile: saved, onSave, onCancel: () => creator.close() });
    swatch('purple').click();
    host.querySelector<HTMLButtonElement>('#cancel-character')!.click();
    expect(onSave).not.toHaveBeenCalled();
    expect(creator.active).toBe(false);
    expect(previews.disposed).toBe(1);
    creator.open({ mode: 'customize', profile: saved, onSave });
    expect(previews.colour).toBe('cyan');
});

it('renders entered markup as plain text and rejects it with a clear validation message', () => {
    const onSave = vi.fn();
    creator.open({ mode: 'initialize', onSave });
    const name = host.querySelector<HTMLInputElement>('#operative-name')!;
    name.value = '<img src=x>';
    name.dispatchEvent(new Event('input'));
    expect(host.querySelector('#character-preview-name')!.textContent).toBe('<img src=x>');
    expect(host.querySelector('img')).toBeNull();
    submit();
    expect(onSave).not.toHaveBeenCalled();
    expect(host.querySelector<HTMLElement>('#character-error')!.hidden).toBe(false);
    expect(host.querySelector('#character-error')!.textContent).toContain('letters');
});

it('offers a clearly unsaved fallback only after save failure and uses selected colour', async () => {
    const onGuest = vi.fn();
    creator.open({
        mode: 'initialize',
        onSave: vi.fn().mockRejectedValue(new Error('Offline. Retry saving.')), onGuest,
    });
    const name = host.querySelector<HTMLInputElement>('#operative-name')!.value;
    const guest = host.querySelector<HTMLButtonElement>('#guest-character')!;
    expect(guest.hidden).toBe(true);
    swatch('purple').click();
    submit();
    await vi.waitFor(() => expect(guest.hidden).toBe(false));
    expect(host.querySelector<HTMLInputElement>('#operative-name')!.value).toBe(name);
    expect(host.querySelector('#character-error')!.textContent).toBe('Offline. Retry saving.');
    pointer(swatch('orange'), 'pointerenter');
    guest.click();
    expect(onGuest).toHaveBeenCalledWith({ name, colour: 'purple' });
});
