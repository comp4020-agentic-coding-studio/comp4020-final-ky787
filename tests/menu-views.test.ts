// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { aboutMenu, builderMenu, connectionMenu, coopMenu, homeMenu, joinMenu, settingsMenu, soloPauseMenu } from '../src/menu/views.ts';

it('offers the five clear home destinations with a profile preview and an optional saved-room continuation', () => {
    document.body.innerHTML = homeMenu('02 / SWITCH');
    expect([...document.querySelectorAll('.home-nav button')].map(button => button.id)).toEqual(['tutorial', 'play-coop', 'level-builder', 'customize-ninja', 'about']);
    expect(document.querySelector('#home-ninja-preview')).toBeInstanceOf(HTMLCanvasElement);
    expect(document.querySelector('#continue')?.textContent).toContain('02 / SWITCH');
    expect(document.querySelector('#settings')).not.toBeNull();
    expect(document.querySelector('.level-grid,.campaign-select,.progress-reset')).toBeNull();
    document.body.innerHTML = homeMenu();
    expect(document.querySelector('#continue')).toBeNull();
});

it('keeps host creation and invitation joining as separate, unambiguous actions', () => {
    document.body.innerHTML = coopMenu();
    expect(document.querySelector('#create-party')?.textContent).toContain('Start Co-op');
    expect(document.querySelector('#show-join')?.textContent).toContain('Join Co-op');
    expect(document.querySelector('[data-select-level]')).toBeNull();
    document.body.innerHTML = joinMenu();
    expect(document.querySelector('#join-room-form')).not.toBeNull();
    expect(document.querySelector('#join-code')?.getAttribute('maxlength')).toBeNull();
    expect(document.querySelector('#join-error')?.getAttribute('role')).toBe('alert');
});

it('keeps builder routes, settings, controls and connection recovery in their own destinations', () => {
    document.body.innerHTML = builderMenu();
    expect(document.querySelector('#open-workbench')?.getAttribute('href')).toBe('/workbench.html');
    expect(document.querySelector('#my-levels')?.getAttribute('href')).toBe('/my-levels.html');
    document.body.innerHTML = settingsMenu('<fieldset id="audio"></fieldset>', '<button id="reset-progress">Reset</button>');
    expect(document.querySelectorAll('#settings-content #audio,#settings-content #reset-progress')).toHaveLength(2);
    document.body.innerHTML = aboutMenu();
    expect(document.querySelector('.controls-guide')?.textContent).toContain('Aim at a grapple target');
    expect(document.querySelector('.about-evidence')?.textContent).toContain('not evidence about a binary');
    document.body.innerHTML = connectionMenu();
    expect(document.querySelector('#connection-status')?.getAttribute('role')).toBe('status');
    expect(document.querySelector('#retry-join')).not.toBeNull();
    expect(document.querySelector('#back-main')).not.toBeNull();
});

it('keeps pause compact and escapes room labels instead of treating them as markup', () => {
    document.body.innerHTML = soloPauseMenu('<img src=x onerror=alert(1)>', '');
    expect(document.querySelector('.pause-room')?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(document.querySelector('img')).toBeNull();
    expect([...document.querySelectorAll('.pause-card>button')].map(button => button.id)).toEqual(['continue', 'restart-room', 'main-menu']);
    expect(document.querySelector('#customize-ninja')).toBeNull();
    document.body.innerHTML = homeMenu('<img src=x>');
    expect(document.querySelector('#continue')?.textContent).toContain('<img src=x>');
    expect(document.querySelector('img')).toBeNull();
});
