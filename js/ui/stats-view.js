// Stats & badges modal.

import { h } from './dom.js';
import { openModal } from './modal.js';
import { cap } from './progress.js';
import { RANKS } from '../config.js';
import { ONE_OFF, TIERED, TIER_NAMES, achievementCount, tierProgress, unitFor } from '../achievements.js';

export function showStats({ stats, today, unlocked, tab = 'stats' }) {
  const panels = {
    stats: () => statsPanel(stats, today),
    badges: () => badgesPanel(stats, unlocked),
  };
  const body = h('div', { class: 'tab-panel', role: 'tabpanel' });
  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  const select = (name) => {
    for (const b of tabs.children) {
      const on = b.dataset.tab === name;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    body.replaceChildren(...panels[name]());
  };
  for (const [name, label] of [['stats', 'Statistics'], ['badges', 'Badges']]) {
    tabs.append(h('button', { class: 'tab', type: 'button', role: 'tab', 'data-tab': name, onclick: () => select(name) }, label));
  }
  tabs.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const next = tabs.querySelector('[aria-selected="false"]');
    next.click();
    next.focus();
  });
  select(tab);
  openModal({ title: 'Your Stats', content: [tabs, body] });
}

function tile(value, label) {
  return h('div', { class: 'stat-tile' }, h('span', { class: 'stat-value' }, value), h('span', { class: 'stat-label' }, label));
}

function statsPanel(s, today) {
  const max = Math.max(1, ...s.rankCounts);
  const rows = RANKS.map((r, i) => ({ name: r.name, n: s.rankCounts[i], i })).reverse();
  return [
    today && h('section', { class: 'today-strip' },
      h('h3', {}, 'Today'),
      h('div', { class: 'tiles' },
        tile(String(today.score), 'Points'),
        tile(`${today.words}/${today.total}`, 'Words'),
        tile(String(today.pangrams), 'Pangrams'),
        tile(RANKS[today.rank].name, 'Rank'),
      )),
    h('h3', {}, 'All time'),
    h('div', { class: 'tiles' },
      tile(String(s.played), 'Played'),
      tile(String(s.streak), 'Current streak'),
      tile(String(s.maxStreak), 'Max streak'),
      tile(String(s.genius), 'Genius days'),
      tile(s.words.toLocaleString(), 'Words found'),
      tile(s.points.toLocaleString(), 'Points'),
      tile(String(s.pangrams), 'Pangrams'),
      tile(`${Math.round(s.avgPct * 100)}%`, 'Avg. of max'),
    ),
    s.longest && h('p', { class: 'longest' }, 'Longest word: ', h('b', {}, cap(s.longest)), ` (${s.longest.length} letters)`),
    h('h3', {}, 'Final rank distribution'),
    s.played === 0
      ? h('p', { class: 'muted' }, 'Play a puzzle to start your history.')
      : h('div', { class: 'dist', role: 'list', 'aria-label': 'Number of days ending at each rank' },
        rows.map((r) => h('div', { class: 'dist-row', role: 'listitem', title: `${r.name}: ${r.n} day${r.n === 1 ? '' : 's'}` },
          h('span', { class: 'dist-label' }, r.name),
          h('span', { class: 'dist-track' }, h('span', { class: `dist-bar${r.n ? '' : ' empty'}`, style: { width: r.n ? `${Math.max(4, (r.n / max) * 100)}%` : '0' } })),
          h('span', { class: 'dist-value' }, String(r.n)),
        ))),
  ];
}

function badgesPanel(stats, unlocked) {
  const total = achievementCount();
  const got = Object.keys(unlocked).length;
  const date = (key) => unlocked[key] ? new Date(unlocked[key].at).toLocaleDateString() : null;
  return [
    h('p', { class: 'lead' }, h('b', {}, `${got} of ${total}`), ' badges earned'),
    h('h3', {}, 'Milestones'),
    h('div', { class: 'badges' }, TIERED.map((def) => {
      const p = tierProgress(def, stats);
      const nextLabel = p.next != null ? `${p.value.toLocaleString()} / ${p.next.toLocaleString()} ${unitFor(def, p.next)}` : `${p.value.toLocaleString()} ${unitFor(def, p.value)} · maxed out!`;
      const prevT = p.tier >= 0 ? def.tiers[p.tier] : 0;
      const frac = p.next != null ? (p.value - prevT) / (p.next - prevT) : 1;
      return h('div', { class: `badge tiered tier-${p.tier}${p.tier < 0 ? ' locked' : ''}` },
        h('span', { class: 'badge-icon', 'aria-hidden': 'true' }, def.icon),
        h('span', { class: 'badge-name' }, def.name),
        h('span', { class: 'badge-tier' }, p.tierName || 'Not yet earned'),
        h('span', { class: 'badge-pips', 'aria-hidden': 'true' }, def.tiers.map((_, i) => h('span', { class: i <= p.tier ? 'on' : '' }))),
        h('span', { class: 'badge-progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(frac * 100)), 'aria-label': `${def.name} progress` },
          h('span', { style: { width: `${Math.min(100, frac * 100)}%` } })),
        h('span', { class: 'badge-desc' }, nextLabel),
      );
    })),
    h('h3', {}, 'Achievements'),
    h('div', { class: 'badges' }, ONE_OFF.map((def) => {
      const d = date(def.id);
      return h('div', { class: `badge${d ? '' : ' locked'}` },
        h('span', { class: 'badge-icon', 'aria-hidden': 'true' }, d ? def.icon : '🔒'),
        h('span', { class: 'badge-name' }, def.name),
        h('span', { class: 'badge-desc' }, def.desc),
        d && h('span', { class: 'badge-date' }, `Earned ${d}`),
      );
    })),
    h('p', { class: 'muted small' }, `Tiers: ${TIER_NAMES.join(' → ')}`),
  ];
}
