import { get, onValue, ref, set, update } from 'firebase/database';
import { parsePersonalData } from '../gamelogic/personal';
import type { DaySummary } from '../types/DaySummary';
import type { PersonalData } from '../types/PersonalData';
import type { UnlockedAchievements } from '../types/UnlockedAchievements';
import { database } from './firebase';

/**
 * The player's own data in Firebase (`users/<uid>`): their families, their history in each family, and their badges.
 * Only they can read or write it.
 */

/**
 * Watches the player's data.
 *
 * @param uid - The player
 * @param onData - Called with their data on every change
 * @returns A function that stops watching
 */
export function watchPersonal(uid: string, onData: (data: PersonalData) => void): () => void {
    return onValue(
        ref(database(), `users/${uid}`),
        (snap) => onData(parsePersonalData(snap.val())),
        () => onData(parsePersonalData(null)),
    );
}

/**
 * Reads the player's data once.
 *
 * @param uid - The player
 * @returns Their data
 */
export async function readPersonal(uid: string): Promise<PersonalData> {
    return parsePersonalData((await get(ref(database(), `users/${uid}`))).val());
}

/**
 * Saves the player's summary for one day in one family.
 *
 * @param uid - The player
 * @param fid - The family
 * @param day - The day key
 * @param summary - The summary
 */
export async function saveFamilySummary(uid: string, fid: string, day: string, summary: DaySummary): Promise<void> {
    await set(ref(database(), `users/${uid}/history/${fid}/${day}`), summary);
}

/**
 * Saves the badges the player has earned in one scope (a family, or all families).
 *
 * @param uid - The player
 * @param scope - The family id, or ALL_FAMILIES
 * @param unlocked - The badges
 */
export async function saveFamilyAchievements(
    uid: string,
    scope: string,
    unlocked: UnlockedAchievements,
): Promise<void> {
    await set(ref(database(), `users/${uid}/achievements/${scope}`), unlocked);
}

/**
 * Brings a guest's history and badges across to the account they just signed in to (anything the account already
 * has is kept).
 *
 * @param uid - The account
 * @param existing - The account's own data
 * @param guest - The guest's data
 */
export async function mergePersonalData(uid: string, existing: PersonalData, guest: PersonalData): Promise<void> {
    const changes: Record<string, unknown> = {};
    for (const [fid, days] of Object.entries(guest.history)) {
        for (const [day, s] of Object.entries(days)) {
            if (!existing.history[fid]?.[day]) changes[`users/${uid}/history/${fid}/${day}`] = s;
        }
    }
    for (const [scope, badges] of Object.entries(guest.achievements)) {
        for (const [key, rec] of Object.entries(badges)) {
            if (!existing.achievements[scope]?.[key]) changes[`users/${uid}/achievements/${scope}/${key}`] = rec;
        }
    }
    if (Object.keys(changes).length) await update(ref(database()), changes);
}
