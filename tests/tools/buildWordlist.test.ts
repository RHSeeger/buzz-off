import { candidatePuzzles, filterWords, keepWord, parseBlocklist, selectPuzzles } from '../../tools/build-wordlist';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { readDataFile } from '../helpers/dataFiles';

/**
 * Tests for the word list build script's filters and puzzle selection.
 */

/** A small blocklist */
const block = parseBlocklist('# comment\nbadword\n  Other  # trailing\n');

/** Limits that keep everything, for small test word lists */
const loose = { minAnswers: 1, maxAnswers: 100, maxScore: 1000, maxPangrams: 4, seed: 't' };

describe('parseBlocklist', () => {
    it('reads one word per line, ignoring comments and case', () => {
        expect([...block]).toEqual(['badword', 'other']);
    });
});

describe('keepWord and filterWords', () => {
    it.each([
        ['table', true],
        ['abc', false], // too short
        ['Paris', false], // proper noun
        ["don't", false], // apostrophe
        ['café', false], // accent
        ['well-being', false], // hyphen
        ['tables', false], // has an s
        ['abcdefgh', false], // more than 7 different letters
        ['abcdefgabcdefg', true], // repeats are fine
        ['badword', false], // blocked
    ])('%s -> %s', (word, kept) => {
        expect(keepWord(word, block)).toBe(kept);
    });

    it('trims, removes repeats and sorts', () => {
        expect(filterWords(['zebra', 'able', 'able ', 'Able', 'ables'], block)).toEqual(['able', 'zebra']);
    });

    it('the committed word list obeys the filters', () => {
        const words = readDataFile('words.txt').trim().split('\n');
        const realBlock = parseBlocklist(readFileSync(path.join(__dirname, '../../tools/blocklist.txt'), 'utf8'));
        expect(words.length).toBeGreaterThan(10000);
        expect(words.filter((w) => !keepWord(w, realBlock))).toEqual([]);
        expect([...words].sort()).toEqual(words);
    });
});

describe('candidatePuzzles and selectPuzzles', () => {
    const words = filterWords(
        ['gambled', 'able', 'amble', 'bagel', 'label', 'blade', 'ladle', 'medal', 'gamble', 'bald', 'ball'],
        new Set(),
    );

    it('makes one candidate per center letter of each pangram letter set', () => {
        const cands = candidatePuzzles(words);
        expect(cands).toHaveLength(7);
        expect(cands.find((c) => c.line[0] === 'a')).toMatchObject({ line: 'abdeglm', pangrams: 1 });
    });

    it('keeps one center per letter set, the same way every time', () => {
        const cands = candidatePuzzles(words);
        const picked = selectPuzzles(cands, loose);
        expect(picked).toHaveLength(1);
        expect(selectPuzzles(cands, loose)).toEqual(picked);
    });
});
