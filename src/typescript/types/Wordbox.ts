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
    /**
     * Shows the words found. `highlight` is a word to flash (the one just found); `finders` (family play) gives each
     * word's finder, for the colored dots; `familyCount` says the count is the family's (it is, when there are finders,
     * unless the player is seeing only their own words).
     */
    render(
        found: string[],
        puzzle: Puzzle,
        highlight?: string,
        finders?: Record<string, { name: string; color: string }>,
        familyCount?: boolean,
    ): void;
};
