/**
 * Defines the MemberContribution type: what one family member has found today.
 */

/**
 * What one family member has found today (see contributions()).
 */
export type MemberContribution = {
    /** Their uid */
    uid: string;
    /** Their name */
    name: string;
    /** Their color (a PlayerColor id) */
    color: string;
    /** Points from the words they found first */
    points: number;
    /** How many words they found first */
    words: number;
    /** How many of those were pangrams */
    pangrams: number;
    /** Their longest word */
    longest: string;
};
