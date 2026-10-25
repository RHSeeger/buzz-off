import { h } from './dom.js';
import { openModal } from './modal.js';
import { cap } from './progress.js';
import { RANKS } from '../config.js';
import { formatLongDate } from '../dates.js';
import { rankIndexFor, scoreOf } from '../puzzle.js';

// day: yesterday's stored state; puzzle: yesterday's puzzle.
export function showYesterday(key, day, puzzle) {
  const found = new Set(day.found.map((f) => f.w));
  const score = scoreOf([...found], puzzle);
  const rank = RANKS[rankIndexFor(score, puzzle.maxScore)].name;
  const played = found.size > 0;
  openModal({
    title: "Yesterday's Answers",
    content: [
      h('p', { class: 'muted' }, formatLongDate(key), puzzle.source === 'nyt' ? ' · imported puzzle' : ''),
      h('div', { class: 'hint-letters' }, puzzle.letters.map((l, i) => h('span', { class: i === 0 ? 'center' : '' }, l.toUpperCase()))),
      h('p', { class: 'lead' }, played
        ? [h('b', {}, `${found.size} of ${puzzle.answers.length}`), ` words · ${score} of ${puzzle.maxScore} points · `, h('b', {}, rank)]
        : `You didn't play this one. It had ${puzzle.answers.length} words and ${puzzle.pangrams.length} pangram${puzzle.pangrams.length === 1 ? '' : 's'}.`),
      h('ul', { class: 'answer-list' }, puzzle.answers.map((w) =>
        h('li', { class: `${found.has(w) ? 'found' : 'missed'}${puzzle.pangrams.includes(w) ? ' pangram' : ''}` },
          h('span', { class: 'check', 'aria-hidden': 'true' }, found.has(w) ? '✓' : ''),
          cap(w),
          h('span', { class: 'visually-hidden' }, found.has(w) ? ' (found)' : ' (missed)'),
        ))),
      h('p', { class: 'muted small' }, 'Bold words are pangrams. Words with a check are ones you found.'),
    ],
  });
}
