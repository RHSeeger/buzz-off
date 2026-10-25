/**
 * Defines the PuzzleLetters type: the 7 letters of a puzzle.
 */

/**
 * The 7 letters of a puzzle: the center letter (which every answer must contain) and the 6 around it.
 */
export type PuzzleLetters = {
    /** The center letter, lowercase */
    center: string;
    /** The 6 outer letters, lowercase */
    outer: string[];
};
