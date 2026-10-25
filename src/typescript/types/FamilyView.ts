/**
 * Defines the FamilyView type: which of the family's words a player sees on one day.
 */

/**
 * Which of the family's words a player sees on one day. Each day starts with only their own words shown.
 */
export type FamilyView = {
    /** The day key it is for */
    day: string;
    /** Whether the player chose to see every word the family found */
    showAll: boolean;
    /** Words others found that the player entered (so they are shown, without counting for the player) */
    seen: string[];
};
