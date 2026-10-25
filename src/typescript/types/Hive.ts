/**
 * Defines the Hive type: the controls for the honeycomb of letter buttons.
 */

/**
 * The controls for the honeycomb of letter buttons (see createHive()).
 */
export type Hive = {
    /** Shows a puzzle's letters (the outer ones in a random order) */
    setLetters(center: string, outer: string[]): void;
    /** Moves the outer letters around */
    shuffle(): void;
    /** Shows a letter's button being pressed (for typed letters) */
    flash(letter: string): void;
    /** Plays the pangram animation */
    celebrate(): void;
};
