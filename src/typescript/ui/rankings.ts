import { rankIndexFor, rankThresholds } from '../gamelogic/puzzle';
import { h } from './dom';
import { openModal } from './modal';

/**
 * The Rankings screen: the score needed for each rank in today's puzzle.
 */

/**
 * Opens the Rankings screen.
 *
 * @param score - The score so far
 * @param maxScore - The puzzle's maximum score
 */
export function showRankings(score: number, maxScore: number): void {
    const idx = rankIndexFor(score, maxScore);
    const t = rankThresholds(maxScore);
    const nextRank = t[idx + 1];
    const toGo = nextRank ? nextRank.min - score : 0;
    openModal({
        title: 'Rankings',
        content: [
            h('p', { class: 'lead' }, 'Ranks are based on a percentage of possible points in a puzzle.'),
            nextRank &&
                h('p', {}, h('b', {}, String(toGo)), ` point${toGo === 1 ? '' : 's'} to `, h('b', {}, nextRank.name)),
            h(
                'table',
                { class: 'rank-table' },
                h('thead', {}, h('tr', {}, h('th', {}, 'Rank'), h('th', { class: 'num' }, 'Minimum score'))),
                h(
                    'tbody',
                    {},
                    [...t]
                        .reverse()
                        .map((r) =>
                            h(
                                'tr',
                                { class: r.index === idx ? 'current' : r.index < idx ? 'reached' : '' },
                                h(
                                    'td',
                                    {},
                                    h('span', { class: 'rank-dot' }),
                                    r.name,
                                    r.index === idx && h('span', { class: 'you' }, ` · ${score}`),
                                ),
                                h('td', { class: 'num' }, String(r.min)),
                            ),
                        ),
                ),
            ),
        ],
    });
}
