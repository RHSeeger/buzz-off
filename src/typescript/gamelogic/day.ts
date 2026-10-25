import { WORDLIST_VERSION } from '../data/app';
import type { DayState } from '../types/DayState';
import type { ImportedPuzzle } from '../types/ImportedPuzzle';
import type { Puzzle } from '../types/Puzzle';
import type { PuzzleSource } from '../types/PuzzleSource';
import type { Wordlist } from '../types/Wordlist';
import { computeAnswers, decodePuzzleLine, makePuzzle, puzzleLineForDay } from './puzzle';
import { getJSON, setJSON } from './storage';

/**
 * One day's play: loading and saving it, choosing which puzzle is played, and recording found words. The first word
 * found locks the day's puzzle in. (Family mode will keep the same shape in Firebase.)
 */

/**
 * Creates the state for a day nobody has played yet.
 *
 * @param key - The day key
 * @returns The new day's state
 */
export function newDay(key: string): DayState {
    return { key, source: null, wordlistVersion: null, nyt: null, found: [], hintsUsed: false, geniusAt: null };
}

/**
 * Loads a day's saved state.
 *
 * @param key - The day key
 * @returns The saved state, or a new day if nothing (usable) is saved
 */
export function loadDay(key: string): DayState {
    const d = getJSON<Partial<DayState> | null>(`day:${key}`, null);
    return d && Array.isArray(d.found) ? { ...newDay(key), ...d, key } : newDay(key);
}

/**
 * Saves a day's state.
 *
 * @param day - The day's state
 */
export function saveDay(day: DayState): void {
    setJSON(`day:${day.key}`, day);
}

/**
 * Checks whether the day's puzzle is locked in: it can only change while nothing has been found.
 *
 * @param day - The day's state
 * @returns True once a word has been found
 */
export function isLocked(day: DayState): boolean {
    return day.found.length > 0;
}

/**
 * Chooses which puzzle the day plays, if it isn't locked yet.
 *
 * @param day - The day's state (changed in place)
 * @param source - Which puzzle
 * @param nyt - The imported puzzle, when source is 'nyt'
 * @returns True if it was changed; false if the day is locked
 */
export function setSource(day: DayState, source: PuzzleSource, nyt: ImportedPuzzle | null = null): boolean {
    if (isLocked(day)) return false;
    day.source = source;
    day.nyt = source === 'nyt' ? nyt : null;
    day.wordlistVersion = source === 'generated' ? WORDLIST_VERSION : null;
    return true;
}

/**
 * Records a found word. If no puzzle was chosen yet, the day is locked in as the generated puzzle.
 *
 * @param day - The day's state (changed in place)
 * @param word - The word
 * @param at - When it was found (defaults to now)
 */
export function addFound(day: DayState, word: string, at: number = Date.now()): void {
    if (!day.source) setSource(day, 'generated');
    day.found.push({ w: word, at });
}

/**
 * Returns the puzzle a day plays: the imported one, or the generated one for that date.
 *
 * @param day - The day's state
 * @param wordlist - The word list
 * @param puzzleLines - The puzzle list
 * @returns The puzzle
 */
export function puzzleForDay(day: DayState, wordlist: Wordlist, puzzleLines: string[]): Puzzle {
    if (day.source === 'nyt' && day.nyt) {
        return makePuzzle({ ...day.nyt, source: 'nyt', printDate: day.nyt.printDate });
    }
    const { center, outer } = decodePuzzleLine(puzzleLineForDay(puzzleLines, day.key));
    return makePuzzle({ center, outer, answers: computeAnswers(wordlist, center, outer) });
}
