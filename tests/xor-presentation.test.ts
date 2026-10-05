import { expect, it } from 'vitest';
import { decodeXor, revealXor, XOR_MESSAGES, PRESENTATION_XOR_KEY } from '../src/slice/xor-presentation.ts';
import { authoredPresentation, revealMessage } from '../src/slice/presentation.ts';
import { validatedTraceController } from '../src/slice/validated-controller.ts';
import type { ControllerInputs } from '../src/slice/controller.ts';

it('decodes the authored bytes deterministically and reveals stored ciphertext before plaintext', () => {
    expect(PRESENTATION_XOR_KEY).toBe(0x5a);
    expect(Object.fromEntries(Object.entries(XOR_MESSAGES).map(([id, bytes]) => [id, decodeXor(bytes)]))).toEqual({
        anchor: 'ANCHOR CONTROL ONLINE', relay: 'RELAY LINK ESTABLISHED', lift: 'LIFT FIELD ONLINE',
        latched: 'LIFT FIELD LATCHED', payload: 'PAYLOAD STILL REQUIRED', return: 'RETURN PATH UNLOCKED', ready: 'UPLINK READY',
    });
    for (const bytes of Object.values(XOR_MESSAGES)) {
        const ciphertext = bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
        expect(revealXor(bytes, 0)).toBe(ciphertext);
        expect(revealXor(bytes, -1)).toBe(ciphertext);
        expect(revealXor(bytes, 1)).toBe(decodeXor(bytes));
        expect(revealXor(bytes, 2)).toBe(decodeXor(bytes));
        expect(revealXor(bytes, .5)).toBe(decodeXor(bytes).slice(0, Math.floor(bytes.length / 2)) + ciphertext.slice(Math.floor(bytes.length / 2) * 2));
    }
});
it('keeps authored XOR feedback distinct from the validated controller and masks inactive text', () => {
    const i: ControllerInputs = { plateA: false, plateB: true, plateC: false, cubeOnPlate: false, cubeOnPlateB: true, cubeOnPlateC: false, switchB: true, switchC: false };
    const frame = validatedTraceController.evaluate('uplink', i);
    const first = authoredPresentation.describe('uplink', frame, 'liftField');
    expect(first.text).toBe('LIFT FIELD ONLINE');
    expect(first.label).toContain('AUTHORED SINGLE-BYTE XOR');
    expect(first.label).toContain('NOT BINARY EVIDENCE');
    expect(frame.source).toBe('validated-trace');
    const latched = validatedTraceController.evaluate('uplink', { ...i, plateB: false, switchC: true });
    expect(authoredPresentation.describe('uplink', latched, 'liftField').text).toBe('LIFT FIELD LATCHED');
    expect(authoredPresentation.describe('uplink', latched, 'codePlatformA').text).toBe('PAYLOAD STILL REQUIRED');
    const ghost = authoredPresentation.describe('uplink', latched, 'codePlatformB');
    expect(revealMessage(ghost, 1)).toBe(revealXor(XOR_MESSAGES.return, 0));
    const delivered = validatedTraceController.evaluate('uplink', { ...i, switchC: true, cubeOnPlateC: true });
    expect(revealMessage(authoredPresentation.describe('uplink', delivered, 'codePlatformB'), 1)).toBe('RETURN PATH UNLOCKED');
});
