import { combineHistories, parsePersonalData } from '../../src/typescript/gamelogic/personal';
import { lifetimeStats } from '../../src/typescript/gamelogic/stats';
import type { DaySummary } from '../../src/typescript/types/DaySummary';

/**
 * Tests for the player's data saved in Firebase, and the "all families" history.
 */

/**
 * Makes a day's summary.
 *
 * @param score - Points
 * @param words - Words found
 * @param rank - The rank reached
 * @param longest - The longest word
 * @returns The summary
 */
const summary = (score: number, words: number, rank: number, longest = 'able'): DaySummary => ({
    score,
    max: 100,
    words,
    total: 30,
    pangrams: 0,
    perfectPangrams: 0,
    rank,
    longest,
    source: 'generated',
    hints: false,
    firstAt: 10,
    lastAt: 20,
    geniusAt: null,
});

describe('parsePersonalData', () => {
    it('reads a new player as empty', () => {
        expect(parsePersonalData(null)).toEqual({ families: [], history: {}, achievements: {} });
    });

    it('reads families (oldest first), history and badges, filling in what Firebase dropped', () => {
        const data = parsePersonalData({
            families: { b: { name: 'Second', joinedAt: 20 }, a: { name: 'First', joinedAt: 10 } },
            history: { a: { '2026-10-24': { score: 5, words: 2, rank: 3 }, junk: { nope: true } } },
            achievements: { a: { 'words:0': { at: 1, day: '2026-10-24' }, bad: 'x' } },
        });
        expect(data.families.map((f) => f.name)).toEqual(['First', 'Second']);
        expect(data.history.a['2026-10-24']).toMatchObject({ score: 5, words: 2, rank: 3, firstAt: null, longest: '' });
        expect(data.history.a.junk).toBeUndefined();
        expect(data.achievements.a).toEqual({ 'words:0': { at: 1, day: '2026-10-24' } });
    });
});

describe('combineHistories', () => {
    it('adds up words and points per day, keeping the best rank and longest word', () => {
        const all = combineHistories([
            { '2026-10-01': summary(10, 3, 4), '2026-10-02': summary(5, 2, 2) },
            { '2026-10-02': summary(20, 6, 6, 'gambled'), '2026-10-03': summary(1, 1, 1) },
        ]);
        expect(Object.keys(all).sort()).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
        expect(all['2026-10-02']).toMatchObject({ score: 25, words: 8, rank: 6, longest: 'gambled', max: 200 });
        const s = lifetimeStats(all, '2026-10-03');
        expect(s.played).toBe(3);
        expect(s.streak).toBe(3);
        expect(s.words).toBe(12);
    });
});
