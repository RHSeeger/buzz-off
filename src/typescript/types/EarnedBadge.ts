/**
 * Defines the EarnedBadge type: a badge that was just earned, for the pop-up.
 */

/**
 * A badge that was just earned, with what the pop-up shows.
 */
export type EarnedBadge = {
    /** The key it is saved under */
    key: string;
    /** The badge's name (with the tier, for a tiered badge) */
    name: string;
    /** An emoji shown on the badge */
    icon: string;
    /** What it was earned for */
    desc: string;
};
