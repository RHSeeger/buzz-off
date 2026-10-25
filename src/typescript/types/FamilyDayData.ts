import type { FoundWord } from './FoundWord';
import type { ImportedPuzzle } from './ImportedPuzzle';
import type { PendingNyt } from './PendingNyt';
import type { PuzzleSource } from './PuzzleSource';

/**
 * Defines the FamilyDayData type: one day of a family's play, as read from Firebase.
 */

/**
 * One day of a family's play (`families/<fid>/days/<day>`), checked and tidied by parseFamilyDay().
 */
export type FamilyDayData = {
    /** Which puzzle the family is playing; null until chosen or the first word is found */
    source: PuzzleSource | null;
    /** The imported puzzle, when source is 'nyt' (null if missing or not valid) */
    nyt: ImportedPuzzle | null;
    /** Someone getting the NYT puzzle, if anyone */
    pendingNyt: PendingNyt | null;
    /** Every word found, oldest first, each with who found it */
    found: FoundWord[];
    /** The players (uids) who opened the hints */
    hintsUsedBy: string[];
};
