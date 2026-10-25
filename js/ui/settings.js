// Settings menu and the imported-puzzle (NYT) instructions screen.

import { h } from './dom.js';
import { openModal, closeModal } from './modal.js';
import { showToast } from './toast.js';
import { bookmarkletHref, currentGameUrl } from '../bookmarklet.js';
import { APP_NAME } from '../config.js';

// actions: { setTheme, importPayload(text), useGenerated(), resetAll() }
export function showSettings({ theme, day, locked, actions }) {
  const themeRow = h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'Theme' },
    [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([v, label]) =>
      h('button', {
        type: 'button', role: 'radio', 'aria-checked': String(theme === v), class: theme === v ? 'on' : '',
        onclick: (e) => {
          actions.setTheme(v);
          for (const b of themeRow.children) { b.classList.toggle('on', b === e.currentTarget); b.setAttribute('aria-checked', String(b === e.currentTarget)); }
        },
      }, label)));

  const sourceText = day.source === 'nyt'
    ? "Today you're playing the imported NYT puzzle."
    : "Today you're playing the generated puzzle.";

  openModal({
    title: 'Menu',
    content: [
      h('h3', {}, 'Appearance'),
      themeRow,
      h('h3', {}, "Today's puzzle"),
      h('p', {}, sourceText),
      locked
        ? h('p', { class: 'muted small' }, "You've found a word, so today's puzzle is locked in.")
        : h('div', { class: 'button-row' },
          day.source === 'nyt'
            ? h('button', { class: 'pill', type: 'button', onclick: () => { actions.useGenerated(); closeModal(); } }, 'Play the generated puzzle instead')
            : h('button', { class: 'pill', type: 'button', onclick: () => showNytImport(actions) }, "Load today's NYT puzzle"),
        ),
      day.source !== 'nyt' && !locked && h('p', { class: 'muted small' }, 'Loading the NYT puzzle requires a quick manual step.'),
      h('h3', {}, 'About'),
      h('p', { class: 'small' }, `${APP_NAME} uses a word list derived from SCOWL (`, h('a', { href: 'data/LICENSE-wordlist.txt', target: '_blank', rel: 'noopener' }, 'license'), ').'),
      h('details', { class: 'danger-zone' },
        h('summary', {}, 'Reset'),
        h('p', { class: 'small' }, 'Erase all progress, stats and badges on this device.'),
        h('button', {
          class: 'pill danger', type: 'button',
          onclick: () => { if (confirm('Erase all progress, stats and badges on this device?')) actions.resetAll(); },
        }, 'Erase everything'),
      ),
    ],
  });
}

export function showNytImport(actions) {
  const href = bookmarkletHref(currentGameUrl());
  const copy = async (btn) => {
    try {
      await navigator.clipboard.writeText(href);
    } catch {
      const ta = h('textarea', {}, href);
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy bookmarklet code'; }, 2000);
  };
  const paste = h('textarea', { class: 'paste', rows: '3', placeholder: 'v1;d:…', 'aria-label': 'Puzzle data' });
  const dragLink = h('a', { class: 'bookmarklet-link', href, onclick: (e) => { e.preventDefault(); showToast('Drag this to your bookmarks bar instead of clicking it.'); } }, 'nytbee');

  openModal({
    title: "Load today's NYT puzzle",
    content: [
      h('h3', {}, 'One-time setup'),
      h('button', { class: 'pill primary', type: 'button', 'data-autofocus': true, onclick: (e) => copy(e.currentTarget) }, 'Copy bookmarklet code'),
      h('details', { class: 'platform', open: true },
        h('summary', {}, 'iPhone (Safari)'),
        h('ol', {},
          h('li', {}, 'Bookmark any page (Share → Add Bookmark).'),
          h('li', {}, 'Open Bookmarks → Edit, tap the new bookmark.'),
          h('li', {}, 'Change its name to ', h('code', {}, 'nytbee'), ' and replace its address with the copied code.'),
          h('li', {}, 'To use: on the NYT puzzle page, open Bookmarks and tap ', h('code', {}, 'nytbee'), '.'),
        )),
      h('details', { class: 'platform' },
        h('summary', {}, 'Android (Chrome)'),
        h('ol', {},
          h('li', {}, 'Bookmark any page (⋮ → ☆), then edit the bookmark.'),
          h('li', {}, 'Name it ', h('code', {}, 'nytbee'), ' and paste the code as the URL.'),
          h('li', {}, 'To use: on the NYT puzzle page, tap the address bar, type ', h('code', {}, 'nytbee'), ', and tap the bookmark suggestion.'),
          h('li', {}, 'Tapping it from the bookmarks list does not work on Android Chrome.'),
        )),
      h('details', { class: 'platform' },
        h('summary', {}, 'Desktop'),
        h('p', {}, 'Drag this link to your bookmarks bar: ', dragLink),
      ),
      h('h3', {}, 'Every day'),
      h('ol', {},
        h('li', {}, 'Open ', h('a', { href: 'https://www.nytimes.com/puzzles/spelling-bee', target: '_blank', rel: 'noopener' }, 'the NYT puzzle'),
          '. If the NYT Games app opens instead, long-press the link and choose “Open in browser”. Bookmarklets can’t run inside apps.'),
        h('li', {}, 'Run the ', h('code', {}, 'nytbee'), ' bookmark.'),
        h('li', {}, 'This game reopens with the puzzle loaded.'),
      ),
      h('h3', {}, 'Or paste puzzle data'),
      paste,
      h('div', { class: 'button-row' },
        h('button', { class: 'pill', type: 'button', onclick: () => { if (paste.value.trim()) actions.importPayload(paste.value); } }, 'Load pasted puzzle')),
    ],
  });
}
