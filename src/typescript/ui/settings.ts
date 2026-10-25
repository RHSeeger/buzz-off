import { APP_NAME } from '../data/app';
import { bookmarkletHref, currentGameUrl } from '../gamelogic/bookmarklet';
import type { DayState } from '../types/DayState';
import type { SettingsActions } from '../types/SettingsActions';
import type { Theme } from '../types/Theme';
import { h } from './dom';
import { closeModal, openModal } from './modal';
import { showToast } from './toast';

/**
 * The Menu screen (theme, today's puzzle, about, reset), and the screen explaining how to load the NYT puzzle.
 */

/** The theme choices, as shown */
const THEMES: [Theme, string][] = [
    ['auto', 'Auto'],
    ['light', 'Light'],
    ['dark', 'Dark'],
];

/**
 * Copies text to the clipboard, with a fallback for browsers that block the modern way.
 *
 * @param text - The text
 */
async function copyText(text: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const ta = h('textarea', {}, text);
        document.body.append(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
    }
}

/**
 * Opens the Menu screen.
 *
 * @param options - The current theme, today's play, whether today is locked in, and what the menu can ask for
 */
export function showSettings(options: {
    theme: Theme;
    day: DayState;
    locked: boolean;
    actions: SettingsActions;
}): void {
    const { theme, day, locked, actions } = options;
    const themeRow = h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'Theme' });
    for (const [value, label] of THEMES) {
        const btn = h('button', { type: 'button', role: 'radio', 'aria-checked': String(theme === value) }, label);
        btn.classList.toggle('on', theme === value);
        btn.addEventListener('click', () => {
            actions.setTheme(value);
            for (const b of themeRow.querySelectorAll('button')) {
                b.classList.toggle('on', b === btn);
                b.setAttribute('aria-checked', String(b === btn));
            }
        });
        themeRow.append(btn);
    }

    openModal({
        title: 'Menu',
        content: [
            h('h3', {}, 'Appearance'),
            themeRow,
            h('h3', {}, "Today's puzzle"),
            h(
                'p',
                {},
                day.source === 'nyt'
                    ? "Today you're playing the imported NYT puzzle."
                    : "Today you're playing the generated puzzle.",
            ),
            locked
                ? h('p', { class: 'muted small' }, "You've found a word, so today's puzzle is locked in.")
                : h(
                      'div',
                      { class: 'button-row' },
                      day.source === 'nyt'
                          ? h(
                                'button',
                                {
                                    class: 'pill',
                                    type: 'button',
                                    onclick: () => {
                                        actions.useGenerated();
                                        closeModal();
                                    },
                                },
                                'Play the generated puzzle instead',
                            )
                          : h(
                                'button',
                                { class: 'pill', type: 'button', onclick: () => showNytImport(actions) },
                                "Load today's NYT puzzle",
                            ),
                  ),
            day.source !== 'nyt' &&
                !locked &&
                h('p', { class: 'muted small' }, 'Loading the NYT puzzle requires a quick manual step.'),
            h('h3', {}, 'About'),
            h(
                'p',
                { class: 'small' },
                `${APP_NAME} uses a word list derived from SCOWL (`,
                h('a', { href: 'data/LICENSE-wordlist.txt', target: '_blank', rel: 'noopener' }, 'license'),
                ').',
            ),
            h(
                'details',
                { class: 'danger-zone' },
                h('summary', {}, 'Reset'),
                h('p', { class: 'small' }, 'Erase all progress, stats and badges on this device.'),
                h(
                    'button',
                    {
                        class: 'pill danger',
                        type: 'button',
                        onclick: () => {
                            if (confirm('Erase all progress, stats and badges on this device?')) actions.resetAll();
                        },
                    },
                    'Erase everything',
                ),
            ),
        ],
    });
}

/**
 * Opens the screen explaining how to load the NYT puzzle: setting up the bookmarklet, using it each day, and a box to
 * paste the puzzle data into instead.
 *
 * @param actions - What the screen can ask for (loading the pasted data)
 */
export function showNytImport(actions: SettingsActions): void {
    const href = bookmarkletHref(currentGameUrl());
    const copyBtn = h(
        'button',
        { class: 'pill primary', type: 'button', 'data-autofocus': true },
        'Copy bookmarklet code',
    );
    copyBtn.addEventListener('click', async () => {
        await copyText(href);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => (copyBtn.textContent = 'Copy bookmarklet code'), 2000);
    });
    const paste = h('textarea', { class: 'paste', rows: '3', placeholder: 'v1;d:…', 'aria-label': 'Puzzle data' });
    const dragLink = h(
        'a',
        {
            class: 'bookmarklet-link',
            href,
            onclick: (e: Event) => {
                e.preventDefault();
                showToast('Drag this to your bookmarks bar instead of clicking it.');
            },
        },
        'nytbee',
    );
    const code = (text: string): HTMLElement => h('code', {}, text);

    openModal({
        title: "Load today's NYT puzzle",
        content: [
            h('h3', {}, 'One-time setup'),
            copyBtn,
            h(
                'details',
                { class: 'platform', open: true },
                h('summary', {}, 'iPhone (Safari)'),
                h(
                    'ol',
                    {},
                    h('li', {}, 'Bookmark any page (Share → Add Bookmark).'),
                    h('li', {}, 'Open Bookmarks → Edit, tap the new bookmark.'),
                    h(
                        'li',
                        {},
                        'Change its name to ',
                        code('nytbee'),
                        ' and replace its address with the copied code.',
                    ),
                    h('li', {}, 'To use: on the NYT puzzle page, open Bookmarks and tap ', code('nytbee'), '.'),
                ),
            ),
            h(
                'details',
                { class: 'platform' },
                h('summary', {}, 'Android (Chrome)'),
                h(
                    'ol',
                    {},
                    h('li', {}, 'Bookmark any page (⋮ → ☆), then edit the bookmark.'),
                    h('li', {}, 'Name it ', code('nytbee'), ' and paste the code as the URL.'),
                    h(
                        'li',
                        {},
                        'To use: on the NYT puzzle page, tap the address bar, type ',
                        code('nytbee'),
                        ', and tap the bookmark suggestion.',
                    ),
                    h('li', {}, 'Tapping it from the bookmarks list does not work on Android Chrome.'),
                ),
            ),
            h(
                'details',
                { class: 'platform' },
                h('summary', {}, 'Desktop'),
                h('p', {}, 'Drag this link to your bookmarks bar: ', dragLink),
            ),
            h('h3', {}, 'Every day'),
            h(
                'ol',
                {},
                h(
                    'li',
                    {},
                    'Open ',
                    h(
                        'a',
                        { href: 'https://www.nytimes.com/puzzles/spelling-bee', target: '_blank', rel: 'noopener' },
                        'the NYT puzzle',
                    ),
                    '. If the NYT Games app opens instead, long-press the link and choose “Open in browser”. ' +
                        'Bookmarklets can’t run inside apps.',
                ),
                h('li', {}, 'Run the ', code('nytbee'), ' bookmark.'),
                h('li', {}, 'This game reopens with the puzzle loaded.'),
            ),
            h('h3', {}, 'Or paste puzzle data'),
            paste,
            h(
                'div',
                { class: 'button-row' },
                h(
                    'button',
                    {
                        class: 'pill',
                        type: 'button',
                        onclick: () => {
                            if (paste.value.trim()) actions.importPayload(paste.value);
                        },
                    },
                    'Load pasted puzzle',
                ),
            ),
        ],
    });
}
