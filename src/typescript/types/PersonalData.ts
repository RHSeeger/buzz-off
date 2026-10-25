import type { FamilyListEntry } from './FamilyListEntry';
import type { History } from './History';
import type { UnlockedAchievements } from './UnlockedAchievements';

/**
 * Defines the PersonalData type: what is saved in Firebase for one player.
 */

/**
 * What is saved in Firebase for one player (`users/<uid>`), so it is the same on any device they sign in on.
 */
export type PersonalData = {
    /** The families they belong to */
    families: FamilyListEntry[];
    /** Their own play in each family: history[fid][day] counts the words they found (the rank is the family's) */
    history: Record<string, History>;
    /** The badges they've earned, by scope: a family id, or ALL_FAMILIES */
    achievements: Record<string, UnlockedAchievements>;
};
