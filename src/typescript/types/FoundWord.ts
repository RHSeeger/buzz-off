/**
 * Defines the FoundWord type: one word found.
 */

/**
 * One word found. The short field names keep the saved data small.
 */
export type FoundWord = {
    /** The word */
    w: string;
    /** When it was found (milliseconds since 1970) */
    at: number;
    /** In family play, who found it first (their uid) */
    by?: string;
};
