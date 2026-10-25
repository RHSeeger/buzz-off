import { GENIUS_RANK, PERFECT_RANK } from '../../src/typescript/data/ranks';
import { addFound, newDay } from '../../src/typescript/gamelogic/day';
import { makePuzzle } from '../../src/typescript/gamelogic/puzzle';
import { lifetimeStats, previousPlayedDay, summarizeDay } from '../../src/typescript/gamelogic/stats';
import type { DaySummary } from '../../src/typescript/types/DaySummary';

/**
 * Tests for the per-day summaries and the all-time stats.
 */

/** A small puzzle */
const puzzle = makePuzzle({
    center: 'a',
    outer: ['b', 'd', 'e', 'g', 'l', 'm'],
    answers: ['able', 'abed', 'amble', 'gambled', 'bagel', 'label'],
});

/**
 * Makes a day's summary for the history.
 *
 * @param score - Points scored (out of 100)
 * @param rank - The rank reached
 * @param words - Words found
 * @returns The summary
 */
const summary = (score: number, rank: number, words = 3): DaySummary => ({
    score,
    max: 100,
    words,
    total: 10,
    pangrams: 0,
    perfectPangrams: 0,
    rank,
    longest: 'abcd',
    source: 'generated',
    hints: false,
    firstAt: null,
    lastAt: null,
    geniusAt: null,
});

describe('summarizeDay', () => {
    it('totals the words, points and pangrams found', () => {
        const day = newDay('2026-10-24');
        addFound(day, 'able', 1000);
        addFound(day, 'gambled', 2000);
        expect(summarizeDay(day, puzzle)).toMatchObject({
            score: 15,
            words: 2,
            pangrams: 1,
            perfectPangrams: 1,
            longest: 'gambled',
            firstAt: 1000,
            lastAt: 2000,
        });
    });
});

describe('lifetimeStats', () => {
    const history = {
        '2026-10-01': summary(10, 2),
        '2026-10-02': summary(10, 2),
        '2026-10-03': summary(10, 2),
        '2026-10-04': summary(10, 2),
        '2026-10-10': summary(80, GENIUS_RANK),
        '2026-10-11': summary(80, GENIUS_RANK),
        '2026-10-12': summary(100, PERFECT_RANK),
    };

    it('counts days played, Genius and Perfect days, and streaks', () => {
        const s = lifetimeStats(history, '2026-10-12');
        expect(s.played).toBe(7);
        expect(s.streak).toBe(3);
        expect(s.maxStreak).toBe(4);
        expect(s.genius).toBe(3);
        expect(s.perfect).toBe(1);
        expect(s.geniusStreak).toBe(3);
    });

    it('keeps the streak alive from yesterday until today is played, and breaks it after a missed day', () => {
        expect(lifetimeStats(history, '2026-10-13').streak).toBe(3);
        expect(lifetimeStats(history, '2026-10-14').streak).toBe(0);
    });

    it('does not count days with no words found', () => {
        const s = lifetimeStats({ '2026-10-01': summary(0, 0, 0) }, '2026-10-01');
        expect(s.played).toBe(0);
        expect(s.streak).toBe(0);
    });

    it('finds the previous day played', () => {
        expect(previousPlayedDay(history, '2026-10-10')).toBe('2026-10-04');
        expect(previousPlayedDay(history, '2026-10-01')).toBeNull();
    });
});
