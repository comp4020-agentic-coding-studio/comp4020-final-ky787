// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { InputManager } from '../src/ui/input.ts';
let input: InputManager | undefined;
afterEach(() => { vi.restoreAllMocks(); input?.dispose(); document.body.replaceChildren(); });
function setup() {
    const canvas = document.createElement('canvas'); document.body.append(canvas);
    input = new InputManager(true); input.attach(canvas, document.body); return input;
}
const key = (type: string, code: string, repeat = false) => document.body.dispatchEvent(new KeyboardEvent(type, { code, repeat, bubbles: true }));
it('pausing clears held movement, jump, grapple and queued actions immediately', () => {
    const i = setup(); key('keydown', 'KeyD'); key('keydown', 'Space'); key('keydown', 'KeyE'); key('keydown', 'KeyR');
    i.sync({ x: 100, y: 20 }); expect(i.state.right).toBe(true);
    i.setEnabled(false); expect(i.state.right).toBe(false); expect(i.state.jumpHeld).toBe(false);
    expect(i.takeEdges()).toEqual({ jump: false, grapple: false, airGrapple: false, airGrappleReleased: false, interact: false }); expect(i.takeAction('reset')).toBe(false);
});
it('menu input cannot queue movement or jump, and held key repeats do not move on resume', () => {
    const i = setup(); i.setEnabled(false); key('keydown', 'KeyD'); key('keydown', 'Space'); key('keydown', 'KeyE');
    i.setEnabled(true); key('keydown', 'KeyD', true); i.sync({ x: 0, y: 0 });
    expect(i.state.right).toBe(false); expect(i.takeEdges()).toEqual({ jump: false, grapple: false, airGrapple: false, airGrappleReleased: false, interact: false });
    key('keyup', 'KeyD'); key('keydown', 'KeyD'); i.sync({ x: 0, y: 0 }); expect(i.state.right).toBe(true);
});
it('latches a Space release exactly once even when focus moves to a form before the fixed step', () => {
    const i = setup(); key('keydown', 'Space'); i.takeEdges();
    const field = document.createElement('input'); document.body.append(field);
    field.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true }));
    expect(i.takeEdges().airGrappleReleased).toBe(true);
    i.sync({ x: 0, y: 0 }); expect(i.state.airGrappleHeld).toBe(false);
    expect(i.takeEdges().airGrappleReleased).toBe(false);
});
it('does not carry releases over pause, reset or blur, and keeps W separate from Space ownership', () => {
    const i = setup();
    for (const clear of [() => i.setEnabled(false), () => i.releaseAll(), () => window.dispatchEvent(new Event('blur'))]) {
        i.setEnabled(true); key('keydown', 'Space'); key('keyup', 'Space'); clear(); i.setEnabled(true);
        expect(i.takeEdges().airGrappleReleased).toBe(false);
        key('keyup', 'Space'); expect(i.takeEdges().airGrappleReleased).toBe(false);
    }
    key('keydown', 'KeyW'); i.sync({ x: 0, y: 0 });
    expect(i.state.jumpHeld).toBe(true); expect(i.state.airGrappleHeld).toBe(false);
    key('keyup', 'KeyW'); expect(i.takeEdges().airGrappleReleased).toBe(false);
});
it('touch jump supports the same hold and release edges; cancellation is not a jump-off', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 1, configurable: true });
    const i = setup(), button = document.querySelector('[data-touch="jump"]')!;
    const pointer = (type: string) => button.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
    pointer('pointerdown'); expect(i.takeEdges().airGrapple).toBe(true); i.sync({ x: 0, y: 0 });
    expect(i.state.airGrappleHeld).toBe(true);
    pointer('pointerup'); expect(i.takeEdges().airGrappleReleased).toBe(true); i.sync({ x: 0, y: 0 });
    expect(i.state.airGrappleHeld).toBe(false);
    pointer('pointerdown'); i.takeEdges(); pointer('pointercancel');
    expect(i.takeEdges().airGrappleReleased).toBe(false);
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true });
});

it('preserves a fast tap then hold in order across fixed steps', () => {
    const i = setup(); key('keydown', 'Space'); key('keyup', 'Space'); key('keydown', 'Space');
    i.sync({ x: 0, y: 0 });
    expect(i.takeEdges()).toMatchObject({ jump: true, airGrapple: true, airGrappleReleased: false });
    expect(i.state.airGrappleHeld).toBe(true);
    expect(i.takeEdges()).toMatchObject({ jump: false, airGrapple: false, airGrappleReleased: true });
    expect(i.state.airGrappleHeld).toBe(false);
    expect(i.takeEdges()).toMatchObject({ jump: true, airGrapple: true, airGrappleReleased: false });
    expect(i.state.airGrappleHeld).toBe(true);
    expect(i.takeEdges()).toMatchObject({ jump: false, airGrapple: false, airGrappleReleased: false });
});

it('intentional pointer movement overrides assistance briefly; mouse hold keeps precise aiming', () => {
    let now = 100;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const i = setup(), canvas = document.querySelector('canvas')!;
    canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 100, clientY: 100 }));
    i.sync({ x: 100, y: 100 }); expect(i.state.manualAim).toBe(true);
    now += 1600; i.sync({ x: 100, y: 100 }); expect(i.state.manualAim).toBe(false);
    canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 100, button: 0 }));
    now += 2000; i.sync({ x: 100, y: 100 }); expect(i.state.manualAim).toBe(true);
    window.dispatchEvent(new MouseEvent('pointerup', { button: 0 }));
    i.sync({ x: 100, y: 100 }); expect(i.state.manualAim).toBe(false);
});

it('remembers S at Space release even if S also goes up before the fixed step', () => {
    const i = setup(); key('keydown', 'Space'); i.takeEdges();
    key('keydown', 'KeyS'); key('keyup', 'Space'); key('keyup', 'KeyS');
    i.sync({ x: 0, y: 0 }); expect(i.state.down).toBe(false);
    expect(i.takeEdges().airGrappleReleased).toBe(true); expect(i.state.airGrappleReleaseDown).toBe(true);
    i.takeEdges(); expect(i.state.airGrappleReleaseDown).toBe(false);
});
