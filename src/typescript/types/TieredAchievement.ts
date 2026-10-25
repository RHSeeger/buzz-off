import type { NumericLifetimeStat } from './NumericLifetimeStat';

/**
 * Defines the TieredAchievement type: a badge that levels up (Bronze to Diamond) from an all-time stat.
 */

/**
 * A badge that levels up from an all-time stat: each tier is earned when the stat reaches that tier's target.
 */
export type TieredAchievement = {
    /** Unique id; each tier is saved as "<id>:<tier index>" */
    id: string;
    /** The badge's name */
    name: string;
    /** An emoji shown on the badge */
    icon: string;
    /** The all-time stat it counts */
    stat: NumericLifetimeStat;
    /** What the stat counts, plural (e.g. "words found") */
    unit: string;
    /** What the stat counts, for a count of 1 (e.g. "word found") */
    one: string;
    /** The target for each tier, lowest first */
    tiers: number[];
};
