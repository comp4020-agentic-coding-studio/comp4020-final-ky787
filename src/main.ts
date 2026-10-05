import type { SliceGame } from './slice/game.ts';
declare global { var binaryNinja: SliceGame | undefined; }
const host = document.querySelector<HTMLElement>('#app');
const canvas = document.querySelector<HTMLCanvasElement>('#stage');
if (host && canvas) {
    // Import validation errors must be visible, never masked by a mock fallback.
    import('./slice/game.ts').then(async ({ SliceGame }) => {
        const game = new SliceGame(host, canvas);
        globalThis.binaryNinja = game;
        await game.start();
    }).catch(error => {
        console.error(error);
        const menu = document.querySelector<HTMLElement>('#menu')!;
        menu.hidden = false;
        const card = document.createElement('div'); card.className = 'menu-card';
        const title = document.createElement('h2'); title.textContent = 'Controller evidence unavailable';
        const detail = document.createElement('p'); detail.textContent = String(error);
        card.append(title, detail); menu.replaceChildren(card);
    });
}
