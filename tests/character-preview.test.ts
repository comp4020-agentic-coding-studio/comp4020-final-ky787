// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NinjaPreview } from '../src/character/preview.ts';
import { drawNinja } from '../src/render/ninja.ts';

vi.mock('../src/render/ninja.ts', () => ({ drawNinja: vi.fn() }));
let preview: NinjaPreview | null = null;
let canvas: HTMLCanvasElement;
let motion: EventTarget & { matches: boolean };
let nextFrame: (time: number) => void;
const context = {
    setTransform: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    stroke: vi.fn(), fillRect: vi.fn(), save: vi.fn(), translate: vi.fn(), scale: vi.fn(), restore: vi.fn(),
    rotate: vi.fn(), arc: vi.fn(),
};
beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<canvas></canvas>';
    canvas = document.querySelector('canvas')!;
    vi.spyOn(canvas, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
    motion = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal('matchMedia', () => motion);
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: (time: number) => void) => { nextFrame = callback; return 1; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
});
afterEach(() => { preview?.dispose(); preview = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('sends transient colours directly to the existing ninja renderer', () => {
    preview = new NinjaPreview(canvas, 'cyan');
    expect(drawNinja).toHaveBeenLastCalledWith(context, expect.anything(), expect.any(Number), '#64E6D5');
    preview.setColour('purple');
    expect(drawNinja).toHaveBeenLastCalledWith(context, expect.anything(), expect.any(Number), '#B59BFF');
    expect(canvas.dataset.previewAccent).toBe('#B59BFF');
    preview.setColour('cyan');
    expect(drawNinja).toHaveBeenLastCalledWith(context, expect.anything(), expect.any(Number), '#64E6D5');
});

it('stops animation in hidden documents and disposes its pending frame', () => {
    preview = new NinjaPreview(canvas, 'cyan');
    const draws = vi.mocked(drawNinja).mock.calls.length;
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    nextFrame(performance.now() + 1000);
    expect(drawNinja).toHaveBeenCalledTimes(draws);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(drawNinja).toHaveBeenCalledTimes(draws + 1);
    preview.dispose();
    expect(cancelAnimationFrame).toHaveBeenCalled();
    nextFrame(performance.now() + 2000);
    expect(drawNinja).toHaveBeenCalledTimes(draws + 1);
});

it('respects reduced motion while still displaying colour changes immediately', () => {
    motion.matches = true;
    preview = new NinjaPreview(canvas, 'cyan');
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(drawNinja).toHaveBeenLastCalledWith(context, expect.objectContaining({ vx: 0, vy: 0, grounded: true }), 0, '#64E6D5');
    preview.setColour('orange');
    expect(drawNinja).toHaveBeenLastCalledWith(context, expect.anything(), 0, '#FFAC55');
    expect(requestAnimationFrame).not.toHaveBeenCalled();
});

it('draws the title-screen swing through the same character renderer with the selected profile colour', () => {
    preview = new NinjaPreview(canvas, 'purple', 'swing');
    expect(canvas.dataset.previewVariant).toBe('swing');
    expect(canvas.dataset.animation).toBe('swing');
    expect(canvas.width / canvas.height).toBeCloseTo(600 / 560);
    expect(drawNinja).toHaveBeenLastCalledWith(context, expect.objectContaining({ x: 0, y: 0, grounded: false }), expect.any(Number), '#B59BFF');
    const initial = vi.mocked(context.translate).mock.calls.at(-1);
    nextFrame(performance.now() + 1000);
    expect(vi.mocked(context.translate).mock.calls.at(-1)).not.toEqual(initial);
    preview.setColour('orange');
    expect(drawNinja).toHaveBeenLastCalledWith(context, expect.anything(), expect.any(Number), '#FFAC55');
});

it('keeps a readable static grapple pose in reduced motion and removes listeners when leaving home', () => {
    motion.matches = true;
    const documentCleanup = vi.spyOn(document, 'removeEventListener');
    const motionCleanup = vi.spyOn(motion, 'removeEventListener');
    preview = new NinjaPreview(canvas, 'cyan', 'swing');
    expect(canvas.dataset.animation).toBe('swing-still');
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(drawNinja).toHaveBeenLastCalledWith(context, expect.objectContaining({ vx: 0, vy: 0 }), 0, '#64E6D5');
    preview.dispose();
    expect(documentCleanup).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(motionCleanup).toHaveBeenCalledWith('change', expect.any(Function));
    const draws = vi.mocked(drawNinja).mock.calls.length;
    document.dispatchEvent(new Event('visibilitychange'));
    motion.dispatchEvent(new Event('change'));
    expect(drawNinja).toHaveBeenCalledTimes(draws);
});
