import { get, onValue, ref, serverTimestamp, set, update } from 'firebase/database';
import { WORDLIST_VERSION } from '../data/app';
import { parseFamilyDay, storedNyt } from '../gamelogic/familyDay';
import type { FamilyDayData } from '../types/FamilyDayData';
import type { ImportedPuzzle } from '../types/ImportedPuzzle';
import type { PuzzleSource } from '../types/PuzzleSource';
import { database } from './firebase';

/**
 * One day of a family's play in Firebase (`families/<fid>/days/<day>`): watching it live, adding words, choosing the
 * puzzle, hints, and the NYT puzzle. The security rules enforce the locking: the puzzle can only change until the
 * first word, and a word can only be written once (so the first to find it gets the credit).
 */

/**
 * Returns the path of a family's day.
 *
 * @param fid - The family
 * @param day - The day key
 * @returns The path
 */
function dayPath(fid: string, day: string): string {
    return `families/${fid}/days/${day}`;
}

/**
 * Watches a family's day; every member's changes arrive live (and the player's own straight away, even offline).
 *
 * @param fid - The family
 * @param day - The day key
 * @param onData - Called with the day's data on every change
 * @param onError - Called if it can't be read (the player was removed, or the family was deleted)
 * @returns A function that stops watching
 */
export function watchFamilyDay(
    fid: string,
    day: string,
    onData: (data: FamilyDayData) => void,
    onError: (e: Error) => void,
): () => void {
    return onValue(ref(database(), dayPath(fid, day)), (snap) => onData(parseFamilyDay(snap.val())), onError);
}

/**
 * Reads a family's day once (e.g. yesterday's).
 *
 * @param fid - The family
 * @param day - The day key
 * @returns The day's data
 */
export async function readFamilyDay(fid: string, day: string): Promise<FamilyDayData> {
    return parseFamilyDay((await get(ref(database(), dayPath(fid, day)))).val());
}

/**
 * Records a word the player found. If it is the day's first word and no puzzle was chosen, the day is locked in as
 * the generated puzzle in the same update.
 *
 * @param fid - The family
 * @param day - The day key
 * @param word - The word
 * @param uid - The player
 * @param firstOfDay - True if no puzzle was chosen yet and nothing has been found
 * @throws If someone else found it first (the rules refuse a second write)
 */
export async function addFamilyWord(
    fid: string,
    day: string,
    word: string,
    uid: string,
    firstOfDay: boolean,
): Promise<void> {
    const path = dayPath(fid, day);
    await update(ref(database()), {
        [`${path}/found/${word}`]: { by: uid, at: serverTimestamp() },
        ...(firstOfDay ? { [`${path}/source`]: 'generated', [`${path}/wordlistVersion`]: WORDLIST_VERSION } : {}),
    });
}

/**
 * Chooses the day's puzzle (only until the first word is found).
 *
 * @param fid - The family
 * @param day - The day key
 * @param source - Which puzzle; switching to 'generated' also clears any imported puzzle
 * @param nytEnabled - Whether the family has the NYT import (only then may the NYT fields be touched)
 */
export async function setFamilySource(
    fid: string,
    day: string,
    source: PuzzleSource,
    nytEnabled: boolean,
): Promise<void> {
    const path = dayPath(fid, day);
    await update(ref(database()), {
        [`${path}/source`]: source,
        [`${path}/wordlistVersion`]: source === 'generated' ? WORDLIST_VERSION : null,
        ...(nytEnabled && source === 'generated' ? { [`${path}/nyt`]: null, [`${path}/pendingNyt`]: null } : {}),
    });
}

/**
 * Records that the player opened the hints.
 *
 * @param fid - The family
 * @param day - The day key
 * @param uid - The player
 */
export async function markFamilyHints(fid: string, day: string, uid: string): Promise<void> {
    await set(ref(database(), `${dayPath(fid, day)}/hints/${uid}`), true);
}

/**
 * Records that the player is getting today's NYT puzzle, so the others know to wait.
 *
 * @param fid - The family
 * @param day - The day key
 * @param uid - The player
 */
export async function setPendingNyt(fid: string, day: string, uid: string): Promise<void> {
    await set(ref(database(), `${dayPath(fid, day)}/pendingNyt`), { by: uid, at: serverTimestamp() });
}

/**
 * Loads an imported NYT puzzle as the family's puzzle for the day; everyone's game switches to it.
 *
 * @param fid - The family
 * @param day - The day key
 * @param puzzle - The checked puzzle
 * @param uid - The player loading it
 */
export async function saveFamilyNyt(fid: string, day: string, puzzle: ImportedPuzzle, uid: string): Promise<void> {
    const path = dayPath(fid, day);
    await update(ref(database()), {
        [`${path}/nyt`]: storedNyt(puzzle, uid, serverTimestamp()),
        [`${path}/source`]: 'nyt',
        [`${path}/wordlistVersion`]: null,
        [`${path}/pendingNyt`]: null,
    });
}
