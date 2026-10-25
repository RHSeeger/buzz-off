import { RANKS } from '../data/ranks';
import { formatLongDate } from '../gamelogic/dates';
import { rankIndexFor, scoreOf } from '../gamelogic/puzzle';
import type { DayState } from '../types/DayState';
import type { Puzzle } from '../types/Puzzle';
import { cap, h } from './dom';
import { letterStrip } from './hints';
import { openModal } from './modal';

/**
 * The Yesterday's Answers screen: every answer to yesterday's puzzle, with the ones the player found checked.
 */

/**
 * Opens the Yesterday's Answers screen.
 *
 * @param key - Yesterday's day key
 * @param day - Yesterday's play
 * @param puzzle - Yesterday's puzzle
 */
export function showYesterday(key: string, day: DayState, puzzle: Puzzle): void {
    const found = new Set(day.found.map((f) => f.w));
    const score = scoreOf(found, puzzle);
    const rank = RANKS[rankIndexFor(score, puzzle.maxScore)].name;
    const pangramCount = puzzle.pangrams.length;
    openModal({
        title: "Yesterday's Answers",
        content: [
            h('p', { class: 'muted' }, formatLongDate(key), puzzle.source === 'nyt' ? ' · imported puzzle' : ''),
            letterStrip(puzzle.letters),
            h(
                'p',
                { class: 'lead' },
                found.size > 0
                    ? [
                          h('b', {}, `${found.size} of ${puzzle.answers.length}`),
                          ` words · ${score} of ${puzzle.maxScore} points · `,
                          h('b', {}, rank),
                      ]
                    : `You didn't play this one. It had ${puzzle.answers.length} words and ${pangramCount} ` +
                          `pangram${pangramCount === 1 ? '' : 's'}.`,
            ),
            h(
                'ul',
                { class: 'answer-list' },
                puzzle.answers.map((w) =>
                    h(
                        'li',
                        {
                            class: `${found.has(w) ? 'found' : 'missed'}${puzzle.pangrams.includes(w) ? ' pangram' : ''}`,
                        },
                        h('span', { class: 'check', 'aria-hidden': 'true' }, found.has(w) ? '✓' : ''),
                        cap(w),
                        h('span', { class: 'visually-hidden' }, found.has(w) ? ' (found)' : ' (missed)'),
                    ),
                ),
            ),
            h('p', { class: 'muted small' }, 'Bold words are pangrams. Words with a check are ones you found.'),
        ],
    });
}
