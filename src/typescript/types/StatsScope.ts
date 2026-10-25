/**
 * Defines the StatsScope type: whose stats and badges the Stats screen is showing.
 */

/**
 * Whose stats and badges the Stats screen shows: local play, the player's play in one family, or the player's play in
 * all their families together.
 */
export type StatsScope = { kind: 'local' } | { kind: 'family'; fid: string; name: string } | { kind: 'all' };
