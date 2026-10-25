/**
 * Defines the GuessError type: why a guess was not accepted.
 */

/**
 * Why a guess was not accepted: too short, missing the center letter, using a letter not in the puzzle, not in the
 * word list, or already found.
 */
export type GuessError = 'short' | 'center' | 'letters' | 'unknown' | 'found';
