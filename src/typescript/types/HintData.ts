/**
 * Defines the HintData type: what the Hints screen shows.
 */

/**
 * What the Hints screen shows: how many words are left, by first letter and length.
 */
export type HintData = {
    /** The word lengths that appear in the answers, shortest first */
    lengths: number[];
    /** The puzzle's letters, alphabetical */
    firsts: string[];
    /** grid[firstLetter][length] = how many words are left with that first letter and length */
    grid: Record<string, Record<number, number>>;
    /** How many words are left that start with each two-letter pair */
    twoLetter: Record<string, number>;
    /** How many words are left */
    remainingWords: number;
    /** How many points are left */
    remainingPoints: number;
    /** How many pangrams are left */
    remainingPangrams: number;
    /** How many of those use each letter exactly once */
    remainingPerfect: number;
};
