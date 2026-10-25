import type { Puzzle } from './Puzzle';

/**
 * Defines the Wordbox type: the controls for the found-words box.
 */

/**
 * The controls for the found-words box (see createWordbox()).
 */
export type Wordbox = {
    /** Collapses it (on small screens) */
    close(): void;
    /** Shows the words found; `highlight` is a word to flash (the one just found) */
    render(found: string[], puzzle: Puzzle, highlight?: string): void;
};
