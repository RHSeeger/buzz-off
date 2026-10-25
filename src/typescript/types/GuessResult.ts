import type { GuessError } from './GuessError';

/**
 * Defines the GuessResult type: the result of checking a guess.
 */

/**
 * The result of checking a guess (see checkGuess()): accepted, with its points, or rejected, with the reason.
 */
export type GuessResult =
    { ok: true; word: string; points: number; pangram: boolean } | { ok: false; word: string; error: GuessError };
