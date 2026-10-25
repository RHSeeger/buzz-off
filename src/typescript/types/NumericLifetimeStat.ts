import type { LifetimeStats } from './LifetimeStats';

/**
 * Defines the NumericLifetimeStat type: the names of the all-time stats that are single numbers.
 */

/**
 * The names of the all-time stats that are single numbers (the ones a tiered badge can count).
 */
export type NumericLifetimeStat = {
    [K in keyof LifetimeStats]: LifetimeStats[K] extends number ? K : never;
}[keyof LifetimeStats];
