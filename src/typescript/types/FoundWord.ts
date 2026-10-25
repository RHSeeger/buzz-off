/**
 * Defines the FoundWord type: one word the player found.
 */

/**
 * One word the player found. The short field names keep the saved data small.
 */
export type FoundWord = {
    /** The word */
    w: string;
    /** When it was found (milliseconds since 1970) */
    at: number;
};
