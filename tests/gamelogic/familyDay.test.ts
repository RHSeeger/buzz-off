import { GENIUS_RANK } from '../../src/typescript/data/ranks';
import {
    contributions,
    geniusTime,
    parseFamilyDay,
    playerDayState,
    storedNyt,
    teamDayState,
    viewForDay,
    visibleFound,
} from '../../src/typescript/gamelogic/familyDay';
import { makePuzzle, rankThresholds } from '../../src/typescript/gamelogic/puzzle';
import type { ImportedPuzzle } from '../../src/typescript/types/ImportedPuzzle';

/**
 * Tests for reading a family's day and working out who found what.
 */

/** A small puzzle */
const puzzle = makePuzzle({
    center: 'a',
    outer: ['b', 'd', 'e', 'g', 'l', 'm'],
    answers: ['able', 'abed', 'amble', 'gambled', 'bagel', 'label'],
});

/** A valid imported puzzle */
const nyt: ImportedPuzzle = {
    printDate: '2026-10-24',
    center: 'a',
    outer: ['b', 'd', 'e', 'g', 'l', 'm'],
    pangrams: ['gambled'],
    answers: ['able', 'gambled'],
};

/** Two members */
const members = {
    mom: { name: 'Mom', color: 'red', joinedAt: 1 },
    kid: { name: 'Kid', color: 'blue', joinedAt: 2 },
};

describe('parseFamilyDay', () => {
    it('reads an empty day', () => {
        expect(parseFamilyDay(null)).toEqual({ source: null, nyt: null, pendingNyt: null, found: [], hintsUsedBy: [] });
    });

    it('reads words oldest first, skipping malformed ones', () => {
        const d = parseFamilyDay({
            source: 'generated',
            found: { bale: { by: 'kid', at: 20 }, able: { by: 'mom', at: 10 }, 'BAD!': { by: 'x', at: 1 } },
            hints: { kid: true },
        });
        expect(d.source).toBe('generated');
        expect(d.found.map((f) => f.w)).toEqual(['able', 'bale']);
        expect(d.found[0]).toEqual({ w: 'able', at: 10, by: 'mom' });
        expect(d.hintsUsedBy).toEqual(['kid']);
    });

    it('reads an imported puzzle, checking it again', () => {
        const d = parseFamilyDay({ source: 'nyt', nyt: storedNyt(nyt, 'mom', 5), pendingNyt: { by: 'mom', at: 3 } });
        expect(d.nyt).toEqual(nyt);
        expect(d.pendingNyt).toEqual({ by: 'mom', at: 3 });
        const bad = parseFamilyDay({ source: 'nyt', nyt: { ...storedNyt(nyt, 'mom', 5), answers: 'zzzz' } });
        expect(bad.nyt).toBeNull();
    });

    it('ignores an unknown source', () => {
        expect(parseFamilyDay({ source: 'hacked' }).source).toBeNull();
    });
});

describe('team and player views', () => {
    const data = parseFamilyDay({
        source: 'generated',
        found: {
            able: { by: 'mom', at: 10 },
            gambled: { by: 'kid', at: 20 },
            amble: { by: 'kid', at: 30 },
        },
        hints: { mom: true },
    });

    it('the team sees every word', () => {
        const team = teamDayState('2026-10-24', data);
        expect(team.found.map((f) => f.w)).toEqual(['able', 'gambled', 'amble']);
        expect(team.source).toBe('generated');
    });

    it('a player sees only their own words and hints', () => {
        const team = teamDayState('2026-10-24', data);
        const kid = playerDayState(team, data, 'kid', puzzle);
        expect(kid.found.map((f) => f.w)).toEqual(['gambled', 'amble']);
        expect(kid.hintsUsed).toBe(false);
        expect(playerDayState(team, data, 'mom', puzzle).hintsUsed).toBe(true);
    });

    it('credits each member with the words they found first', () => {
        const shares = contributions(data.found, puzzle, members);
        expect(shares).toEqual([
            { uid: 'kid', name: 'Kid', color: 'blue', points: 14 + 5, words: 2, pangrams: 1, longest: 'gambled' },
            { uid: 'mom', name: 'Mom', color: 'red', points: 1, words: 1, pangrams: 0, longest: 'able' },
        ]);
    });

    it('works out when the family reached Genius', () => {
        const target = rankThresholds(puzzle.maxScore)[GENIUS_RANK].min;
        expect(target).toBeGreaterThan(20);
        expect(geniusTime(data.found, puzzle)).toBeNull();
        const all = puzzle.answers.map((w, i) => ({ w, at: 100 + i, by: 'mom' }));
        expect(geniusTime(all, puzzle)).not.toBeNull();
    });
});

describe('viewForDay', () => {
    it("starts each day showing only the player's words", () => {
        expect(viewForDay(null, '2026-10-25')).toEqual({ day: '2026-10-25', showAll: false, seen: [] });
        expect(viewForDay({ day: '2026-10-24', showAll: true, seen: ['able'] }, '2026-10-25')).toEqual({
            day: '2026-10-25',
            showAll: false,
            seen: [],
        });
    });

    it("keeps the day's saved choice", () => {
        const saved = { day: '2026-10-25', showAll: true, seen: ['able'] };
        expect(viewForDay(saved, '2026-10-25')).toEqual(saved);
    });
});

describe('visibleFound', () => {
    const found = [
        { w: 'able', at: 1, by: 'mom' },
        { w: 'bagel', at: 2, by: 'kid' },
        { w: 'label', at: 3, by: 'mom' },
    ];

    it("shows the player's own words, and others' they entered", () => {
        const view = { day: 'd', showAll: false, seen: ['label'] };
        expect(visibleFound(found, 'kid', view).map((f) => f.w)).toEqual(['bagel', 'label']);
    });

    it('shows every word once the player chooses to', () => {
        expect(visibleFound(found, 'kid', { day: 'd', showAll: true, seen: [] })).toEqual(found);
    });
});
