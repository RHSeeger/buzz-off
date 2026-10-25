import { ONE_OFF, TIERED } from '../../src/typescript/data/achievements';
import { GENIUS_RANK } from '../../src/typescript/data/ranks';
import { ACHIEVEMENT_CHECKS } from '../../src/typescript/gamelogic/achievementChecks';
import {
    achievementCount,
    evaluateAchievements,
    tierProgress,
    unitFor,
} from '../../src/typescript/gamelogic/achievements';
import { addFound, newDay } from '../../src/typescript/gamelogic/day';
import { lifetimeStats } from '../../src/typescript/gamelogic/stats';
import { makePuzzle } from '../../src/typescript/gamelogic/puzzle';
import type { AchievementContext } from '../../src/typescript/types/AchievementContext';
import type { DaySummary } from '../../src/typescript/types/DaySummary';
import type { UnlockedAchievements } from '../../src/typescript/types/UnlockedAchievements';

/**
 * Tests for earning badges.
 */

/** A small puzzle */
const puzzle = makePuzzle({
    center: 'a',
    outer: ['b', 'd', 'e', 'g', 'l', 'm'],
    answers: ['able', 'abed', 'amble', 'gambled', 'bagel', 'label'],
});

/** The words-found badge */
const wordsBadge = TIERED.find((d) => d.id === 'words')!;

/**
 * Makes an achievement context for a day with some words found.
 *
 * @param words - The words, found 5 seconds apart from noon
 * @param overrides - Anything to change
 * @returns The context
 */
function context(words: string[], overrides: Partial<AchievementContext> = {}): AchievementContext {
    const day = newDay('2026-10-24');
    const t0 = new Date(2026, 9, 24, 12, 0, 0).getTime();
    words.forEach((w, i) => addFound(day, w, t0 + i * 5000));
    return {
        stats: lifetimeStats({}, '2026-10-24'),
        history: {},
        todayKey: '2026-10-24',
        day,
        puzzle,
        rank: 3,
        ...overrides,
    };
}

describe('tierProgress', () => {
    it('finds the tier reached and the next target', () => {
        expect(tierProgress(wordsBadge, { words: 0 }).tier).toBe(-1);
        expect(tierProgress(wordsBadge, { words: 25 })).toMatchObject({ tier: 0, tierName: 'Bronze', next: 100 });
        expect(tierProgress(wordsBadge, { words: 499 }).next).toBe(500);
        expect(tierProgress(wordsBadge, { words: 1e6 }).next).toBeNull();
    });

    it('words the unit for one or many', () => {
        expect(unitFor(wordsBadge, 1)).toBe('word found');
        expect(unitFor(wordsBadge, 2)).toBe('words found');
    });
});

describe('evaluateAchievements', () => {
    it('unlocks the badges earned, once', () => {
        const ctx = context(['able', 'abed', 'amble', 'bagel', 'gambled'], {
            stats: { ...lifetimeStats({}, '2026-10-24'), words: 30, pangrams: 1, played: 1 },
        });
        const unlocked: UnlockedAchievements = {};
        const keys = evaluateAchievements(ctx, unlocked).map((f) => f.key);
        expect(keys).toEqual(
            expect.arrayContaining(['words:0', 'pangrams:0', 'played:0', 'perfect-pangram', 'quick-buzz']),
        );
        expect(keys).not.toContain('opening-act');
        expect(keys).not.toContain('no-peeking');
        expect(evaluateAchievements(ctx, unlocked)).toEqual([]);
        expect(Object.keys(unlocked).length).toBeLessThanOrEqual(achievementCount());
    });

    it('records every tier passed at once, but only announces the highest', () => {
        const unlocked: UnlockedAchievements = {};
        const ctx = context([], { stats: { ...lifetimeStats({}, '2026-10-24'), words: 600 }, rank: 0 });
        const fresh = evaluateAchievements(ctx, unlocked);
        expect(unlocked['words:0'] && unlocked['words:1'] && unlocked['words:2']).toBeTruthy();
        expect(fresh.filter((f) => f.key.startsWith('words')).map((f) => f.key)).toEqual(['words:2']);
    });
});

describe('one-off achievement checks', () => {
    it('has a check for every one-off achievement', () => {
        for (const def of ONE_OFF) expect(ACHIEVEMENT_CHECKS[def.id]).toBeInstanceOf(Function);
    });

    it('Opening Act needs a pangram as the first word', () => {
        expect(ACHIEVEMENT_CHECKS['opening-act'](context(['gambled', 'able']))).toBe(true);
        expect(ACHIEVEMENT_CHECKS['opening-act'](context(['able', 'gambled']))).toBe(false);
    });

    it('No Peeking needs Genius without hints', () => {
        const ctx = context(['able'], { rank: GENIUS_RANK });
        expect(ACHIEVEMENT_CHECKS['no-peeking'](ctx)).toBe(true);
        ctx.day.hintsUsed = true;
        expect(ACHIEVEMENT_CHECKS['no-peeking'](ctx)).toBe(false);
    });

    it('Welcome Back needs a week or more since the last day played', () => {
        const summary: DaySummary = {
            score: 1,
            max: 10,
            words: 1,
            total: 5,
            pangrams: 0,
            perfectPangrams: 0,
            rank: 0,
            longest: 'able',
            source: 'generated',
            hints: false,
            firstAt: null,
            lastAt: null,
            geniusAt: null,
        };
        expect(ACHIEVEMENT_CHECKS['welcome-back'](context(['able'], { history: { '2026-10-16': summary } }))).toBe(
            true,
        );
        expect(ACHIEVEMENT_CHECKS['welcome-back'](context(['able'], { history: { '2026-10-20': summary } }))).toBe(
            false,
        );
    });

    it('Look Back is earned by opening yesterday', () => {
        expect(ACHIEVEMENT_CHECKS['look-back'](context([], { event: 'yesterday' }))).toBe(true);
        expect(ACHIEVEMENT_CHECKS['look-back'](context([]))).toBe(false);
    });
});
