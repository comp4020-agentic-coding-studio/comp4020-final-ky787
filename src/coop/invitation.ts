import { normalizeCode } from './protocol.ts';

/** Invite links contain only the public party code, never debug or lab options. */
export function invitationUrl(code: string, origin: string): string {
    const accepted = normalizeCode(code);
    if (!accepted) throw new Error('Invalid party code');
    const url = new URL('/', origin);
    url.searchParams.set('join', accepted);
    return url.href;
}

export function readInvitation(href: string): { present: boolean; code: string | null } {
    const values = new URL(href).searchParams.getAll('join');
    return { present: values.length > 0, code: values.length === 1 ? normalizeCode(values[0]) : null };
}

/** Pasted URLs are data, not navigation. Accept only the link format we issue. */
export function parseJoinInput(value: string, origin: string): string | null {
    const code = normalizeCode(value);
    if (code) return code;
    try {
        const url = new URL(value.trim());
        if (url.origin !== new URL(origin).origin || !['http:', 'https:'].includes(url.protocol)
            || url.pathname !== '/' || url.hash || url.username || url.password
            || [...url.searchParams.keys()].some(key => key !== 'join')) return null;
        return readInvitation(url.href).code;
    } catch { return null; }
}

/** A failed connection must leave its invitation available for Retry. */
export function consumedInvitationUrl(href: string, acceptedCode: string): string | null {
    const invitation = readInvitation(href), code = normalizeCode(acceptedCode);
    if (!code || invitation.code !== code) return null;
    const url = new URL(href);
    url.searchParams.delete('join');
    return url.href;
}

/** Bind a freshly rendered lobby or pause card. All fallback values use DOM properties. */
export function bindPartyInvitation(root: HTMLElement, code: string, origin = location.origin, clipboard: Pick<Clipboard, 'writeText'> | undefined = navigator.clipboard): void {
    const link = invitationUrl(code, origin);
    const status = root.querySelector<HTMLElement>('#party-copy-status')!;
    const fallback = root.querySelector<HTMLElement>('#party-invite-fallback')!;
    const field = root.querySelector<HTMLInputElement>('#party-invite-link')!;
    field.value = link;
    field.addEventListener('click', () => field.select());
    for (const [selector, value, label, success] of [
        ['#party-copy', link, 'COPY LINK', 'Invitation link copied. Share it with your friend.'],
        ['#party-copy-code', code, 'Copy code', 'Party code copied.'],
    ]) {
        const button = root.querySelector<HTMLButtonElement>(selector);
        button?.addEventListener('click', async () => {
            if (button.disabled) return;
            button.disabled = true; button.textContent = label; status.textContent = '';
            try {
                if (!clipboard?.writeText) throw new Error('Clipboard unavailable');
                await clipboard.writeText(value);
                button.textContent = selector === '#party-copy' ? 'LINK COPIED' : 'Code copied';
                status.textContent = success;
                fallback.hidden = true;
            } catch {
                status.textContent = 'Clipboard unavailable. Select and copy this invitation link.';
                fallback.hidden = false;
                field.focus({ preventScroll: true }); field.select();
            } finally { button.disabled = false; }
        });
    }
}
