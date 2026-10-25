import type { DaySummary } from './DaySummary';

/**
 * Defines the History type: the summary of every day played.
 */

/**
 * The summary of every day played, keyed by day (YYYY-MM-DD).
 */
export type History = Record<string, DaySummary>;
