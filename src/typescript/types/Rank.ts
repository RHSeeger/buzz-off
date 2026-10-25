/**
 * Defines the Rank type: one of the ranks a player moves up through as they score.
 */

/**
 * A rank, reached at a percentage of the puzzle's maximum score.
 */
export type Rank = {
    /** The rank's name */
    name: string;
    /** The fraction of the maximum score needed (0 to 1) */
    pct: number;
};
