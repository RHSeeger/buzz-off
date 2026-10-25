import { bitCount, letterMask, parseWordlist } from '../../src/typescript/gamelogic/wordlist';

/**
 * Tests for the word list and letter masks.
 */

describe('letterMask and bitCount', () => {
    it('has one bit per letter used', () => {
        expect(letterMask('abc')).toBe(0b111);
        expect(letterMask('aaa')).toBe(1);
        expect(bitCount(letterMask('pangram'))).toBe(6);
        expect(bitCount(0)).toBe(0);
        expect(bitCount(0x3ffffff)).toBe(26);
    });
});

describe('parseWordlist', () => {
    it('reads one word per line, skipping blank lines', () => {
        const wl = parseWordlist('able\r\nbale\n\n  cable \n');
        expect(wl.words).toEqual(['able', 'bale', 'cable']);
        expect(wl.masks[0]).toBe(letterMask('able'));
        expect(wl.set.has('cable')).toBe(true);
    });
});
