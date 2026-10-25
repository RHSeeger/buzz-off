/**
 * Defines the LifetimeStats type: the player's all-time statistics.
 */

/**
 * The player's all-time statistics, worked out from the history (see lifetimeStats()).
 */
export type LifetimeStats = {
    /** Days with at least one word found */
    played: number;
    /** Words found */
    words: number;
    /** Points scored */
    points: number;
    /** Pangrams found */
    pangrams: number;
    /** Pangrams found that use each letter exactly once */
    perfectPangrams: number;
    /** Days that reached Genius or better */
    genius: number;
    /** Days where every word was found */
    perfect: number;
    /** The longest word ever found */
    longest: string;
    /** Days in a row played, up to today (or yesterday, if today isn't played yet) */
    streak: number;
    /** The longest run of days in a row played */
    maxStreak: number;
    /** Days in a row that reached Genius, up to today (or yesterday) */
    geniusStreak: number;
    /** rankCounts[i] = how many days ended at rank i */
    rankCounts: number[];
    /** The average fraction of the maximum score reached (0 to 1) */
    avgPct: number;
};
