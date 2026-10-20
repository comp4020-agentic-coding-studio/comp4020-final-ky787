import { CHARACTER_COLOURS, DEFAULT_CHARACTER_PROFILE, colourHex, validateCharacterProfile, type CharacterColour, type PublicCharacterProfile } from './profile.ts';
import { NinjaPreview } from './preview.ts';

export interface CharacterCreatorOptions {
    mode: 'initialize' | 'customize';
    profile?: PublicCharacterProfile;
    persistent?: boolean;
    onSave: (profile: PublicCharacterProfile) => Promise<void>;
    onCancel?: () => void;
    onGuest?: (profile: PublicCharacterProfile) => void;
}

/** Owns a disposable menu view. Saved, selected and transient preview state are separate. */
export class CharacterCreator {
    active = false;
    private preview: NinjaPreview | null = null;
    private cleanup: (() => void) | null = null;

    constructor(private readonly container: HTMLElement) {}

    open(options: CharacterCreatorOptions): void {
        this.close();
        this.active = true;
        const saved = { ...(options.profile ?? DEFAULT_CHARACTER_PROFILE) };
        let selectedColour = saved.colour;
        let previewColour: CharacterColour | null = null;
        let keyboardColour: CharacterColour | null = null;
        let pointerColour: CharacterColour | null = null;
        let pointerFocus = false;
        let saving = false;
        const creating = options.mode === 'initialize';
        const title = creating ? 'INITIALIZE NINJA' : 'CUSTOMIZE NINJA';
        this.container.hidden = false;
        this.container.classList.add('character-menu');
        this.container.setAttribute('aria-label', title);
        // Only fixed application strings enter this template. Names always use DOM values/textContent.
        this.container.innerHTML = `<section class="menu-card character-card" aria-labelledby="character-title">
            <div class="character-heading"><span class="eyebrow">BINARY NINJA / OPERATIVE SETUP</span>
            <h2 id="character-title">${title}</h2><p>Your signature. Your signal.</p></div>
            <div class="character-layout">
                <figure class="character-display">
                    <div class="character-preview-top"><span><i></i> LIVE PREVIEW</span><span>01 / NINJA</span></div>
                    <canvas id="ninja-preview" role="img" aria-label="Animated preview of your ninja"></canvas>
                    <figcaption><strong id="character-preview-name"></strong><span id="character-preview-colour"></span></figcaption>
                    <p class="character-preview-note">One operative. Ready to cooperate.</p>
                </figure>
                <form id="character-form" novalidate>
                    <label class="character-label" for="operative-name">OPERATIVE NAME</label>
                    <input id="operative-name" name="operative-name" type="text" maxlength="16" autocomplete="off" spellcheck="false" autocapitalize="off" aria-describedby="character-name-help character-error">
                    <p id="character-name-help">2–16 letters, numbers, spaces, _ or -</p>
                    <fieldset class="character-palette"><legend>SELECT COLOUR</legend><div class="character-swatches"></div></fieldset>
                    <p class="character-colour-hint">Hover or focus to preview. Select to keep.</p>
                    <p id="character-error" role="alert" hidden></p>
                    <div class="character-actions"><button id="${creating ? 'initialize-ninja' : 'save-character'}" type="submit" class="primary">${creating ? 'INITIALIZE NINJA' : 'SAVE CHANGES'}<span aria-hidden="true"> →</span></button>
                    ${options.onCancel ? '<button id="cancel-character" type="button">CANCEL</button>' : ''}
                    ${options.onGuest ? '<button id="guest-character" type="button" hidden>CONTINUE WITHOUT SAVING</button>' : ''}</div>
                    <p class="character-persistence">${options.persistent === false ? 'Session only until saved. This character will not survive a reload.' : 'Saved for this browser. Customize any time from the main menu.'}</p>
                </form>
            </div>
        </section>`;
        const form = this.container.querySelector<HTMLFormElement>('#character-form')!;
        const name = this.container.querySelector<HTMLInputElement>('#operative-name')!;
        const displayName = this.container.querySelector<HTMLElement>('#character-preview-name')!;
        const displayColour = this.container.querySelector<HTMLElement>('#character-preview-colour')!;
        const canvas = this.container.querySelector<HTMLCanvasElement>('#ninja-preview')!;
        const palette = this.container.querySelector<HTMLElement>('.character-swatches')!;
        const error = this.container.querySelector<HTMLElement>('#character-error')!;
        const submit = this.container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
        const guest = this.container.querySelector<HTMLButtonElement>('#guest-character');
        name.value = creating && !options.profile ? '' : saved.name;
        name.placeholder = 'ShadowByte';
        this.preview = new NinjaPreview(canvas, selectedColour);

        const updateName = (): void => {
            displayName.textContent = name.value.trim() || 'YOUR NINJA';
            name.removeAttribute('aria-invalid');
            if (!saving) error.hidden = true;
        };
        const buttons = new Map<CharacterColour, HTMLButtonElement>();
        const updatePreview = (): void => {
            previewColour = pointerColour ?? keyboardColour;
            const displayed = previewColour ?? selectedColour;
            const colour = CHARACTER_COLOURS.find(c => c.id === displayed)!;
            this.container.style.setProperty('--character-accent', colourHex(displayed));
            displayColour.textContent = `${colour.name.toUpperCase()}${previewColour !== null && previewColour !== selectedColour ? ' / PREVIEW' : ' / SELECTED'}`;
            canvas.setAttribute('aria-label', `${colour.name} ninja character preview`);
            this.preview?.setColour(displayed);
            for (const [id, button] of buttons) {
                button.setAttribute('aria-pressed', String(id === selectedColour));
                button.classList.toggle('previewing', id === previewColour);
            }
        };
        for (const colour of CHARACTER_COLOURS) {
            const button = document.createElement('button');
            button.type = 'button'; button.dataset.colour = colour.id;
            button.className = 'character-swatch';
            button.style.setProperty('--swatch', colour.hex);
            button.setAttribute('aria-label', colour.name);
            const dot = document.createElement('span'); dot.className = 'character-swatch-dot'; dot.setAttribute('aria-hidden', 'true');
            const label = document.createElement('span'); label.textContent = colour.name;
            button.append(dot, label);
            button.addEventListener('pointerenter', event => {
                if (event.pointerType === 'touch' || saving) return;
                pointerColour = colour.id; updatePreview();
            });
            button.addEventListener('pointerleave', () => {
                if (pointerColour === colour.id) pointerColour = null;
                updatePreview();
            });
            button.addEventListener('pointerdown', () => {
                pointerFocus = true;
                keyboardColour = null;
            });
            button.addEventListener('focus', () => {
                if (!pointerFocus && !saving) { keyboardColour = colour.id; updatePreview(); }
            });
            button.addEventListener('blur', () => {
                if (keyboardColour === colour.id) keyboardColour = null;
                updatePreview();
            });
            button.addEventListener('click', () => {
                if (saving) return;
                selectedColour = colour.id;
                pointerFocus = false;
                updatePreview();
            });
            buttons.set(colour.id, button); palette.append(button);
        }
        // Pointer-triggered focus is not a keyboard preview: leaving swatches restores selection.
        const keydown = (event: KeyboardEvent): void => {
            if (event.key === 'Tab') {
                pointerFocus = false;
                pointerColour = null;
                updatePreview();
            }
        };
        form.addEventListener('keydown', keydown);
        name.addEventListener('input', updateName);
        const validate = (): PublicCharacterProfile | null => {
            const result = validateCharacterProfile({ name: name.value, colour: selectedColour });
            if (result.ok) return result.profile;
            error.textContent = result.error; error.hidden = false;
            name.setAttribute('aria-invalid', 'true'); name.focus();
            return null;
        };
        const setSaving = (value: boolean): void => {
            saving = value;
            for (const element of form.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, button')) element.disabled = value;
            submit.textContent = value ? 'SAVING CHARACTER…' : creating ? 'INITIALIZE NINJA →' : 'SAVE CHANGES →';
            form.setAttribute('aria-busy', String(value));
        };
        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (saving) return;
            const profile = validate();
            if (!profile) return;
            error.hidden = true; setSaving(true);
            try {
                await options.onSave(profile);
            } catch (reason) {
                if (!this.active || !form.isConnected) return;
                error.textContent = reason instanceof Error ? reason.message : 'Character could not be saved. Please retry.';
                error.hidden = false;
                if (guest) guest.hidden = false;
            } finally {
                if (this.active && form.isConnected) setSaving(false);
            }
        });
        guest?.addEventListener('click', () => {
            const profile = validate();
            if (profile) options.onGuest?.(profile);
        });
        this.container.querySelector('#cancel-character')?.addEventListener('click', () => options.onCancel?.());
        this.cleanup = () => form.removeEventListener('keydown', keydown);
        updateName(); updatePreview();
        name.focus({ preventScroll: true });
    }

    close(): void {
        this.active = false;
        this.preview?.dispose();
        this.preview = null;
        this.cleanup?.();
        this.cleanup = null;
        this.container.classList.remove('character-menu');
        this.container.style.removeProperty('--character-accent');
        this.container.setAttribute('aria-label', 'Start or continue');
    }

    dispose(): void { this.close(); }
}
