import { ONE_OFF, TIERED, TIER_NAMES } from '../data/achievements';
import { RANKS } from '../data/ranks';
import { achievementCount, tierProgress, unitFor } from '../gamelogic/achievements';
import type { DaySummary } from '../types/DaySummary';
import type { MemberContribution } from '../types/MemberContribution';
import type { StatsScope } from '../types/StatsScope';
import type { LifetimeStats } from '../types/LifetimeStats';
import type { UnlockedAchievements } from '../types/UnlockedAchievements';
import { cap, h } from './dom';
import { openModal } from './modal';

/**
 * The Stats screen, with two tabs: Statistics (today, all time, and how each day ended) and Badges. With families, a
 * list picks whose stats to show: local play, the player's play in one family, or in all their families.
 */

/**
 * Makes a stat tile: a big number with a label under it.
 *
 * @param value - The number (or text)
 * @param label - What it is
 * @returns The element
 */
function tile(value: string, label: string): HTMLElement {
    return h(
        'div',
        { class: 'stat-tile' },
        h('span', { class: 'stat-value' }, value),
        h('span', { class: 'stat-label' }, label),
    );
}

/**
 * Makes the Statistics tab.
 *
 * @param s - The all-time stats
 * @param today - Today's summary (null when it isn't for today's play, such as all families together)
 * @param team - In family play, today's score for each member
 * @returns The elements
 */
function statsPanel(
    s: LifetimeStats,
    today: DaySummary | null,
    team: MemberContribution[] | null,
): (HTMLElement | false | null)[] {
    const max = Math.max(1, ...s.rankCounts);
    const rows = RANKS.map((r, i) => ({ name: r.name, n: s.rankCounts[i] })).reverse();
    return [
        team && teamPanel(team),
        today &&
            h(
                'section',
                { class: 'today-strip' },
                team && h('h3', {}, 'Today, your words'),
                !team && h('h3', {}, 'Today'),
                h(
                    'div',
                    { class: 'tiles' },
                    tile(String(today.score), 'Points'),
                    tile(`${today.words}/${today.total}`, 'Words'),
                    tile(String(today.pangrams), 'Pangrams'),
                    tile(RANKS[today.rank].name, 'Rank'),
                ),
            ),
        h('h3', {}, 'All time'),
        h(
            'div',
            { class: 'tiles' },
            tile(String(s.played), 'Played'),
            tile(String(s.streak), 'Current streak'),
            tile(String(s.maxStreak), 'Max streak'),
            tile(String(s.genius), 'Genius days'),
            tile(s.words.toLocaleString(), 'Words found'),
            tile(s.points.toLocaleString(), 'Points'),
            tile(String(s.pangrams), 'Pangrams'),
            tile(`${Math.round(s.avgPct * 100)}%`, 'Avg. of max'),
        ),
        !!s.longest &&
            h(
                'p',
                { class: 'longest' },
                'Longest word: ',
                h('b', {}, cap(s.longest)),
                ` (${s.longest.length} letters)`,
            ),
        h('h3', {}, 'Final rank distribution'),
        s.played === 0
            ? h('p', { class: 'muted' }, 'Play a puzzle to start your history.')
            : h(
                  'div',
                  { class: 'dist', role: 'list', 'aria-label': 'Number of days ending at each rank' },
                  rows.map((r) =>
                      h(
                          'div',
                          {
                              class: 'dist-row',
                              role: 'listitem',
                              title: `${r.name}: ${r.n} day${r.n === 1 ? '' : 's'}`,
                          },
                          h('span', { class: 'dist-label' }, r.name),
                          h(
                              'span',
                              { class: 'dist-track' },
                              h('span', {
                                  class: `dist-bar${r.n ? '' : ' empty'}`,
                                  style: { width: r.n ? `${Math.max(4, (r.n / max) * 100)}%` : '0' },
                              }),
                          ),
                          h('span', { class: 'dist-value' }, String(r.n)),
                      ),
                  ),
              ),
    ];
}

/**
 * Makes the Badges tab.
 *
 * @param stats - The all-time stats
 * @param unlocked - The badges earned
 * @returns The elements
 */
