import type { PuzzleSource } from './PuzzleSource';

/**
 * Defines the DaySummary type: the totals for one day's play, kept for the stats.
 */

/**
 * The totals for one day's play, kept in the history for the stats and badges (see summarizeDay()).
 */
export type DaySummary = {
    /** Points scored */
    score: number;
    /** The puzzle's maximum score */
    max: number;
    /** Words found */
    words: number;
    /** How many answers the puzzle had */
    total: number;
    /** Pangrams found */
    pangrams: number;
    /** Pangrams found that use each letter exactly once */
    perfectPangrams: number;
    /** The rank reached (an index into RANKS) */
    rank: number;
    /** The longest word found */
    longest: string;
    /** Which puzzle was played */
    source: PuzzleSource | null;
    /** Whether the hints were opened */
    hints: boolean;
    /** When the first word was found */
    firstAt: number | null;
    /** When the last word was found */
    lastAt: number | null;
    /** When Genius was reached */
    geniusAt: number | null;
};
