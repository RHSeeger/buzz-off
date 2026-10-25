import type { Wordlist } from '../types/Wordlist';

/**
 * Loads the answer word list, and works with 26-bit letter masks (bit 0 = a, bit 25 = z), which make "does this word
 * only use these letters" a single bitwise check.
 */

/**
 * Returns the set of letters a word uses, as a bit mask.
 *
 * @param word - A lowercase a-z word
 * @returns The mask (bit 0 = a ... bit 25 = z)
 */
export function letterMask(word: string): number {
    let m = 0;
    for (let i = 0; i < word.length; i++) m |= 1 << (word.charCodeAt(i) - 97);
    return m;
}

/**
 * Counts the bits set in a mask (how many different letters it has).
 *
 * @param mask - The mask
 * @returns The number of bits set
 */
export function bitCount(mask: number): number {
    let m = mask - ((mask >>> 1) & 0x55555555);
    m = (m & 0x33333333) + ((m >>> 2) & 0x33333333);
    return (((m + (m >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

/**
 * Parses the word list file.
 *
 * @param text - The file's contents: one word per line
 * @returns The word list
 */
export function parseWordlist(text: string): Wordlist {
    const words = text
        .split(/\r?\n/)
        .map((w) => w.trim())
        .filter(Boolean);
    const masks = new Uint32Array(words.length);
    for (let i = 0; i < words.length; i++) masks[i] = letterMask(words[i]);
    return { words, masks, set: new Set(words) };
}

/**
 * Downloads and parses the word list.
 *
 * @param url - Where the word list file is
 * @returns The word list
 * @throws If it can't be downloaded
 */
export async function loadWordlist(url = 'data/words.txt'): Promise<Wordlist> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not load word list (${res.status})`);
    return parseWordlist(await res.text());
}
