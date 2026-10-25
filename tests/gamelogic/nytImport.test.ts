import { buildPayload, parsePayload, validatePayload } from '../../src/typescript/gamelogic/nytImport';
import type { ImportedPuzzle } from '../../src/typescript/types/ImportedPuzzle';

/**
 * Tests for reading and checking imported puzzle data.
 */

/** A valid puzzle */
const good: ImportedPuzzle = {
    printDate: '2026-10-24',
    center: 'a',
    outer: ['b', 'd', 'e', 'g', 'l', 'm'],
    pangrams: ['gambled'],
    answers: ['abed', 'able', 'amble', 'gambled'],
};

/**
 * Checks a payload made from the valid puzzle with some changes.
 *
 * @param patch - The changes
 * @returns The result
 */
const check = (patch: Partial<ImportedPuzzle>) => validatePayload(parsePayload(buildPayload({ ...good, ...patch })));

describe('payloads', () => {
    it('round-trip through buildPayload, parsePayload and validatePayload', () => {
        const s = buildPayload(good);
        expect(s).toBe('v1;d:2026-10-24;c:a;o:bdeglm;p:gambled;w:abed,able,amble,gambled');
        expect(validatePayload(parsePayload(s))).toEqual({ ok: true, puzzle: good });
    });

    it('can be read from a whole URL, percent-encoded', () => {
        const s = buildPayload(good);
        expect(validatePayload(parsePayload(`https://x.github.io/g/#nyt=${encodeURIComponent(s)}`)).ok).toBe(true);
    });
});

describe('validatePayload', () => {
    it('rejects data that is not a v1 payload', () => {
        expect(validatePayload(parsePayload('v2;c:a')).ok).toBe(false);
        expect(validatePayload(parsePayload('garbage')).ok).toBe(false);
        expect(validatePayload(parsePayload('')).ok).toBe(false);
    });

    it.each([
        [{ center: 'ab' }, 'center'],
        [{ outer: ['b', 'd', 'e', 'g', 'l'] }, 'outer'],
        [{ outer: ['b', 'd', 'e', 'g', 'l', 'a'] }, 'letters'],
        [{ answers: [] }, 'answers'],
        [{ answers: ['abe', 'gambled'] }, 'answer-format'],
        [{ answers: ['ablz', 'gambled'] }, 'answer-letters'],
        [{ answers: ['bled', 'gambled'] }, 'answer-center'],
        [{ pangrams: [] }, 'no-pangram'],
        [{ pangrams: ['amble'] }, 'pangram-letters'],
        [{ pangrams: ['gambled'], answers: ['able'] }, 'pangram-missing'],
        [{ printDate: '10/24/2026' }, 'date'],
    ] as [Partial<ImportedPuzzle>, string][])('rejects %j (%s)', (patch, reason) => {
        expect(check(patch)).toEqual({ ok: false, reason });
    });
});
