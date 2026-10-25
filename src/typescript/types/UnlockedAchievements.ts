import type { UnlockRecord } from './UnlockRecord';

/**
 * Defines the UnlockedAchievements type: every badge earned so far.
 */

/**
 * Every badge earned so far, keyed by achievement id (a tiered badge's tiers are "<id>:<tier index>").
 */
export type UnlockedAchievements = Record<string, UnlockRecord>;
