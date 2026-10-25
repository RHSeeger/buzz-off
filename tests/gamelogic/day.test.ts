import {
    addFound,
    isLocked,
    loadDay,
    newDay,
    puzzleForDay,
    saveDay,
    setSource,
} from '../../src/typescript/gamelogic/day';
import { parsePuzzles } from '../../src/typescript/gamelogic/puzzle';
import { parseWordlist } from '../../src/typescript/gamelogic/wordlist';
import { readDataFile } from '../helpers/dataFiles';

/**
 * Tests for one day's play: choosing the puzzle, locking it in, and saving.
 */

beforeEach(() => localStorage.clear());

describe('choosing the puzzle', () => {
    it('can change the puzzle until the first word is found', () => {
        const day = newDay('2026-10-24');
        expect(setSource(day, 'nyt', { printDate: '', center: 'a', outer: [], pangrams: [], answers: [] })).toBe(true);
        expect(setSource(day, 'generated')).toBe(true);
        expect(day.nyt).toBeNull();
        expect(day.wordlistVersion).toBe(1);
    });

    it('locks the day in as the generated puzzle when the first word is found', () => {
        const day = newDay('2026-10-24');
        addFound(day, 'able');
        expect(day.source).toBe('generated');
        expect(isLocked(day)).toBe(true);
        expect(setSource(day, 'nyt', null)).toBe(false);
    });
});

describe('saving', () => {
    it('saves and loads a day, and starts a new day when nothing is saved', () => {
        const day = newDay('2026-10-24');
        addFound(day, 'able', 123);
        saveDay(day);
        expect(loadDay('2026-10-24').found).toEqual([{ w: 'able', at: 123 }]);
        expect(loadDay('2026-10-25')).toEqual(newDay('2026-10-25'));
    });

    it('ignores saved data that is not usable', () => {
        localStorage.setItem('buzzoff:day:2026-10-24', '{"found": "nope"}');
        expect(loadDay('2026-10-24')).toEqual(newDay('2026-10-24'));
        localStorage.setItem('buzzoff:day:2026-10-24', 'not json');
        expect(loadDay('2026-10-24')).toEqual(newDay('2026-10-24'));
    });
});

describe('puzzleForDay', () => {
    const wl = parseWordlist(readDataFile('words.txt'));
    const lines = parsePuzzles(readDataFile('puzzles.txt'));

    it('plays the generated puzzle by default, and the imported one when chosen', () => {
        const day = newDay('2026-10-24');
        expect(puzzleForDay(day, wl, lines).source).toBe('generated');
        setSource(day, 'nyt', {
            printDate: '2026-10-24',
            center: 'a',
            outer: ['b', 'd', 'e', 'g', 'l', 'm'],
            pangrams: ['gambled'],
            answers: ['able', 'gambled'],
        });
        const p = puzzleForDay(day, wl, lines);
        expect(p.source).toBe('nyt');
        expect(p.answers).toEqual(['able', 'gambled']);
        expect(p.printDate).toBe('2026-10-24');
    });
});
