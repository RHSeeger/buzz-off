/**
 * Defines the Wordlist type: the answer word list, ready for fast lookups.
 */

/**
 * The answer word list, with each word's letter mask precomputed.
 */
export type Wordlist = {
    /** Every word, lowercase, sorted */
    words: string[];
    /** masks[i] is the 26-bit letter mask of words[i] (bit 0 = a) */
    masks: Uint32Array;
    /** The same words, for membership checks */
    set: Set<string>;
};
