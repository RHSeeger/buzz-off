import { newDay } from '../../src/typescript/gamelogic/day';
import { closeModal } from '../../src/typescript/ui/modal';
import { showSettings } from '../../src/typescript/ui/settings';

/**
 * Tests for the Menu screen's NYT puzzle options.
 */

/** What the menu can ask for (mocks) */
const actions = () => ({
    setTheme: jest.fn(),
    importPayload: jest.fn(),
    useGenerated: jest.fn(),
    resetAll: jest.fn(),
});

/**
 * Returns the open modal's button with some text, if there is one.
 *
 * @param text - The text to look for
 * @returns The button, or undefined
 */
const button = (text: string): HTMLButtonElement | undefined =>
    [...document.querySelectorAll<HTMLButtonElement>('#modal-root button')].find((b) => b.textContent?.includes(text));

beforeEach(() => {
    document.body.innerHTML = '<div id="modal-root"></div><div id="toasts"></div>';
});

afterEach(() => closeModal());

describe('the NYT puzzle in the Menu', () => {
    it('offers to load it before the first word', () => {
        showSettings({ theme: 'auto', day: newDay('2026-10-24'), locked: false, nytAllowed: true, actions: actions() });
        button("Load today's NYT puzzle")?.click();
        expect(document.querySelector('.modal-title')?.textContent).toBe("Load today's NYT puzzle");
        expect(document.querySelector('textarea.paste')).not.toBeNull();
    });

    // Added 2026-10-24: the setup used to be unreachable once a word was found
    it('still offers the bookmarklet setup once today is locked, without the paste box', () => {
        showSettings({ theme: 'auto', day: newDay('2026-10-24'), locked: true, nytAllowed: true, actions: actions() });
        expect(button("Load today's NYT puzzle")).toBeUndefined();
        button('Set up the NYT puzzle bookmarklet')?.click();
        expect(document.querySelector('.modal-title')?.textContent).toBe('The NYT puzzle bookmarklet');
        expect(button('Copy bookmarklet code')).toBeDefined();
        expect(document.querySelector('textarea.paste')).toBeNull();
    });

    it('offers nothing for a family without the NYT import', () => {
        showSettings({ theme: 'auto', day: newDay('2026-10-24'), locked: true, nytAllowed: false, actions: actions() });
        expect(button('Set up the NYT puzzle bookmarklet')).toBeUndefined();
    });
});
