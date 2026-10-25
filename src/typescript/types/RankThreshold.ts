import type { Rank } from './Rank';

/**
 * Defines the RankThreshold type: a rank with the points it needs in one particular puzzle.
 */

/**
 * A rank with the points it needs in one particular puzzle.
 */
export type RankThreshold = Rank & {
    /** The rank's position in RANKS (0 = lowest) */
    index: number;
    /** The score needed to reach it */
    min: number;
};
