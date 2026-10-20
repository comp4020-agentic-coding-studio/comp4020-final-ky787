/** Complete real first-visit UI; never bypass the profile gate or seed its storage. */
export interface OnboardingPage {
    read<T>(expression: string): Promise<T>;
    send(method: string, params?: Record<string, unknown>): Promise<unknown>;
}
export async function onboardNinja(page: OnboardingPage, name = 'TestNinja', colour = 'cyan'): Promise<void> {
    const deadline = Date.now() + 15000;
    while (!await page.read<boolean>("!!document.querySelector('#initialize-ninja') || !!globalThis.binaryNinja?.snapshot().character.ready")) {
        if (Date.now() > deadline) throw new Error('Character onboarding did not become ready');
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    if (await page.read<boolean>('!!globalThis.binaryNinja?.snapshot().character.ready')) return;
    async function click(selector: string) {
        const at = await page.read<{x:number;y:number}>(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
        for (const type of ['mousePressed', 'mouseReleased']) await page.send('Input.dispatchMouseEvent', { type, ...at, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
    }
    await click('#operative-name');
    for (const type of ['rawKeyDown', 'keyUp']) await page.send('Input.dispatchKeyEvent', { type, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
    await page.send('Input.insertText', { text: name });
    await click(`[data-colour="${colour}"]`);
    await click('#initialize-ninja');
    while (!await page.read<boolean>('!!globalThis.binaryNinja?.snapshot().character.ready')) {
        if (Date.now() > deadline) throw new Error('Character initialization did not finish');
        await new Promise(resolve => setTimeout(resolve, 25));
    }
}
