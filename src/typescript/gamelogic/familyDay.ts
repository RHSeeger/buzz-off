import { GENIUS_RANK } from '../data/ranks';
import type { DayState } from '../types/DayState';
import type { FamilyDayData } from '../types/FamilyDayData';
import type { FamilyMember } from '../types/FamilyMember';
import type { FamilyView } from '../types/FamilyView';
import type { FoundWord } from '../types/FoundWord';
import type { ImportedPuzzle } from '../types/ImportedPuzzle';
import type { MemberContribution } from '../types/MemberContribution';
import type { Puzzle } from '../types/Puzzle';
import { buildPayload, parsePayload, validatePayload } from './nytImport';
import { rankThresholds } from './puzzle';

/**
 * One day of a family's play: reading it from Firebase's data, and working out the family's and one player's view of
 * it, and who found what. No Firebase calls; see family/familyDayStore.ts for those.
 */

/**
 * Returns a value as a plain object, or an empty one.
 *
 * @param v - The value
 * @returns The object
 */
function asObject(v: unknown): Record<string, unknown> {
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/**
 * Writes an imported puzzle in the shape it is stored in Firebase (lists as comma-separated text, which Firebase keeps
 * as-is).
 *
 * @param p - The puzzle
 * @param uid - Who loaded it
 * @param at - When (or Firebase's server timestamp placeholder)
 * @returns The stored value
 */
export function storedNyt(p: ImportedPuzzle, uid: string, at: unknown): Record<string, unknown> {
    return {
        printDate: p.printDate,
        center: p.center,
        outer: p.outer.join(''),
        pangrams: p.pangrams.join(','),
        answers: p.answers.join(','),
        loadedBy: uid,
        loadedAt: at,
    };
}

/**
 * Reads an imported puzzle as stored in Firebase, checking it again (a family member's device wrote it).
 *
 * @param v - The stored value
 * @returns The puzzle, or null if it is missing or not valid
 */
function readNyt(v: unknown): ImportedPuzzle | null {
    const o = asObject(v);
    if (typeof o.center !== 'string') return null;
    const text = buildPayload({
        printDate: String(o.printDate ?? ''),
        center: o.center,
        outer: String(o.outer ?? '').split(''),
        pangrams: String(o.pangrams ?? '').split(','),
        answers: String(o.answers ?? '').split(','),
    });
    const check = validatePayload(parsePayload(text));
    return check.ok ? check.puzzle : null;
}

/**
 * Reads one day of a family's play from Firebase's data, skipping anything malformed.
 *
 * @param raw - The value at `families/<fid>/days/<day>` (null if nothing is there yet)
 * @returns The day's data
 */
export function parseFamilyDay(raw: unknown): FamilyDayData {
    const o = asObject(raw);
    const source = o.source === 'generated' || o.source === 'nyt' ? o.source : null;
    const pending = asObject(o.pendingNyt);
    const found: FoundWord[] = Object.entries(asObject(o.found))
        .map(([w, v]) => {
            const f = asObject(v);
            return { w, at: typeof f.at === 'number' ? f.at : 0, by: typeof f.by === 'string' ? f.by : '' };
        })
        .filter((f) => /^[a-z]{4,20}$/.test(f.w))
        .sort((a, b) => a.at - b.at || (a.w < b.w ? -1 : 1));
    return {
        source,
        nyt: source === 'nyt' ? readNyt(o.nyt) : null,
        pendingNyt:
            typeof pending.by === 'string' && typeof pending.at === 'number'
                ? { by: pending.by, at: pending.at }
                : null,
        found,
        hintsUsedBy: Object.keys(asObject(o.hints)),
    };
}

/**
 * Works out when the family reached Genius: the time of the word that took the score past the Genius threshold.
 *
 * @param found - The words found, oldest first
 * @param puzzle - The day's puzzle
 * @returns The time, or null if Genius hasn't been reached
 */
export function geniusTime(found: FoundWord[], puzzle: Puzzle): number | null {
    const target = rankThresholds(puzzle.maxScore)[GENIUS_RANK].min;
    let score = 0;
    for (const f of found) {
        score += puzzle.points.get(f.w) ?? 0;
        if (score >= target) return f.at;
    }
    return null;
}

/**
 * Makes the family's day as a DayState (every word found, by anyone), so the puzzle, score and found-words list work
 * the same as in local play.
 *
 * @param key - The day key
 * @param data - The family's day
 * @returns The day's state
 */
export function teamDayState(key: string, data: FamilyDayData): DayState {
    return {
        key,
        source: data.source,
        wordlistVersion: null,
        nyt: data.nyt,
        found: data.found,
        hintsUsed: data.hintsUsedBy.length > 0,
        geniusAt: null,
    };
}

/**
 * Makes one player's view of the family's day as a DayState: only the words they found first, and whether they opened
 * the hints. Used for their stats and badges.
 *
 * @param team - The family's day (from teamDayState())
 * @param data - The family's day data
 * @param uid - The player
 * @param puzzle - The day's puzzle (for when the family reached Genius)
 * @returns The player's day state
 */
export function playerDayState(team: DayState, data: FamilyDayData, uid: string, puzzle: Puzzle): DayState {
    return {
        ...team,
        found: data.found.filter((f) => f.by === uid),
        hintsUsed: data.hintsUsedBy.includes(uid),
        geniusAt: geniusTime(data.found, puzzle),
    };
}

/**
 * Returns the player's view of a day: the saved one if it is for that day, otherwise a new one (only their own words
 * shown).
 *
 * @param saved - The view saved on the device, if any
 * @param key - The day key
 * @returns The view
 */
export function viewForDay(saved: FamilyView | null | undefined, key: string): FamilyView {
    if (saved && saved.day === key && Array.isArray(saved.seen)) {
        return { day: key, showAll: saved.showAll === true, seen: saved.seen.filter((w) => typeof w === 'string') };
    }
    return { day: key, showAll: false, seen: [] };
}

/**
 * Returns the words a player sees: every word the family found, or (until they choose to see them all) only their own
 * and the ones others found that they entered.
 *
 * @param found - The words the family found
 * @param uid - The player
 * @param view - What the player has chosen to see
 * @returns The words shown, in the order found
 */
export function visibleFound(found: FoundWord[], uid: string, view: FamilyView): FoundWord[] {
    if (view.showAll) return found;
    return found.filter((f) => f.by === uid || view.seen.includes(f.w));
}

/**
 * Works out what each family member has found today. Members who haven't found anything are included (with zeros);
 * words found by someone who has since left are left out.
 *
 * @param found - The words found
 * @param puzzle - The day's puzzle
 * @param members - The family's members, by uid
 * @returns Each member's share, most points first
 */
export function contributions(
    found: FoundWord[],
    puzzle: Puzzle,
    members: Record<string, FamilyMember>,
): MemberContribution[] {
    const out = Object.entries(members).map(([uid, m]) => ({
        uid,
        name: m.name,
        color: m.color,
        points: 0,
        words: 0,
        pangrams: 0,
        longest: '',
    }));
    const byUid = new Map(out.map((c) => [c.uid, c]));
    for (const f of found) {
        const c = byUid.get(f.by ?? '');
        if (!c) continue;
        c.points += puzzle.points.get(f.w) ?? 0;
        c.words++;
        if (puzzle.pangrams.includes(f.w)) c.pangrams++;
        if (f.w.length > c.longest.length) c.longest = f.w;
    }
    return out.sort((a, b) => b.points - a.points || (a.name < b.name ? -1 : 1));
}
