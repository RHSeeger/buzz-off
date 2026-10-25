/**
 * Defines the PuzzleCandidate type: a possible puzzle, with the numbers used to decide whether to keep it.
 */

/**
 * A possible puzzle (a letter set with a pangram, and one of its letters as the center), with its stats.
 */
export type PuzzleCandidate = {
    /** The puzzle line: center letter, then the 6 outer letters alphabetical */
    line: string;
    /** The letter set's mask */
    set: number;
    /** How many answers it has */
    count: number;
    /** Its maximum score */
    score: number;
    /** How many pangrams it has */
    pangrams: number;
};
