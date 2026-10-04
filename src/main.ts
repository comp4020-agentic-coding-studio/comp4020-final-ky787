import { SliceGame } from './slice/game.ts';
declare global {
    var binaryNinja: SliceGame | undefined;
}
const host = document.querySelector<HTMLElement>('#app');
const canvas = document.querySelector<HTMLCanvasElement>('#stage');
if (host && canvas) {
    const game = new SliceGame(host, canvas);
    globalThis.binaryNinja = game;
    void game.start();
}
