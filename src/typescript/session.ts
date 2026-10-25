import { GENIUS_RANK } from './data/ranks';
import { contributions, visibleFound } from './gamelogic/familyDay';
import { rankIndexFor, scoreOf } from './gamelogic/puzzle';
import type { AuthUser } from './types/AuthUser';
import type { DayState } from './types/DayState';
import type { FamilyContext } from './types/FamilyContext';
import type { FoundWord } from './types/FoundWord';
import type { History } from './types/History';
import type { PersonalData } from './types/PersonalData';
import type { PlayMode } from './types/PlayMode';
import type { Puzzle } from './types/Puzzle';
import type { Theme } from './types/Theme';
import type { UnlockedAchievements } from './types/UnlockedAchievements';
import type { Wordlist } from './types/Wordlist';

/**
 * The state of the current session, shared by app.ts (the game) and familyController.ts (family play), plus small
 * calculations on it. Nothing else holds game state.
 */

/** The session's state. Set up by startApp() before anything reads it */
export const session = {
    /** The answer word list */
    wordlist: null as unknown as Wordlist,
    /** The puzzle list */
    puzzleLines: [] as string[],
    /** Who the player is playing with */
    mode: { kind: 'local' } as PlayMode,
    /** The day being played (in the family's timezone in family play) */
    todayKey: '',
    /** The day's play: in family play, every member's words */
    day: null as unknown as DayState,
    /** The player's own part of the day (the same as `day` in local play) */
    myDay: null as unknown as DayState,
    /** The day's puzzle */
    puzzle: null as unknown as Puzzle,
    /** The words found (by anyone, in family play) */
    found: new Set<string>(),
    /** Local play's history */
    history: {} as History,
    /** Local play's badges */
    unlocked: {} as UnlockedAchievements,
    /** The word being typed */
    input: '',
    /** The light/dark choice */
    theme: 'auto' as Theme,
    /** Who is signed in to Firebase (family play), once known */
    user: null as AuthUser | null,
    /** The player's data from Firebase (their families, family history and badges) */
    personal: { families: [], history: {}, achievements: {} } as PersonalData,
    /** Whether the player's data has arrived from Firebase (badges aren't checked until it has) */
    personalLoaded: false,
    /** The family being played with, in family play */
    family: null as FamilyContext | null,
    /** Imported puzzle data waiting for the family's day to arrive */
    pendingImport: null as string | null,
    /** Whether Firebase is connected (family play) */
    online: true,
};

/**
 * Returns today's score (the family's, in family play).
 *
 * @returns The score
 */
export function score(): number {
    return scoreOf(session.found, session.puzzle);
}

/**
 * Returns today's rank (the family's, in family play).
 *
 * @returns The rank's index in RANKS
 */
export function rank(): number {
    return rankIndexFor(score(), session.puzzle.maxScore);
}

/**
 * Returns whether today's Genius has been reached.
 *
 * @returns True at Genius or above
 */
export function isGenius(): boolean {
    return rank() >= GENIUS_RANK;
}

/**
 * Returns whether the player is seeing only their own words (family play, until they choose to see everyone's).
 *
 * @returns True while others' words are hidden
 */
export function othersHidden(): boolean {
    return !!session.family && !session.family.view.showAll;
}

/**
 * Returns the words shown in the found-words list: every word in local play, or the ones the player sees in family
 * play.
 *
 * @returns The words, in the order found
 */
export function shownFound(): FoundWord[] {
    const fam = session.family;
    if (!fam || !session.user) return session.day.found;
    return visibleFound(session.day.found, session.user.uid, fam.view);
}

/**
 * Returns the score shown: the player's own while others' words are hidden, otherwise today's score.
 *
 * @returns The score
 */
export function shownScore(): number {
    return othersHidden()
        ? scoreOf(
              session.myDay.found.map((f) => f.w),
              session.puzzle,
          )
        : score();
}

/**
 * Returns the rank shown: the player's own while others' words are hidden, otherwise today's rank.
 *
 * @returns The rank's index in RANKS
 */
export function shownRank(): number {
    return rankIndexFor(shownScore(), session.puzzle.maxScore);
}

/**
 * Returns who found each word, for the colored dots (family play only).
 *
 * @param found - The words found, each with who found it
 * @returns Each word's finder, or undefined in local play
 */
export function findersOf(
    found: { w: string; by?: string }[],
): Record<string, { name: string; color: string }> | undefined {
    if (!session.family) return undefined;
    const members = session.family.members;
    const out: Record<string, { name: string; color: string }> = {};
    for (const f of found) {
        const m = f.by ? members[f.by] : undefined;
        out[f.w] = m ? { name: m.name, color: m.color } : { name: 'someone who left', color: 'none' };
    }
    return out;
}

/**
 * Returns what each family member has found today (family play only).
 *
 * @returns Each member's share, or [] in local play
 */
export function teamShares(): ReturnType<typeof contributions> {
    if (!session.family) return [];
    return contributions(session.day.found, session.puzzle, session.family.members);
}

/**
 * Returns the name of the family being played with.
 *
 * @returns The name, or null in local play
 */
export function familyName(): string | null {
    if (session.mode.kind !== 'family') return null;
    const fid = session.mode.fid;
    return session.family?.meta?.name ?? session.personal.families.find((f) => f.fid === fid)?.name ?? 'your family';
}
