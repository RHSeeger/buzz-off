import type { PuzzleSource } from './PuzzleSource';

/**
 * Defines the Puzzle type: a playable puzzle with its answers and scoring worked out.
 */

/**
 * A playable puzzle. Made by makePuzzle() from the letters and the list of answers.
 */
export type Puzzle = {
    /** The center letter */
    center: string;
    /** The 6 outer letters */
    outer: string[];
    /** All 7 letters, center first */
    letters: string[];
    /** Every answer, sorted */
    answers: string[];
    /** The answers, for membership checks */
    answerSet: Set<string>;
    /** The answers that use all 7 letters */
    pangrams: string[];
    /** How many points each answer is worth */
    points: Map<string, number>;
    /** The total of all answers' points */
    maxScore: number;
    /** Where the puzzle came from */
    source: PuzzleSource;
    /** For an imported puzzle, the date it was published (YYYY-MM-DD) */
    printDate: string | null;
};
