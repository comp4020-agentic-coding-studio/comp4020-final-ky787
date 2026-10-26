/** Existing gameplay routes traverse the new menus with real browser clicks. */
export async function navigateMenu(
    read: <T>(expression: string) => Promise<T>,
    click: (selector: string) => Promise<void>,
    selector: string,
): Promise<void> {
    const visible = (target: string) => read<boolean>(`(()=>{const e=document.querySelector(${JSON.stringify(target)});return !!e && e.checkVisibility() && e.getBoundingClientRect().width>0 && e.getBoundingClientRect().height>0})()`);
    if (await visible(selector)) return;
    const home = async () => {
        if (await visible('#main-menu')) await click('#main-menu');
        else if (await visible('#back-main')) {
            await click('#back-main');
            if (!await visible('#play-coop') && await visible('#back-main')) await click('#back-main');
        }
    };
    if (selector === '#create-party' || selector === '#create-room' || selector.startsWith('[data-create-lab') || selector === '#join-code') {
        if (!await visible('#create-party') && !await visible('#show-join')) { await home(); if (await visible('#play-coop')) await click('#play-coop'); }
        if (selector === '#join-code' && await visible('#show-join')) await click('#show-join');
        if (selector === '#create-room' || selector.startsWith('[data-create-lab')) {
            if (!await visible(selector)) await click('.internal-labs summary');
        }
    } else if (selector.startsWith('[data-room') || selector === '#reset-progress') {
        if (!await visible('#reset-progress')) { await home(); if (await visible('#settings')) await click('#settings'); }
        if (selector.startsWith('[data-room') && !await visible(selector)) await click('.internal-labs summary');
    } else if (selector === '#audio-mute' || selector === '#audio-volume') {
        if (await visible('.pause-settings summary')) await click('.pause-settings summary');
        else { await home(); if (await visible('#settings')) await click('#settings'); }
    } else if (selector === '#my-levels' || selector === '#open-workbench') {
        await home(); if (await visible('#level-builder')) await click('#level-builder');
    }
}
