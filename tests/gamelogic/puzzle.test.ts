import { RANKS } from '../../src/typescript/data/ranks';
import { addDays } from '../../src/typescript/gamelogic/dates';
import {
    checkGuess,
    computeAnswers,
    decodePuzzleLine,
    hintData,
    isPangram,
    isPerfectPangram,
    makePuzzle,
    parsePuzzles,
    puzzleLineForDay,
    rankIndexFor,
    rankThresholds,
    scoreOf,
    scoreWord,
} from '../../src/typescript/gamelogic/puzzle';
import { parseWordlist } from '../../src/typescript/gamelogic/wordlist';
import { readDataFile } from '../helpers/dataFiles';

/**
 * Tests for choosing puzzles, answers, scoring, ranks, checking guesses and hints.
 */

/** A small puzzle used by several tests */
const small = () =>
    makePuzzle({ center: 'a', outer: ['b', 'd', 'e', 'g', 'l', 'm'], answers: ['able', 'gambled', 'amble', 'bale'] });

describe('daily puzzle selection', () => {
    const pz = parsePuzzles(readDataFile('puzzles.txt'));

    it('is stable, starts at the epoch, and starts over when the list runs out', () => {
        expect(pz.length).toBeGreaterThan(1000);
        expect(puzzleLineForDay(pz, '2026-01-01')).toBe(pz[0]);
        expect(puzzleLineForDay(pz, '2026-10-24')).toBe(puzzleLineForDay(pz, '2026-10-24'));
        expect(puzzleLineForDay(pz, addDays('2026-01-01', pz.length))).toBe(pz[0]);
        expect(puzzleLineForDay(pz, '2025-12-31')).toBe(pz[pz.length - 1]);
    });

    it('splits a puzzle line into its letters', () => {
        expect(decodePuzzleLine('agbdelm')).toEqual({ center: 'a', outer: ['g', 'b', 'd', 'e', 'l', 'm'] });
    });

    it('has puzzles that each have a pangram, no s, and 20 to 70 answers', () => {
        const wl = parseWordlist(readDataFile('words.txt'));
        expect(new Set(pz).size).toBe(pz.length);
        for (const line of pz.slice(0, 400)) {
            const { center, outer } = decodePuzzleLine(line);
            expect(new Set(line).size).toBe(7);
            expect(line).not.toContain('s');
            const p = makePuzzle({ center, outer, answers: computeAnswers(wl, center, outer) });
            expect(p.pangrams.length).toBeGreaterThanOrEqual(1);
            expect(p.answers.length).toBeGreaterThanOrEqual(20);
            expect(p.answers.length).toBeLessThanOrEqual(70);
        }
    });
});

describe('computeAnswers', () => {
    it('finds the words that use only the letters and contain the center', () => {
        const wl = parseWordlist('able\nbale\nbead\nlead\nbleed\nabled\nbeadle\nzzzz\nbalded\nbad\n');
        expect(computeAnswers(wl, 'b', ['a', 'd', 'e', 'l', 'x', 'y']).sort()).toEqual(
            ['able', 'abled', 'bale', 'balded', 'bead', 'beadle', 'bleed'].sort(),
        );
    });
});

describe('scoring', () => {
    it('gives 1 for a 4-letter word, 1 per letter for longer, and 7 extra for a pangram', () => {
        expect(scoreWord('able', false)).toBe(1);
        expect(scoreWord('abled', false)).toBe(5);
        expect(scoreWord('gambled', true)).toBe(14);
    });

    it('finds pangrams and works out the maximum score', () => {
        const letters = ['a', 'b', 'd', 'e', 'g', 'l', 'm'];
        expect(isPangram('gambled', letters)).toBe(true);
        expect(isPangram('gamble', letters)).toBe(false);
        expect(isPerfectPangram('gambled', letters)).toBe(true);
        const p = small();
        expect(p.pangrams).toEqual(['gambled']);
        expect(p.maxScore).toBe(1 + 14 + 5 + 1);
        expect(scoreOf(['able', 'gambled', 'nope'], p)).toBe(15);
    });
});

describe('ranks', () => {
    it('needs a percentage of the maximum score, and the full score for Perfect', () => {
        const t = rankThresholds(200);
        expect(t).toHaveLength(RANKS.length);
        expect(t[0].min).toBe(0);
        expect(t.find((r) => r.name === 'Genius')?.min).toBe(140);
        expect(t[t.length - 1].min).toBe(200);
        for (let i = 1; i < t.length; i++) expect(t[i].min).toBeGreaterThanOrEqual(t[i - 1].min);
    });

    it('finds the rank a score reaches', () => {
        const name = (score: number) => RANKS[rankIndexFor(score, 200)].name;
        expect(name(0)).toBe('Seedling');
        expect(name(139)).toBe('Brilliant');
        expect(name(140)).toBe('Genius');
        expect(name(199)).toBe('Genius');
        expect(name(200)).toBe('Perfect');
    });
});

describe('checkGuess', () => {
    it('says why a guess is rejected, or gives its points', () => {
        const p = makePuzzle({
            center: 'a',
            outer: ['b', 'd', 'e', 'g', 'l', 'm'],
            answers: ['able', 'gambled', 'amble'],
        });
        const found = new Set(['able']);
        expect(checkGuess('abe', p, found)).toMatchObject({ ok: false, error: 'short' });
        expect(checkGuess('bled', p, found)).toMatchObject({ ok: false, error: 'center' });
        expect(checkGuess('ablex', p, found)).toMatchObject({ ok: false, error: 'letters' });
        expect(checkGuess('able', p, found)).toMatchObject({ ok: false, error: 'found' });
        expect(checkGuess('blame', p, found)).toMatchObject({ ok: false, error: 'unknown' });
        expect(checkGuess('GAMBLED', p, found)).toEqual({ ok: true, word: 'gambled', points: 14, pangram: true });
    });
});

describe('hintData', () => {
    it('counts the words left, by first letter and length, and by first two letters', () => {
        const d = hintData(small(), new Set(['able']));
        expect(d.remainingWords).toBe(3);
        expect(d.grid.a[5]).toBe(1);
        expect(d.grid.a[4]).toBe(0);
        expect(d.grid.g[7]).toBe(1);
        expect(d.twoLetter.ba).toBe(1);
        expect(d.remainingPangrams).toBe(1);
        expect(d.remainingPerfect).toBe(1);
    });
});