function badgesPanel(stats: LifetimeStats, unlocked: UnlockedAchievements): HTMLElement[] {
    const earnedOn = (key: string): string | null =>
        unlocked[key] ? new Date(unlocked[key].at).toLocaleDateString() : null;
    return [
        h(
            'p',
            { class: 'lead' },
            h('b', {}, `${Object.keys(unlocked).length} of ${achievementCount()}`),
            ' badges earned',
        ),
        h('h3', {}, 'Milestones'),
        h(
            'div',
            { class: 'badges' },
            TIERED.map((def) => {
                const p = tierProgress(def, stats);
                const label =
                    p.next != null
                        ? `${p.value.toLocaleString()} / ${p.next.toLocaleString()} ${unitFor(def, p.next)}`
                        : `${p.value.toLocaleString()} ${unitFor(def, p.value)} · maxed out!`;
                const prevTarget = p.tier >= 0 ? def.tiers[p.tier] : 0;
                const frac = p.next != null ? (p.value - prevTarget) / (p.next - prevTarget) : 1;
                return h(
                    'div',
                    { class: `badge tiered tier-${p.tier}${p.tier < 0 ? ' locked' : ''}` },
                    h('span', { class: 'badge-icon', 'aria-hidden': 'true' }, def.icon),
                    h('span', { class: 'badge-name' }, def.name),
                    h('span', { class: 'badge-tier' }, p.tierName ?? 'Not yet earned'),
                    h(
                        'span',
                        { class: 'badge-pips', 'aria-hidden': 'true' },
                        def.tiers.map((_, i) => h('span', { class: i <= p.tier ? 'on' : '' })),
                    ),
                    h(
                        'span',
                        {
                            class: 'badge-progress',
                            role: 'progressbar',
                            'aria-valuemin': '0',
                            'aria-valuemax': '100',
                            'aria-valuenow': String(Math.round(frac * 100)),
                            'aria-label': `${def.name} progress`,
                        },
                        h('span', { style: { width: `${Math.min(100, frac * 100)}%` } }),
                    ),
                    h('span', { class: 'badge-desc' }, label),
                );
            }),
        ),
        h('h3', {}, 'Achievements'),
        h(
            'div',
            { class: 'badges' },
            ONE_OFF.map((def) => {
                const d = earnedOn(def.id);
                return h(
                    'div',
                    { class: `badge${d ? '' : ' locked'}` },
                    h('span', { class: 'badge-icon', 'aria-hidden': 'true' }, d ? def.icon : '🔒'),
                    h('span', { class: 'badge-name' }, def.name),
                    h('span', { class: 'badge-desc' }, def.desc),
                    d && h('span', { class: 'badge-date' }, `Earned ${d}`),
                );
            }),
        ),
        h('p', { class: 'muted small' }, `Tiers: ${TIER_NAMES.join(' → ')}`),
    ];
}

/**
 * Makes the "Today, as a family" panel: each member's points, words, pangrams and longest word.
 *
 * @param team - Each member's share, most points first
 * @returns The element
 */
function teamPanel(team: MemberContribution[]): HTMLElement {
    return h(
        'section',
        {},
        h('h3', {}, 'Today, as a family'),
        h(
            'table',
            { class: 'member-table' },
            h(
                'thead',
                {},
                h(
                    'tr',
                    {},
                    h('th', {}, 'Player'),
                    h('th', { class: 'num' }, 'Points'),
                    h('th', { class: 'num' }, 'Words'),
                    h('th', { class: 'num' }, 'Pangrams'),
                    h('th', {}, 'Longest'),
                ),
            ),
            h(
                'tbody',
                {},
                team.map((m) =>
                    h(
                        'tr',
                        {},
                        h(
                            'td',
                            {},
                            h(
                                'span',
                                { class: 'who' },
                                h('span', { class: `player-dot player-${m.color}`, 'aria-hidden': 'true' }),
                                m.name,
                            ),
                        ),
                        h('td', { class: 'num' }, String(m.points)),
                        h('td', { class: 'num' }, String(m.words)),
                        h('td', { class: 'num' }, String(m.pangrams)),
                        h('td', {}, m.longest ? cap(m.longest) : '–'),
                    ),
                ),
            ),
        ),
    );
}

/**
 * Opens the Stats screen.
 *
 * @param options - The scopes to choose from (local, each family, all families) and which to show first, the data
 *   for a scope, and which tab to show first
 */
export function showStats(options: {
    scopes: { scope: StatsScope; label: string }[];
    initial: number;
    dataFor: (scope: StatsScope) => {
        stats: LifetimeStats;
        today: DaySummary | null;
        unlocked: UnlockedAchievements;
        team: MemberContribution[] | null;
    };
    tab?: 'stats' | 'badges';
}): void {
    const { scopes } = options;
    let scopeIndex = Math.max(0, Math.min(options.initial, scopes.length - 1));
    let tab: 'stats' | 'badges' = options.tab ?? 'stats';
    const body = h('div', { class: 'tab-panel', role: 'tabpanel' });
    const tabs = h('div', { class: 'tabs', role: 'tablist' });
    const render = (): void => {
        const d = options.dataFor(scopes[scopeIndex].scope);
        for (const b of tabs.querySelectorAll<HTMLButtonElement>('.tab')) {
            const on = b.dataset.tab === tab;
            b.setAttribute('aria-selected', String(on));
            b.tabIndex = on ? 0 : -1;
        }
        const parts = tab === 'stats' ? statsPanel(d.stats, d.today, d.team) : badgesPanel(d.stats, d.unlocked);
        body.replaceChildren(...parts.filter((el): el is HTMLElement => !!el));
    };
    for (const [name, label] of [
        ['stats', 'Statistics'],
        ['badges', 'Badges'],
    ] as const) {
        tabs.append(
            h(
                'button',
                {
                    class: 'tab',
                    type: 'button',
                    role: 'tab',
                    'data-tab': name,
                    onclick: () => {
                        tab = name;
                        render();
                    },
                },
                label,
            ),
        );
    }
    tabs.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        const other = tabs.querySelector<HTMLButtonElement>('[aria-selected="false"]');
        other?.click();
        other?.focus();
    });
    const select = h(
        'select',
        { 'aria-label': 'Whose stats' },
        scopes.map((s, i) => h('option', { value: String(i), selected: i === scopeIndex }, s.label)),
    );
    select.addEventListener('change', () => {
        scopeIndex = Number(select.value);
        render();
    });
    render();
    openModal({
        title: 'Your Stats',
        content: [scopes.length > 1 && h('div', { class: 'scope-select' }, select), tabs, body],
    });
}
