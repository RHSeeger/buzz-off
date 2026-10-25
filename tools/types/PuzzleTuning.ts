/**
 * Defines the PuzzleTuning type: the limits that decide which puzzles are kept.
 */

/**
 * The limits that decide which puzzles are kept, so they feel neither trivial nor brutal.
 */
export type PuzzleTuning = {
    /** The fewest answers allowed */
    minAnswers: number;
    /** The most answers allowed */
    maxAnswers: number;
    /** The highest maximum score allowed */
    maxScore: number;
    /** The most pangrams allowed */
    maxPangrams: number;
    /** The seed for shuffling the puzzle list */
    seed: string;
};
