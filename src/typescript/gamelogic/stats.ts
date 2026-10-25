import { GENIUS_RANK, PERFECT_RANK, RANKS } from '../data/ranks';
import type { DayState } from '../types/DayState';
import type { DaySummary } from '../types/DaySummary';
import type { History } from '../types/History';
import type { LifetimeStats } from '../types/LifetimeStats';
import type { Puzzle } from '../types/Puzzle';
import { addDays, daysBetween } from './dates';
import { rankIndexFor, scoreOf } from './puzzle';

/**
 * Statistics: the summary kept for each day played, and the all-time stats worked out from them.
 */

/**
 * Sums up one day's play, for the history.
 *
 * @param day - The day's state
 * @param puzzle - The day's puzzle
 * @returns The day's summary
 */
export function summarizeDay(day: DayState, puzzle: Puzzle): DaySummary {
    const words = day.found.map((f) => f.w);
    const score = scoreOf(words, puzzle);
    const pangrams = words.filter((w) => puzzle.pangrams.includes(w));
    const longest = words.reduce((a, w) => (w.length > a.length ? w : a), '');
    const times = day.found.map((f) => f.at).filter(Boolean);
    return {
        score,
        max: puzzle.maxScore,
        words: words.length,
        total: puzzle.answers.length,
        pangrams: pangrams.length,
        perfectPangrams: pangrams.filter((w) => w.length === 7).length,
        rank: rankIndexFor(score, puzzle.maxScore),
        longest,
        source: day.source,
        hints: day.hintsUsed,
        firstAt: times.length ? Math.min(...times) : null,
        lastAt: times.length ? Math.max(...times) : null,
        geniusAt: day.geniusAt,
    };
}

/**
 * Counts the days in a row played, going back from a day.
 *
 * @param played - The days played
 * @param key - The day to count back from
 * @returns The number of days in a row (0 if that day wasn't played)
 */
function streakEndingAt(played: Set<string>, key: string): number {
    let n = 0;
    let k = key;
    while (played.has(k)) {
        n++;
        k = addDays(k, -1);
    }
    return n;
}

/**
 * Works out the all-time stats. Days with no words found don't count.
 *
 * @param history - The summary of every day played
 * @param todayKey - Today; the current streaks run up to today, or to yesterday if today isn't played yet
 * @returns The all-time stats
 */
export function lifetimeStats(history: History, todayKey: string): LifetimeStats {
    const keys = Object.keys(history)
        .filter((k) => history[k].words > 0)
        .sort();
    const played = new Set(keys);
    const s: LifetimeStats = {
        played: keys.length,
        words: 0,
        points: 0,
        pangrams: 0,
        perfectPangrams: 0,
        genius: 0,
        perfect: 0,
        longest: '',
        streak: 0,
        maxStreak: 0,
        geniusStreak: 0,
        rankCounts: RANKS.map(() => 0),
        avgPct: 0,
    };
    let pctSum = 0;
    let run = 0;
    let prev: string | null = null;
    for (const k of keys) {
        const h = history[k];
        s.words += h.words;
        s.points += h.score;
        s.pangrams += h.pangrams;
        s.perfectPangrams += h.perfectPangrams ?? 0;
        if (h.rank >= GENIUS_RANK) s.genius++;
        if (h.rank === PERFECT_RANK) s.perfect++;
        if ((h.longest ?? '').length > s.longest.length) s.longest = h.longest;
        s.rankCounts[h.rank]++;
        pctSum += h.max ? h.score / h.max : 0;
        run = prev && daysBetween(prev, k) === 1 ? run + 1 : 1;
        s.maxStreak = Math.max(s.maxStreak, run);
        prev = k;
    }
    s.avgPct = keys.length ? pctSum / keys.length : 0;
    s.streak = played.has(todayKey) ? streakEndingAt(played, todayKey) : streakEndingAt(played, addDays(todayKey, -1));
    let k = (history[todayKey]?.rank ?? -1) >= GENIUS_RANK ? todayKey : addDays(todayKey, -1);
    while ((history[k]?.rank ?? -1) >= GENIUS_RANK) {
        s.geniusStreak++;
        k = addDays(k, -1);
    }
    return s;
}

/**
 * Finds the most recent day played before a day.
 *
 * @param history - The summary of every day played
 * @param key - The day
 * @returns The day key, or null if there isn't one
 */
export function previousPlayedDay(history: History, key: string): string | null {
    const keys = Object.keys(history)
        .filter((k) => k < key && history[k].words > 0)
        .sort();
    return keys.length ? keys[keys.length - 1] : null;
}
