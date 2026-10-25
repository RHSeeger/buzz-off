import type { DayState } from './DayState';
import type { History } from './History';
import type { LifetimeStats } from './LifetimeStats';
import type { Puzzle } from './Puzzle';

/**
 * Defines the AchievementContext type: everything the achievement checks look at.
 */

/**
 * Everything the achievement checks look at (see evaluateAchievements()).
 */
export type AchievementContext = {
    /** The all-time stats */
    stats: LifetimeStats;
    /** The summary of every day played */
    history: History;
    /** Today (YYYY-MM-DD) */
    todayKey: string;
    /** Today's play */
    day: DayState;
    /** Today's puzzle */
    puzzle: Puzzle;
    /** Today's rank (an index into RANKS) */
    rank: number;
    /** Something the player just did that an achievement is for (e.g. 'yesterday' for opening yesterday's answers) */
    event?: string;
    /** The time to record unlocks at (defaults to now) */
    now?: number;
};
