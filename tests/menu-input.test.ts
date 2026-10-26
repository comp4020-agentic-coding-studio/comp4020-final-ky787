// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { InputManager } from '../src/ui/input.ts';
let input: InputManager | undefined;
afterEach(() => { input?.dispose(); document.body.replaceChildren(); });
function setup() {
    const canvas = document.createElement('canvas'); document.body.append(canvas);
    input = new InputManager(true); input.attach(canvas, document.body); return input;
}
const key = (type: string, code: string, repeat = false) => document.body.dispatchEvent(new KeyboardEvent(type, { code, repeat, bubbles: true }));
it('pausing clears held movement, jump, grapple and queued actions immediately', () => {
    const i = setup(); key('keydown', 'KeyD'); key('keydown', 'Space'); key('keydown', 'KeyE'); key('keydown', 'KeyR');
    i.sync({ x: 100, y: 20 }); expect(i.state.right).toBe(true);
    i.setEnabled(false); expect(i.state.right).toBe(false); expect(i.state.jumpHeld).toBe(false);
    expect(i.takeEdges()).toEqual({ jump: false, grapple: false, airGrapple: false, interact: false }); expect(i.takeAction('reset')).toBe(false);
});
it('menu input cannot queue movement or jump, and held key repeats do not move on resume', () => {
    const i = setup(); i.setEnabled(false); key('keydown', 'KeyD'); key('keydown', 'Space'); key('keydown', 'KeyE');
    i.setEnabled(true); key('keydown', 'KeyD', true); i.sync({ x: 0, y: 0 });
    expect(i.state.right).toBe(false); expect(i.takeEdges()).toEqual({ jump: false, grapple: false, airGrapple: false, interact: false });
    key('keyup', 'KeyD'); key('keydown', 'KeyD'); i.sync({ x: 0, y: 0 }); expect(i.state.right).toBe(true);
});
