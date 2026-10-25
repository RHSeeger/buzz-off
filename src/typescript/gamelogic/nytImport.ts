import type { ImportedPuzzle } from '../types/ImportedPuzzle';
import type { ImportPayload } from '../types/ImportPayload';
import type { ImportValidation } from '../types/ImportValidation';
import { letterMask } from './wordlist';

/**
 * Reading and checking puzzle data copied from the NYT page by the bookmarklet.
 * Format: `v1;d:2026-10-24;c:a;o:bdeglm;p:gambled,...;w:able,abed,...`
 */

/** Shown when imported puzzle data fails the checks */
export const INVALID_MESSAGE = "This doesn't look like a valid puzzle — the NYT page format may have changed.";

/**
 * Writes a puzzle in the payload format (the same format the bookmarklet produces).
 *
 * @param p - The puzzle
 * @returns The payload text
 */
export function buildPayload(p: ImportedPuzzle): string {
    return [
        'v1',
        `d:${p.printDate}`,
        `c:${p.center}`,
        `o:${p.outer.join('')}`,
        `p:${p.pangrams.join(',')}`,
        `w:${p.answers.join(',')}`,
    ].join(';');
}

/**
 * Reads payload text. Accepts the bare payload, a `#nyt=...` hash or a whole URL, percent-encoded or not.
 *
 * @param text - The text
 * @returns The data read (not checked yet), or null if it isn't a v1 payload
 */
export function parsePayload(text: string): ImportPayload | null {
    let s = String(text || '').trim();
    const hashAt = s.indexOf('nyt=');
    if (hashAt >= 0) s = s.slice(hashAt + 4);
    try {
        s = decodeURIComponent(s);
    } catch {
        /* already plain */
    }
    const parts = s.split(';');
    if (parts[0] !== 'v1') return null;
    const fields: Record<string, string> = {};
    for (const p of parts.slice(1)) {
        const i = p.indexOf(':');
        if (i > 0) fields[p.slice(0, i)] = p.slice(i + 1);
    }
    const list = (v: string | undefined): string[] =>
        v
            ? v
                  .split(',')
                  .map((w) => w.trim())
                  .filter(Boolean)
            : [];
    return {
        version: 'v1',
        printDate: fields.d ?? '',
        center: fields.c ?? '',
        outer: (fields.o ?? '').split(''),
        pangrams: list(fields.p),
        answers: list(fields.w),
    };
}

/**
 * Checks imported puzzle data: 1 center + 6 outer = 7 different letters; every answer is 4+ letters, uses only those
 * letters and contains the center; there is at least one pangram, and every pangram uses all 7 letters and is an answer.
 *
 * @param p - The data read by parsePayload()
 * @returns The puzzle, or the reason it was rejected
 */
export function validatePayload(p: ImportPayload | null): ImportValidation {
    const bad = (reason: string): ImportValidation => ({ ok: false, reason });
    if (!p || p.version !== 'v1') return bad('version');
    if (!/^[a-z]$/.test(p.center)) return bad('center');
    if (p.outer.length !== 6 || !p.outer.every((c) => /^[a-z]$/.test(c))) return bad('outer');
    const letters = [p.center, ...p.outer];
    if (new Set(letters).size !== 7) return bad('letters');
    if (p.printDate && !/^\d{4}-\d{2}-\d{2}$/.test(p.printDate)) return bad('date');
    if (p.answers.length === 0) return bad('answers');
    const allowed = letterMask(letters.join(''));
    const centerBit = letterMask(p.center);
    for (const w of p.answers) {
        if (!/^[a-z]{4,}$/.test(w)) return bad('answer-format');
        const m = letterMask(w);
        if (m & ~allowed) return bad('answer-letters');
        if (!(m & centerBit)) return bad('answer-center');
    }
    if (p.pangrams.length === 0) return bad('no-pangram');
    const answerSet = new Set(p.answers);
    for (const w of p.pangrams) {
        if (letterMask(w) !== allowed) return bad('pangram-letters');
        if (!answerSet.has(w)) return bad('pangram-missing');
    }
    return {
        ok: true,
        puzzle: {
            printDate: p.printDate,
            center: p.center,
            outer: [...p.outer],
            pangrams: [...new Set(p.pangrams)].sort(),
            answers: [...answerSet].sort(),
        },
    };
}
