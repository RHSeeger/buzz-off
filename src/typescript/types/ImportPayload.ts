import type { ImportedPuzzle } from './ImportedPuzzle';

/**
 * Defines the ImportPayload type: puzzle data as read from the bookmarklet's text, before it is checked.
 */

/**
 * Puzzle data as read from the bookmarklet's text (see parsePayload()). It has not been checked yet.
 */
export type ImportPayload = ImportedPuzzle & {
    /** The payload format version; only 'v1' exists */
    version: string;
};
