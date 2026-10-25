/**
 * Defines the MessageKind type: the kind of message shown above the word being typed.
 */

/**
 * The kind of message shown above the word being typed: a rejected guess, praise for a word, or a pangram.
 */
export type MessageKind = 'error' | 'praise' | 'pangram';
