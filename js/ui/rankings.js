import { h } from './dom.js';
import { openModal } from './modal.js';
import { rankIndexFor, rankThresholds } from '../puzzle.js';

export function showRankings(score, maxScore) {
  const idx = rankIndexFor(score, maxScore);
  const t = rankThresholds(maxScore);
  const next = t[idx + 1];
  openModal({
    title: 'Rankings',
    content: [
      h('p', { class: 'lead' }, 'Ranks are based on a percentage of possible points in a puzzle.'),
      next && h('p', {}, h('b', {}, `${next.min - score}`), ` point${next.min - score === 1 ? '' : 's'} to `, h('b', {}, next.name)),
      h('table', { class: 'rank-table' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Rank'), h('th', { class: 'num' }, 'Minimum score'))),
        h('tbody', {}, [...t].reverse().map((r) =>
          h('tr', { class: r.index === idx ? 'current' : r.index < idx ? 'reached' : '' },
            h('td', {}, h('span', { class: 'rank-dot' }), r.name, r.index === idx ? h('span', { class: 'you' }, ` · ${score}`) : null),
            h('td', { class: 'num' }, String(r.min)),
          ))),
      ),
    ],
  });
}
