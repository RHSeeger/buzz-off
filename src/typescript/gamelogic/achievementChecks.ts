import { GENIUS_RANK } from '../data/ranks';
import type { AchievementContext } from '../types/AchievementContext';
import { addDays, daysBetween, weekday } from './dates';
import { previousPlayedDay } from './stats';

/**
 * What earns each one-off achievement (listed in data/achievements.ts), by achievement id.
 */

/**
 * Returns the words found today.
 *
 * @param ctx - The achievement context
 * @returns The words, in the order found
 */
function foundWords(ctx: AchievementContext): string[] {
    return ctx.day.found.map((f) => f.w);
}

/**
 * Checks whether any word today was found within some hours of the day (local time).
 *
 * @param ctx - The achievement context
 * @param inHours - Returns true for the hours (0-23) that count
 * @returns True if a word was found in one of those hours
 */
function foundDuring(ctx: AchievementContext, inHours: (hour: number) => boolean): boolean {
    return ctx.day.found.some((f) => inHours(new Date(f.at).getHours()));
}

/** Each one-off achievement's check, by id: returns true when it is earned */
export const ACHIEVEMENT_CHECKS: Record<string, (ctx: AchievementContext) => boolean> = {
    'perfect-pangram': (ctx) => foundWords(ctx).some((w) => w.length === 7 && ctx.puzzle.pangrams.includes(w)),
    'opening-act': (ctx) => ctx.day.found.length > 0 && ctx.puzzle.pangrams.includes(ctx.day.found[0].w),
    'double-dip': (ctx) => foundWords(ctx).filter((w) => ctx.puzzle.pangrams.includes(w)).length >= 2,
    'long-8': (ctx) => foundWords(ctx).some((w) => w.length >= 8),
    'long-10': (ctx) => foundWords(ctx).some((w) => w.length >= 10),
    wordsmith: (ctx) => ctx.day.found.length >= 50,
    'quick-buzz': (ctx) => {
        const t = ctx.day.found
            .map((f) => f.at)
            .filter(Boolean)
            .sort((a, b) => a - b);
        for (let i = 4; i < t.length; i++) if (t[i] - t[i - 4] <= 60000) return true;
        return false;
    },
    'speed-demon': (ctx) => {
        const first = ctx.day.found[0]?.at;
        return !!(first && ctx.day.geniusAt && ctx.day.geniusAt - first <= 20 * 60000);
    },
    'no-peeking': (ctx) => ctx.rank >= GENIUS_RANK && !ctx.day.hintsUsed,
    'full-coverage': (ctx) => {
        const starts = new Set(ctx.puzzle.answers.map((w) => w[0]));
        const mine = new Set(foundWords(ctx).map((w) => w[0]));
        return starts.size >= 4 && [...starts].every((c) => mine.has(c));
    },
    'early-bird': (ctx) => foundDuring(ctx, (h) => h >= 4 && h < 7),
    'night-owl': (ctx) => foundDuring(ctx, (h) => h >= 23 || h < 4),
    'weekend-warrior': (ctx) => {
        if (ctx.rank < GENIUS_RANK || weekday(ctx.todayKey) !== 0) return false;
        return (ctx.history[addDays(ctx.todayKey, -1)]?.rank ?? -1) >= GENIUS_RANK;
    },
    'welcome-back': (ctx) => {
        if (!ctx.day.found.length) return false;
        const prev = previousPlayedDay(ctx.history, ctx.todayKey);
        return !!prev && daysBetween(prev, ctx.todayKey) >= 8;
    },
    'guest-puzzle': (ctx) => ctx.day.source === 'nyt' && ctx.day.found.length > 0,
    'look-back': (ctx) => ctx.event === 'yesterday',
};
