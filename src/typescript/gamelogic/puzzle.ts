import { MIN_WORD_LENGTH, PANGRAM_BONUS } from '../data/app';
import { RANKS } from '../data/ranks';
import type { GuessResult } from '../types/GuessResult';
import type { HintData } from '../types/HintData';
import type { Puzzle } from '../types/Puzzle';
import type { PuzzleLetters } from '../types/PuzzleLetters';
import type { PuzzleSource } from '../types/PuzzleSource';
import type { RankThreshold } from '../types/RankThreshold';
import type { Wordlist } from '../types/Wordlist';
import { dayIndex } from './dates';
import { letterMask } from './wordlist';

/**
 * Puzzles: choosing the day's puzzle, working out its answers, scoring, ranks, checking guesses and hints.
 */

/**
 * Parses the puzzle list file.
 *
 * @param text - The file's contents: one puzzle per line, 7 letters, center first
 * @returns The puzzle lines
 */
export function parsePuzzles(text: string): string[] {
    return text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => /^[a-z]{7}$/.test(l));
}

/**
 * Splits a puzzle line into its letters, e.g. "agbdelm" into center "a" and outer g, b, d, e, l, m.
 *
 * @param line - The puzzle line
 * @returns The letters
 */
export function decodePuzzleLine(line: string): PuzzleLetters {
    return { center: line[0], outer: line.slice(1).split('') };
}

/**
 * Returns the puzzle line for a day: the list is played in order from EPOCH_DAY, starting over when it runs out.
 *
 * @param puzzles - The puzzle lines
 * @param key - The day key
 * @returns The day's puzzle line
 */
export function puzzleLineForDay(puzzles: string[], key: string): string {
    const n = puzzles.length;
    const i = ((dayIndex(key) % n) + n) % n;
    return puzzles[i];
}

/**
 * Finds every word in the word list that is an answer: it uses only the puzzle's letters, and contains the center one.
 *
 * @param wordlist - The word list
 * @param center - The center letter
 * @param outer - The 6 outer letters
 * @returns The answers, in word list order
 */
export function computeAnswers(wordlist: Wordlist, center: string, outer: string[]): string[] {
    const allowed = letterMask(center + outer.join(''));
    const centerBit = letterMask(center);
    const out: string[] = [];
    const { words, masks } = wordlist;
    for (let i = 0; i < words.length; i++) {
        const m = masks[i];
        if (m & centerBit && (m & ~allowed) === 0 && words[i].length >= MIN_WORD_LENGTH) out.push(words[i]);
    }
    return out;
}

/**
 * Checks whether a word uses all of the letters.
 *
 * @param word - The word
 * @param letters - The puzzle's 7 letters
 * @returns True if it is a pangram
 */
export function isPangram(word: string, letters: string[]): boolean {
    return letterMask(word) === letterMask(letters.join(''));
}

/**
 * Checks whether a word is a pangram that uses each letter exactly once.
 *
 * @param word - The word
 * @param letters - The puzzle's 7 letters
 * @returns True if it is a 7-letter pangram
 */
export function isPerfectPangram(word: string, letters: string[]): boolean {
    return word.length === 7 && isPangram(word, letters);
}

/**
 * Returns how many points a word is worth: 1 for a 4-letter word, otherwise 1 per letter, plus the pangram bonus.
 *
 * @param word - The word
 * @param pangram - Whether it is a pangram
 * @returns The points
 */
export function scoreWord(word: string, pangram: boolean): number {
    const base = word.length === MIN_WORD_LENGTH ? 1 : word.length;
    return base + (pangram ? PANGRAM_BONUS : 0);
}

/**
 * Makes a playable puzzle from its letters and answers (worked out, or imported).
 *
 * @param spec - The letters, the answers, where the puzzle came from, and (if imported) the date it was published
 * @returns The puzzle
 */
