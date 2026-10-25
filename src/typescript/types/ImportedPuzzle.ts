/**
 * Defines the ImportedPuzzle type: a puzzle copied from the NYT page by the bookmarklet.
 */

/**
 * A puzzle copied from the NYT page, after it has been checked (see validatePayload()). It is stored with the day.
 */
export type ImportedPuzzle = {
    /** The date the NYT published it (YYYY-MM-DD), or '' if the page didn't say */
    printDate: string;
    /** The center letter */
    center: string;
    /** The 6 outer letters */
    outer: string[];
    /** The answers that use all 7 letters */
    pangrams: string[];
    /** Every answer */
    answers: string[];
};
