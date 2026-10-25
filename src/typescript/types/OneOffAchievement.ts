/**
 * Defines the OneOffAchievement type: an achievement earned once, for something done in a single puzzle.
 */

/**
 * An achievement earned once, for something done in a single puzzle. What earns it is checked in
 * gamelogic/achievementChecks.ts, under the same id.
 */
export type OneOffAchievement = {
    /** Unique id */
    id: string;
    /** The achievement's name */
    name: string;
    /** An emoji shown on the badge */
    icon: string;
    /** What earns it, for the player */
    desc: string;
};