export function makePuzzle(spec: {
    center: string;
    outer: string[];
    answers: string[];
    source?: PuzzleSource;
    printDate?: string | null;
}): Puzzle {
    const { center, outer, answers, source = 'generated', printDate = null } = spec;
    const letters = [center, ...outer];
    const sorted = [...new Set(answers)].sort();
    const pangrams = sorted.filter((w) => isPangram(w, letters));
    const points = new Map(sorted.map((w) => [w, scoreWord(w, pangrams.includes(w))]));
    let maxScore = 0;
    for (const p of points.values()) maxScore += p;
    return {
        center,
        outer: [...outer],
        letters,
        answers: sorted,
        answerSet: new Set(sorted),
        pangrams,
        points,
        maxScore,
        source,
        printDate,
    };
}

/**
 * Returns the score needed for each rank in a puzzle. Perfect always needs the full score.
 *
 * @param maxScore - The puzzle's maximum score
 * @returns Each rank with its minimum score, lowest first
 */
export function rankThresholds(maxScore: number): RankThreshold[] {
    return RANKS.map((r, i) => ({
        ...r,
        index: i,
        min: i === RANKS.length - 1 ? maxScore : Math.round(r.pct * maxScore),
    }));
}

/**
 * Returns the rank a score reaches.
 *
 * @param score - The score
 * @param maxScore - The puzzle's maximum score
 * @returns The rank's index in RANKS
 */
export function rankIndexFor(score: number, maxScore: number): number {
    let idx = 0;
    rankThresholds(maxScore).forEach((t, i) => {
        if (score >= t.min) idx = i;
    });
    return idx;
}

/**
 * Adds up the points for some words.
 *
 * @param words - The words (words that aren't answers count 0)
 * @param puzzle - The puzzle
 * @returns The total points
 */
export function scoreOf(words: Iterable<string>, puzzle: Puzzle): number {
    let s = 0;
    for (const w of words) s += puzzle.points.get(w) ?? 0;
    return s;
}

/**
 * Checks a guess against the puzzle.
 *
 * @param raw - The guess, in any case
 * @param puzzle - The puzzle
 * @param foundSet - The words already found
 * @returns Whether it was accepted, with its points, or why not
 */
export function checkGuess(raw: string, puzzle: Puzzle, foundSet: Set<string>): GuessResult {
    const word = String(raw).toLowerCase();
    if (word.length < MIN_WORD_LENGTH) return { ok: false, error: 'short', word };
    const allowed = new Set(puzzle.letters);
    for (const ch of word) if (!allowed.has(ch)) return { ok: false, error: 'letters', word };
    if (!word.includes(puzzle.center)) return { ok: false, error: 'center', word };
    if (foundSet.has(word)) return { ok: false, error: 'found', word };
    if (!puzzle.answerSet.has(word)) return { ok: false, error: 'unknown', word };
    return { ok: true, word, points: puzzle.points.get(word) ?? 0, pangram: puzzle.pangrams.includes(word) };
}

/**
 * Works out the hints: how many words are left, by first letter and length, and by their first two letters.
 *
 * @param puzzle - The puzzle
 * @param foundSet - The words already found
 * @returns The hint data
 */
export function hintData(puzzle: Puzzle, foundSet: Set<string>): HintData {
    const remaining = puzzle.answers.filter((w) => !foundSet.has(w));
    const lengths = [...new Set(puzzle.answers.map((w) => w.length))].sort((a, b) => a - b);
    const firsts = [...puzzle.letters].sort();
    const grid: Record<string, Record<number, number>> = {};
    for (const f of firsts) grid[f] = Object.fromEntries(lengths.map((l) => [l, 0]));
    const twoLetter: Record<string, number> = {};
    for (const w of remaining) {
        grid[w[0]][w.length]++;
        const k = w.slice(0, 2);
        twoLetter[k] = (twoLetter[k] ?? 0) + 1;
    }
    const remainingPangrams = puzzle.pangrams.filter((w) => !foundSet.has(w));
    return {
        lengths,
        firsts,
        grid,
        twoLetter,
        remainingWords: remaining.length,
        remainingPoints: scoreOf(remaining, puzzle),
        remainingPangrams: remainingPangrams.length,
        remainingPerfect: remainingPangrams.filter((w) => w.length === 7).length,
    };
}
