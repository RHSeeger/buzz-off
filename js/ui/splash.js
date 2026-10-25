// Welcome splash (every visit) and the Genius / Perfect celebration.

import { h, svg } from './dom.js';
import { openModal, closeModal } from './modal.js';
import { APP_NAME, RANKS } from '../config.js';
import { formatLongDate, dayIndex } from '../dates.js';

const LOGO = `<svg class="logo" viewBox="0 0 120 120" aria-hidden="true">
  <g stroke="currentColor" stroke-width="5" stroke-linejoin="round">
    <polygon class="logo-c" points="38,60 49,41 71,41 82,60 71,79 49,79"/>
    <polygon points="38,22 49,3 71,3 82,22 71,41 49,41" fill="none"/>
    <polygon points="38,98 49,79 71,79 82,98 71,117 49,117" fill="none"/>
    <polygon points="5,41 16,22 38,22 49,41 38,60 16,60" fill="none"/>
    <polygon points="71,41 82,22 104,22 115,41 104,60 82,60" fill="none"/>
    <polygon points="5,79 16,60 38,60 49,79 38,98 16,98" fill="none"/>
    <polygon points="71,79 82,60 104,60 115,79 104,98 82,98" fill="none"/>
  </g></svg>`;

export function showSplash({ todayKey, today, yesterday, stats, onPlay, onYesterday }) {
  const started = today && today.words > 0;
  openModal({
    title: APP_NAME,
    variant: 'splash',
    onClose: onPlay,
    content: [
      svg(LOGO),
      h('p', { class: 'splash-tag' }, 'How many words can you make with 7 letters?'),
      started
        ? h('p', { class: 'splash-progress' }, `You're at `, h('b', {}, RANKS[today.rank].name), ` with ${today.words} word${today.words === 1 ? '' : 's'}.`)
        : null,
      h('button', { class: 'pill primary big', type: 'button', 'data-autofocus': true, onclick: () => closeModal() }, started ? 'Continue' : 'Play'),
      stats.streak > 0 && h('p', { class: 'splash-streak' }, `🔥 ${stats.streak}-day streak`, started ? '' : '. Play today to keep it going!'),
      yesterday && h('div', { class: 'splash-yesterday' },
        h('p', {}, 'Yesterday: ', h('b', {}, RANKS[yesterday.rank].name), ` · ${yesterday.words} of ${yesterday.total} words · ${yesterday.score} pts`),
        h('button', { class: 'link-btn', type: 'button', onclick: () => { closeModal(); onYesterday(); } }, "See yesterday's answers")),
      h('p', { class: 'splash-date' }, formatLongDate(todayKey), h('br'), `No. ${dayIndex(todayKey) + 1}`),
    ],
  });
}

export function showCelebration({ rankName, score, words, perfect }) {
  openModal({
    title: perfect ? 'Perfect!' : `${rankName}!`,
    variant: 'celebrate',
    content: [
      h('div', { class: 'celebrate-burst', 'aria-hidden': 'true' }, perfect ? '👑' : '🧠'),
      h('p', { class: 'lead' }, perfect
        ? `You found every word. All ${words} of them, for ${score} points.`
        : `You reached ${rankName} with ${score} points. Keep going for Perfect!`),
      h('button', { class: 'pill primary', type: 'button', 'data-autofocus': true, onclick: () => closeModal() }, 'Keep playing'),
    ],
  });
}
