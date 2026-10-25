import { RANKS } from '../data/ranks';
import { rankIndexFor, rankThresholds } from '../gamelogic/puzzle';
import type { Wordbox } from '../types/Wordbox';
import { cap, clear, h, icon } from './dom';

/**
 * The rank progress track (the rank's name, a dot for each rank, and the score), and the found-words box. In family
 * play, the filled part of the track is split by who scored the points, and each word has a dot in its finder's color.
 */

/**
 * Draws the rank progress track.
 *
 * @param el - The progress button (its contents are replaced)
 * @param score - The score so far
 * @param maxScore - The puzzle's maximum score
 * @param shares - In family play, each player's color and points, to split the filled part by
 */
export function renderProgress(
    el: HTMLElement,
    score: number,
    maxScore: number,
    shares: { color: string; points: number }[] = [],
): void {
    const idx = rankIndexFor(score, maxScore);
    const t = rankThresholds(maxScore);
    const last = RANKS.length - 1;
    const pct = (idx / last) * 100;
    const nextRank = t[idx + 1];
    clear(el);
    el.setAttribute(
        'aria-label',
        `Rank ${RANKS[idx].name}, ${score} points${nextRank ? `, ${nextRank.min - score} to ${nextRank.name}` : ''}. ` +
            'Show rankings.',
    );
    const dots = t.map((_, i) =>
        h('span', {
            class: `dot${i <= idx ? ' reached' : ''}${i === last ? ' final' : ''}`,
            style: { left: `${(i / last) * 100}%` },
        }),
    );
    const scored = shares.filter((s) => s.points > 0);
    const fill = h(
        'span',
        { class: `track-fill${scored.length ? ' split' : ''}`, style: { width: `${pct}%` } },
        scored.map((s) => h('span', { class: `player-${s.color}`, style: { flexGrow: String(s.points) } })),
    );
    el.append(
        h('span', { class: 'rank-name' }, RANKS[idx].name),
        h(
            'span',
            { class: 'track' },
            h('span', { class: 'track-line' }),
            fill,
            dots,
            h('span', { class: 'track-marker', style: { left: `${pct}%` } }, String(score)),
        ),
    );
}

/**
 * Makes the found-words box. On small screens it shows the latest words on one line, and opens to the full list; on
 * wide screens it is always open (see the CSS).
 *
 * @param el - The box (its contents are made here)
 * @returns The controls for the box
 */
export function createWordbox(el: HTMLElement): Wordbox {
    let open = false;
    const count = h('span', { class: 'wordbox-count' });
    const preview = h('span', { class: 'wordbox-preview' });
    const head = h(
        'button',
        { class: 'wordbox-head', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'wordbox-list' },
        count,
        preview,
        h('span', { class: 'wordbox-chevron' }, icon('chevron')),
    );
    const list = h('ul', { class: 'wordbox-list', id: 'wordbox-list' });
    head.addEventListener('click', () => setOpen(!open));
    el.append(head, list);

    /**
     * Opens or closes the box.
     *
     * @param v - True to open it
     */
    function setOpen(v: boolean): void {
        open = v;
        el.classList.toggle('open', open);
        head.setAttribute('aria-expanded', String(open));
    }

    return {
        close: () => setOpen(false),
        render(found, puzzle, highlight, finders): void {
            const n = found.length;
            count.textContent = n === 0 ? 'Your words…' : `You have found ${n} word${n === 1 ? '' : 's'}`;
            if (finders && n > 0) count.textContent = `Your family has found ${n} word${n === 1 ? '' : 's'}`;
            clear(preview);
            for (const w of found.slice(-8).reverse()) {
                preview.append(h('span', { class: puzzle.pangrams.includes(w) ? 'pangram' : '' }, cap(w)));
            }
            clear(list);
            for (const w of [...found].sort()) {
                const finder = finders?.[w];
                const cls = `${puzzle.pangrams.includes(w) ? 'pangram' : ''}${w === highlight ? ' fresh' : ''}`;
                list.append(
                    h(
                        'li',
                        {
                            class: `${cls}${finder ? ' by-player' : ''}`,
                            title: finder ? `Found by ${finder.name}` : null,
                        },
                        finder && h('span', { class: `player-dot player-${finder.color}`, 'aria-hidden': 'true' }),
                        cap(w),
                        finder && h('span', { class: 'visually-hidden' }, ` (found by ${finder.name})`),
                    ),
                );
            }
        },
    };
}
