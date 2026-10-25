// Rank progress track and the found-words box.

import { h, icon, clear } from './dom.js';
import { RANKS } from '../config.js';
import { rankIndexFor, rankThresholds } from '../puzzle.js';

export function renderProgress(el, score, maxScore) {
  const idx = rankIndexFor(score, maxScore);
  const t = rankThresholds(maxScore);
  const last = RANKS.length - 1;
  const pct = (idx / last) * 100;
  const next = t[idx + 1];
  clear(el);
  el.setAttribute('aria-label', `Rank ${RANKS[idx].name}, ${score} points${next ? `, ${next.min - score} to ${next.name}` : ''}. Show rankings.`);
  const dots = t.map((r, i) =>
    h('span', { class: `dot${i <= idx ? ' reached' : ''}${i === last ? ' final' : ''}`, style: { left: `${(i / last) * 100}%` } }));
  el.append(
    h('span', { class: 'rank-name' }, RANKS[idx].name),
    h('span', { class: 'track' },
      h('span', { class: 'track-line' }),
      h('span', { class: 'track-fill', style: { width: `${pct}%` } }),
      dots,
      h('span', { class: 'track-marker', style: { left: `${pct}%` } }, String(score)),
    ),
  );
}

export function createWordbox(el) {
  let open = false;
  const count = h('span', { class: 'wordbox-count' });
  const preview = h('span', { class: 'wordbox-preview' });
  const head = h('button', { class: 'wordbox-head', type: 'button', 'aria-expanded': 'false' },
    count, preview, h('span', { class: 'wordbox-chevron' }, icon('chevron')));
  const list = h('ul', { class: 'wordbox-list', id: 'wordbox-list' });
  head.setAttribute('aria-controls', 'wordbox-list');
  head.addEventListener('click', () => set(!open));
  el.append(head, list);

  function set(v) {
    open = v;
    el.classList.toggle('open', open);
    head.setAttribute('aria-expanded', String(open));
  }

  return {
    close: () => set(false),
    render(found, puzzle, highlight) {
      const n = found.length;
      count.textContent = n === 0 ? 'Your words…' : `You have found ${n} word${n === 1 ? '' : 's'}`;
      clear(preview);
      const recent = found.slice(-8).reverse();
      for (const w of recent) preview.append(h('span', { class: puzzle.pangrams.includes(w) ? 'pangram' : '' }, cap(w)));
      clear(list);
      for (const w of [...found].sort()) {
        list.append(h('li', { class: `${puzzle.pangrams.includes(w) ? 'pangram' : ''}${w === highlight ? ' fresh' : ''}` }, cap(w)));
      }
    },
  };
}

export function cap(w) {
  return w.charAt(0).toUpperCase() + w.slice(1);
}
