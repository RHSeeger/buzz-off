/**
 * Defines the TierProgress type: how far along a tiered badge is.
 */

/**
 * How far along a tiered badge is (see tierProgress()).
 */
export type TierProgress = {
    /** The stat's current value */
    value: number;
    /** The highest tier reached (an index into the tiers), or -1 if none */
    tier: number;
    /** The target for the next tier, or null if every tier is reached */
    next: number | null;
    /** The name of the highest tier reached (e.g. "Gold"), or null if none */
    tierName: string | null;
};
