/**
 * App-wide constants: the game's name, storage, the word list version and the puzzle rules.
 * (The Firebase web config will live here too once family mode is added.)
 */

/** The game's name, as shown to players */
export const APP_NAME = 'Buzz Off';

/** Prefix for every localStorage / sessionStorage key */
export const STORAGE_PREFIX = 'buzzoff:';

/** Bump when the word list changes in a way that changes answers */
export const WORDLIST_VERSION = 1;

/** Day 0 of the puzzle list (YYYY-MM-DD) */
export const EPOCH_DAY = '2026-01-01';

/** The shortest word allowed */
export const MIN_WORD_LENGTH = 4;

/** Extra points for a pangram (a word using all 7 letters) */
export const PANGRAM_BONUS = 7;

/** The longest word that can be typed */
export const MAX_INPUT_LENGTH = 19;
