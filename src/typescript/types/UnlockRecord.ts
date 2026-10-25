/**
 * Defines the UnlockRecord type: when a badge was earned.
 */

/**
 * When a badge was earned.
 */
export type UnlockRecord = {
    /** When (milliseconds since 1970) */
    at: number;
    /** On which day's puzzle (YYYY-MM-DD) */
    day: string;
};
