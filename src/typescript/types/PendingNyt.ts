/**
 * Defines the PendingNyt type: a family member who is getting today's NYT puzzle.
 */

/**
 * A family member who has started getting today's NYT puzzle (`families/<fid>/days/<day>/pendingNyt`).
 */
export type PendingNyt = {
    /** Who (uid) */
    by: string;
    /** When they started (milliseconds since 1970) */
    at: number;
};
