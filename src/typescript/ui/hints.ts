import { hintData } from '../gamelogic/puzzle';
import type { Puzzle } from '../types/Puzzle';
import { h } from './dom';
import { openModal } from './modal';

/**
 * The Hints screen: how many words are left, by first letter and length, and by their first two letters. The hints
 * are behind a button the first time each day, because opening them rules out the "No Peeking" badge.
 */

/**
 * Makes the puzzle's letters as small hexagons (center first).
 *
 * @param letters - The puzzle's 7 letters
 * @returns The element
 */
export function letterStrip(letters: string[]): HTMLElement {
    return h(
        'div',
        { class: 'hint-letters' },
        letters.map((l, i) => h('span', { class: i === 0 ? 'center' : '' }, l.toUpperCase())),
    );
}

/**
 * Makes the hints themselves.
 *
 * @param puzzle - Today's puzzle
 * @param foundSet - The words found
 * @returns The elements
 */
function hintContent(puzzle: Puzzle, foundSet: Set<string>): HTMLElement[] {
    const d = hintData(puzzle, foundSet);
    const summary = h(
        'p',
        { class: 'hint-summary' },
        `Words left: ${d.remainingWords} · Points left: ${d.remainingPoints} · Pangrams left: ${d.remainingPangrams}`,
        d.remainingPerfect ? ` (${d.remainingPerfect} perfect)` : '',
    );
    const rowTotal = (f: string): number => Object.values(d.grid[f]).reduce((a, b) => a + b, 0);
    const colTotal = (l: number): number => d.firsts.reduce((a, f) => a + d.grid[f][l], 0);
    const cell = (n: number): HTMLElement => h('td', { class: `num${n ? '' : ' zero'}` }, n ? String(n) : '–');
    const table = h(
        'div',
        { class: 'table-scroll' },
        h(
            'table',
            { class: 'hint-grid' },
            h('caption', { class: 'visually-hidden' }, 'Remaining words by first letter (rows) and length (columns)'),
            h(
                'thead',
                {},
                h(
                    'tr',
                    {},
                    h('th', {}, ''),
                    d.lengths.map((l) => h('th', { class: 'num', scope: 'col' }, String(l))),
                    h('th', { class: 'num', scope: 'col' }, 'Σ'),
                ),
            ),
            h(
                'tbody',
                {},
                d.firsts
                    .filter((f) => puzzle.answers.some((w) => w[0] === f))
                    .map((f) =>
                        h(
                            'tr',
                            {},
                            h('th', { scope: 'row' }, f.toUpperCase()),
                            d.lengths.map((l) => cell(d.grid[f][l])),
                            cell(rowTotal(f)),
                        ),
                    ),
                h(
                    'tr',
                    { class: 'total' },
                    h('th', { scope: 'row' }, 'Σ'),
                    d.lengths.map((l) => cell(colTotal(l))),
                    cell(d.remainingWords),
                ),
            ),
        ),
    );
    const twos = Object.entries(d.twoLetter).sort(([a], [b]) => (a < b ? -1 : 1));
    const two = h(
        'div',
        { class: 'two-letter' },
        h('h3', {}, 'Two-letter starts'),
        twos.length
            ? h(
                  'p',
                  {},
                  twos.map(([k, n]) => h('span', { class: 'two' }, `${k.toUpperCase()}-${n}`)),
              )
            : h('p', {}, 'Nothing left. You found them all!'),
    );
    return [letterStrip(puzzle.letters), summary, table, two];
}

/**
 * Opens the Hints screen.
 *
 * @param puzzle - Today's puzzle
 * @param foundSet - The words found
 * @param alreadyUsed - Whether the hints were already opened today (if so, they show straight away)
 * @param onReveal - Called when the hints are shown
 */
export function showHints(puzzle: Puzzle, foundSet: Set<string>, alreadyUsed: boolean, onReveal: () => void): void {
    const body = h('div', {});
    const reveal = (): void => {
        onReveal();
        body.replaceChildren(...hintContent(puzzle, foundSet));
    };
    if (alreadyUsed) reveal();
    else {
        body.append(
            h('p', {}, 'Hints show how many words you still have left, by first letter and length.'),
            h('p', { class: 'muted small' }, 'Opening hints today means no “No Peeking” badge for this puzzle.'),
            h(
                'button',
                { class: 'pill primary', type: 'button', 'data-autofocus': true, onclick: reveal },
                'Show hints',
            ),
        );
    }
    openModal({ title: 'Hints', content: body });
}
