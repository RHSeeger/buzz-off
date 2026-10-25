import type { FoundWord } from './FoundWord';
import type { ImportedPuzzle } from './ImportedPuzzle';
import type { PuzzleSource } from './PuzzleSource';

/**
 * Defines the DayState type: everything saved about one day's play.
 */

/**
 * Everything saved about one day's play (in localStorage, as `buzzoff:day:<key>`).
 */
export type DayState = {
    /** The day (YYYY-MM-DD) */
    key: string;
    /** Which puzzle is being played; null until it is chosen or the first word is found */
    source: PuzzleSource | null;
    /** The word list version the generated puzzle was played with */
    wordlistVersion: number | null;
    /** The imported puzzle, when source is 'nyt' */
    nyt: ImportedPuzzle | null;
    /** The words found, in the order they were found */
    found: FoundWord[];
    /** Whether the hints were opened */
    hintsUsed: boolean;
    /** When Genius was first reached (milliseconds since 1970) */
    geniusAt: number | null;
};
