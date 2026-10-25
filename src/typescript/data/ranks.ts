import type { Rank } from '../types/Rank';

/**
 * The ranks a player moves up through as they score, lowest first. These are our own names.
 */

/** The ranks, lowest first; pct is the fraction of the maximum score needed */
export const RANKS: Rank[] = [
    { name: 'Seedling', pct: 0 },
    { name: 'Sprout', pct: 0.02 },
    { name: 'Budding', pct: 0.05 },
    { name: 'Growing', pct: 0.08 },
    { name: 'Blooming', pct: 0.15 },
    { name: 'Flourishing', pct: 0.25 },
    { name: 'Thriving', pct: 0.4 },
    { name: 'Brilliant', pct: 0.5 },
    { name: 'Genius', pct: 0.7 },
    { name: 'Perfect', pct: 1 },
];

/** The index of the Genius rank */
export const GENIUS_RANK = RANKS.findIndex((r) => r.name === 'Genius');

/** The index of the Perfect rank (every word found) */
export const PERFECT_RANK = RANKS.length - 1;
