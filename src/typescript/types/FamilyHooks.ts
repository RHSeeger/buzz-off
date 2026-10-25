import type { EarnedBadge } from './EarnedBadge';

/**
 * Defines the FamilyHooks type: what family play (familyController.ts) asks the game (app.ts) to do.
 */

/**
 * What family play asks the game to do, so familyController.ts doesn't import app.ts.
 */
export type FamilyHooks = {
    /** Redraw everything; `highlight` is a word to flash in the found-words list */
    render(highlight?: string): void;
    /** The day or its puzzle changed: show the new letters and date, and redraw */
    dayChanged(): void;
    /** Hide the play area and show a message (e.g. "Connecting to the Smiths…"), with a way to play locally instead */
    showConnecting(text: string): void;
    /** Show the play area again */
    showReady(): void;
    /** Open the welcome screen */
    openSplash(): void;
    /** Switch to local play, for today */
    openLocal(): void;
    /** Celebrate reaching a rank (by the family) */
    celebrate(rank: number): void;
    /** Announce newly earned badges; `where` says which stats they're for */
    announceBadges(badges: { badge: EarnedBadge; where: string }[]): void;
    /** Load imported puzzle data (from the bookmarklet) */
    importPuzzle(text: string): void;
    /** Open the NYT import instructions */
    showNytImport(): void;
    /** Show a message above the word being typed */
    flash(text: string): void;
};
